import { createHash } from 'node:crypto';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { FLAG_PARAMETER, SsmFlags } from '../flags.js';
import { handleDecode, type DecodeDeps } from '../handler.js';
import { BedrockLlmClient } from '../llm.js';
import { consoleMetrics } from '../log.js';
import { HOME_REGION, isModelKey } from '../models.js';
import { DynamoQuotaStore } from '../quota.js';
import { LIMITS } from '../schema.js';
import { utcDay } from '../quota.js';

// AWS Lambda adapter for API Gateway HTTP API (payload format 2.0).
// CORS response headers come from the HTTP API's CORS configuration; this adapter additionally
// refuses requests whose Origin is not on the allowlist.
//
// Environment (see packages/decoder/.env.example):
//   MODEL_PROFILE   haiku-4.5 | haiku-5.5 | nova-micro    (default haiku-4.5)
//   QUOTA_TABLE     DynamoDB table name
//   FLAG_PARAM      SSM parameter for the kill switch     (default /ninthlife/llm_enabled)
//   SALT_PARAM      SSM SecureString holding the IP-hash salt (default /ninthlife/ip_salt)
//   ALLOWED_ORIGINS comma-separated origins, e.g. https://ninth-life.example
//   LLM_TIMEOUT_MS  server-side LLM deadline (default 1200)

/** Salted, per-day hash of the client IP. The raw IP is never stored or logged. */
export function hashIp(ip: string, salt: string, nowMs: number): string {
  return createHash('sha256').update(`${salt}|${utcDay(nowMs)}|${ip}`).digest('hex').slice(0, 32);
}

export function parseOrigins(v: string | undefined): string[] {
  return (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface LambdaAdapterConfig {
  deps: DecodeDeps;
  allowedOrigins: string[];
  salt: () => Promise<string>;
}

const JSON_HEADERS = { 'content-type': 'application/json', 'cache-control': 'no-store' };

function reply(statusCode: number, json: unknown, headers?: Record<string, string>): APIGatewayProxyStructuredResultV2 {
  return { statusCode, headers: { ...JSON_HEADERS, ...headers }, body: JSON.stringify(json) };
}

export function createLambdaHandler(cfg: LambdaAdapterConfig) {
  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    if (event.requestContext?.http?.method !== 'POST') return reply(405, { error: 'method_not_allowed' });

    const origin = event.headers?.origin ?? event.headers?.Origin;
    if (!origin || !cfg.allowedOrigins.includes(origin)) return reply(403, { error: 'forbidden_origin' });

    // Size check on the raw bytes before anything else touches the body.
    const raw = event.body ?? '';
    const bytes = event.isBase64Encoded ? Buffer.from(raw, 'base64') : Buffer.from(raw, 'utf8');
    if (bytes.length > LIMITS.maxBodyBytes) return reply(413, { error: 'too_large', maxBytes: LIMITS.maxBodyBytes });

    const now = cfg.deps.now();
    let ipHash: string;
    try {
      ipHash = hashIp(event.requestContext.http.sourceIp ?? '', await cfg.salt(), now);
    } catch {
      return reply(503, { error: 'unavailable' });
    }

    const res = await handleDecode(bytes.toString('utf8'), { ipHash, origin }, cfg.deps);
    return reply(res.status, res.json, res.headers);
  };
}

// ---------------------------------------------------------------------------------------------
// Production wiring, built once per cold start.

function memoize<T>(fn: () => Promise<T>): () => Promise<T> {
  let p: Promise<T> | null = null;
  return () => {
    if (!p) p = fn().catch((e) => ((p = null), Promise.reject(e)));
    return p;
  };
}

export function fromEnv(env: Record<string, string | undefined> = process.env) {
  const region = env.AWS_REGION ?? HOME_REGION;
  const model = isModelKey(env.MODEL_PROFILE) ? env.MODEL_PROFILE : 'haiku-4.5';
  if (!env.QUOTA_TABLE) throw new Error('QUOTA_TABLE is not set');
  const ssm = new SSMClient({ region, maxAttempts: 2 });
  const saltParam = env.SALT_PARAM ?? '/ninthlife/ip_salt';
  const salt = memoize(async () => {
    const out = await ssm.send(new GetParameterCommand({ Name: saltParam, WithDecryption: true }));
    const v = out.Parameter?.Value;
    if (!v || v.length < 16) throw new Error('salt missing');
    return v;
  });
  const timeout = Number(env.LLM_TIMEOUT_MS);
  return createLambdaHandler({
    allowedOrigins: parseOrigins(env.ALLOWED_ORIGINS),
    salt,
    deps: {
      llm: new BedrockLlmClient({ model, region }),
      quota: new DynamoQuotaStore(env.QUOTA_TABLE),
      flags: new SsmFlags(env.FLAG_PARAM ?? FLAG_PARAMETER, { client: ssm }),
      now: Date.now,
      options: { log: consoleMetrics, timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : undefined },
    },
  });
}

let cached: ReturnType<typeof fromEnv> | null = null;

export const handler = (event: APIGatewayProxyEventV2) => {
  cached ??= fromEnv();
  return cached(event);
};
