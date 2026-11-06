import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DIGITS, KEYMAP, KEY_LETTERS, encodeSentence, encodeWord, normalize, tokenize, validate } from '../src/index';
import { anyString, apostropheWord, decoratedWord, plainWord, runs } from './arbitraries';

describe('core-encoder: keymap and encoding', () => {
  it('Req 1.1 keymap is the standard 2-9 layout and KEY_LETTERS is its inverse', () => {
    expect(Object.keys(KEYMAP)).toHaveLength(26);
    expect(KEYMAP.a).toBe('2');
    expect(KEYMAP.s).toBe('7');
    expect(KEYMAP.z).toBe('9');
    for (const d of DIGITS) for (const ch of KEY_LETTERS[d]) expect(KEYMAP[ch]).toBe(d);
    expect(DIGITS.map((d) => KEY_LETTERS[d]).join('')).toBe('abcdefghijklmnopqrstuvwxyz');
  });

  it('Req 1.1 length preservation: any [a-z]{1,20} encodes to one digit 2-9 per letter (property)', () => {
    fc.assert(
      fc.property(plainWord(1, 20), (w) => {
        const c = encodeWord(w);
        expect(c).not.toBeNull();
        expect(c!.length).toBe(w.length);
        expect(c).toMatch(/^[2-9]+$/);
        for (let i = 0; i < w.length; i++) expect(c![i]).toBe(KEYMAP[w[i]!]);
      }),
      { numRuns: runs(500) },
    );
  });

  it('Req 1.2 normalization invariance: case, diacritics, fullwidth and curly apostrophes do not change the code (property)', () => {
    fc.assert(
      fc.property(decoratedWord, ({ plain, decorated }) => {
        expect(encodeWord(decorated)).toBe(encodeWord(plain));
      }),
      { numRuns: runs(1000) },
    );
  });

  it('Req 1.2 Romanian and Spanish letters fold to their base letter (examples)', () => {
    expect(encodeWord('mulțumesc')).toBe(encodeWord('multumesc'));
    expect(encodeWord('Mulţumesc')).toBe(encodeWord('multumesc')); // cedilla variant
    expect(encodeWord('își')).toBe(encodeWord('isi'));
    expect(encodeWord('mâine')).toBe(encodeWord('maine'));
    expect(encodeWord('ăsta')).toBe(encodeWord('asta'));
    expect(encodeWord('mañana')).toBe('626262');
    expect(encodeWord('pingüino')).toBe(encodeWord('pinguino'));
    expect(encodeWord('canción')).toBe(encodeWord('cancion'));
    expect(encodeWord('ÉLITE')).toBe(encodeWord('elite'));
  });

  it('Req 1.3 returns null for digits, symbols, spaces, non-Latin letters and empty input', () => {
    for (const w of ['', "'", "''", '3', 'abc1', 'a b', 'hi!', 'ø', 'straße', 'привет', 'well-known', '😀']) {
      expect(encodeWord(w)).toBeNull();
    }
  });

  it('Req 1.3 encodeWord is null or a 2-9 string for any input whatsoever (property)', () => {
    fc.assert(
      fc.property(anyString, (s) => {
        const c = encodeWord(s);
        if (c !== null) expect(c).toMatch(/^[2-9]+$/);
      }),
      { numRuns: runs(1000) },
    );
  });

  it('Req 1.4 apostrophes are free: "isn\'t" -> "4768" (example)', () => {
    expect(encodeWord("isn't")).toBe('4768');
    expect(encodeWord('isn’t')).toBe('4768');
    expect(encodeWord("I'm")).toBe('46');
    expect(encodeWord('o’clock')).toBe('625625');
    expect(encodeWord('isn´t')).toBe('4768'); // acute accent typed as an apostrophe (PBT finding 1)
    expect(encodeWord('isn`t')).toBe('4768'); // grave accent typed as an apostrophe (PBT finding 1)
    expect(tokenize('rock´n´roll')).toEqual(["rock'n'roll"]);
  });

  it('Req 1.4 removing apostrophes never changes the code (property)', () => {
    fc.assert(
      fc.property(apostropheWord, (w) => {
        expect(encodeWord(w)).toBe(encodeWord(w.replace(/'/g, '')));
      }),
    );
  });

  it('Req 1.5 encodeSentence tokenizes on whitespace and punctuation (examples)', () => {
    expect(encodeSentence('I need water.')).toEqual(['4', '6333', '92837']);
    expect(encodeSentence('  Hello,   world!  ')).toEqual(['43556', '96753']);
    expect(encodeSentence("Isn't it good?")).toEqual(['4768', '48', '4663']);
    expect(encodeSentence('')).toEqual([]);
    expect(() => encodeSentence('I have 3 cats')).toThrow(RangeError);
    expect(() => encodeSentence('smørrebrød')).toThrow(RangeError);
  });

  it('Req 1.5 encodeSentence of space-joined words equals per-word encodeWord (property)', () => {
    fc.assert(
      fc.property(fc.array(fc.oneof(plainWord(1, 10), apostropheWord), { maxLength: 12 }), (ws) => {
        expect(encodeSentence(ws.join(' '))).toEqual(ws.map((w) => encodeWord(w)));
        expect(tokenize(ws.join(' '))).toEqual(ws);
      }),
    );
  });

  it('Req 1.5 for any text, encodeSentence either throws or gives codes its own tokens validate against (property)', () => {
    const text = fc.array(fc.oneof(anyString, decoratedWord.map((d) => d.decorated), fc.constantFrom(' ', '.', ',', '!', '?', '-', '\n', '\t', '"', '(', ')')), { maxLength: 12 }).map((xs) => xs.join(''));
    fc.assert(
      fc.property(text, (t) => {
        const toks = tokenize(t);
        for (const w of toks) {
          expect(w).not.toMatch(/\s/);
          expect(w).not.toMatch(/^'|'$/);
          expect(normalize(w)).toBe(w);
        }
        let codes: string[] | undefined;
        try {
          codes = encodeSentence(t);
        } catch (e) {
          expect(e).toBeInstanceOf(RangeError);
          expect(toks.some((w) => encodeWord(w) === null)).toBe(true);
          return;
        }
        expect(codes).toHaveLength(toks.length);
        expect(validate(toks, codes)).toBe(true);
      }),
      { numRuns: runs(1000) },
    );
  });

  it('Req 1.6 normalize is idempotent and its output has no marks and no apostrophe look-alikes (property)', () => {
    fc.assert(
      fc.property(anyString, (s) => {
        const n = normalize(s);
        expect(normalize(n)).toBe(n);
        expect(n).not.toMatch(/[\u2018\u2019\u02BC\u00B4\u0060]/);
        expect(/\p{M}/u.test(n)).toBe(false);
      }),
      { numRuns: runs(1000) },
    );
  });

  it('Req 1.6 normalize is idempotent on every single Unicode code point (exhaustive)', () => {
    const bad: string[] = [];
    for (let cp = 0; cp < 0x110000; cp++) {
      if (cp >= 0xd800 && cp <= 0xdfff) continue;
      const n = normalize(String.fromCodePoint(cp));
      if (normalize(n) !== n) bad.push(cp.toString(16));
    }
    expect(bad).toEqual([]);
  });
});
