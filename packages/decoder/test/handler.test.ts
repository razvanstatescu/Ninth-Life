import { KEY_LETTERS, validate, type Digit } from '@ninth/core';
import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleDecode, maxTokensFor } from '../src/handler.js';
import { FakeLlmClient } from '../src/llm.js';
import type { QuotaStore } from '../src/quota.js';
import type { DecodeResponse } from '../src/schema.js';
import { makeDeps, META, oracleValid, requestFor } from './helpers.js';

const ok = (r: { status: number; json: unknown }) => {
  expect(r.status).toBe(200);
  return r.json as DecodeResponse;
};

describe('handleDecode: happy path', () => {
  it('returns validated LLM candidates first, then ghost beams, top k', async () => {
    const deps = makeDeps({ reply: '{"c":[["i","need","water"],["g","need","water"],["i","need","wine"]]}' });
    const body = requestFor('i need water', {
      lattice: [['i', 'g', 'h'], ['need'], ['water']],
      beams: [['h', 'need', 'water'], ['i', 'need', 'water']],
      k: 3,
      context: { partner: 'Can I get you anything?' },
    });
    const res = ok(await handleDecode(body, META, deps));
    expect(res.candidates.map((c) => c.words.join(' '))).toEqual(['i need water', 'g need water', 'h need water']);
    expect(res.candidates.map((c) => c.source)).toEqual(['llm', 'llm', 'ghost']);
    expect(res.candidates[0]!.text).toBe('I need water');
    expect(res.rejected).toBe(1); // "wine" does not match 92837
    expect(res.degraded).toBe(false);
    expect(res.model).toBe('fake');
  });

  it('marks words outside the lattice as oov (amber) but keeps them when they match the keys', async () => {
    const deps = makeDeps({ reply: '{"c":[["ask","mira"]]}' });
    const res = ok(await handleDecode(requestFor('ask mira', { lattice: [['ask'], []] }), META, deps));
    expect(res.candidates[0]).toMatchObject({ words: ['ask', 'mira'], oov: ['mira'], valid: true });
  });

  it('dedupes and normalizes model output (case, accents) before validating', async () => {
    const deps = makeDeps({ reply: '{"c":[["I","Need","Wáter"],["i","need","water"]]}' });
    const res = ok(await handleDecode(requestFor('i need water'), META, deps));
    expect(res.candidates.filter((c) => c.source === 'llm')).toHaveLength(1);
    expect(res.candidates[0]!.words).toEqual(['i', 'need', 'water']);
  });

  it('drops client lattice words and beams that do not match the keys before prompting', async () => {
    const deps = makeDeps({ reply: '{"c":[]}' });
    const body = requestFor('i need water', { lattice: [['i', 'zzz'], ['need'], ['water']], beams: [['you', 'need', 'water']] });
    const res = ok(await handleDecode(body, META, deps));
    expect(deps.fake!.calls[0]!.user).not.toContain('zzz');
    expect(deps.fake!.calls[0]!.user).not.toContain('you need water');
    expect(res.candidates).toEqual([]);
    expect(res.degraded).toBe(true);
  });

  it('accepts a raw JSON string body', async () => {
    const deps = makeDeps({ reply: '{"c":[["i"]]}' });
    const res = ok(await handleDecode(JSON.stringify(requestFor('i')), META, deps));
    expect(res.candidates[0]!.words).toEqual(['i']);
  });

  it('initials mode validates first letters only', async () => {
    const deps = makeDeps({ reply: '{"c":[["i","need","water"],["it","not","with"],["i","need","xx"]]}' });
    const body = { v: 1, lang: 'en', mode: 'initials', codes: ['4', '6', '9'], lattice: [['i'], ['need'], ['water']], k: 5 };
    const res = ok(await handleDecode(body, META, deps));
    expect(res.candidates.map((c) => c.words.join(' '))).toEqual(['i need water', 'it not with', 'i need xx']);
    for (const c of res.candidates) expect(validate(c.words, ['4', '6', '9'], 'initials')).toBe(true);
  });

  it('records the estimated cost against the daily dollar cap', async () => {
    const deps = makeDeps({ reply: { text: '{"c":[["i"]]}', usage: { inputTokens: 900, outputTokens: 100 } } });
    const spy = vi.spyOn(deps.quotaStore, 'recordCost');
    await handleDecode(requestFor('i'), META, deps);
    expect(spy).toHaveBeenCalledWith(expect.any(Number), 1000);
  });
});

