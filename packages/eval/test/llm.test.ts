/** Model runs B2-B4 and initials mode without a key (spec eval-harness Req 8 and 9). No test calls the API. */
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bigramModel, encodeWord, Lexicon, validate, type LexiconFile } from '@ninth/core';
import { MODEL_PROFILES, costMicros } from '@ninth/decoder';
import { addRecord, emptyStats, planCalls, unconstrainedPrompt } from '../src/llm/configs';
import { llmMain, parseLlmArgs } from '../src/llm/cli';
import { fakeMessagesApi } from '../src/llm/fake-api';
import { llmSections, upsertSection, withLlmSections } from '../src/llm/report';
import { ApiTransport, requestKey, ResponseCache } from '../src/llm/transport';
import { loadBigramFile, loadFixture, loadLexiconFile } from '../src/fixture';
import { latticeCoverage, mapPool, runEval } from '../src/run';
import { codesFor, simulate } from '../src/simulate';
import type { TestItem } from '../src/types';

const tmp = () => mkdtempSync(join(tmpdir(), 'ninth-llm-'));
const noSleep = async () => {};
const okBody = (text = '{"c":[["i","need"]]}') => ({
  content: [{ type: 'text', text }],
  stop_reason: 'end_turn',
  usage: { input_tokens: 300, output_tokens: 20, cache_read_input_tokens: 1000, cache_creation_input_tokens: 0 },
});
const json = (b: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(b), { status, headers });
const init = (body: string, key = 'sk-test') => ({ method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2026-10-21' }, body });

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? filesUnder(p) : [p];
  });
}

describe('response cache and transport (Req 8.2, 8.3)', () => {
  it('Req 8.2 sends a request once, then answers it from the cache on disk, keyed by version + URL + body only', async () => {
    const dir = tmp();
    let calls = 0;
    const t = new ApiTransport({ network: async () => (calls++, json(okBody())), cache: new ResponseCache(dir), sleep: noSleep });
    const records: unknown[] = [];
    const f = t.fetchFor((r) => records.push(r));
    const a = await (await f('https://api.example/v1/messages', init('{"model":"m"}', 'sk-first'))).json();
    const b = await (await f('https://api.example/v1/messages', init('{"model":"m"}', 'sk-second'))).json();
    expect(calls).toBe(1);
    expect(a).toEqual(b);
    expect(records.map((r) => (r as { cached: boolean }).cached)).toEqual([false, true]);
    const key = requestKey('https://api.example/v1/messages', '2026-10-21', '{"model":"m"}');
    expect(existsSync(join(dir, `${key}.json`))).toBe(true);
    expect(requestKey('u', 'v', '{"model":"n"}')).not.toBe(requestKey('u', 'v', '{"model":"m"}'));
    expect(requestKey('u', 'v2', '{"model":"m"}')).not.toBe(requestKey('u', 'v', '{"model":"m"}'));
    for (const p of filesUnder(dir)) expect(readFileSync(p, 'utf8')).not.toMatch(/sk-first|sk-second/);
  });

  it('Req 8.3 retries 429 and 529 with backoff (retry-after first), then succeeds', async () => {
    const replies = [json({}, 429, { 'retry-after': '2' }), json({}, 529), json({}, 503), json(okBody())];
    const waits: number[] = [];
    const t = new ApiTransport({ network: async () => replies.shift()!, cache: new ResponseCache(), sleep: async (ms) => void waits.push(ms) });
    let rec: { attempts: number } | undefined;
    const res = await t.fetchFor((r) => (rec = r))('u', init('{}'));
    expect(res.status).toBe(200);
    expect(waits).toEqual([2000, 2000, 4000]);
    expect(rec!.attempts).toBe(4);
    expect(t.retries).toBe(3);
    expect(t.fatal).toBeUndefined();
  });

  it('keeps the default sleep when the caller passes sleep: undefined (the CLI does)', async () => {
    const replies = [json({}, 529), json(okBody())];
    const t = new ApiTransport({ network: async () => replies.shift()!, cache: new ResponseCache(), sleep: undefined, baseDelayMs: 1, maxDelayMs: 1 });
    const res = await t.fetchFor(() => {})('u', init('{}'));
    expect(res.status).toBe(200);
    expect(t.retries).toBe(1);
  });

  it('Req 8.3 gives up after the last attempt and stops all further calls', async () => {
    let calls = 0;
    const t = new ApiTransport({ network: async () => (calls++, json({}, 529)), cache: new ResponseCache(), sleep: noSleep, maxAttempts: 3 });
    const res = await t.fetchFor(() => {})('u', init('{}'));
    expect(res.status).toBe(529);
    expect(calls).toBe(3);
    expect(t.fatal?.detail).toMatch(/gave up after 3/);
    await expect(t.fetchFor(() => {})('u', init('{"other":1}'))).rejects.toThrow(/fatal/);
  });

  it('Req 8.3 never retries a 400 and keeps only the error type and message', async () => {
    let calls = 0;
    const t = new ApiTransport({
      network: async () => (calls++, json({ type: 'error', error: { type: 'invalid_request_error', message: 'thinking.type: bad value' } }, 400)),
      cache: new ResponseCache(),
      sleep: noSleep,
    });
    const res = await t.fetchFor(() => {})('u', init('{}'));
    expect(res.status).toBe(400);
    expect(calls).toBe(1);
    expect(t.fatal).toEqual({ status: 400, detail: 'invalid_request_error: thinking.type: bad value', attempts: 1 });
  });

  it('Req 8.3 keeps at most `concurrency` requests in flight', async () => {
    let inFlight = 0;
    let peak = 0;
    const t = new ApiTransport({
      network: async () => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight--;
        return json(okBody());
      },
      cache: new ResponseCache(),
      concurrency: 4,
    });
    await mapPool([...Array(16).keys()], 16, (i) => t.fetchFor(() => {})('u', init(`{"n":${i}}`)));
    expect(peak).toBe(4);
    expect(t.peak).toBe(4);
  });

  it('Req 8.3 mapPool keeps input order', async () => {
    const out = await mapPool([30, 1, 20, 2], 3, async (ms, i) => {
      await new Promise((r) => setTimeout(r, ms));
      return i;
    });
    expect(out).toEqual([0, 1, 2, 3]);
  });
});

