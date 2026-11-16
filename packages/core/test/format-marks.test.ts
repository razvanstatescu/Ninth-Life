// Punctuation where typed, and capitals (web-ui Req 34.3-34.5; spec r6 5-punctuation-capitals AC 2, 12, 13).
// Goes to packages/core/test/format-marks.test.ts when item 5 is built.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { BOS, CAPITALS, Lexicon, SENTENCE_END, beam, bigramModel, decodeGhost, formatSentence, lattice, normalize, type Punct } from '../src/index';
import { plainWord } from './arbitraries';
import { MINI_BIGRAM, MINI_LEXICON } from './fixtures/mini-lexicon';

const PUNCTS: (Punct | undefined)[] = [undefined, '.', '?', '!', ','];
const strip = (t: string) => t.replace(/[.?!,]+$/, '').toLowerCase();

describe('core: formatSentence with marks (Req 34.1, 34.3)', () => {
  it('AC 1 "not now, later please"', () => {
    expect(formatSentence(['not', 'now', 'later', 'please'], undefined, [undefined, ',', undefined, undefined])).toBe('Not now, later please');
  });
  it('AC 2 "Yes. I will be there soon."', () => {
    expect(formatSentence(['yes', 'i', 'will', 'be', 'there', 'soon'], undefined, ['.', undefined, undefined, undefined, undefined, '.'])).toBe('Yes. I will be there soon.');
  });
  it('a capital after ? and !, not after a comma', () => {
    expect(formatSentence(['ok', 'where', 'now', 'go'], undefined, ['?', '!', ',', undefined])).toBe('Ok? Where! Now, go');
  });
  it('Ask: the end mark goes after the last word only while it has no mark of its own (34.6)', () => {
    expect(formatSentence(['are', 'you', 'coming'], '?')).toBe('Are you coming?');
    expect(formatSentence(['yes'], '?', ['.'])).toBe('Yes.');
  });
  it('AC 12 property: without marks it equals the old output; never adds, drops or reorders words', () => {
    fc.assert(
      fc.property(fc.array(plainWord(1, 8), { minLength: 1, maxLength: 8 }), fc.constantFrom(...PUNCTS), (ws, end) => {
        expect(formatSentence(ws, end, ws.map(() => undefined))).toBe(formatSentence(ws, end));
      }),
    );
    fc.assert(
      fc.property(fc.array(fc.tuple(plainWord(1, 8), fc.constantFrom(...PUNCTS)), { minLength: 1, maxLength: 8 }), fc.constantFrom(...PUNCTS), (pairs, end) => {
        const ws = pairs.map(([w]) => w);
        const marks = pairs.map(([, m]) => m);
        const out = formatSentence(ws, end, marks);
        const tokens = out.split(' ');
        expect(tokens).toHaveLength(ws.length); // one token per slot
        expect(tokens.map(strip)).toEqual(ws.map((w) => normalize(CAPITALS[w] ?? w)));
        // A capital after every sentence end, and on the first word.
        tokens.forEach((t, i) => {
          if (i === 0 || SENTENCE_END.has(marks[i - 1] as Punct)) expect(t[0]).toBe(t[0]!.toUpperCase());
          if (marks[i]) expect(t.endsWith(marks[i]!)).toBe(true);
        });
      }),
    );
  });
});

describe('core: CAPITALS (Req 34.4, AC 6, 13)', () => {
  it('every entry folds back to its key', () => {
    for (const [k, v] of Object.entries(CAPITALS)) expect(normalize(v), k).toBe(k);
  });
  it('leaves out ordinary words', () => {
    for (const w of ['may', 'march', 'august', 'china', 'turkey', 'polish', 'nice', 'us']) expect(CAPITALS[w], w).toBeUndefined();
  });
  it('AC 6 examples (the app maps words through CAPITALS, then formats)', () => {
    const f = (ws: string[]) => formatSentence(ws.map((w) => CAPITALS[w] ?? w));
    expect(f(['see', 'you', 'on', 'thursday'])).toBe('See you on Thursday');
    expect(f(['watch', 'tv'])).toBe('Watch TV');
    expect(f(['may', 'i'])).toBe('May I');
    expect(f(['i', 'may'])).toBe('I may');
    expect(f(['ask', 'dr', 'smith', 'ok'])).toBe('Ask Dr smith OK');
  });
});

describe('core: a new sentence starts the word pairs afresh (Req 34.3, AC 2)', () => {
  const lex = Lexicon.fromJSON(MINI_LEXICON);
  const lm = bigramModel(MINI_BIGRAM, lex);
  it('beam with starts scores the slot after a sentence end from BOS', () => {
    const lat = lattice(['4357', '4'], lex, 12);
    const a = beam(lat, lm, 16, BOS, new Set([1]));
    const manual = lm.logP(BOS, 'help') + lm.logP(BOS, a[0]!.words[1]!);
    expect(a[0]!.score).toBeCloseTo(manual, 6);
  });
  it('decodeGhost passes starts through, and without it nothing changes', () => {
    const codes = ['4357', '4'];
    expect(decodeGhost(codes, { lexicon: lex, lm, starts: new Set<number>() } as never)).toEqual(decodeGhost(codes, { lexicon: lex, lm }));
  });
});
