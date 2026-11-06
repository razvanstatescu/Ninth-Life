import { describe, expect, it } from 'vitest';
import { handleDecode } from '../src/handler.js';
import {
  ANTHROPIC_URL,
  ANTHROPIC_VERSION,
  AnthropicLlmClient,
  anthropicBody,
  LlmError,
  readAnthropic,
  shouldCache,
  type FetchLike,
} from '../src/llm.js';
import { costMicros, DEFAULT_MODEL, MODEL_PROFILES } from '../src/models.js';
import { SYSTEM_PROMPT } from '../src/prompt.js';
import { makeDeps, META, requestFor } from './helpers.js';

const prompt = { system: SYSTEM_PROMPT, user: 'USER' };
const KEY = 'test-key-not-real';

interface Call {
  url: string;
  init: RequestInit;
  body: Record<string, unknown>;
}

function mockFetch(respond: (c: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    const c = { url, init, body: JSON.parse(String(init.body)) as Record<string, unknown> };
    calls.push(c);
    return respond(c);
  };
  return { fetchImpl, calls };
}

const okJson = (text: string, usage: Record<string, number> = { input_tokens: 10, output_tokens: 3 }) =>
  new Response(JSON.stringify({ content: [{ type: 'text', text }], stop_reason: 'end_turn', usage }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

describe('models', () => {
  it('defaults to claude-haiku-5-5', () => {
    expect(DEFAULT_MODEL).toBe('claude-haiku-5-5');
    expect(new AnthropicLlmClient({ apiKey: KEY }).model).toBe('haiku-5.5');
    expect(new AnthropicLlmClient({ apiKey: KEY, model: 'claude-haiku-4-5' }).model).toBe('haiku-4.5');
  });

  it('estimates cost in micro-dollars at Anthropic list prices', () => {
    // Haiku 5.5: 1,100 in * $0.10/M + 100 out * $0.50/M = $0.00016
    expect(costMicros(MODEL_PROFILES['claude-haiku-5-5'], { inputTokens: 1100, outputTokens: 100 })).toBe(160);
    // Haiku 4.5: 900 in * $1/M + 100 out * $5/M = $0.0014
    expect(costMicros(MODEL_PROFILES['claude-haiku-4-5'], { inputTokens: 900, outputTokens: 100 })).toBe(1400);
  });

  it('refuses to start without a key', () => {
    expect(() => new AnthropicLlmClient({ apiKey: '' })).toThrow(LlmError);
  });
});

describe('request body (DS-8.5)', () => {
  it('never sends temperature, top_p or top_k (400 on API version 2026-10-21)', () => {
    for (const p of Object.values(MODEL_PROFILES)) {
      const b = anthropicBody(p, prompt, 120);
      for (const k of ['temperature', 'top_p', 'top_k']) expect(k in b).toBe(false);
    }
  });

  it('Haiku 5.5: thinking disabled, system prompt cached (min 512 tokens met)', () => {
    const p = MODEL_PROFILES['claude-haiku-5-5'];
    expect(shouldCache(p, SYSTEM_PROMPT)).toBe(true);
    expect(anthropicBody(p, prompt, 120)).toEqual({
      model: 'claude-haiku-5-5',
      max_tokens: 120,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: [{ type: 'text', text: 'USER' }] }],
      thinking: { type: 'disabled' },
    });
  });

  it('Haiku 4.5: no thinking field, no cache checkpoint (min 4,096 tokens not met)', () => {
    const p = MODEL_PROFILES['claude-haiku-4-5'];
    expect(shouldCache(p, SYSTEM_PROMPT)).toBe(false);
    const b = anthropicBody(p, prompt, 120);
    expect(b.thinking).toBeUndefined();
    expect(JSON.stringify(b)).not.toContain('cache_control');
    expect(b.model).toBe('claude-haiku-4-5');
  });

  it('caches on Haiku 4.5 only when the prompt reaches 4,096 tokens', () => {
    expect(shouldCache(MODEL_PROFILES['claude-haiku-4-5'], 'x'.repeat(4 * 4096))).toBe(true);
  });
});

