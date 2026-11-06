/**
 * Model ranking client (contracts.md §3, source plan §4.3). Optional and off by default.
 * - Sends the keys (codes plus the offline lattice) and the partner's last line. Nothing else.
 * - Any non-200, bad JSON or more than 1,500 ms -> null, and the screen stays in ghost mode.
 * - Every returned sentence is checked again here with validate(); the proof panel uses this result.
 * - Nothing here speaks. Speak is always a separate press.
 */
import { proof, validate, type Candidate, type Lexicon, type Mode, type WordProof } from '@ninth/core';

export const DECODE_TIMEOUT_MS = 1500;
export const LIMITS = { codes: 20, codeLen: 16, partner: 280, recent: 3, perSlot: 12, beams: 10, bodyBytes: 4096 } as const;

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
  context: { partner?: string; recent: string[] };
  k: number;
}

export interface RejectedSuggestion {
  words: string[];
  proof: WordProof[];
}

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
  // Keep under the 4 KB body limit: trim the lattice first, never the codes.
  let perSlot: number = LIMITS.perSlot;
  while (new TextEncoder().encode(JSON.stringify(req)).length > LIMITS.bodyBytes && perSlot > 1) {
    perSlot = Math.max(1, Math.floor(perSlot / 2));
    req.lattice = lat.map((slot) => slot.slice(0, perSlot));
  }
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
  return { candidates, rejected, rejectedCount, model: typeof body.model === 'string' ? body.model : undefined };
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

/** Small LRU on codes + partner line (source plan §4.5 step 5). */
export class DecodeCache {
  private map = new Map<string, RemoteResult>();
  constructor(private max = 20) {}
  static key(codes: string[], partner?: string): string {
    return `${codes.join(' ')}|${partner?.trim() ?? ''}`;
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
