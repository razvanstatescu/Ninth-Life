/**
 * The sentence being typed, as a pure reducer. It knows codes and pinned words, never the
 * dictionary: the screen resolves readings (see lib/sentence.ts) and dispatches 'pin'.
 *
 *   2-9  add a digit to the open word
 *   0    close (commit) the open word
 *   *    delete the last digit; on no open word, remove the last word's mark (or Ask's "?"), then the word
 *   #    cycle the last word's reading (the screen sends 'pin' with the next word)
 *   1    close the open word and cycle the mark after the last word: . ? ! , none (web-ui Req 34.1); the
 *        mark stays after that word as more words are typed, and . ? ! start a new sentence
 *
 * Finish the word (web-ui Req 31.2, 31.4): 'complete' sets the open word's keys to a chosen word's code,
 * pins the word and closes it; `typed` remembers how many keys were pressed, so one Back reopens it there.
 *
 * Fix a word (web-ui Req 32, ADR-009): 'recode' takes a word one key away (the slot keeps `was`, the keys
 * before, so the change can be marked and one Back on the last word undoes it); 'edit' starts a retype of
 * any word: the next letter keys replace its keys, 0 ends it, Back with no key typed keeps the old word.
 *
 * Reply type (web-ui Req 29, ADR-008): Agree, Disagree or Ask, for the other person's newest line
 * (`intentFor`, its turn id). It only reorders sentences (lib/sentence.ts); Ask also sets a "?" when no
 * punctuation is set (`autoPunct`), which 1 and Back change or remove as usual. Speak and Clear drop it.
 */
import { SENTENCE_END, codeEdit, encodeWord, type Punct, type ReplyIntent } from '@ninth/core';
import type { KeyId } from './keys';

export const MAX_WORDS = 20;
export const MAX_CODE = 16;
export const PUNCT_CYCLE: readonly (Punct | undefined)[] = [undefined, '.', '?', '!', ','];

export interface Slot {
  code: string;
  /** A word fixed by the person (# or a chosen sentence). Always encodes to `code`. */
  pin?: string;
  /**
   * Set only by 'complete' (web-ui Req 31.3): how many of `code`'s keys the person pressed; the rest came
   * with the word they picked and are shown as filled in.
   */
  typed?: number;
  /** Set only by 'recode' (web-ui Req 32.5): the keys before a word one key away was taken. */
  was?: string;
  /** The recoded slot was the open last word (Back reopens it). */
  wasOpen?: boolean;
  /** The mark typed after this word with key 1 (web-ui Req 34.1). Not a key of the word. */
  punct?: Punct;
}

export interface ComposerState {
  slots: Slot[];
  /** The last slot is still being typed. */
  open: boolean;
  punct?: Punct;
  /** Words of a sentence the person chose from the list, one per slot. */
  selected: string[] | null;
  /** Set after Speak: the sentence stays until the next letter key starts a new one. */
  spoken: boolean;
  /** The reply type pressed (web-ui Req 29), for the 'them' turn `intentFor`. */
  intent?: ReplyIntent;
  intentFor?: number;
  /** The "?" was put there by Ask, not by the person (1 or Back hands it over to them). */
  autoPunct?: boolean;
  /** Retype (web-ui Req 32.3): the slot whose keys the letter keys replace, until 0. */
  edit?: number;
  /** No key typed in the retype yet: the slot still holds its old word. */
  editFresh?: boolean;
  /** The slot as it was before the retype (Back or 0 with no key keeps it). */
  editWas?: Slot;
}

export type ComposerAction =
  | { type: 'digit'; digit: string }
  | { type: 'space' }
  | { type: 'back' }
  | { type: 'punct' }
  | { type: 'pin'; index: number; word: string }
  /** Finish the open word with `word` (its code starts with the keys typed and is longer). */
  | { type: 'complete'; word: string }
  /** Take a word one key away for slot `index` (its code is one key changed, added or removed). */
  | { type: 'recode'; index: number; word: string }
  /** Retype slot `index`: the next letter keys replace its keys. */
  | { type: 'edit'; index: number }
  /** Set (or with no punct, remove) the mark after word `index` (Fix a word, web-ui Req 34.7). */
  | { type: 'mark'; index: number; punct?: Punct }
  | { type: 'select'; words: string[] }
  | { type: 'clear' }
  /** The sentence on show was spoken: `words` are its words, kept on show until the next key. */
  | { type: 'spoken'; words?: readonly string[] }
  /** Press (or release, with no intent) a reply type for the 'them' turn `turn`. */
  | { type: 'intent'; intent?: ReplyIntent; turn?: number }
  /** Undo a Clear: put back the state from just before it. */
  | { type: 'restore'; state: ComposerState };

