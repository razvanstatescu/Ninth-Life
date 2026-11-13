/**
 * Real app captures (public/captures/*.png + src/data/captures.json), loaded defensively.
 *
 * captures.json is optional: webpack's require.context returns an empty context when the file is
 * missing, so the bundle still builds. A capture counts only when its JSON entry AND its PNG exist
 * (the PNG is checked against the bundle's list of public files). Anything missing returns null and
 * the scene draws a recreated screen in the same frame instead (see Screens.tsx).
 *
 * Box units are IMAGE pixels: [x, y, w, h] in the PNG (CSS px x dpr).
 */
import { getStaticFiles, staticFile } from 'remotion';

export type Box = [number, number, number, number];

export type CaptureEntry = {
  file: string;
  width: number;
  height: number;
  dpr: number;
  viewport?: [number, number];
  device?: string;
  layout?: string | null;
  state?: string;
  boxes: Record<string, Box>;
  texts?: Record<string, string>;
};

export type Capture = CaptureEntry & { src: string };

type JsonContext = { keys(): string[]; (id: string): unknown };
// webpack's require.context (not in @types/node). Module-scoped so it shadows the global type only here.
declare const require: { context(dir: string, deep: boolean, filter: RegExp): JsonContext };

const loadJson = (): Record<string, CaptureEntry> => {
  try {
    const ctx = require.context('../../data', false, /^\.\/captures\.json$/);
    const key = ctx.keys()[0];
    if (!key) return {};
    const mod = ctx(key) as Record<string, unknown> | null;
    const data = (mod && 'default' in mod ? mod.default : mod) as Record<string, CaptureEntry> | null;
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
};

const ALL = loadJson();

/** Set to true to preview the recreated screens everywhere (checks the fallback path). */
const FORCE_FALLBACK = false;

/** Names of the files in public/ (null when the environment does not list them). */
const publicNames = (): Set<string> | null => {
  try {
    const files = getStaticFiles();
    return files.length > 0 ? new Set(files.map((f) => f.name)) : null;
  } catch {
    return null;
  }
};

const valid = (e: CaptureEntry | undefined): e is CaptureEntry =>
  !!e && typeof e.file === 'string' && e.width > 0 && e.height > 0 && e.dpr > 0 && !!e.boxes && typeof e.boxes === 'object';

/** The capture with this id, or null if its entry or its image is missing. */
export const getCapture = (id: string): Capture | null => {
  if (FORCE_FALLBACK) return null;
  const e = ALL[id];
  if (!valid(e)) return null;
  const names = publicNames();
  if (names && !names.has(e.file)) return null;
  return { ...e, src: staticFile(e.file) };
};

/** A box from the capture if it has it, else from the defaults. */
export const boxOf = (cap: { boxes: Record<string, Box> } | null, fallback: { boxes: Record<string, Box> }, name: string): Box =>
  cap?.boxes[name] ?? fallback.boxes[name] ?? [0, 0, 0, 0];

/**
 * Geometry of the phone captures of 2026-11-10 (390 x 700 CSS px at 3x). Used to lay out the
 * recreated phone screen and the camera when a phone capture or its entry is missing, so both paths
 * frame the same parts.
 */
export const PHONE_DEFAULT: CaptureEntry = {
  file: '',
  width: 1170,
  height: 2100,
  dpr: 3,
  viewport: [390, 700],
  device: 'phone',
  boxes: {
    keypad: [36, 834, 1098, 1026],
    sentence: [36, 216, 1098, 402],
    'sentence-text': [84, 234, 693, 156],
    'sentence-digits': [84, 534, 399, 60],
    clear: [942, 240, 168, 168],
    speak: [372, 1884, 430, 192],
    status: [192, 54, 292, 108],
    menu: [36, 1884, 312, 192],
    show: [826, 1884, 308, 192],
    candidates: [18, 624, 1134, 204],
    'candidate-1': [36, 642, 839, 168],
    more: [899, 642, 235, 168],
    'they-said': [966, 24, 168, 168],
    brand: [36, 42, 132, 132],
    header: [36, 24, 1098, 168],
  },
};

/** Image sizes of the tablet (1133 x 658 @2x) and laptop (1440 x 900 @2x) captures. */
export const TABLET_DEFAULT: CaptureEntry = { file: '', width: 2266, height: 1316, dpr: 2, viewport: [1133, 658], device: 'tablet', boxes: {} };
export const LAPTOP_DEFAULT: CaptureEntry = { file: '', width: 2880, height: 1800, dpr: 2, viewport: [1440, 900], device: 'laptop', boxes: {} };
