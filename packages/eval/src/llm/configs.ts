/**
 * B2-B4 on @ninth/decoder's real code (plan section 3.4; spec eval-harness Req 3.3-3.6, 8.1).
 *
 *   B2 LLM raw       buildPrompt with no lattice and no guesses (every slot "(none listed)"),
 *                    AnthropicLlmClient, parseReply; what the model says, unfiltered.
 *   B3 LLM+val       the same request (a cache hit after B2), filtered by core validate().
 *   B4 lattice+val   handleDecode itself, with the request the app builds (lattice of 12 words
 *                    per slot, the top 5 ghost beams, partner line, k = 5, trimmed to 4 KB as in
 *                    packages/web/lib/decodeClient.ts buildRequest). Its reply is what a person
 *                    would see, ghost fallback included. Like the app, B4 does not call the model
 *                    when a slot has no lexicon word.
 *
 * Nothing here forks the prompt, the request body or the parser: B2/B3 call `buildPrompt`,
 * `maxTokensFor`, `AnthropicLlmClient.complete` and `parseReply`; B4 calls `handleDecode`. The
 * transport under the client (transport.ts) adds the cache, retries and the concurrency limit.
 * The handler's deadline is lifted to EVAL_TIMEOUT_MS so that quality is measured on every reply;
 * the share of calls slower than the route's 1,200 ms deadline is reported separately.
 */
import { INTENT_POOL, decodeGhost, lattice, normalize, rankByIntent, validate, type LanguageModel, type Lexicon, type Mode, type ReplyIntent } from '@ninth/core';
import {
  apiVersionFor,
  AnthropicLlmClient,
  messagesUrl,
  LlmError,
  StaticFlags,
  anthropicBody,
  buildPrompt,
  costMicros,
  handleDecode,
  maxTokensFor,
  parseReply,
  type DecodeMetrics,
  type DecodeResponse,
  type LlmCallOptions,
  type LlmClient,
  type LlmResult,
  type LlmUsage,
  type ModelProfile,
  type Prompt,
  type QuotaStore,
} from '@ninth/decoder';
import type { LlmConfig } from '../decoders';
import type { DecodeInput, DecodeOutput, Decoder, LlmCallStats } from '../types';
import { requestKey, type ApiTransport, type CallRecord } from './transport';

export const EVAL_TIMEOUT_MS = 10 * 60_000;
/** Mirrors packages/web/lib/decodeClient.ts LIMITS and packages/web/lib/sentence.ts. */
export const APP = { codes: 20, codeLen: 16, perSlot: 12, beams: 5, k: 5, bodyBytes: 4096, partner: 280 } as const;

const LABEL: Record<LlmConfig, string> = { B2: 'B2 LLM raw', B3: 'B3 LLM+val', B4: 'B4 lattice+val' };

export interface LlmRunContext {
  lex: Lexicon;
  /** The bigram model ghost mode uses (B4's beams). */
  lm: LanguageModel;
  profile: ModelProfile;
  transport: ApiTransport;
  /** Sent as x-api-key (and Bearer for MiniMax); never stored. A placeholder in a dry run. */
  apiKey: string;
  /** MiniMax base URL override (MINIMAX_BASE_URL). */
  baseUrl?: string;
}

/**
 * The request the app sends for these keys (decodeClient.ts buildRequest), or null when it sends none.
 * With a reply type (ADR-008) the app decodes a pool of INTENT_POOL, re-ranks it with rankByIntent,
 * sends the top 5 as beams and adds `context.intent`.
 */
export function appRequest(codes: string[], mode: Mode, partner: string | undefined, lex: Lexicon, lm: LanguageModel, intent?: ReplyIntent): Record<string, unknown> | null {
  if (codes.length === 0 || codes.length > APP.codes || codes.some((c) => c.length === 0 || c.length > APP.codeLen)) return null;
  const lat = lattice(codes, lex, APP.perSlot, mode);
  if (lat.some((slot) => slot.length === 0)) return null; // the app waits for a known word
  const beams = intent
    ? rankByIntent(decodeGhost(codes, { lexicon: lex, lm, k: INTENT_POOL, mode }), intent).slice(0, APP.k).map((c) => c.words)
    : decodeGhost(codes, { lexicon: lex, lm, k: APP.k, mode }).map((c) => c.words);
  const context: { recent: string[]; partner?: string; intent?: ReplyIntent } = { recent: [] };
  const req: Record<string, unknown> & { lattice: string[][] } = { v: 1, lang: 'en', mode, codes, lattice: lat, context, k: APP.k };
  if (beams.length > 0) req.beams = beams.slice(0, 10);
  const p = partner?.trim();
  if (p) context.partner = p.slice(0, APP.partner);
  if (intent) context.intent = intent;
  let perSlot: number = APP.perSlot;
  while (new TextEncoder().encode(JSON.stringify(req)).length > APP.bodyBytes && perSlot > 1) {
    perSlot = Math.max(1, Math.floor(perSlot / 2));
    req.lattice = lat.map((slot) => slot.slice(0, perSlot));
  }
  return req;
}

