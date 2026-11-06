/** Run decoders over test items with the simulated user. Pure apart from the timing clock. */
import { DEFAULT_LETTER_PENALTY, lattice, Lexicon, type BigramFile, type LexiconFile, type LexiconFileV2, type LmOptions, type Mode } from '@ninth/core';
import { dictDecoder, ghostDecoder, llmDecoder, LLM_CONFIGS, type LlmProposer } from './decoders';
import { aggregate, percentile } from './metrics';
import { sample } from './rng';
import { codesFor, simulate } from './simulate';
import type { ConfigResult, Decoder, DecodeOutput, ItemResult, LatticeCoverage, LlmAggregate, Results, TestItem, Timing } from './types';

export const HARNESS_VERSION = 'ninth-eval/1';
export const QUICK_SIZE = 200;
export const DEFAULT_SEED = 9;
export const DEFAULT_K = 5;

export interface RunInput {
  items: TestItem[];
  fixture: { path: string; sha256: string };
  lexicon: { data: LexiconFile | LexiconFileV2; sha256: string };
  bigram: { data: BigramFile; sha256: string };
  quick?: boolean;
  seed?: number;
  k?: number;
  mode?: Mode;
  /** Optional LLM backend for B2-B4. */
  llm?: LlmProposer;
  /** Restrict to these config ids. */
  only?: string[];
  /** Language-model options for every config (default: core's defaults, ADR-core-002). */
  lm?: LmOptions;
  /** Clock for latency (ms). Injected so tests can make timing deterministic too. */
  now?: () => number;
  /**
   * Further decoders to run after the built-in ones (the model configs from `src/llm/`). A
   * decoder here replaces the "not run" row of the same id.
   */
  extra?: Decoder[];
  /** Items decoded at once for non-deterministic (model) decoders; default 1. Results keep item order. */
  concurrency?: number;
  /** Items to evaluate instead of the quick/full choice (e.g. a seeded `--limit` sample). */
  select?: (items: TestItem[]) => TestItem[];
}

/** The server-side model deadline in the decode route (packages/decoder DEFAULT_TIMEOUT_MS). */
export const ROUTE_DEADLINE_MS = 1200;

/** Map with at most `limit` calls in flight; results stay in input order. */
export async function mapPool<T, R>(xs: readonly T[], limit: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(xs.length);
  let next = 0;
  const width = Math.max(1, Math.min(Math.floor(limit) || 1, xs.length));
  const worker = async () => {
    while (next < xs.length) {
      const i = next++;
      out[i] = await fn(xs[i]!, i);
    }
  };
  await Promise.all(Array.from({ length: width }, worker));
  return out;
}

function llmTotals(outs: readonly DecodeOutput[]): LlmAggregate | undefined {
  if (!outs.some((o) => o.llm)) return undefined;
  const t: LlmAggregate = { calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, usd: 0, refusals: 0, unparseable: 0, degraded: 0, skipped: 0 };
  let micros = 0;
  for (const o of outs) {
    const l = o.llm;
    if (!l) continue;
    t.calls += l.calls;
    t.inputTokens += l.inputTokens;
    t.outputTokens += l.outputTokens;
    t.cacheReadTokens += l.cacheReadTokens;
    t.cacheWriteTokens += l.cacheWriteTokens;
    micros += l.usdMicros;
    t.refusals += l.refusals;
    t.unparseable += l.unparseable;
    t.degraded += l.degraded;
    t.skipped += l.skipped;
  }
  t.usd = Math.round(micros) / 1e6;
  return t;
}

/** Share of gold words (and whole sentences) found in their slot of `lattice(codes, lex, perSlot, mode)`. */
export function latticeCoverage(items: readonly TestItem[], lex: Lexicon, mode: Mode, perSlot = 12): LatticeCoverage {
  let words = 0;
  let inLat = 0;
  let full = 0;
  for (const item of items) {
    const lat = lattice(codesFor(item, mode), lex, perSlot, mode);
    const hits = item.words.filter((w, i) => lat[i]?.includes(w)).length;
    words += item.words.length;
    inLat += hits;
    if (hits === item.words.length) full++;
  }
  return { perSlot, words, wordsInLattice: inLat, items: items.length, itemsInLattice: full };
}

export function selectItems(items: TestItem[], quick: boolean, seed: number): TestItem[] {
  return quick ? sample(items, QUICK_SIZE, seed) : items.slice();
}

export function buildDecoders(lex: Lexicon, bigram: BigramFile, llm?: LlmProposer, lmOpts?: LmOptions): { decoders: Decoder[]; missing: string[] } {
  const decoders: Decoder[] = [dictDecoder(lex, lmOpts), ghostDecoder(lex, bigram, lmOpts)];
  const missing: string[] = [];
  for (const id of LLM_CONFIGS) {
    if (llm) decoders.push(llmDecoder(id, llm, lex, bigram, lmOpts));
    else missing.push(id);
  }
  return { decoders, missing };
}