export const EMPTY: ComposerState = Object.freeze({ slots: [], open: false, punct: undefined, selected: null, spoken: false }) as ComposerState;

export function codesOf(s: ComposerState): string[] {
  return s.slots.map((x) => x.code);
}

/** A copy of the slot with this mark, or with none. */
function withMark(slot: Slot, punct: Punct | undefined): Slot {
  const out: Slot = { ...slot };
  if (punct) out.punct = punct;
  else delete out.punct;
  return out;
}

/** Each word's own mark (web-ui Req 34.1), for formatSentence. */
export function marksOf(s: ComposerState): (Punct | undefined)[] {
  return s.slots.map((x) => x.punct);
}

/** Slots that start a new sentence: the ones after a word marked . ? ! (web-ui Req 34.3). */
export function startsOf(s: ComposerState): Set<number> {
  const out = new Set<number>();
  s.slots.forEach((x, i) => {
    if (x.punct && SENTENCE_END.has(x.punct) && i + 1 < s.slots.length) out.add(i + 1);
  });
  return out;
}

/** The word still being typed: the slot in a retype once a key is typed, else the open last word; -1 for none. */
export function openIndex(s: ComposerState): number {
  if (s.edit !== undefined) return s.editFresh ? -1 : s.edit;
  return s.open ? s.slots.length - 1 : -1;
}

const NO_EDIT = { edit: undefined, editFresh: undefined, editWas: undefined } as const;

/** End a retype and put the slot back as it was (Back or 0 before any key, or the last key deleted). */
function keepOld(s: ComposerState): ComposerState {
  if (s.edit === undefined || !s.editWas) return { ...s, ...NO_EDIT };
  const slots = s.slots.map((x) => ({ ...x }));
  slots[s.edit] = { ...s.editWas };
  return { ...s, slots, ...NO_EDIT };
}

/** Turn a chosen sentence into pins for the slots in [0, upto). */
function pinSelected(s: ComposerState, upto: number): Slot[] {
  const sel = s.selected;
  if (!sel || sel.length !== s.slots.length) return s.slots.map((x) => ({ ...x }));
  return s.slots.map((x, i) => (i < upto ? { ...x, pin: sel[i] } : { ...x }));
}

/**
 * The first key after Speak starts a new sentence. A reply type chosen while the spoken one was still on
 * show carries into it, with Ask's "?".
 */
function fresh(state: ComposerState): ComposerState {
  if (!state.intent) return EMPTY;
  const ask = state.intent === 'ask';
  return { ...EMPTY, intent: state.intent, intentFor: state.intentFor, punct: ask ? '?' : undefined, autoPunct: ask || undefined };
}