/** B2/B3 prompt: the shipping prompt with nothing listed for any slot. */
export function unconstrainedPrompt(codes: string[], mode: Mode, k: number, partner?: string): Prompt {
  return buildPrompt({ mode, codes, lattice: codes.map(() => []), context: partner ? { partner, recent: [] } : undefined, k });
}

const quotaOff: QuotaStore = { consume: async () => ({ ok: true }), recordCost: async () => {} };

/** An LlmClient that remembers the reply text and error of its one call. */
class RecordingClient implements LlmClient {
  readonly model: string;
  text?: string;
  error?: unknown;
  constructor(private readonly inner: LlmClient) {
    this.model = inner.model;
  }
  async complete(p: Prompt, o: LlmCallOptions): Promise<LlmResult> {
    try {
      const r = await this.inner.complete(p, o);
      this.text = r.text;
      return r;
    } catch (e) {
      this.error = e;
      throw e;
    }
  }
  costMicros(u: LlmUsage): number {
    return this.inner.costMicros(u);
  }
}

/** An LlmClient that captures the prompt the handler builds and then fails (for planning). */
class ProbeClient implements LlmClient {
  readonly model = 'probe';
  prompt?: Prompt;
  maxTokens?: number;
  async complete(p: Prompt, o: LlmCallOptions): Promise<LlmResult> {
    this.prompt = p;
    this.maxTokens = o.maxTokens;
    throw new Error('probe');
  }
  costMicros(): number {
    return 0;
  }
}

interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

export function emptyStats(): LlmCallStats {
  return { calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, usdMicros: 0, latencyMs: [], refusals: 0, unparseable: 0, degraded: 0, skipped: 0 };
}

export function addRecord(s: LlmCallStats, r: CallRecord, profile: ModelProfile): void {
  const u = ((r.response as { usage?: Usage } | null)?.usage ?? {}) as Usage;
  const usage = {
    inputTokens: u.input_tokens ?? 0,
    outputTokens: u.output_tokens ?? 0,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
  };
  s.calls++;
  s.inputTokens += usage.inputTokens;
  s.outputTokens += usage.outputTokens;
  s.cacheReadTokens += usage.cacheReadTokens;
  s.cacheWriteTokens += usage.cacheWriteTokens;
  s.usdMicros += costMicros(profile, usage);
  s.latencyMs.push(r.latencyMs);
}