const LABELS: Record<string, string> = { B2: 'B2 LLM raw', B3: 'B3 LLM+val', B4: 'B4 lattice+val' };

export interface RunOutput {
  results: Results;
  timing: Timing;
  perItem: Record<string, ItemResult[]>;
  /** Decoder outputs per config, in item order (for per-item records). */
  outputs: Record<string, DecodeOutput[]>;
  /** The items that were evaluated, in order. */
  items: TestItem[];
}

export async function runEval(input: RunInput): Promise<RunOutput> {
  const seed = input.seed ?? DEFAULT_SEED;
  const k = input.k ?? DEFAULT_K;
  const mode = input.mode ?? 'letter';
  const quick = input.quick ?? false;
  const now = input.now ?? (() => performance.now());
  const lex = Lexicon.fromJSON(input.lexicon.data);
  const items = input.select ? input.select(input.items) : selectItems(input.items, quick, seed);
  const built = buildDecoders(lex, input.bigram.data, input.llm, input.lm);
  const extraIds = new Set((input.extra ?? []).map((d) => d.id));
  const decoders = [...built.decoders.filter((d) => !extraIds.has(d.id)), ...(input.extra ?? [])];
  const missing = built.missing.filter((id) => !extraIds.has(id));

  const configs: ConfigResult[] = [];
  const timing: Timing = {};
  const perItem: Record<string, ItemResult[]> = {};
  const outputs: Record<string, DecodeOutput[]> = {};
  const wanted = (id: string) => !input.only || input.only.includes(id);

  for (const d of decoders) {
    if (!wanted(d.id)) continue;
    const decodeOne = async (item: TestItem) => {
      const t0 = now();
      const out = await d.decode({ codes: codesFor(item, mode), mode, k, partner: item.partner });
      return { out, ms: now() - t0 };
    };
    const runs = d.deterministic
      ? await mapPool(items, 1, decodeOne)
      : await mapPool(items, input.concurrency ?? 1, decodeOne);
    const outs = runs.map((r) => r.out);
    const rs = items.map((item, i) => simulate(item, outs[i]!, lex, k, mode));
    // Model configs report the recorded latency of each API call; offline ones the decode time.
    const recorded = outs.some((o) => o.llm);
    const ms = recorded ? outs.flatMap((o) => o.llm?.latencyMs ?? []) : runs.map((r) => r.ms);
    const isLlm = (LLM_CONFIGS as readonly string[]).includes(d.id);
    const hasRaw = isLlm;
    const hasCost = isLlm;
    const bySource: Record<string, ReturnType<typeof aggregate>> = {};
    for (const src of ['aac', 'turk'] as const) {
      const sub = rs.filter((_, i) => items[i]!.src === src);
      if (sub.length > 0) bySource[src] = aggregate(sub, k, hasRaw, hasCost);
    }
    const cfg: ConfigResult = { id: d.id, label: d.label, status: 'ok', metrics: aggregate(rs, k, hasRaw, hasCost), bySource };
    const llm = llmTotals(outs);
    if (llm) cfg.llm = llm;
    configs.push(cfg);
    timing[d.id] = { p50: round2(percentile(ms, 50)), p95: round2(percentile(ms, 95)), n: ms.length };
    if (recorded) timing[d.id]!.overDeadline = ms.length ? round4(ms.filter((x) => x > ROUTE_DEADLINE_MS).length / ms.length) : 0;
    perItem[d.id] = rs;
    outputs[d.id] = outs;
  }
  for (const id of missing) {
    if (!wanted(id)) continue;
    configs.push({ id, label: LABELS[id]!, status: 'not-run', note: 'no LLM backend configured (pass --llm <module>)' });
  }
  configs.sort((a, b) => a.id.localeCompare(b.id));

  const results: Results = {
    harness: HARNESS_VERSION,
    fixture: { path: input.fixture.path, sha256: input.fixture.sha256, rows: input.items.length },
    lexicon: { sha256: input.lexicon.sha256, words: lex.size },
    bigram: { sha256: input.bigram.sha256 },
    lm: { letterPenalty: input.lm?.letterPenalty ?? DEFAULT_LETTER_PENALTY },
    subset: { quick, seed, items: items.length },
    k,
    mode,
    configs,
  };
  return { results, timing, perItem, outputs, items };
}

const round2 = (x: number) => Math.round(x * 100) / 100;
const round4 = (x: number) => Math.round(x * 1e4) / 1e4;

/** Canonical serialisation of RESULTS.json (byte-identical for identical inputs and seed). */
export function serializeResults(r: Results): string {
  return JSON.stringify(r, null, 2) + '\n';
}
