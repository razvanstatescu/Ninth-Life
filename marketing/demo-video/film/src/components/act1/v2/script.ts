/**
 * The second cut's Act 1, as data: every time (ABSOLUTE film frames), what the old phone's screen shows, its
 * backlight, and which key is lit. research-v2/10-act1-old-world.md section 6, retimed to the measured
 * narration (07-revision-v2.md section 3; timeline.ts NARRATION_AT n01-n06).
 *
 * Shots: 1 dead air (the tube) - 2 through the glass - 3 the drawer, the phone wakes - 4 the macro: the idle
 * screen, then ghost typing - 5 the keypad still, key 0 - 6a the macro, Hello accepted, battery low, the lights die - 6 the dark
 * drawer - 7 out through the glass, the set switches off - 8 the dot.
 * The backlight and the screen change on Act 1's 12 Hz grid (5 frames); the camera moves smoothly.
 */
import { NARRATION_AT, sec } from '../../../timeline';
import { LCD_STEP, render, type Bits, type LcdState } from './lcdModel';
import type { PlateKey } from './plates';

/** Snap a time to Act 1's 12 Hz grid. */
const grid = (s: number) => Math.round(sec(s) / LCD_STEP) * LCD_STEP;

export const A1V2 = {
  tvOn: 20,
  osd: sec(0.8),
  noSignalOff: sec(2.5),
  thin: sec(2.5),
  roll: [sec(2.55), sec(2.95)] as const,
  lock: sec(3.0),
  channelOff: sec(3.0),
  /** Shot 2: the push through the glass. */
  push: [sec(3.0), sec(3.6)] as const,
  /** Shot 3: the drawer. */
  shot3: sec(3.6),
  /** The backlight wakes: half, low, full, one 12 Hz step apart. After n01 ends (4.75 s). */
  wake: grid(5.0),
  /** Shot 4: cut to the macro, where the idle screen reads (23:59, Fri 31 Oct); then the editor opens. */
  shot4: sec(5.4),
  editor: sec(6.3),
  /** Keys 4, 3, 5, 5, 6 (n02 from 6.6 s: "Nine keys." over the first, "One press per letter." over the last). */
  presses: [sec(6.8), sec(7.3), sec(7.8), sec(8.3), sec(8.8)],
  pressKeys: ['4', '3', '5', '5', '6'] as PlateKey[],
  /** Shot 5: the keypad still for the 0 press; Hello is accepted. */
  insert: sec(9.6),
  space: sec(9.75),
  /** Shot 6a: back to the macro, n03 from 10.25 s. */
  back: sec(10.2),
  /** The battery icon empties and blinks (silent), then the note and its beeps after n03 (ends 12.34 s). */
  batteryBlink: sec(11.6),
  batteryNote: grid(12.45),
  beeps: [sec(12.45), sec(12.75)],
  /** The lights die: half, then off. */
  death: grid(13.33),
  /** Shot 6: the dark drawer, n04 from 13.75 s; a cloud crosses the moon. */
  shot6: sec(13.6),
  cloud: [sec(14.6), sec(17.6)] as const,
  /** Shot 7: pull back into the tube, then the switch-off (collapse, then the line to the dot). */
  pull: [sec(17.95), sec(18.55)] as const,
  off: sec(18.6),
  /** Shot 8: the dot. */
  extraLines: [sec(22.4), sec(23.2)],
  wink: sec(23.9),
  winkLen: sec(0.6),
  warm: sec(25.2),
  warmLen: sec(1.3),
  linesOut: sec(27.5),
  end: sec(28),
} as const;

/** The tube's zoom at the end of the push; the clean drawer starts where the tube's picture left off. */
export const PUSH_ZOOM = 1.1;
/** Zoom of the clean drawer still that matches the tube's picture at PUSH_ZOOM (box 1872 x 1032 -> 1920 x 1080). */
export const DRAWER_ZOOM_AT_PUSH = (0.73125 * PUSH_ZOOM) / 0.75;

const WORDS = ['I', 'He', 'Gel', 'Hell', 'Hello'];

/** What the screen is asked to show at frame f (before the LCD's slow response). */
export const stateAt = (f: number): LcdState => {
  const A = A1V2;
  if (f < A.wake || f >= A.death) return { kind: 'off' };
  if (f < A.editor) return { kind: 'idle' };
  if (f >= A.batteryNote) return { kind: 'battery-low' };
  const low = f >= A.batteryBlink;
  const batt = low ? 0 : 1;
  const batteryShown = !low || Math.floor((f - A.batteryBlink) / sec(0.25)) % 2 === 0;
  if (f >= A.space) return { kind: 'editor', done: 'Hello', counter: 154, battery: batt, batteryShown, cursor: true };
  let n = 0;
  for (const p of A.presses) if (f >= p) n++;
  if (n === 0) return { kind: 'editor', counter: 160, battery: batt, batteryShown, cursor: true };
  return { kind: 'editor', word: WORDS[n - 1], counter: 160 - n, battery: batt, batteryShown, cursor: true };
};

/** The cursor's 1 Hz blink (on for the first half of each second, counted from when the editor opens). */
export const blinkAt = (f: number) => Math.floor((f - A1V2.editor) / sec(0.5)) % 2 === 0;

const cache = new Map<number, Bits>();
/** The screen's target bitmap at a step frame (memoised: many frames share a step). */
export const bitsAt = (stepFrame: number): Bits => {
  const hit = cache.get(stepFrame);
  if (hit) return hit;
  const b = render(stateAt(stepFrame), blinkAt(stepFrame));
  if (cache.size > 400) cache.clear();
  cache.set(stepFrame, b);
  return b;
};

/** The backlight (screen and keys) at frame f, 0..1, on the 12 Hz grid. */
export const backlightAt = (f: number) => {
  const A = A1V2;
  const s = Math.floor(f / LCD_STEP) * LCD_STEP;
  if (s < A.wake) return 0;
  if (s < A.wake + LCD_STEP) return 0.45;
  if (s < A.wake + 2 * LCD_STEP) return 0.15;
  if (s < A.death) return 1;
  if (s < A.death + LCD_STEP) return 0.4;
  return 0;
};

/** The pressed key's extra light at frame f: on at once, three steps, half for one, then off. */
export const pressAt = (f: number): { k: PlateKey; amount: number } | null => {
  const A = A1V2;
  const all: { k: PlateKey; at: number }[] = [...A.presses.map((at, i) => ({ k: A.pressKeys[i]!, at })), { k: '0' as PlateKey, at: A.space }];
  let out: { k: PlateKey; amount: number } | null = null;
  for (const p of all) {
    if (f < p.at) continue;
    const d = f - p.at;
    if (d < 3 * LCD_STEP) out = { k: p.k, amount: 1 };
    else if (d < 4 * LCD_STEP) out = { k: p.k, amount: 0.45 };
  }
  return out;
};

/** Narrator line starts (absolute), for reference in comments and checks. */
export const N = NARRATION_AT;
