// MiniMax through its Anthropic-compatible Messages endpoint (ADR-002). No key and no network:
// every call goes to a mocked fetch.
import { describe, expect, it } from 'vitest';
import { configFromEnv, createFetchHandler, resolveModel, timeoutFromEnv } from '../src/adapters/fetch.js';
import { DEFAULT_TIMEOUT_MS } from '../src/handler.js';
import {
  ANTHROPIC_URL,
  AnthropicLlmClient,
  anthropicBody,
  MINIMAX_ANTHROPIC_VERSION,
  MINIMAX_BASE_URL,
  messagesUrl,
  type FetchLike,
} from '../src/llm.js';
import { costMicros, defaultModelFor, isModelId, MODEL_PROFILES } from '../src/models.js';
import { SYSTEM_PROMPT } from '../src/prompt.js';
import { requestFor } from './helpers.js';

const prompt = { system: SYSTEM_PROMPT, user: 'USER' };
const KEY = 'mm-test-key-not-real';
const HOST = 'ninth-life.example';

interface Call {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

function mockFetch(content: unknown[] = [{ type: 'text', text: '{"c":[["i","need","water"]]}' }]) {
  const calls: Call[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) as Record<string, unknown> });
    return new Response(JSON.stringify({ content, stop_reason: 'end_turn', usage: { input_tokens: 1000, output_tokens: 20 } }), { status: 200 });
  };
  return { fetchImpl, calls };
}

describe('MiniMax model profiles', () => {
  it('knows both MiniMax models and their provider', () => {
    expect(isModelId('MiniMax-M3')).toBe(true);
    expect(isModelId('MiniMax-M3.1-Flash')).toBe(true);
    expect(isModelId('minimax-m3')).toBe(false);
    expect(MODEL_PROFILES['MiniMax-M3'].provider).toBe('minimax');
    expect(MODEL_PROFILES['claude-haiku-5-5'].provider).toBe('anthropic');
  });

  it('prices MiniMax-M3 at $0.30 / $1.20 per MTok', () => {
    expect(costMicros(MODEL_PROFILES['MiniMax-M3'], { inputTokens: 1000, outputTokens: 100 })).toBe(420);
  });

  it('defaults to MiniMax-M3 only when MiniMax is the only key', () => {
    expect(defaultModelFor({ MINIMAX_API_KEY: 'k' })).toBe('MiniMax-M3');
    expect(defaultModelFor({ MINIMAX_API_KEY: 'k', ANTHROPIC_API_KEY: 'k' })).toBe('claude-haiku-5-5');
    expect(defaultModelFor({})).toBe('claude-haiku-5-5');
  });
});

describe('MiniMax request', () => {
  it('MiniMax-M3: thinking disabled, no cache checkpoint, no sampling parameters', () => {
    const body = anthropicBody(MODEL_PROFILES['MiniMax-M3'], prompt, 120);
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.max_tokens).toBe(120);
    expect(body.output_config).toBeUndefined();
    expect((body.system as Record<string, unknown>[])[0]!.cache_control).toBeUndefined();
    for (const p of ['temperature', 'top_p', 'top_k']) expect(body).not.toHaveProperty(p);
  });

  it('MiniMax-M3.1-Flash: no thinking field (disabled is a 400), effort low, thinking headroom', () => {
    const body = anthropicBody(MODEL_PROFILES['MiniMax-M3.1-Flash'], prompt, 120);
    expect(body).not.toHaveProperty('thinking');
    expect(body.output_config).toEqual({ effort: 'low' });
    expect(body.max_tokens).toBe(120 + 1024);
  });

  it('builds the Messages URL from a base, a trailing slash or a full URL', () => {
    expect(messagesUrl('minimax')).toBe('https://api.minimax.io/anthropic/v1/messages');
    expect(messagesUrl('minimax', 'https://eu.example.test/anthropic/')).toBe('https://eu.example.test/anthropic/v1/messages');
    expect(messagesUrl('minimax', 'https://eu.example.test/anthropic/v1/messages')).toBe('https://eu.example.test/anthropic/v1/messages');
    expect(messagesUrl('anthropic')).toBe(ANTHROPIC_URL);
  });

  it('POSTs to MiniMax with Bearer and x-api-key and reads text past thinking blocks', async () => {
    const { fetchImpl, calls } = mockFetch([
      { type: 'thinking', thinking: 'hmm' },
      { type: 'text', text: '{"c":[]}' },
    ]);
    const llm = new AnthropicLlmClient({ apiKey: KEY, model: 'MiniMax-M3', fetch: fetchImpl });
    expect(llm.model).toBe('minimax-m3');
    const r = await llm.complete(prompt, { maxTokens: 120, signal: new AbortController().signal });
    expect(r.text).toBe('{"c":[]}');
    const c = calls[0]!;
    expect(c.url).toBe(`${MINIMAX_BASE_URL}/v1/messages`);
    expect(c.headers.authorization).toBe(`Bearer ${KEY}`);
    expect(c.headers['x-api-key']).toBe(KEY);
    expect(c.headers['anthropic-version']).toBe(MINIMAX_ANTHROPIC_VERSION);
    expect(c.body.model).toBe('MiniMax-M3');
  });

  it('never sends the Bearer header to Anthropic', async () => {
    const { fetchImpl, calls } = mockFetch();
    await new AnthropicLlmClient({ apiKey: KEY, fetch: fetchImpl }).complete(prompt, { maxTokens: 120, signal: new AbortController().signal });
    expect(calls[0]!.headers).not.toHaveProperty('authorization');
  });
});

