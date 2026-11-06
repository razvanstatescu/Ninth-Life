/**
 * Keymap, normalization and encoding for 9-key predictive text.
 *
 * Pure TypeScript: no DOM, no Node-only APIs.
 * Requirements: core-encoder Req 1.1 – 1.6.
 */

export type Mode = 'letter' | 'initials';
export type Digit = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

/** The 8 letter keys, in keypad order. */
export const DIGITS: readonly Digit[] = Object.freeze(['2', '3', '4', '5', '6', '7', '8', '9'] as const);

/** Digit -> letters on that key (standard ITU E.161 layout). */
export const KEY_LETTERS: Readonly<Record<Digit, string>> = Object.freeze({
  '2': 'abc',
  '3': 'def',
  '4': 'ghi',
  '5': 'jkl',
  '6': 'mno',
  '7': 'pqrs',
  '8': 'tuv',
  '9': 'wxyz',
});

function buildKeymap(): Record<string, Digit> {
  const map: Record<string, Digit> = {};
  for (const d of DIGITS) for (const ch of KEY_LETTERS[d]) map[ch] = d;
  return map;
}

/** Letter -> digit: 'a' -> '2' ... 'z' -> '9'. */
export const KEYMAP: Readonly<Record<string, Digit>> = Object.freeze(buildKeymap());

/** Index = charCode - 97 ('a'). A string lookup avoids any prototype-key surprises. */
const DIGIT_BY_LETTER = 'abcdefghijklmnopqrstuvwxyz'.split('').map((ch) => KEYMAP[ch]!).join('');

/**
 * Apostrophe look-alikes folded to ASCII "'": U+2018 ‘, U+2019 ’, U+02BC ʼ (contract), plus
 * U+00B4 ´ and U+0060 ` (ADR-core-001: people type them for apostrophes, and NFKD would turn ´
 * into a space + combining acute). U+FF07 ＇ and U+FF40 ｀ reach these via NFKD.
 * The fold runs before NFKD (for ´) and after it (for the fullwidth forms).
 */
const APOSTROPHES = /[\u2018\u2019\u02BC\u00B4\u0060]/g;
const MARKS = /\p{M}/gu;

/**
 * Fold apostrophes, NFKD, strip combining marks, lowercase, fold apostrophes again.
 * Romanian ă â î ș ş ț ţ and Spanish á é í ó ú ü ñ all fold to their base letter.
 * Idempotent: an exhaustive scan of every Unicode code point found no character for which
 * normalize(normalize(c)) !== normalize(c) (test/keymap.test.ts, Req 1.6).
 */
export function normalize(word: string): string {
  return word
    .replace(APOSTROPHES, "'")
    .normalize('NFKD')
    .replace(MARKS, '')
    .toLowerCase()
    .replace(APOSTROPHES, "'");
}

/** Digit for one already-normalized character, or undefined. */
export function digitOf(ch: string): Digit | undefined {
  if (ch.length !== 1) return undefined;
  const i = ch.charCodeAt(0) - 97;
  return i >= 0 && i < 26 ? (DIGIT_BY_LETTER[i] as Digit) : undefined;
}

/**
 * Encode one word to its key sequence. "isn't" -> "4768".
 * Apostrophes are free (skipped). Returns null if any other character is not a-z after
 * normalization, or if nothing is left to encode.
 */
export function encodeWord(word: string): string | null {
  let out = '';
  for (const ch of normalize(word)) {
    if (ch === "'") continue;
    const d = digitOf(ch);
    if (d === undefined) return null;
    out += d;
  }
  return out.length > 0 ? out : null;
}

/** Characters that separate words: anything that is not a letter, a number or an apostrophe. */
const SEPARATORS = /[^\p{L}\p{N}']+/u;

/**
 * Words only, lowercase and normalized. Punctuation and whitespace separate words; apostrophes at
 * the edges of a token are stripped ("'tis" -> "tis"), internal ones are kept ("isn't").
 * Numbers and non-Latin letters are kept as tokens (so encodeSentence can refuse them).
 */
export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const raw of normalize(text).split(SEPARATORS)) {
    const t = raw.replace(/^'+|'+$/g, '');
    if (t.length > 0) out.push(t);
  }
  return out;
}

/**
 * Encode a sentence: tokenize, then encode each word.
 * "I need water." -> ["4", "6333", "92837"]. Throws if a token is not encodable (e.g. "3", "ø").
 * See ADR-core-001 for why punctuation separates words instead of only whitespace.
 */
export function encodeSentence(text: string): string[] {
  return tokenize(text).map((w) => {
    const c = encodeWord(w);
    if (c === null) throw new RangeError(`encodeSentence: "${w}" cannot be typed on letter keys 2-9`);
    return c;
  });
}

/** True if s is a non-empty string of digits 2-9 (a well-formed letter-mode code). */
export function isCode(s: string): boolean {
  return /^[2-9]+$/.test(s);
}
