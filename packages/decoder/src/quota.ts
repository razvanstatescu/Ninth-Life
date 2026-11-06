import {
  DynamoDBClient,
  TransactWriteItemsCommand,
  UpdateItemCommand,
  type TransactWriteItemsCommandInput,
} from '@aws-sdk/client-dynamodb';

// Per-IP and global limits (docs/plan/00-source-plan.md §4.7):
// - per salted IP hash: 30 per minute, 300 per UTC day
// - global: 20,000 decodes per UTC day or $8 of estimated model spend, whichever comes first
// Every counter item expires 24 h after it was last written (DynamoDB TTL).

export interface QuotaLimits {
  ipPerMinute: number;
  ipPerDay: number;
  globalPerDay: number;
  globalUsdMicrosPerDay: number;
}

export const DEFAULT_LIMITS: QuotaLimits = {
  ipPerMinute: 30,
  ipPerDay: 300,
  globalPerDay: 20_000,
  globalUsdMicrosPerDay: 8_000_000,
};

export type QuotaScope = 'ip_minute' | 'ip_day' | 'global';

export type QuotaDecision = { ok: true } | { ok: false; scope: QuotaScope; retryAfter: number };

export interface QuotaStore {
  /** Count one decode for this IP hash and globally, or refuse without counting. */
  consume(ipHash: string, nowMs: number): Promise<QuotaDecision>;
  /** Add estimated spend (micro-dollars) to today's global total. */
  recordCost(nowMs: number, usdMicros: number): Promise<void>;
}

export const TTL_SECONDS = 24 * 60 * 60;

export function utcDay(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function minuteBucket(nowMs: number): number {
  return Math.floor(nowMs / 60_000);
}

export function secondsToNextMinute(nowMs: number): number {
  return Math.max(1, Math.ceil(((minuteBucket(nowMs) + 1) * 60_000 - nowMs) / 1000));
}

export function secondsToNextUtcDay(nowMs: number): number {
  const d = new Date(nowMs);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - nowMs) / 1000));
}

export function quotaKeys(ipHash: string, nowMs: number) {
  const day = utcDay(nowMs);
  return {
    ipMinute: `ip#${ipHash}#m#${minuteBucket(nowMs)}`,
    ipDay: `ip#${ipHash}#d#${day}`,
    global: `g#d#${day}`,
  };
}

function denied(scope: QuotaScope, nowMs: number): QuotaDecision {
  return {
    ok: false,
    scope,
    retryAfter: scope === 'ip_minute' ? secondsToNextMinute(nowMs) : secondsToNextUtcDay(nowMs),
  };
}

// ---------------------------------------------------------------------------------------------

/** In-memory store for dev and tests. Not safe across serverless instances. */
export class MemoryQuotaStore implements QuotaStore {
  private readonly items = new Map<string, { n: number; usd: number; expires: number }>();
  constructor(private readonly limits: QuotaLimits = DEFAULT_LIMITS) {}

  private get(key: string, nowMs: number) {
    const it = this.items.get(key);
    if (it && it.expires > nowMs) return it;
    const fresh = { n: 0, usd: 0, expires: nowMs + TTL_SECONDS * 1000 };
    this.items.set(key, fresh);
    return fresh;
  }

  async consume(ipHash: string, nowMs: number): Promise<QuotaDecision> {
    const k = quotaKeys(ipHash, nowMs);
    const m = this.get(k.ipMinute, nowMs);
    const d = this.get(k.ipDay, nowMs);
    const g = this.get(k.global, nowMs);
    if (m.n >= this.limits.ipPerMinute) return denied('ip_minute', nowMs);
    if (d.n >= this.limits.ipPerDay) return denied('ip_day', nowMs);
    if (g.n >= this.limits.globalPerDay || g.usd >= this.limits.globalUsdMicrosPerDay) return denied('global', nowMs);
    const exp = nowMs + TTL_SECONDS * 1000;
    for (const it of [m, d, g]) {
      it.n++;
      it.expires = exp;
    }
    return { ok: true };
  }

