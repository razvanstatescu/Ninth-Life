/**
 * The film's motion vocabulary. Everything is driven by the frame number: no CSS transitions or
 * animations, no timers, no Math.random() (use random(seed) from remotion).
 */
import { Easing, interpolate } from 'remotion';
import { FPS } from '../timeline';

/** Easing curves. Nothing overshoots: the brand forbids bounce. */
export const EASE = {
  /** Camera moves and big arrivals: fast start, long soft landing. */
  camera: Easing.bezier(0.16, 1, 0.3, 1),
  /** Mask reveals of type. */
  reveal: Easing.bezier(0.16, 1, 0.3, 1),
  /** Brand "motion-ease-out" (fades, small moves). */
  out: Easing.bezier(0.2, 0, 0, 1),
  /** Symmetric move between two holds. */
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  /** A whip between two framings: hard acceleration, hard landing (pair with motion blur). */
  whip: Easing.bezier(0.7, 0, 0.2, 1),
  /** A long flight across the world (more than about 300 px on screen): even, unhurried, soft landing. */
  flight: Easing.bezier(0.45, 0, 0.15, 1),
  /** Accelerating exit (whip out, mask out). */
  in: Easing.bezier(0.7, 0, 0.84, 0),
  linear: Easing.linear,
} as const;

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Value going from `from` to `to` between frames [start, start + dur], clamped, eased. */
export const ramp = (
  frame: number,
  start: number,
  dur: number,
  from = 0,
  to = 1,
  easing: (t: number) => number = EASE.out,
) => interpolate(frame, [start, start + Math.max(1, dur)], [from, to], { ...CLAMP, easing });

/** 0 before `start`, 1 from `start` on: a cut. */
export const cut = (frame: number, start: number) => (frame >= start ? 1 : 0);

/** 1 while start <= frame < end. */
export const during = (frame: number, start: number, end: number) => (frame >= start && frame < end ? 1 : 0);

/** The app's highlight change: linear, 120 ms. Returns 0..1 from `start`. */
export const jump = (frame: number, start: number) => ramp(frame, start, Math.round(0.12 * FPS), 0, 1, EASE.linear);

/** Frame held between steps of `hz` per second (Act 1's stepped motion uses 12). */
export const stepped = (frame: number, hz: number) => {
  const step = FPS / hz;
  return Math.floor(frame / step) * step;
};

/** Linear interpolation helper. */
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The brand-safe impact (research-v2/11, 3.7): the subject's clock stops for `n` frames at `at`
 * (2 to 4), then runs on, `n` frames late. Pair it with a 4 to 6% push over 6 to 8 frames and a sub hit
 * on the first held frame. Never a white or inverted frame.
 *   const t = impact(frame, HIT, 3); // drive the subject with t instead of frame
 */
export const impact = (frame: number, at: number, n = 3) => (frame < at ? frame : frame < at + n ? at : frame - n);

/**
 * "The frame rate comes back" (research-v2/11, 4.1B): a frame value that steps at `rates[i]` Hz
 * from `starts[i]` on, ending smooth. E.g. rateRamp(f, [0, 15, 30, 45], [12, 20, 30, 60]).
 */
export const rateRamp = (frame: number, starts: number[], rates: number[]) => {
  let hz = rates[0] ?? FPS;
  for (let i = 0; i < starts.length; i++) if (frame >= starts[i]!) hz = rates[i] ?? hz;
  return hz >= FPS ? frame : stepped(frame, hz);
};

/** Interpolate a value through keyframes [[frame, value], ...] with one easing for every segment. */
export const keyframes = (frame: number, keys: [number, number][], easing: (t: number) => number = EASE.camera) => {
  if (keys.length === 0) return 0;
  if (frame <= keys[0]![0]) return keys[0]![1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, v1] = keys[i]!;
    const [f0, v0] = keys[i - 1]!;
    if (frame <= f1) return f1 === f0 ? v1 : mix(v0, v1, easing((frame - f0) / (f1 - f0)));
  }
  return keys[keys.length - 1]![1];
};
