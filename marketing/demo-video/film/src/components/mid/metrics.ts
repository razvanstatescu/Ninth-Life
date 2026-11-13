/**
 * Advance widths of the few strings whose exact size the camera or a layout needs, in em of the
 * font size. Measured on 2026-11-10 in headless Chrome with the film's own font files
 * (public/fonts/atkinson-hyperlegible-next-latin.woff2 and -mono-latin.woff2).
 */
export const EM = {
  /** Sans 600 (the sentence card, chips). */
  sentence: 5.7778, // "I need water"
  sentenceHead: 3.2813, // "I need " (with the space)
  water: 2.5122,
  wafer: 2.4886,
  /** Mono 500, letter-spacing 0.04em (chip codes). */
  code5: 3.36, // "92837", "92337"
  /** Sans 800, letter-spacing -0.015em (supers). */
  supers: {
    'Press 2 to 9.': 5.8861,
    'One press per letter.': 9.695,
    'It finds the sentence.': 10.107,
    'Then it speaks.': 7.2331,
    'Every spoken word': 8.8211,
    'matches your keys.': 9.01,
    'A model can help rank sentences.': 15.9591,
    'It cannot put words in your mouth.': 16.3081,
    'Works offline.': 6.5891,
    'Phone. Tablet.': 6.722,
    'Laptop. Any modern browser.': 13.732,
  } as Record<string, number>,
} as const;

/** Where "water" sits inside "I need water" (fractions of the sentence's width). */
export const WATER_FROM = EM.sentenceHead / EM.sentence;
export const WATER_SPAN = EM.water / EM.sentence;

/**
 * Second cut (s10 to s12): advance widths in em, measured 2026-11-10 with canvas measureText in Remotion's
 * headless Chromium, the film's own font files loaded from bytes (fonts confirmed loaded).
 */
export const W600: Record<string, number> = {
  I: 0.4145,
  'I ': 0.717,
  ' ': 0.3025,
  need: 2.2614,
  water: 2.5121,
  waves: 2.7837,
  yates: 2.4177,
  waver: 2.6544,
  h: 0.5646,
  g: 0.5822,
  m: 0.8703,
  of: 0.9134,
  off: 1.2738,
  w: 0.7228,
  ya: 1.0279,
  wat: 1.6023,
  wave: 2.2868,
  'I need water': 5.7931,
  'I need ': 3.2809,
  wafer: 2.4886,
  Offline: 3.1403,
  'On device': 4.5883,
  'What do you need?': 8.7938,
  'They said': 4.4066,
  'Model ranking (opt-in)': 10.2113,
};
/** Sans 800 (supers and the spoken line), letter-spacing 0. */
export const W800: Record<string, number> = {
  'I need water.': 6.329,
  'Nine big keys.': 6.903,
  'One press per letter.': 10.03,
  'It finds the sentence.': 10.437,
  'Every word must match.': 11.673,
  'It still works.': 6.597,
  'ghost mode': 5.709,
};
/** Mono 500: every glyph (digits and the space) advances 0.632 em. */
export const MONO_ADV = 0.632;
/** Width of a word in sans 600 at font size `px` (falls back to 0.56 em a letter). */
export const w600 = (word: string, px: number) => (W600[word] ?? word.length * 0.56) * px;
