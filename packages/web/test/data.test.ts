/**
 * Loading the offline dictionary fast (plan F9, web-ui Req 23): parallel fetches, the compact
 * lexicon, content-hashed URLs, and the idle warm-up.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Lexicon, type LexiconFileV2 } from '@ninth/core';
import { DATA_FILES, DATA_PATHS, dataUrl, loadDictionary, warmDictionary, whenIdle, type DictState } from '@/lib/data';

const LEX: LexiconFileV2 = { v: 2, lang: 'en', source: 't', license: 'CC-BY-SA-4.0', words: [[62, 'good in i need'], [58, 'home water'], [40, 'gone']] };
const BIGRAM = { v: 1, lang: 'en', source: 't', license: 'CC-BY-SA-4.0', bos: '<s>', logp: { '<s>': { i: -0.5 } }, backoff: {} };
const PACK = { id: 'core-en', lang: 'en', version: 1, words: [{ w: 'mihai', boost: 1 }], phrases: ['Hello.'] };

type Res = { ok: boolean; status: number; json(): Promise<unknown> };
const ok = (body: unknown): Res => ({ ok: true, status: 200, json: async () => body });
const status = (n: number): Res => ({ ok: false, status: n, json: async () => ({}) });

/** A fetch whose responses are released by hand, recording when each request went out. */
function gatedFetch(bodies: Record<string, Res | Error>) {
  const asked: string[] = [];
  const gates: (() => void)[] = [];
  const fetchImpl = (url: string) => {
    asked.push(url);
    return new Promise<Res>((resolve, reject) => {
      gates.push(() => {
        const r = bodies[url];
        if (r instanceof Error) reject(r);
        else resolve(r ?? status(404));
      });
    });
  };
  return { fetchImpl, asked, release: () => gates.splice(0).forEach((g) => g()) };
}
const all = (over: Partial<Record<keyof typeof DATA_PATHS, Res | Error>> = {}) => ({
  [DATA_PATHS.lexicon]: over.lexicon ?? ok(LEX),
  [DATA_PATHS.bigram]: over.bigram ?? ok(BIGRAM),
  [DATA_PATHS.pack]: over.pack ?? ok(PACK),
});

afterEach(() => vi.restoreAllMocks());

describe('dictionary loading (plan F9, web-ui Req 23)', () => {
  it('Req 23.1: the lexicon, bigram model and pack are all requested before any of them arrives', async () => {
    const f = gatedFetch(all());
    const p = loadDictionary(f.fetchImpl, { warm: false });
    await Promise.resolve();
    expect(new Set(f.asked)).toEqual(new Set([DATA_PATHS.lexicon, DATA_PATHS.bigram, DATA_PATHS.pack]));
    f.release();
    const d = await p;
    expect(d.status).toBe('ready');
    if (d.status !== 'ready') return;
    expect(d.model).toBe('bigram');
    expect(d.lexicon.has('mihai')).toBe(true); // the pack was applied
    expect(d.lexicon.lookup('4663')).toEqual(['good', 'home', 'gone']);
  });

  it('Req 23.2: the app ships the compact v2 lexicon, and the old export names still work', () => {
    expect(DATA_FILES.lexicon).toBe('/data/lexicon/en.v2.json');
    expect(Object.keys(DATA_PATHS).sort()).toEqual(['bigram', 'lexicon', 'pack']);
    // No build hash in tests: the URL is the plain path.
    expect(DATA_PATHS.lexicon).toBe(dataUrl(DATA_FILES.lexicon));
    expect(dataUrl('/data/x.json')).toBe('/data/x.json');
  });

  it('Req 23.1: a missing or failed lexicon reads as missing; a failed pack or bigram file does not stop loading', async () => {
    const run = async (over: Parameters<typeof all>[0]) => {
      const f = gatedFetch(all(over));
      const p = loadDictionary(f.fetchImpl, { warm: false });
      await Promise.resolve();
      f.release();
      return p;
    };
    expect((await run({ lexicon: status(404) })).status).toBe('missing');
    expect((await run({ lexicon: new Error('offline') })).status).toBe('missing');
    expect((await run({ lexicon: status(500) })).status).toBe('missing');
    expect((await run({ lexicon: ok({ v: 9 }) })).status).toBe('error');
    const d = await run({ pack: new Error('offline'), bigram: status(500) });
    expect(d.status).toBe('ready');
    if (d.status === 'ready') {
      expect(d.model).toBe('unigram');
      expect(d.pack).toBeNull();
    }
  });

  it('Req 23.3: warming builds the completion index first, then warms decoding and each key, one idle slice per step', () => {
    const lexicon = Lexicon.fromJSON(LEX);
    const prepare = vi.spyOn(lexicon, 'prepare');
    const completions = vi.spyOn(lexicon, 'completions');
    const queue: (() => void)[] = [];
    const state: DictState = { status: 'ready', lexicon, lm: { logP: () => -1 }, model: 'unigram', pack: null };
    warmDictionary(state, (fn) => queue.push(fn));
    expect(prepare).not.toHaveBeenCalled(); // nothing runs until the browser is idle
    queue.shift()!();
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(completions).not.toHaveBeenCalled();
    let slices = 1;
    while (queue.length) {
      expect(queue).toHaveLength(1); // one step at a time
      queue.shift()!();
      slices++;
    }
    expect(slices).toBe(2 + 8);
    expect(completions.mock.calls.map(([p]) => p)).toEqual(['2', '3', '4', '5', '6', '7', '8', '9']);
    warmDictionary({ status: 'missing' }, (fn) => queue.push(fn));
    expect(queue).toHaveLength(0);
  });

  it('Req 23.3: whenIdle uses requestIdleCallback when present and a timeout otherwise', () => {
    vi.useFakeTimers();
    try {
      const ric = vi.fn((cb: () => void) => (cb(), 1));
      vi.stubGlobal('requestIdleCallback', ric);
      const a = vi.fn();
      whenIdle(a);
      expect(ric).toHaveBeenCalled();
      expect(a).toHaveBeenCalledTimes(1);
      vi.unstubAllGlobals();
      vi.stubGlobal('requestIdleCallback', undefined);
      const b = vi.fn();
      whenIdle(b);
      expect(b).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(b).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });
});
