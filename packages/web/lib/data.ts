/**
 * Loads the offline dictionary from /data (copied by scripts/copy-data.mjs; never bundled).
 * Missing files are a normal state: the app shows "Dictionary not loaded" and keeps the keys.
 *
 * Performance (plan F9, web-ui Req 23, docs/testing/performance.md):
 * - the lexicon, bigram model and pack are fetched in parallel, then parsed;
 * - the app ships the compact lexicon (en.v2.json, ADR-data-003), about half the bytes of v1;
 * - URLs carry the file's content hash (`?v=`) from the build, so the service worker's precache
 *   reuses the copy this page just downloaded instead of fetching it again;
 * - after loading, the completion index is built in idle time, so no key press pays for it.
 */
import {
  DEFAULT_PER_SLOT,
  DIGITS,
  Lexicon,
  bigramModel,
  decodeGhost,
  unigramModel,
  type BigramFile,
  type LanguageModel,
  type LexiconFile,
  type LexiconFileV2,
} from '@ninth/core';

/** The data files the app loads, without their `?v=` hash. */
export const DATA_FILES = {
  lexicon: '/data/lexicon/en.v2.json',
  bigram: '/data/lexicon/en.bigram.v1.json',
  pack: '/data/packs/core-en.json',
} as const;

/**
 * path -> short content hash, filled in at build time by next.config.mjs (NEXT_PUBLIC_DATA_REV).
 * Empty in tests and in builds without public/data.
 */
function dataRevisions(): Record<string, string> {
  try {
    const raw = process.env.NEXT_PUBLIC_DATA_REV;
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}
const REV = dataRevisions();

/**
 * The URL to fetch a file under /data with: its path plus `?v=<content hash>` when the build knows
 * it. The service worker precaches exactly this URL, so use it for any /data file you fetch.
 */
export function dataUrl(path: string): string {
  const v = REV[path];
  return v ? `${path}?v=${v}` : path;
}

/** The URLs the app fetches (same keys as before; values now carry the content hash). */
export const DATA_PATHS = {
  lexicon: dataUrl(DATA_FILES.lexicon),
  bigram: dataUrl(DATA_FILES.bigram),
  pack: dataUrl(DATA_FILES.pack),
} as const;

export type VocabPack = { id: string; lang: string; version: number; words: { w: string; boost: number }[]; phrases: string[] };

export type DictState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      lexicon: Lexicon;
      lm: LanguageModel;
      /** 'bigram' when the bigram file loaded, else ranking falls back to word frequency. */
      model: 'bigram' | 'unigram';
      pack: VocabPack | null;
    };

type FetchLike = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface LoadOptions {
  /** Build the completion index and warm the decoder in idle time once loaded (default true). */
  warm?: boolean;
}

async function getJson<T>(fetchImpl: FetchLike, url: string): Promise<T | null> {
  const res = await fetchImpl(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

function isPack(v: unknown): v is VocabPack {
  const p = v as VocabPack;
  return !!p && Array.isArray(p.words) && Array.isArray(p.phrases);
}

/** Settled result of one fetch: the value, or the error it failed with. */
type Got<T> = { ok: true; value: T | null } | { ok: false };
const settle = <T>(p: Promise<T | null>): Promise<Got<T>> => p.then((value) => ({ ok: true as const, value }), () => ({ ok: false as const }));

export async function loadDictionary(fetchImpl: FetchLike = (u) => fetch(u), opts: LoadOptions = {}): Promise<DictState> {
  // All three requests go out at once: on a slow phone network each one costs a full round trip.
  const [lexRes, packRes, bigRes] = await Promise.all([
    settle(getJson<LexiconFile | LexiconFileV2>(fetchImpl, DATA_PATHS.lexicon)),
    settle(getJson<unknown>(fetchImpl, DATA_PATHS.pack)),
    settle(getJson<BigramFile>(fetchImpl, DATA_PATHS.bigram)),
  ]);

  // A failed fetch offline (no cached copy yet) reads the same as a missing file.
  if (!lexRes.ok || !lexRes.value) return { status: 'missing' };

  let lexicon: Lexicon;
  try {
    lexicon = Lexicon.fromJSON(lexRes.value);
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }

  let pack: VocabPack | null = null;
  try {
    if (packRes.ok && isPack(packRes.value)) {
      pack = packRes.value;
      lexicon.addWords(pack.words);
    }
  } catch {
    /* the pack is optional */
  }

  let lm: LanguageModel = unigramModel(lexicon);
  let model: 'bigram' | 'unigram' = 'unigram';
  try {
    if (bigRes.ok && bigRes.value) {
      lm = bigramModel(bigRes.value, lexicon);
      model = 'bigram';
    }
  } catch {
    /* frequency ranking still works */
  }

  const state: DictState = { status: 'ready', lexicon, lm, model, pack };
  if (opts.warm !== false) warmDictionary(state);
  return state;
}

type IdleDeadlineLike = { timeRemaining(): number; didTimeout?: boolean };

/** requestIdleCallback where the browser has it (not Safari), else a short timeout. */
export function whenIdle(fn: () => void, timeout = 2000): void {
  const g = globalThis as { requestIdleCallback?: (cb: (d: IdleDeadlineLike) => void, o?: { timeout: number }) => number };
  if (typeof g.requestIdleCallback === 'function') g.requestIdleCallback(() => fn(), { timeout });
  else setTimeout(fn, 50);
}

/**
 * Do the one-off work of the first key presses ahead of time, one short idle slice per step:
 * build the lexicon's completion index (a sort of every code), run one small decode so the
 * engine's code is compiled, then fill the completion cache for each single key (what initials
 * mode reads on every press). No step changes any result. web-ui Req 23.3.
 */
export function warmDictionary(state: DictState, schedule: (fn: () => void) => void = whenIdle): void {
  if (state.status !== 'ready') return;
  const { lexicon, lm } = state;
  const steps: (() => unknown)[] = [
    () => lexicon.prepare(),
    () => decodeGhost(['4', '6333'], { lexicon, lm, k: 5 }),
    ...DIGITS.map((d) => () => lexicon.completions(d, DEFAULT_PER_SLOT)),
  ];
  const run = (i: number) => {
    if (i >= steps.length) return;
    schedule(() => {
      try {
        steps[i]!();
      } catch {
        /* warming is best effort */
      }
      run(i + 1);
    });
  };
  run(0);
}