describe('cost and tokens (Req 8.4, 8.5)', () => {
  it('Req 8.4 prices each call from its usage at models.ts list prices', () => {
    const s = emptyStats();
    const p = MODEL_PROFILES['claude-haiku-5-5'];
    addRecord(s, { key: 'k', cached: true, latencyMs: 640, attempts: 1, response: okBody() }, p);
    expect(s).toMatchObject({ calls: 1, inputTokens: 300, outputTokens: 20, cacheReadTokens: 1000, latencyMs: [640] });
    expect(s.usdMicros).toBe(costMicros(p, { inputTokens: 300, outputTokens: 20, cacheReadTokens: 1000, cacheWriteTokens: 0 }));
  });

  it('Req 8.5 refuses to run above $1 without --yes, and sends nothing', async () => {
    const dir = tmp();
    let sent = 0;
    const net = fakeMessagesApi();
    const code = await llmMain(['--model', 'claude-haiku-4-5', '--cache-dir', dir, '--no-write'], {
      env: { ANTHROPIC_API_KEY: 'sk-test' },
      fetch: (async (u: string, i: RequestInit) => (sent++, net(u, i))) as typeof fetch,
      out: () => {},
      err: () => {},
    });
    expect(code).toBe(3);
    expect(sent).toBe(0);
  });

  it('Req 8.5 --plan prints the estimate and needs no key; a real run without a key exits 2', async () => {
    const lines: string[] = [];
    expect(await llmMain(['--plan', '--limit', '10', '--cache-dir', tmp()], { env: {}, out: (s) => void lines.push(s) })).toBe(0);
    expect(lines.join('')).toMatch(/Cost estimate for claude-haiku-5-5[\s\S]*20 requests|B2: 10 requests/);
    expect(await llmMain(['--limit', '10', '--cache-dir', tmp(), '--no-write'], { env: {}, out: () => {}, err: () => {} })).toBe(2);
  });
});

