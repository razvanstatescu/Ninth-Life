// Build-time data for the website at / (marketing-site design.md "Build-time data"; MS-5, MS-6.2,
// MS-7.4, MS-7.6). The fixtures copy the real shape of packages/eval/RESULTS.llm.json: `runs` is an
// object keyed "<model>:<mode>", each with `subset.items` and a `configs` array.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Lexicon, encodeWord, unigramModel } from '@ninth/core';
import { MODEL_IDS } from '@ninth/decoder';
import { describe, expect, it, vi } from 'vitest';
import {
  DEMO_WORDS,
  finishedKeys,
  getDemoData,
  getHowData,
  getProofExample,
  getResults,
  getSpellExample,
  modelRunsLine,
  proofSaidLine,
  type JsonReader,
  type SiteDictionary,
} from '@/components/site/site-data';

const RESULTS = JSON.parse(readFileSync(resolve(__dirname, '../../eval/RESULTS.json'), 'utf8')) as {
  configs: { id: string; status: string; metrics?: Record<string, number> }[];
};

/** A reader that serves files by name; a missing name is a missing file (undefined). */
const reader =
  (files: Record<string, unknown>): JsonReader =>
  (...candidates) => {
    const name = candidates[0]?.[candidates[0].length - 1] ?? '';
    return name in files ? files[name] : undefined;
  };

const run = (model: string, mode: string, items: number | undefined, b4Status = 'ok') => ({
  model,
  mode,
  ...(items === undefined ? {} : { subset: { items, limit: items, seed: 9 } }),
  configs: [
    { id: 'B0', label: 'dictionary', status: 'ok', metrics: { items: items ?? 150 } },
    { id: 'B4', label: 'model ranking', status: b4Status, metrics: { items: items ?? 150 } },
  ],
});

const llm = (runs: unknown) => ({ harness: { version: 1 }, runs });

const pct = (x: number) => `${(Math.round(x * 1000) / 10).toFixed(1)}%`;

