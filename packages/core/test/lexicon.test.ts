import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { Lexicon, NEW_WORD_ZIPF, TRIE_TOP_K, encodeWord, normalize, type LexiconFile } from '../src/index';
import { code, lexiconFile, plainWord, runs } from './arbitraries';
import { MINI_LEXICON } from './fixtures/mini-lexicon';

/** All words of a lexicon with their codes and zipf, via the public API only. */
function allWords(file: LexiconFile, lex: Lexicon): { w: string; code: string; z: number }[] {
  const seen = new Map<string, { w: string; code: string; z: number }>();
  for (const list of Object.values(file.codes))
    for (const [raw] of list) {
      const c = encodeWord(raw);
      if (c === null) continue;
      for (const w of lex.lookup(c)) seen.set(w, { w, code: c, z: lex.zipf(w)! });
    }
  return [...seen.values()];
}

describe('core-encoder: lexicon', () => {
  const lex = Lexicon.fromJSON(MINI_LEXICON);

  it('Req 2.1 4663 -> good, home, gone in frequency order (example)', () => {
    expect(lex.lookup('4663').slice(0, 3)).toEqual(['good', 'home', 'gone']);
    expect(lex.lookup('4663')).toEqual(['good', 'home', 'gone', 'hood', 'hoof', 'goof']);
    expect(lex.lookup('5299')).toEqual(['lazy', 'jazz']);
    expect(lex.lookup('46')).toEqual(['in', 'go', "i'm"]); // tie 6.2 keeps file order
    expect(lex.lookup('22222')).toEqual([]);
    expect(lex.lookup('')).toEqual([]);
    expect(lex.lang).toBe('en');
  });

  it('Req 2.1 lookup returns a copy (callers cannot corrupt the lexicon)', () => {
    lex.lookup('4663').push('evil');
    expect(lex.lookup('4663')).not.toContain('evil');
  });

  it('Req 2.2 completions use the digit trie, include the exact code, top 5 by default (example)', () => {
    expect(lex.completions('466')).toEqual(['good', 'home', 'gone', 'goods', 'homes']);
    expect(lex.completions('4663', 7)).toEqual(['good', 'home', 'gone', 'goods', 'homes', 'hood', 'hoof']);
    expect(lex.completions('4', 2)).toEqual(['in', 'i']);
    expect(lex.completions('2222')).toEqual([]);
    expect(lex.completions('abc')).toEqual([]);
    expect(lex.completions('466', 0)).toEqual([]);
  });

  it('Req 2.2 completions(p, k) are exactly the top-k words whose code starts with p (property)', () => {
    fc.assert(
      fc.property(lexiconFile(false), code(4), fc.integer({ min: 1, max: 12 }), (file, prefix, k) => {
        const l = Lexicon.fromJSON(file);
        const got = l.completions(prefix, k);
        const pool = allWords(file, l).filter((x) => x.code.startsWith(prefix));
        expect(got.length).toBe(Math.min(k, pool.length));
        expect(new Set(got).size).toBe(got.length);
        const zs = got.map((w) => l.zipf(w)!);
        for (let i = 1; i < zs.length; i++) expect(zs[i]!).toBeLessThanOrEqual(zs[i - 1]!);
        const minZ = zs.length ? zs[zs.length - 1]! : Infinity;
        for (const x of pool) if (!got.includes(x.w)) expect(x.z).toBeLessThanOrEqual(minZ);
        for (const w of got) expect(encodeWord(w)!.startsWith(prefix)).toBe(true);
        // the trie path (k <= 5) and the ranked scan (k > 5) agree on their common prefix
        expect(l.completions(prefix, TRIE_TOP_K)).toEqual(l.completions(prefix, 50).slice(0, TRIE_TOP_K));
      }),
      { numRuns: runs(300) },
    );
  });

  it('Req 2.3 has() and zipf() normalize their input (example)', () => {
    expect(lex.has('Good')).toBe(true);
    expect(lex.has('ISN’T')).toBe(true);
    expect(lex.has('gond')).toBe(false);
    expect(lex.zipf('good')).toBeCloseTo(6.2);
    expect(lex.zipf('nope')).toBeUndefined();
    expect(lex.has('constructor')).toBe(false); // no prototype leakage
    expect(lex.has('__proto__')).toBe(false);
  });

  it('Req 2.4 addWords adds names, boosts rank, skips unencodable entries (example)', () => {
    const l = Lexicon.fromJSON(MINI_LEXICON);
    const before = l.size;
    l.addWords([{ w: 'Ana' }, { w: 'hoof', boost: 4 }, { w: 'two words' }, { w: 'r2d2' }, { w: '' }]);
    expect(l.size).toBe(before + 1);
    expect(l.has('ana')).toBe(true);
    expect(l.zipf('ana')).toBe(NEW_WORD_ZIPF);
    expect(l.lookup('262')).toEqual(['ana']);
    expect(l.lookup('4663')[0]).toBe('hoof'); // 3.0 + 4 = 7.0 beats good 6.2
    expect(l.completions('4663', 1)).toEqual(['hoof']); // trie rebuilt after addWords
  });

  it('Req 2.4 addWords is idempotent and order-insensitive (property)', () => {
    const pack = fc.array(fc.record({ w: plainWord(1, 6), boost: fc.option(fc.integer({ min: -2, max: 4 }), { nil: undefined }) }), {
      maxLength: 20,
    });
    fc.assert(
      fc.property(pack, (p) => {
        const a = Lexicon.fromJSON(MINI_LEXICON);
        const b = Lexicon.fromJSON(MINI_LEXICON);
        a.addWords(p);
        a.addWords(p);
        b.addWords([...p].reverse());
        for (const { w } of p) {
          expect(a.zipf(w)).toBe(b.zipf(w));
          expect(a.lookup(encodeWord(w)!).sort()).toEqual(b.lookup(encodeWord(w)!).sort());
        }
        expect(a.size).toBe(b.size);
      }),
    );
  });

  it('Req 2.5 size counts distinct normalized words', () => {
    const l = Lexicon.fromJSON({ ...MINI_LEXICON, codes: { '4663': [['good', 60], ['Good', 62], ['GOOD', 10]] } });
    expect(l.size).toBe(1);
    expect(l.zipf('good')).toBeCloseTo(6.2); // the highest frequency seen wins
    expect(lex.size).toBe(50);
  });

  it('Req 2.6 every word lookup() returns encodes to that code, even from a lying file (property)', () => {
    fc.assert(
      fc.property(lexiconFile(true), (file) => {
        const l = Lexicon.fromJSON(file);
        for (const list of Object.values(file.codes))
          for (const [raw] of list) {
            const c = encodeWord(raw);
            if (c === null) expect(l.has(raw)).toBe(false); // unencodable: dropped
            else expect(l.lookup(c)).toContain(normalize(raw)); // misfiled: moved to its real code
          }
        for (const k of Object.keys(file.codes)) for (const w of l.lookup(k)) expect(encodeWord(w)).toBe(k);
      }),
      { numRuns: runs(300) },
    );
  });

  it('Req 2.7 rejects files that are not v1', () => {
    expect(() => Lexicon.fromJSON({ ...MINI_LEXICON, v: 2 } as unknown as LexiconFile)).toThrow(TypeError);
    expect(() => Lexicon.fromJSON(null as unknown as LexiconFile)).toThrow(TypeError);
  });
});
