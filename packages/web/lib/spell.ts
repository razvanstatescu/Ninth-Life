/**
 * Spell mode for one word (web-ui Req 19): the person picks the exact letter for every key they
 * pressed. Each position only offers that key's letters, so the spelled word encodes to the same
 * code by construction; `spelledWord` still checks it with encodeWord before it is used.
 */
import { KEY_LETTERS, encodeWord, isCode, normalize, type Digit } from '@ninth/core';

/** Letters to choose from for each key of the code ("64424" -> mno, ghi, ghi, abc, ghi). */
export function spellOptions(code: string): string[][] {
  if (!isCode(code)) return [];
  return [...code].map((d) => [...KEY_LETTERS[d as Digit]]);
}

/**
 * Where each position starts: the letters of `word` when it spells this code (a word on show, or
 * the first letters of the likeliest completion), else the first letter on every key.
 */
export function initialChoice(code: string, word?: string | null): number[] {
  const opts = spellOptions(code);
  const letters = word ? [...normalize(word)].filter((c) => c !== "'") : [];
  const usable = word != null && encodeWord(word) === code && letters.length === opts.length;
  return opts.map((o, i) => (usable ? Math.max(0, o.indexOf(letters[i]!)) : 0));
}

/** The lower-case word for these choices, or null if it would not encode to `code` (never expected). */
export function spelledWord(code: string, choice: readonly number[]): string | null {
  const opts = spellOptions(code);
  if (opts.length === 0 || choice.length !== opts.length) return null;
  const w = opts.map((o, i) => o[choice[i]!] ?? '').join('');
  return w.length === opts.length && encodeWord(w) === code ? w : null;
}

/** The person's spelling: a capital first letter for names, or all lower case. */
export function withCapital(word: string, capital: boolean): string {
  if (!capital || word.length === 0) return word;
  return word[0]!.toUpperCase() + word.slice(1);
}
