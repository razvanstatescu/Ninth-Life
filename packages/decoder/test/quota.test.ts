import { describe, expect, it } from 'vitest';
import { MemoryQuotaStore, quotaKeys, secondsToNextMinute, secondsToNextUtcDay, TTL_SECONDS } from '../src/quota.js';

const T = Date.UTC(2026, 10, 6, 12, 0, 30); // 12:00:30 UTC

describe('MemoryQuotaStore (DS-4)', () => {
  it('allows 30 per minute per IP, then 429 until the next minute', async () => {
    const q = new MemoryQuotaStore();
    for (let i = 0; i < 30; i++) expect((await q.consume('a', T)).ok).toBe(true);
    const d = await q.consume('a', T);
    expect(d).toEqual({ ok: false, scope: 'ip_minute', retryAfter: 30 });
    expect((await q.consume('b', T)).ok).toBe(true); // other IPs unaffected
    expect((await q.consume('a', T + 30_000)).ok).toBe(true); // next minute
  });

  it('allows 300 per day per IP', async () => {
    const q = new MemoryQuotaStore();
    let t = T;
    for (let i = 0; i < 300; i++) {
      if (i % 30 === 0) t += 60_000;
      expect((await q.consume('a', t)).ok).toBe(true);
    }
    const d = await q.consume('a', t + 60_000);
    expect(d.ok).toBe(false);
    if (!d.ok) {
      expect(d.scope).toBe('ip_day');
      expect(d.retryAfter).toBe(secondsToNextUtcDay(t + 60_000));
    }
  });

  it('enforces the global decode cap', async () => {
    const q = new MemoryQuotaStore({ ipPerMinute: 99, ipPerDay: 99, globalPerDay: 3, globalUsdMicrosPerDay: 1e9 });
    for (const ip of ['a', 'b', 'c']) expect((await q.consume(ip, T)).ok).toBe(true);
    expect(await q.consume('d', T)).toMatchObject({ ok: false, scope: 'global' });
  });

  it('enforces the global dollar cap', async () => {
    const q = new MemoryQuotaStore({ ipPerMinute: 99, ipPerDay: 99, globalPerDay: 99, globalUsdMicrosPerDay: 8_000_000 });
    expect((await q.consume('a', T)).ok).toBe(true);
    await q.recordCost(T, 8_000_000);
    expect(await q.consume('a', T)).toMatchObject({ ok: false, scope: 'global' });
  });

  it('refused requests are not counted', async () => {
    const q = new MemoryQuotaStore({ ipPerMinute: 1, ipPerDay: 99, globalPerDay: 2, globalUsdMicrosPerDay: 1e9 });
    expect((await q.consume('a', T)).ok).toBe(true);
    expect((await q.consume('a', T)).ok).toBe(false);
    expect((await q.consume('b', T)).ok).toBe(true); // global still had room for one more
  });
});

describe('time helpers', () => {
  it('retry-after values', () => {
    expect(secondsToNextMinute(T)).toBe(30);
    expect(secondsToNextUtcDay(Date.UTC(2026, 10, 6, 23, 59, 0))).toBe(60);
  });
  it('keys are per IP hash and per UTC day, never a raw IP', () => {
    const k = quotaKeys('abc123', T);
    expect(k).toEqual({ ipMinute: `ip#abc123#m#${Math.floor(T / 60000)}`, ipDay: 'ip#abc123#d#2026-11-06', global: 'g#d#2026-11-06' });
  });
});

describe('MemoryQuotaStore expiry', () => {
  it('a new UTC day starts fresh per-day counters', async () => {
    const q = new MemoryQuotaStore({ ipPerMinute: 1, ipPerDay: 1, globalPerDay: 99, globalUsdMicrosPerDay: 1e9 });
    expect((await q.consume('a', T)).ok).toBe(true);
    expect((await q.consume('a', T + 60_000)).ok).toBe(false); // same UTC day
    expect((await q.consume('a', T + TTL_SECONDS * 1000 + 1)).ok).toBe(true); // next day, old items gone
  });
});
