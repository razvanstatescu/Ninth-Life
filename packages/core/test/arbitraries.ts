/** Shared fast-check generators for the core property tests. */
import fc from 'fast-check';
import type { LexiconFile } from '../src/index';

const AZ = 'abcdefghijklmnopqrstuvwxyz';

/** One lowercase letter a-z. */
export const letter = fc.constantFrom(...AZ.split(''));

/** A plain word [a-z]{min,max}. */
export const plainWord = (min = 1, max = 20) =>
  fc.array(letter, { minLength: min, maxLength: max }).map((cs) => cs.join(''));

/** A word with optional internal apostrophes, e.g. "isn't", "o'clock". Never starts or ends with one. */
export const apostropheWord = fc
  .array(plainWord(1, 6), { minLength: 1, maxLength: 3 })
  .map((parts) => parts.join("'"));

/** A key sequence 2-9, length 1..n. */
export const code = (max = 10) =>
  fc.array(fc.constantFrom('2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 1, maxLength: max }).map((d) => d.join(''));

/** Combining marks from every block Unicode has for them (Mn / Me), plus comma below and cedilla. */
const mark = fc.oneof(
  fc.integer({ min: 0x300, max: 0x36f }).map((c) => String.fromCharCode(c)),
  fc.integer({ min: 0x1ab0, max: 0x1ace }).map((c) => String.fromCharCode(c)),
  fc.integer({ min: 0x1dc0, max: 0x1dff }).map((c) => String.fromCharCode(c)),
  fc.integer({ min: 0x20d0, max: 0x20f0 }).map((c) => String.fromCharCode(c)),
  fc.integer({ min: 0xfe20, max: 0xfe2f }).map((c) => String.fromCharCode(c)),
  fc.constantFrom('\u0326', '\u0327', '\u0328', '\u0306', '\u0302'),
);

/** Ways to write one letter that must all normalize to that letter (style 0 = plain). */
function decorateLetter(ch: string, style: number, m: string): string {
  const i = ch.charCodeAt(0) - 97;
  switch (style) {
    case 0: return ch;
    case 1: return ch.toUpperCase();
    case 2: return ch + m; // decomposed: base + combining mark
    case 3: return (ch + m).normalize('NFC'); // precomposed where Unicode has one (ă, ș, ñ, ü ...)
    case 4: return (ch.toUpperCase() + m).normalize('NFC'); // Ă, Ș, Ñ ...
    case 5: return String.fromCharCode(0xff41 + i); // fullwidth ａ
    case 6: return String.fromCharCode(0xff21 + i); // fullwidth Ａ
    case 7: return String.fromCodePoint(0x1d41a + i); // mathematical bold 𝐚
    case 8: return String.fromCodePoint(0x1d400 + i); // mathematical bold 𝐀
    default: return String.fromCharCode(0x24d0 + i); // circled ⓐ
  }
}

/** What people type for an apostrophe: straight, curly, modifier letter, fullwidth, acute accent, grave accent. */
const apostrophe = fc.constantFrom("'", '\u2019', '\u2018', '\u02BC', '\uFF07', '\u00B4', '\u0060');

/**
 * A plain word and a decorated spelling of it: random case, diacritics (precomposed or combining),
 * fullwidth / mathematical / circled forms, and apostrophe look-alikes between letters.
 * Built from a flat array of records so fast-check can shrink every part independently.
 */
export const decoratedWord = fc
  .array(fc.record({ ch: letter, style: fc.integer({ min: 0, max: 9 }), mark, ap: fc.option(apostrophe, { freq: 4 }) }), {
    minLength: 1,
    maxLength: 12,
  })
  .map((parts) => ({
    plain: parts.map((p) => p.ch).join(''),
    decorated: parts.map((p) => decorateLetter(p.ch, p.style, p.mark) + (p.ap ?? '')).join(''),
  }));

/** Any string at all, including astral characters and lone surrogates. */
export const anyString = fc.oneof(fc.string(), fc.fullUnicodeString(), fc.string16bits(), plainWord(), apostropheWord);

/** A random lexicon file; with `lie` some words are filed under a wrong code on purpose. */
export const lexiconFile = (lie = false): fc.Arbitrary<LexiconFile> =>
  fc
    .array(fc.tuple(fc.oneof(plainWord(1, 7), apostropheWord, anyString), fc.integer({ min: 0, max: 80 }), code(7)), {
      minLength: 0,
      maxLength: 60,
    })
    .map((items) => {
      const codes: LexiconFile['codes'] = {};
      for (const [w, z, wrong] of items) {
        let key = wrong;
        if (!lie) {
          let c = '';
          let ok = true;
          for (const ch of w.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()) {
            if (ch === "'" || ch === '’') continue;
            const i = ch.charCodeAt(0) - 97;
            if (ch.length !== 1 || i < 0 || i > 25) ok = false;
            else c += '22233344455566677778889999'[i];
          }
          if (!ok || c === '') continue;
          key = c;
        }
        (codes[key] ??= []).push([w, z]);
      }
      return { v: 1 as const, lang: 'xx', source: 'fast-check', license: 'MIT', codes };
    });

/**
 * numRuns for a property, scaled by the FC_SCALE environment variable (default 1).
 * `FC_SCALE=50 pnpm -F @ninth/core test --run` is the long bug hunt; CI uses the default.
 */
export function runs(n: number): number {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const scale = Number(env?.FC_SCALE ?? 1);
  return Math.max(1, Math.ceil(n * (Number.isFinite(scale) && scale > 0 ? scale : 1)));
}
