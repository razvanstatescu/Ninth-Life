import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  Lexicon,
  beam,
  bigramModel,
  decodeGhost,
  encodeSentence,
  encodeWord,
  lattice,
  unigramModel,
  validate,
  type LanguageModel,
  type Mode,
} from '../src/index';
import { anyString, code, lexiconFile, plainWord, runs } from './arbitraries';
import { MINI_BIGRAM, MINI_LEXICON } from './fixtures/mini-lexicon';

describe('core-encoder: ghost-mode decoding', () => {
  const lex = Lexicon.fromJSON(MINI_LEXICON);
  const uni = unigramModel(lex);
  const bi = bigramModel(MINI_BIGRAM, lex);

  it('Req 5.1 lattice has one slot per code, frequency order, perSlot cap, [] for unknown codes (example)', () => {
    const lat = lattice(['4', '4663', '22222'], lex, 2);
    expect(lat).toEqual([['i', 'h'], ['good', 'home'], []]);
    expect(lattice(['4663'], lex)[0]).toEqual(['good', 'home', 'gone', 'hood', 'hoof', 'goof']);
    expect(lattice([], lex)).toEqual([]);
  });

  it('Req 5.2 beam returns at most B results sorted by summed log-prob (property)', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom('4', '46', '4663', '6333', '92837', '263', '2'), { minLength: 1, maxLength: 6 }), fc.integer({ min: 1, max: 40 }), (codes, B) => {
        const out = beam(lattice(codes, lex), bi, B);
        expect(out.length).toBeLessThanOrEqual(B);
        expect(out.length).toBeGreaterThan(0);
        for (let i = 1; i < out.length; i++) expect(out[i]!.score).toBeLessThanOrEqual(out[i - 1]!.score);
        for (const c of out) {
          let s = 0;
          c.words.forEach((w, i) => (s += bi.logP(i === 0 ? '<s>' : c.words[i - 1]!, w)));
          expect(c.score).toBeCloseTo(s, 9);
          expect(c.source).toBe('ghost');
        }
      }),
    );
  });

  it('Req 5.3 "4 6333 92837" decodes to "i need water" first (example)', () => {
    for (const lm of [uni, bi]) {
      const out = decodeGhost(['4', '6333', '92837'], { lexicon: lex, lm });
      expect(out[0]!.words).toEqual(['i', 'need', 'water']);
      expect(out.length).toBeLessThanOrEqual(5);
    }
  });

  it('Req 5.3 the bigram can reorder a collision: "go 4663" -> "go home" (example)', () => {
    expect(decodeGhost(['46', '4663'], { lexicon: lex, lm: uni })[0]!.words).toEqual(['in', 'good']);
    const out = decodeGhost(['4663'], { lexicon: lex, lm: bi, context: ['go'] });
    expect(out[0]!.words).toEqual(['home']);
  });

  it('Req 5.3 decodeGhost output always passes validate, for any lexicon, codes, k, mode and context (property)', () => {
    const lms = (l: Lexicon): LanguageModel[] => [unigramModel(l), bigramModel(MINI_BIGRAM, l), { logP: () => NaN }, { logP: (p, w) => (p.length - w.length) * 1e6 }];
    fc.assert(
      fc.property(
        fc.oneof(lexiconFile(false), lexiconFile(true), fc.constant(MINI_LEXICON)),
        fc.array(fc.oneof(code(7), fc.constantFrom('4', '6333', '92837', '4663'), anyString), { maxLength: 6 }),
        fc.integer({ min: 0, max: 40 }),
        fc.constantFrom<Mode>('letter', 'initials'),
        fc.option(fc.array(fc.oneof(plainWord(), anyString), { maxLength: 3 }), { nil: undefined }),
        fc.nat(3),
        fc.boolean(),
        (file, codes, k, mode, context, lmIdx, slice) => {
          const l = Lexicon.fromJSON(file);
          const cs = mode === 'initials' && slice ? codes.map((c) => c.slice(0, 1)) : codes;
          const out = decodeGhost(cs, { lexicon: l, lm: lms(l)[lmIdx]!, k, mode, context });
          expect(out.length).toBeLessThanOrEqual(k);
          const keys = out.map((c) => c.words.join(' '));
          expect(new Set(keys).size).toBe(keys.length);
          for (const c of out) expect(validate(c.words, cs, mode)).toBe(true);
        },
      ),
      { numRuns: runs(500) },
    );
  });

  it('Req 5.3 decodeGhost finds a sentence whenever every code has a word (property)', () => {
    const words = Object.values(MINI_LEXICON.codes).flatMap((l) => l.map(([w]) => w));
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...words), { minLength: 1, maxLength: 8 }), (sentence) => {
        const codes = sentence.map((w) => encodeWord(w)!);
        const out = decodeGhost(codes, { lexicon: lex, lm: bi });
        expect(out.length).toBeGreaterThan(0);
        expect(validate(out[0]!.words, codes)).toBe(true);
      }),
    );
  });

  it('Req 5.4 context only supplies the prev word of the first slot', () => {
    const calls: [string, string][] = [];
    const spy: LanguageModel = { logP: (p, w) => (calls.push([p, w]), bi.logP(p, w)) };
    decodeGhost(['4663', '4'], { lexicon: lex, lm: spy, context: ['we', 'should', 'Go'] });
    const firstSlotPrevs = new Set(calls.filter(([, w]) => lex.lookup('4663').includes(w)).map(([p]) => p));
    expect(firstSlotPrevs).toEqual(new Set(['go']));
    const secondSlotPrevs = new Set(calls.filter(([, w]) => ['i', 'h', 'g'].includes(w)).map(([p]) => p));
    for (const p of secondSlotPrevs) expect(lex.lookup('4663')).toContain(p);
    // context words never appear in the output
    for (const c of decodeGhost(['4663'], { lexicon: lex, lm: bi, context: ['go'] })) expect(c.words).toHaveLength(1);
    // no context, or empty context -> '<s>'
    calls.length = 0;
    decodeGhost(['4'], { lexicon: lex, lm: spy, context: [] });
    expect(new Set(calls.map(([p]) => p))).toEqual(new Set(['<s>']));
  });

  it('Req 5.5 an unknown code gives no candidates (ghost mode never invents words)', () => {
    expect(decodeGhost(['4', '22222', '92837'], { lexicon: lex, lm: bi })).toEqual([]);
    expect(decodeGhost([], { lexicon: lex, lm: bi })).toEqual([]);
    expect(decodeGhost(['4'], { lexicon: lex, lm: bi, k: 0 })).toEqual([]);
  });

  it('Req 5.6 initials mode decodes one digit per word (example)', () => {
    const out = decodeGhost(['4', '6', '9'], { lexicon: lex, lm: uni, mode: 'initials', k: 3 });
    expect(out.length).toBeGreaterThan(0);
    for (const c of out) expect(validate(c.words, ['4', '6', '9'], 'initials')).toBe(true);
    expect(decodeGhost(['46'], { lexicon: lex, lm: uni, mode: 'initials' })).toEqual([]);
  });

  it('Req 5.7 decoding is deterministic (property)', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...encodeSentence('i need good water and help now please')), { minLength: 1, maxLength: 6 }), (codes) => {
        expect(decodeGhost(codes, { lexicon: lex, lm: bi })).toEqual(decodeGhost(codes, { lexicon: Lexicon.fromJSON(MINI_LEXICON), lm: bigramModel(MINI_BIGRAM, lex) }));
      }),
    );
  });
});
