/** Simulated user, metrics, scan cost, LLM configs and determinism (spec eval-harness Req 3.5, 4.x, 6.x; properties P7-P12). */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { encodeWord, Lexicon, type LexiconFile } from '@ninth/core';
import { llmDecoder, type LlmProposer } from '../src/decoders';
import { EVAL_DIR, loadBigramFile, loadFixture, loadLexiconFile } from '../src/fixture';
import { aggregate, percentile } from '../src/metrics';
import { sample, shuffled } from '../src/rng';
import { runEval, serializeResults } from '../src/run';
import { GRID, scanSteps, scanTo } from '../src/scan-cost';
import { simulate } from '../src/simulate';
import type { TestItem } from '../src/types';
import { initialScan } from '@ninth/core';

const tinyLex: LexiconFile = {
  v: 1,
  lang: 'en',
  source: 'test',
  license: 'test',
  codes: {
    '4': [['i', 70], ['h', 50], ['g', 49]],
    '6333': [['need', 55], ['meed', 20]],
    '4663': [['good', 61], ['home', 58], ['gone', 52], ['hood', 40]],
    '4768': [["isn't", 54]],
  },
};
const lex = Lexicon.fromJSON(tinyLex);
const item = (words: string[], extra: Partial<TestItem> = {}): TestItem => ({
  id: 't',
  src: 'aac',
  text: words.join(' '),
  words,
  codes: words.map((w) => encodeWord(w)!),
  ...extra,
});

describe('simulated user', () => {
  it('counts one press per letter, free apostrophes, one space between words, nothing to accept rank 0', () => {
    const it0 = item(['i', "isn't", 'good']);
    const r = simulate(it0, { candidates: [['i', "isn't", 'good']] }, lex, 5);
    expect(r.rank).toBe(0);
    expect(r.wordsCorrect).toBe(3);
    expect(r.chars).toBe(1 + 5 + 4 + 2);
    expect(r.presses).toBe(1 + 4 + 4 + 2);
    expect(r.selections).toBe(0);
  });

  it('costs one selection for a gold sentence at rank 1..k-1', () => {
    const r = simulate(item(['home']), { candidates: [['good'], ['home']] }, lex, 5);
    expect(r.rank).toBe(1);
    expect(r.selections).toBe(1);
    expect(r.wordsCorrect).toBe(0);
  });

  it('falls back to # cycling in lexicon order when gold is not in the top k', () => {
    const r = simulate(item(['gone']), { candidates: [['good']] }, lex, 5);
    expect(r.rank).toBe(-1);
    expect(r.presses).toBe(4 + 2); // good -> home -> gone
    expect(r.unreachable).toBe(false);
  });

  it('wraps around when cycling past the end', () => {
    const r = simulate(item(['good']), { candidates: [['hood']] }, lex, 5);
    expect(r.presses).toBe(4 + 1); // hood -> good
  });

  it('marks a gold word missing from the lexicon as unreachable', () => {
    const it1: TestItem = { id: 'x', src: 'aac', text: 'hoof', words: ['hoof'], codes: ['4663'] };
    const r = simulate(it1, { candidates: [['good']] }, lex, 5);
    expect(r.unreachable).toBe(true);
    expect(r.presses).toBe(4 + 4);
  });

  it('uses the per-slot first reading for word accuracy when the decoder returns nothing', () => {
    const r = simulate(item(['i', 'need']), { candidates: [] }, lex, 5);
    expect(r.wordsCorrect).toBe(2);
    expect(r.rank).toBe(-1);
  });

  it('counts invalid pre-validator candidates', () => {
    const r = simulate(item(['i', 'need']), { candidates: [['i', 'need']], raw: [['i', 'need'], ['i', 'want']] }, lex, 5);
    expect(r.invalidRaw).toBe(1);
    expect(r.rawCount).toBe(2);
  });
});

describe('metrics', () => {
  it('aggregates a perfect decoder to 100% accuracy and KSR = apostrophes / chars', () => {
    const it0 = item(['i', "isn't", 'good']);
    const m = aggregate([simulate(it0, { candidates: [it0.words] }, lex, 5)], 5, false, false);
    expect(m.wordAcc).toBe(1);
    expect(m.top1).toBe(1);
    expect(m.top5).toBe(1);
    expect(m.ksr).toBeCloseTo(1 / 12, 4);
    expect(m.invalidPreValidator).toBeNull();
  });

  it('percentile uses nearest rank', () => {
    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95)).toBe(10);
  });
});

