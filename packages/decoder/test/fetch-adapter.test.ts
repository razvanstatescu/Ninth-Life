import { describe, expect, it } from 'vitest';
import { clientIp, configFromEnv, createFetchHandler, hashIp, originAllowed, parseOrigins } from '../src/adapters/fetch.js';
import { AnthropicLlmClient, FakeLlmClient, type FetchLike } from '../src/llm.js';
import { makeDeps, requestFor } from './helpers.js';

const HOST = 'ninth-life.example';
const ORIGIN = `https://${HOST}`;

function req(over: { method?: string; origin?: string | null; body?: string; ip?: string; length?: string } = {}) {
  const headers = new Headers({ host: HOST, 'content-type': 'application/json', 'x-forwarded-for': `${over.ip ?? '203.0.113.7'}, 10.0.0.1` });
  if (over.origin !== null) headers.set('origin', over.origin ?? ORIGIN);
  if (over.length) headers.set('content-length', over.length);
  const method = over.method ?? 'POST';
  return new Request(`${ORIGIN}/api/decode`, {
    method,
    headers,
    body: method === 'POST' ? (over.body ?? JSON.stringify(requestFor('i need water'))) : undefined,
  });
}

function setup(production = true) {
  const deps = makeDeps({ reply: '{"c":[["i","need","water"]]}' });
  const seen: string[] = [];
  const consume = deps.quotaStore.consume.bind(deps.quotaStore);
  deps.quota = { consume: (h, n) => (seen.push(h), consume(h, n)), recordCost: (n, u) => deps.quotaStore.recordCost(n, u) };
  const h = createFetchHandler({ deps, salt: 'test-salt-0123456789', allowedOrigins: [], production });
  return { h, deps, seen };
}

describe('fetch adapter (Next.js route)', () => {
  it('decodes a same-origin POST', async () => {
    const { h } = setup();
    const r = await h(req());
    expect(r.status).toBe(200);
    expect(((await r.json()) as { candidates: { text: string }[] }).candidates[0]!.text).toBe('I need water');
    expect(r.headers.get('cache-control')).toBe('no-store');
  });

  it('403 for a foreign Origin, and for a missing Origin in production', async () => {
    const { h } = setup();
    expect((await h(req({ origin: 'https://evil.example' }))).status).toBe(403);
    expect((await h(req({ origin: null }))).status).toBe(403);
    expect((await setup(false).h(req({ origin: null }))).status).toBe(200); // dev: curl works
  });

  it('405 for GET', async () => {
    expect((await setup().h(req({ method: 'GET' }))).status).toBe(405);
  });

  it('413 on a declared or actual body over 4 KB, before the model is called', async () => {
    const { h, deps } = setup();
    expect((await h(req({ length: '5000' }))).status).toBe(413);
    expect((await h(req({ body: 'x'.repeat(4097) }))).status).toBe(413);
    expect(deps.fake!.calls).toHaveLength(0);
  });

  it('passes a salted per-day hash of the first forwarded IP, never the raw IP', async () => {
    const { h, seen } = setup();
    await h(req({ ip: '203.0.113.7' }));
    expect(seen[0]).toMatch(/^[0-9a-f]{32}$/);
    expect(seen[0]).toBe(hashIp('203.0.113.7', 'test-salt-0123456789', Date.UTC(2026, 10, 6, 12)));
  });
});

describe('helpers', () => {
  it('hashIp changes with day, salt and IP', () => {
    const t = Date.UTC(2026, 10, 6);
    expect(hashIp('1.2.3.4', 's', t)).toBe(hashIp('1.2.3.4', 's', t + 3600_000));
    expect(hashIp('1.2.3.4', 's', t)).not.toBe(hashIp('1.2.3.4', 's', t + 86_400_000));
    expect(hashIp('1.2.3.4', 's', t)).not.toBe(hashIp('1.2.3.4', 't', t));
  });
  it('clientIp prefers x-forwarded-for', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2', 'x-real-ip': '3.3.3.3' }))).toBe('1.1.1.1');
    expect(clientIp(new Headers({ 'x-real-ip': '3.3.3.3' }))).toBe('3.3.3.3');
  });
  it('originAllowed', () => {
    expect(originAllowed(ORIGIN, HOST, [], true)).toBe(true);
    expect(originAllowed(`http://${HOST}`, HOST, [], true)).toBe(false);
    expect(originAllowed('https://preview.example', HOST, ['https://preview.example'], true)).toBe(true);
  });
  it('parseOrigins', () => {
    expect(parseOrigins(' https://a.example, ,https://b.example ')).toEqual(['https://a.example', 'https://b.example']);
  });
});

