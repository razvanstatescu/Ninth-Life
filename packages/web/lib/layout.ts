'use client';
/**
 * Screen layout (web-ui Req 15). Two layouts:
 *   wide     (>= 960px): the In-context-app artboard. Left: They said, SpeakBar, sentences, proof.
 *                         Right: keypad, scan control, keyboard hint. Header: pills, Phrases, Voice, Settings.
 *   compact  (< 960px):  one column, keypad first: SpeakBar, keypad, scan control, sentences (3, then More),
 *                         proof, They said, hint. Header: icon + name, one status pill, Menu.
 * The DOM follows this order so focus order matches what people see (accessibility steering, rule 7).
 */
import { useSyncExternalStore } from 'react';

export type Layout = 'wide' | 'compact';
export type Section = 'partner' | 'speak' | 'cands' | 'proof' | 'pad' | 'scan' | 'hint';

export const WIDE_QUERY = '(min-width: 960px)';
/** Sentences shown at once in the compact layout before "More sentences". */
export const COMPACT_SENTENCES = 3;

/** Top-to-bottom order of the main sections; wide has two columns. */
export function sectionOrder(layout: Layout): { columns: Section[][] } {
  return layout === 'wide'
    ? { columns: [['partner', 'speak', 'cands', 'proof'], ['pad', 'scan', 'hint']] }
    : { columns: [['speak', 'pad', 'scan', 'cands', 'proof', 'partner', 'hint']] };
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
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener?.('change', cb);
  return () => mq.removeEventListener?.('change', cb);
}

function snapshot(): Layout {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'wide';
  return window.matchMedia(WIDE_QUERY).matches ? 'wide' : 'compact';
}

/**
 * The current layout. The static HTML is rendered wide; CSS `order` rules lay it out as compact
 * on phones until hydration swaps in the compact DOM order, so there is no jump.
 */
export function useLayout(forced?: Layout): Layout {
  const live = useSyncExternalStore(subscribe, snapshot, () => 'wide' as Layout);
  return forced ?? live;
}
