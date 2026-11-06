import vm from 'node:vm';
import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { describe, expect, it } from 'vitest';
import { KILLSWITCH_SOURCE } from '../lib/killswitch.js';
import { NinthLifeStack, type NinthLifeStackProps } from '../lib/ninth-life-stack.js';

const ORIGIN = 'https://ninth-life.example';

function synth(over: Partial<NinthLifeStackProps> = {}, region = 'eu-central-1') {
  const app = new App();
  const stack = new NinthLifeStack(app, 'Test', {
    env: { account: '111122223333', region }, // placeholder account for assertions only
    allowedOrigins: [ORIGIN],
    models: ['haiku-4.5', 'haiku-5.5'],
    activeModel: 'haiku-4.5',
    decoderCode: lambda.Code.fromInline('export const handler = async () => ({ statusCode: 200 });'),
    ...over,
  });
  return Template.fromStack(stack);
}

const t = synth();
const json = JSON.stringify(t.toJSON());

describe('region and residency (DS-7)', () => {
  it('refuses any Region but eu-central-1', () => {
    expect(() => synth({}, 'us-east-1')).toThrow(/eu-central-1/);
  });

  it('never references a non-EU Region or a non-EU inference profile', () => {
    expect(json).not.toMatch(/(us|ap|sa|ca|me|af|il|mx)-[a-z]+-\d/);
    expect(json).not.toMatch(/inference-profile\/(us|global|apac|jp|au|ca)\./);
  });
});

describe('decoder Lambda', () => {
  it('Node 22, arm64, reserved concurrency 5, JSON logs, no tracing', () => {
    t.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs22.x',
      Architectures: ['arm64'],
      ReservedConcurrentExecutions: 5,
      Timeout: 5,
      LoggingConfig: Match.objectLike({ LogFormat: 'JSON' }),
      Environment: {
        Variables: Match.objectLike({
          MODEL_PROFILE: 'haiku-4.5',
          ALLOWED_ORIGINS: ORIGIN,
          FLAG_PARAM: '/ninthlife/llm_enabled',
          SALT_PARAM: '/ninthlife/ip_salt',
          LLM_TIMEOUT_MS: '1200',
        }),
      },
    });
  });

  it('bedrock:InvokeModel only on the EU profiles and EU foundation-model ARNs', () => {
    const policies = t.findResources('AWS::IAM::Policy');
    const bedrock = Object.values(policies)
      .flatMap((p) => (p as { Properties: { PolicyDocument: { Statement: { Action: string | string[]; Resource: unknown; Condition?: unknown }[] } } }).Properties.PolicyDocument.Statement)
      .filter((s) => [s.Action].flat().some((a) => a.startsWith('bedrock:')));
    expect(bedrock.length).toBeGreaterThanOrEqual(3);
    for (const s of bedrock) {
      expect([s.Action].flat()).toEqual(['bedrock:InvokeModel']);
      const res = JSON.stringify(s.Resource);
      expect(res).not.toContain('"*"');
      expect(res).toMatch(/eu-/);
    }
    const all = JSON.stringify(bedrock);
    expect(all).toContain('inference-profile/eu.anthropic.claude-haiku-4-5-20251001-v1:0');
    expect(all).toContain('inference-profile/eu.anthropic.claude-haiku-5-5');
    for (const r of ['eu-central-1', 'eu-north-1', 'eu-south-1', 'eu-south-2', 'eu-west-1', 'eu-west-3']) {
      expect(all).toContain(`arn:aws:bedrock:${r}::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0`);
    }
    expect(all).not.toContain('nova');
    // Foundation-model access only through the profile.
    const fm = bedrock.filter((s) => JSON.stringify(s.Resource).includes('foundation-model'));
    for (const s of fm) expect(JSON.stringify(s.Condition)).toContain('bedrock:InferenceProfileArn');
  });

  it('grants DynamoDB UpdateItem only, on the quota table', () => {
    const all = JSON.stringify(t.findResources('AWS::IAM::Policy'));
    expect(all).toContain('dynamodb:UpdateItem');
    expect(all).not.toMatch(/dynamodb:(Scan|Query|GetItem|DeleteItem|\*)/);
  });
});

describe('HTTP API', () => {
  it('$default stage throttled at 5 rps, burst 10', () => {
    t.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
      StageName: '$default',
      AutoDeploy: true,
      DefaultRouteSettings: { ThrottlingRateLimit: 5, ThrottlingBurstLimit: 10 },
    });
    t.resourceCountIs('AWS::ApiGatewayV2::Stage', 1);
  });

  it('CORS allowlist from props, POST only', () => {
    t.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      ProtocolType: 'HTTP',
      CorsConfiguration: Match.objectLike({ AllowOrigins: [ORIGIN], AllowMethods: ['POST'], AllowHeaders: ['content-type'] }),
    });
  });

  it('one route: POST /v1/decode', () => {
    t.resourceCountIs('AWS::ApiGatewayV2::Route', 1);
    t.hasResourceProperties('AWS::ApiGatewayV2::Route', { RouteKey: 'POST /v1/decode' });
  });

  it('rejects wildcard or non-https origins', () => {
    expect(() => synth({ allowedOrigins: ['*'] })).toThrow();
    expect(() => synth({ allowedOrigins: ['http://example.com'] })).toThrow();
    expect(() => synth({ allowedOrigins: [] })).toThrow();
    expect(() => synth({ allowedOrigins: ['http://localhost:3000'] })).not.toThrow();
  });
});