describe('AnthropicLlmClient over fetch', () => {
  it('POSTs to the Messages API with x-api-key and anthropic-version, passing the abort signal', async () => {
    const { fetchImpl, calls } = mockFetch(() => okJson('{"c":[]}', { input_tokens: 1000, output_tokens: 20, cache_read_input_tokens: 900 }));
    const llm = new AnthropicLlmClient({ apiKey: KEY, fetch: fetchImpl });
    const ac = new AbortController();
    const r = await llm.complete(prompt, { maxTokens: 120, signal: ac.signal });
    expect(r.text).toBe('{"c":[]}');
    expect(r.usage).toEqual({ inputTokens: 1000, outputTokens: 20, cacheReadTokens: 900, cacheWriteTokens: 0 });
    expect(calls).toHaveLength(1);
    const c = calls[0]!;
    expect(c.url).toBe(ANTHROPIC_URL);
    expect(c.init.method).toBe('POST');
    expect(c.init.signal).toBe(ac.signal);
    const h = c.init.headers as Record<string, string>;
    expect(h['x-api-key']).toBe(KEY);
    expect(h['anthropic-version']).toBe(ANTHROPIC_VERSION);
    expect(ANTHROPIC_VERSION).toBe('2026-10-21');
    expect(h['content-type']).toBe('application/json');
    expect(c.body.model).toBe('claude-haiku-5-5');
    expect(c.body.max_tokens).toBe(120);
  });

  it.each([400, 401, 429, 500, 529])('maps HTTP %i to an LlmError with the status, never the body text', async (status) => {
    const { fetchImpl } = mockFetch(
      () => new Response(JSON.stringify({ type: 'error', error: { type: 'x', message: 'secret detail' } }), { status }),
    );
    const llm = new AnthropicLlmClient({ apiKey: KEY, fetch: fetchImpl });
    const err = await llm.complete(prompt, { maxTokens: 1, signal: new AbortController().signal }).catch((e) => e);
    expect(err).toBeInstanceOf(LlmError);
    expect(err.status).toBe(status);
    expect(String(err.message)).not.toContain('secret detail');
  });

  it('turns a refusal into an error', () => {
    expect(() => readAnthropic({ content: [], stop_reason: 'refusal' })).toThrow(LlmError);
  });

  it('reads text blocks by type (thinking blocks may come first)', () => {
    const r = readAnthropic({ content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: 'ok' }], usage: {} });
    expect(r.text).toBe('ok');
  });

  it('the handler deadline aborts a slow fetch and falls back to ghost (DS-2.1)', async () => {
    let aborted = false;
    const fetchImpl: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          aborted = true;
          reject(init.signal?.reason);
        });
      });
    const deps = makeDeps({ llm: new AnthropicLlmClient({ apiKey: KEY, fetch: fetchImpl }), timeoutMs: 30 });
    const body = requestFor('i need water', { beams: [['i', 'need', 'water']] });
    const t = Date.now();
    const r = await handleDecode(body, META, deps);
    expect(Date.now() - t).toBeLessThan(500);
    expect(aborted).toBe(true);
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ degraded: true, model: 'ghost' });
    expect(deps.logs.at(-1)).toMatchObject({ outcome: 'degraded_timeout' });
  });

  it('an upstream 529 is logged as a number and falls back to ghost', async () => {
    const { fetchImpl } = mockFetch(() => new Response('{}', { status: 529 }));
    const deps = makeDeps({ llm: new AnthropicLlmClient({ apiKey: KEY, fetch: fetchImpl }) });
    const r = await handleDecode(requestFor('i'), META, deps);
    expect(r.status).toBe(200);
    expect(deps.logs.at(-1)).toMatchObject({ outcome: 'degraded_error', upstreamStatus: 529, model: 'haiku-5.5' });
  });

  it('end to end: validated candidates come back from a mocked API reply', async () => {
    const { fetchImpl } = mockFetch(() => okJson('{"c":[["i","need","water"],["i","need","wine"]]}'));
    const deps = makeDeps({ llm: new AnthropicLlmClient({ apiKey: KEY, fetch: fetchImpl }) });
    const r = await handleDecode(requestFor('i need water'), META, deps);
    expect(r.json).toMatchObject({ rejected: 1, degraded: false, model: 'haiku-5.5' });
  });
});