describe('scan cost via core scanReducer', () => {
  it('reaches every grid cell within rows + max(row length) highlight steps and 2 selects', () => {
    const bound = GRID.rows.length + Math.max(...GRID.rows);
    GRID.rows.forEach((len, r) => {
      for (let c = 0; c < len; c++) {
        const { ticks } = scanTo(initialScan(GRID), r, c);
        expect(ticks).toBeLessThanOrEqual(bound);
      }
    });
  });

  it('costs 3 steps for key 2 from idle (enter rows, row 1, then cell 1)', () => {
    expect(scanSteps([{ key: '2' }])).toBe(3);
  });
});

describe('rng', () => {
  it('sample is deterministic per seed, in original order, without repeats', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 31 }), fc.integer({ min: 0, max: 60 }), (seed, n) => {
        const xs = Array.from({ length: 50 }, (_, i) => i);
        const a = sample(xs, n, seed);
        expect(sample(xs, n, seed)).toEqual(a);
        expect(a).toHaveLength(Math.min(n, 50));
        expect([...a].sort((x, y) => x - y)).toEqual(a);
        expect(new Set(a).size).toBe(a.length);
      }),
    );
    expect(shuffled([1, 2, 3, 4, 5], 1)).not.toEqual(shuffled([1, 2, 3, 4, 5], 2));
  });
});

describe('LLM configs (pluggable)', () => {
  const big = loadBigramFile().data;
  const fake: LlmProposer = {
    model: 'fake',
    propose: async (req) => ({ candidates: [['i', 'want'], ['i', 'need']], usd: req.lattice ? 0.002 : 0.001 }),
  };

  it('B2 passes unvalidated candidates through; B3/B4 drop those that break the keys', async () => {
    const codes = ['4', '6333'];
    const b2 = await llmDecoder('B2', fake, lex, big).decode({ codes, mode: 'letter', k: 5 });
    const b3 = await llmDecoder('B3', fake, lex, big).decode({ codes, mode: 'letter', k: 5 });
    const b4 = await llmDecoder('B4', fake, lex, big).decode({ codes, mode: 'letter', k: 5 });
    expect(b2.candidates).toHaveLength(2);
    expect(b3.candidates).toEqual([['i', 'need']]);
    expect(b4.candidates).toEqual([['i', 'need']]);
    expect(b4.usd).toBe(0.002);
  });
});

describe('determinism (Req 6.1)', () => {
  const { items, sha256 } = loadFixture();
  const lexicon = loadLexiconFile();
  const bigram = loadBigramFile();
  const input = { items, fixture: { path: 'fixtures/test.v1.jsonl', sha256 }, lexicon, bigram };

  it('gives byte-identical RESULTS.json for the same seed (property over seeds, quick subset)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 0, max: 2 ** 31 }), async (seed) => {
        const a = await runEval({ ...input, quick: true, seed });
        const b = await runEval({ ...input, quick: true, seed });
        expect(serializeResults(a.results)).toBe(serializeResults(b.results));
      }),
      { numRuns: 5 },
    );
  });

  it('a different seed selects a different quick subset', async () => {
    const a = await runEval({ ...input, quick: true, seed: 1, only: ['B0'] });
    const b = await runEval({ ...input, quick: true, seed: 2, only: ['B0'] });
    expect(a.results.subset.items).toBe(200);
    expect(serializeResults(a.results)).not.toBe(serializeResults(b.results));
  });

  it('the CLI writes byte-identical RESULTS.json on two runs', () => {
    const run = () => {
      const out = mkdtempSync(join(tmpdir(), 'ninth-eval-'));
      execFileSync(join(EVAL_DIR, 'node_modules', '.bin', 'tsx'), ['src/cli.ts', '--quick', '--seed', '42', '--write', '--out', out], {
        cwd: EVAL_DIR,
        stdio: 'pipe',
      });
      return readFileSync(join(out, 'RESULTS.json'));
    };
    expect(run().equals(run())).toBe(true);
  });
});
