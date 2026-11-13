/**
 * The sentence being typed, as a pure reducer. It knows codes and pinned words, never the
 * dictionary: the screen resolves readings (see lib/sentence.ts) and dispatches 'pin'.
 *
 *   2-9  add a digit to the open word
 *   0    close (commit) the open word
 *   *    delete the last digit; on no open word, remove punctuation, then the last word
 *   #    cycle the last word's reading (the screen sends 'pin' with the next word)
 *   1    cycle sentence punctuation: none . ? ! , none
 *
 * Reply type (web-ui Req 29, ADR-008): Agree, Disagree or Ask, for the other person's newest line
 * (`intentFor`, its turn id). It only reorders sentences (lib/sentence.ts); Ask also sets a "?" when no
 * punctuation is set (`autoPunct`), which 1 and Back change or remove as usual. Speak and Clear drop it.
 */
import type { Punct, ReplyIntent } from '@ninth/core';
import type { KeyId } from './keys';

export const MAX_WORDS = 20;
export const MAX_CODE = 16;
export const PUNCT_CYCLE: readonly (Punct | undefined)[] = [undefined, '.', '?', '!', ','];

export interface Slot {
  code: string;
  /** A word fixed by the person (# or a chosen sentence). Always encodes to `code`. */
  pin?: string;
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
}

export type ComposerAction =
  | { type: 'digit'; digit: string }
  | { type: 'space' }
  | { type: 'back' }
  | { type: 'punct' }
  | { type: 'pin'; index: number; word: string }
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
      if (!state.open) return { ...state, spoken: false };
      return { ...state, open: false, spoken: false };
    case 'back': {
      const s = { ...state, spoken: false };
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
      if (s.punct !== undefined) return { ...s, punct: undefined, autoPunct: undefined };
      if (s.slots.length === 0) return s;
      const slots = pinSelected(s, s.slots.length - 1);
      slots.pop();
      return { ...s, slots, selected: null };
    }
    case 'punct': {
      const i = PUNCT_CYCLE.indexOf(state.punct);
      return { ...state, punct: PUNCT_CYCLE[(i + 1) % PUNCT_CYCLE.length], autoPunct: undefined, spoken: false };
    }
    case 'pin': {
      if (action.index < 0 || action.index >= state.slots.length) return state;
      const slots = pinSelected(state, state.slots.length);
      slots[action.index] = { ...slots[action.index]!, pin: action.word };
      return { ...state, slots, selected: null, spoken: false };
    }
    case 'select':
      if (action.words.length !== state.slots.length) return state;
      return { ...state, selected: [...action.words], spoken: false };
    case 'clear':
      return EMPTY;
    case 'spoken': {
      // What was said stays on show exactly as said: dropping the reply type (or new ranking context)
      // must not swap in another reading of the same keys.
      const words = action.words && action.words.length === state.slots.length ? [...action.words] : state.selected;
      return { ...state, selected: words, spoken: true, intent: undefined, intentFor: undefined };
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

/** Map a keypad key to a composer action ('#' needs the screen, so it returns null). */
export function actionForKey(id: KeyId): ComposerAction | null {
  if (id >= '2' && id <= '9') return { type: 'digit', digit: id };
  if (id === '0') return { type: 'space' };
  if (id === '*') return { type: 'back' };
  if (id === '1') return { type: 'punct' };
  return null;
}
