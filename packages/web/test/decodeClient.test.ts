import { afterEach, describe, expect, it, vi } from 'vitest';
import { DECODE_TIMEOUT_MS, DecodeCache, buildRequest, checkResponse, decodeRemote } from '@/lib/decodeClient';
import { miniDict } from './fixtures';

const { lexicon } = miniDict();
const codes = ['4', '6333', '92837'];
const lat = [['i'], ['need'], ['water', 'waves']];

afterEach(() => vi.useRealTimers());

describe('decode client', () => {
  it('builds a request within the contract limits', () => {
    const req = buildRequest(codes, lat, '  Can I get you anything?  ', 'letter', 5, [['i', 'need', 'water']])!;
    expect(req).toMatchObject({ v: 1, lang: 'en', mode: 'letter', codes, k: 5, context: { partner: 'Can I get you anything?', recent: [] } });
    expect(req.beams).toEqual([['i', 'need', 'water']]);
    expect(buildRequest([], [], undefined, 'letter')).toBeNull();
    expect(buildRequest(['1'], [[]], undefined, 'letter')).toBeNull();
    expect(buildRequest(Array(21).fill('2'), Array(21).fill([]), undefined, 'letter')).toBeNull();
    const big = buildRequest(['2'], [Array.from({ length: 12 }, () => 'x'.repeat(400))], 'p'.repeat(400), 'letter')!;
    expect(new TextEncoder().encode(JSON.stringify(big)).length).toBeLessThanOrEqual(4096);
    expect(big.context.partner).toHaveLength(280);
  });

  it('re-validates every suggestion; mismatches become rejected and never candidates', () => {
    const out = checkResponse(
      { v: 1, candidates: [{ words: ['i', 'need', 'waves'] }, { words: ['i', 'need', 'wafer'] }, { words: 'bad' }], rejected: 2 },
      codes,
      lexicon,
      'letter',
    )!;
    expect(out.candidates.map((c) => c.words.join(' '))).toEqual(['i need waves']);
    expect(out.candidates[0]?.source).toBe('llm');
    expect(out.rejected[0]?.proof[2]).toMatchObject({ word: 'wafer', code: '92337', state: 'reject' });
    expect(out.rejectedCount).toBe(2);
    expect(checkResponse({ error: 'x' }, codes, lexicon, 'letter')).toBeNull();
  });

  it('F7: shows server-rejected words (struck through), re-checked, never as candidates', () => {
    const out = checkResponse(
      {
        v: 1,
        candidates: [{ words: ['i', 'need', 'water'] }],
        rejected: 3,
        rejectedWords: [
          { slot: 2, word: 'wafer', expectedCode: '92837' },
          { slot: 2, word: 'wafer', expectedCode: '92837' }, // duplicate
          { slot: 2, word: 'water', expectedCode: '92837' }, // matches the keys: not a rejection
          { slot: 0, word: 'need', expectedCode: '4' }, // spoken in another slot: never struck through
          { slot: 9, word: 'zzz', expectedCode: '4' }, // no such slot
          { slot: 1, word: '<b>x</b>', expectedCode: '6333' }, // not a word
          { slot: 1, word: 'meeds', expectedCode: '9' }, // wrong code for the slot
        ],
      },
      codes,
      lexicon,
      'letter',
    )!;
    expect(out.candidates.map((c) => c.words.join(' '))).toEqual(['i need water']);
    expect(out.rejected).toHaveLength(1);
    expect(out.rejected[0]).toMatchObject({ words: ['wafer'], slot: 2, proof: [{ word: 'wafer', code: '92337', expected: '92837', state: 'reject' }] });
    expect(out.rejectedCount).toBe(3);
    // Older servers send no rejectedWords: nothing changes.
    expect(checkResponse({ v: 1, candidates: [], rejected: 1 }, codes, lexicon, 'letter')!.rejected).toEqual([]);
    // At most 5, and only a-z/apostrophe words of 16 characters or fewer.
    const many = Array.from({ length: 9 }, (_, i) => ({ slot: 2, word: `wafer${'s'.repeat(i)}`, expectedCode: '92837' }));
    const capped = checkResponse({ v: 1, candidates: [], rejected: 9, rejectedWords: many }, codes, lexicon, 'letter')!;
    expect(capped.rejected.map((r) => r.words[0])).toEqual(['wafer', 'wafers', 'waferss', 'wafersss', 'waferssss']);
    const long = checkResponse({ v: 1, candidates: [], rejected: 1, rejectedWords: [{ slot: 2, word: 'w'.repeat(17), expectedCode: '92837' }] }, codes, lexicon, 'letter')!;
    expect(long.rejected).toEqual([]);
  });

  it('falls back (null) after 1,500 ms', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(() => new Promise<Response>(() => undefined));
    const p = decodeRemote(buildRequest(codes, lat, undefined, 'letter')!, lexicon, { fetchImpl });
    await vi.advanceTimersByTimeAsync(DECODE_TIMEOUT_MS + 1);
    await expect(p).resolves.toBeNull();
  });

  it('falls back on non-200, errors and bad JSON', async () => {
    const req = buildRequest(codes, lat, undefined, 'letter')!;
    const res = (status: number, body: unknown) => async () => new Response(JSON.stringify(body), { status });
    await expect(decodeRemote(req, lexicon, { fetchImpl: res(503, { error: 'llm_disabled' }) })).resolves.toBeNull();
    await expect(decodeRemote(req, lexicon, { fetchImpl: res(429, { error: 'rate_limited' }) })).resolves.toBeNull();
    await expect(decodeRemote(req, lexicon, { fetchImpl: async () => Promise.reject(new Error('offline')) })).resolves.toBeNull();
    await expect(decodeRemote(req, lexicon, { fetchImpl: async () => new Response('nope', { status: 200 }) })).resolves.toBeNull();
    const ok = await decodeRemote(req, lexicon, { fetchImpl: res(200, { v: 1, candidates: [{ words: ['i', 'need', 'water'] }], rejected: 0 }) });
    expect(ok?.candidates).toHaveLength(1);
  });

  it('LRU cache keeps the newest entries', () => {
    const c = new DecodeCache(2);
    const r = { candidates: [], rejected: [], rejectedCount: 0, ms: 1 };
    c.set('a', r);
    c.set('b', r);
    c.get('a');
    c.set('c', r);
    expect(c.get('b')).toBeUndefined();
    expect(c.get('a')).toBe(r);
    expect(DecodeCache.key(['4'], ' hi ')).toBe('4|hi');
  });
});