describe('quota table and kill switch', () => {
  it('DynamoDB table with pk and a ttl attribute', () => {
    t.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }],
      BillingMode: 'PAY_PER_REQUEST',
      TimeToLiveSpecification: { AttributeName: 'ttl', Enabled: true },
    });
  });

  it('SSM flag /ninthlife/llm_enabled starts "true"', () => {
    t.hasResourceProperties('AWS::SSM::Parameter', { Name: '/ninthlife/llm_enabled', Type: 'String', Value: 'true' });
  });

  it('Budget of $40 (actual, 100%) notifies the SNS topic', () => {
    t.hasResourceProperties('AWS::Budgets::Budget', {
      Budget: Match.objectLike({ BudgetType: 'COST', BudgetLimit: { Amount: 40, Unit: 'USD' }, TimeUnit: 'ANNUALLY' }),
      NotificationsWithSubscribers: Match.arrayWith([
        Match.objectLike({
          Notification: { NotificationType: 'ACTUAL', ComparisonOperator: 'GREATER_THAN', Threshold: 100, ThresholdType: 'PERCENTAGE' },
          Subscribers: Match.arrayWith([Match.objectLike({ SubscriptionType: 'SNS' })]),
        }),
      ]),
    });
  });

  it('budget has no service filter (Marketplace-billed Claude usage must count)', () => {
    const b = Object.values(t.findResources('AWS::Budgets::Budget'))[0] as { Properties: { Budget: Record<string, unknown> } };
    expect(b.Properties.Budget.CostFilters).toBeUndefined();
    expect(b.Properties.Budget.FilterExpression).toBeUndefined();
  });

  it('SNS topic policy lets only Budgets (this account) publish', () => {
    t.hasResourceProperties('AWS::SNS::TopicPolicy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Principal: { Service: 'budgets.amazonaws.com' },
            Action: 'SNS:Publish',
            Condition: Match.objectLike({ StringEquals: { 'aws:SourceAccount': '111122223333' } }),
          }),
        ]),
      }),
    });
  });

  it('kill-switch Lambda is subscribed to the topic and may write the flag', () => {
    t.hasResourceProperties('AWS::SNS::Subscription', { Protocol: 'lambda' });
    const all = JSON.stringify(t.findResources('AWS::IAM::Policy'));
    expect(all).toContain('ssm:PutParameter');
  });

  it('optional alert email adds email subscribers at 50/80/100%', () => {
    const withEmail = synth({ alertEmail: 'alerts@example.test' });
    const b = Object.values(withEmail.findResources('AWS::Budgets::Budget'))[0] as {
      Properties: { NotificationsWithSubscribers: { Notification: { Threshold: number } }[] };
    };
    expect(b.Properties.NotificationsWithSubscribers.map((n) => n.Notification.Threshold)).toEqual([50, 80, 100]);
  });
});

describe('kill-switch handler source', () => {
  async function run(event: unknown) {
    const sent: { Name: string; Value: string; Overwrite: boolean }[] = [];
    class PutParameterCommand {
      constructor(readonly input: { Name: string; Value: string; Overwrite: boolean }) {}
    }
    class SSMClient {
      async send(cmd: PutParameterCommand) {
        sent.push(cmd.input);
        return {};
      }
    }
    const mod = { exports: {} as { handler?: (e: unknown) => Promise<{ flipped: boolean }> } };
    const logs: string[] = [];
    vm.runInNewContext(KILLSWITCH_SOURCE, {
      require: (n: string) => {
        if (n !== '@aws-sdk/client-ssm') throw new Error(`unexpected require ${n}`);
        return { SSMClient, PutParameterCommand };
      },
      exports: mod.exports,
      module: mod,
      process: { env: { FLAG_PARAM: '/ninthlife/llm_enabled' } },
      console: { log: (s: string) => logs.push(s) },
    });
    const out = await mod.exports.handler!(event);
    return { out, sent, logs };
  }

  it('an SNS budget notification sets the flag to "false"', async () => {
    const r = await run({ Records: [{ EventSource: 'aws:sns', Sns: { Message: 'AWS Budget Notification ... spend exceeded' } }] });
    expect(r.out.flipped).toBe(true);
    expect(r.sent).toEqual([{ Name: '/ninthlife/llm_enabled', Value: 'false', Type: 'String', Overwrite: true }]);
    expect(r.logs.join('')).not.toContain('spend exceeded'); // message content is not logged
  });

  it('ignores non-SNS invocations', async () => {
    const r = await run({});
    expect(r.out.flipped).toBe(false);
    expect(r.sent).toHaveLength(0);
  });
});
