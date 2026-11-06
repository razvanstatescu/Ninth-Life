/**
 * Language models for ghost-mode decoding. All scores are log10 probabilities.
 * Requirements: core-encoder Req 4.1 – 4.4.
 */
import { normalize } from './keymap';
import type { Lexicon } from './lexicon';

/** data/lexicon/<lang>.bigram.v1.json */
export interface BigramFile {
  v: 1;
  lang: string;
  source: string;
  license: string;
  bos: '<s>';
  /** log10 P(w | prev), 2 decimals; prev may be '<s>'. */
  logp: Record<string, Record<string, number>>;
  /** log10 backoff weight for prev. */
  backoff: Record<string, number>;
}

export interface LanguageModel {
  logP(prev: string, word: string): number;
}

/** Sentence-start token. */
export const BOS = '<s>';
/** log10 floor for unknown words (zipf 0 = once per billion words). */
export const LOGP_FLOOR = -9;

const PLAIN = /^[a-z']*$/;
const norm = (w: string): string => (PLAIN.test(w) ? w : normalize(w));

/** log10 p(word) = zipf - 9, clamped to [-9, 0]; unknown words get -9. */
export function unigramModel(lex: Lexicon): LanguageModel {
  return {
    logP(_prev: string, word: string): number {
      const z = lex.zipf(norm(word));
      if (z === undefined) return LOGP_FLOOR;
      return Math.min(0, Math.max(LOGP_FLOOR, z - 9));
    },
  };
}

/** Own-property read: JSON objects inherit "constructor", "toString" ... which are also English words. */
function own<T>(obj: Record<string, T> | undefined, key: string): T | undefined {
  return obj !== undefined && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
}

/**
 * Bigram with Katz/KN-style backoff: log10 P(w | prev) if listed, else backoff(prev) + unigram(w).
 * A prev with no row and no backoff weight backs off with weight 0 (log10 1).
 */
export function bigramModel(file: BigramFile, lex: Lexicon): LanguageModel {
  if (!file || file.v !== 1 || typeof file.logp !== 'object' || file.logp === null) {
    throw new TypeError('bigramModel: expected a BigramFile with v: 1');
  }
  const uni = unigramModel(lex);
  const bos = typeof file.bos === 'string' ? file.bos : BOS;
  const backoff = file.backoff ?? {};
  return {
    logP(prev: string, word: string): number {
      const p = prev === bos || prev === BOS ? bos : norm(prev);
      const w = norm(word);
      const listed = own(own(file.logp, p), w);
      if (typeof listed === 'number' && Number.isFinite(listed)) return Math.min(0, listed);
      const bo = own(backoff, p);
      return (typeof bo === 'number' && Number.isFinite(bo) ? Math.min(0, bo) : 0) + uni.logP(p, w);
    },
  };
}
