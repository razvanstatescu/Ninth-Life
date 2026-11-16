/**
 * Eval harness types. Spec: .kiro/specs/eval-harness (Req 3.x decoders, Req 4.x simulated user and metrics).
 */
import type { Mode, ReplyIntent } from '@ninth/core';

/** One frozen test item (a line of fixtures/test.v1.jsonl). */
export interface TestItem {
  id: string;
  src: 'aac' | 'turk';
  /** Gold sentence as written by the crowd worker. */
  text: string;
  /** Gold words: normalized, lowercase, internal apostrophes kept. */
  words: string[];
  /** Keypad code of each gold word (letter mode). */
  codes: string[];
  /** Partner's previous turn (Turk pairs only). */
  partner?: string;
}

export interface DecodeInput {
  codes: string[];
  mode: Mode;
  /** Number of sentence candidates wanted. */
  k: number;
  partner?: string;
  /** Reply type, only in an `--intent oracle` run (from the gold sentence, src/intent.ts). */
  intent?: ReplyIntent;
}

export interface DecodeOutput {
  /** Candidates as the person would see them, best first (after any validator). */
  candidates: string[][];
  /** Candidates before the validator (LLM configs only); used for the invalid-rate metric. */
  raw?: string[][];
  /** Cost of this call in USD, if the decoder knows it. */
  usd?: number;
  /** Model-call statistics for this decode (LLM configs run through `src/llm/`). */
  llm?: LlmCallStats;
}

/**
 * What the model calls behind one decode cost (spec eval-harness Req 8.4). Latency is the recorded
 * wall-clock time of each successful API call (from the response cache on a rerun), so reruns
 * report the same numbers.
 */
export interface LlmCallStats {
  /** API requests this decode needed (0 when the shipping client would not call the model). */
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  /** Cost at models.ts list prices, micro-dollars. */
  usdMicros: number;
  latencyMs: number[];
  /** Replies with stop_reason "refusal". */
  refusals: number;
  /** Replies with no JSON `c` array. */
  unparseable: number;
  /** B4: handleDecode answered from ghost beams only (`degraded: true`). */
  degraded: number;
  /** B4: decodes where the app would not call the model (a slot with no lexicon word). */
  skipped: number;
}

/**
 * A decoder under evaluation. B0/B1 wrap @ninth/core; B2-B4 wrap an LLM client supplied by
 * packages/decoder (see decoders.ts `llmDecoder`).
 */
export interface Decoder {
  id: string;
  label: string;
  /** True if the decoder output depends only on its input (no network, no sampling). */
  deterministic: boolean;
  /** True if candidates come through the validator (so spoken output cannot mismatch the keys). */
  validated: boolean;
  decode(input: DecodeInput): DecodeOutput | Promise<DecodeOutput>;
}

/** Per-item outcome from the simulated user. */
export interface ItemResult {
  id: string;
  words: number;
  wordsCorrect: number;
  /** Rank of the gold sentence among candidates, or -1. */
  rank: number;
  chars: number;
  presses: number;
  selections: number;
  scanSteps: number;
  /** Candidates returned before the validator that fail validate() (LLM configs). */
  invalidRaw: number;
  rawCount: number;
  /** True if the gold sentence could not be produced at all (a word missing from the lexicon). */
  unreachable: boolean;
  usd: number;
  /** Initials mode only: gold words the person had to retype in letter mode (not among the slot's readings). */
  retyped?: number;
  /** B1c only: words taken from Finish the word. */
  completed?: number;
  /** B1 and B1c: scan steps on the app's grid (keypad first; scan-cost.ts APP_GRID). */
  scanStepsApp?: number;
}

export interface Metrics {
  items: number;
  words: number;
  wordAcc: number;
  top1: number;
  top5: number;
  ksr: number;
  scanStepsPerChar: number;
  pressesPerChar: number;
  /** Share of pre-validator candidates that fail validate(); null if the decoder has no raw output. */
  invalidPreValidator: number | null;
  unreachable: number;
  usdPer1k: number | null;
  /** Initials mode only: words retyped in letter mode because the initials readings did not hold them. */
  retypedWords?: number;
  /** B1c only: share of gold words taken from Finish the word. */
  completedWords?: number;
  /** B1 and B1c: scan steps per character on the app's grid (keypad rows first). */
  scanStepsPerCharApp?: number;
}

/** Deterministic totals of the model calls behind one LLM config (no timings, Req 6.2). */
export interface LlmAggregate {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  usd: number;
  refusals: number;
  unparseable: number;
  degraded: number;
  skipped: number;
}

export interface ConfigResult {
  id: string;
  label: string;
  status: 'ok' | 'not-run';
  note?: string;
  metrics?: Metrics;
  bySource?: Record<string, Metrics>;
  llm?: LlmAggregate;
}

/** Deterministic results (RESULTS.json): no timings, no dates. */
export interface Results {
  harness: string;
  fixture: { path: string; sha256: string; rows: number };
  lexicon: { sha256: string; words: number };
  bigram: { sha256: string };
  /** Language-model options used for every config (ADR-core-002). */
  lm: { letterPenalty: number };
  subset: { quick: boolean; seed: number; items: number };
  k: number;
  mode: Mode;
  configs: ConfigResult[];
  /** Offline initials-mode baseline (spec Req 9), written by the full run. */
  initials?: { mode: 'initials'; configs: ConfigResult[]; coverage: LatticeCoverage };
}

/** How much of the gold text a lattice holds: the ceiling for a ranker that keeps to listed words. */
export interface LatticeCoverage {
  perSlot: number;
  words: number;
  wordsInLattice: number;
  items: number;
  itemsInLattice: number;
}

/** Non-deterministic timings, reported next to Results but never inside RESULTS.json. */
export interface Timing {
  /**
   * n = number of timed calls. For LLM configs the times are the recorded API call latencies and
   * `overDeadline` is the share above the decode route's 1,200 ms server deadline.
   */
  [configId: string]: { p50: number; p95: number; n: number; overDeadline?: number };
}
