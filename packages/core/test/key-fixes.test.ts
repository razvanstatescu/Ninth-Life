// Fix a word and Did you mean (web-ui Req 32.4, 32.5; spec r6 3-fix-a-word §3, AC 11): codes one key away,
// the single edit between two codes, and the dictionary words one key away ranked by the word pairs.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { BOS, Lexicon, bigramModel, codeEdit, encodeWord, keyFixes, neighbourCodes, type BigramFile, type CodeEdit, type LexiconFile, type LexiconFileV2 } from '../src/index';
import { code } from './arbitraries';
import { MINI_BIGRAM, MINI_LEXICON } from './fixtures/mini-lexicon';

const DATA = join(__dirname, '..', '..', '..', 'data', 'lexicon');
const LEX_V2 = join(DATA, 'en.v2.json');
const BIGRAM = join(DATA, 'en.bigram.v1.json');
const haveData = existsSync(LEX_V2) && existsSync(BIGRAM);

/** Apply an edit to a code (the reference the properties check against). */
function apply(c: string, e: CodeEdit): string {
  if (e.kind === 'change') return c.slice(0, e.at) + e.to + c.slice(e.at + 1);
  if (e.kind === 'add') return c.slice(0, e.at) + e.to + c.slice(e.at);
  return c.slice(0, e.at) + c.slice(e.at + 1);
}
/** Levenshtein distance between two short codes. */
function dist(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length]![b.length]!;
}

describe('core: neighbourCodes and codeEdit (Req 32.4, 32.5)', () => {
  it('AC 11 property: neighbours are digits 2-9, one edit away, unique, never the code itself, at most 16 keys', () => {
    fc.assert(
      fc.property(code(16), (c) => {
        const ns = neighbourCodes(c);
        const codes = ns.map((n) => n.code);
        expect(new Set(codes).size).toBe(codes.length);
        expect(codes).not.toContain(c);
        for (const n of ns) {
          expect(n.code).toMatch(/^[2-9]+$/);
          expect(n.code.length).toBeLessThanOrEqual(16);
          expect(dist(c, n.code)).toBe(1);
          expect(apply(c, n.edit)).toBe(n.code);
        }
      }),
    );
  });

  it('AC 11 every code one edit away is listed (complete), up to 16 keys', () => {
    for (const c of ['4', '466', '7532573']) {
      const got = new Set(neighbourCodes(c).map((n) => n.code));
      const want = new Set<string>();
      const D = '23456789';
      for (let i = 0; i < c.length; i++) for (const d of D) if (d !== c[i]) want.add(c.slice(0, i) + d + c.slice(i + 1));
      for (let i = 0; i <= c.length; i++) for (const d of D) want.add(c.slice(0, i) + d + c.slice(i));
      if (c.length > 1) for (let i = 0; i < c.length; i++) want.add(c.slice(0, i) + c.slice(i + 1));
      want.delete(c);
      expect(got).toEqual(want);
    }
    expect(neighbourCodes('2'.repeat(16)).every((n) => n.code.length <= 16)).toBe(true);
  });

  it('an extra key: 7532573 -> 753273 is listed once, removing the 5 at index 4', () => {
    const ns = neighbourCodes('7532573').filter((n) => n.code === '753273');
    expect(ns).toHaveLength(1);
    expect(ns[0]!.edit).toEqual({ kind: 'remove', at: 4, from: '5' });
  });

  it('a double press: removing either of two equal keys gives one entry, the edit at the second (spec)', () => {
    const ns = neighbourCodes('46663').filter((n) => n.code === '4663');
    expect(ns).toHaveLength(1);
    expect(ns[0]!.edit).toMatchObject({ kind: 'remove', from: '6', at: 3 });
  });

  it('AC 11 property: codeEdit finds the one edit, or null when the codes are not one key apart', () => {
    fc.assert(
      fc.property(code(10), code(10), (a, b) => {
        const e = codeEdit(a, b);
        if (dist(a, b) === 1) {
          expect(e).not.toBeNull();
          expect(apply(a, e!)).toBe(b);
        } else expect(e).toBeNull();
      }),
    );
  });

  it('examples: 2256 -> 2255 changes key 4 from 6 to 5; 7532573 -> 753273 removes the extra 5', () => {
    expect(codeEdit('2256', '2255')).toEqual({ kind: 'change', at: 3, from: '6', to: '5' });
    expect(codeEdit('7532573', '753273')).toMatchObject({ kind: 'remove', from: '5' });
    expect(codeEdit('46', '466')).toMatchObject({ kind: 'add', to: '6' });
  });
});

describe('core: keyFixes on the mini lexicon (Req 32.4)', () => {
  const lex = Lexicon.fromJSON(MINI_LEXICON as LexiconFile);
  const lm = bigramModel(MINI_BIGRAM, lex);

  it('AC 11 property: lexicon words, one edit away with the edit reported, <= k, deterministic, never a reading of the code', () => {
    fc.assert(
      fc.property(code(7), fc.constantFrom(BOS, 'i', 'need', 'go'), fc.integer({ min: 1, max: 5 }), (c, prev, k) => {
        const out = keyFixes(c, prev, lex, lm, { k });
        expect(out.length).toBeLessThanOrEqual(k);
        expect(new Set(out.map((f) => f.word)).size).toBe(out.length);
        const own = new Set(lex.lookup(c));
        for (const f of out) {
          expect(lex.has(f.word)).toBe(true);
          expect(encodeWord(f.word)).toBe(f.code);
          expect(own.has(f.word)).toBe(false);
          expect(codeEdit(c, f.code)).toEqual(f.edit);
        }
        expect(keyFixes(c, prev, lex, lm, { k })).toEqual(out);
      }),
    );
  });
});

describe.skipIf(!haveData)('core: keyFixes on the real data (spec AC 1, 4)', () => {
  const lex = Lexicon.fromJSON(JSON.parse(readFileSync(LEX_V2, 'utf8')) as LexiconFile | LexiconFileV2);
  const lm = bigramModel(JSON.parse(readFileSync(BIGRAM, 'utf8')) as BigramFile, lex);

  it('AC 1 "can you calm my daughter": call is one key away from 2256 (calm), between you and my', () => {
    const out = keyFixes('2256', 'you', lex, lm, { k: 3, next: 'my' });
    expect(out.map((f) => f.word)).toContain('call');
    const call = out.find((f) => f.word === 'call')!;
    expect(call.code).toBe('2255');
    expect(call.edit).toEqual({ kind: 'change', at: 3, from: '6', to: '5' });
  });

  it('AC 4 7532573 (please with a double 5) offers please, the extra 5 removed', () => {
    const out = keyFixes('7532573', BOS, lex, lm, { k: 3 });
    const please = out.find((f) => f.word === 'please');
    expect(please?.code).toBe('753273');
    expect(please?.edit.kind).toBe('remove');
  });

  it('a 7-key code is fast (about 127 probes)', () => {
    keyFixes('7532573', BOS, lex, lm);
    const t0 = performance.now();
    for (let i = 0; i < 50; i++) keyFixes('7532573', 'can', lex, lm, { k: 3, next: 'you' });
    expect((performance.now() - t0) / 50).toBeLessThan(10);
  });
});
