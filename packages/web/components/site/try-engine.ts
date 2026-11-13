/**
 * The hero keypad's "try it" engine (W4, 2026-11-12, Claude Code; marketing-site MS-6.11 to MS-6.14).
 *
 * KeypadDemo loads this module with a dynamic import() on the visitor's first key press, never before, so
 * the landing page's first load carries none of it (MS-11.2) and requests nothing under /data/ (MS-2.5).
 * It is a thin layer over the app's own code, not a copy of it:
 *   - the sentence is the app's composer reducer (lib/composer.ts): 2-9 add a letter key, 0 is space,
 *     * goes back, 1 cycles punctuation, # moves the last word to its next reading;
 *   - the dictionary is the app's loadDictionary() (lib/data.ts): the same files, the same hashed URLs
 *     (so the service worker's precache is reused), the same vocabulary pack and bigram model;
 *   - the sentences and the proof of every word are the app's decodeWithPins / decodeAround /
 *     buildSentence (lib/sentence.ts), the offline decoder of @ninth/core. Every sentence passes validate().
 * No 'use client': it is only ever imported from KeypadDemo, which is the client island (MS-11.3).
 */
import { formatSentence } from '@ninth/core';
import { EMPTY, actionForKey, codesOf, composerReducer, type ComposerState } from '@/lib/composer';
import { loadDictionary, type DictState } from '@/lib/data';
import type { KeyId } from '@/lib/keys';
import { MAX_CANDIDATES, buildSentence, decodeAround, decodeWithPins, readings, type WordState } from '@/lib/sentence';

export { EMPTY, loadDictionary };
export type { ComposerState, DictState };

/** How many sentences the hero lists for the keys (the app shows up to MAX_CANDIDATES). */
export const TRY_MATCHES = 3;
/** Round 4 (2026-11-13, Claude Code): how many readings the hero's "Next:" line lists after the word on show. */
export const TRY_NEXT = 2;

export interface TryWord {
  /** The word on show (lower case), its unfinished letters, or null while nothing matches. */
  word: string | null;
  /**
   * How the chip writes it (round 3, R3-P8): the sentence's own token ("I", a capital first word) with trailing
   * punctuation dropped, exactly as the app's ProofPanel labels its chips (labels = buildSentence tokens).
   */
  label: string;
  code: string;
  state: WordState;
}

export interface TryView {
  /** Codes typed, one per word ("4663"). */
  codes: string[];
  /** The top sentence, formatted for the well ("Good"); '' when nothing is typed. */
  text: string;
  /** One proof per word of the top sentence. */
  words: TryWord[];
  /**
   * Up to TRY_MATCHES sentences whose every word matches the keys, best first, formatted ("Good", "Home", "Gone").
   * Round 3 (R3-P4): these are the matches for the keys alone, so # (a pinned reading) does not shrink the list to
   * one; when the sentence on show is not among them (# moved past them) it is added at the end.
   */
  matches: string[];
  /** Which of `matches` is the sentence on show (`text`), or -1 when none is. */
  shownIndex: number;
  /**
   * Round 4: the readings # gives next for the last word, in the order # gives them, at most TRY_NEXT, written as the
   * sentence would write them ("Home", "Gone" after "Good"); empty when the last word has no other reading.
   */
  next: string[];
  /** True when every word is a dictionary word that matches its keys (Hear it may speak it). */
  speakable: boolean;
}

const ready = (dict: DictState | null) => (dict?.status === 'ready' ? dict : null);

/** What the hero shows for the keys pressed so far, from the app's own decoder. */
export function view(state: ComposerState, dict: DictState | null): TryView {
  const d = ready(dict);
  const codes = codesOf(state);
  const candidates = d ? decodeWithPins(state, d.lexicon, d.lm, { k: MAX_CANDIDATES }) : [];
  const fallback = d && candidates.length === 0 && codes.length > 0 ? decodeAround(state, d.lexicon, d.lm) : null;
  const s = buildSentence(state, candidates, d?.lexicon ?? null, 'letter', { fallback });
  // The matches for the keys alone: the same decode with every pin and choice taken off.
  const pinned = state.slots.some((x) => x.pin) || state.selected !== null;
  const free = candidates.length === 0 ? [] : d && pinned ? decodeWithPins({ ...state, slots: state.slots.map((x) => ({ code: x.code })), selected: null }, d.lexicon, d.lm, { k: TRY_MATCHES }) : candidates;
  const matches = free.slice(0, TRY_MATCHES).map((c) => formatSentence(c.words, state.punct));
  if (free.length > 0 && s.text && !matches.includes(s.text)) matches.push(s.text);
  const words = s.words.map((w, i) => ({
    word: w.word ?? w.partial ?? null,
    label: s.tokens[i]?.replace(/[.?!,]+$/, '') || w.word || w.partial || w.code,
    code: w.code,
    state: w.state,
  }));
  return { codes, text: s.text, words, matches, shownIndex: matches.indexOf(s.text), next: nextReadings(state, words, d), speakable: s.speakable };
}

/** The readings press('#') steps through after the last word on show, as the chips would write them (round 4). */
function nextReadings(state: ComposerState, words: TryWord[], d: Extract<DictState, { status: 'ready' }> | null): string[] {
  const last = state.slots.length - 1;
  if (!d || last < 0) return [];
  const rs = readings(d.lexicon, state.slots[last]!.code);
  const cur = words[last]?.word ?? null;
  const at = rs.indexOf(cur ?? '');
  const after = at < 0 ? rs : [...rs.slice(at + 1), ...rs.slice(0, at)];
  const head = words.slice(0, last).map((w) => w.word ?? w.code);
  return after.slice(0, TRY_NEXT).map((r) => formatSentence([...head, r]).split(' ')[last] ?? r);
}

/**
 * One key press, as the app's keypad handles it. # needs the dictionary: it moves the last word to its next
 * reading (a pin), as the app's Next key does; with no dictionary it does nothing.
 */
export function press(state: ComposerState, key: KeyId, dict: DictState | null): ComposerState {
  if (key === '#') {
    const d = ready(dict);
    if (!d || state.slots.length === 0) return state;
    const index = state.slots.length - 1;
    const rs = readings(d.lexicon, state.slots[index]!.code);
    const cur = view(state, dict).words[index]?.word ?? null;
    if (rs.length === 0 || (rs.length === 1 && rs[0] === cur)) return state;
    const next = rs[(Math.max(-1, rs.indexOf(cur ?? '')) + 1) % rs.length]!;
    return composerReducer(state, { type: 'pin', index, word: next });
  }
  const action = actionForKey(key);
  return action ? composerReducer(state, action) : state;
}

/** Clear, as the app's Clear does. */
export function clear(): ComposerState {
  return composerReducer(EMPTY, { type: 'clear' });
}
