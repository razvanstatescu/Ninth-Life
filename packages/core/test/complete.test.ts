// Finish the word (web-ui Req 31.1, 31.7; spec r6 2-word-completion §3): rankCompletions offers at most 3
// words whose code starts with the keys typed and is longer, ranked by the word-pair model, never a word
// the `allow` filter refuses. Properties on the mini lexicon and, when the data is present, the real one.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  BOS,
  Lexicon,
  MAX_COMPLETIONS,
  bigramModel,
  encodeWord,
  rankCompletions,
  unigramModel,
  type BigramFile,
  type LanguageModel,
  type LexiconFile,
  type LexiconFileV2,
} from '../src/index';
import { code } from './arbitraries';
import { MINI_BIGRAM, MINI_LEXICON } from './fixtures/mini-lexicon';

const DATA = join(__dirname, '..', '..', '..', 'data', 'lexicon');
const LEX_V2 = join(DATA, 'en.v2.json');
const BIGRAM = join(DATA, 'en.bigram.v1.json');
const haveData = existsSync(LEX_V2) && existsSync(BIGRAM);

/** Every property the spec names for one call (AC 15). */
function checkCall(lex: Lexicon, lm: LanguageModel, prefix: string, prev: string, allow?: (w: string) => boolean) {
  const out = rankCompletions(prefix, prev, lex, lm, allow ? { allow } : undefined);
  expect(out.length).toBeLessThanOrEqual(MAX_COMPLETIONS);
  expect(new Set(out).size).toBe(out.length);
  for (const w of out) {
    const c = encodeWord(w);
    expect(c, `${w} encodes`).not.toBeNull();
    expect(lex.has(w), `${w} is in the lexicon`).toBe(true);
    expect(c!.startsWith(prefix), `${w} (${c}) starts with ${prefix}`).toBe(true);
    expect(c!.length, `${w} is longer than the keys typed`).toBeGreaterThan(prefix.length);
    expect(c!.length, `${w} has at most 16 keys`).toBeLessThanOrEqual(16);
    if (allow) expect(allow(w), `${w} passes allow`).toBe(true);
  }
  // Deterministic: the same call gives the same answer.
  expect(rankCompletions(prefix, prev, lex, lm, allow ? { allow } : undefined)).toEqual(out);
  return out;
}

describe('core: rankCompletions on the mini lexicon (Req 31.1)', () => {
  const lex = Lexicon.fromJSON(MINI_LEXICON as LexiconFile);
  const bi = bigramModel(MINI_BIGRAM, lex);
  const uni = unigramModel(lex);

  it('Req 31.1 466 -> words longer than 466 that start with it, at most 3 (example)', () => {
    const out = checkCall(lex, bi, '466', BOS);
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toContain('in'); // shorter
  });

  it('Req 31.1 a word equal to the keys typed is never offered (4663 never offers good/home/gone)', () => {
    const out = rankCompletions('4663', BOS, lex, bi);
    for (const w of ['good', 'home', 'gone', 'hood', 'hoof', 'goof']) expect(out).not.toContain(w);
  });

  it('Req 31.1 one-letter words are never offered', () => {
    for (const p of ['2', '4']) for (const w of rankCompletions(p, BOS, lex, bi)) expect(w.replace(/'/g, '').length).toBeGreaterThan(1);
  });

  it('Req 31.1 bad prefixes give nothing: empty, 0, 1, letters', () => {
    for (const p of ['', '0', '1', '40', 'abc', '4 6']) expect(rankCompletions(p, BOS, lex, bi)).toEqual([]);
  });

  it('Req 31.1 the word before ranks the words (bigram), so "i" + 4 prefers a word the model knows after "i"', () => {
    // MINI_BIGRAM: i -> need, want. Both start with their own keys; check the ranking follows logP.
    const out = rankCompletions('6', 'i', lex, bi);
    for (let i = 1; i < out.length; i++) expect(bi.logP('i', out[i - 1]!)).toBeGreaterThanOrEqual(bi.logP('i', out[i]!));
  });

  it('Req 31.1, 31.7 property: any prefix and previous word, bigram or unigram, with or without allow', () => {
    const words = Object.values(MINI_LEXICON.codes).flatMap((l) => l.map(([w]) => w));
    fc.assert(
      fc.property(code(6), fc.constantFrom(BOS, 'i', 'need', 'go', 'zzz', ...words), fc.boolean(), fc.option(fc.subarray(words), { nil: undefined }), (prefix, prev, useBi, allowed) => {
        const allow = allowed ? (w: string) => allowed.includes(w) : undefined;
        checkCall(lex, useBi ? bi : uni, prefix, prev, allow);
      }),
    );
  });

  it('Req 31.7 allow refuses a word: it is never offered even when it would rank first', () => {
    const all = rankCompletions('466', BOS, lex, bi);
    if (all.length === 0) return;
    const banned = all[0]!;
    expect(rankCompletions('466', BOS, lex, bi, { allow: (w) => w !== banned })).not.toContain(banned);
  });
});

describe.skipIf(!haveData)('core: rankCompletions on the real lexicon and word pairs (Req 31.1, 31.7)', () => {
  const lex = Lexicon.fromJSON(JSON.parse(readFileSync(LEX_V2, 'utf8')) as LexiconFile | LexiconFileV2);
  const file = JSON.parse(readFileSync(BIGRAM, 'utf8')) as BigramFile;
  const lm = bigramModel(file, lex);
  const vocab = new Set<string>([...Object.keys(file.logp), ...Object.values(file.logp).flatMap((r) => Object.keys(r))]);
  const knows = (w: string) => (lm.knows ? lm.knows(w) : vocab.has(w));

  it('Req 31.1 "I need wa" (92 after need) offers water (spec example)', () => {
    const out = checkCall(lex, lm, '92', 'need', knows);
    expect(out).toContain('water');
  });

  it("apostrophes are free: 366 after i offers don't", () => {
    const out = checkCall(lex, lm, '366', 'i', knows);
    expect(out).toContain("don't");
  });

  it('Req 31.7 the language model knows its own vocabulary (knows is implemented by bigramModel)', () => {
    expect(typeof lm.knows).toBe('function');
    expect(lm.knows!('water')).toBe(true);
    expect(typeof lm.successors).toBe('function');
    expect(lm.successors!('need')).toContain('to');
  });

  it('Req 31.1, 31.7 property: every result starts with the prefix, is longer, <= 16 keys, known, <= 3, deterministic', () => {
    const prevs = [BOS, 'i', 'need', 'the', 'can', 'you', 'please', 'not', 'xqzv'];
    fc.assert(
      fc.property(code(5), fc.constantFrom(...prevs), (prefix, prev) => {
        checkCall(lex, lm, prefix, prev, knows);
      }),
      { numRuns: 200 },
    );
  });

  it('Req 31.1 a warm call is fast (spec: about 0.14 ms; allow 5 ms on a slow CI box)', () => {
    rankCompletions('4', BOS, lex, lm, { allow: knows });
    const t0 = performance.now();
    for (let i = 0; i < 200; i++) rankCompletions(['4', '46', '466', '92', '843'][i % 5]!, 'i', lex, lm, { allow: knows });
    expect((performance.now() - t0) / 200).toBeLessThan(5);
  });
});
