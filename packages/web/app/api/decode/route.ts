/**
 * POST /api/decode: the production decode endpoint (Vercel), docs/decisions/ADR-001-anthropic-api-no-aws.md.
 * Thin wrapper over @ninth/decoder's fetch adapter, which checks the Origin, the 4 KB limit and the
 * kill switch, hashes the IP with a salt, applies a best-effort per-instance limiter, calls the
 * Anthropic Messages API with a 1.2 s deadline and validates every word against the keys.
 *
 * Environment (Vercel project settings; see packages/web/.env.example):
 *   LLM_ENABLED        "true" turns model ranking on (kill switch; default off). Redeploy after a change.
 *   ANTHROPIC_API_KEY  required for model calls; without it the route answers 503 llm_disabled
 *   DECODE_MODEL       claude-haiku-5-5 (default) | claude-haiku-4-5
 *   IP_HASH_SALT       salt for the per-day IP hash
 *   ALLOWED_ORIGINS    extra allowed origins (the deployment's own origin is always allowed)
 *   DECODE_FAKE_LLM    "true" uses a fake model in dev (ignored in production)
 *
 * Per-IP rate limiting is the Vercel WAF rule; the hard cap is the Anthropic Console spend limit.
 * Request bodies are never logged.
 */
import { configFromEnv, createFetchHandler } from '@ninth/decoder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** The model deadline is 1.2 s and the client gives up at 1.5 s; 10 s is a generous ceiling. */
export const maxDuration = 10;

let handler: ((req: Request) => Promise<Response>) | null = null;

function getHandler(): (req: Request) => Promise<Response> {
  if (handler) return handler;
  const cfg = configFromEnv(process.env);
  if (!cfg.production) for (const w of cfg.warnings) console.warn(`[decode] ${w}`);
  handler = createFetchHandler(cfg);
  return handler;
}

export async function POST(req: Request): Promise<Response> {
  try {
    return await getHandler()(req);
  } catch {
    return new Response(JSON.stringify({ error: 'unavailable' }), {
      status: 503,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }
}

export function GET(): Response {
  return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
    status: 405,
    headers: { 'content-type': 'application/json', allow: 'POST' },
  });
}
