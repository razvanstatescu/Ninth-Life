/**
 * Eval harness types. Spec: .kiro/specs/eval-harness (Req 3.x decoders, Req 4.x simulated user and metrics).
 */
import type { Mode } from '@ninth/core';

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
}

export interface DecodeOutput {
  /** Candidates as the person would see them, best first (after any validator). */
  candidates: string[][];
  /** Candidates before the validator (LLM configs only); used for the invalid-rate metric. */
  raw?: string[][];
  /** Cost of this call in USD, if the decoder knows it. */
  usd?: number;
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
}

export interface ConfigResult {
  id: string;
  label: string;
  status: 'ok' | 'not-run';
  note?: string;
  metrics?: Metrics;
  bySource?: Record<string, Metrics>;
}

/** Deterministic results (RESULTS.json): no timings, no dates. */
export interface Results {
  harness: string;
  fixture: { path: string; sha256: string; rows: number };
  lexicon: { sha256: string; words: number };
  bigram: { sha256: string };
  subset: { quick: boolean; seed: number; items: number };
  k: number;
  mode: Mode;
  configs: ConfigResult[];
}

/** Non-deterministic timings, reported next to Results but never inside RESULTS.json. */
export interface Timing {
  [configId: string]: { p50: number; p95: number; n: number };
}