  async recordCost(nowMs: number, usdMicros: number): Promise<void> {
    const g = this.get(quotaKeys('', nowMs).global, nowMs);
    g.usd += usdMicros;
  }
}

// ---------------------------------------------------------------------------------------------

export interface DynamoSender {
  send(cmd: TransactWriteItemsCommand | UpdateItemCommand): Promise<unknown>;
}

/**
 * DynamoDB store. Table: partition key `pk` (S), TTL attribute `ttl` (epoch seconds).
 * One TransactWriteItems call increments all three counters, each guarded by a condition, so a
 * refused request counts against nothing.
 */
export class DynamoQuotaStore implements QuotaStore {
  private readonly client: DynamoSender;
  constructor(
    private readonly table: string,
    private readonly limits: QuotaLimits = DEFAULT_LIMITS,
    client?: DynamoSender,
  ) {
    this.client = client ?? new DynamoDBClient({ maxAttempts: 2 });
  }

  buildConsume(ipHash: string, nowMs: number): TransactWriteItemsCommandInput {
    const k = quotaKeys(ipHash, nowMs);
    const ttl = { N: String(Math.floor(nowMs / 1000) + TTL_SECONDS) };
    const inc = (pk: string, max: number) => ({
      Update: {
        TableName: this.table,
        Key: { pk: { S: pk } },
        UpdateExpression: 'ADD #n :one SET #ttl = :ttl',
        ConditionExpression: 'attribute_not_exists(#n) OR #n < :max',
        ExpressionAttributeNames: { '#n': 'n', '#ttl': 'ttl' },
        ExpressionAttributeValues: { ':one': { N: '1' }, ':ttl': ttl, ':max': { N: String(max) } },
      },
    });
    return {
      TransactItems: [
        inc(k.ipMinute, this.limits.ipPerMinute),
        inc(k.ipDay, this.limits.ipPerDay),
        {
          Update: {
            TableName: this.table,
            Key: { pk: { S: k.global } },
            UpdateExpression: 'ADD #n :one SET #ttl = :ttl',
            ConditionExpression:
              '(attribute_not_exists(#n) OR #n < :max) AND (attribute_not_exists(#u) OR #u < :maxUsd)',
            ExpressionAttributeNames: { '#n': 'n', '#u': 'usd', '#ttl': 'ttl' },
            ExpressionAttributeValues: {
              ':one': { N: '1' },
              ':ttl': ttl,
              ':max': { N: String(this.limits.globalPerDay) },
              ':maxUsd': { N: String(this.limits.globalUsdMicrosPerDay) },
            },
          },
        },
      ],
    };
  }

  async consume(ipHash: string, nowMs: number): Promise<QuotaDecision> {
    try {
      await this.client.send(new TransactWriteItemsCommand(this.buildConsume(ipHash, nowMs)));
      return { ok: true };
    } catch (e) {
      const err = e as { name?: string; CancellationReasons?: { Code?: string }[] };
      if (err.name === 'TransactionCanceledException' && Array.isArray(err.CancellationReasons)) {
        const scopes: QuotaScope[] = ['ip_minute', 'ip_day', 'global'];
        const i = err.CancellationReasons.findIndex((r) => r?.Code === 'ConditionalCheckFailed');
        if (i >= 0) return denied(scopes[i]!, nowMs);
      }
      throw e; // store failure: the handler fails closed
    }
  }

  async recordCost(nowMs: number, usdMicros: number): Promise<void> {
    if (usdMicros <= 0) return;
    await this.client.send(
      new UpdateItemCommand({
        TableName: this.table,
        Key: { pk: { S: quotaKeys('', nowMs).global } },
        UpdateExpression: 'ADD #u :u SET #ttl = :ttl',
        ExpressionAttributeNames: { '#u': 'usd', '#ttl': 'ttl' },
        ExpressionAttributeValues: {
          ':u': { N: String(Math.ceil(usdMicros)) },
          ':ttl': { N: String(Math.floor(nowMs / 1000) + TTL_SECONDS) },
        },
      }),
    );
  }
}
