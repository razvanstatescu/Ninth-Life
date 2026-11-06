/**
 * Next.js adapter for the decoder (docs/decisions/ADR-000-nextjs.md). Dev-only unless
 * DECODE_ROUTE_ENABLED=true: production uses the Lambda adapter, and an in-memory quota is not
 * enough on serverless.
 *
 * Environment:
 *   DECODE_ROUTE_ENABLED  "true" turns this route on; anything else -> 503 llm_disabled
 *   LLM_ENABLED           "true" lets the decoder call the model (kill switch as an env var)
 *   MODEL_PROFILE         haiku-4.5 | haiku-5.5 | nova-micro (default haiku-4.5)
 *   DECODE_IP_SALT        salt for the per-day IP hash (a random one per process if unset)
 *   DECODE_FAKE_LLM       "true" uses the decoder's fake model (local demos without AWS)
 *
 * Request bodies are never logged.
 */
import { createHash, randomBytes } from 'node:crypto';
import {
  BedrockLlmClient,
  EnvFlags,
  FakeLlmClient,
  LIMITS,
  MemoryQuotaStore,
  handleDecode,
  silentMetrics,
  type DecodeDeps,
} from '@ninth/decoder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const JSON_HEADERS = { 'content-type': 'application/json', 'cache-control': 'no-store' };

function json(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });
}

let deps: DecodeDeps | null = null;
const processSalt = randomBytes(16).toString('hex');

function getDeps(): DecodeDeps {
  if (deps) return deps;
  const model = process.env.MODEL_PROFILE;
  const llm =
    process.env.DECODE_FAKE_LLM === 'true'
      ? new FakeLlmClient('{"c":[]}')
      : new BedrockLlmClient({ model: model === 'haiku-5.5' || model === 'nova-micro' ? model : 'haiku-4.5' });
  deps = { llm, quota: new MemoryQuotaStore(), flags: new EnvFlags(), now: Date.now, options: { log: silentMetrics } };
  return deps;
}

function hashIp(ip: string, now: number): string {
  const salt = process.env.DECODE_IP_SALT || processSalt;
  const day = new Date(now).toISOString().slice(0, 10);
  return createHash('sha256').update(`${salt}|${day}|${ip}`).digest('hex').slice(0, 32);
}

export async function POST(req: Request): Promise<Response> {
  if (process.env.DECODE_ROUTE_ENABLED !== 'true') return json(503, { error: 'llm_disabled' });

  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > LIMITS.maxBodyBytes) return json(413, { error: 'too_large', maxBytes: LIMITS.maxBodyBytes });
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > LIMITS.maxBodyBytes) {
    return json(413, { error: 'too_large', maxBytes: LIMITS.maxBodyBytes });
  }

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
  try {
    const d = getDeps();
    const res = await handleDecode(raw, { ipHash: hashIp(ip, d.now()), origin: req.headers.get('origin') ?? undefined }, d);
    return json(res.status, res.json, res.headers);
  } catch {
    return json(503, { error: 'unavailable' });
  }
}

export function GET(): Response {
  return json(405, { error: 'method_not_allowed' }, { allow: 'POST' });
}