describe('getResults (MS-5)', () => {
  it('MS-5.1 formats B0 and B1 of RESULTS.json with one decimal', () => {
    const r = getResults();
    const b0 = RESULTS.configs.find((c) => c.id === 'B0')!.metrics!;
    const b1 = RESULTS.configs.find((c) => c.id === 'B1')!.metrics!;
    expect(r).not.toBeNull();
    expect(r!.items).toBe(b1.items);
    expect(r!.ghost).toEqual({
      wordAcc: pct(b1.wordAcc!),
      top1: pct(b1.top1!),
      top5: pct(b1.top5!),
      ksr: pct(b1.ksr!),
      scanStepsPerChar: b1.scanStepsPerChar!.toFixed(2),
    });
    expect(r!.dict).toEqual({ top1: pct(b0.top1!), top5: pct(b0.top5!) });
  });

  it('MS-5.2 gives null, with one warning, when RESULTS.json is missing or does not parse', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(getResults(reader({}))).toBeNull();
    expect(getResults(reader({ 'RESULTS.json': null }))).toBeNull();
    expect(warn).toHaveBeenCalledTimes(2);
    expect(String(warn.mock.calls[0]?.[0])).toContain('RESULTS.json is missing or invalid');
  });

  it('MS-5.2 gives null when B0 or B1 is missing, not ok, or has invalid metrics', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const withB1 = (patch: Record<string, unknown> | null, status = 'ok') => ({
      configs: RESULTS.configs.map((c) => (c.id === 'B1' ? (patch === null ? { ...c, status } : { ...c, metrics: { ...c.metrics, ...patch } }) : c)),
    });
    const cases = [
      { configs: RESULTS.configs.filter((c) => c.id !== 'B0') },
      withB1(null, 'not-run'),
      withB1({ items: 0 }),
      withB1({ items: 1.5 }),
      withB1({ top1: 1.2 }),
      withB1({ top5: -0.1 }),
      withB1({ wordAcc: Number.NaN }),
      withB1({ ksr: -2 }),
      withB1({ scanStepsPerChar: 0 }),
      withB1({ top1: '85%' }),
      { configs: 'B0' },
    ];
    for (const file of cases) expect(getResults(reader({ 'RESULTS.json': file }))).toBeNull();
  });

  it('MS-5.3 counts letter-mode runs of known models with B4 ok; initials, unknown models and failed B4 are skipped', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = getResults(
      reader({
        'RESULTS.json': RESULTS,
        'RESULTS.llm.json': llm({
          'MiniMax-M3:initials': run('MiniMax-M3', 'initials', 500),
          'MiniMax-M3:letter': run('MiniMax-M3', 'letter', 200),
          'MiniMax-M3.1-Flash:letter': run('MiniMax-M3.1-Flash', 'letter', undefined),
          'some-other-model:letter': run('some-other-model', 'letter', 700),
          'MiniMax-M3:letter-retry': run('MiniMax-M3', 'letter', 900, 'error'),
          broken: 'not a run',
        }),
      }),
    );
    // MiniMax-M3.1-Flash has no subset, so its size comes from the B4 entry's metrics.items (150).
    expect(r?.modelRuns).toEqual({ sizes: [150, 200], count: 2 });
    expect(warn).not.toHaveBeenCalled();
  });

  it('MS-5.3 gives no model line when runs is an array, null, empty, or the file is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const runsAsArray = [run('MiniMax-M3', 'letter', 200)];
    for (const file of [llm(runsAsArray), llm(null), llm({}), { harness: {} }]) {
      expect(getResults(reader({ 'RESULTS.json': RESULTS, 'RESULTS.llm.json': file }))?.modelRuns).toBeNull();
    }
    expect(getResults(reader({ 'RESULTS.json': RESULTS }))?.modelRuns).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('MS-5.3 gives no model line, with one warning, when the file does not parse', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(getResults(reader({ 'RESULTS.json': RESULTS, 'RESULTS.llm.json': null }))?.modelRuns).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('MS-5.3 gives no model line, with one warning, when runs come from two providers', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = getResults(
      reader({
        'RESULTS.json': RESULTS,
        'RESULTS.llm.json': llm({
          'MiniMax-M3:letter': run('MiniMax-M3', 'letter', 200),
          'claude-haiku-5-5:letter': run('claude-haiku-5-5', 'letter', 200),
        }),
      }),
    );
    expect(r?.modelRuns).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('more than one provider');
  });

  it('MS-5.3 reads the real RESULTS.llm.json: 200 sentences, 2 models', () => {
    expect(getResults()?.modelRuns).toEqual({ sizes: [200], count: 2 });
  });

  it('MS-5.3 modelRunsLine writes the content.md §7 line and never a model name', () => {
    expect(modelRunsLine({ sizes: [200], count: 1 })).toBe(
      'Model ranking has also been measured, on samples of 200 sentences with 1 model. Those numbers, with how often a reply would have come too late to use, are in the full results.',
    );
    expect(modelRunsLine({ sizes: [200], count: 2 })).toBe(
      'Model ranking has also been measured, on samples of 200 sentences with 2 models from one provider. Those numbers, with how often a reply would have come too late to use, are in the full results.',
    );
    expect(modelRunsLine({ sizes: [300, 200, 200], count: 2 })).toContain('on samples of 200 and 300 sentences with 2 models');
    expect(modelRunsLine({ sizes: [100, 300, 200], count: 3 })).toContain('on samples of 100, 200 and 300 sentences with 3 models');
    for (const m of [{ sizes: [200], count: 1 }, { sizes: [200, 300], count: 2 }]) {
      const line = modelRunsLine(m).toLowerCase();
      for (const id of MODEL_IDS) expect(line).not.toContain(id.toLowerCase());
      expect(line).not.toMatch(/minimax|claude|anthropic/);
    }
  });
});

describe('getDemoData (MS-6.2)', () => {
  it('MS-6.2 the finished words are "i need water", from the shipped dictionary', () => {
    const demo = getDemoData();
    expect(demo.fromDictionary).toBe(true);
    expect(demo.steps.at(-1)!.words).toEqual([...DEMO_WORDS]);
  });

  it('MS-6.2 every finished word of every step encodes to its code, and the word being typed starts with it', () => {
    for (const step of getDemoData().steps) {
      step.words.forEach((word, i) => {
        expect(word).not.toBeNull();
        const code = step.codes[i]!;
        const last = i === step.codes.length - 1;
        if (!last) expect(encodeWord(word!)).toBe(code);
        else expect(encodeWord(word!)!.startsWith(code)).toBe(true);
      });
    }
    const final = getDemoData().steps.at(-1)!;
    final.words.forEach((w, i) => expect(encodeWord(w!)).toBe(final.codes[i]));
  });
});

