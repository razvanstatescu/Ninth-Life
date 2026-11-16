/**
 * Model ranking client (contracts.md §3, source plan §4.3). Optional and off by default.
 * - Sends the keys (codes plus the offline lattice and ghost beams), the partner's last line, the reply
 *   type picked (Agree, Disagree or Ask; only when one is pressed, web-ui Req 29.8, ADR-008) and, only
 *   when "Include what you said" is on, your last 3 sentences in this conversation (web-ui Req 27.11).
 *   Nothing else. The beams are already in the reply type's order, so the server's fallback follows it.
 * - Any non-200, bad JSON or more than DECODE_TIMEOUT_MS (1,500 ms by default; set at build time
 *   from the server's DECODE_TIMEOUT_MS, lib/publicEnv.mjs) -> null, and the screen stays in ghost mode.
 * - Every returned sentence is checked again here with validate(); the proof panel uses this result.
 * - Words the server says the model got wrong (`rejectedWords`, F7) are checked too and only ever
 *   shown struck through; they never become candidates.
 * - Nothing here speaks. Speak is always a separate press.
 */
import { isReplyIntent, proof, validate, type Candidate, type Lexicon, type Mode, type ReplyIntent, type WordProof } from '@ninth/core';

export const DEFAULT_DECODE_TIMEOUT_MS = 1500;

/** Client budget: NEXT_PUBLIC_DECODE_TIMEOUT_MS (inlined at build), clamped to 500-9,500 ms. */
export function clientTimeoutMs(v: string | undefined = process.env.NEXT_PUBLIC_DECODE_TIMEOUT_MS): number {
  const n = Number(v);
  if (!v || !Number.isFinite(n)) return DEFAULT_DECODE_TIMEOUT_MS;
  return Math.min(9500, Math.max(500, Math.round(n)));
}

export const DECODE_TIMEOUT_MS = clientTimeoutMs();
export const LIMITS = { codes: 20, codeLen: 16, partner: 280, recent: 3, recentChars: 280, perSlot: 12, beams: 10, bodyBytes: 4096 } as const;

export function decodeUrl(): string {
  return process.env.NEXT_PUBLIC_DECODE_URL || '/api/decode';
}

export interface DecodeRequest {
  v: 1;
  lang: 'en';
  mode: Mode;
  codes: string[];
  lattice: string[][];
  /** Top ghost sentences, best first; the server falls back to these if the model fails. */
  beams?: string[][];
  /** `intent` only when a reply type is pressed; the key is left out otherwise (never null). */
  context: { partner?: string; recent: string[]; intent?: ReplyIntent };
  k: number;
}

export interface RejectedSuggestion {
  words: string[];
  proof: WordProof[];
  /**
   * Set when this is one word the server rejected (`rejectedWords`, F7) rather than a whole
   * sentence: the slot it was suggested for. `words` is then `[word]` and `proof` its verdict.
   */
  slot?: number;
}

