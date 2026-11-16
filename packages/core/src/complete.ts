/**
 * Finish the word (web-ui Req 31.1, 31.7): the words that start with the keys typed so far, ranked by the
 * word-pair model given the word before. Every word offered encodes to a code that starts with the prefix
 * and is longer, so taking one only adds keys; the validator still checks the full code.
 */
import { encodeWord, isCode } from './keymap';
import type { Lexicon } from './lexicon';
import type { LanguageModel } from './lm';

/** Words offered at most (three fixed places in the app). */
export const MAX_COMPLETIONS = 3;
/** Most frequent lexicon words under the prefix that are ranked (plus the word-pair successors of prev). */
export const COMPLETION_POOL = 300;
/** Longest code a word may have (the composer's cap, web-ui Req 30.3). */
export const MAX_COMPLETION_CODE = 16;

export interface CompletionOptions {
  /** At most this many words (default MAX_COMPLETIONS). */
  k?: number;
  /** How many lexicon words under the prefix to rank (default COMPLETION_POOL). */
  pool?: number;
  /** Longest code offered (default MAX_COMPLETION_CODE). */
  maxCode?: number;
  /** A word is offered only when this returns true (the app: word-pair data, My words, the pack). */
  allow?: (w: string) => boolean;
}

/**
 * Words whose code starts with `prefix` and is longer (at most `maxCode` keys), ranked by
 * `lm.logP(prev, w)`, best first, at most k. Ties keep the pool order (lexicon frequency first, then the
 * word-pair successors). Deterministic; [] for a prefix that is not digits 2-9.
 */
export function rankCompletions(prefix: string, prev: string, lex: Lexicon, lm: LanguageModel, opts: CompletionOptions = {}): string[] {
  const k = Math.max(0, Math.floor(opts.k ?? MAX_COMPLETIONS));
  if (k === 0 || !isCode(prefix)) return [];
  const maxCode = opts.maxCode ?? MAX_COMPLETION_CODE;
  const pool: string[] = [...lex.completions(prefix, opts.pool ?? COMPLETION_POOL)];
  const seen = new Set(pool);
  for (const w of lm.successors?.(prev) ?? []) {
    if (seen.has(w) || !lex.has(w)) continue;
    seen.add(w);
    pool.push(w);
  }
  const scored: { w: string; s: number; i: number }[] = [];
  pool.forEach((w, i) => {
    const c = encodeWord(w);
    if (!c || !c.startsWith(prefix) || c.length <= prefix.length || c.length > maxCode) return;
    if (opts.allow && !opts.allow(w)) return;
    scored.push({ w, s: lm.logP(prev, w), i });
  });
  scored.sort((a, b) => b.s - a.s || a.i - b.i);
  return scored.slice(0, k).map((x) => x.w);
}