/** A small dictionary for the throw cases: v2 groups of [zipf x 10, space-separated words]. */
const fakeDictionary = (words: [number, string][]): SiteDictionary => {
  const lexicon = Lexicon.fromJSON({ v: 2, lang: 'en', source: 'test', license: 'test', words });
  return { lexicon, lm: unigramModel(lexicon) };
};

describe('getHowData, getSpellExample and getProofExample (MS-7.6, MS-7.8, MS-7.9)', () => {
  it("MS-7.8 getHowData returns the decoder's well texts and top 3 for 4663 with home chosen", () => {
    const how = getHowData();
    expect(how.code).toBe('4663');
    expect(encodeWord('home')).toBe('4663');
    expect(encodeWord('good')).toBe('4663');
    expect(how.sentences.length).toBeGreaterThan(0);
    expect(how.sentences.length).toBeLessThanOrEqual(3);
    for (const s of how.sentences) expect(s.split(' ').map((w) => encodeWord(w))).toEqual(['4663']);
    expect(how.sentences[how.chosen]).toBe('home');
    expect(how.sentences).toContain('good');
    // Each well text is a word (or a completion) for that prefix, sentence-cased; the last is a whole word for 4663.
    expect(how.typing).toHaveLength(4);
    ['4', '46', '466', '4663'].forEach((prefix, i) => {
      const text = how.typing[i]!;
      expect(text[0]).toBe(text[0]!.toUpperCase());
      expect(encodeWord(text)!.startsWith(prefix)).toBe(true);
    });
    expect(encodeWord(how.typing[3])).toBe('4663');

    // No dictionary: digits only, no rows, nothing chosen.
    expect(getHowData(null)).toEqual({ code: '4663', typing: ['4', '4 6', '4 6 6', '4 6 6 3'], sentences: [], chosen: -1 });
  });

  it('MS-7.8 getHowData throws when home is not in the top 3', () => {
    expect(() => getHowData(fakeDictionary([[60, 'good gone hood'], [10, 'home']]))).toThrow(/top 3/);
    expect(() => getHowData(fakeDictionary([[60, 'good gone']]))).toThrow(/top 3/);
    expect(getHowData(fakeDictionary([[60, 'good home gone']])).chosen).toBe(1);
  });

  it('MS-7.8 getSpellExample is Mihai 64424 and throws when the dictionary has it', () => {
    expect(getSpellExample()).toEqual({ word: 'Mihai', code: '64424' });
    expect(getSpellExample(null)).toEqual({ word: 'Mihai', code: '64424' });
    expect(() => getSpellExample(fakeDictionary([[30, 'mihai']]))).toThrow(/Mihai/);
  });

  it('MS-7.9 proofSaidLine names the matches and the dropped word', () => {
    expect(proofSaidLine(getProofExample())).toBe('Can be spoken: water, waves. Never spoken: wafer.');
    expect(finishedKeys(getDemoData())).toBe('4 6333 92837');
  });

  it('MS-7.6 the proof example has matches equal to the keys and a dropped word that differs at diffAt', () => {
    const p = getProofExample();
    expect(p.keys).toBe(encodeWord('water'));
    expect(p.words.map((w) => w.word)).toEqual(['water', 'waves', 'wafer']);
    expect(p.matches.length).toBeGreaterThan(0);
    for (const m of p.matches) expect(encodeWord(m)).toBe(p.keys);
    expect(p.reject.word).toBe('wafer');
    expect(p.reject.code).toBe(encodeWord('wafer'));
    expect(p.reject.code).not.toBe(p.keys);
    expect(p.reject.code.slice(0, p.reject.diffAt)).toBe(p.keys.slice(0, p.reject.diffAt));
    expect(p.reject.code[p.reject.diffAt]).not.toBe(p.keys[p.reject.diffAt]);
  });
});
