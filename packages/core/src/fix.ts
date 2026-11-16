/**
 * Words one key away (web-ui Req 32.2, 32.4; ADR-009): for a slip, the codes that differ from the keys
 * typed by one key changed, added or removed, and the dictionary words with those codes. Nothing here
 * changes a sentence: the app offers these, and only a press takes one. The validator then checks the
 * new keys as usual.
 */
import { isCode } from './keymap';
import type { Lexicon } from './lexicon';
import type { LanguageModel } from './lm';

/** How one code becomes another: one key changed, added (a missed key) or removed (an extra key). */
export type CodeEdit =
  | { kind: 'change'; at: number; from: string; to: string }
  | { kind: 'add'; at: number; to: string }
  | { kind: 'remove'; at: number; from: string };

export interface KeyFix {
  word: string;
  /** The word's code: the keys after the fix. */
  code: string;
  edit: CodeEdit;
}

const KEYS = ['2', '3', '4', '5', '6', '7', '8', '9'] as const;
/** The composer's cap on keys per word (web-ui Req 30.3). */
export const MAX_FIX_CODE = 16;
export const MAX_KEY_FIXES = 3;

/**
 * The single edit from `from` to `to`, or null when they are not exactly one key apart. Where a key could
 * have been added or removed at more than one place (a double press), the edit names the first place the
 * codes differ: for 4466 -> 466 the second 4 was removed.
 */
export function codeEdit(from: string, to: string): CodeEdit | null {
  if (from === to) return null;
  let i = 0;
  while (i < from.length && i < to.length && from[i] === to[i]) i++;
  if (from.length === to.length) {
    return from.slice(i + 1) === to.slice(i + 1) ? { kind: 'change', at: i, from: from[i]!, to: to[i]! } : null;
  }
  if (to.length === from.length + 1) return from.slice(i) === to.slice(i + 1) ? { kind: 'add', at: i, to: to[i]! } : null;
  if (from.length === to.length + 1) return from.slice(i + 1) === to.slice(i) ? { kind: 'remove', at: i, from: from[i]! } : null;
  return null;
}

/** Codes one key away (digits 2-9, 1 to maxCode keys), each once, never the code itself; changes, removals, then additions. */
export function neighbourCodes(code: string, maxCode: number = MAX_FIX_CODE): { code: string; edit: CodeEdit }[] {
  if (!isCode(code)) return [];
  const out: { code: string; edit: CodeEdit }[] = [];
  const seen = new Set<string>([code]);
  const push = (c: string) => {
    if (c.length === 0 || c.length > maxCode || seen.has(c)) return;
    const edit = codeEdit(code, c);
    if (!edit) return;
    seen.add(c);
    out.push({ code: c, edit });
  };
  for (let i = 0; i < code.length; i++) for (const d of KEYS) if (d !== code[i]) push(code.slice(0, i) + d + code.slice(i + 1));
  for (let i = 0; i < code.length; i++) push(code.slice(0, i) + code.slice(i + 1));
  for (let i = 0; i <= code.length; i++) for (const d of KEYS) push(code.slice(0, i) + d + code.slice(i));
  return out;
}

/**
 * Up to k dictionary words one key away from `code`, best first: the top `perCode` words of each
 * neighbouring code, scored by lm.logP(prev, w) plus, when the word after is known, lm.logP(w, next).
 * Ties keep the probe order (changes, removals, additions; frequency within a code). Deterministic.
 */
export function keyFixes(
  code: string,
  prev: string,
  lex: Lexicon,
  lm: LanguageModel,
  opts: { k?: number; perCode?: number; maxCode?: number; next?: string } = {},
): KeyFix[] {
  const k = Math.max(0, Math.floor(opts.k ?? MAX_KEY_FIXES));
  const perCode = Math.max(1, Math.floor(opts.perCode ?? 3));
  if (k === 0) return [];
  const scored: { fix: KeyFix; s: number; i: number }[] = [];
  const words = new Set<string>();
  for (const n of neighbourCodes(code, opts.maxCode)) {
    for (const w of lex.lookup(n.code).slice(0, perCode)) {
      if (words.has(w)) continue;
      words.add(w);
      const s = lm.logP(prev, w) + (opts.next ? lm.logP(w, opts.next) : 0);
      scored.push({ fix: { word: w, code: n.code, edit: n.edit }, s, i: scored.length });
    }
  }
  scored.sort((a, b) => b.s - a.s || a.i - b.i);
  return scored.slice(0, k).map((x) => x.fix);
}
