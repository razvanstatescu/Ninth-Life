/**
 * Language models for ghost-mode decoding. All scores are log10 probabilities.
 * Requirements: core-encoder Req 4.1 – 4.5.
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

/**
 * Default log10 penalty for a one-letter word other than "a" and "i" (ADR-core-002, plan F2).
 * wordfreq ranks every letter of the alphabet as a word (Zipf 4.5 - 5.9: "h", "t", "s" ...), so
 * without it ghost mode offers "H need water". The penalty only lowers scores: it never removes a
 * word from the lexicon or the lattice, so a spelled letter ("vitamin c") can still be chosen.
 */
export const DEFAULT_LETTER_PENALTY = -3;
/** One-letter words that are ordinary words in English; never penalised by default. */
export const SPOKEN_LETTERS: readonly string[] = ['a', 'i'];

/** Options for unigramModel and bigramModel (additive, ADR-core-002). */
export interface LmOptions {
  /**
   * log10 added to the score of a one-letter word that is not in `spokenLetters` (values above 0
   * count as 0). Default DEFAULT_LETTER_PENALTY; 0 turns the penalty off. The result never goes
   * below LOGP_FLOOR.
   */
  letterPenalty?: number;
  /** One-letter words that are not penalised. Default SPOKEN_LETTERS ("a", "i"). */
  spokenLetters?: readonly string[];
}

const PLAIN = /^[a-z']*$/;
const norm = (w: string): string => (PLAIN.test(w) ? w : normalize(w));
const ONE_LETTER = /^'*[a-z]'*$/;

/** log10 penalty for a normalized word: `pen` for a one-letter word outside `keep`, else 0. */
function letterPenalty(opts: LmOptions | undefined): (w: string) => number {
  const raw = opts?.letterPenalty ?? DEFAULT_LETTER_PENALTY;
  const pen = typeof raw === 'number' && Number.isFinite(raw) ? Math.min(0, raw) : DEFAULT_LETTER_PENALTY;
  if (pen === 0) return () => 0;
  const keep = new Set((opts?.spokenLetters ?? SPOKEN_LETTERS).map((w) => norm(w).replace(/'/g, '')));
  return (w) => (ONE_LETTER.test(w) && !keep.has(w.replace(/'/g, '')) ? pen : 0);
}

/**
 * log10 p(word) = zipf - 9, clamped to [-9, 0]; unknown words get -9.
 * A one-letter word other than "a" and "i" also gets `opts.letterPenalty` (default -3), still
 * clamped to [-9, 0].
 */
export function unigramModel(lex: Lexicon, opts?: LmOptions): LanguageModel {
  const penalty = letterPenalty(opts);
  return {
    logP(_prev: string, word: string): number {
      const w = norm(word);
      const z = lex.zipf(w);
      if (z === undefined) return LOGP_FLOOR;
      return Math.min(0, Math.max(LOGP_FLOOR, z - 9 + penalty(w)));
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
 * The one-letter penalty (`opts`, see unigramModel) applies to both branches: the unigram it backs
 * off to is penalised, and a listed value gets the same penalty, floored at LOGP_FLOOR.
 */
export function bigramModel(file: BigramFile, lex: Lexicon, opts?: LmOptions): LanguageModel {
  if (!file || file.v !== 1 || typeof file.logp !== 'object' || file.logp === null) {
    throw new TypeError('bigramModel: expected a BigramFile with v: 1');
  }
  const uni = unigramModel(lex, opts);
  const penalty = letterPenalty(opts);
  const bos = typeof file.bos === 'string' ? file.bos : BOS;
  const backoff = file.backoff ?? {};
  return {
    logP(prev: string, word: string): number {
      const p = prev === bos || prev === BOS ? bos : norm(prev);
      const w = norm(word);
      const listed = own(own(file.logp, p), w);
      if (typeof listed === 'number' && Number.isFinite(listed)) {
        const pen = penalty(w);
        return pen === 0 ? Math.min(0, listed) : Math.max(LOGP_FLOOR, Math.min(0, listed) + pen);
      }
      const bo = own(backoff, p);
      return (typeof bo === 'number' && Number.isFinite(bo) ? Math.min(0, bo) : 0) + uni.logP(p, w);
    },
  };
}
