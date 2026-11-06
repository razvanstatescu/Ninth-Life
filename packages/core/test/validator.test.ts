import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { Lexicon, encodeWord, proof, validate, type Mode } from '../src/index';
import { anyString, apostropheWord, code, decoratedWord, plainWord, runs } from './arbitraries';
import { MINI_LEXICON } from './fixtures/mini-lexicon';

const word = fc.oneof(plainWord(1, 10), apostropheWord, decoratedWord.map((d) => d.decorated), anyString);
const mode = fc.constantFrom<Mode>('letter', 'initials');

/** Reference semantics, written independently of the implementation. */
function oracle(cand: string[], codes: string[], m: Mode): boolean {
  if (cand.length !== codes.length) return false;
  return cand.every((w, i) => {
    const c = encodeWord(w);
    return c !== null && (m === 'letter' ? c === codes[i] : c[0] === codes[i]);
  });
}

/** Sentences plus codes that are right, or right with one thing broken. */
const caseArb = fc
  .tuple(fc.array(word, { maxLength: 8 }), mode)
  .chain(([ws, m]) => {
    const full = ws.map((w) => encodeWord(w) ?? '2');
    const good = m === 'letter' ? full : full.map((c) => c[0]!);
    return fc.record({
      cand: fc.constant(ws),
      m: fc.constant(m),
      codes: fc.oneof(
        fc.constant(good),
        fc.constant(full), // the other mode's codes: full codes in initials mode
        fc.constant(full.map((c) => c.slice(0, 2))), // two-digit prefixes
        fc.array(code(8), { maxLength: 8 }),
        fc.tuple(fc.nat(), code(8)).map(([i, c]) => good.map((g, j) => (good.length && j === i % good.length ? c : g))),
        fc.constant(good.slice(1)),
        fc.constant([...good, '2']),
      ),
    });
  });

describe('core-encoder: validator', () => {
  it('Req 3.1 rejects any candidate whose word count differs from the code count (property)', () => {
    fc.assert(
      fc.property(fc.array(plainWord(1, 8), { maxLength: 8 }), fc.array(code(8), { maxLength: 8 }), mode, (ws, cs, m) => {
        fc.pre(ws.length !== cs.length);
        expect(validate(ws, cs, m)).toBe(false);
      }),
    );
  });

  it('Req 3.2 soundness: validate(x, c) implies every word of x encodes to its code (property)', () => {
    fc.assert(
      fc.property(caseArb, ({ cand, codes, m }) => {
        if (validate(cand, codes, m)) {
          expect(cand).toHaveLength(codes.length);
          cand.forEach((w, i) => {
            const c = encodeWord(w);
            expect(c).not.toBeNull();
            if (m === 'letter') expect(c).toBe(codes[i]);
            else expect(c![0]).toBe(codes[i]);
          });
        }
      }),
      { numRuns: runs(2000) },
    );
  });

  it('Req 3.2 + 3.3 validate agrees with an independent reference implementation (property)', () => {
    fc.assert(
      fc.property(caseArb, ({ cand, codes, m }) => {
        expect(validate(cand, codes, m)).toBe(oracle(cand, codes, m));
      }),
      { numRuns: runs(2000) },
    );
  });

  it('Req 3.3 completeness: any sentence of encodable words validates against its own codes (property)', () => {
    fc.assert(
      fc.property(fc.array(fc.oneof(plainWord(1, 12), apostropheWord, decoratedWord.map((d) => d.decorated)), { maxLength: 20 }), (ws) => {
        const codes = ws.map((w) => encodeWord(w)!);
        expect(validate(ws, codes)).toBe(true);
        expect(validate(ws, codes, 'letter')).toBe(true);
        expect(validate(ws, codes.map((c) => c[0]!), 'initials')).toBe(true);
      }),
      { numRuns: runs(1000) },
    );
  });

  it('Req 3.4 initials mode checks only the first letter key (examples)', () => {
    expect(validate(['i', 'need', 'water'], ['4', '6', '9'], 'initials')).toBe(true);
    expect(validate(['i', 'need', 'water'], ['4', '6', '8'], 'initials')).toBe(false);
    expect(validate(['i', 'need', 'water'], ['4', '6333', '92837'], 'initials')).toBe(false);
    expect(validate(['i', 'need', 'water'], ['4', '6333', '92837'])).toBe(true);
    expect(validate(['i', 'need', 'water.'], ['4', '6333', '92837'])).toBe(false); // punctuation is never a letter
    expect(validate(['i need', 'water'], ['46333', '92837'])).toBe(false); // one slot, one word
    expect(validate([], [])).toBe(true);
  });

  it('Req 3.5 proof marks match / new / reject (example)', () => {
    const lex = Lexicon.fromJSON(MINI_LEXICON);
    const p = proof(['Good', 'gond', 'home', 'extra'], ['4663', '4663', '4664'], lex);
    expect(p.map((x) => x.state)).toEqual(['match', 'new', 'reject', 'reject']);
    expect(p[0]).toEqual({ word: 'Good', code: '4663', expected: '4663', state: 'match' });
    expect(p[3]).toEqual({ word: 'extra', code: '39872', expected: '', state: 'reject' });
  });

  it('Req 3.5 proof never says match/new for a word that validate would reject (property)', () => {
    const lex = Lexicon.fromJSON(MINI_LEXICON);
    fc.assert(
      fc.property(caseArb, ({ cand, codes, m }) => {
        const p = proof(cand, codes, lex, m);
        expect(p).toHaveLength(Math.max(cand.length, codes.length));
        const allOk = p.every((x) => x.state !== 'reject');
        expect(allOk).toBe(validate(cand, codes, m));
      }),
      { numRuns: runs(1000) },
    );
  });
});
