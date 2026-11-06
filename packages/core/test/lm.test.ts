import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DEFAULT_LETTER_PENALTY, LOGP_FLOOR, Lexicon, SPOKEN_LETTERS, bigramModel, unigramModel, type BigramFile } from '../src/index';
import { anyString, letter, lexiconFile, plainWord, runs } from './arbitraries';
import { MINI_BIGRAM, MINI_LEXICON } from './fixtures/mini-lexicon';

describe('core-encoder: language models', () => {
  const lex = Lexicon.fromJSON(MINI_LEXICON);
  const uni = unigramModel(lex);
  const bi = bigramModel(MINI_BIGRAM, lex);

  it('Req 4.1 unigram log10 p = zipf - 9; unknown words get the floor (example)', () => {
    expect(uni.logP('<s>', 'good')).toBeCloseTo(6.2 - 9);
    expect(uni.logP('anything', 'good')).toBeCloseTo(6.2 - 9); // prev is ignored
    expect(uni.logP('<s>', 'Good')).toBeCloseTo(6.2 - 9);
    expect(uni.logP('<s>', 'zzzz')).toBe(LOGP_FLOOR);
  });

  it('Req 4.2 bigram uses the listed log-prob, else backoff(prev) + unigram (example)', () => {
    expect(bi.logP('i', 'need')).toBeCloseTo(-1.2);
    expect(bi.logP('<s>', 'i')).toBeCloseTo(-0.8);
    expect(bi.logP('I', 'need')).toBeCloseTo(-1.2); // prev is normalized
    expect(bi.logP('go', 'good')).toBeCloseTo(-0.5 + (6.2 - 9));
    expect(bi.logP('unseen', 'good')).toBeCloseTo(6.2 - 9); // no backoff weight -> 0
    expect(bi.logP('go', 'home')).toBeGreaterThan(bi.logP('go', 'good'));
  });

  it('Req 4.3 JSON prototype keys are not bigrams ("constructor" is a word too)', () => {
    const l = Lexicon.fromJSON({ ...MINI_LEXICON, codes: { ...MINI_LEXICON.codes, '26678287867': [['constructor', 40]] } });
    const m = bigramModel(JSON.parse(JSON.stringify(MINI_BIGRAM)) as BigramFile, l);
    expect(m.logP('i', 'constructor')).toBeCloseTo(-0.4 + (4.0 - 9));
    expect(m.logP('constructor', 'need')).toBeCloseTo(5.8 - 9);
    expect(m.logP('__proto__', 'toString')).toBe(LOGP_FLOOR);
  });

  it('Req 4.4 every log-prob is finite and in [-9 + backoff, 0] for any input (property)', () => {
    fc.assert(
      fc.property(fc.oneof(plainWord(1, 8), anyString, fc.constant('<s>')), fc.oneof(plainWord(1, 8), anyString), (p, w) => {
        for (const m of [uni, bi]) {
          const lp = m.logP(p, w);
          expect(Number.isFinite(lp)).toBe(true);
          expect(lp).toBeLessThanOrEqual(0);
          expect(lp).toBeGreaterThanOrEqual(LOGP_FLOOR - 1);
        }
      }),
      { numRuns: runs(500) },
    );
  });

  it('Req 4.2 rejects bigram files that are not v1', () => {
    expect(() => bigramModel({ ...MINI_BIGRAM, v: 3 } as unknown as BigramFile, lex)).toThrow(TypeError);
  });

  it('Req 4.5 one-letter words other than "a" and "i" get the letter penalty; nothing else does (example)', () => {
    expect(DEFAULT_LETTER_PENALTY).toBe(-3);
    expect(SPOKEN_LETTERS).toEqual(['a', 'i']);
    const off = unigramModel(lex, { letterPenalty: 0 });
    expect(uni.logP('<s>', 'h')).toBeCloseTo(4.0 - 9 - 3);
    expect(uni.logP('<s>', 'H')).toBeCloseTo(4.0 - 9 - 3); // normalized first
    expect(off.logP('<s>', 'h')).toBeCloseTo(4.0 - 9);
    expect(uni.logP('<s>', 'i')).toBeCloseTo(7.2 - 9);
    expect(uni.logP('<s>', 'a')).toBeCloseTo(7.3 - 9);
    expect(uni.logP('<s>', 'go')).toBeCloseTo(6.2 - 9);
    expect(unigramModel(lex, { spokenLetters: ['h'] }).logP('<s>', 'i')).toBeCloseTo(7.2 - 9 - 3);
    expect(unigramModel(lex, { letterPenalty: 2 }).logP('<s>', 'h')).toBeCloseTo(4.0 - 9); // > 0 counts as 0
    // bigram: the backoff branch and a listed pair both get it
    const file: BigramFile = { ...MINI_BIGRAM, logp: { ...MINI_BIGRAM.logp, '<s>': { ...MINI_BIGRAM.logp['<s>'], h: -2 } } };
    expect(bigramModel(file, lex).logP('<s>', 'h')).toBeCloseTo(-5);
    expect(bigramModel(file, lex, { letterPenalty: 0 }).logP('<s>', 'h')).toBeCloseTo(-2);
    expect(bi.logP('go', 'g')).toBeCloseTo(-0.5 + (3.8 - 9 - 3));
  });

  it('Req 4.5 the letter penalty only lowers one-letter scores, by at most |penalty|, and leaves every other score unchanged (property)', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(MINI_LEXICON), lexiconFile(false)),
        fc.oneof(letter, plainWord(1, 3), anyString, fc.constant('<s>')),
        fc.oneof(letter, letter.map((c) => c.toUpperCase()), plainWord(1, 3), anyString),
        fc.double({ min: -12, max: 0, noNaN: true }),
        (file, p, w, pen) => {
          const l = Lexicon.fromJSON(file);
          const pairs = [
            [unigramModel(l, { letterPenalty: 0 }), unigramModel(l, { letterPenalty: pen })],
            [bigramModel(MINI_BIGRAM, l, { letterPenalty: 0 }), bigramModel(MINI_BIGRAM, l, { letterPenalty: pen })],
          ] as const;
          const penalised = /^[a-z]$/.test(w.toLowerCase()) && !SPOKEN_LETTERS.includes(w.toLowerCase());
          for (const [off, on] of pairs) {
            const a = off.logP(p, w);
            const b = on.logP(p, w);
            expect(Number.isFinite(b)).toBe(true);
            expect(b).toBeLessThanOrEqual(0);
            if (!penalised) expect(b).toBe(a);
            else {
              expect(b).toBeLessThanOrEqual(a);
              expect(b).toBeGreaterThanOrEqual(a + pen - 1e-9);
            }
          }
        },
      ),
      { numRuns: runs(500) },
    );
  });
});
