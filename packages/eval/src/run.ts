/** Run decoders over test items with the simulated user. Pure apart from the timing clock. */
import { DEFAULT_LETTER_PENALTY, Lexicon, type BigramFile, type LexiconFile, type LmOptions, type Mode } from '@ninth/core';
import { dictDecoder, ghostDecoder, llmDecoder, LLM_CONFIGS, type LlmProposer } from './decoders';
import { aggregate, percentile } from './metrics';
import { sample } from './rng';
import { simulate } from './simulate';
import type { ConfigResult, Decoder, ItemResult, Results, TestItem, Timing } from './types';

export const HARNESS_VERSION = 'ninth-eval/1';
export const QUICK_SIZE = 200;
export const DEFAULT_SEED = 9;
export const DEFAULT_K = 5;

export interface RunInput {
  items: TestItem[];
  fixture: { path: string; sha256: string };
  lexicon: { data: LexiconFile; sha256: string };
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

export async function runEval(input: RunInput): Promise<{ results: Results; timing: Timing; perItem: Record<string, ItemResult[]> }> {
  const seed = input.seed ?? DEFAULT_SEED;
  const k = input.k ?? DEFAULT_K;
  const mode = input.mode ?? 'letter';
  const quick = input.quick ?? false;
  const now = input.now ?? (() => performance.now());
  const lex = Lexicon.fromJSON(input.lexicon.data);
  const items = selectItems(input.items, quick, seed);
  const { decoders, missing } = buildDecoders(lex, input.bigram.data, input.llm, input.lm);

  const configs: ConfigResult[] = [];
  const timing: Timing = {};
  const perItem: Record<string, ItemResult[]> = {};
  const wanted = (id: string) => !input.only || input.only.includes(id);

  for (const d of decoders) {
    if (!wanted(d.id)) continue;
    const rs: ItemResult[] = [];
    const ms: number[] = [];
    for (const item of items) {
      const t0 = now();
      const out = await d.decode({ codes: item.codes, mode, k, partner: item.partner });
      ms.push(now() - t0);
      rs.push(simulate(item, out, lex, k, mode));
    }
    const isLlm = (LLM_CONFIGS as readonly string[]).includes(d.id);
    const hasRaw = isLlm;
    const hasCost = isLlm;
    const bySource: Record<string, ReturnType<typeof aggregate>> = {};
    for (const src of ['aac', 'turk'] as const) {
      const sub = rs.filter((_, i) => items[i]!.src === src);
      if (sub.length > 0) bySource[src] = aggregate(sub, k, hasRaw, hasCost);
    }
    configs.push({ id: d.id, label: d.label, status: 'ok', metrics: aggregate(rs, k, hasRaw, hasCost), bySource });
    timing[d.id] = { p50: round2(percentile(ms, 50)), p95: round2(percentile(ms, 95)), n: ms.length };
    perItem[d.id] = rs;
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
  return { results, timing, perItem };
}

const round2 = (x: number) => Math.round(x * 100) / 100;

/** Canonical serialisation of RESULTS.json (byte-identical for identical inputs and seed). */
export function serializeResults(r: Results): string {
  return JSON.stringify(r, null, 2) + '\n';
}