describe('handleDecode: errors and limits', () => {
  it('400 on schema errors, without echoing values', async () => {
    const deps = makeDeps();
    const r = await handleDecode({ v: 1, lang: 'en', codes: ['12'], lattice: [['secretword']] }, META, deps);
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.json)).not.toContain('secretword');
    expect(deps.fake!.calls).toHaveLength(0);
  });

  it('413 for bodies over 4 KB', async () => {
    const deps = makeDeps();
    const big = requestFor('i', { context: { partner: 'x'.repeat(200), recent: ['y'.repeat(280), 'y'.repeat(280), 'y'.repeat(280)] } });
    const r = await handleDecode(JSON.stringify(big).padEnd(5000, ' '), META, deps);
    expect(r.status).toBe(413);
  });

  it('503 llm_disabled when the kill switch is off; no quota used, no LLM call', async () => {
    const deps = makeDeps({ enabled: false });
    const spy = vi.spyOn(deps.quotaStore, 'consume');
    const r = await handleDecode(requestFor('i need water'), META, deps);
    expect(r.status).toBe(503);
    expect(r.json).toEqual({ error: 'llm_disabled', reason: 'kill_switch' });
    expect(spy).not.toHaveBeenCalled();
    expect(deps.fake!.calls).toHaveLength(0);
  });

  it('429 with retryAfter and Retry-After after 30 requests in a minute', async () => {
    const deps = makeDeps({ reply: '{"c":[]}' });
    for (let i = 0; i < 30; i++) expect((await handleDecode(requestFor('i'), META, deps)).status).toBe(200);
    const r = await handleDecode(requestFor('i'), META, deps);
    expect(r.status).toBe(429);
    expect(r.json).toEqual({ error: 'rate_limited', retryAfter: 60 });
    expect(r.headers?.['retry-after']).toBe('60');
    expect(deps.fake!.calls).toHaveLength(30);
  });

  it('503 daily_cap when the global cap is reached', async () => {
    const deps = makeDeps({ limits: { globalPerDay: 1 } });
    expect((await handleDecode(requestFor('i'), META, deps)).status).toBe(200);
    const r = await handleDecode(requestFor('i'), { ipHash: 'other' }, deps);
    expect(r.status).toBe(503);
    expect(r.json).toEqual({ error: 'llm_disabled', reason: 'daily_cap' });
  });

  it('503 unavailable when the quota store fails (fail closed)', async () => {
    const broken: QuotaStore = {
      consume: async () => {
        throw new Error('dynamo down');
      },
      recordCost: async () => {},
    };
    const deps = makeDeps({ quota: broken });
    const r = await handleDecode(requestFor('i'), META, deps);
    expect(r.status).toBe(503);
    expect(deps.fake!.calls).toHaveLength(0);
  });
});

describe('handleDecode: graceful fallback to ghost (DS-2)', () => {
  const body = requestFor('i need water', { beams: [['i', 'need', 'water'], ['h', 'need', 'water']], k: 5 });

  it('timeout -> 200, ghost beams, degraded, and a cost reservation', async () => {
    const deps = makeDeps({ reply: { text: '{"c":[["i","need","water"]]}', delayMs: 300 }, timeoutMs: 20 });
    const spy = vi.spyOn(deps.quotaStore, 'recordCost');
    const t = Date.now();
    const res = ok(await handleDecode(body, META, deps));
    expect(Date.now() - t).toBeLessThan(250);
    expect(res).toMatchObject({ degraded: true, model: 'ghost', rejected: 0 });
    expect(res.candidates.map((c) => c.source)).toEqual(['ghost', 'ghost']);
    expect(spy.mock.calls[0]![1]).toBeGreaterThan(0);
    expect(deps.logs.at(-1)!.outcome).toBe('degraded_timeout');
  });

  it('default deadline is below the 1,500 ms client timeout', async () => {
    const { DEFAULT_TIMEOUT_MS } = await import('../src/handler.js');
    expect(DEFAULT_TIMEOUT_MS).toBeLessThan(1500);
  });

  it('LLM error -> ghost', async () => {
    const deps = makeDeps({ reply: { error: new Error('ThrottlingException') } });
    const res = ok(await handleDecode(body, META, deps));
    expect(res.degraded).toBe(true);
    expect(res.candidates).toHaveLength(2);
  });

  it('unparseable reply -> ghost', async () => {
    const deps = makeDeps({ reply: 'I think you mean: I need water' });
    const res = ok(await handleDecode(body, META, deps));
    expect(res.degraded).toBe(true);
    expect(deps.logs.at(-1)!.outcome).toBe('degraded_parse');
  });

  it('all candidates rejected -> ghost beams, rejected counted', async () => {
    const deps = makeDeps({ reply: '{"c":[["you","want","wine"],["i","need"]]}' });
    const res = ok(await handleDecode(body, META, deps));
    expect(res).toMatchObject({ degraded: true, rejected: 2 });
    expect(res.candidates.every((c) => c.source === 'ghost')).toBe(true);
  });
});

