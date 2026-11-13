import { formatSentence, normalize, validate } from '@ninth/core';
import type { Flags } from './flags.js';
import type { LlmClient, LlmResult } from './llm.js';
import { consoleMetrics, safeErrorName, upstreamStatus, type DecodeMetrics, type MetricsLogger } from './log.js';
import { parseReply } from './parse.js';
import { buildPrompt, estimateTokens } from './prompt.js';
import type { QuotaStore } from './quota.js';
import {
  DecodeRequestSchema,
  LIMITS,
  REJECTED_WORD_RE,
  issuePaths,
  readBody,
  type DecodeCandidate,
  type DecodeRequest,
  type DecodeResponse,
  type ErrorBody,
  type RejectedWord,
} from './schema.js';

// handleDecode: the framework-agnostic decode endpoint (docs/architecture/contracts.md §3).
//
// validate input -> kill switch -> quota -> LLM with timeout -> parse -> validate every candidate
// with @ninth/core -> dedupe -> merge with the request's ghost beams -> top k.
// Any LLM failure returns 200 with ghost beams and `degraded: true`.
// `context.intent` (reply type, DS-9) reaches only the prompt, through buildPrompt. It is never
// logged, and the ghost fallback keeps the client's beam order, which the client re-ranked for it.

export interface DecodeOptions {
  /** Server-side LLM deadline. Below the client's 1,500 ms so the reply still arrives in time. */
  timeoutMs?: number;
  /** Override the computed max_tokens. */
  maxTokens?: number;
  log?: MetricsLogger;
}

export interface DecodeDeps {
  llm: LlmClient;
  quota: QuotaStore;
  flags: Flags;
  now(): number;
  options?: DecodeOptions;
}

export interface DecodeResult {
  status: number;
  json: DecodeResponse | ErrorBody;
  headers?: Record<string, string>;
}

export const DEFAULT_TIMEOUT_MS = 1200;

const BASE_HEADERS = { 'content-type': 'application/json', 'cache-control': 'no-store' } as const;

/** max_tokens: 120 per the plan, more only for long sentences, capped at 400. */
export function maxTokensFor(slots: number, k: number): number {
  return Math.min(400, Math.max(120, 16 + k * (slots * 4 + 3)));
}

class Timeout extends Error {
  override name = 'TimeoutError';
}

