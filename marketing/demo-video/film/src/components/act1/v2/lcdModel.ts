/**
 * The old phone's 96 x 64 monochrome screen, as data (research-v2/10-act1-old-world.md, sections 3.2-3.4).
 * Pure functions: a screen state -> a 1-bit 96 x 64 bitmap, and the bitmaps over time -> per-pixel darkness
 * with the slow LCD response. Drawing is LcdSurface (LcdView.tsx).
 *
 * Glyphs come pre-rasterised from two SIL OFL pixel fonts (lcd-glyphs.json, scripts/images/lcd-glyphs.py):
 * "small" = Tiny5 8 px (status, counter, soft keys), "large" = Departure Mono 11 px, drawn twice 1 px apart
 * (old bitmap bolding) for the typed text and the clock. Every icon is our own drawing.
 */
import glyphData from './lcd-glyphs.json';

export const LCD_W = 96;
export const LCD_H = 64;

type Font = 'small' | 'large';
type Glyph = { adv: number; x: number; y: number; rows: string[] };
const GLYPHS = glyphData as unknown as Record<Font, { glyphs: Record<string, Glyph> }>;

export type Bits = Uint8Array;
const newBits = (): Bits => new Uint8Array(LCD_W * LCD_H);

const set = (b: Bits, x: number, y: number, v = 1) => {
  if (x >= 0 && x < LCD_W && y >= 0 && y < LCD_H) b[y * LCD_W + x] = v;
};
const rect = (b: Bits, x0: number, y0: number, x1: number, y1: number, v = 1) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(b, x, y, v);
};

/** Ink extent of a string from its pen origin: [left, right) in px. */
export const measure = (s: string, font: Font, bold = false) => {
  let pen = 0;
  let left = Infinity;
  let right = -Infinity;
  for (const ch of s) {
    const g = GLYPHS[font].glyphs[ch] ?? GLYPHS[font].glyphs['?']!;
    const w = g.rows[0]?.length ?? 0;
    if (w > 0) {
      left = Math.min(left, pen + g.x);
      right = Math.max(right, pen + g.x + w + (bold ? 1 : 0));
    }
    pen += g.adv;
  }
  return left === Infinity ? { left: 0, right: 0, width: 0 } : { left, right, width: right - left };
};

/** Stamp a string with its pen origin at (x, y) (glyph rows are relative to the origin). */
const stamp = (b: Bits, s: string, x: number, y: number, font: Font, bold = false, v = 1) => {
  let pen = x;
  for (const ch of s) {
    const g = GLYPHS[font].glyphs[ch] ?? GLYPHS[font].glyphs['?']!;
    g.rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        if (row[c] !== '1') continue;
        set(b, pen + g.x + c, y + g.y + r, v);
        if (bold) set(b, pen + g.x + c + 1, y + g.y + r, v);
      }
    });
    pen += g.adv;
  }
};

/** Stamp so the ink's left edge is at x (or the ink's right edge at x, if `right`). */
const text = (b: Bits, s: string, x: number, y: number, font: Font, opt: { bold?: boolean; right?: boolean; center?: boolean } = {}) => {
  const m = measure(s, font, opt.bold);
  const ox = opt.center ? Math.round(x - m.width / 2) - m.left : opt.right ? x - m.right + 1 : x - m.left;
  stamp(b, s, ox, y, font, opt.bold);
  return m.width;
};

// --- our own icons --------------------------------------------------------------------------------

/** 5 x 7 aerial sign: an inverted triangle on a mast. */
const aerial = (b: Bits, x: number, y: number) => {
  rect(b, x, y, x + 4, y);
  set(b, x + 1, y + 1);
  set(b, x + 3, y + 1);
  rect(b, x + 2, y + 1, x + 2, y + 6);
};
/** Four signal bars, 2 px wide, heights 2/3/5/7, bottoms on row y + 6; empty bars keep a 2 x 1 base. */
const bars = (b: Bits, x: number, y: number, n: number) => {
  [2, 3, 5, 7].forEach((h, i) => {
    const bx = x + i * 3;
    rect(b, bx, i < n ? y + 7 - h : y + 6, bx + 1, y + 6);
  });
};
/** Battery: an 11 x 7 outline with a tip on the right and up to three 2 x 3 bars. */
const battery = (b: Bits, x: number, y: number, n: number) => {
  rect(b, x, y, x + 10, y);
  rect(b, x, y + 6, x + 10, y + 6);
  rect(b, x, y, x, y + 6);
  rect(b, x + 10, y, x + 10, y + 6);
  rect(b, x + 11, y + 2, x + 11, y + 4);
  for (let i = 0; i < n; i++) rect(b, x + 2 + i * 3, y + 2, x + 3 + i * 3, y + 4);
};
/** Predictive text on: a 3 x 3 grid of dots in 5 x 5 (it rhymes with the act's 3 x 3 wink). */
const predictive = (b: Bits, x: number, y: number) => {
  for (const i of [0, 2, 4]) for (const j of [0, 2, 4]) set(b, x + i, y + j);
};

// --- screens ----------------------------------------------------------------------------------------

export type LcdState =
  | { kind: 'off' }
  | { kind: 'idle'; clock?: string; date?: string; network?: string; battery?: number }
  | { kind: 'editor'; done?: string; word?: string; counter: number; battery?: number; batteryShown?: boolean; cursor?: boolean }
  | { kind: 'battery-low' }
  | { kind: 'lines'; lines: string[] };

