/**
 * The network layer under @ninth/decoder's real `AnthropicLlmClient` for eval runs
 * (spec eval-harness Req 8.2, 8.3, 8.7).
 *
 * The client stays unchanged: it gets this transport as its `fetch`. The transport adds what a
 * batch run needs and the shipping route must not have:
 *  - a response cache on disk (packages/eval/.cache/llm/<namespace>/, gitignored) keyed by the
 *    SHA-256 of the API version, URL and request body. The key never includes headers, so the
 *    API key is neither hashed nor stored. Reruns are free and give the same numbers.
 *  - at most `concurrency` requests in flight;
 *  - retries with exponential backoff (or the server's retry-after) on 408, 429, 5xx and 529;
 *  - a record of every call (latency of the successful attempt, attempts, cache hit or not).
 * Any other status (400, 401, 403, 404 ...) is fatal: the transport remembers it, refuses further
 * calls, and the run fails loudly instead of reporting partial numbers.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FetchLike } from '@ninth/decoder';

/** One cached Messages API response. Written once, after a 200; never contains request headers. */
export interface CachedCall {
  v: 1;
  key: string;
  model: string;
  anthropicVersion: string;
  /** Wall-clock time of the successful attempt, ms. */
  latencyMs: number;
  attempts: number;
  /** When the original call was made (ISO 8601). Not used by any result. */
  savedAt: string;
  /** The Messages API response body. */
  response: unknown;
}

export interface CallRecord {
  key: string;
  /** True when the reply came from the cache (or an identical request already in flight). */
  cached: boolean;
  latencyMs: number;
  attempts: number;
  response: unknown;
}

export interface FatalApiError {
  status: number | 'network';
  /** `error.type` and `error.message` from the API's error body, truncated; never request data. */
  detail: string;
  attempts: number;
}

/** SHA-256 over what decides the reply: API version, URL and the exact body bytes. */
export function requestKey(url: string, anthropicVersion: string, body: string): string {
  return createHash('sha256').update(`${anthropicVersion}\n${url}\n${body}`).digest('hex');
}