describe('B2-B4 end to end on the fake API (Req 3.5, 8.1, 8.6, 8.7, 8.8)', () => {
  it('Req 8.8 a dry run exercises B2-B4 and writes a marked section only where told to', async () => {
    const out = tmp();
    const cache = tmp();
    const lines: string[] = [];
    const code = await llmMain(['--dry-run', '--limit', '12', '--out', out, '--cache-dir', cache], { date: '2026-11-07', out: (s) => void lines.push(s), err: () => {} });
    expect(code).toBe(0);
    const md = readFileSync(join(out, 'RESULTS.md'), 'utf8');
    expect(md).toMatch(/<!-- llm-run:claude-haiku-5-5:letter -->\n## DRY RUN, fake Messages API \(not a measurement\): claude-haiku-5-5, letter mode, 12 items, 2026-11-07/);
    expect(md).toMatch(/\| B4 lattice\+val \|/);
    expect(md).toMatch(/<!-- \/llm-run:claude-haiku-5-5:letter -->/);
    const llm = readFileSync(join(out, 'RESULTS.llm.json'), 'utf8');
    expect(llm).not.toMatch(/2026-11-07|latency/i);
    const run = JSON.parse(llm).runs['claude-haiku-5-5:letter'];
    expect(run.configs.map((c: { id: string }) => c.id)).toEqual(['B0', 'B1', 'B2', 'B3', 'B4']);
    expect(run.configs.find((c: { id: string }) => c.id === 'B2').metrics.invalidPreValidator).toBeGreaterThan(0);
    // Per-item records: B3 and B4 never show a sentence that breaks the keys (P10).
    const items = readFileSync(join(cache, 'runs', 'dry-claude-haiku-5-5-letter-2026-11-07.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    const { items: fixture } = loadFixture();
    const byId = new Map(fixture.map((it) => [it.id, it]));
    for (const r of items.filter((x) => x.config === 'B3' || x.config === 'B4')) {
      for (const c of r.candidates as string[]) expect(validate(c.split(' '), byId.get(r.id)!.codes)).toBe(true);
    }
    expect(items.filter((x) => x.config === 'B4').every((x) => x.llm.calls + x.llm.skipped === 1)).toBe(true);
    expect(() => parseLlmArgs(['--dry-run', '--out', join(__dirname, '..')])).toThrow(/never writes into packages\/eval/);
  });

  it('Req 8.7 a real-mode run never writes the API key, and a rerun is free and identical', async () => {
    const out = tmp();
    const cache = tmp();
    let sent = 0;
    const net = fakeMessagesApi();
    const deps = {
      env: { ANTHROPIC_API_KEY: 'sk-ant-test-DO-NOT-STORE' },
      fetch: (async (u: string, i: RequestInit) => (sent++, net(u, i))) as typeof fetch,
      date: '2026-11-07',
      out: () => {},
      err: () => {},
    };
    const argv = ['--limit', '8', '--out', out, '--cache-dir', cache];
    expect(await llmMain(argv, deps)).toBe(0);
    const first = readFileSync(join(out, 'RESULTS.llm.json'));
    const sentFirst = sent;
    expect(sentFirst).toBeGreaterThan(0);
    expect(await llmMain(argv, deps)).toBe(0);
    expect(sent).toBe(sentFirst);
    expect(readFileSync(join(out, 'RESULTS.llm.json')).equals(first)).toBe(true);
    for (const p of [...filesUnder(out), ...filesUnder(cache)]) expect(readFileSync(p, 'utf8')).not.toMatch(/DO-NOT-STORE/);
  });

  it('Req 8.5 the plan predicts exactly the requests the run sends', async () => {
    const cacheDir = tmp();
    await llmMain(['--dry-run', '--limit', '6', '--cache-dir', cacheDir, '--no-write'], { out: () => {}, err: () => {} });
    const { items } = loadFixture();
    const lex = Lexicon.fromJSON(loadLexiconFile().data);
    const lm = bigramModel(loadBigramFile().data, lex);
    const { sample } = await import('../src/rng');
    const picked = sample(items, 6, 9);
    const plan = await planCalls(['B2', 'B3', 'B4'], picked.map((it) => ({ id: it.id, codes: it.codes, partner: it.partner })), 'letter', 5, { lex, lm, profile: MODEL_PROFILES['claude-haiku-5-5'] });
    const sent = new Set(new ResponseCache(join(cacheDir, 'fake')).entries().map((e) => e.key));
    expect(new Set(plan.map((p) => p.key))).toEqual(sent);
  });
});

describe('RESULTS.md sections (Req 8.6)', () => {
  const sec = (id: string, body: string) => `<!-- llm-run:${id} -->\n## ${body}\n<!-- /llm-run:${id} -->\n`;
  it('Req 8.6 a run replaces only its own section', () => {
    let md = '# Results\n\nOffline table\n';
    md = upsertSection(md, 'a:letter', sec('a:letter', 'A one'));
    md = upsertSection(md, 'b:letter', sec('b:letter', 'B one'));
    md = upsertSection(md, 'a:letter', sec('a:letter', 'A two'));
    expect(md).toBe(`# Results\n\nOffline table\n\n${sec('a:letter', 'A two')}\n${sec('b:letter', 'B one')}`);
  });

  it('Req 8.6 regenerating the offline report keeps every model section', () => {
    const old = `# Old\n\n${sec('a:letter', 'A')}\n${sec('a:initials', 'A ini')}`;
    const merged = withLlmSections('# New offline report\n', old);
    expect(merged.startsWith('# New offline report\n')).toBe(true);
    expect(llmSections(merged)).toEqual([sec('a:letter', 'A'), sec('a:initials', 'A ini')]);
  });
});

describe('initials mode (Req 9)', () => {
  const tiny: LexiconFile = {
    v: 1,
    lang: 'en',
    source: 'test',
    license: 'test',
    codes: { '4': [['i', 70], ['h', 50]], '6333': [['need', 55]], '92837': [['water', 52]], '9': [['we', 60]], '968': [['you', 69], ['wot', 20]] },
  };
  const lex = Lexicon.fromJSON(tiny);
  const item = (words: string[]): TestItem => ({ id: 't', src: 'aac', text: words.join(' '), words, codes: words.map((w) => encodeWord(w)!) });

  it('Req 9.1 one press per word plus spaces when the gold sentence is shown', () => {
    const it0 = item(['i', 'need', 'water']);
    expect(codesFor(it0, 'initials')).toEqual(['4', '6', '9']);
    const r = simulate(it0, { candidates: [['i', 'need', 'water']] }, lex, 5, 'initials');
    expect(r).toMatchObject({ rank: 0, presses: 3 + 2, selections: 0, retyped: 0 });
  });

  it('Req 9.1 a miss cycles the initials readings, or retypes the word in letter mode when it is not among them', () => {
    // Slot 3 (key 9) reads you, we, water (frequency order): "water" is two # away from "you".
    const r = simulate(item(['i', 'need', 'water']), { candidates: [['i', 'need', 'you']] }, lex, 5, 'initials');
    expect(r.presses).toBe(5 + 2);
    expect(r.retyped).toBe(0);
    const many: LexiconFile = { ...tiny, codes: { ...tiny.codes } };
    for (let i = 0; i < 12; i++) many.codes[`9${'2'.repeat(i + 1)}`] = [[`w${'a'.repeat(i + 1)}`, 65]];
    const big = Lexicon.fromJSON(many);
    const r2 = simulate(item(['i', 'need', 'water']), { candidates: [['i', 'need', 'you']] }, big, 5, 'initials');
    expect(r2.retyped).toBe(1);
    expect(r2.presses).toBe(5 + 5 + 0); // initials + spaces, then "92837" retyped; water is its code's first reading
  });

  it('Req 9.2 the offline run reports initials B0/B1 and the lattice ceiling', async () => {
    const { items, sha256 } = loadFixture();
    const input = { items, fixture: { path: 'fixtures/test.v1.jsonl', sha256 }, lexicon: loadLexiconFile(), bigram: loadBigramFile(), quick: true, seed: 9 };
    const ini = await runEval({ ...input, mode: 'initials', only: ['B0', 'B1'] });
    const b1 = ini.results.configs.find((c) => c.id === 'B1')!.metrics!;
    expect(b1.retypedWords).toBeGreaterThan(0);
    expect(b1.pressesPerChar).toBeGreaterThan(0);
    const letter = await runEval({ ...input, only: ['B1'] });
    expect(letter.results.configs[0]!.metrics!.retypedWords).toBeUndefined();
    const cov = latticeCoverage(ini.items, Lexicon.fromJSON(input.lexicon.data), 'initials');
    expect(cov.wordsInLattice).toBeLessThan(cov.words);
    expect(cov.itemsInLattice).toBeLessThanOrEqual(cov.items);
  });

  it('Req 9.3 B4-initials sends one-digit codes in initials mode through the shipping prompt', async () => {
    const { items } = loadFixture();
    const lexF = Lexicon.fromJSON(loadLexiconFile().data);
    const lm = bigramModel(loadBigramFile().data, lexF);
    const few = items.slice(0, 3).map((it) => ({ id: it.id, codes: codesFor(it, 'initials'), partner: it.partner }));
    const plan = await planCalls(['B4'], few, 'initials', 5, { lex: lexF, lm, profile: MODEL_PROFILES['claude-haiku-5-5'] });
    expect(plan).toHaveLength(3);
    for (const p of plan) {
      expect(p.prompt.user).toMatch(/^<mode>initials<\/mode>/);
      expect(p.prompt.user).toMatch(/^1 \[\d\]: /m);
    }
    expect(unconstrainedPrompt(['4', '6'], 'initials', 5).user).toMatch(/1 \[4\]: \(none listed\)/);
  });
});

describe('CI (Req 8.10)', () => {
  it('Req 8.10 the model job runs only on manual dispatch with a model chosen, and is off by default', () => {
    const wf = readFileSync(join(__dirname, '..', '..', '..', '.github', 'workflows', 'eval.yml'), 'utf8');
    const on = wf.slice(wf.indexOf('\non:'), wf.indexOf('\npermissions:'));
    expect(on).not.toMatch(/pull_request|push:/);
    expect(on).toMatch(/llm_model:[\s\S]*?default: none/);
    expect(on).toMatch(/llm_confirm_cost:[\s\S]*?default: false/);
    const job = wf.slice(wf.indexOf('\n  llm:'));
    expect(job).toMatch(/if: github\.event_name == 'workflow_dispatch' && github\.event\.inputs\.llm_model != 'none'/);
    expect(job).toMatch(/ANTHROPIC_API_KEY: \$\{\{ secrets\.ANTHROPIC_API_KEY \}\}/);
    // The key reaches only the two steps that need it, never the job env.
    expect(job.slice(0, job.indexOf('steps:'))).not.toMatch(/ANTHROPIC_API_KEY/);
  });
});

describe('prompt hygiene (Req 1.5, 8.1)', () => {
  it('Req 8.1 no few-shot answer in the decoder prompt is a test-set sentence', async () => {
    const { FEW_SHOTS } = await import('@ninth/decoder');
    const gold = new Set(loadFixture().items.map((it) => it.words.join(' ')));
    const answers = FEW_SHOTS.flatMap((ex) => ex.answer.map((a) => a.join(' ')));
    expect(answers.length).toBeGreaterThan(0);
    expect(answers.filter((a) => gold.has(a))).toEqual([]);
  });
});
