import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { describe, expect, it } from 'vitest';
import { createLambdaHandler, hashIp, parseOrigins } from '../src/adapters/lambda.js';
import { makeDeps, requestFor } from './helpers.js';

const ORIGIN = 'https://ninth-life.example';

function event(over: Partial<{ method: string; origin?: string; body: string; b64: boolean; ip: string }> = {}): APIGatewayProxyEventV2 {
  const body = over.body ?? JSON.stringify(requestFor('i need water'));
  return {
    version: '2.0',
    routeKey: 'POST /v1/decode',
    rawPath: '/v1/decode',
    rawQueryString: '',
    headers: over.origin === undefined && 'origin' in over ? {} : { origin: over.origin ?? ORIGIN, 'content-type': 'application/json' },
    isBase64Encoded: over.b64 ?? false,
    body: over.b64 ? Buffer.from(body).toString('base64') : body,
    requestContext: {
      accountId: 'placeholder',
      apiId: 'placeholder',
      domainName: 'example',
      domainPrefix: 'example',
      requestId: 'r',
      routeKey: 'POST /v1/decode',
      stage: '$default',
      time: '',
      timeEpoch: 0,
      http: { method: over.method ?? 'POST', path: '/v1/decode', protocol: 'HTTP/1.1', sourceIp: over.ip ?? '203.0.113.7', userAgent: 'test' },
    },
  } as APIGatewayProxyEventV2;
}

function setup(reply = '{"c":[["i","need","water"]]}') {
  const deps = makeDeps({ reply });
  const seen: string[] = [];
  const consume = deps.quotaStore.consume.bind(deps.quotaStore);
  deps.quota = {
    consume: (ipHash, now) => {
      seen.push(ipHash);
      return consume(ipHash, now);
    },
    recordCost: (n, u) => deps.quotaStore.recordCost(n, u),
  };
  const h = createLambdaHandler({ deps, allowedOrigins: [ORIGIN], salt: async () => 'test-salt-0123456789' });
  return { h, deps, seen };
}

describe('lambda adapter', () => {
  it('decodes a POST from an allowed origin', async () => {
    const { h } = setup();
    const r = await h(event());
    expect(r.statusCode).toBe(200);
    expect(JSON.parse(r.body!).candidates[0].text).toBe('I need water');
    expect(r.headers!['content-type']).toBe('application/json');
    expect(r.headers!['cache-control']).toBe('no-store');
  });

  it('handles base64 bodies', async () => {
    const { h } = setup();
    expect((await h(event({ b64: true }))).statusCode).toBe(200);
  });

  it('403 for a missing or unknown Origin', async () => {
    const { h } = setup();
    expect((await h(event({ origin: 'https://evil.example' }))).statusCode).toBe(403);
    expect((await h(event({ origin: undefined }))).statusCode).toBe(403);
  });

  it('405 for other methods', async () => {
    const { h } = setup();
    expect((await h(event({ method: 'GET' }))).statusCode).toBe(405);
  });

  it('413 before parsing when the raw body is over 4 KB', async () => {
    const { h, deps } = setup();
    expect((await h(event({ body: 'x'.repeat(4097) }))).statusCode).toBe(413);
    expect(deps.fake!.calls).toHaveLength(0);
  });

  it('passes a salted hash to the quota store, never the raw IP', async () => {
    const { h, seen } = setup();
    await h(event({ ip: '203.0.113.7' }));
    expect(seen[0]).toMatch(/^[0-9a-f]{32}$/);
    expect(seen[0]).not.toContain('203.0.113.7');
  });
});

describe('hashIp', () => {
  const t = Date.UTC(2026, 10, 6);
  it('is stable within a day, changes across days and salts', () => {
    expect(hashIp('1.2.3.4', 's', t)).toBe(hashIp('1.2.3.4', 's', t + 3600_000));
    expect(hashIp('1.2.3.4', 's', t)).not.toBe(hashIp('1.2.3.4', 's', t + 86_400_000));
    expect(hashIp('1.2.3.4', 's', t)).not.toBe(hashIp('1.2.3.4', 't', t));
    expect(hashIp('1.2.3.4', 's', t)).not.toBe(hashIp('1.2.3.5', 's', t));
  });
});

describe('parseOrigins', () => {
  it('splits and trims', () => {
    expect(parseOrigins(' https://a.example, ,https://b.example ')).toEqual(['https://a.example', 'https://b.example']);
    expect(parseOrigins(undefined)).toEqual([]);
  });
});
