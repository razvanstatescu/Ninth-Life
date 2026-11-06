/**
 * "My words": words the person adds (spelled, typed by a helper, or from a word pack). They are
 * stored on this device only (IndexedDB, lib/storage.ts), boosted in the lexicon with
 * `Lexicon.addWords` so they rank, and keep the person's own spelling for display ("Mihai").
 *
 * Capitalisation (ADR-core-001 open question, resolved here in the web layer): the lexicon stores
 * and returns folded words ("mihai"); the web keeps a display map from folded word to the person's
 * spelling and applies it only when a sentence is formatted for the screen and for speech. The
 * proof check and the decoder never see display forms, so they cannot change what is valid.
 * See docs/architecture/vocab-packs.md.
 */
import { encodeWord, normalize, type Lexicon } from '@ninth/core';

export type MyWordSource = 'spelled' | 'typed' | 'pack';

export interface MyWord {
  /** Folded, as the lexicon stores it: a-z and apostrophes ("mihai"). The IndexedDB key. */
  w: string;
  /** The person's spelling ("Mihai", "Ștefan"); normalize(display) === w. */
  display: string;
  /** Zipf units added in the lexicon (Lexicon.addWords). */
  boost: number;
  /** When it was added (ms since epoch), for "newest first". */
  added: number;
  source: MyWordSource;
}

/**
 * How much an added word is raised, in zipf units. A word the dictionary does not know starts at
 * NEW_WORD_ZIPF (3.0), so a name lands at 5.0, about as common as "water"; a dictionary word gets
 * the same lift (boosts do not stack, the largest wins).
 */
export const MY_WORD_BOOST = 2;
export const MAX_WORD_CHARS = 32;
/** Folded words: letters a-z with apostrophes inside ("isn't"), never at the edges. */
export const FOLDED_WORD = /^[a-z](?:[a-z']*[a-z])?$/;
/** A display spelling: letters, combining marks and apostrophes only. */
const DISPLAY_WORD = /^[\p{L}\p{M}'’ʼ]+$/u;

/** Fold one word and check it can be typed. Returns the folded and display forms, or a message. */
export function foldWord(raw: string): { w: string; display: string } | { error: string } {
  const display = (raw ?? '').trim().normalize('NFC');
  if (!display) return { error: 'Type a word first.' };
  if (/\s/.test(display)) return { error: 'One word at a time, with no spaces.' };
  const w = normalize(display);
  if (!DISPLAY_WORD.test(display) || !FOLDED_WORD.test(w) || encodeWord(w) === null) {
    return { error: 'Use letters only. Numbers and symbols cannot be typed on the keys.' };
  }
  if (w.length > MAX_WORD_CHARS) return { error: `A word can have at most ${MAX_WORD_CHARS} letters.` };
  return { w, display };
}

export function makeMyWord(raw: string, source: MyWordSource, boost: number = MY_WORD_BOOST, now: number = Date.now()): MyWord | { error: string } {
  const f = foldWord(raw);
  if ('error' in f) return f;
  return { w: f.w, display: f.display, boost, added: now, source };
}

/** Merge words in: one entry per folded word; the newest spelling wins and the largest boost is kept. */
export function mergeMyWords(existing: readonly MyWord[], incoming: readonly MyWord[]): MyWord[] {
  const byW = new Map(existing.map((x) => [x.w, x] as const));
  for (const x of incoming) {
    const prev = byW.get(x.w);
    byW.set(x.w, prev ? { ...prev, display: x.display, boost: Math.max(prev.boost, x.boost) } : x);
  }
  return sortMyWords([...byW.values()]);
}

/** Newest first, then alphabetical. */
export function sortMyWords(list: readonly MyWord[]): MyWord[] {
  return [...list].sort((a, b) => b.added - a.added || a.w.localeCompare(b.w));
}

export type DisplayMap = ReadonlyMap<string, string>;

/**
 * Folded word -> display spelling. Later sources win, so a word spelled in this sentence can
 * override the stored spelling. Only entries whose display folds back to the word are kept.
 */
export function buildDisplayMap(...sources: Iterable<{ w: string; display: string }>[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const src of sources) {
    for (const { w, display } of src) {
      if (display && display !== w && normalize(display) === w) out.set(w, display);
      else if (display === w) out.delete(w);
    }
  }
  return out;
}

/** The word as the person writes it. */
export function showWord(word: string, map?: DisplayMap | null): string {
  return map?.get(word) ?? word;
}

/** Raise the person's words in the lexicon so they rank (and are known to the proof check). */
export function applyMyWords(lex: Lexicon, words: readonly MyWord[]): void {
  if (words.length === 0) return;
  lex.addWords(words.map(({ w, boost }) => ({ w, boost })));
}
