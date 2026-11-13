import type { ReplyIntent } from '@ninth/core';
import { z } from 'zod';

// Request and response shapes for POST /api/decode (Next.js Route Handler on Vercel).
// Source: docs/plan/00-source-plan.md §4.3 and docs/architecture/contracts.md §3.

export const LIMITS = {
  maxBodyBytes: 4096,
  maxCodes: 20,
  maxCodeDigits: 16,
  maxPartnerChars: 280,
  maxRecent: 3,
  maxRecentChars: 280,
  maxSlotWords: 12,
  maxWordChars: 32,
  maxBeams: 10,
  maxK: 5,
  defaultK: 5,
  /** Response: at most this many rejected model words (F7, ADR-decoder-001). */
  maxRejectedWords: 5,
  /** Response: a rejected word longer than this is not shown at all. */
  maxRejectedWordChars: 16,
} as const;

/** Reply types the service accepts (the same three as `ReplyIntent` in @ninth/core). */
export const REPLY_INTENT_VALUES = ['agree', 'disagree', 'ask'] as const satisfies readonly ReplyIntent[];

const code = z.string().regex(/^[2-9]+$/, 'code must be digits 2-9').max(LIMITS.maxCodeDigits);
// Lattice and beam words are hints from the client. They are untrusted and re-validated.
const word = z.string().min(1).max(LIMITS.maxWordChars);

export const DecodeRequestSchema = z
  .object({
    v: z.literal(1),
    lang: z.literal('en'),
    mode: z.enum(['letter', 'initials']).default('letter'),
    codes: z.array(code).min(1).max(LIMITS.maxCodes),
    lattice: z.array(z.array(word).max(LIMITS.maxSlotWords)).max(LIMITS.maxCodes),
    /** Top ghost-mode beams from the client, best first (optional). */
    beams: z.array(z.array(word).max(LIMITS.maxCodes)).max(LIMITS.maxBeams).optional(),
    context: z
      .object({
        partner: z.string().max(LIMITS.maxPartnerChars).optional(),
        recent: z.array(z.string().max(LIMITS.maxRecentChars)).max(LIMITS.maxRecent).optional(),
        /**
         * Reply type the person picked (DS-9, ADR-008). It only orders readings of the same keys;
         * any other value is a 400 that names the path, never the value. Never logged (DS-6.1).
         */
        intent: z.enum(REPLY_INTENT_VALUES).optional(),
      })
      .strict()
      .optional(),
    k: z.number().int().min(1).max(LIMITS.maxK).default(LIMITS.defaultK),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (r.lattice.length !== r.codes.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['lattice'], message: 'lattice length must equal codes length' });
    }
    if (r.mode === 'initials' && r.codes.some((c) => c.length !== 1)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['codes'], message: 'initials mode takes one digit per word' });
    }
  });

export type DecodeRequest = z.infer<typeof DecodeRequestSchema>;

export interface DecodeCandidate {
  text: string;
  words: string[];
  valid: true;
  /** Words that pass the key check but were not in the client's lattice slot (amber in the proof panel). */
  oov: string[];
  source: 'llm' | 'ghost';
}

/**
 * A word the model suggested that does not match its slot's keys (F7, ADR-decoder-001). Shown
 * struck through in the proof panel, never spoken. Only normalized a-z words with internal
 * apostrophes, at most 16 characters, ever appear here: never other model text.
 */
export interface RejectedWord {
  /** Index into `codes` of the slot the model put the word in. */
  slot: number;
  word: string;
  /** The slot's code, i.e. the keys the person pressed there. */
  expectedCode: string;
}

/** Shape of a rejected word: a-z with single internal apostrophes, 1-16 characters. */
export const REJECTED_WORD_RE = /^[a-z]+(?:'[a-z]+)*$/;

export const RejectedWordSchema = z
  .object({
    slot: z.number().int().min(0).max(LIMITS.maxCodes - 1),
    word: z.string().max(LIMITS.maxRejectedWordChars).regex(REJECTED_WORD_RE),
    expectedCode: code,
  })
  .strict();

export interface DecodeResponse {
  v: 1;
  candidates: DecodeCandidate[];
  /** LLM candidates dropped because they do not encode to the keys pressed. */
  rejected: number;
  /**
   * Additive (F7): up to 5 of the words that made those candidates fail, model order, one entry
   * per (slot, word). Never a word that appears in `candidates`. `[]` when nothing was rejected,
   * when the model was not asked or failed, or when a rejected sentence had the wrong number of
   * words (its words do not line up with the slots).
   */
  rejectedWords: RejectedWord[];
  model: string;
  ms: number;
  degraded: boolean;
}

/** Response check, for tests and for any consumer that wants to verify a reply. */
export const DecodeResponseSchema = z
  .object({
    v: z.literal(1),
    candidates: z.array(
      z
        .object({
          text: z.string(),
          words: z.array(z.string()),
          valid: z.literal(true),
          oov: z.array(z.string()),
          source: z.enum(['llm', 'ghost']),
        })
        .strict(),
    ).max(LIMITS.maxK),
    rejected: z.number().int().min(0),
    rejectedWords: z.array(RejectedWordSchema).max(LIMITS.maxRejectedWords),
    model: z.string(),
    ms: z.number(),
    degraded: z.boolean(),
  })
  .strict();

export type ErrorBody =
  | { error: 'bad_request'; issues: string[] }
  | { error: 'too_large'; maxBytes: number }
  | { error: 'rate_limited'; retryAfter: number }
  | { error: 'llm_disabled'; reason: 'kill_switch' | 'daily_cap' }
  | { error: 'unavailable' }
  | { error: 'forbidden_origin' }
  | { error: 'method_not_allowed' };

export type ReadBodyResult = { ok: true; value: unknown } | { ok: false; status: 400 | 413; json: ErrorBody };

/**
 * Enforce the 4 KB limit and parse JSON. Accepts the raw string (preferred: adapters pass the
 * untouched body) or an already-parsed value, which is re-serialized to measure its size.
 */
export function readBody(body: unknown): ReadBodyResult {
  let raw: string;
  if (typeof body === 'string') raw = body;
  else if (body instanceof Uint8Array) raw = new TextDecoder().decode(body);
  else {
    try {
      raw = JSON.stringify(body) ?? '';
    } catch {
      return { ok: false, status: 400, json: { error: 'bad_request', issues: ['body is not JSON'] } };
    }
  }
  const bytes = new TextEncoder().encode(raw).length;
  if (bytes > LIMITS.maxBodyBytes) {
    return { ok: false, status: 413, json: { error: 'too_large', maxBytes: LIMITS.maxBodyBytes } };
  }
  if (typeof body !== 'string' && !(body instanceof Uint8Array)) return { ok: true, value: body };
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false, status: 400, json: { error: 'bad_request', issues: ['body is not JSON'] } };
  }
}

/** Zod issues as short path strings. Never echoes input values (privacy: no body in responses or logs). */
export function issuePaths(err: z.ZodError): string[] {
  return err.issues.slice(0, 10).map((i) => `${i.path.join('.') || '(root)'}: ${i.code}`);
}
