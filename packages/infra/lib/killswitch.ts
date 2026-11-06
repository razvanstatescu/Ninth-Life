import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import type * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

// Kill switch: AWS Budgets publishes to an SNS topic when actual spend crosses the limit; this
// Lambda (subscribed to the topic) sets the SSM flag to "false". The decoder reads the flag (cached
// for 30 s) and answers 503 llm_disabled, so every client stays in ghost mode.
//
// The handler is inline CommonJS so the stack synthesizes without bundling. It uses the AWS SDK v3
// that ships with the Node.js 22 Lambda runtime. It logs no message content.

export const KILLSWITCH_SOURCE = `
const { SSMClient, PutParameterCommand } = require('@aws-sdk/client-ssm');
const ssm = new SSMClient({});
exports.handler = async (event) => {
  const records = (event && Array.isArray(event.Records)) ? event.Records : [];
  if (!records.some((r) => r && r.EventSource === 'aws:sns')) {
    console.log(JSON.stringify({ event: 'killswitch', action: 'ignored' }));
    return { flipped: false };
  }
  await ssm.send(new PutParameterCommand({
    Name: process.env.FLAG_PARAM,
    Value: 'false',
    Type: 'String',
    Overwrite: true,
  }));
  console.log(JSON.stringify({ event: 'killswitch', action: 'llm_disabled' }));
  return { flipped: true };
};
`;

export interface KillSwitchProps {
  flag: ssm.IStringParameter;
  topic: sns.ITopic;
}

export class KillSwitch extends Construct {
  readonly fn: lambda.Function;

  constructor(scope: Construct, id: string, props: KillSwitchProps) {
    super(scope, id);
    this.fn = new lambda.Function(this, 'Fn', {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'index.handler',
      code: lambda.Code.fromInline(KILLSWITCH_SOURCE),
      memorySize: 128,
      timeout: Duration.seconds(10),
      description: 'Ninth Life: Budgets alert -> set /ninthlife/llm_enabled to false',
      environment: { FLAG_PARAM: props.flag.parameterName },
      logGroup: new logs.LogGroup(this, 'Logs', { retention: logs.RetentionDays.ONE_MONTH }),
    });
    props.flag.grantWrite(this.fn);
    props.topic.addSubscription(new subs.LambdaSubscription(this.fn));
  }
}
