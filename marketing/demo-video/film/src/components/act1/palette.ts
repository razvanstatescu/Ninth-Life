/**
 * Act 1's own palette (02-creative-direction.md, section 4). No ember anywhere in Act 1 until the
 * dot warms at 0:26.2 (S05). Fonts: Tiny5 on the pixel screen, VT323 for the set's display and the
 * act's lines (both loaded by src/fonts.ts).
 */
export const A1 = {
  /** The pixel screen: light ground and dark dots (the hobbyist 84 x 48 palette). */
  lcdLight: '#c7f0d8',
  lcdDark: '#43523d',
  /** Pale green of the act's lines and the set's on-screen display. */
  text: '#bfe8cc',
  /** Key legends on the plates: a little brighter than the glow so they read through it. */
  legend: '#e4fbea',
  /** The glow under a lit key. */
  keyGlow: '#c7f0d8',
  /** The dark around the tube and the "set". */
  set: '#050507',
  /** A picture area with no signal (under the static). */
  noSignal: '#141418',
  /** Black after the switch-off (S04 end, S05). Darker than night #140a2e, as the handoff asks. */
  black: '#030206',
  /** The dot before it warms. */
  dotPale: '#d7dcdc',
} as const;

export const A1_FONT = {
  pixel: '"Tiny5", monospace',
  tv: '"VT323", monospace',
} as const;

/** The hand-off to S06 (STYLE.md, "Transitions between scenes"). */
export const DOT = {
  x: 960,
  y: 540,
  size: 28,
  ember: '#ffb13d',
  emberGlow: '0 0 24px rgba(255,177,61,0.6)',
} as const;
