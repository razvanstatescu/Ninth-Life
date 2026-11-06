import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { HOME_REGION, iamArns, MODEL_PROFILES, type ModelKey } from '@ninth/decoder/models';
import type { Construct } from 'constructs';
import { KillSwitch } from './killswitch.js';

// Ninth Life decoder stack (eu-central-1 only). See docs/architecture/decoder.md.
//
//   Browser --POST /v1/decode--> HTTP API ($default stage: 5 rps, burst 10, CORS allowlist)
//     --> Lambda (Node 22, arm64, reserved concurrency 5)
//           --> SSM /ninthlife/llm_enabled (kill switch)
//           --> DynamoDB quota table (per-IP-hash and global daily counters, 24 h TTL)
//           --> Bedrock InvokeModel on the EU geo inference profile(s) only
//   AWS Budgets ($40, actual) --> SNS --> kill-switch Lambda --> SSM flag = "false"

export const FLAG_PARAMETER = '/ninthlife/llm_enabled';
export const SALT_PARAMETER = '/ninthlife/ip_salt';

export interface NinthLifeStackProps extends StackProps {
  /** Exact origins allowed by CORS and by the Lambda's Origin check. */
  allowedOrigins: string[];
  /** Models the Lambda may invoke (IAM is scoped to exactly these). */
  models: ModelKey[];
  /** Model the Lambda uses (must be in `models`). */
  activeModel: ModelKey;
  /** Kill-switch threshold in USD of actual spend (plan: 40). */
  budgetUsd?: number;
  /** Budget period start, YYYY-MM-DD (UTC). */
  budgetStart?: string;
  /** Optional address for 50% / 80% / 100% budget emails. Pass via context, never commit it. */
  alertEmail?: string;
  /** Lambda reserved concurrency (plan: 5). New accounts with a 10-execution limit need a quota increase. */
  reservedConcurrency?: number;
  /** Decoder bundle. bin/app.ts passes packages/decoder/dist/lambda; tests pass inline code. */
  decoderCode: lambda.Code;
}

function epochSeconds(day: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error(`budgetStart must be YYYY-MM-DD, got ${day}`);
  return String(Date.parse(`${day}T00:00:00Z`) / 1000);
}

export class NinthLifeStack extends Stack {
  readonly api: apigw.HttpApi;
  readonly decoder: lambda.Function;

  constructor(scope: Construct, id: string, props: NinthLifeStackProps) {
    super(scope, id, props);

    // --- Guards -------------------------------------------------------------------------------
    if (this.region !== HOME_REGION) throw new Error(`NinthLifeStack must deploy to ${HOME_REGION} (EU only), got ${this.region}`);
    if (!props.allowedOrigins.length) throw new Error('allowedOrigins is empty');
    for (const o of props.allowedOrigins) {
      if (!/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(o) && !/^http:\/\/localhost(:\d+)?$/.test(o)) {
        throw new Error(`allowedOrigins: ${o} must be an exact https origin (or http://localhost)`);
      }
    }
    if (!props.models.includes(props.activeModel)) throw new Error('activeModel must be one of models');
    const budgetUsd = props.budgetUsd ?? 40;

    // --- Kill switch flag and IP-hash salt -----------------------------------------------------
    const flag = new ssm.StringParameter(this, 'LlmEnabled', {
      parameterName: FLAG_PARAMETER,
      stringValue: 'true',
      description: 'Ninth Life kill switch: "true" lets the decoder call Bedrock. Set to "false" by the budget kill switch.',
    });
    // SecureString created out of band (CloudFormation cannot create SecureString values):
    //   aws ssm put-parameter --name /ninthlife/ip_salt --type SecureString --value "$(openssl rand -hex 32)"
    const salt = ssm.StringParameter.fromSecureStringParameterAttributes(this, 'IpSalt', { parameterName: SALT_PARAMETER });

    // --- Quota table ---------------------------------------------------------------------------
    const table = new dynamodb.Table(this, 'Quota', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: RemovalPolicy.DESTROY, // counters only; nothing worth keeping
    });