export function composerReducer(state: ComposerState, action: ComposerAction): ComposerState {
  switch (action.type) {
    case 'digit': {
      if (!/^[2-9]$/.test(action.digit)) return state;
      const s = state.spoken ? fresh(state) : state;
      if (s.edit !== undefined) {
        const i = s.edit;
        const cur = s.slots[i]!;
        if (!s.editFresh && cur.code.length >= MAX_CODE) return s;
        const slots = pinSelected(s, s.slots.length);
        slots[i] = { code: s.editFresh ? action.digit : cur.code + action.digit, ...(cur.punct ? { punct: cur.punct } : {}) };
        return { ...s, slots, selected: null, spoken: false, editFresh: false };
      }
      if (s.open) {
        const last = s.slots[s.slots.length - 1]!;
        if (last.code.length >= MAX_CODE) return s;
        const slots = pinSelected(s, s.slots.length - 1);
        slots[slots.length - 1] = { code: last.code + action.digit };
        return { ...s, slots, selected: null, spoken: false };
      }
      if (s.slots.length >= MAX_WORDS) return s;
      const slots = pinSelected(s, s.slots.length);
      slots.push({ code: action.digit });
      return { ...s, slots, open: true, selected: null, spoken: false };
    }
    case 'space':
      if (state.edit !== undefined) return state.editFresh ? keepOld(state) : { ...state, ...NO_EDIT };
      if (!state.open) return { ...state, spoken: false };
      return { ...state, open: false, spoken: false };
    case 'back': {
      const s = { ...state, spoken: false };
      if (s.edit !== undefined) {
        const cur = s.slots[s.edit]!;
        if (s.editFresh || cur.code.length <= 1) return keepOld(s);
        const slots = pinSelected(s, s.slots.length);
        slots[s.edit] = { code: cur.code.slice(0, -1) };
        return { ...s, slots, selected: null };
      }
      if (s.open) {
        const last = s.slots[s.slots.length - 1]!;
        const slots = pinSelected(s, s.slots.length - 1);
        if (last.code.length <= 1) {
          slots.pop();
          return { ...s, slots, open: false, selected: null };
        }
        slots[slots.length - 1] = { code: last.code.slice(0, -1) };
        return { ...s, slots, selected: null };
      }
      if (s.slots.length > 0 && s.slots[s.slots.length - 1]!.punct !== undefined) {
        const slots = pinSelected(s, s.slots.length);
        slots[slots.length - 1] = withMark(slots[slots.length - 1]!, undefined);
        return { ...s, slots };
      }
      if (s.punct !== undefined) return { ...s, punct: undefined, autoPunct: undefined };
      if (s.slots.length === 0) return s;
      // Right after Finish the word: one Back undoes that one press and reopens the word at the keys pressed.
      const lastSlot = s.slots[s.slots.length - 1]!;
      if (lastSlot.typed !== undefined && lastSlot.typed > 0 && lastSlot.typed < lastSlot.code.length) {
        const reopened = pinSelected(s, s.slots.length - 1);
        reopened[reopened.length - 1] = { code: lastSlot.code.slice(0, lastSlot.typed) };
        return { ...s, slots: reopened, open: true, selected: null };
      }
      // Right after a word one key away was taken: one Back puts the old keys back.
      if (lastSlot.was !== undefined) {
        const restored = pinSelected(s, s.slots.length - 1);
        restored[restored.length - 1] = { code: lastSlot.was };
        return { ...s, slots: restored, open: lastSlot.wasOpen === true, selected: null };
      }
      const slots = pinSelected(s, s.slots.length - 1);
      slots.pop();
      return { ...s, slots, selected: null };
    }
    case 'punct': {
      // Nothing typed: no mark (web-ui Req 34.1). Otherwise close the open word (or end a retype) and cycle the mark
      // after that word; the sentence-end mark (Ask's "?") is handed to the person and cycles on from it.
      if (state.slots.length === 0) return state;
      const base = state.edit === undefined ? state : state.editFresh ? keepOld(state) : { ...state, ...NO_EDIT };
      const at = state.edit !== undefined && !state.editFresh ? state.edit : base.slots.length - 1;
      const last = at === base.slots.length - 1;
      const slot = base.slots[at]!;
      const from = slot.punct ?? (last ? base.punct : undefined);
      const next = PUNCT_CYCLE[(PUNCT_CYCLE.indexOf(from) + 1) % PUNCT_CYCLE.length];
      const slots = base.slots.map((x) => ({ ...x }));
      slots[at] = withMark(slots[at]!, next);
      return { ...base, slots, open: false, spoken: false, ...(last ? { punct: undefined, autoPunct: undefined } : {}) };
    }
    case 'mark': {
      if (!state.slots[action.index]) return state;
      const slots = state.slots.map((x) => ({ ...x }));
      slots[action.index] = withMark(slots[action.index]!, action.punct);
      return { ...state, slots, spoken: false };
    }
    case 'pin': {
      if (action.index < 0 || action.index >= state.slots.length) return state;
      const slots = pinSelected(state, state.slots.length);
      slots[action.index] = { ...slots[action.index]!, pin: action.word };
      return { ...state, slots, selected: null, spoken: false };
    }
    case 'complete': {
      const at = openIndex(state);
      if (at < 0 || state.spoken) return state;
      const last = state.slots[at]!;
      if (last.pin) return state;
      const code = encodeWord(action.word);
      if (!code || !code.startsWith(last.code) || code.length <= last.code.length || code.length > MAX_CODE) return state;
      const slots = pinSelected(state, state.slots.length);
      if (state.open && at !== state.slots.length - 1) slots[slots.length - 1] = { ...state.slots[state.slots.length - 1]! };
      slots[at] = { code, pin: action.word, typed: last.code.length };
      if (state.edit !== undefined) return { ...state, slots, selected: null, spoken: false, ...NO_EDIT };
      return { ...state, slots, open: false, selected: null, spoken: false };
    }
    case 'recode': {
      const slot = state.slots[action.index];
      if (!slot || state.spoken) return state;
      const code = encodeWord(action.word);
      if (!code || code.length > MAX_CODE || code === slot.code) return state;
      const base = slot.was ?? slot.code;
      if (code !== base && !codeEdit(slot.code, code) && !codeEdit(base, code)) return state;
      const slots = pinSelected(state, state.slots.length);
      const lastOpen = state.open && action.index === state.slots.length - 1;
      if (state.open && !lastOpen) slots[slots.length - 1] = { ...state.slots[state.slots.length - 1]! };
      const wasOpen = lastOpen || slot.wasOpen === true;
      const mark = slot.punct ? { punct: slot.punct } : {};
      slots[action.index] = code === base ? { code, pin: action.word, ...mark } : { code, pin: action.word, was: base, ...(wasOpen ? { wasOpen: true } : {}), ...mark };
      const next: ComposerState = { ...state, slots, selected: null, spoken: false, open: lastOpen ? false : state.open };
      return state.edit === action.index ? { ...next, ...NO_EDIT } : next;
    }
    case 'edit': {
      if (state.spoken || action.index < 0 || action.index >= state.slots.length) return state;
      return { ...state, edit: action.index, editFresh: true, editWas: { ...state.slots[action.index]! } };
    }
    case 'select':
      if (action.words.length !== state.slots.length) return state;
      return { ...state, selected: [...action.words], spoken: false, ...(state.edit !== undefined ? (state.editFresh ? {} : NO_EDIT) : {}) };
    case 'clear':
      return EMPTY;
    case 'spoken': {
      // What was said stays on show exactly as said: dropping the reply type (or new ranking context)
      // must not swap in another reading of the same keys.
      const words = action.words && action.words.length === state.slots.length ? [...action.words] : state.selected;
      return { ...state, selected: words, spoken: true, intent: undefined, intentFor: undefined, ...NO_EDIT };
    }
    case 'intent': {
      const intent = action.intent;
      const intentFor = intent ? action.turn : undefined;
      if (intent === state.intent && intentFor === state.intentFor) return state;
      const next: ComposerState = { ...state, intent, intentFor };
      // The spoken sentence stays as it was said; the "?" goes on the next one (fresh()).
      if (state.spoken) return next;
      if (intent === 'ask' && state.punct === undefined) return { ...next, punct: '?', autoPunct: true };
      if (intent !== 'ask' && state.autoPunct && state.punct === '?') return { ...next, punct: undefined, autoPunct: undefined };
      return next;
    }
    case 'restore':
      return action.state;
  }
}

