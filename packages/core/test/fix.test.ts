// Words one key away (web-ui Req 32.2, 32.4, 32.5; ADR-009): codeEdit, neighbourCodes and keyFixes.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { BOS, Lexicon, bigramModel, codeEdit, encodeWord, keyFixes, neighbourCodes, type LexiconFile } from '../src/index';
import { code } from './arbitraries';
import { MINI_BIGRAM, MINI_LEXICON } from './fixtures/mini-lexicon';

/** Apply an edit to a code (the inverse check for codeEdit). */
function apply(c: string, e: NonNullable<ReturnType<typeof codeEdit>>): string {
  if (e.kind === 'change') return c.slice(0, e.at) + e.to + c.slice(e.at + 1);
  if (e.kind === 'add') return c.slice(0, e.at) + e.to + c.slice(e.at);
  return c.slice(0, e.at) + c.slice(e.at + 1);
}

describe('codeEdit (Req 32.5)', () => {
  it('names a change, an added key and a removed key', () => {
    expect(codeEdit('2256', '2255')).toEqual({ kind: 'change', at: 3, from: '6', to: '5' });
    expect(codeEdit('7532573', '753273')).toEqual({ kind: 'remove', at: 4, from: '5' });
    expect(codeEdit('75327', '753273')).toEqual({ kind: 'add', at: 5, to: '3' });
    expect(codeEdit('4466', '466')).toEqual({ kind: 'remove', at: 1, from: '4' });
  });
  it('null when not one key apart', () => {
    for (const [a, b] of [['22', '22'], ['22', '33'], ['2', '234'], ['234', '2'], ['2345', '2354']]) expect(codeEdit(a!, b!)).toBeNull();
  });
  it('Req 32.5 property: applying the edit gives the target', () => {
    fc.assert(
      fc.property(code(8), code(8), (a, b) => {
        const e = codeEdit(a, b);
        if (e) expect(apply(a, e)).toBe(b);
      }),
    );
  });
});

describe('neighbourCodes (Req 32.4)', () => {
  it('Req 32.4 property: one edit each, no duplicates, never the code itself, at most 16 keys', () => {
    fc.assert(
      fc.property(code(16), (c) => {
        const ns = neighbourCodes(c);
        const codes = ns.map((n) => n.code);
        expect(new Set(codes).size).toBe(codes.length);
        expect(codes).not.toContain(c);
        for (const n of ns) {
          expect(n.code.length).toBeGreaterThan(0);
          expect(n.code.length).toBeLessThanOrEqual(16);
          expect(codeEdit(c, n.code)).toEqual(n.edit);
        }
      }),
    );
  });
  it('a 16-key code has no additions; a bad code has nothing', () => {
    expect(neighbourCodes('2'.repeat(16)).some((n) => n.edit.kind === 'add')).toBe(false);
    expect(neighbourCodes('201')).toEqual([]);
    expect(neighbourCodes('')).toEqual([]);
  });
});

describe('keyFixes (Req 32.2, 32.4)', () => {
  const lex = Lexicon.fromJSON(MINI_LEXICON as LexiconFile);
  const lm = bigramModel(MINI_BIGRAM, lex);

  it('a double press: 46663 offers good (one 6 removed)', () => {
    const out = keyFixes('46663', BOS, lex, lm);
    expect(out.map((f) => f.word)).toContain('good');
    expect(out.find((f) => f.word === 'good')!.edit).toEqual({ kind: 'remove', at: 3, from: '6' }); // the last of the run of 6s
  });

  it('Req 32.4 property: lexicon words one key away, at most k, never the keys own readings, deterministic', () => {
    fc.assert(
      fc.property(code(6), fc.constantFrom(BOS, 'i', 'need', 'go'), fc.integer({ min: 1, max: 5 }), (c, prev, k) => {
        const out = keyFixes(c, prev, lex, lm, { k });
        expect(out.length).toBeLessThanOrEqual(k);
        expect(new Set(out.map((f) => f.word)).size).toBe(out.length);
        for (const f of out) {
          expect(lex.has(f.word)).toBe(true);
          expect(encodeWord(f.word)).toBe(f.code);
          expect(f.code).not.toBe(c);
          expect(codeEdit(c, f.code)).toEqual(f.edit);
        }
        expect(keyFixes(c, prev, lex, lm, { k })).toEqual(out);
      }),
    );
  });

  it('the word after counts too', () => {
    // 6334 (need with the last key changed) after "i": need fits "i need" in the word pairs.
    expect(keyFixes('6334', 'i', lex, lm)[0]?.word).toBe('need');
  });
});