/** F7: at most this many server-rejected words are shown, each a-z/apostrophe, at most 16 characters. */
export const MAX_REJECTED_WORDS = 5;
const REJECTED_WORD = /^[a-z]+(?:'[a-z]+)*$/;

export interface RemoteResult {
  candidates: Candidate[];
  /** Suggestions that failed the client-side check (shown struck through, never spoken). */
  rejected: RejectedSuggestion[];
  /** How many suggestions the server already dropped for not matching the keys. */
  rejectedCount: number;
  model?: string;
  ms: number;
}

export function buildRequest(
  codes: string[],
  lat: string[][],
  partner: string | undefined,
  mode: Mode,
  k = 5,
  beams: string[][] = [],
  recent: readonly string[] = [],
  intent?: ReplyIntent,
): DecodeRequest | null {
  if (codes.length === 0 || codes.length > LIMITS.codes) return null;
  if (codes.some((c) => c.length === 0 || c.length > LIMITS.codeLen || !/^[2-9]+$/.test(c))) return null;
  const req: DecodeRequest = {
    v: 1,
    lang: 'en',
    mode,
    codes,
    lattice: lat.map((slot) => slot.slice(0, LIMITS.perSlot)),
    context: { recent: [] },
    k,
  };
  if (beams.length > 0) req.beams = beams.slice(0, LIMITS.beams);
  const p = partner?.trim();
  if (p) req.context.partner = p.slice(0, LIMITS.partner);
  req.context.recent = recent
    .map((r) => r.trim().slice(0, LIMITS.recentChars))
    .filter(Boolean)
    .slice(-LIMITS.recent);
  if (isReplyIntent(intent)) req.context.intent = intent;
  // Keep under the 4 KB body limit: trim the lattice first, never the codes; then drop the oldest
  // recent sentences (long non-Latin text can be 3 bytes a character).
  const size = () => new TextEncoder().encode(JSON.stringify(req)).length;
  let perSlot: number = LIMITS.perSlot;
  while (size() > LIMITS.bodyBytes && perSlot > 1) {
    perSlot = Math.max(1, Math.floor(perSlot / 2));
    req.lattice = lat.map((slot) => slot.slice(0, perSlot));
  }
  while (size() > LIMITS.bodyBytes && req.context.recent.length > 0) req.context.recent = req.context.recent.slice(1);
  return req;
}

/** Validate a server response against the keys. Pure, for tests. */
export function checkResponse(json: unknown, codes: string[], lexicon: Lexicon, mode: Mode): Omit<RemoteResult, 'ms'> | null {
  const body = json as { v?: unknown; candidates?: unknown; model?: unknown; rejected?: unknown };
  if (!body || typeof body !== 'object' || !Array.isArray(body.candidates)) return null;
  const candidates: Candidate[] = [];
  const rejected: RejectedSuggestion[] = [];
  for (const raw of body.candidates) {
    const item = raw as { words?: unknown; source?: unknown };
    const words = item?.words;
    if (!Array.isArray(words) || !words.every((w) => typeof w === 'string')) continue;
    const ws = (words as string[]).map((w) => w.toLowerCase());
    const source = item.source === 'ghost' ? 'ghost' : 'llm';
    if (validate(ws, codes, mode)) candidates.push({ words: ws, score: 0, source });
    else rejected.push({ words: ws, proof: proof(ws, codes, lexicon, mode) });
  }
  const rejectedCount = typeof body.rejected === 'number' && body.rejected >= 0 ? Math.floor(body.rejected) : 0;
  rejected.push(...checkRejectedWords((json as { rejectedWords?: unknown }).rejectedWords, codes, lexicon, mode, candidates, rejected));
  return { candidates, rejected, rejectedCount, model: typeof body.model === 'string' ? body.model : undefined };
}

/**
 * Server-reported rejected words (F7), re-checked: the slot must exist, the code must be that
 * slot's code, the word must be a short a-z/apostrophe word that really does NOT match the keys,
 * and it must not be a word of any sentence that can be spoken. Anything else is ignored.
 */
function checkRejectedWords(
  raw: unknown,
  codes: string[],
  lexicon: Lexicon,
  mode: Mode,
  candidates: Candidate[],
  already: RejectedSuggestion[],
): RejectedSuggestion[] {
  if (!Array.isArray(raw)) return [];
  const spoken = new Set(candidates.flatMap((c) => c.words));
  const seen = new Set(already.flatMap((r) => r.proof.map((p, i) => `${i}:${p.word}`)));
  const out: RejectedSuggestion[] = [];
  for (const item of raw.slice(0, MAX_REJECTED_WORDS)) {
    const { slot, word, expectedCode } = (item ?? {}) as { slot?: unknown; word?: unknown; expectedCode?: unknown };
    if (typeof slot !== 'number' || !Number.isInteger(slot) || slot < 0 || slot >= codes.length) continue;
    if (typeof word !== 'string' || word.length > 16 || !REJECTED_WORD.test(word)) continue;
    if (expectedCode !== codes[slot] || validate([word], [codes[slot]!], mode)) continue;
    if (spoken.has(word) || seen.has(`${slot}:${word}`)) continue;
    seen.add(`${slot}:${word}`);
    out.push({ words: [word], proof: proof([word], [codes[slot]!], lexicon, mode), slot });
  }
  return out;
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export async function decodeRemote(
  req: DecodeRequest,
  lexicon: Lexicon,
  opts: { fetchImpl?: FetchLike; timeoutMs?: number; signal?: AbortSignal; url?: string } = {},
): Promise<RemoteResult | null> {
  const fetchImpl = opts.fetchImpl ?? ((u, i) => fetch(u, i));
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  opts.signal?.addEventListener('abort', onAbort);
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      ctrl.abort();
      resolve(null);
    }, opts.timeoutMs ?? DECODE_TIMEOUT_MS);
  });
  const work = (async () => {
    try {
      const res = await fetchImpl(opts.url ?? decodeUrl(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(req),
        signal: ctrl.signal,
        cache: 'no-store',
        credentials: 'omit',
      });
      if (res.status !== 200) return null;
      const checked = checkResponse(await res.json(), req.codes, lexicon, req.mode);
      return checked ? { ...checked, ms: Date.now() - started } : null;
    } catch {
      return null;
    }
  })();
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Small LRU on codes + partner line + recent sentences + reply type + pinned words (source plan §4.5
 * step 5; web-ui Req 27.11, 29.8, 30.1).
 */
export class DecodeCache {
  private map = new Map<string, RemoteResult>();
  constructor(private max = 20) {}
  static key(codes: string[], partner?: string, recent: readonly string[] = [], intent?: ReplyIntent, pins: readonly (string | undefined)[] = []): string {
    let key = `${codes.join(' ')}|${partner?.trim() ?? ''}`;
    // JSON keeps the recent lines apart whatever they contain; no recent keeps the old key.
    if (recent.length > 0) key += `|${JSON.stringify(recent)}`;
    // A reply type is one of three fixed words, so it cannot run into the other parts; none keeps the old key.
    if (intent) key += `|intent:${intent}`;
    // Pinned words are sent as one-word slots (web-ui Req 30.1), so they make a different request; none keeps the old key.
    if (pins.some(Boolean)) key += `|pins:${JSON.stringify(pins.map((p) => p ?? null))}`;
    return key;
  }
  get(key: string): RemoteResult | undefined {
    const v = this.map.get(key);
    if (v) {
      this.map.delete(key);
      this.map.set(key, v);
    }
    return v;
  }
  set(key: string, v: RemoteResult): void {
    this.map.delete(key);
    this.map.set(key, v);
    while (this.map.size > this.max) this.map.delete(this.map.keys().next().value!);
  }
}