/** Response cache: a directory of `<key>.json` files, or memory only when `dir` is undefined. */
export class ResponseCache {
  private readonly mem = new Map<string, CachedCall>();
  constructor(readonly dir?: string) {
    if (dir) mkdirSync(dir, { recursive: true });
  }
  private path(key: string): string {
    return join(this.dir!, `${key}.json`);
  }
  get(key: string): CachedCall | undefined {
    const hit = this.mem.get(key);
    if (hit || !this.dir) return hit;
    const p = this.path(key);
    if (!existsSync(p)) return undefined;
    const entry = JSON.parse(readFileSync(p, 'utf8')) as CachedCall;
    this.mem.set(key, entry);
    return entry;
  }
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
  put(entry: CachedCall): void {
    this.mem.set(entry.key, entry);
    if (!this.dir) return;
    const p = this.path(entry.key);
    const tmp = `${p}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(entry) + '\n');
    renameSync(tmp, p);
  }
  /** Every entry for this model (memory and disk), for measured token averages. */
  entries(model?: string): CachedCall[] {
    const out = new Map(this.mem);
    if (this.dir && existsSync(this.dir)) {
      for (const f of readdirSync(this.dir)) {
        if (!f.endsWith('.json')) continue;
        const key = f.slice(0, -5);
        if (!out.has(key)) out.set(key, JSON.parse(readFileSync(join(this.dir, f), 'utf8')) as CachedCall);
      }
    }
    return [...out.values()].filter((e) => !model || e.model === model);
  }
}

export const RETRYABLE_STATUS: ReadonlySet<number> = new Set([408, 429, 500, 502, 503, 504, 529]);

export interface TransportOptions {
  /** The real `fetch`, or the fake Messages API for a dry run. */
  network: FetchLike;
  cache: ResponseCache;
  /** Requests in flight at once (default 4). */
  concurrency?: number;
  /** Attempts per request including the first (default 6). */
  maxAttempts?: number;
  /** First backoff delay; doubles each retry (default 1,000 ms). */
  baseDelayMs?: number;
  /** Longest single wait, also the cap on retry-after (default 30,000 ms). */
  maxDelayMs?: number;
  /** Per-attempt timeout (default 30,000 ms). */
  attemptTimeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /** Progress notes (retries); default silent. */
  log?: (msg: string) => void;
}

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function header(init: RequestInit, name: string): string {
  const h = init.headers;
  if (!h) return '';
  if (h instanceof Headers) return h.get(name) ?? '';
  if (Array.isArray(h)) return h.find(([k]) => k?.toLowerCase() === name)?.[1] ?? '';
  const rec = h as Record<string, string>;
  return rec[name] ?? Object.entries(rec).find(([k]) => k.toLowerCase() === name)?.[1] ?? '';
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

async function errorDetail(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: { type?: unknown; message?: unknown } };
    const type = typeof j?.error?.type === 'string' ? j.error.type : 'unknown';
    const msg = typeof j?.error?.message === 'string' ? j.error.message : '';
    return `${type}: ${msg}`.slice(0, 300);
  } catch {
    return 'no JSON error body';
  }
}

/** Retry-after in ms (seconds or an HTTP date), or undefined. */
function retryAfterMs(res: Response, now: number): number | undefined {
  const v = res.headers.get('retry-after');
  if (!v) return undefined;
  const s = Number(v);
  if (Number.isFinite(s) && s >= 0) return s * 1000;
  const t = Date.parse(v);
  return Number.isFinite(t) ? Math.max(0, t - now) : undefined;
}

export class ApiTransport {
  /** Requests sent over the network that returned 200 (cache misses). */
  readonly sent: CachedCall[] = [];
  hits = 0;
  retries = 0;
  fatal?: FatalApiError;
  private active = 0;
  private readonly queue: (() => void)[] = [];
  private readonly inflight = new Map<string, Promise<CachedCall>>();
  private readonly o: Required<Omit<TransportOptions, 'log'>> & { log: (m: string) => void };

  constructor(opts: TransportOptions) {
    this.o = {
      concurrency: 4,
      maxAttempts: 6,
      baseDelayMs: 1000,
      maxDelayMs: 30_000,
      attemptTimeoutMs: 30_000,
      sleep: realSleep,
      now: () => performance.now(),
      log: () => {},
      // Options passed as undefined (e.g. the CLI's `sleep: deps.sleep`) keep their defaults.
      ...(Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)) as TransportOptions),
    };
  }

  /** Most requests ever in flight at once (checked by tests). */
  peak = 0;

  private async acquire(): Promise<void> {
    if (this.active < this.o.concurrency) {
      this.active++;
      this.peak = Math.max(this.peak, this.active);
      return;
    }
    await new Promise<void>((r) => this.queue.push(r));
    this.active++;
    this.peak = Math.max(this.peak, this.active);
  }

  private release(): void {
    this.active--;
    this.queue.shift()?.();
  }

  /** A `fetch` for one AnthropicLlmClient call; `onRecord` receives the call's record. */
  fetchFor(onRecord: (r: CallRecord) => void): FetchLike {
    return async (url, init) => {
      if (this.fatal) throw new Error('eval transport stopped after a fatal API error');
      const body = typeof init.body === 'string' ? init.body : '';
      const version = header(init, 'anthropic-version');
      const key = requestKey(url, version, body);
      const hit = this.o.cache.get(key);
      if (hit) {
        this.hits++;
        onRecord({ key, cached: true, latencyMs: hit.latencyMs, attempts: hit.attempts, response: hit.response });
        return jsonResponse(hit.response);
      }
      const pending = this.inflight.get(key);
      if (pending) {
        const entry = await pending.catch(() => undefined);
        if (!entry) return jsonResponse({ type: 'error', error: { type: 'api_error', message: 'shared request failed' } }, 500);
        this.hits++;
        onRecord({ key, cached: true, latencyMs: entry.latencyMs, attempts: entry.attempts, response: entry.response });
        return jsonResponse(entry.response);
      }
      const model = (() => {
        try {
          return String((JSON.parse(body) as { model?: unknown }).model ?? '');
        } catch {
          return '';
        }
      })();
      const p = this.send(url, init, key, version, model);
      const shared = p.then((r) => (r.ok ? r.entry : Promise.reject(new Error('failed'))));
      shared.catch(() => {}); // waiters handle it; never an unhandled rejection
      this.inflight.set(key, shared);
      try {
        const r = await p;
        if (!r.ok) return r.response;
        onRecord({ key, cached: false, latencyMs: r.entry.latencyMs, attempts: r.entry.attempts, response: r.entry.response });
        return jsonResponse(r.entry.response);
      } finally {
        this.inflight.delete(key);
      }
    };
  }

  private async send(
    url: string,
    init: RequestInit,
    key: string,
    version: string,
    model: string,
  ): Promise<{ ok: true; entry: CachedCall } | { ok: false; response: Response }> {
    await this.acquire();
    try {
      let lastStatus: number | 'network' = 'network';
      for (let attempt = 1; attempt <= this.o.maxAttempts; attempt++) {
        if (this.fatal) break;
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(new Error('attempt timeout')), this.o.attemptTimeoutMs);
        const outer = init.signal;
        const onAbort = () => ac.abort(outer?.reason);
        outer?.addEventListener('abort', onAbort, { once: true });
        const t0 = this.o.now();
        let res: Response | undefined;
        try {
          res = await this.o.network(url, { ...init, signal: ac.signal });
        } catch (e) {
          if (outer?.aborted) throw e;
          lastStatus = 'network';
        } finally {
          clearTimeout(timer);
          outer?.removeEventListener('abort', onAbort);
        }
        if (res && res.status === 200) {
          const response = (await res.json()) as unknown;
          const entry: CachedCall = {
            v: 1,
            key,
            model,
            anthropicVersion: version,
            latencyMs: Math.round((this.o.now() - t0) * 100) / 100,
            attempts: attempt,
            savedAt: new Date().toISOString(),
            response,
          };
          this.o.cache.put(entry);
          this.sent.push(entry);
          return { ok: true, entry };
        }
        let wait: number | undefined;
        if (res) {
          lastStatus = res.status;
          if (!RETRYABLE_STATUS.has(res.status)) {
            this.fatal = { status: res.status, detail: await errorDetail(res), attempts: attempt };
            return { ok: false, response: jsonResponse({ type: 'error' }, res.status) };
          }
          wait = retryAfterMs(res, Date.now());
          await res.text().catch(() => '');
        }
        if (attempt === this.o.maxAttempts) break;
        const delay = Math.min(this.o.maxDelayMs, wait ?? this.o.baseDelayMs * 2 ** (attempt - 1));
        this.retries++;
        this.o.log(`retry ${attempt}/${this.o.maxAttempts - 1} after ${lastStatus}, waiting ${Math.round(delay)} ms`);
        await this.o.sleep(delay);
      }
      if (!this.fatal) {
        this.fatal = { status: lastStatus, detail: `gave up after ${this.o.maxAttempts} attempts`, attempts: this.o.maxAttempts };
      }
      return { ok: false, response: jsonResponse({ type: 'error' }, typeof lastStatus === 'number' ? lastStatus : 503) };
    } finally {
      this.release();
    }
  }
}