/**
 * Named states, for reuse (PhoneScreen). The editor ones are the act's ghost typing after each press:
 * 'I' (4), 'He' (4 3), 'Gel' (4 3 5), 'Hell' (4 3 5 5), 'Hello' (4 3 5 5 6, the word still underlined),
 * 'hello' (after 0: Hello accepted, no underline, the cursor after a space).
 */
export const PRESET = {
  off: { kind: 'off' },
  idle: { kind: 'idle' },
  'editor-empty': { kind: 'editor', counter: 160, cursor: true },
  I: { kind: 'editor', word: 'I', counter: 159, cursor: true },
  He: { kind: 'editor', word: 'He', counter: 158, cursor: true },
  Gel: { kind: 'editor', word: 'Gel', counter: 157, cursor: true },
  Hell: { kind: 'editor', word: 'Hell', counter: 156, cursor: true },
  Hello: { kind: 'editor', word: 'Hello', counter: 155, cursor: true },
  hello: { kind: 'editor', done: 'Hello', counter: 154, cursor: true },
  'battery-low': { kind: 'battery-low' },
} satisfies Record<string, LcdState>;
export type PresetName = keyof typeof PRESET;

const header = (b: Bits, counter: number, batt: number, shown = true) => {
  aerial(b, 0, 0);
  bars(b, 6, 0, 0);
  const w = text(b, 'Abc', 19, -1, 'small');
  predictive(b, 19 + w + 2, 1);
  text(b, String(counter), 80, -1, 'small', { right: true });
  if (shown) battery(b, 83, 0, batt);
  for (let x = 0; x < LCD_W; x += 2) set(b, x, 8);
};
const softKeys = (b: Bits, left: string, right: string) => {
  if (left) text(b, left, 1, 56, 'small');
  if (right) text(b, right, 94, 56, 'small', { right: true });
};

/**
 * The bitmap of a state. `blink` is the cursor's phase (true = shown); the battery icon of an editor state
 * with `batteryShown: false` is hidden (the low-battery blink).
 */
export const render = (s: LcdState, blink = true): Bits => {
  const b = newBits();
  if (s.kind === 'off') return b;
  if (s.kind === 'idle') {
    aerial(b, 0, 0);
    bars(b, 6, 0, 0);
    battery(b, 83, 0, s.battery ?? 1);
    text(b, s.network ?? 'No network', 48, 10, 'small', { center: true });
    text(b, s.clock ?? '23:59', 48, 19, 'large', { center: true, bold: true });
    text(b, s.date ?? 'Fri 31 Oct', 48, 35, 'small', { center: true });
    softKeys(b, 'Menu', 'Names');
    return b;
  }
  if (s.kind === 'battery-low') {
    header(b, 154, 0);
    rect(b, 38, 15, 56, 15);
    rect(b, 38, 25, 56, 25);
    rect(b, 38, 15, 38, 25);
    rect(b, 56, 15, 56, 25);
    rect(b, 57, 18, 58, 22);
    text(b, 'Battery low', 48, 28, 'large', { center: true });
    softKeys(b, '', 'OK');
    return b;
  }
  if (s.kind === 'lines') {
    s.lines.forEach((line, i) => text(b, line, 48, 6 + i * 14, 'large', { center: true, bold: true }));
    return b;
  }
  // editor
  header(b, s.counter, s.battery ?? 1, s.batteryShown ?? true);
  const y = 8;
  let x = 1;
  if (s.done) x += text(b, s.done, x, y, 'large', { bold: true }) + 4;
  if (s.word) {
    const w = text(b, s.word, x, y, 'large', { bold: true });
    rect(b, x, y + 13, x + w - 1, y + 13);
    x += w + 1;
  }
  if ((s.cursor ?? true) && blink) rect(b, x, y + 2, x, y + 12);
  softKeys(b, 'Options', s.done || s.word ? 'Clear' : 'Back');
  return b;
};

// --- the slow LCD ------------------------------------------------------------------------------------

/** Act 1's 12 Hz grid at 60 fps: the screen takes a new image every 5 frames. */
export const LCD_STEP = 5;
const ON = [0.6, 0.9, 1];
const OFF = [0.5, 0.2];

/**
 * Per-pixel darkness 0..1 at frame f, with the response of an STN panel (research-v2/10, section 3.3): a new
 * state shows on the next 12 Hz step; new pixels darken over 3 steps (0.6, 0.9, 1), old ones clear over 3
 * (0.5, 0.2, 0). `bitsAt(stepFrame)` gives the target bitmap at a step.
 */
export const levels = (bitsAt: (stepFrame: number) => Bits, f: number) => {
  const s0 = Math.floor(f / LCD_STEP) * LCD_STEP;
  const t = [0, 1, 2, 3].map((k) => bitsAt(s0 - k * LCD_STEP));
  const out = new Float32Array(LCD_W * LCD_H);
  for (let i = 0; i < out.length; i++) {
    if (t[0]![i]) out[i] = t[1]![i] ? (t[2]![i] ? ON[2]! : ON[1]!) : ON[0]!;
    else if (t[1]![i]) out[i] = OFF[0]!;
    else if (t[2]![i]) out[i] = OFF[1]!;
  }
  return out;
};