/** The two caps (web-ui Req 30.3): a key that would pass one is not added, and the screen says so politely. */
export type Limit = 'word' | 'sentence';
export const LIMIT_MESSAGE: Readonly<Record<Limit, string>> = {
  word: `Words can be at most ${MAX_CODE} letters.`,
  sentence: `A sentence can have at most ${MAX_WORDS} words.`,
};

/** Which cap a letter key runs into, or null when the reducer will add it. Pure, mirrors 'digit'. */
export function limitFor(state: ComposerState, action: ComposerAction): Limit | null {
  if (action.type !== 'digit' || !/^[2-9]$/.test(action.digit) || state.spoken) return null;
  if (state.edit !== undefined) return !state.editFresh && state.slots[state.edit]!.code.length >= MAX_CODE ? 'word' : null;
  if (state.open) return state.slots[state.slots.length - 1]!.code.length >= MAX_CODE ? 'word' : null;
  return state.slots.length >= MAX_WORDS ? 'sentence' : null;
}

/** Map a keypad key to a composer action ('#' needs the screen, so it returns null). */
export function actionForKey(id: KeyId): ComposerAction | null {
  if (id >= '2' && id <= '9') return { type: 'digit', digit: id };
  if (id === '0') return { type: 'space' };
  if (id === '*') return { type: 'back' };
  if (id === '1') return { type: 'punct' };
  return null;
}