describe('maxTokensFor', () => {
  it('is 120 for short inputs and capped at 400', () => {
    expect(maxTokensFor(3, 5)).toBe(120);
    expect(maxTokensFor(20, 5)).toBe(400);
  });
});

// ---------------------------------------------------------------------------------------------
// Properties

const digit = fc.constantFrom<Digit>('2', '3', '4', '5', '6', '7', '8', '9');
const codeArb = fc.array(digit, { minLength: 1, maxLength: 7 }).map((d) => d.join(''));
const codesArb = fc.array(codeArb, { minLength: 1, maxLength: 6 });

/** A word that really encodes to `code` (a letter chosen per key), possibly with case/accents. */
const wordFor = (code: string) =>
  fc
    .tuple(
      fc.array(fc.nat(3), { minLength: code.length, maxLength: code.length }),
      fc.constantFrom('plain', 'upper', 'apostrophe'),
    )
    .map(([picks, style]) => {
      let w = [...code].map((d, i) => {
        const letters = KEY_LETTERS[d as Digit];
        return letters[picks[i]! % letters.length]!;
      }).join('');
      if (style === 'upper') w = w.toUpperCase();
      if (style === 'apostrophe' && w.length > 1) w = `${w[0]}'${w.slice(1)}`;
      return w;
    });

/** Arbitrary junk words: random unicode, digits, spaces, look-alikes, empty. */
const junkWord = fc.oneof(
  fc.string({ maxLength: 8 }),
  fc.string({ unit: 'binary', maxLength: 6 }),
  fc.constantFrom('', ' ', '0', '1', 'w​ater', 'ｗater', '<script>', '"', '\\', 'wa̶ter'),
);

const candidateFor = (codes: string[]) =>
  fc.oneof(
    { weight: 3, arbitrary: fc.tuple(...codes.map((c) => wordFor(c))) },
    { weight: 2, arbitrary: fc.tuple(...codes.map((c) => fc.oneof(wordFor(c), junkWord))) },
    { weight: 1, arbitrary: fc.array(fc.oneof(junkWord, fc.lorem({ maxCount: 1 })), { maxLength: codes.length + 2 }) },
  );

const llmTextFor = (codes: string[]) =>
  fc.oneof(
    { weight: 4, arbitrary: fc.array(candidateFor(codes), { maxLength: 8 }).map((c) => JSON.stringify({ c })) },
    {
      weight: 1,
      arbitrary: fc
        .tuple(fc.array(candidateFor(codes), { maxLength: 5 }), fc.nat())
        .map(([c, cut]) => {
          const s = JSON.stringify({ c });
          return s.slice(0, cut % (s.length + 1)); // truncated output
        }),
    },
    { weight: 1, arbitrary: fc.string() },
    { weight: 1, arbitrary: fc.json() },
  );

