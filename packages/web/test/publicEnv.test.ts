import { MODEL_PROFILES, resolveModel, timeoutFromEnv } from '@ninth/decoder';
import { describe, expect, it } from 'vitest';
import { clientTimeoutMs, DEFAULT_DECODE_TIMEOUT_MS } from '@/lib/decodeClient';
import { decodeProvider, publicDecodeEnv, serverTimeoutMs } from '@/lib/publicEnv.mjs';
import { PROVIDER_COPY } from '@/lib/rankingProvider';

// next.config.mjs derives the provider named in the privacy copy from the route's env. It must be
// the provider the route really calls (ADR-002), so it is checked against the decoder's own rules.
const MODELS = [undefined, '', 'nope', ...Object.keys(MODEL_PROFILES)];
const KEYS = [{}, { ANTHROPIC_API_KEY: 'a' }, { MINIMAX_API_KEY: 'm' }, { ANTHROPIC_API_KEY: 'a', MINIMAX_API_KEY: 'm' }];

describe('publicDecodeEnv (next.config.mjs)', () => {
  it('names the same provider as the decoder for every model and key combination', () => {
    for (const DECODE_MODEL of MODELS) {
      for (const keys of KEYS) {
        const env = { ...keys, DECODE_MODEL };
        expect(decodeProvider(env), JSON.stringify(env)).toBe(resolveModel(env).provider);
      }
    }
  });

  it('uses the same server deadline as the decoder, and gives the client 300 ms more', () => {
    for (const v of [undefined, '', 'x', '50', '1200', '4000', '60000']) {
      expect(serverTimeoutMs(v)).toBe(timeoutFromEnv(v));
    }
    expect(publicDecodeEnv({}).NEXT_PUBLIC_DECODE_TIMEOUT_MS).toBe(String(DEFAULT_DECODE_TIMEOUT_MS));
    expect(publicDecodeEnv({ DECODE_TIMEOUT_MS: '4000' }).NEXT_PUBLIC_DECODE_TIMEOUT_MS).toBe('4300');
    expect(publicDecodeEnv({ DECODE_TIMEOUT_MS: '4000', NEXT_PUBLIC_DECODE_TIMEOUT_MS: '5000' }).NEXT_PUBLIC_DECODE_TIMEOUT_MS).toBe('5000');
  });

  it('never copies a key into the public env', () => {
    const out = JSON.stringify(publicDecodeEnv({ MINIMAX_API_KEY: 'mm-secret', ANTHROPIC_API_KEY: 'sk-secret' }));
    expect(out).not.toContain('secret');
  });

  it('clamps the client timeout', () => {
    expect(clientTimeoutMs(undefined)).toBe(1500);
    expect(clientTimeoutMs('4300')).toBe(4300);
    expect(clientTimeoutMs('10')).toBe(500);
    expect(clientTimeoutMs('99999')).toBe(9500);
  });
});

describe('ranking provider copy', () => {
  it('names the company in its own retention sentence and never claims nothing is kept', () => {
    for (const [id, c] of Object.entries(PROVIDER_COPY)) {
      expect(c.service, id).toContain(c.company);
      expect(c.retention, id).toContain(c.company);
      expect(c.retention.toLowerCase(), id).not.toContain('nothing is kept');
      // privacy.md: never claim EU-only processing for either provider.
      expect(c.region, id).not.toMatch(/only in the EU|EU only|EU-only/i);
    }
  });
});
