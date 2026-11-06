import { TransactWriteItemsCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { describe, expect, it } from 'vitest';
import {
  DynamoQuotaStore,
  MemoryQuotaStore,
  quotaKeys,
  secondsToNextMinute,
  secondsToNextUtcDay,
  TTL_SECONDS,
  type DynamoSender,
} from '../src/quota.js';

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

describe('DynamoQuotaStore', () => {
  function sender(fail?: number) {
    const sent: unknown[] = [];
    const s: DynamoSender = {
      async send(cmd) {
        sent.push(cmd);
        if (fail !== undefined && cmd instanceof TransactWriteItemsCommand) {
          const reasons = [0, 1, 2].map((i) => ({ Code: i === fail ? 'ConditionalCheckFailed' : 'None' }));
          throw Object.assign(new Error('cancelled'), { name: 'TransactionCanceledException', CancellationReasons: reasons });
        }
        return {};
      },
    };
    return { s, sent };
  }

  it('one transaction with three conditional increments and a 24 h TTL', async () => {
    const { s, sent } = sender();
    const q = new DynamoQuotaStore('tbl', undefined, s);
    expect(await q.consume('h', T)).toEqual({ ok: true });
    const cmd = sent[0] as TransactWriteItemsCommand;
    expect(cmd).toBeInstanceOf(TransactWriteItemsCommand);
    const items = cmd.input.TransactItems!;
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.Update!.Key!.pk!.S)).toEqual(Object.values(quotaKeys('h', T)));
    for (const i of items) {
      expect(i.Update!.ConditionExpression).toContain('#n < :max');
      expect(i.Update!.ExpressionAttributeValues![':ttl']!.N).toBe(String(Math.floor(T / 1000) + TTL_SECONDS));
    }
    expect(items.map((i) => i.Update!.ExpressionAttributeValues![':max']!.N)).toEqual(['30', '300', '20000']);
    expect(items[2]!.Update!.ConditionExpression).toContain('#u < :maxUsd');
  });

  it.each([
    [0, 'ip_minute'],
    [1, 'ip_day'],
    [2, 'global'],
  ] as const)('maps a cancelled condition at index %i to %s', async (i, scope) => {
    const q = new DynamoQuotaStore('tbl', undefined, sender(i).s);
    expect(await q.consume('h', T)).toMatchObject({ ok: false, scope });
  });

  it('rethrows other errors (handler fails closed)', async () => {
    const q = new DynamoQuotaStore('tbl', undefined, {
      async send() {
        throw Object.assign(new Error('x'), { name: 'ProvisionedThroughputExceededException' });
      },
    });
    await expect(q.consume('h', T)).rejects.toThrow();
  });

  it('recordCost adds micro-dollars to the global day item', async () => {
    const { s, sent } = sender();
    await new DynamoQuotaStore('tbl', undefined, s).recordCost(T, 1540);
    const cmd = sent[0] as UpdateItemCommand;
    expect(cmd.input.Key!.pk!.S).toBe('g#d#2026-11-06');
    expect(cmd.input.ExpressionAttributeValues![':u']!.N).toBe('1540');
  });
});
