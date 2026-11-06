/**
 * Cost estimate printed before any model call (spec Req 8.5):
 * calls still to send x average tokens per call x models.ts list prices.
 *
 * Calls whose request is already in the response cache cost nothing and are not counted. Average
 * tokens come from the cache when it already holds replies from this model (measured usage), else
 * from the prompt length (chars/4 x the model's tokenizer factor) and an output allowance of
 * 4 + k x (slots x 3 + 2) tokens, capped at max_tokens.
 */
import { estimateTokens, shouldCache, type ModelProfile } from '@ninth/decoder';
import type { LlmConfig } from '../decoders';
import type { PlannedCall } from './configs';
import type { ResponseCache } from './transport';

export interface CostEstimate {
  model: string;
  /** Requests the configs make, counting B2 and B3 separately. */
  planned: number;
  /** Distinct requests (B3 reuses B2's). */
  unique: number;
  cached: number;
  toSend: number;
  basis: 'measured' | 'prompt length';
  inputPerCall: number;
  outputPerCall: number;
  /** Expected cost of the calls to send, all input billed as uncached input. Gates `--yes`. */
  usd: number;
  /** The same with the system prompt read from the prompt cache, where the model caches it. */
  usdWarmCache: number;
  /** Every call using its whole max_tokens, nothing cached. */
  usdUpperBound: number;
  perConfig: { config: LlmConfig; calls: number; toSend: number }[];
}

/** Proceeding above this many dollars needs `--yes`. */
export const CONFIRM_ABOVE_USD = 1;

const MIN_MEASURED = 10;

interface UsageLike {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

export function estimateCost(plan: readonly PlannedCall[], profile: ModelProfile, cache: ResponseCache, k: number): CostEstimate {
  const unique = new Map<string, PlannedCall>();
  for (const c of plan) if (!unique.has(c.key)) unique.set(c.key, c);
  const pending = [...unique.values()].filter((c) => !cache.has(c.key));

  const measured = cache
    .entries(profile.id)
    .map((e) => (e.response as { usage?: UsageLike } | null)?.usage)
    .filter((u): u is UsageLike => !!u);
  const useMeasured = measured.length >= MIN_MEASURED;
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const mIn = avg(measured.map((u) => (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0)));
  const mOut = avg(measured.map((u) => u.output_tokens ?? 0));

  const f = profile.tokenizerFactor;
  let inTok = 0;
  let outTok = 0;
  let outMax = 0;
  let sysTok = 0;
  let cacheable = false;
  for (const c of pending) {
    const slots = (c.prompt.user.match(/^\d+ \[/gm) ?? []).length;
    inTok += useMeasured ? mIn : Math.ceil((estimateTokens(c.prompt.system) + estimateTokens(c.prompt.user)) * f);
    outTok += useMeasured ? mOut : Math.min(c.maxTokens, 4 + k * (slots * 3 + 2));
    outMax += c.maxTokens;
    sysTok = Math.ceil(estimateTokens(c.prompt.system) * f);
    cacheable ||= shouldCache(profile, c.prompt.system);
  }
  const p = profile.price;
  const usd = (inTok * p.input + outTok * p.output) / 1e6;
  const warm = cacheable && pending.length > 0
    ? ((inTok - sysTok * pending.length) * p.input + sysTok * (pending.length - 1) * p.cacheRead + sysTok * p.cacheWrite5m + outTok * p.output) / 1e6
    : usd;
  const ids = [...new Set(plan.map((c) => c.config))];
  const n = pending.length || 1;
  return {
    model: profile.id,
    planned: plan.length,
    unique: unique.size,
    cached: unique.size - pending.length,
    toSend: pending.length,
    basis: useMeasured ? 'measured' : 'prompt length',
    inputPerCall: Math.round(inTok / n),
    outputPerCall: Math.round(outTok / n),
    usd,
    usdWarmCache: warm,
    usdUpperBound: (inTok * p.input + outMax * p.output) / 1e6,
    perConfig: ids.map((config) => {
      const mine = plan.filter((c) => c.config === config);
      const first = new Set<string>();
      // A request counts as "to send" for the first config that needs it (B3 reuses B2's replies).
      for (const c of plan) {
        if (c.config === config) break;
        first.add(c.key);
      }
      return { config, calls: mine.length, toSend: mine.filter((c) => !cache.has(c.key) && !first.has(c.key)).length };
    }),
  };
}

const usd = (x: number) => (x < 0.01 ? `$${x.toFixed(4)}` : `$${x.toFixed(2)}`);

export function formatEstimate(e: CostEstimate, label: string): string {
  const lines = [
    `Cost estimate for ${e.model} (${label}), before any call:`,
    ...e.perConfig.map((c) => `  ${c.config}: ${c.calls} requests, ${c.toSend} to send`),
    `  ${e.unique} distinct requests (identical requests, such as B3's copy of B2's, are sent once), ${e.cached} already in the response cache, ${e.toSend} to send`,
    `  per call (${e.basis}): ~${e.inputPerCall} input tokens, ~${e.outputPerCall} output tokens`,
    `  expected ${usd(e.usd)} (no prompt-cache discount)` +
      (e.usdWarmCache < e.usd ? `; ${usd(e.usdWarmCache)} if the system prompt is read from the prompt cache` : '') +
      `; upper bound ${usd(e.usdUpperBound)} (max_tokens used in full)`,
  ];
  return lines.join('\n');
}
