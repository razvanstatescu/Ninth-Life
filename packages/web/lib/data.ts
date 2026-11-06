/**
 * Loads the offline dictionary from /data (copied by scripts/copy-data.mjs; never bundled).
 * Missing files are a normal state: the app shows "Dictionary not loaded" and keeps the keys.
 */
import {
  Lexicon,
  bigramModel,
  unigramModel,
  type BigramFile,
  type LanguageModel,
  type LexiconFile,
} from '@ninth/core';

export const DATA_PATHS = {
  lexicon: '/data/lexicon/en.v1.json',
  bigram: '/data/lexicon/en.bigram.v1.json',
  pack: '/data/packs/core-en.json',
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

export async function loadDictionary(fetchImpl: FetchLike = (u) => fetch(u)): Promise<DictState> {
  let file: LexiconFile | null;
  try {
    file = await getJson<LexiconFile>(fetchImpl, DATA_PATHS.lexicon);
  } catch (e) {
    // A failed fetch offline (no cached copy yet) reads the same as a missing file.
    return { status: 'missing' };
  }
  if (!file) return { status: 'missing' };

  let lexicon: Lexicon;
  try {
    lexicon = Lexicon.fromJSON(file);
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }

  let pack: VocabPack | null = null;
  try {
    const p = await getJson<unknown>(fetchImpl, DATA_PATHS.pack);
    if (isPack(p)) {
      pack = p;
      lexicon.addWords(p.words);
    }
  } catch {
    /* the pack is optional */
  }

  let lm: LanguageModel = unigramModel(lexicon);
  let model: 'bigram' | 'unigram' = 'unigram';
  try {
    const b = await getJson<BigramFile>(fetchImpl, DATA_PATHS.bigram);
    if (b) {
      lm = bigramModel(b, lexicon);
      model = 'bigram';
    }
  } catch {
    /* frequency ranking still works */
  }

  return { status: 'ready', lexicon, lm, model, pack };
}
