import { createHash, randomBytes } from 'node:crypto';
import { EnvFlags, StaticFlags, type Flags } from '../flags.js';
import { DEFAULT_TIMEOUT_MS, handleDecode, type DecodeDeps } from '../handler.js';
import { AnthropicLlmClient, FakeLlmClient, type FetchLike, type LlmClient } from '../llm.js';
import { consoleMetrics } from '../log.js';
import { defaultModelFor, isModelId, MODEL_PROFILES, type ModelId, type Provider } from '../models.js';
import { MemoryQuotaStore, utcDay } from '../quota.js';
import { LIMITS } from '../schema.js';

// Web-standard adapter: (Request) => Response. Used by the Next.js Route Handler on Vercel
// (packages/web/app/api/decode/route.ts). See docs/decisions/ADR-001-anthropic-api-no-aws.md.
//
// Environment:
//   LLM_ENABLED        "true" lets the route call the model (kill switch). Default: off.
//   ANTHROPIC_API_KEY  key for the Claude models
//   MINIMAX_API_KEY    key for the MiniMax models (ADR-002); with only this key set, MiniMax-M3 is the default
//   MINIMAX_BASE_URL   MiniMax Anthropic-compatible base URL (default https://api.minimax.io/anthropic)
//   DECODE_MODEL       claude-haiku-5-5 (default) | claude-haiku-4-5 | MiniMax-M3 | MiniMax-M3.1-Flash
//                      Without the key for the chosen model's provider the route answers 503 llm_disabled.
//   DECODE_TIMEOUT_MS  server-side model deadline (default 1200, 300-9000); keep it below the client's
//                      NEXT_PUBLIC_DECODE_TIMEOUT_MS
//   IP_HASH_SALT       salt for the per-day IP hash (a random per-instance salt if unset)
//   ALLOWED_ORIGINS    extra allowed Origins, comma-separated (the deployment's own origin is always allowed)
//   DECODE_FAKE_LLM    "true" uses the fake model (local demos; ignored in production)

const JSON_HEADERS = { 'content-type': 'application/json', 'cache-control': 'no-store' };

function json(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });
}

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

/** Client IP as Vercel reports it (first x-forwarded-for entry, then x-real-ip). */
export function clientIp(headers: Headers): string {
  return (headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * Origin check. The deployment's own origin (from the Host header) and ALLOWED_ORIGINS pass. In
 * production a missing Origin is refused (browsers always send it on POST); in dev it is allowed so
 * curl works.
 */
export function originAllowed(origin: string | null, host: string | null, allowed: string[], production: boolean): boolean {
  if (!origin) return !production;
  if (allowed.includes(origin)) return true;
  if (!host) return false;
  return origin === `https://${host}` || (!production && origin === `http://${host}`);
}

export interface FetchHandlerConfig {
  deps: DecodeDeps;
  salt: string;
  allowedOrigins: string[];
  production: boolean;
}

export function createFetchHandler(cfg: FetchHandlerConfig) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, { allow: 'POST' });
    if (!originAllowed(req.headers.get('origin'), req.headers.get('host'), cfg.allowedOrigins, cfg.production)) {
      return json(403, { error: 'forbidden_origin' });
    }
    const declared = Number(req.headers.get('content-length') ?? '0');
    if (declared > LIMITS.maxBodyBytes) return json(413, { error: 'too_large', maxBytes: LIMITS.maxBodyBytes });
    let raw: string;
    try {
      raw = await req.text();
    } catch {
      return json(400, { error: 'bad_request', issues: ['unreadable body'] });
    }
    if (new TextEncoder().encode(raw).length > LIMITS.maxBodyBytes) {
      return json(413, { error: 'too_large', maxBytes: LIMITS.maxBodyBytes });
    }
    const now = cfg.deps.now();
    const ipHash = hashIp(clientIp(req.headers), cfg.salt, now);
    try {
      const res = await handleDecode(raw, { ipHash, origin: req.headers.get('origin') ?? undefined }, cfg.deps);
      return json(res.status, res.json, res.headers);
    } catch {
      return json(503, { error: 'unavailable' });
    }
  };
}

export interface EnvConfig extends FetchHandlerConfig {
  /** Startup notes for dev logs (never secrets). */
  warnings: string[];
}

const KEY_ENV: Record<Provider, 'ANTHROPIC_API_KEY' | 'MINIMAX_API_KEY'> = {
  anthropic: 'ANTHROPIC_API_KEY',
  minimax: 'MINIMAX_API_KEY',
};

/** The model the route uses, its provider and the env var holding its key. */
export function resolveModel(env: Record<string, string | undefined>): { model: ModelId; provider: Provider; keyEnv: string; warning?: string } {
  const fallback = defaultModelFor(env);
  const requested = env.DECODE_MODEL?.trim();
  const model = isModelId(requested) ? requested : fallback;
  const provider = MODEL_PROFILES[model].provider;
  return {
    model,
    provider,
    keyEnv: KEY_ENV[provider],
    warning: requested && !isModelId(requested) ? `DECODE_MODEL not recognised; using ${fallback}` : undefined,
  };
}

/** DECODE_TIMEOUT_MS, clamped to 300-9000 ms (the route's maxDuration is 10 s). */
export function timeoutFromEnv(v: string | undefined): number {
  const n = Number(v);
  if (!v || !Number.isFinite(n)) return DEFAULT_TIMEOUT_MS;
  return Math.min(9000, Math.max(300, Math.round(n)));
}

/** Build the route's dependencies from environment variables. */
export function configFromEnv(
  env: Record<string, string | undefined> = process.env,
  opts: { fetch?: FetchLike; now?: () => number } = {},
): EnvConfig {
  const production = env.NODE_ENV === 'production';
  const warnings: string[] = [];
  let llm: LlmClient | null = null;
  if (env.DECODE_FAKE_LLM === 'true' && !production) {
    llm = new FakeLlmClient('{"c":[]}');
    warnings.push('DECODE_FAKE_LLM: using the fake model');
  } else {
    const { model, provider, keyEnv, warning } = resolveModel(env);
    if (warning) warnings.push(warning);
    const apiKey = env[keyEnv]?.trim();
    if (apiKey) {
      const baseUrl = provider === 'minimax' ? env.MINIMAX_BASE_URL : undefined;
      llm = new AnthropicLlmClient({ apiKey, model, fetch: opts.fetch, baseUrl });
      if (!production) warnings.push(`model ranking: ${model} (${provider})`);
    } else {
      warnings.push(`${keyEnv} is not set (needed for ${model}): model ranking answers 503 llm_disabled`);
    }
  }
  // Without a model the kill switch is forced off, so the route answers 503 and clients stay in ghost mode.
  const flags: Flags = llm ? new EnvFlags(env) : new StaticFlags(false);
  if (!production) warnings.push('quota: in-memory and per instance (best effort; not a global cap)');
  let salt = env.IP_HASH_SALT ?? '';
  if (salt.length < 16) {
    salt = randomBytes(16).toString('hex');
    if (env.IP_HASH_SALT) warnings.push('IP_HASH_SALT shorter than 16 characters; using a random per-instance salt');
  }
  return {
    production,
    salt,
    allowedOrigins: parseOrigins(env.ALLOWED_ORIGINS),
    warnings,
    deps: {
      llm: llm ?? new FakeLlmClient({ error: new Error('no model configured') }),
      quota: new MemoryQuotaStore(),
      flags,
      now: opts.now ?? Date.now,
      options: { log: consoleMetrics, timeoutMs: timeoutFromEnv(env.DECODE_TIMEOUT_MS) },
    },
  };
}
