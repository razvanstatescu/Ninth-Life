// Soft limits. The deployment runs on Vercel with no shared store, so this in-memory store is a
// best-effort, per-instance limiter: each serverless instance counts on its own and forgets on a
// cold start. It is NOT a global cap. The real guards are the Vercel WAF rate-limit rule (per IP)
// and the Anthropic Console workspace spend limit (hard monthly cap); see ADR-001.
//
// Per instance: per salted IP hash 30/min and 300/UTC day; 20,000 decodes or $8 of estimated spend
// per UTC day.

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

/** In-memory store: per-instance and best effort (see the note at the top of this file). */
export class MemoryQuotaStore implements QuotaStore {
  private readonly items = new Map<string, { n: number; usd: number; expires: number }>();
  constructor(private readonly limits: QuotaLimits = DEFAULT_LIMITS) {}

  private get(key: string, nowMs: number) {
    if (this.items.size > 50_000) this.sweep(nowMs); // bound memory on a long-lived instance
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

  private sweep(nowMs: number) {
    for (const [k, v] of this.items) if (v.expires <= nowMs) this.items.delete(k);
  }
}
