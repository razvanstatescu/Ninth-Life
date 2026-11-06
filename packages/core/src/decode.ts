/**
 * Ghost mode: offline decoding with the lexicon and a language model. No network, no LLM.
 * Requirements: core-encoder Req 5.1 – 5.7.
 */
import { tokenize, type Mode } from './keymap';
import type { Lexicon } from './lexicon';
import { BOS, type LanguageModel } from './lm';
import { validate } from './validator';

export interface Candidate {
  words: string[];
  score: number;
  source: 'dict' | 'ghost' | 'llm';
}

export const DEFAULT_PER_SLOT = 12;
export const DEFAULT_BEAM = 32;
export const DEFAULT_K = 5;
/** Score used when a language model returns a non-finite value. */
const BAD_LOGP = -99;

/**
 * One slot per code: the top perSlot words for that code, most frequent first.
 * letter mode: words whose code equals the slot's code. initials mode: the slot's code is the
 * first letter's key (one digit) and the slot holds the most frequent words starting on it.
 * A code with no words gives [].
 */
export function lattice(codes: string[], lex: Lexicon, perSlot: number = DEFAULT_PER_SLOT, mode: Mode = 'letter'): string[][] {
  const n = Math.max(0, Math.floor(perSlot));
  return codes.map((code) => {
    if (n === 0) return [];
    if (mode === 'initials') return code.length === 1 ? lex.completions(code, n) : [];
    return lex.lookup(code).slice(0, n);
  });
}

/**
 * Beam search over a lattice. Score = sum of log10 P(w_i | w_{i-1}).
 * `prev` (additive, see ADR-core-001) is the word before slot 0; it defaults to '<s>'.
 * Any empty slot means no full sentence exists, so the result is [].
 */
export function beam(lat: string[][], lm: LanguageModel, B: number = DEFAULT_BEAM, prev: string = BOS): Candidate[] {
  const width = Math.max(1, Math.floor(B) || 1);
  let beams: { words: string[]; score: number }[] = [{ words: [], score: 0 }];
  for (const rawSlot of lat) {
    const slot = [...new Set(rawSlot)];
    if (slot.length === 0) return [];
    const next: { words: string[]; score: number }[] = [];
    for (const b of beams) {
      const p = b.words.length > 0 ? b.words[b.words.length - 1]! : prev;
      for (const w of slot) {
        const lp = lm.logP(p, w);
        next.push({ words: [...b.words, w], score: b.score + (Number.isFinite(lp) ? lp : BAD_LOGP) });
      }
    }
    next.sort((x, y) => y.score - x.score); // stable: ties keep lattice (frequency) order
    beams = next.length > width ? next.slice(0, width) : next;
  }
  return beams.map((b) => ({ words: b.words, score: b.score, source: 'ghost' as const }));
}

export interface GhostOptions {
  lexicon: Lexicon;
  lm: LanguageModel;
  /** results to return, default 5 */
  k?: number;
  mode?: Mode;
  /** Words said before these codes; only the last one is used, as the prev of the first slot. */
  context?: string[];
}

/** Top k ghost-mode candidates. Every returned candidate passes validate(words, codes, mode). */
export function decodeGhost(codes: string[], opts: GhostOptions): Candidate[] {
  const k = Math.max(0, Math.floor(opts.k ?? DEFAULT_K));
  const mode = opts.mode ?? 'letter';
  if (codes.length === 0 || k === 0) return [];
  const lat = lattice(codes, opts.lexicon, DEFAULT_PER_SLOT, mode);
  const ctx = (opts.context ?? []).flatMap((c) => (typeof c === 'string' ? tokenize(c) : []));
  const prev = ctx.length > 0 ? ctx[ctx.length - 1]! : BOS;
  const out: Candidate[] = [];
  const seen = new Set<string>();
  for (const c of beam(lat, opts.lm, Math.max(DEFAULT_BEAM, k), prev)) {
    if (!validate(c.words, codes, mode)) continue; // the safety net: never trust the lattice
    const key = c.words.join(' ');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length >= k) break;
  }
  return out;
}
