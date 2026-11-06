/** scripts/live-check.ts against a fake fetch (eval-harness Req 8.9; ADR-001 open questions). No key, no network. */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runLiveCheck } from '../scripts/live-check';

type Usage = { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number };
const reply = (usage: Partial<Usage> = {}, extra: Record<string, unknown> = {}) =>
  new Response(
    JSON.stringify({
      content: [{ type: 'text', text: '{"c":[["i","need","water"]]}' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 300, output_tokens: 20, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, ...usage },
      ...extra,
    }),
    { status: 200 },
  );

function fakeApi(handler: (body: Record<string, unknown>, n: number) => Response) {
  const bodies: Record<string, unknown>[] = [];
  const keys: string[] = [];
  const fetch = async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    bodies.push(body);
    keys.push((init.headers as Record<string, string>)['x-api-key']!);
    return handler(body, bodies.length);
  };
  return { fetch, bodies, keys };
}

describe('live-check (eval-harness Req 8.9)', () => {
  it('Req 8.9 skips with a clear message and sends nothing when there is no key', async () => {
    const lines: string[] = [];
    const api = fakeApi(() => reply());
    const r = await runLiveCheck({ apiKey: '  ', fetch: api.fetch, log: (l) => void lines.push(l) });
    expect(r.status).toBe('skipped');
    expect(lines.join('\n')).toMatch(/skipped: ANTHROPIC_API_KEY is not set/);
    expect(api.bodies).toHaveLength(0);
  });

  it('Req 8.9 passes when Haiku 5.5 accepts thinking disabled and the second identical call reads the cache', async () => {
    const lines: string[] = [];
    const api = fakeApi((body, n) => (body.model === 'claude-haiku-5-5' && n === 2 ? reply({ cache_read_input_tokens: 1090 }) : reply({ cache_creation_input_tokens: n === 1 ? 1090 : 0 })));
    const r = await runLiveCheck({ apiKey: 'sk-test-key', fetch: api.fetch, log: (l) => void lines.push(l), sleep: async () => {} });
    expect(r).toEqual({ status: 'pass', failures: [], warnings: [] });
    expect(api.bodies.map((b) => b.model)).toEqual(['claude-haiku-5-5', 'claude-haiku-5-5', 'claude-haiku-4-5']);
    expect(api.bodies[0]!.thinking).toEqual({ type: 'disabled' });
    expect(api.bodies[2]!.thinking).toBeUndefined();
    for (const b of api.bodies) for (const p of ['temperature', 'top_p', 'top_k']) expect(b).not.toHaveProperty(p);
    expect(JSON.stringify(api.bodies[0])).toBe(JSON.stringify(api.bodies[1]));
    const out = lines.join('\n');
    expect(out).toMatch(/read 1090 tokens from the prompt cache/);
    expect(out).not.toMatch(/sk-test-key/);
  });

  it('Req 8.9 fails, with the API error type, when Haiku 5.5 rejects the request', async () => {
    const api = fakeApi((body) =>
      body.model === 'claude-haiku-5-5'
        ? new Response(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'thinking: disabled is not supported' } }), { status: 400 })
        : reply(),
    );
    const r = await runLiveCheck({ apiKey: 'k', fetch: api.fetch, log: () => {} });
    expect(r.status).toBe('fail');
    expect(r.failures).toEqual(['claude-haiku-5-5: call 1: HTTP 400 invalid_request_error: thinking: disabled is not supported']);
  });

  it('Req 8.9 fails when the cache read stays 0, after one more try', async () => {
    const api = fakeApi(() => reply());
    const r = await runLiveCheck({ apiKey: 'k', models: ['claude-haiku-5-5'], fetch: api.fetch, log: () => {}, sleep: async () => {} });
    expect(api.bodies).toHaveLength(3);
    expect(r.failures).toEqual(['claude-haiku-5-5: cache_read_input_tokens stayed 0 on an identical request (system prompt not cached)']);
  });

  it('Req 8.9 warns, without failing, when a call is slower than the route deadline', async () => {
    let t = 0;
    const api = fakeApi(() => reply({ cache_read_input_tokens: 5 }));
    const r = await runLiveCheck({ apiKey: 'k', models: ['claude-haiku-4-5'], fetch: api.fetch, log: () => {}, now: () => (t += 1500) });
    expect(r.status).toBe('pass');
    expect(r.warnings[0]).toMatch(/1500 ms, above the route's 1200 ms deadline/);
  });

  it('Req 8.9 the script exits 0 with the skip message when run without a key', () => {
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    const out = execFileSync(join(__dirname, '..', 'node_modules', '.bin', 'tsx'), ['scripts/live-check.ts'], { cwd: join(__dirname, '..'), env, encoding: 'utf8' });
    expect(out).toMatch(/live-check skipped/);
  });
});
