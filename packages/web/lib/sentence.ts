/**
 * Turns the composer state into what the screen shows: ranked sentences, the sentence in the
 * speak bar, and a proof for every word. Every sentence that can be spoken passes validate().
 */
import {
  BOS,
  beam,
  decodeGhost,
  encodeWord,
  formatSentence,
  INTENT_POOL,
  lattice,
  matchesCode,
  proof,
  rankByIntent,
  validate,
  type Candidate,
  type LanguageModel,
  type Lexicon,
  type Mode,
  type ProofState,
  type ReplyIntent,
} from '@ninth/core';
import { codesOf, marksOf, openIndex, startsOf, type ComposerState } from './composer';
import { showWord, type DisplayMap } from './myWords';

export const MAX_CANDIDATES = 5;
export const READINGS_PER_SLOT = 12;

/**
 * typing:    the open word is a prefix of dictionary words (shows their first letters).
 * unspelled: no dictionary word and no spelled word for these keys yet (shows the digits; spell mode
 *            fixes it, web-ui Req 20).
 */
export type WordState = ProofState | 'typing' | 'unspelled';

export interface DisplayWord {
  /** The word as it will be spoken, lower case (folded); null while nothing matches these keys yet. */
  word: string | null;
  code: string;
  /** For an unfinished word: the letters typed so far, taken from the likeliest completion. */
  partial?: string;
  state: WordState;
  /**
   * A word finished from the word row (web-ui Req 31.3): how many of its keys were pressed. The rest of
   * `code` came with the word and is shown as filled in. Left out when every key was pressed.
   */
  typed?: number;
  /** A word taken one key away (web-ui Req 32.5): its keys before, so the changed key can be marked. */
  was?: string;
  /** The word being retyped (web-ui Req 32.3). */
  editing?: boolean;
}

export interface Sentence {
  codes: string[];
  candidates: Candidate[];
  words: DisplayWord[];
  /** Formatted text for the speak bar and for speech; '' when nothing is typed. */
  text: string;
  /** `text` split into one token per slot, so the speak bar can mark unfinished words. */
  tokens: string[];
  /** True when every word is a real word that matches its keys. */
  speakable: boolean;
  /** Index into candidates of the sentence on show, or -1. */
  selectedIndex: number;
}

/** Words for one code, most frequent first, as the lattice would list them. */
export function readings(lex: Lexicon, code: string, mode: Mode = 'letter'): string[] {
  return lattice([code], lex, READINGS_PER_SLOT, mode)[0] ?? [];
}

/** The first `code.length` letters of the likeliest word that starts with these keys. */
export function partialFor(lex: Lexicon, code: string): string | undefined {
  const w = lex.completions(code, 1)[0];
  if (!w) return undefined;
  let out = '';
  let n = 0;
  for (const ch of w) {
    if (n >= code.length) break;
    out += ch;
    if (ch !== "'") n++;
  }
  return encodeWord(out) === code ? out : undefined;
}

/**
 * Ghost decode that honours words the person pinned. Pinned slots hold exactly one word.
 * With a reply type (web-ui Req 29, ADR-008) it decodes a pool of INTENT_POOL, reorders it with
 * rankByIntent and keeps the top k: the same sentences for the keys, in another order.
 */
export function decodeWithPins(
  state: ComposerState,
  lex: Lexicon,
  lm: LanguageModel,
  opts: { k?: number; mode?: Mode; context?: string[]; intent?: ReplyIntent } = {},
): Candidate[] {
  const k = opts.k ?? MAX_CANDIDATES;
  if (opts.intent) {
    const pool = decodeWithPins(state, lex, lm, { ...opts, intent: undefined, k: Math.max(k, INTENT_POOL) });
    return rankByIntent(pool, opts.intent).slice(0, k);
  }
  const codes = codesOf(state);
  const mode = opts.mode ?? 'letter';
  if (codes.length === 0) return [];
  const pinned = state.slots.some((s) => s.pin);
  const starts = startsOf(state);
  if (!pinned) return decodeGhost(codes, { lexicon: lex, lm, k, mode, context: opts.context, starts });

  const lat = lattice(codes, lex, READINGS_PER_SLOT, mode).map((slot, i) => {
    const pin = state.slots[i]?.pin;
    return pin ? [pin] : slot;
  });
  const prev = opts.context?.length ? opts.context[opts.context.length - 1]!.toLowerCase() : BOS;
  const out: Candidate[] = [];
  const seen = new Set<string>();
  for (const c of beam(lat, lm, Math.max(32, k), prev, starts)) {
    if (!validate(c.words, codes, mode)) continue;
    const key = c.words.join(' ');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length >= k) break;
  }
  return out;
}

/** Model ranking waits this long after the last key once a word is closed (Space, # or a chosen sentence). */
export const RANK_DEBOUNCE_MS = 400;
/**
 * While the last word is still open it waits longer (web-ui Req 30.2): typing fast sends nothing, so the
 * quota does not pay for half words, and a pause still ranks the last word for people who never press Space.
 */
export const RANK_PAUSE_OPEN_MS = 1000;

/** How long the screen waits with no key before it asks for model ranking (web-ui Req 30.2). */
export function rankDelayMs(state: ComposerState): number {
  return state.open || state.edit !== undefined ? RANK_PAUSE_OPEN_MS : RANK_DEBOUNCE_MS;
}

/**
 * The lattice sent for model ranking (web-ui Req 30.1), or null when there is nothing to rank yet (no
 * keys, or a slot with no word). A word the person fixed (# or a chosen sentence) is sent as a one-word
 * slot, so ranking keeps working after a pin; the server drops any lattice word that fails validate(),
 * and the screen keeps only model sentences that agree with the pins.
 */