describe('configFromEnv with MiniMax', () => {
  it('resolves the model, provider and key variable', () => {
    expect(resolveModel({ MINIMAX_API_KEY: 'k' })).toMatchObject({ model: 'MiniMax-M3', provider: 'minimax', keyEnv: 'MINIMAX_API_KEY' });
    expect(resolveModel({ DECODE_MODEL: 'MiniMax-M3.1-Flash' })).toMatchObject({ provider: 'minimax', keyEnv: 'MINIMAX_API_KEY' });
    expect(resolveModel({ DECODE_MODEL: 'claude-haiku-4-5', MINIMAX_API_KEY: 'k' })).toMatchObject({ provider: 'anthropic', keyEnv: 'ANTHROPIC_API_KEY' });
    expect(resolveModel({ DECODE_MODEL: 'gpt-x', MINIMAX_API_KEY: 'k' }).warning).toContain('MiniMax-M3');
  });

  it('needs the key of the chosen provider', async () => {
    const c = configFromEnv({ DECODE_MODEL: 'MiniMax-M3', ANTHROPIC_API_KEY: 'k', LLM_ENABLED: 'true', NODE_ENV: 'development' });
    expect(c.warnings.join(' ')).toContain('MINIMAX_API_KEY is not set');
    expect(await c.deps.flags.llmEnabled()).toBe(false);
  });

  it('never puts the MiniMax key in a warning', () => {
    const c = configFromEnv({ MINIMAX_API_KEY: 'mm-secret-value', NODE_ENV: 'development' });
    expect(c.warnings.join(' ')).toContain('MiniMax-M3 (minimax)');
    expect(c.warnings.join(' ')).not.toContain('mm-secret-value');
  });

  it('clamps DECODE_TIMEOUT_MS', () => {
    expect(timeoutFromEnv(undefined)).toBe(DEFAULT_TIMEOUT_MS);
    expect(timeoutFromEnv('abc')).toBe(DEFAULT_TIMEOUT_MS);
    expect(timeoutFromEnv('4000')).toBe(4000);
    expect(timeoutFromEnv('50')).toBe(300);
    expect(timeoutFromEnv('60000')).toBe(9000);
    expect(configFromEnv({ DECODE_TIMEOUT_MS: '3500' }).deps.options?.timeoutMs).toBe(3500);
  });

  it('end to end through the route with a mocked MiniMax reply and MINIMAX_BASE_URL', async () => {
    const { fetchImpl, calls } = mockFetch();
    const c = configFromEnv(
      { MINIMAX_API_KEY: KEY, MINIMAX_BASE_URL: 'https://eu.example.test/anthropic', LLM_ENABLED: 'true', NODE_ENV: 'production' },
      { fetch: fetchImpl },
    );
    c.deps.options = { ...c.deps.options, log: () => {} };
    const r = await createFetchHandler(c)(
      new Request(`https://${HOST}/api/decode`, {
        method: 'POST',
        headers: { host: HOST, origin: `https://${HOST}`, 'content-type': 'application/json' },
        body: JSON.stringify(requestFor('i need water')),
      }),
    );
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ model: 'minimax-m3', degraded: false, candidates: [{ text: 'I need water', source: 'llm' }] });
    expect(calls[0]!.url).toBe('https://eu.example.test/anthropic/v1/messages');
  });
});
