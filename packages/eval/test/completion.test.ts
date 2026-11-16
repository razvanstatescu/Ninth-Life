/** B1c, Finish the word in the harness (web-ui Req 31; improvement plan T1). */
import { describe, expect, it } from 'vitest';
import { encodeWord, Lexicon, rankCompletions, validate, type BigramFile, type LexiconFile } from '@ninth/core';
import { completionUser, decodePinned, simulateCompletion } from '../src/completion';
import { APP_GRID, appCellOf, cellOf, scanSteps } from '../src/scan-cost';
import { runEval } from '../src/run';
import type { TestItem } from '../src/types';

const lexFile: LexiconFile = {
  v: 1,
  lang: 'en',
  source: 'test',
  license: 'test',
  codes: {
    '4': [['i', 70], ['h', 50]],
    '6333': [['need', 55], ['meed', 20]],
    '92837': [['water', 52], ['waves', 45]],
    '927': [['was', 60]],
  },
};
const bigram: BigramFile = { v: 1, lang: 'en', source: 't', license: 't', bos: '<s>', logp: { '<s>': { i: -0.5 }, i: { need: -0.5 }, need: { water: -0.5 } }, backoff: {} };
const item = (words: string[]): TestItem => ({ id: 't', src: 'aac', text: words.join(' '), words, codes: words.map((w) => encodeWord(w)!) });

describe('B1c simulated user', () => {
  const lex = Lexicon.fromJSON(lexFile);
  const u = completionUser(lex, bigram, 5);

  it('takes a word at the first chance that saves a press, and the sentence still validates', () => {
    const { result, targets } = simulateCompletion(item(['i', 'need', 'water']), u);
    // i: 1 key + 0; need: 6 + pick (offered after 1 key); water: 9 + pick.
    expect(targets.filter((t) => 'word' in t)).toHaveLength(2);
    expect(result.presses).toBe(1 + 1 + 1 + 1 + 1 + 1);
    expect(result.completed).toBe(2);
    expect(result.rank).toBe(0);
    expect(result.scanStepsApp).toBeGreaterThan(0);
  });

  it('never presses more than typing every letter would', () => {
    for (const w of [['i'], ['i', 'need'], ['was', 'water'], ['i', 'need', 'water']]) {
      const r = simulateCompletion(item(w), u).result;
      const plain = w.reduce((s, x) => s + encodeWord(x)!.length, 0) + w.length - 1;
      expect(r.presses).toBeLessThanOrEqual(plain);
    }
  });

  it('decodePinned keeps pins and every sentence validates', () => {
    const codes = ['4', '6333', '92837'];
    for (const s of decodePinned(codes, [undefined, 'meed', undefined], lex, u.lm, 5)) {
      expect(s[1]).toBe('meed');
      expect(validate(s, codes)).toBe(true);
    }
  });

  it('offers come from rankCompletions with the word-pair filter', () => {
    expect(rankCompletions('9', 'need', lex, u.lm, { allow: u.allow })).toEqual(['water']);
  });
});

describe('scan grids', () => {
  it('the app grid puts the keypad first, then the words, then the sentences', () => {
    expect(APP_GRID.rows).toEqual([3, 3, 3, 3, 3, 5]);
    expect(appCellOf({ key: '1' })).toEqual([0, 0]);
    expect(appCellOf({ key: '#' })).toEqual([3, 2]);
    expect(appCellOf({ word: 2 })).toEqual([4, 2]);
    expect(appCellOf({ candidate: 1 })).toEqual([5, 1]);
    expect(cellOf({ word: 1 })).toEqual([0, 1]);
    // A key is cheaper on the app grid (no sentence row before it).
    expect(scanSteps([{ key: '4' }], 'app')).toBeLessThan(scanSteps([{ key: '4' }]));
  });
});

describe('runEval adds B1c in letter mode only', () => {
  const base = {
    items: [item(['i', 'need', 'water'])],
    fixture: { path: 't', sha256: 'x' },
    lexicon: { data: lexFile, sha256: 'y' },
    bigram: { data: bigram, sha256: 'z' },
  };
  it('letter mode', async () => {
    const { results } = await runEval({ ...base, only: ['B1', 'B1c'] });
    const c = results.configs.find((x) => x.id === 'B1c')!;
    expect(c.metrics!.completedWords).toBeCloseTo(2 / 3, 3);
    expect(c.metrics!.ksr).toBeGreaterThan(0);
    expect(results.configs.find((x) => x.id === 'B1')!.metrics!.scanStepsPerCharApp).toBeGreaterThan(0);
  });
  it('initials mode has no B1c', async () => {
    const { results } = await runEval({ ...base, mode: 'initials' });
    expect(results.configs.some((x) => x.id === 'B1c')).toBe(false);
  });
});