describe('properties', () => {
  afterEach(() => vi.restoreAllMocks());

  it('DS-1 soundness: for any fake-LLM output and any client beams, every returned candidate validates against the codes', async () => {
    let runs = 0;
    let refused = 0;
    let llmReturned = 0;
    let rejectedSeen = 0;
    await fc.assert(
      fc.asyncProperty(
        codesArb.chain((codes) =>
          fc.record({
            codes: fc.constant(codes),
            text: llmTextFor(codes),
            beams: fc.array(candidateFor(codes), { maxLength: 4 }),
            k: fc.integer({ min: 1, max: 5 }),
          }),
        ),
        async ({ codes, text, beams, k }) => {
          const deps = makeDeps({ reply: text });
          const body = { v: 1, lang: 'en', mode: 'letter', codes, lattice: codes.map(() => []), beams, k };
          const r = await handleDecode(body, META, deps);
          runs++;
          if (r.status === 400) return void refused++; // e.g. an empty beam word: refused before the LLM
          const res = ok(r);
          if (res.candidates.some((c) => c.source === 'llm')) llmReturned++;
          if (res.rejected > 0) rejectedSeen++;
          expect(res.candidates.length).toBeLessThanOrEqual(k);
          const keys = new Set<string>();
          for (const c of res.candidates) {
            expect(validate(c.words, codes, 'letter')).toBe(true); // core validator
            expect(oracleValid(c.words, codes, 'letter')).toBe(true); // independent oracle
            expect(c.valid).toBe(true);
            keys.add(c.words.join(' '));
          }
          expect(keys.size).toBe(res.candidates.length); // no duplicates
        },
      ),
      { numRuns: 300 },
    );
    // Guard against a vacuous pass: the generator must exercise both acceptance and rejection.
    expect(refused).toBeLessThan(runs / 2);
    expect(llmReturned).toBeGreaterThan(runs / 4);
    expect(rejectedSeen).toBeGreaterThan(runs / 10);
  });

  it('DS-1 soundness in initials mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(digit, { minLength: 1, maxLength: 6 }).chain((codes) =>
          fc.record({ codes: fc.constant(codes as string[]), text: llmTextFor(codes) }),
        ),
        async ({ codes, text }) => {
          const deps = makeDeps({ reply: text });
          const body = { v: 1, lang: 'en', mode: 'initials', codes, lattice: codes.map(() => []), k: 5 };
          const res = ok(await handleDecode(body, META, deps));
          for (const c of res.candidates) {
            expect(validate(c.words, codes, 'initials')).toBe(true);
            expect(oracleValid(c.words, codes, 'initials')).toBe(true);
          }
        },
      ),
      { numRuns: 150 },
    );
  });

  it('DS-6 privacy: nothing printed or logged contains request text, words or codes', async () => {
    const printed: string[] = [];
    for (const m of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      vi.spyOn(console, m).mockImplementation((...args: unknown[]) => {
        printed.push(args.map(String).join(' '));
      });
    }
    const marker = fc.stringMatching(/^[a-z]{6,12}$/).map((s) => `zq${s}`); // unlikely in metrics
    await fc.assert(
      fc.asyncProperty(
        marker,
        marker,
        fc.constantFrom<('ok' | 'timeout' | 'error' | 'garbage' | 'disabled' | 'bad')[]>('ok', 'timeout', 'error', 'garbage', 'disabled', 'bad'),
        async (partner, word, path) => {
          printed.length = 0;
          const replies = {
            ok: `{"c":[["${word}"]]}`,
            timeout: { text: '{"c":[]}', delayMs: 50 },
            error: { error: new Error(`failed on ${partner} ${word}`) },
            garbage: `${partner} ${word}`,
            disabled: '{"c":[]}',
            bad: '{"c":[]}',
          } as const;
          const deps = makeDeps({ reply: replies[path], enabled: path !== 'disabled', timeoutMs: 10 });
          deps.options = { timeoutMs: 10 }; // default console logger, captured above
          const body =
            path === 'bad'
              ? { v: 1, lang: 'en', codes: [word], lattice: [[partner]] }
              : { v: 1, lang: 'en', codes: ['2'], lattice: [[word]], beams: [[word]], context: { partner, recent: [partner] } };
          await handleDecode(body, META, deps);
          expect(printed.length).toBeGreaterThan(0);
          for (const line of printed) {
            expect(line).not.toContain(partner);
            expect(line).not.toContain(word);
            expect(line).not.toContain(META.ipHash);
            // Only the fixed metrics vocabulary.
            const obj = JSON.parse(line) as Record<string, unknown>;
            for (const [k, v] of Object.entries(obj)) {
              if (typeof v === 'string') expect(['event', 'outcome', 'model', 'errorName']).toContain(k);
            }
          }
        },
      ),
      { numRuns: 60 },
    );
  });
});

describe('FakeLlmClient', () => {
  it('honours abort', async () => {
    const f = new FakeLlmClient({ text: 'x', delayMs: 1000 });
    const ac = new AbortController();
    const p = f.complete({ system: '', user: '' }, { maxTokens: 1, signal: ac.signal });
    ac.abort(new Error('stop'));
    await expect(p).rejects.toThrow('stop');
  });
});
