import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { Lexicon, NEW_WORD_ZIPF, TRIE_TOP_K, encodeWord, normalize, type LexiconFile, type LexiconFileV2 } from '../src/index';
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

  it('Req 2.7 rejects files that are not v1 or v2', () => {
    expect(() => Lexicon.fromJSON({ ...MINI_LEXICON, v: 2 } as unknown as LexiconFile)).toThrow(TypeError); // v2 needs words
    expect(() => Lexicon.fromJSON({ ...MINI_LEXICON, v: 3 } as unknown as LexiconFile)).toThrow(TypeError);
    expect(() => Lexicon.fromJSON({ v: 1, lang: 'en', words: [] } as unknown as LexiconFile)).toThrow(TypeError); // v1 needs codes
    expect(() => Lexicon.fromJSON(null as unknown as LexiconFile)).toThrow(TypeError);
  });
});

/**
 * The loading algorithm before the fast path (ADR-data-003): normalize and encode every word,
 * the highest zipf wins, every list sorted by zipf desc then first appearance.
 */
function referenceLookup(file: LexiconFile): Map<string, string[]> {
  const byWord = new Map<string, { code: string; z: number; seq: number }>();
  let seq = 0;
  for (const list of Object.values(file.codes))
    for (const [raw, zx] of list) {
      if (typeof raw !== 'string' || typeof zx !== 'number' || !Number.isFinite(zx)) continue;
      const w = normalize(raw);
      const c = encodeWord(w);
      if (c === null) continue;
      const prev = byWord.get(w);
      if (prev) prev.z = Math.max(prev.z, zx / 10);
      else byWord.set(w, { code: c, z: zx / 10, seq: seq++ });
    }
  const out = new Map<string, string[]>();
  for (const [w, e] of [...byWord].sort(([, a], [, b]) => b.z - a.z || a.seq - b.seq)) {
    const l = out.get(e.code);
    if (l) l.push(w);
    else out.set(e.code, [w]);
  }
  return out;
}

/** v1 -> v2 the way packages/eval/scripts/build_lexicon.py does it (groups by zipf, v1 load order inside). */
function toV2(file: LexiconFile): LexiconFileV2 {
  const groups = new Map<number, string[]>();
  for (const list of Object.values(file.codes))
    for (const [w, z] of list) {
      if (w === '' || w.includes(' ')) continue; // cannot be encoded in either format
      const g = groups.get(z);
      if (g) g.push(w);
      else groups.set(z, [w]);
    }
  const words = [...groups.keys()].sort((a, b) => b - a).map((z): [number, string] => [z, groups.get(z)!.join(' ')]);
  return { v: 2, lang: file.lang, source: file.source, license: file.license, words };
}

/** Keep the first spelling of each normalized word (real files have no duplicates; data.test.ts checks). */
function dedupe(file: LexiconFile): LexiconFile {
  const seen = new Set<string>();
  const codes: LexiconFile['codes'] = {};
  for (const [c, list] of Object.entries(file.codes)) {
    const kept = list.filter(([w]) => !seen.has(normalize(w)) && seen.add(normalize(w)));
    if (kept.length) codes[c] = kept;
  }
  return { ...file, codes };
}

const prefixesOf = (codes: Iterable<string>): string[] => {
  const out = new Set<string>();
  for (const c of codes) for (let i = 1; i <= c.length; i++) out.add(c.slice(0, i));
  return [...out];
};

describe('core-encoder: fast loading and the completion index', () => {
  it('Req 2.8 the per-letter fast path loads exactly what normalize + encodeWord would (property, lying files too)', () => {
    fc.assert(
      fc.property(fc.oneof(lexiconFile(true), lexiconFile(false)), (file) => {
        const l = Lexicon.fromJSON(file);
        const ref = referenceLookup(file);
        let n = 0;
        for (const [c, words] of ref) {
          expect(l.lookup(c)).toEqual(words);
          n += words.length;
        }
        expect(l.size).toBe(n);
      }),
      { numRuns: runs(300) },
    );
  });

  it('Req 2.8 decorated and non-plain words still take the safe path (example)', () => {
    const l = Lexicon.fromJSON({ ...MINI_LEXICON, codes: { '1': [['Ｇｏｏｄ', 50], ['ISN’T', 40], ['mâine', 30], ["'", 30], ['a b', 30]] } });
    expect(l.lookup('4663')).toEqual(['good']);
    expect(l.lookup('4768')).toEqual(["isn't"]);
    expect(l.lookup('62463')).toEqual(['maine']);
    expect(l.size).toBe(3);
  });

  it('Req 2.9 a v2 file loads to the same lexicon as its v1 source: lookup, zipf, size, completions (property)', () => {
    fc.assert(
      fc.property(lexiconFile(false), (raw) => {
        const file = dedupe(raw);
        const a = Lexicon.fromJSON(file);
        const b = Lexicon.fromJSON(toV2(file));
        expect(b.size).toBe(a.size);
        for (const c of Object.keys(file.codes)) expect(b.lookup(c)).toEqual(a.lookup(c));
        for (const list of Object.values(file.codes)) for (const [w] of list) expect(b.zipf(w)).toBe(a.zipf(w));
        for (const p of prefixesOf(Object.keys(file.codes))) expect(b.completions(p, 12)).toEqual(a.completions(p, 12));
      }),
      { numRuns: runs(300) },
    );
  });

  it('Req 2.9 v2 example: groups by zipf, codes derived, ties in file order', () => {
    const l = Lexicon.fromJSON({ v: 2, lang: 'en', source: 't', license: 'MIT', words: [[62, 'good in go'], [58, 'home'], [40, 'gone hood']] });
    expect(l.lookup('4663')).toEqual(['good', 'home', 'gone', 'hood']);
    expect(l.lookup('46')).toEqual(['in', 'go']);
    expect(l.zipf('home')).toBeCloseTo(5.8);
    expect(l.completions('4')).toEqual(['good', 'in', 'go', 'home', 'gone']);
  });

  it('Req 2.10 prepare() and cached completions stay exact after addWords (property)', () => {
    const pack = fc.array(fc.record({ w: plainWord(1, 6), boost: fc.option(fc.integer({ min: -2, max: 4 }), { nil: undefined }) }), { maxLength: 15 });
    fc.assert(
      fc.property(lexiconFile(false), pack, code(4), (file, p, extra) => {
        const warm = Lexicon.fromJSON(file);
        warm.prepare();
        const before = prefixesOf(Object.keys(file.codes)).concat(extra);
        for (const q of before) warm.completions(q, 3); // fill the cache
        warm.addWords(p);
        warm.prepare(); // idempotent
        const cold = Lexicon.fromJSON(file);
        cold.addWords(p);
        const all = prefixesOf([...Object.keys(file.codes), ...p.map(({ w }) => encodeWord(w)!)]).concat(extra);
        for (const q of all) {
          expect(warm.completions(q)).toEqual(cold.completions(q));
          expect(warm.completions(q, 9)).toEqual(cold.completions(q, 9));
        }
      }),
      { numRuns: runs(200) },
    );
  });

  it('Req 2.10 completions for a prefix are computed once and served from the cache', () => {
    const l = Lexicon.fromJSON(MINI_LEXICON);
    const first = l.completions('466');
    expect(l.completions('466')).toEqual(first);
    expect(l.completions('466', 2)).toEqual(first.slice(0, 2));
    expect(l.completions('466', 8).slice(0, 5)).toEqual(first); // a larger k recomputes, same head
  });
});
