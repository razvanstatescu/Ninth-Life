// Claude models the decoder can call through the Anthropic Messages API.
//
// Sources (checked 2026-11-06, see docs/research/anthropic-models.md):
// - Pricing: https://platform.claude.com/docs/en/about-claude/pricing
// - Prompt caching minimums: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
// - Request rules per model and API version 2026-10-21: claude-api skill reference
//   (shared/model-migration.md "Migrating to Claude Haiku 5.5", shared/api-version-migration.md)

export type ModelId = 'claude-haiku-5-5' | 'claude-haiku-4-5';

export const DEFAULT_MODEL: ModelId = 'claude-haiku-5-5';

export interface PriceUsdPerMTok {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
}

export interface ModelProfile {
  id: ModelId;
  /** Short label returned to clients in `model`. */
  label: string;
  /**
   * Haiku 5.5 thinks by default and the thinking counts toward max_tokens; send
   * `thinking: {type: "disabled"}` (accepted at effort low/medium/high; default effort is medium).
   * Haiku 4.5 does not think unless asked, so nothing is sent.
   */
  disableThinking: boolean;
  /** Minimum cacheable prompt length. Below it a cache_control checkpoint silently does nothing. */
  cacheMinTokens: number;
  /** Rough extra tokens per character versus the chars/4 estimate (Haiku 5.5's tokenizer counts ~30% more). */
  tokenizerFactor: number;
  /** Prices up to 100K-token prompts (our prompts are ~1K). */
  price: PriceUsdPerMTok;
}

export const MODEL_PROFILES: Readonly<Record<ModelId, ModelProfile>> = {
  'claude-haiku-5-5': {
    id: 'claude-haiku-5-5',
    label: 'haiku-5.5',
    disableThinking: true,
    cacheMinTokens: 512,
    tokenizerFactor: 1.3,
    price: { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite5m: 0.125 },
  },
  'claude-haiku-4-5': {
    id: 'claude-haiku-4-5',
    label: 'haiku-4.5',
    disableThinking: false,
    cacheMinTokens: 4096,
    tokenizerFactor: 1,
    price: { input: 1, output: 5, cacheRead: 0.1, cacheWrite5m: 1.25 },
  },
};

export function isModelId(v: string | undefined): v is ModelId {
  return v === 'claude-haiku-5-5' || v === 'claude-haiku-4-5';
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
