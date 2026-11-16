'use client';
/**
 * The container system for everything that opens over the main screen (web-ui Req 36, ADR-011).
 *
 * Every surface is a native modal <dialog> (components/Sheet.tsx) of one of four kinds:
 *   fit     short surfaces. Phones: a bottom sheet as tall as its content (at most 85% of the screen; full
 *           height on short phones). Larger screens: a popover next to the button that opened it.
 *   panel   long lists. Phones: a full-height sheet with a Done bar at the bottom. Larger screens: a 440px
 *           side panel on the side of the button that opened it.
 *   dialog  Settings. Phones: a full-height sheet. Larger screens: a centred 880px dialog.
 *   show    big text (components/ShowMode.tsx): the whole screen everywhere.
 * Phones are screens under 600px wide (the phone layouts); everything else is "large".
 *
 * The pure helpers here (placement, the backdrop rule) are unit tested; Sheet applies them.
 */
import { createContext } from 'react';

export type SurfaceKind = 'fit' | 'panel' | 'dialog';

/** Screens under this width are phones (lib/layout.ts PHONE_QUERY). */
export const SURFACE_PHONE_QUERY = '(max-width: 599px)';
/** Room kept between a popover and the screen edge, and between a popover and its button. */
export const POPOVER_MARGIN = 16;
export const POPOVER_GAP = 8;
/** A popover too tall for either side of its button is cut to the room on the larger side (it scrolls inside), down to this. */
export const POPOVER_MIN_HEIGHT = 240;
/** A press on the backdrop this soon after opening is ignored (a tremor, or the second half of a double tap). */
export const BACKDROP_GRACE_MS = 300;

export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Where a popover goes (large screens, fit kind): below its button when it fits there (or there is more room
 * below), otherwise above; lined up with the button's left edge on the left half of the screen and its right
 * edge on the right half; always inside the screen. No button: centred. When it fits on neither side, it is cut to
 * the room on the larger side (`maxHeight`; it scrolls inside) so it never covers its button.
 */
export function placePopover(
  anchor: Box | null,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  margin = POPOVER_MARGIN,
  gap = POPOVER_GAP,
): { top: number; left: number; side: 'below' | 'above' | 'centre'; maxHeight?: number } {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, Math.max(lo, hi)));
  const maxTop = viewport.height - margin - size.height;
  const maxLeft = viewport.width - margin - size.width;
  if (!anchor || (anchor.width === 0 && anchor.height === 0)) {
    return { top: clamp((viewport.height - size.height) / 2, margin, maxTop), left: clamp((viewport.width - size.width) / 2, margin, maxLeft), side: 'centre' };
  }
  const bottom = anchor.top + anchor.height;
  const below = viewport.height - margin - (bottom + gap);
  const above = anchor.top - gap - margin;
  const side: 'below' | 'above' = size.height <= below || below >= above ? 'below' : 'above';
  const room = side === 'below' ? below : above;
  const cut = size.height > room && room >= POPOVER_MIN_HEIGHT;
  const height = cut ? room : size.height;
  const top = side === 'below' ? bottom + gap : anchor.top - gap - height;
  const rightHalf = anchor.left + anchor.width / 2 > viewport.width / 2;
  const left = rightHalf ? anchor.left + anchor.width - size.width : anchor.left;
  const at = { top: clamp(top, margin, viewport.height - margin - height), left: clamp(left, margin, maxLeft), side };
  return cut ? { ...at, maxHeight: Math.floor(room) } : at;
}

/** The side a panel opens on (large screens): the side of the button that opened it; right when unknown. */
export function panelSide(anchor: Box | null, viewportWidth: number): 'left' | 'right' {
  if (!anchor || (anchor.width === 0 && anchor.height === 0)) return 'right';
  return anchor.left + anchor.width / 2 < viewportWidth / 2 ? 'left' : 'right';
}

/**
 * Whether a press on the backdrop closes the surface (web-ui Req 36.4). Never while switch scanning (a press
 * anywhere is the switch), while a text field in it holds text, while a question (a confirm) is showing, or in
 * the first 300ms after it opened.
 */
export function backdropCloses(s: { scanning: boolean; hasText: boolean; confirming: boolean; openedAgoMs: number }): boolean {
  return !s.scanning && !s.hasText && !s.confirming && s.openedAgoMs >= BACKDROP_GRACE_MS;
}

/** True when a text field inside `root` holds text the person typed. */
export function holdsText(root: ParentNode): boolean {
  return [...root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input:not([type]), input[type="text"], input[type="search"], input[type="url"], textarea')].some(
    (el) => el.value.trim() !== '',
  );
}

/** True when a question (Turn off scanning?, Clear conversation?, Delete phrase?) is showing inside `root`. */
export function showsConfirm(root: ParentNode): boolean {
  return !!root.querySelector('[data-confirm], [role="alertdialog"]');
}

/**
 * What the open surface needs from the screen that owns it: the button that opened it (for the popover and the
 * panel side), and Back to the Menu when the Menu opened it (web-ui Req 36.6). One surface is open at a time.
 */
export interface SurfaceContextValue {
  anchor: () => Element | null;
  back: { label: string; onBack: () => void } | null;
}
export const SurfaceContext = createContext<SurfaceContextValue>({ anchor: () => null, back: null });

/** The button a press just landed on (pointer or key), recorded so a surface can open next to it. */
let lastPress: { el: Element; at: number } | null = null;
let listening = false;
export function trackPresses(): void {
  if (listening || typeof document === 'undefined') return;
  listening = true;
  const note = (e: Event) => {
    const t = e.target instanceof Element ? e.target.closest('button, a, [role="button"], label') : null;
    if (t) lastPress = { el: t, at: Date.now() };
  };
  document.addEventListener('pointerdown', note, true);
  document.addEventListener('keydown', note, true);
  document.addEventListener('click', note, true);
}

/**
 * The control on the main screen that is opening a surface now: the one just pressed, else the focused one,
 * else the one lit by switch scanning. Null when none is on the main screen (inside a sheet, or nothing).
 */
export function currentTrigger(now = Date.now()): Element | null {
  const onScreen = (el: Element | null | undefined): el is Element => !!el && el.isConnected && !el.closest('dialog') && el !== document.body;
  if (lastPress && now - lastPress.at < 1500 && onScreen(lastPress.el)) return lastPress.el;
  const active = typeof document !== 'undefined' ? document.activeElement : null;
  if (onScreen(active)) return active;
  const lit = typeof document !== 'undefined' ? document.querySelector('.is-lit, .nl-scanrow.is-scanning') : null;
  return onScreen(lit) ? lit : null;
}

/** An element's box, or null. */
export function boxOf(el: Element | null): Box | null {
  if (!el || !el.isConnected) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}
