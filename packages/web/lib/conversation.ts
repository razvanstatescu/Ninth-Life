'use client';
/**
 * The conversation thread (web-ui Req 27, ADR-007): what they said and what you said, newest last.
 *
 * - Memory only. The thread lives in this module, so it survives a trip to /about and back, and is gone
 *   after a reload, when the tab closes or when the browser discards the tab. It is never written to
 *   IndexedDB, localStorage or sessionStorage (Req 13.2, 27.1; privacy.md "never stored").
 * - A pure reducer (`conversationReducer`) and pure selectors, so the rules are property-tested; a tiny
 *   store read with `useSyncExternalStore` (`useConversation`).
 * - "They said" is derived: it is the newest 'them' turn (`lastThem`). Done in the They said field adds
 *   one; Change edits only the newest one, and saving it empty removes it.
 * - A 'me' turn is added by whatever the person chose to say: Speak (`keys`), a phrase (`phrase`), a
 *   quick reply (`quick`), Say again (`again`) and Show (`shown`), through `sayAndRecord` in
 *   CommunicationScreen. Test voice is not a turn. The same line twice within 60 s is one turn.
 * - Model ranking may send the last 3 things you said (`decodeContext`), only when the person turned on
 *   "Include what you said" (`llmRecent`). Nothing here sends anything.
 */
import { isReplyIntent, type ReplyIntent } from '@ninth/core';
import { useMemo, useSyncExternalStore } from 'react';

export type TurnVia = 'typed' | 'heard' | 'keys' | 'phrase' | 'quick' | 'again' | 'shown';
/** How a 'them' line got in: typed in the field, or Listen filled some of it. */
export type ThemVia = 'typed' | 'heard';
/** How a 'me' line was said or shown. */
export type MeVia = 'keys' | 'phrase' | 'quick' | 'again' | 'shown';

export interface Turn {
  id: number;
  who: 'them' | 'me';
  text: string;
  /** ms since the epoch: when it was said (or last said again). */
  at: number;
  via: TurnVia;
}

export interface ConversationState {
  /** Oldest first. */
  turns: readonly Turn[];
  /** The id the next turn gets (ids are never reused within a page load). */
  nextId: number;
}

export type ConversationAction =
  | { type: 'add'; who: 'them'; text: string; via: ThemVia; at: number }
  | { type: 'add'; who: 'me'; text: string; via: MeVia; at: number }
  /** Change the newest 'them' line (Req 27.3); empty text removes it. Any other id is ignored. */
  | { type: 'edit'; id: number; text: string; via?: ThemVia }
  | { type: 'remove'; id: number }
  | { type: 'clear' };

export const MAX_TURNS = 50;
/** Their lines: the They said limit (Req 13.2, contracts.md partner). */
export const THEM_MAX = 280;
/** Your lines: a sentence of up to 20 words of up to 16 letters fits. */
export const ME_MAX = 500;
/** Each recent line sent for ranking (contracts.md `context.recent`). */
export const RECENT_MAX_CHARS = 280;
export const RECENT_COUNT = 3;
/** The same 'me' line again within this time is the same turn (Show then Speak, Say again twice). */
export const SAME_TURN_MS = 60_000;

export const EMPTY_CONVERSATION: ConversationState = Object.freeze({ turns: Object.freeze([]) as readonly Turn[], nextId: 1 });

/** Trim, fold runs of white space (line breaks too) into one space, and cut to the limit. */
export function cleanText(text: string, max: number): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, max).trim();
}

const limitFor = (who: Turn['who']) => (who === 'them' ? THEM_MAX : ME_MAX);

export function conversationReducer(s: ConversationState, a: ConversationAction): ConversationState {
  switch (a.type) {
    case 'add': {
      const text = cleanText(a.text, limitFor(a.who));
      if (!text) return s;
      const last = s.turns[s.turns.length - 1];
      if (a.who === 'me' && last && last.who === 'me' && last.text === text && a.at - last.at >= 0 && a.at - last.at <= SAME_TURN_MS) {
        return { ...s, turns: [...s.turns.slice(0, -1), { ...last, at: a.at }] };
      }
      const turn: Turn = { id: s.nextId, who: a.who, text, at: a.at, via: a.via };
      const turns = [...s.turns, turn];
      return { turns: turns.length > MAX_TURNS ? turns.slice(turns.length - MAX_TURNS) : turns, nextId: s.nextId + 1 };
    }
    case 'edit': {
      const them = lastThem(s);
      if (!them || them.id !== a.id) return s;
      const text = cleanText(a.text, THEM_MAX);
      if (!text) return conversationReducer(s, { type: 'remove', id: a.id });
      if (text === them.text && !a.via) return s;
      return { ...s, turns: s.turns.map((t) => (t.id === a.id ? { ...t, text, via: a.via ?? t.via } : t)) };
    }
    case 'remove': {
      if (!s.turns.some((t) => t.id === a.id)) return s;
      return { ...s, turns: s.turns.filter((t) => t.id !== a.id) };
    }
    case 'clear':
      return s.turns.length === 0 ? s : { ...s, turns: [] };
  }
}

