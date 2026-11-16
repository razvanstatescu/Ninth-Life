'use client';
/**
 * Screen layout (web-ui Req 15, 24, 25). Phones and tablets get a one-screen shell with no page
 * scrolling (ADR-003); laptops and desktops (a fine pointer) keep the original layouts.
 *
 * Touch devices (`pointer: coarse`):
 *   stack    portrait (phones and tablets): top to bottom the header (brand, status, They said), the
 *            sentence card with Clear, the suggestion rows, the keypad filling the width and the action
 *            bar [Menu] [Speak] [Show] (web-ui Req 24; docs/research/mobile-patterns-mobbin.md).
 *   split    tablet in landscape: the same pieces side by side, the keypad on the right filling the
 *            height, header, card, suggestions and action bar on the left (web-ui Req 25).
 *   rotate   a phone held sideways (its shorter screen side < 600px): phones are portrait only, so the
 *            screen asks to turn the phone upright (product decision, ADR-003).
 *   Everything else (proof, They said, the whole conversation, switch-scanning controls, About) is one tap
 *   away in a sheet. The conversation's newest turns show where they fit (threadRows).
 * Fine pointer (laptop and desktop windows):
 *   wide     (>= 960px): the In-context-app artboard. Left: the conversation, SpeakBar, sentences, proof.
 *            Right: keypad, scan control, keyboard hint. Header: pills, Phrases, Voice, Settings.
 *   compact  (600-959px): one column, keypad first: SpeakBar, keypad, scan control, sentences
 *            (3, then More), proof, the conversation, hint. Header: icon + name, one status pill, Menu.
 *   stack / split also serve narrow (< 600px) and short landscape (< 600px tall) windows.
 * The DOM follows the visual order so focus order matches what people see (accessibility rule 7).
 */
import { useSyncExternalStore } from 'react';

export type Layout = 'wide' | 'compact' | 'split' | 'stack' | 'rotate';
export type Section = 'thread' | 'speak' | 'cands' | 'proof' | 'pad' | 'scan' | 'hint' | 'actions';

export const WIDE_QUERY = '(min-width: 960px)';
/** Short landscape windows (fine pointer). */
export const SPLIT_QUERY = '(max-width: 959px) and (min-width: 560px) and (max-height: 599px) and (orientation: landscape)';
/** Narrow windows (fine pointer). */
export const PHONE_QUERY = '(max-width: 599px)';
export const TOUCH_QUERY = '(pointer: coarse)';
export const LANDSCAPE_QUERY = '(orientation: landscape)';
/** A device whose shorter screen side is under this is a phone (portrait only, ADR-003). */
export const PHONE_MAX_SHORT_SIDE = 600;

/** Sentences shown at once in the compact layout before "More sentences". */
export const COMPACT_SENTENCES = 3;

/** Top-to-bottom order of the main sections; two-column layouts list the left column first. */
export function sectionOrder(layout: Layout): { columns: Section[][] } {
  if (layout === 'wide') return { columns: [['thread', 'speak', 'cands', 'proof'], ['pad', 'scan', 'hint']] };
  if (layout === 'split') return { columns: [['thread', 'speak', 'cands', 'actions'], ['pad']] };
  // The stack shows the thread strip only when tall (threadRows); otherwise it is in the header.
  if (layout === 'stack') return { columns: [['thread', 'speak', 'cands', 'pad', 'actions']] };
  if (layout === 'rotate') return { columns: [[]] };
  return { columns: [['speak', 'pad', 'scan', 'cands', 'proof', 'thread', 'hint']] };
}

/** The one-screen shells (no page scroll): stack and split. */
export const isShell = (layout: Layout): layout is 'stack' | 'split' => layout === 'stack' || layout === 'split';
/** Two columns (keypad on the right): wide and split. */
export const isTwoColumn = (layout: Layout): boolean => layout === 'wide' || layout === 'split';

/**
 * How many sentences to show. Compact shows 3 and a More control; a sentence chosen past
 * the limit (ArrowDown, Alt+4) opens the full list so the chosen one is always on screen.
 */
export function visibleSentences(
  total: number,
  layout: Layout,
  expanded: boolean,
  selectedIndex = -1,
): { count: number; more: boolean; canCollapse: boolean } {
  if (layout === 'wide' || total <= COMPACT_SENTENCES) return { count: total, more: false, canCollapse: false };
  const open = expanded || selectedIndex >= COMPACT_SENTENCES;
  return open ? { count: total, more: false, canCollapse: selectedIndex < COMPACT_SENTENCES } : { count: COMPACT_SENTENCES, more: true, canCollapse: false };
}

/** Pure layout choice, for tests and for the hook below. */
export function chooseLayout(m: { touch: boolean; landscape: boolean; shortSide: number; wide: boolean; split: boolean; narrow: boolean }): Layout {
  if (m.touch) {
    if (m.shortSide < PHONE_MAX_SHORT_SIDE) return m.landscape ? 'rotate' : 'stack';
    return m.landscape ? 'split' : 'stack';
  }
  if (m.wide) return 'wide';
  if (m.split) return 'split';
  return m.narrow ? 'stack' : 'compact';
}

