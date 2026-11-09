// Models the decoder can call. All of them speak the Anthropic Messages protocol: Claude through
// api.anthropic.com, MiniMax through its Anthropic-compatible endpoint (ADR-002).
//
// Sources (checked 2026-11-06, see docs/research/anthropic-models.md):
// - Pricing: https://platform.claude.com/docs/en/about-claude/pricing
// - Prompt caching minimums: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
// - Request rules per model and API version 2026-10-21: claude-api skill reference
//   (shared/model-migration.md "Migrating to Claude Haiku 5.5", shared/api-version-migration.md)
// - MiniMax (checked 2026-11-09, see docs/research/minimax-models.md):
//   https://platform.minimax.io/docs/api-reference/text-anthropic-api,
//   https://platform.minimax.io/docs/guides/pricing

export type Provider = 'anthropic' | 'minimax';

export const ANTHROPIC_MODELS = ['claude-haiku-5-5', 'claude-haiku-4-5'] as const;
export const MINIMAX_MODELS = ['MiniMax-M3', 'MiniMax-M3.1-Flash'] as const;
export const MODEL_IDS = [...ANTHROPIC_MODELS, ...MINIMAX_MODELS] as const;

export type ModelId = (typeof MODEL_IDS)[number];

/** Default when ANTHROPIC_API_KEY is set (or no key is set). */
export const DEFAULT_MODEL: ModelId = 'claude-haiku-5-5';
/** Default when only MINIMAX_API_KEY is set. */
export const DEFAULT_MINIMAX_MODEL: ModelId = 'MiniMax-M3';

export interface PriceUsdPerMTok {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
}

export interface ModelProfile {
  id: ModelId;
  provider: Provider;
  /** Short label returned to clients in `model`. */
  label: string;
  /**
   * Haiku 5.5 thinks by default and the thinking counts toward max_tokens; send
   * `thinking: {type: "disabled"}` (accepted at effort low/medium/high; default effort is medium).
   * Haiku 4.5 does not think unless asked, so nothing is sent.
   */
  disableThinking: boolean;
  /**
   * Models that always think (MiniMax-M3.1-Flash: `thinking: disabled` is a 400) get this much
   * extra max_tokens for the thinking, and `output_config.effort` set to `effort`.
   */
  thinkingHeadroom?: number;
  effort?: 'low' | 'medium' | 'high';  /** Minimum cacheable prompt length. Below it a cache_control checkpoint silently does nothing. */
  cacheMinTokens: number;
  /** Rough extra tokens per character versus the chars/4 estimate (Haiku 5.5's tokenizer counts ~30% more). */
  tokenizerFactor: number;
  /** Prices up to 100K-token prompts (our prompts are ~1K). */
  price: PriceUsdPerMTok;
}

export const MODEL_PROFILES: Readonly<Record<ModelId, ModelProfile>> = {
  'claude-haiku-5-5': {
    id: 'claude-haiku-5-5',
    provider: 'anthropic',
    label: 'haiku-5.5',
    disableThinking: true,
    cacheMinTokens: 512,
    tokenizerFactor: 1.3,
    price: { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite5m: 0.125 },
  },
  'claude-haiku-4-5': {
    id: 'claude-haiku-4-5',
    provider: 'anthropic',
    label: 'haiku-4.5',
    disableThinking: false,
    cacheMinTokens: 4096,
    tokenizerFactor: 1,
    price: { input: 1, output: 5, cacheRead: 0.1, cacheWrite5m: 1.25 },
  },
  // MiniMax-M3 thinks only when asked; `thinking: {type: "disabled"}` keeps it off (documented).
  // MiniMax does not document cache_control, so no checkpoint is sent (cacheMinTokens Infinity);
  // cache reads it reports are still priced. Cache writes are not priced separately (0).
  'MiniMax-M3': {
    id: 'MiniMax-M3',
    provider: 'minimax',
    label: 'minimax-m3',
    disableThinking: true,
    cacheMinTokens: Number.POSITIVE_INFINITY,
    tokenizerFactor: 1,
    price: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite5m: 0 },
  },
  // Always thinks: no thinking field (disabled is a 400), effort low, extra max_tokens. Likely too
  // slow for the route's deadline; kept for the eval and the live check.
  'MiniMax-M3.1-Flash': {
    id: 'MiniMax-M3.1-Flash',
    provider: 'minimax',
    label: 'minimax-m3.1-flash',
    disableThinking: false,
    thinkingHeadroom: 1024,
    effort: 'low',
    cacheMinTokens: Number.POSITIVE_INFINITY,
    tokenizerFactor: 1,
    price: { input: 0.15, output: 0.6, cacheRead: 0.015, cacheWrite5m: 0 },
  },
};

export function isModelId(v: string | undefined): v is ModelId {
  return (MODEL_IDS as readonly string[]).includes(v ?? '');
}

/** The default model for whichever API key is configured (Anthropic wins when both are set). */
export function defaultModelFor(env: { ANTHROPIC_API_KEY?: string; MINIMAX_API_KEY?: string }): ModelId {
  return !env.ANTHROPIC_API_KEY && env.MINIMAX_API_KEY ? DEFAULT_MINIMAX_MODEL : DEFAULT_MODEL;
}

/** Estimated cost of one call in micro-dollars (1e-6 USD), rounded up. */
export function costMicros(
  p: ModelProfile,
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number },
): number {
  const usd =
    (usage.inputTokens * p.price.input +
      usage.outputTokens * p.price.output +
      (usage.cacheReadTokens ?? 0) * p.price.cacheRead +
      (usage.cacheWriteTokens ?? 0) * p.price.cacheWrite5m) /
    1_000_000;
  return Math.ceil(usd * 1_000_000);
}
