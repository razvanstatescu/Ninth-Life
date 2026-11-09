// @ts-check
/**
 * Build-time public values derived from the decode route's server env (next.config.mjs `env`), so
 * the privacy copy names the provider the route really calls and the client waits a little longer
 * than the server's model deadline. Plain JS because next.config.mjs imports it.
 *
 * Must agree with @ninth/decoder's resolveModel() and timeoutFromEnv() (adapters/fetch.ts);
 * test/publicEnv.test.ts checks that. No secret is ever read into the result: only whether a key
 * is set.
 */

const DEFAULT_SERVER_TIMEOUT_MS = 1200;
/** Client budget over the server deadline (network both ways). */
const CLIENT_MARGIN_MS = 300;

/** @param {Record<string, string | undefined>} env @returns {'anthropic' | 'minimax'} */
export function decodeProvider(env) {
  const model = env.DECODE_MODEL?.trim() ?? '';
  if (model === 'MiniMax-M3' || model === 'MiniMax-M3.1-Flash') return 'minimax';
  if (model === 'claude-haiku-5-5' || model === 'claude-haiku-4-5') return 'anthropic';
  return !env.ANTHROPIC_API_KEY && env.MINIMAX_API_KEY ? 'minimax' : 'anthropic';
}

/** @param {string | undefined} v */
export function serverTimeoutMs(v) {
  const n = Number(v);
  if (!v || !Number.isFinite(n)) return DEFAULT_SERVER_TIMEOUT_MS;
  return Math.min(9000, Math.max(300, Math.round(n)));
}

/** @param {Record<string, string | undefined>} env @returns {Record<string, string>} */
export function publicDecodeEnv(env) {
  return {
    NEXT_PUBLIC_DECODE_PROVIDER: decodeProvider(env),
    NEXT_PUBLIC_DECODE_TIMEOUT_MS: env.NEXT_PUBLIC_DECODE_TIMEOUT_MS?.trim() || String(serverTimeoutMs(env.DECODE_TIMEOUT_MS) + CLIENT_MARGIN_MS),
  };
}