function dedupe(cands: string[][]): string[][] {
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const c of cands) {
    const key = c.join(' ');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

function failIfFatal(t: ApiTransport): void {
  if (t.fatal) throw new Error(`Messages API error ${t.fatal.status} (${t.fatal.detail}) after ${t.fatal.attempts} attempt(s); no results written`);
}

function client(ctx: LlmRunContext, records: CallRecord[]): AnthropicLlmClient {
  return new AnthropicLlmClient({ apiKey: ctx.apiKey, model: ctx.profile.id, baseUrl: ctx.baseUrl, fetch: ctx.transport.fetchFor((r) => records.push(r)) });
}

/** B2 or B3: one unconstrained call; B3 keeps only sentences that pass validate(). */
function unconstrainedDecoder(id: 'B2' | 'B3', ctx: LlmRunContext): Decoder {
  return {
    id,
    label: LABEL[id],
    deterministic: false,
    validated: id === 'B3',
    async decode({ codes, mode, k, partner }: DecodeInput): Promise<DecodeOutput> {
      const records: CallRecord[] = [];
      const llm = client(ctx, records);
      const stats = emptyStats();
      let text = '';
      try {
        text = (await llm.complete(unconstrainedPrompt(codes, mode, k, partner), { maxTokens: maxTokensFor(codes.length, k), signal: new AbortController().signal })).text;
      } catch (e) {
        failIfFatal(ctx.transport);
        if (e instanceof LlmError && e.kind === 'refusal') stats.refusals++;
        else if (!(e instanceof LlmError && e.kind === 'bad_response')) throw e;
      }
      for (const r of records) addRecord(stats, r, ctx.profile);
      const reply = parseReply(text);
      if (reply.unparseable && stats.refusals === 0) stats.unparseable++;
      const raw = dedupe(reply.candidates.map((c) => c.map(normalize)));
      const candidates = id === 'B2' ? raw : raw.filter((c) => validate(c, codes, mode));
      return { candidates, raw, usd: stats.usdMicros / 1e6, llm: stats };
    },
  };
}

/** B4: the shipping design, through handleDecode. */
function latticeDecoder(ctx: LlmRunContext): Decoder {
  return {
    id: 'B4',
    label: LABEL.B4,
    deterministic: false,
    validated: true,
    async decode({ codes, mode, partner, intent }: DecodeInput): Promise<DecodeOutput> {
      const stats = emptyStats();
      const body = appRequest(codes, mode, partner, ctx.lex, ctx.lm, intent);
      if (!body) {
        stats.skipped++;
        return { candidates: [], raw: [], usd: 0, llm: stats };
      }
      const records: CallRecord[] = [];
      const rec = new RecordingClient(client(ctx, records));
      let metrics: DecodeMetrics | undefined;
      const res = await handleDecode(body, { ipHash: 'eval' }, {
        llm: rec,
        quota: quotaOff,
        flags: new StaticFlags(true),
        now: () => Date.now(),
        options: { timeoutMs: EVAL_TIMEOUT_MS, log: (m) => (metrics = m) },
      });
      failIfFatal(ctx.transport);
      if (res.status !== 200) throw new Error(`handleDecode answered ${res.status} for an app-shaped request: ${JSON.stringify(res.json)}`);
      const json = res.json as DecodeResponse;
      for (const r of records) addRecord(stats, r, ctx.profile);
      if (rec.error instanceof LlmError && rec.error.kind === 'refusal') stats.refusals++;
      if (metrics?.outcome === 'degraded_parse') stats.unparseable++;
      if (json.degraded) stats.degraded++;
      const raw = rec.text === undefined ? [] : dedupe(parseReply(rec.text).candidates.map((c) => c.map(normalize)));
      return { candidates: json.candidates.map((c) => c.words), raw, usd: stats.usdMicros / 1e6, llm: stats };
    },
  };
}

export function llmDecoders(ids: readonly LlmConfig[], ctx: LlmRunContext): Decoder[] {
  return ids.map((id) => (id === 'B4' ? latticeDecoder(ctx) : unconstrainedDecoder(id, ctx)));
}

/** One request a config will send for one item, computed offline (for the cost plan). */
export interface PlannedCall {
  config: LlmConfig;
  itemId: string;
  key: string;
  prompt: Prompt;
  maxTokens: number;
}

const bodyKey = (profile: ModelProfile, prompt: Prompt, maxTokens: number) =>
  requestKey(messagesUrl(profile.provider), apiVersionFor(profile.provider), JSON.stringify(anthropicBody(profile, prompt, maxTokens)));

/**
 * The exact requests a run will send, without sending any: B2/B3 build the same prompt the
 * decoder does; B4 runs handleDecode with a client that captures the prompt and fails.
 */
export async function planCalls(
  ids: readonly LlmConfig[],
  items: readonly { id: string; codes: string[]; partner?: string; intent?: ReplyIntent }[],
  mode: Mode,
  k: number,
  ctx: Pick<LlmRunContext, 'lex' | 'lm' | 'profile'>,
): Promise<PlannedCall[]> {
  const out: PlannedCall[] = [];
  for (const config of ids) {
    for (const item of items) {
      if (config === 'B4') {
        const body = appRequest(item.codes, mode, item.partner, ctx.lex, ctx.lm, item.intent);
        if (!body) continue;
        const probe = new ProbeClient();
        await handleDecode(body, { ipHash: 'plan' }, { llm: probe, quota: quotaOff, flags: new StaticFlags(true), now: () => 0, options: { log: () => {} } });
        if (!probe.prompt || probe.maxTokens === undefined) throw new Error(`plan: handleDecode built no prompt for ${item.id}`);
        out.push({ config, itemId: item.id, key: bodyKey(ctx.profile, probe.prompt, probe.maxTokens), prompt: probe.prompt, maxTokens: probe.maxTokens });
      } else {
        const prompt = unconstrainedPrompt(item.codes, mode, k, item.partner);
        const maxTokens = maxTokensFor(item.codes.length, k);
        out.push({ config, itemId: item.id, key: bodyKey(ctx.profile, prompt, maxTokens), prompt, maxTokens });
      }
    }
  }
  return out;
}