// ---- selectors ------------------------------------------------------------------------------------

export const lastTurn = (s: ConversationState): Turn | null => s.turns[s.turns.length - 1] ?? null;

export function lastThem(s: ConversationState): Turn | null {
  for (let i = s.turns.length - 1; i >= 0; i--) if (s.turns[i]!.who === 'them') return s.turns[i]!;
  return null;
}

/** The newest turn is theirs: they said something and you have not answered yet. */
export const awaitingReply = (s: ConversationState): boolean => lastTurn(s)?.who === 'them';

/**
 * The last `n` things you said, oldest first, each at most 280 characters (for `context.recent`).
 * `before`: only turns with a smaller id, so a sentence being ranked never sees itself after Speak.
 */
export function recentMine(s: ConversationState, n = RECENT_COUNT, before = Infinity): string[] {
  const out: string[] = [];
  for (let i = s.turns.length - 1; i >= 0 && out.length < n; i--) {
    const t = s.turns[i]!;
    if (t.who === 'me' && t.id < before) out.unshift(t.text.slice(0, RECENT_MAX_CHARS));
  }
  return out;
}

/** "They said: …" and "You said: …" lines, oldest first (Share and Copy all). */
export function threadText(turns: readonly Turn[]): string {
  return turns.map((t) => `${t.who === 'them' ? 'They said' : 'You said'}: ${t.text}`).join('\n');
}

/**
 * The context for model ranking (contracts.md §3): their newest line, your last 3 lines only when
 * "Include what you said" is on (Req 27.11), and the reply type only when one is pressed for their newest
 * line (Req 29.8, ADR-008; the key is left out otherwise). The one place the request's context is built.
 */
export function decodeContext(
  s: ConversationState,
  o: { recent: boolean; before?: number; intent?: ReplyIntent; intentFor?: number },
): { partner?: string; recent: string[]; intent?: ReplyIntent } {
  const them = lastThem(s);
  const intent = replyIntentFor(s, o.intent, o.intentFor);
  return { ...(them ? { partner: them.text } : {}), recent: o.recent ? recentMine(s, RECENT_COUNT, o.before) : [], ...(intent ? { intent } : {}) };
}

/**
 * The reply type in force: one pressed for their newest line (`intentFor` is its id) while that line is
 * still the newest turn, the only time the group is on screen. Pressed for an older line, with no line of
 * theirs, or once anything of yours follows it (Speak, Show, a reply, a phrase, Say again), there is none
 * (Req 29.4), so a type never steers while it cannot be seen.
 */
export function replyIntentFor(s: ConversationState, intent: ReplyIntent | undefined, intentFor: number | undefined): ReplyIntent | undefined {
  if (!isReplyIntent(intent)) return undefined;
  const last = lastTurn(s);
  return last && last.who === 'them' && last.id === intentFor ? intent : undefined;
}

// ---- the store (memory only) ---------------------------------------------------------------------

let state: ConversationState = EMPTY_CONVERSATION;
const listeners = new Set<() => void>();

export const conversationStore = {
  get: (): ConversationState => state,
  dispatch(a: ConversationAction): void {
    const next = conversationReducer(state, a);
    if (next === state) return;
    state = next;
    for (const l of [...listeners]) l();
  },
  subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  /** Tests: start from an empty thread. */
  reset(): void {
    state = EMPTY_CONVERSATION;
    for (const l of [...listeners]) l();
  },
};

const serverSnapshot = (): ConversationState => EMPTY_CONVERSATION;

/** Add something you said or showed (CommunicationScreen's sayAndRecord and Show call this). */
export function recordMine(text: string, via: MeVia, at = Date.now()): void {
  conversationStore.dispatch({ type: 'add', who: 'me', text, via, at });
}

export interface ConversationApi {
  state: ConversationState;
  turns: readonly Turn[];
  last: Turn | null;
  lastThem: Turn | null;
  awaitingReply: boolean;
  /** Their newest line ('' when none): what used to be the They said value. */
  partner: string;
  addThem(text: string, via: ThemVia): void;
  addMe(text: string, via: MeVia): void;
  edit(id: number, text: string, via?: ThemVia): void;
  remove(id: number): void;
  clear(): void;
}

const actions = {
  addThem: (text: string, via: ThemVia) => conversationStore.dispatch({ type: 'add', who: 'them', text, via, at: Date.now() }),
  addMe: (text: string, via: MeVia) => recordMine(text, via),
  edit: (id: number, text: string, via?: ThemVia) => conversationStore.dispatch({ type: 'edit', id, text, via }),
  remove: (id: number) => conversationStore.dispatch({ type: 'remove', id }),
  clear: () => conversationStore.dispatch({ type: 'clear' }),
};

export function useConversation(): ConversationApi {
  const s = useSyncExternalStore(conversationStore.subscribe, conversationStore.get, serverSnapshot);
  return useMemo(() => {
    const them = lastThem(s);
    return { state: s, turns: s.turns, last: lastTurn(s), lastThem: them, awaitingReply: awaitingReply(s), partner: them?.text ?? '', ...actions };
  }, [s]);
}