    // --- Decoder Lambda ------------------------------------------------------------------------
    this.decoder = new lambda.Function(this, 'Decoder', {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'index.handler',
      code: props.decoderCode,
      memorySize: 512,
      timeout: Duration.seconds(5),
      reservedConcurrentExecutions: props.reservedConcurrency ?? 5,
      description: 'Ninth Life cloud decoder (validated LLM ranking over a 9-key lattice)',
      tracing: lambda.Tracing.DISABLED, // no payload tracing
      loggingFormat: lambda.LoggingFormat.JSON,
      applicationLogLevelV2: lambda.ApplicationLogLevel.INFO,
      systemLogLevelV2: lambda.SystemLogLevel.WARN,
      logGroup: new logs.LogGroup(this, 'DecoderLogs', {
        retention: logs.RetentionDays.TWO_WEEKS,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      environment: {
        MODEL_PROFILE: props.activeModel,
        QUOTA_TABLE: table.tableName,
        FLAG_PARAM: FLAG_PARAMETER,
        SALT_PARAM: SALT_PARAMETER,
        ALLOWED_ORIGINS: props.allowedOrigins.join(','),
        LLM_TIMEOUT_MS: '1200',
      },
    });
    table.grant(this.decoder, 'dynamodb:UpdateItem'); // TransactWriteItems(Update) + UpdateItem
    flag.grantRead(this.decoder);
    salt.grantRead(this.decoder);

    // Bedrock: InvokeModel on the EU geo profiles and, only through those profiles, on the
    // foundation model in each EU destination Region (AWS geographic CRIS IAM pattern).
    const models = [...new Set(props.models)].map((k) => MODEL_PROFILES[k]);
    const arns = models.map((p) => iamArns(p, this.account, this.region));
    this.decoder.addToRolePolicy(
      new iam.PolicyStatement({
        sid: 'InvokeEuGeoProfiles',
        actions: ['bedrock:InvokeModel'],
        resources: arns.map((a) => a.profileArn),
      }),
    );
    arns.forEach((a, i) =>
      this.decoder.addToRolePolicy(
        new iam.PolicyStatement({
          sid: `InvokeFoundationModelViaProfile${i}`,
          actions: ['bedrock:InvokeModel'],
          resources: a.foundationModelArns,
          conditions: { StringEquals: { 'bedrock:InferenceProfileArn': a.profileArn } },
        }),
      ),
    );

    // --- HTTP API ------------------------------------------------------------------------------
    this.api = new apigw.HttpApi(this, 'Api', {
      apiName: 'ninthlife-decoder',
      createDefaultStage: false,
      corsPreflight: {
        allowOrigins: props.allowedOrigins,
        allowMethods: [apigw.CorsHttpMethod.POST],
        allowHeaders: ['content-type'],
        maxAge: Duration.days(1),
      },
    });
    new apigw.HttpStage(this, 'DefaultStage', {
      httpApi: this.api,
      stageName: '$default',
      autoDeploy: true,
      throttle: { rateLimit: 5, burstLimit: 10 },
    });
    this.api.addRoutes({
      path: '/v1/decode',
      methods: [apigw.HttpMethod.POST],
      integration: new HttpLambdaIntegration('DecodeIntegration', this.decoder),
    });

    // --- Budget -> SNS -> kill switch ------------------------------------------------------------
    const topic = new sns.Topic(this, 'BudgetAlerts', { displayName: 'Ninth Life budget alerts' });
    const topicPolicy = topic.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowBudgetsPublish',
        principals: [new iam.ServicePrincipal('budgets.amazonaws.com')],
        actions: ['SNS:Publish'],
        resources: [topic.topicArn],
        conditions: {
          StringEquals: { 'aws:SourceAccount': this.account },
          ArnLike: { 'aws:SourceArn': `arn:aws:budgets::${this.account}:*` },
        },
      }),
    );
    new KillSwitch(this, 'KillSwitch', { flag, topic });

    const notify = (threshold: number, toTopic: boolean): budgets.CfnBudget.NotificationWithSubscribersProperty | null => {
      const subscribers: budgets.CfnBudget.SubscriberProperty[] = [];
      if (toTopic) subscribers.push({ subscriptionType: 'SNS', address: topic.topicArn });
      if (props.alertEmail) subscribers.push({ subscriptionType: 'EMAIL', address: props.alertEmail });
      if (!subscribers.length) return null;
      return {
        notification: { notificationType: 'ACTUAL', comparisonOperator: 'GREATER_THAN', threshold, thresholdType: 'PERCENTAGE' },
        subscribers,
      };
    };
    // Whole-account cost, no service filter: Claude on Bedrock is billed through AWS Marketplace
    // under the model provider, not under the "Amazon Bedrock" service. Use a dedicated account.
    const budget = new budgets.CfnBudget(this, 'LlmBudget', {
      budget: {
        budgetName: 'ninthlife-total',
        budgetType: 'COST',
        timeUnit: 'ANNUALLY',
        timePeriod: { start: epochSeconds(props.budgetStart ?? '2026-11-01') },
        budgetLimit: { amount: budgetUsd, unit: 'USD' },
      },
      notificationsWithSubscribers: [notify(50, false), notify(80, false), notify(100, true)].filter(
        (n): n is budgets.CfnBudget.NotificationWithSubscribersProperty => n !== null,
      ),
    });
    if (topicPolicy.policyDependable) budget.node.addDependency(topicPolicy.policyDependable);

    new CfnOutput(this, 'DecodeUrl', { value: `${this.api.apiEndpoint}/v1/decode` });
    new CfnOutput(this, 'FlagParameter', { value: flag.parameterName });
  }
}
