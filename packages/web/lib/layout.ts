'use client';
/**
 * Screen layout (web-ui Req 15). Four layouts:
 *   wide     (>= 960px): the In-context-app artboard. Left: They said, SpeakBar, sentences, proof.
 *                         Right: keypad, scan control, keyboard hint. Header: pills, Phrases, Voice, Settings.
 *   compact  (< 960px):  one column, keypad first: SpeakBar, keypad, scan control, sentences (3, then More),
 *                         proof, They said, hint. Header: icon + name, one status pill, Menu.
 *   phone    (< 600px wide, portrait): the phone-first screen (web-ui Req 24,
 *                         docs/research/mobile-patterns-mobbin.md, mobile-aac-evidence.md). One screen tall,
 *                         top to bottom: header (dropped on short screens), the sentence card with Clear,
 *                         1-2 suggestion rows, the keypad filling the width, and the action bar
 *                         [Menu] [Speak] [Show] in the thumb zone; proof, They said, scan control and hint
 *                         follow below the fold.
 *   split    (phone in landscape: < 960px wide, landscape, < 600px tall): two columns, the
 *                         keypad pinned on the right and sized to the screen height; on the left the
 *                         compact header, SpeakBar, sentences (3, then More), proof, They said, scan
 *                         control, hint. Without it the keypad sat below the fold on every phone
 *                         held sideways (docs/research/mobile-layout.md).
 * The DOM follows this order so focus order matches what people see (accessibility steering, rule 7).
 */
import { useSyncExternalStore } from 'react';

export type Layout = 'wide' | 'compact' | 'split' | 'phone';
export type Section = 'partner' | 'speak' | 'cands' | 'proof' | 'pad' | 'scan' | 'hint' | 'actions';

export const WIDE_QUERY = '(min-width: 960px)';
/** Phones held sideways. Keep in sync with the split block in styles/app.css. */
export const SPLIT_QUERY = '(max-width: 959px) and (min-width: 560px) and (max-height: 599px) and (orientation: landscape)';
/** Phones in portrait (and narrow windows). Keep in sync with the phone blocks in styles/app.css. */
export const PHONE_QUERY = '(max-width: 599px)';
/**
 * Phone screens tall enough for two suggestion rows. Below it the second sentence line wins over the
 * second suggestion row (what is about to be said comes first); styles/app.css drops that line < 680px.
 */
export const PHONE_TWO_ROWS_QUERY = '(min-height: 760px)';
/** Sentences shown at once in the compact layout before "More sentences". */
export const COMPACT_SENTENCES = 3;

/** Top-to-bottom order of the main sections; wide has two columns. */
export function sectionOrder(layout: Layout): { columns: Section[][] } {
  if (layout === 'wide') return { columns: [['partner', 'speak', 'cands', 'proof'], ['pad', 'scan', 'hint']] };
  // Split: the keypad column holds only the keypad, so it can stay pinned (a pinned column taller
  // than the screen would hide whatever sits under the keys).
  if (layout === 'split') return { columns: [['speak', 'cands', 'proof', 'partner', 'scan', 'hint'], ['pad']] };
  if (layout === 'phone') return { columns: [['speak', 'cands', 'pad', 'actions', 'proof', 'partner', 'scan', 'hint']] };
  return { columns: [['speak', 'pad', 'scan', 'cands', 'proof', 'partner', 'hint']] };
}

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

function subscribe(cb: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined;
  const mqs = [window.matchMedia(WIDE_QUERY), window.matchMedia(SPLIT_QUERY), window.matchMedia(PHONE_QUERY)];
  for (const mq of mqs) mq.addEventListener?.('change', cb);
  return () => {
    for (const mq of mqs) mq.removeEventListener?.('change', cb);
  };
}

function snapshot(): Layout {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'wide';
  if (window.matchMedia(WIDE_QUERY).matches) return 'wide';
  if (window.matchMedia(SPLIT_QUERY).matches) return 'split';
  return window.matchMedia(PHONE_QUERY).matches ? 'phone' : 'compact';
}

/** Two columns (keypad on the right): wide and split. */
export const isTwoColumn = (layout: Layout): boolean => layout === 'wide' || layout === 'split';

/** Suggestion rows on the phone screen: two when it is tall enough, else one. */
export function phoneSuggestionRows(tall: boolean): 1 | 2 {
  return tall ? 2 : 1;
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
 * The current layout. The static HTML is rendered wide; CSS `order` rules lay it out as compact
 * on phones until hydration swaps in the compact DOM order, so there is no jump.
 */
export function useLayout(forced?: Layout): Layout {
  const live = useSyncExternalStore(subscribe, snapshot, () => 'wide' as Layout);
  return forced ?? live;
}