export function rankingLattice(state: ComposerState, lex: Lexicon, mode: Mode = 'letter', perSlot = READINGS_PER_SLOT): string[][] | null {
  // Nothing while a word is being retyped (web-ui Req 32.3): its keys are still changing.
  if (state.slots.length === 0 || state.edit !== undefined) return null;
  const codes = codesOf(state);
  const lat = lattice(codes, lex, perSlot, mode).map((slot, i) => {
    const pin = state.slots[i]?.pin;
    return pin ? [pin] : slot;
  });
  return lat.some((slot) => slot.length === 0) ? null : lat;
}

/** Stands for a slot with no word in beam search around it; never shown, never spoken. */
const HOLE = '\u0000';

/**
 * The likeliest words for the slots that have one (dictionary words, or words the person spelled or
 * pinned), with null for every slot that has neither (web-ui Req 20.1). Used when no full sentence
 * exists, so the known words are still ranked in context. A slot's word always encodes to its code.
 */
export function decodeAround(
  state: ComposerState,
  lex: Lexicon,
  lm: LanguageModel,
  opts: { mode?: Mode; context?: string[] } = {},
): (string | null)[] {
  const codes = codesOf(state);
  const mode = opts.mode ?? 'letter';
  if (codes.length === 0) return [];
  const lat = lattice(codes, lex, READINGS_PER_SLOT, mode).map((slot, i) => {
    const pin = state.slots[i]?.pin;
    if (pin) return [pin];
    return slot.length > 0 ? slot : [HOLE];
  });
  const prev = opts.context?.length ? opts.context[opts.context.length - 1]!.toLowerCase() : BOS;
  const best = beam(lat, lm, 32, prev, startsOf(state))[0];
  return codes.map((code, i) => {
    const w = best?.words[i];
    return w && w !== HOLE && matchesCode(w, code, mode) ? w : null;
  });
}

/** Which word spell mode opens on: the first word not spelled yet, else the last word. */
export function spellTarget(words: readonly DisplayWord[]): number {
  const hole = words.findIndex((w) => w.state === 'unspelled');
  return hole >= 0 ? hole : words.length - 1;
}

/** LLM sentences first (already validated), then ghost ones, no duplicates, at most k. */
export function mergeCandidates(llm: Candidate[], ghost: Candidate[], k = MAX_CANDIDATES): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  for (const c of [...llm, ...ghost]) {
    const key = c.words.join(' ');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length >= k) break;
  }
  return out;
}

function sameWords(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((w, i) => w === b[i]);
}

export interface BuildOptions {
  /** decodeAround() for when there is no full sentence: the known words, null for the rest. */
  fallback?: readonly (string | null)[] | null;
  /** The person's spellings ("Mihai"), applied to the text only (lib/myWords.ts). */
  display?: DisplayMap | null;
}

export function buildSentence(
  state: ComposerState,
  candidates: Candidate[],
  lex: Lexicon | null,
  mode: Mode = 'letter',
  opts: BuildOptions = {},
): Sentence {
  const codes = codesOf(state);
  if (codes.length === 0) {
    return { codes, candidates: [], words: [], text: '', tokens: [], speakable: false, selectedIndex: -1 };
  }

  // Which words are on show: a chosen sentence, else the top-ranked one, else word by word.
  let chosen: string[] | null = null;
  if (state.selected && state.selected.length === codes.length && validate(state.selected, codes, mode)) {
    chosen = state.selected;
  } else if (candidates[0]) {
    chosen = candidates[0].words;
  }

  const raw: (string | null)[] = codes.map((code, i) => {
    const slot = state.slots[i]!;
    if (chosen) return chosen[i] ?? null;
    if (slot.pin) return slot.pin;
    if (opts.fallback) return opts.fallback[i] ?? null;
    return lex ? (readings(lex, code, mode)[0] ?? null) : null;
  });

  const proofs = lex
    ? proof(
        raw.map((w) => w ?? ''),
        codes,
        lex,
        mode,
      )
    : null;

  const words: DisplayWord[] = codes.map((code, i) => {
    const word = raw[i] ?? null;
    if (word === null) {
      // The open word may still grow into a dictionary word; anything else has no word yet.
      const open = openIndex(state) === i;
      const partial = lex && open ? partialFor(lex, code) : undefined;
      const ed = state.edit === i ? { editing: true } : {};
      if (partial || !lex || mode !== 'letter') return { word: null, code, partial, state: 'typing', ...ed };
      return { word: null, code, state: 'unspelled', ...ed };
    }
    const slot = state.slots[i];
    const typed = slot?.typed;
    const st = proofs?.[i]?.state ?? 'reject';
    const out: DisplayWord = typed !== undefined && typed < code.length ? { word, code, state: st, typed } : { word, code, state: st };
    if (slot?.was !== undefined && slot.was !== code) out.was = slot.was;
    if (state.edit === i) out.editing = true;
    return out;
  });

  const speakable = words.length > 0 && words.every((w) => w.word !== null && (w.state === 'match' || w.state === 'new'));
  // One token per slot (an unfinished word shows its partial letters, or its digits).
  const shownTokens = words.map((w) => (w.word !== null ? showWord(w.word, opts.display) : (w.partial ?? w.code)));
  const text = formatSentence(shownTokens, state.punct, marksOf(state));
  const tokens = text.split(' ');
  const shown = words.map((w) => w.word ?? '');
  const selectedIndex = candidates.findIndex((c) => sameWords(c.words, shown));
  return { codes, candidates, words, text, tokens, speakable, selectedIndex };
}