async function callWithTimeout(llm: LlmClient, prompt: ReturnType<typeof buildPrompt>, maxTokens: number, ms: number) {
  const ac = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Timeout('llm timeout');
      ac.abort(err);
      reject(err);
    }, ms);
  });
  try {
    return await Promise.race([llm.complete(prompt, { maxTokens, signal: ac.signal }), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

const key = (words: string[]) => words.join(' ');

/**
 * F7: the words of rejected model candidates that do not match their slot, for the proof panel.
 * Only candidates with one word per slot (otherwise the words do not line up with the keys), only
 * words that are already normalized a-z/apostrophe and at most 16 characters, never a word that is
 * also in a returned candidate, one entry per (slot, word), at most 5. Not logged (DS-6).
 */
export function rejectedWordsOf(rejectedCands: string[][], codes: string[], mode: 'letter' | 'initials', returned: string[][]): RejectedWord[] {
  const spoken = new Set(returned.flat());
  const out: RejectedWord[] = [];
  const seen = new Set<string>();
  for (const cand of rejectedCands) {
    if (cand.length !== codes.length) continue;
    for (let slot = 0; slot < cand.length && out.length < LIMITS.maxRejectedWords; slot++) {
      const word = cand[slot]!;
      const expectedCode = codes[slot]!;
      if (validate([word], [expectedCode], mode)) continue; // this word matched; another one failed
      if (word.length > LIMITS.maxRejectedWordChars || !REJECTED_WORD_RE.test(word)) continue;
      if (spoken.has(word) || seen.has(`${slot}:${word}`)) continue;
      seen.add(`${slot}:${word}`);
      out.push({ slot, word, expectedCode });
    }
    if (out.length >= LIMITS.maxRejectedWords) break;
  }
  return out;
}

function toCandidate(words: string[], latticeSets: Set<string>[], source: 'llm' | 'ghost'): DecodeCandidate {
  return {
    text: formatSentence(words),
    words,
    valid: true,
    oov: words.filter((w, i) => !latticeSets[i]?.has(w)),
    source,
  };
}

export async function handleDecode(
  body: unknown,
  meta: { ipHash: string; origin?: string },
  deps: DecodeDeps,
): Promise<DecodeResult> {
  const t0 = deps.now();
  const log = deps.options?.log ?? consoleMetrics;
  const finish = (status: number, json: DecodeResponse | ErrorBody, m: Omit<DecodeMetrics, 'event' | 'status' | 'ms'>, headers?: Record<string, string>): DecodeResult => {
    log({ event: 'decode', status, ms: deps.now() - t0, ...m });
    return { status, json, headers: { ...BASE_HEADERS, ...headers } };
  };

  // 1. Size and shape.
  const raw = readBody(body);
  if (!raw.ok) return finish(raw.status, raw.json, { outcome: raw.status === 413 ? 'too_large' : 'bad_request' });
  const parsed = DecodeRequestSchema.safeParse(raw.value);
  if (!parsed.success) {
    return finish(400, { error: 'bad_request', issues: issuePaths(parsed.error) }, { outcome: 'bad_request' });
  }
  const req: DecodeRequest = parsed.data;
  const { codes, mode, k } = req;

  // Client hints are untrusted: keep only lattice words and beams that match the keys.
  // Words are canonicalized with core's normalize() first, so the text we return is exactly the
  // text the validator checked (no hidden combining marks or case tricks).
  const lattice = codes.map((code, i) =>
    (req.lattice[i] ?? []).map(normalize).filter((w) => validate([w], [code], mode)),
  );
  const latticeSets = lattice.map((slot) => new Set(slot));
  const ghost: string[][] = [];
  const seen = new Set<string>();
  for (const b of req.beams ?? []) {
    const words = b.map(normalize);
    if (validate(words, codes, mode) && !seen.has(key(words))) {
      seen.add(key(words));
      ghost.push(words);
    }
  }
  const ghostOnly = (rejected: number, outcome: DecodeMetrics['outcome'], extra: Partial<DecodeMetrics> = {}) =>
    finish(
      200,
      {
        v: 1,
        candidates: ghost.slice(0, k).map((w) => toCandidate(w, latticeSets, 'ghost')),
        rejected,
        rejectedWords: [],
        model: 'ghost',
        ms: deps.now() - t0,
        degraded: true,
      },
      { outcome, slots: codes.length, returned: Math.min(k, ghost.length), rejected, ...extra },
    );

  // 2. Kill switch.
  if (!(await deps.flags.llmEnabled())) {
    return finish(503, { error: 'llm_disabled', reason: 'kill_switch' }, { outcome: 'llm_disabled' });
  }

  // 3. Quotas (fail closed if the store is down).
  let decision;
  try {
    decision = await deps.quota.consume(meta.ipHash, t0);
  } catch (e) {
    return finish(503, { error: 'unavailable' }, { outcome: 'quota_error', errorName: safeErrorName(e) });
  }
  if (!decision.ok) {
    if (decision.scope === 'global') {
      return finish(503, { error: 'llm_disabled', reason: 'daily_cap' }, { outcome: 'daily_cap' });
    }
    return finish(
      429,
      { error: 'rate_limited', retryAfter: decision.retryAfter },
      { outcome: 'rate_limited' },
      { 'retry-after': String(decision.retryAfter) },
    );
  }

  // 4. LLM.
  const prompt = buildPrompt({ ...req, lattice, beams: ghost });
  const maxTokens = deps.options?.maxTokens ?? maxTokensFor(codes.length, k);
  const tLlm = deps.now();
  let result: LlmResult;
  try {
    result = await callWithTimeout(deps.llm, prompt, maxTokens, deps.options?.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  } catch (e) {
    // The call may still be billed: reserve a worst-case estimate against the dollar cap.
    const reserve = deps.llm.costMicros({
      inputTokens: estimateTokens(prompt.system) + estimateTokens(prompt.user),
      outputTokens: maxTokens,
    });
    await deps.quota.recordCost(t0, reserve).catch(() => {});
    const outcome = e instanceof Timeout ? 'degraded_timeout' : 'degraded_error';
    return ghostOnly(0, outcome, { llmMs: deps.now() - tLlm, usdMicros: reserve, model: deps.llm.model, errorName: safeErrorName(e), upstreamStatus: upstreamStatus(e) });
  }
  const llmMs = deps.now() - tLlm;
  const usdMicros = deps.llm.costMicros(result.usage);
  await deps.quota.recordCost(t0, usdMicros).catch(() => {});
  const usage = {
    llmMs,
    usdMicros,
    model: deps.llm.model,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    cacheReadTokens: result.usage.cacheReadTokens,
  };

  // 5. Parse, then validate every candidate. Only validated words can reach the response.
  const reply = parseReply(result.text);
  if (reply.unparseable) return ghostOnly(0, 'degraded_parse', usage);
  let rejected = reply.malformed;
  const llmWords: string[][] = [];
  const llmSeen = new Set<string>();
  const rejectedCands: string[][] = [];
  for (const rawCand of reply.candidates) {
    const cand = rawCand.map(normalize);
    if (!validate(cand, codes, mode)) {
      rejected++;
      rejectedCands.push(cand);
      continue;
    }
    if (llmSeen.has(key(cand))) continue;
    llmSeen.add(key(cand));
    llmWords.push(cand);
  }

  // 6. Merge: model order first, then ghost beams the model did not return. Top k.
  const out: DecodeCandidate[] = llmWords.map((w) => toCandidate(w, latticeSets, 'llm'));
  for (const g of ghost) if (!llmSeen.has(key(g))) out.push(toCandidate(g, latticeSets, 'ghost'));
  const candidates = out.slice(0, k);
  const degraded = llmWords.length === 0;
  const rejectedWords = rejectedWordsOf(rejectedCands, codes, mode, candidates.map((c) => c.words));

  return finish(
    200,
    { v: 1, candidates, rejected, rejectedWords, model: deps.llm.model, ms: deps.now() - t0, degraded },
    { outcome: 'ok', slots: codes.length, returned: candidates.length, rejected, ...usage },
  );
}
