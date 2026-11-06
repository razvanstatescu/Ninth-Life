import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { LOGP_FLOOR, Lexicon, bigramModel, unigramModel, type BigramFile } from '../src/index';
import { anyString, plainWord, runs } from './arbitraries';
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
});
