// Punctuation where typed, and capitals (web-ui Req 34.1, 34.3, 34.4, 34.5).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { BOS, CAPITALS, Lexicon, SENTENCE_END, beam, bigramModel, decodeGhost, formatSentence, normalize, type LexiconFile, type Punct } from '../src/index';
import { plainWord } from './arbitraries';
import { MINI_BIGRAM, MINI_LEXICON } from './fixtures/mini-lexicon';

const punct = fc.constantFrom<Punct | undefined>(undefined, '.', '?', '!', ',');
const strip = (t: string) => normalize(t.replace(/[.?!,]+$/, ''));

describe('formatSentence with marks (Req 34.1, 34.3)', () => {
  it('examples', () => {
    expect(formatSentence(['not', 'now', 'later', 'please'], undefined, [undefined, ',', undefined, undefined])).toBe('Not now, later please');
    expect(formatSentence(['yes', 'i', 'will', 'be', 'there', 'soon'], undefined, ['.', undefined, undefined, undefined, undefined, '.'])).toBe('Yes. I will be there soon.');
    expect(formatSentence(['are', 'you', 'ok', 'see', 'you'], '?', [undefined, undefined, '?', undefined, undefined])).toBe('Are you ok? See you?');
    // The end mark only when the last word has none of its own.
    expect(formatSentence(['yes'], '?', ['.'])).toBe('Yes.');
    expect(formatSentence(['a', 'b'], '.', [undefined, undefined])).toBe('A b.');
  });

  it('Req 34.5 property: never adds, drops or reorders words; one token per word', () => {
    fc.assert(
      fc.property(fc.array(plainWord(1, 8), { minLength: 1, maxLength: 8 }), fc.array(punct, { maxLength: 8 }), punct, (words, marks, end) => {
        const text = formatSentence(words, end, marks);
        const tokens = text.split(' ');
        expect(tokens).toHaveLength(words.length);
        expect(tokens.map(strip)).toEqual(words.map((w) => normalize(w)));
      }),
    );
  });

  it('Req 34.3 property: a capital after every sentence end; without marks it is the old output', () => {
    fc.assert(
      fc.property(fc.array(plainWord(1, 8), { minLength: 2, maxLength: 8 }), fc.array(punct, { minLength: 8, maxLength: 8 }), (words, marks) => {
        const tokens = formatSentence(words, undefined, marks).split(' ');
        for (let i = 1; i < words.length; i++) {
          const m = marks[i - 1];
          if (m && SENTENCE_END.has(m)) expect(tokens[i]![0]).toBe(tokens[i]![0]!.toUpperCase());
        }
        expect(formatSentence(words, '.', undefined)).toBe(formatSentence(words, '.'));
      }),
    );
  });
});

describe('CAPITALS (Req 34.4)', () => {
  it('every display folds back to its key; no ordinary words', () => {
    for (const [k, v] of Object.entries(CAPITALS)) expect(normalize(v)).toBe(k);
    for (const w of ['may', 'march', 'august', 'china', 'turkey', 'polish', 'nice', 'us']) expect(CAPITALS[w]).toBeUndefined();
    expect(CAPITALS.thursday).toBe('Thursday');
    expect(CAPITALS.tv).toBe('TV');
  });
});

describe('a new sentence in decoding (Req 34.3)', () => {
  const lex = Lexicon.fromJSON(MINI_LEXICON as LexiconFile);
  const lm = bigramModel(MINI_BIGRAM, lex);
  it('a slot in starts is scored after BOS, not after the word before', () => {
    const lat = [['need'], ['i']];
    const plain = beam(lat, lm, 8)[0]!.score;
    const fresh = beam(lat, lm, 8, BOS, new Set([1]))[0]!.score;
    expect(fresh).toBeCloseTo(lm.logP(BOS, 'need') + lm.logP(BOS, 'i'), 6);
    expect(plain).toBeCloseTo(lm.logP(BOS, 'need') + lm.logP('need', 'i'), 6);
    expect(decodeGhost(['6333', '4'], { lexicon: lex, lm, starts: new Set([1]) })[0]!.score).toBeCloseTo(fresh, 6);
  });
});