const QUERIES = [WIDE_QUERY, SPLIT_QUERY, PHONE_QUERY, TOUCH_QUERY, LANDSCAPE_QUERY];

function subscribe(cb: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined;
  const mqs = QUERIES.map((q) => window.matchMedia(q));
  for (const mq of mqs) mq.addEventListener?.('change', cb);
  window.addEventListener('resize', cb);
  return () => {
    for (const mq of mqs) mq.removeEventListener?.('change', cb);
    window.removeEventListener('resize', cb);
  };
}

function snapshot(): Layout {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'wide';
  const mm = (q: string) => window.matchMedia(q).matches;
  const s = window.screen;
  return chooseLayout({
    touch: mm(TOUCH_QUERY),
    landscape: mm(LANDSCAPE_QUERY),
    shortSide: s ? Math.min(s.width, s.height) : Math.min(window.innerWidth, window.innerHeight),
    wide: mm(WIDE_QUERY),
    split: mm(SPLIT_QUERY),
    narrow: mm(PHONE_QUERY),
  });
}

/**
 * Suggestion rows in the stack shell, by screen height (taller tablets get more). A short screen
 * (an iPhone SE in Safari with the Bottom tab bar, 495px) gets none, so 72px keys fit without a
 * scroll; Sentences moves to Menu (web-ui Req 24.9, ADR-005).
 */
export function stackSuggestionRows(h: { r2: boolean; r3: boolean; r4: boolean; short?: boolean }): 0 | 1 | 2 | 3 | 4 {
  if (h.short) return 0;
  return h.r4 ? 4 : h.r3 ? 3 : h.r2 ? 2 : 1;
}
/**
 * The stack shell is short below 548px, the smallest visible height measured to fit one suggestion
 * row with 72px keys (test/e2e/responsive.mjs). An exception query, so it is false on the server and in jsdom.
 */
export const STACK_SHORT_QUERY = '(max-height: 547px)';
/** Breakpoints for stackSuggestionRows; styles/app.css uses the same heights for the sentence lines. */
export const STACK_ROWS_QUERIES = { r2: '(min-height: 760px)', r3: '(min-height: 900px)', r4: '(min-height: 1050px)' } as const;
/** Suggestion rows in the split shell (left column), by screen height. */
export function splitSuggestionRows(h: { r3: boolean; r4: boolean }): 2 | 3 | 4 {
  return h.r4 ? 4 : h.r3 ? 3 : 2;
}
export const SPLIT_ROWS_QUERIES = { r3: '(min-height: 700px)', r4: '(min-height: 800px)' } as const;

/**
 * The conversation thread on the main screen (web-ui Req 27.4-27.6, ADR-007), measured so the keys
 * never change size or place:
 *   0  stack under 640px tall: no header, so the thread is in Menu > This sentence > Conversation;
 *   1  stack 640-1149px: the newest turn inside the header's They said button (0 extra px);
 *   2  split, and stack 1150px or taller: a fixed-height strip with the newest 2 turns above the card
 *      (the stack has 162px or more to spare there, so 96px keys stay 96px);
 *   3  wide and compact (a laptop window, the page may scroll): a panel with the newest 3 turns.
 */
export function threadRows(layout: Layout, h: { tall: boolean; noHeader: boolean }): 0 | 1 | 2 | 3 {
  if (layout === 'rotate') return 0;
  if (layout === 'wide' || layout === 'compact') return 3;
  if (layout === 'split') return 2;
  if (h.noHeader) return 0;
  return h.tall ? 2 : 1;
}
/** The stack shell is tall enough for the 2-turn strip (iPad 11" with no toolbar, 10" Android tablets, iPad Pro 13"). */
export const STACK_THREAD_QUERY = '(min-height: 1150px)';
/**
 * Under 640px the stack shell hides its header (styles/app.css), and the They said button with it. 640, not 620:
 * at 620-639px the header, one suggestion row and 72px keys overflowed by up to 7px (measured, 2026-11-16).
 */
export const STACK_NO_HEADER_QUERY = '(max-height: 639px)';

/**
 * The same height query for a screen that gives `px` to the partner strip (web-ui Req 33.5): every min-height and
 * max-height in it moves up by `px`, so the rest of the screen follows today's rules at the height it has left.
 */
export function shiftQuery(query: string, px: number): string {
  if (!px) return query;
  return query.replace(/\((min|max)-height:\s*(\d+)px\)/g, (_, k: string, n: string) => `(${k}-height: ${Number(n) + px}px)`);
}

/** A media query as React state (false on the server and in tests without matchMedia). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined;
      const mq = window.matchMedia(query);
      mq.addEventListener?.('change', cb);
      return () => mq.removeEventListener?.('change', cb);
    },
    () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false),
    () => false,
  );
}

/**
 * The current layout. The static HTML is rendered wide; CSS lays it out as compact on narrow
 * screens until hydration swaps in the layout's own DOM.
 */
export function useLayout(forced?: Layout): Layout {
  const live = useSyncExternalStore(subscribe, snapshot, () => 'wide' as Layout);
  return forced ?? live;
}
