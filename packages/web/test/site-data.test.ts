// Build-time data for the website at / (marketing-site design.md "Build-time data"; MS-5, MS-6.2,
// MS-7.4, MS-7.6). The fixtures copy the real shape of packages/eval/RESULTS.llm.json: `runs` is an
// object keyed "<model>:<mode>", each with `subset.items` and a `configs` array.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { KEY_LETTERS, Lexicon, encodeWord, unigramModel, type Digit } from '@ninth/core';
import { describe, expect, it, vi } from 'vitest';
import {
  DEMO_WORDS,
  barShare,
  finishedKeys,
  getDemoData,
  getHowData,
  getProofExample,
  getResults,
  getSpellExample,
  modelRunsLine,
  modelStatus,
  pressExample,
  proofCanLine,
  proofNeverLine,
  scanMarks,
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
  it('MS-5.4 bySource is B1 right-sentence-first and item count per test source (RESULTS.md "By source"), or null (round 3, round 4)', () => {
    const b1 = RESULTS.configs.find((c) => c.id === 'B1') as unknown as { bySource: Record<string, { top1: number; items: number }> };
    const { aac, turk } = b1.bySource;
    expect(getResults()!.bySource).toEqual({ aac: { top1: pct(aac!.top1), items: aac!.items }, turk: { top1: pct(turk!.top1), items: turk!.items } });
    // RESULTS.md "By source", B1 ghost rows: aac 566 items 88.7%, turk 300 items 79.7%.
    expect(getResults()!.bySource).toEqual({ aac: { top1: '88.7%', items: 566 }, turk: { top1: '79.7%', items: 300 } });
    const without = (drop: (b: Record<string, unknown>) => void) => {
      const copy = JSON.parse(JSON.stringify(RESULTS)) as { configs: Record<string, unknown>[] };
      drop(copy.configs.find((c) => c.id === 'B1')!);
      return getResults(reader({ 'RESULTS.json': copy }))!.bySource;
    };
    const source = (b: Record<string, unknown>, name: string) => (b.bySource as Record<string, Record<string, unknown>>)[name]!;
    expect(without((b) => delete b.bySource)).toBeNull();
    expect(without((b) => delete (b.bySource as Record<string, unknown>).turk)).toBeNull();
    expect(without((b) => (source(b, 'aac').top1 = 'high'))).toBeNull();
    expect(without((b) => (source(b, 'turk').items = 0))).toBeNull();
    expect(without((b) => delete source(b, 'aac').items)).toBeNull();
  });

  it('MS-5.1 formats B0 and B1 of RESULTS.json with one decimal (round 4: B0 word accuracy, words, presses per character)', () => {
    const r = getResults();
    const b0 = RESULTS.configs.find((c) => c.id === 'B0')!.metrics!;
    const b1 = RESULTS.configs.find((c) => c.id === 'B1')!.metrics!;
    expect(r).not.toBeNull();
    expect(r!.items).toBe(b1.items);
    expect(r!.words).toBe(b1.words);
    expect(r!.ghost).toEqual({
      wordAcc: pct(b1.wordAcc!),
      top1: pct(b1.top1!),
      top5: pct(b1.top5!),
      ksr: pct(b1.ksr!),
      scanStepsPerChar: b1.scanStepsPerChar!.toFixed(2),
      pressesPerChar: b1.pressesPerChar!.toFixed(2),
    });
    expect(r!.dict).toEqual({ top1: pct(b0.top1!), top5: pct(b0.top5!), wordAcc: pct(b0.wordAcc!) });
    // The figures as RESULTS.md prints them today: summary rows B1 and B0, the 866 items, "of 4890" words, and
    // "Letter-mode B1 needs 1.00 presses per character".
    expect([r!.items, r!.words, r!.ghost.top1, r!.ghost.top5, r!.ghost.wordAcc, r!.ghost.scanStepsPerChar, r!.ghost.pressesPerChar]).toEqual([
      866, 4890, '85.6%', '97.3%', '96.8%', '3.57', '1.00',
    ]);
    expect([r!.dict.top1, r!.dict.top5, r!.dict.wordAcc]).toEqual(['62.4%', '92.0%', '91.5%']);
  });

  it('MS-5.1 (round 4) words and presses per character are left out when RESULTS.json lacks them or they are invalid', () => {
    const withB1 = (patch: Record<string, unknown>) => ({
      configs: RESULTS.configs.map((c) => (c.id === 'B1' ? { ...c, metrics: { ...c.metrics, ...patch } } : c)),
    });
    for (const patch of [{ words: undefined, pressesPerChar: undefined }, { words: 0, pressesPerChar: 0 }, { words: 1.5, pressesPerChar: '1.00' }]) {
      const r = getResults(reader({ 'RESULTS.json': withB1(patch) }))!;
      expect(r.words).toBeNull();
      expect(r.ghost.pressesPerChar).toBeNull();
    }
  });

  it('MS-5.1 (round 4) a bar is as long as its printed value; the scan marks are the printed steps, whole and part', () => {
    expect(barShare('85.6%')).toBeCloseTo(0.856, 10);
    expect(barShare('62.4%')).toBeCloseTo(0.624, 10);
    expect([barShare('0.0%'), barShare('100.0%'), barShare('120%'), barShare('-5%'), barShare('n/a')]).toEqual([0, 1, 1, 0, 0]);
    expect(scanMarks('3.57')).toEqual([1, 1, 1, 0.57]);
    expect(scanMarks('3.00')).toEqual([1, 1, 1]);
    expect(scanMarks('0.40')).toEqual([0.4]);
    expect(scanMarks('12.5')).toHaveLength(8);
    expect([scanMarks('0'), scanMarks('n/a')]).toEqual([[], []]);
  });

  it('MS-7.8 (round 4) the presses figure is "home" over the keys that type it, one press per letter (encodeWord)', () => {
    expect(pressExample()).toEqual([
      ['h', '4'],
      ['o', '6'],
      ['m', '6'],
      ['e', '3'],
    ]);
    expect(pressExample().map(([, d]) => d).join('')).toBe(encodeWord('home'));
    expect(() => pressExample("don't")).toThrow(/one key per letter/);
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
    expect(r?.modelRuns).toEqual({ sizes: [150, 200], count: 2, provider: 'minimax', models: ['MiniMax-M3', 'MiniMax-M3.1-Flash'] });
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

  it('MS-5.3 reads the real RESULTS.llm.json: 200 sentences, 2 MiniMax models', () => {
    expect(getResults()?.modelRuns).toEqual({ sizes: [200], count: 2, provider: 'minimax', models: ['MiniMax-M3', 'MiniMax-M3.1-Flash'] });
  });

  it('MS-5.3 (round 3, R3-P7) modelRunsLine names the measured provider and models, and says whether the provider this build uses was measured', () => {
    const two = { sizes: [200], count: 2, provider: 'minimax' as const, models: ['MiniMax-M3.1-Flash', 'MiniMax-M3'] };
    expect(modelRunsLine(two, 'anthropic')).toBe(
      "Model ranking has also been measured, on samples of 200 sentences with 2 MiniMax models (MiniMax-M3 and MiniMax-M3.1-Flash). Those numbers, with how often a reply would have come too late to use, are in the full results. The app's model ranking uses Anthropic's Claude API, which has not been measured yet.",
    );
    expect(modelRunsLine(two, 'minimax')).toContain("The app's model ranking uses MiniMax's API, the provider measured here.");
    expect(modelRunsLine({ ...two, count: 1, models: ['MiniMax-M3'] }, 'anthropic')).toContain('on samples of 200 sentences with 1 MiniMax model (MiniMax-M3).');
    expect(modelRunsLine({ ...two, sizes: [300, 200, 200] }, 'anthropic')).toContain('on samples of 200 and 300 sentences with 2 MiniMax models');
    expect(modelRunsLine({ ...two, sizes: [100, 300, 200], count: 3, models: ['a', 'b', 'c'] }, 'anthropic')).toContain('on samples of 100, 200 and 300 sentences with 3 MiniMax models (a, b and c)');
    // The default build (no NEXT_PUBLIC_DECODE_PROVIDER) sends ranking to Anthropic, which RESULTS.md has not measured.
    expect(modelRunsLine(getResults()!.modelRuns!)).toContain("Anthropic's Claude API, which has not been measured yet.");
    // Still no model-run number: the only numbers are the sample sizes and the model count.
    expect(modelRunsLine(two, 'anthropic').replace(/MiniMax-M3(\.1)?/g, '').match(/\d+(\.\d+)?%?/g)).toEqual(['200', '2']);
  });

  it('MS-5.3 (round 4) modelStatus gives the status rows the same values as the model line', () => {
    const two = { sizes: [200, 200], count: 2, provider: 'minimax' as const, models: ['MiniMax-M3.1-Flash', 'MiniMax-M3'] };
    expect(modelStatus(two, 'anthropic')).toEqual({
      count: 2,
      company: 'MiniMax',
      models: ['MiniMax-M3', 'MiniMax-M3.1-Flash'],
      sizes: '200',
      service: "Anthropic's Claude API",
      serviceMeasured: false,
    });
    expect(modelStatus(two, 'minimax')).toMatchObject({ service: "MiniMax's API", serviceMeasured: true });
    expect(modelStatus({ ...two, sizes: [300, 200] }, 'anthropic').sizes).toBe('200 and 300');
    // The default build sends ranking to Anthropic, which RESULTS.md has not measured.
    expect(modelStatus(getResults()!.modelRuns!)).toMatchObject({ count: 2, company: 'MiniMax', sizes: '200', serviceMeasured: false });
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
  it("MS-7.8 getHowData returns the decoder's top 3 for 4663 with home chosen, as the app lists them", () => {
    const how = getHowData();
    expect(how.code).toBe('4663');
    expect(encodeWord('home')).toBe('4663');
    expect(encodeWord('good')).toBe('4663');
    expect(how.sentences.length).toBeGreaterThan(0);
    expect(how.sentences.length).toBeLessThanOrEqual(3);
    for (const s of how.sentences) expect(s.split(' ').map((w) => encodeWord(w))).toEqual(['4663']);
    expect(how.sentences[how.chosen]).toBe('home');
    expect(how.sentences).toContain('good');
    // Round 4 (2026-11-13): the labels are the same sentences in the app's sentence case; no well texts.
    expect(how.labels).toEqual(how.sentences.map((s) => s.replace(/^./, (c) => c.toUpperCase())));
    expect(how.labels[how.chosen]).toBe('Home');
    expect(Object.keys(how).sort()).toEqual(['chosen', 'code', 'labels', 'sentences']);

    // No dictionary: digits only, no rows, nothing chosen.
    expect(getHowData(null)).toEqual({ code: '4663', sentences: [], labels: [], chosen: -1 });
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

  it('MS-7.9 the closing lines name the matches, then the dropped word with both codes (round 4: one line per state)', () => {
    expect(proofCanLine(getProofExample())).toBe('Can be spoken: water, waves.');
    expect(proofNeverLine(getProofExample())).toBe('Never spoken: wafer. "wafer" is 92337. Your keys are 92837.');
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

  it('MS-7.6 the drawn keys carry the letters of KEY_LETTERS, and the dropped letter is not on the key pressed there (round 4)', () => {
    const p = getProofExample();
    expect(p.keyLetters).toEqual(p.keys.split('').map((d) => KEY_LETTERS[d as Digit].toUpperCase()));
    expect(p.keyLetters).toEqual(['WXYZ', 'ABC', 'TUV', 'DEF', 'PQRS']);
    for (const w of p.words) expect(w.word).toHaveLength(p.keys.length);
    expect(p.keyLetters[p.reject.diffAt]!.toLowerCase()).not.toContain(p.reject.word[p.reject.diffAt]);
    expect(p.reject.word[p.reject.diffAt]).toBe('f');
    expect(p.keyLetters[p.reject.diffAt]).toBe('TUV');
  });
});
