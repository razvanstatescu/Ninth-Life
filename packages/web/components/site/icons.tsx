/**
 * Website-only icons (round 4, 2026-11-13; decisions §1.5). The same style as the app's
 * components/Icon.tsx: a 24px grid, a 2.5px round stroke in currentColor, the nl-icon class (components.css). They
 * live here so the app's bundle does not carry them: each icon is a named export of its path data, so a client
 * component (KeypadDemo) bundles only the icons it imports, and server components cost markup only.
 *
 * App icons (speaker, voice, check, plus, x, back, space, gear, switch, save, menu, show, flip, spell, said, mic,
 * stop, offline) stay in components/Icon.tsx: use <Icon name="…" /> for those, never a copy here.
 *
 *   <SiteIcon d={replay} />                 decorative: aria-hidden, not focusable (the usual case: beside its word)
 *   <SiteIcon d={info} label="Note" />      a named image (role="img"), only where no word says it
 *   <SiteIcon d={arrow} turn="up" />        a still quarter turn: up, down or left (arrow, external, …)
 *
 * Never drawn here: people or hands, devices with features, third-party marks, sparkles, shields or badges, hearts.
 * Circles are two arcs, so one renderer draws every icon. Every point stays inside the 24px box (site-icons test).
 * A name that clashes with a local name can be aliased: import { play as playIcon } from './icons'.
 */
import type { ReactElement } from 'react';

/** The path data of one icon: one or more `d` strings on the 24px grid. */
export type IconPaths = readonly string[];

// ---- actions --------------------------------------------------------------------------------------
/** Play (a triangle): play the example. */
export const play: IconPaths = ['M8.5 5.5v13L19 12z'];
/** Play again (an arrow turning back): replay a sequence. */
export const replay: IconPaths = ['M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 8.9', 'M4.5 4.5v4.4h4.4'];
/** Delete the last key (a key pointing left with an x). */
export const backspace: IconPaths = ['M9 5.5h9.5a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9L3.5 12z', 'M12 9.5l5 5M17 9.5l-5 5'];
/** Goes to (→). turn="up" | "down" | "left" for the other directions. */
export const arrow: IconPaths = ['M4.5 12h15', 'M13.5 6l6 6-6 6'];
/** Leaves the site (a box with an arrow out of its corner). */
export const external: IconPaths = ['M13.5 4.5h6v6', 'M19.5 4.5l-8.5 8.5', 'M17.5 14v5.5h-13v-13H10'];
/** Install (an arrow down onto a line). */
export const download: IconPaths = ['M12 4v10.5', 'M7.5 10l4.5 4.5 4.5-4.5', 'M5 19.5h14'];

// ---- states and notes -------------------------------------------------------------------------------
/** Not yet, not measured (a dash). */
export const minus: IconPaths = ['M5 12h14'];
/** Good to know (an i in a circle). */
export const info: IconPaths = ['M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17z', 'M12 11v5', 'M12 7.75h.01'];
/** Report a problem (a flag). */
export const report: IconPaths = ['M6 20.5v-16', 'M6 5h11.5L15 9l2.5 4H6'];
/** Timing, scan speed (a clock). */
export const clock: IconPaths = ['M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17z', 'M12 7.5V12l3 2'];

// ---- ways to type and your view ------------------------------------------------------------------------
/** A key (a keycap with its front edge). */
export const key: IconPaths = ['M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z', 'M4 15.5h16'];
/** The 9 keys (a dial pad of dots). */
export const keypad: IconPaths = ['M6 5.5h.01M12 5.5h.01M18 5.5h.01M6 12h.01M12 12h.01M18 12h.01M6 18.5h.01M12 18.5h.01M18 18.5h.01'];
/** A computer keyboard. */
export const keyboard: IconPaths = [
  'M5 6.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z',
  'M7 10h.01M10.33 10h.01M13.67 10h.01M17 10h.01',
  'M8.5 14h7',
];
/** Your view (an eye). */
export const view: IconPaths = ['M3 12c2.2-3.8 5.2-6 9-6s6.8 2.2 9 6c-2.2 3.8-5.2 6-9 6s-6.8-2.2-9-6z', 'M12 9.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z'];
/** Phones, tablets and laptops: two bare boxes, no device features (MS-4.3). */
export const screens: IconPaths = ['M3 6h12v9H3z', 'M17.5 9h3.5v9h-3.5z'];
/** Day. */
export const sun: IconPaths = [
  'M12 8.25a3.75 3.75 0 1 0 0 7.5a3.75 3.75 0 1 0 0-7.5z',
  'M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
];
/** Night. */
export const moon: IconPaths = ['M19.5 14.5A8 8 0 1 1 9.5 4.5a7.5 7.5 0 0 0 10 10z'];

// ---- privacy ------------------------------------------------------------------------------------------
/** A setting you turn on (a switch, on). */
export const toggle: IconPaths = ['M8 7h8a5 5 0 0 1 0 10H8a5 5 0 0 1 0-10z', 'M16 9.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z'];
/** Stays on this device (a padlock). */
export const lock: IconPaths = [
  'M8 10V7.5a4 4 0 0 1 8 0V10',
  'M6.5 10h11a1.5 1.5 0 0 1 1.5 1.5v6.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18v-6.5A1.5 1.5 0 0 1 6.5 10z',
  'M12 13.75v2',
];
/** Sent to a server (a cloud). */
export const cloud: IconPaths = ['M16 17.5H9.5a5.5 5.5 0 1 1 5.03-7.72a4 4 0 1 1 1.47 7.72z'];
/** Online, languages (a globe). */
export const globe: IconPaths = [
  'M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17z',
  'M3.5 12h17',
  'M12 3.5c-2.3 2.3-3.4 5.2-3.4 8.5s1.1 6.2 3.4 8.5c2.3-2.3 3.4-5.2 3.4-8.5S14.3 5.8 12 3.5z',
];

// ---- project ------------------------------------------------------------------------------------------
/** Source code (angle brackets and a slash). */
export const code: IconPaths = ['M8.5 7.5L4 12l4.5 4.5', 'M15.5 7.5L20 12l-4.5 4.5', 'M13.5 5l-3 14'];
/** Results (three bars on a baseline). */
export const chart: IconPaths = ['M4 19.5h16', 'M7 16v-4.5M12 16V6.5M17 16V9.5'];

const TURN = { up: 'rotate(-90 12 12)', down: 'rotate(90 12 12)', left: 'rotate(180 12 12)' } as const;

/**
 * One website icon. Decorative unless `label` is given (then role="img" with that name). `turn` rotates the drawing
 * a still quarter or half turn and adds `site-icon--{turn}`, so site.css can point a link's hover hint the same way.
 */
export function SiteIcon({
  d,
  label,
  className,
  turn,
}: {
  d: IconPaths;
  label?: string;
  className?: string;
  turn?: keyof typeof TURN;
}): ReactElement {
  let cls = 'nl-icon';
  if (turn) cls += ` site-icon--${turn}`;
  if (className) cls += ` ${className}`;
  const paths = d.map((p) => <path key={p} d={p} />);
  return (
    <svg className={cls} viewBox="0 0 24 24" aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label} focusable="false">
      {turn ? <g transform={TURN[turn]}>{paths}</g> : paths}
    </svg>
  );
}
