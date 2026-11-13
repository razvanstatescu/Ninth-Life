/**
 * The website motion tier (ADR-006, marketing-site design.md "Motion system", MS-8). Pure helpers
 * shared by the boot script, SiteMotion and KeypadDemo; nothing here touches the DOM on import.
 */

/**
 * Runs while the HTML is parsed, before the hero is painted (design "Gating" 1). It sets
 * data-site-motion="pending" on <html> only when the visitor has no reduced-motion preference, so the
 * hero's arrival fades (A1, A2) start from the first frame. With no
 * JavaScript nothing is set and the page stays still. Hiding blocks for a reveal needs "on", which
 * only SiteMotion sets.
 */
export const SITE_MOTION_BOOT =
  "(function(){try{if(window.matchMedia&&matchMedia('(prefers-reduced-motion: no-preference)').matches)document.documentElement.dataset.siteMotion='pending';}catch(e){}})();";

/** The media query every motion layer checks for itself (D6.1). */
export const MOTION_QUERY = '(prefers-reduced-motion: no-preference)';

/** motion-delay-arrival (300 ms) plus motion-fade-slow (900 ms), used when the tokens do not parse. */
export const ARRIVAL_FALLBACK_MS = 1200;

/** Parses a millisecond token value ("520ms") to a number; anything else gives null. */
export function msToken(value: string | null | undefined): number | null {
  const m = /^\s*(\d+(?:\.\d+)?)ms\s*$/.exec(value ?? '');
  return m ? Number(m[1]) : null;
}

export interface AutoplayInput {
  /** The visitor asked for reduced motion (or matchMedia is missing). */
  reduced: boolean;
  hasObserver: boolean;
  /** The demo already played on its own during this page view. */
  autoplayed: boolean;
  /** The visitor pressed Play or Stop. */
  acted: boolean;
  /** document.visibilityState is "hidden". */
  hidden: boolean;
  /** The demo's latest intersection ratio. */
  ratio: number;
}

/** True only when the hero demo may play on its own now (MS-6.3, MS-6.8). */
export function autoplayDecision(i: AutoplayInput): boolean {
  return !i.reduced && i.hasObserver && !i.autoplayed && !i.acted && !i.hidden && i.ratio >= 0.6;
}

/**
 * Splits the reveal blocks into those already in view or above it (shown at once, no animation) and
 * those below the fold (revealed once when they come into view). MS-8.4.
 */
export function splitInitialReveal<E extends { getBoundingClientRect(): { top: number } }>(
  elements: readonly E[],
  viewportHeight: number,
): { instant: E[]; later: E[] } {
  const instant: E[] = [];
  const later: E[] = [];
  for (const el of elements) (el.getBoundingClientRect().top < viewportHeight ? instant : later).push(el);
  return { instant, later };
}

/** An element as the play helpers see it: its box, and whether it has one (display: none gives none). */
export interface Boxed {
  getBoundingClientRect(): { top: number };
  getClientRects(): { length: number };
}

const hasBox = (el: Boxed): boolean => el.getClientRects().length > 0;

/**
 * Splits the data-play drawings at mount (A7, MS-8.13). instant: has a box and its top is above the
 * bottom of the viewport (in view or scrolled past), so it shows its finished state and never plays.
 * later: everything else, including elements with no box, which stay observed and play once shown.
 */
export function splitInitialPlay<E extends Boxed>(elements: readonly E[], viewportHeight: number): { instant: E[]; later: E[] } {
  const instant: E[] = [];
  const later: E[] = [];
  for (const el of elements) (hasBox(el) && el.getBoundingClientRect().top < viewportHeight ? instant : later).push(el);
  return { instant, later };
}

/** The play line, as a share of the viewport height from the top (MS-8.11). */
export const PLAY_LINE = 0.7;

/**
 * True when a drawing has reached the play line, 30% above the bottom of the viewport (MS-8.11, V25,
 * V32). A drawing that fits above the line plays only with its whole box on screen and either its
 * bottom at or above the line or its top in the top band (the top 30% of the viewport, so a flick on
 * a short phone cannot skip it). A taller one plays with its whole box on screen, or with its top
 * between one band above the top of the viewport and the top, and its bottom at or below the line
 * (never when a jump lands further down the figure). 1px is allowed for sub-pixel rounding.
 */
export function shouldPlay(r: { top: number; bottom: number }, vh: number): boolean {
  if (r.bottom <= 0 || r.top >= vh) return false;
  const line = vh * PLAY_LINE;
  const band = vh - line;
  const inView = r.top >= -1 && r.bottom <= vh + 1; // the whole box on screen
  if (r.bottom - r.top <= line) return inView && (r.bottom <= line + 1 || r.top <= band + 1); // fits above the line
  return inView || (r.top <= 1 && r.top >= -band - 1 && r.bottom >= line - 1); // too tall: in view, or covering the play area
}

/** Reads a millisecond motion token from :root, or the fallback when it is missing or does not parse. */
export function readMotionMs(name: string, fallback: number): number {
  try {
    return msToken(getComputedStyle(document.documentElement).getPropertyValue(name)) ?? fallback;
  } catch {
    return fallback;
  }
}
