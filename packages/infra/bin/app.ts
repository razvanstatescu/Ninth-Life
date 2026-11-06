#!/usr/bin/env node
// CDK app for the Ninth Life decoder. Synthesize with:
//   pnpm -F @ninth/decoder build && pnpm -F @ninth/infra synth -c allowedOrigins=https://your.app
// No account ID lives in this repo: CDK_DEFAULT_ACCOUNT comes from your AWS credentials at deploy
// time; without credentials the stack synthesizes account-agnostic.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { App } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { HOME_REGION, isModelKey, type ModelKey } from '@ninth/decoder/models';
import { NinthLifeStack } from '../lib/ninth-life-stack.js';

const app = new App();
const ctx = (k: string): string | undefined => {
  const v = app.node.tryGetContext(k);
  return v === undefined || v === null ? undefined : Array.isArray(v) ? v.join(',') : String(v);
};
const list = (v: string | undefined) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean);

const models = list(ctx('models')).filter(isModelKey) as ModelKey[];
const active = ctx('activeModel');

const dist = fileURLToPath(new URL('../../decoder/dist/lambda', import.meta.url));
if (!existsSync(`${dist}/index.mjs`)) {
  throw new Error(`Decoder bundle not found at ${dist}. Run: pnpm -F @ninth/decoder build`);
}

new NinthLifeStack(app, 'NinthLifeDecoder', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: HOME_REGION },
  description: 'Ninth Life cloud decoder (EU): HTTP API, Lambda, DynamoDB quotas, SSM kill switch, Budgets',
  allowedOrigins: list(ctx('allowedOrigins')),
  models: models.length ? models : ['haiku-4.5', 'haiku-5.5'],
  activeModel: isModelKey(active) ? active : 'haiku-4.5',
  budgetUsd: Number(ctx('budgetUsd') ?? 40),
  budgetStart: ctx('budgetStart'),
  alertEmail: ctx('alertEmail'),
  reservedConcurrency: ctx('reservedConcurrency') ? Number(ctx('reservedConcurrency')) : undefined,
  decoderCode: lambda.Code.fromAsset(dist),
  tags: { project: 'ninth-life' },
});