describe('configFromEnv', () => {
  it('kill switch defaults to off', async () => {
    const c = configFromEnv({ ANTHROPIC_API_KEY: 'k', NODE_ENV: 'production' });
    expect(await c.deps.flags.llmEnabled()).toBe(false);
  });

  it('uses the Anthropic client with the default model when a key is set', async () => {
    const c = configFromEnv({ ANTHROPIC_API_KEY: 'k', LLM_ENABLED: 'true', NODE_ENV: 'production' });
    expect(c.deps.llm).toBeInstanceOf(AnthropicLlmClient);
    expect(c.deps.llm.model).toBe('haiku-5.5');
    expect(await c.deps.flags.llmEnabled()).toBe(true);
  });

  it('DECODE_MODEL selects Haiku 4.5', () => {
    expect(configFromEnv({ ANTHROPIC_API_KEY: 'k', DECODE_MODEL: 'claude-haiku-4-5' }).deps.llm.model).toBe('haiku-4.5');
  });

  it('without a key the switch is forced off (503 llm_disabled) even if LLM_ENABLED=true', async () => {
    const c = configFromEnv({ LLM_ENABLED: 'true', NODE_ENV: 'production' });
    expect(await c.deps.flags.llmEnabled()).toBe(false);
    const h = createFetchHandler(c);
    const r = await h(req());
    expect(r.status).toBe(503);
    expect(await r.json()).toMatchObject({ error: 'llm_disabled' });
  });

  it('the fake model is ignored in production', () => {
    expect(configFromEnv({ DECODE_FAKE_LLM: 'true', NODE_ENV: 'development' }).deps.llm).toBeInstanceOf(FakeLlmClient);
    const prod = configFromEnv({ DECODE_FAKE_LLM: 'true', NODE_ENV: 'production' });
    expect(prod.warnings.join(' ')).toContain('ANTHROPIC_API_KEY');
  });

  it('uses IP_HASH_SALT, or a random per-instance salt when it is missing or short', () => {
    expect(configFromEnv({ IP_HASH_SALT: 'a-long-enough-salt-value' }).salt).toBe('a-long-enough-salt-value');
    expect(configFromEnv({}).salt).toMatch(/^[0-9a-f]{32}$/);
    expect(configFromEnv({}).salt).not.toBe(configFromEnv({}).salt);
  });

  it('warns about the per-instance quota in dev only, and never puts the key in a warning', () => {
    const dev = configFromEnv({ ANTHROPIC_API_KEY: 'sk-secret-value', NODE_ENV: 'development' });
    expect(dev.warnings.join(' ')).toContain('per instance');
    expect(dev.warnings.join(' ')).not.toContain('sk-secret-value');
    expect(configFromEnv({ ANTHROPIC_API_KEY: 'k', NODE_ENV: 'production' }).warnings).toEqual([]);
  });

  it('end to end through the route with a mocked Anthropic reply', async () => {
    const fetchImpl: FetchLike = async () =>
      new Response(JSON.stringify({ content: [{ type: 'text', text: '{"c":[["i","need","water"]]}' }], usage: { input_tokens: 1, output_tokens: 1 } }));
    const c = configFromEnv({ ANTHROPIC_API_KEY: 'k', LLM_ENABLED: 'true', NODE_ENV: 'production' }, { fetch: fetchImpl });
    c.deps.options = { log: () => {} };
    const r = await createFetchHandler(c)(req());
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ model: 'haiku-5.5', degraded: false });
  });
});
