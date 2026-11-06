/**
 * The deterministic validator: the safety core of Ninth Life.
 * Nothing is spoken unless every word encodes to the keys the person pressed.
 * Requirements: core-encoder Req 3.1 – 3.5.
 */
import { encodeWord, type Mode } from './keymap';
import type { Lexicon } from './lexicon';

/** True if one word matches one code under the given mode. */
export function matchesCode(word: string, code: string, mode: Mode = 'letter'): boolean {
  const c = encodeWord(word);
  if (c === null || code.length === 0) return false;
  return mode === 'letter' ? c === code : code.length === 1 && c[0] === code;
}

/**
 * True iff cand has exactly one word per code and every word encodes to its code
 * (letter mode: the full code; initials mode: the first letter's key).
 */
export function validate(cand: string[], codes: string[], mode: Mode = 'letter'): boolean {
  if (cand.length !== codes.length) return false;
  for (let i = 0; i < cand.length; i++) {
    if (!matchesCode(cand[i]!, codes[i]!, mode)) return false;
  }
  return true;
}

export type ProofState = 'match' | 'new' | 'reject';
export interface WordProof {
  word: string;
  code: string | null;
  expected: string;
  state: ProofState;
}

/**
 * Per-word proof for the UI's proof panel.
 *   match  = encodes to expected code AND lexicon.has(word)
 *   new    = encodes to expected code, not in lexicon (names, rare words)
 *   reject = does not encode to expected code (never spoken)
 * Returns max(cand.length, codes.length) entries; a missing word is '' and a missing code is '',
 * both of which reject.
 */
export function proof(cand: string[], codes: string[], lexicon: Lexicon, mode: Mode = 'letter'): WordProof[] {
  const n = Math.max(cand.length, codes.length);
  const out: WordProof[] = [];
  for (let i = 0; i < n; i++) {
    const word = cand[i] ?? '';
    const expected = codes[i] ?? '';
    const code = encodeWord(word);
    const ok = matchesCode(word, expected, mode);
    out.push({ word, code, expected, state: !ok ? 'reject' : lexicon.has(word) ? 'match' : 'new' });
  }
  return out;
}
