/**
 * Real app captures for scenes 13 to 16 (src/data/captures.json, written by the capture agent).
 *
 * Code defensively: a capture is used only when its JSON entry exists, its PNG is in public/, and
 * (where we know it) the text it shows is the text the scene expects. A scene asks for a whole GROUP
 * of captures at once (for example every scan still), so a sequence is never half real and half
 * recreated: if one still of the group is missing, the scene draws the recreated screen for all of them.
 *
 * Boxes in captures.json are in IMAGE pixels ([x, y, w, h]); cssBox() turns them into CSS px of the
 * app's viewport (image px / dpr), the space the recreated screens are drawn in too.
 */
import { getStaticFiles } from 'remotion';
import raw from '../../data/captures.json';

export type Box = [number, number, number, number];

export type Capture = {
  file: string;
  width: number;
  height: number;
  dpr: number;
  viewport: [number, number];
  boxes: Record<string, Box | undefined>;
  texts: Record<string, string | undefined>;
};

const ALL = raw as unknown as Record<string, Partial<Capture> | undefined>;

let names: Set<string> | null | undefined;
/** Files in public/ as the bundle lists them, or null when the list is not available. */
const publicFiles = (): Set<string> | null => {
  if (names !== undefined) return names;
  try {
    const list = getStaticFiles();
    names = list.length ? new Set(list.map((f) => f.name.replace(/\\/g, '/').replace(/^\/+/, ''))) : null;
  } catch {
    names = null;
  }
  return names;
};

const norm = (s: string | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

/**
 * One capture, or null when it is missing or does not show what the scene expects.
 * `expect` maps text names (e.g. 'sentence-text') to the text the still must show.
 */
export const capture = (id: string, expect: Record<string, string> = {}): Capture | null => {
  const c = ALL[id];
  if (!c || typeof c.file !== 'string' || !c.width || !c.height || !c.viewport || !c.boxes) return null;
  const files = publicFiles();
  if (files && !files.has(c.file.replace(/^\/+/, ''))) return null;
  for (const [k, v] of Object.entries(expect)) {
    if (norm(c.texts?.[k]) !== norm(v)) return null;
  }
  return {
    file: c.file,
    width: c.width,
    height: c.height,
    dpr: c.dpr ?? c.width / c.viewport[0],
    viewport: c.viewport,
    boxes: c.boxes,
    texts: c.texts ?? {},
  };
};

/** Every capture of a group, or null if any one is missing (then the scene recreates them all). */
export const captureGroup = (specs: { id: string; expect?: Record<string, string> }[]): Capture[] | null => {
  const out: Capture[] = [];
  for (const s of specs) {
    const c = capture(s.id, s.expect);
    if (!c) return null;
    out.push(c);
  }
  return out;
};

/** Ids of the captures whose id starts with `prefix`, sorted. */
export const captureIds = (prefix: string) =>
  Object.keys(ALL)
    .filter((k) => k.startsWith(prefix))
    .sort();

/**
 * The first capture (by id) with this prefix that passes `test`. Used to pick stills by what they show
 * (sentence text, where the highlight is), so a renumbered capture set still lands in the right place.
 */
export const findCapture = (prefix: string, test: (c: Capture) => boolean): Capture | null => {
  for (const id of captureIds(prefix)) {
    const c = capture(id);
    if (c && test(c)) return c;
  }
  return null;
};

/** Two boxes are the same within `tol` px. */
export const sameBox = (a: Box | undefined, b: Box | undefined, tol = 4) => !!a && !!b && a.every((v, i) => Math.abs(v - b[i]!) <= tol);

/** The visible text of a capture element, whitespace normalised. */
export const textOf = (c: Capture, name: string) => norm(c.texts[name]);

/** A box of a capture in CSS px of the app's viewport, or undefined. */
export const cssBox = (c: Capture, name: string): Box | undefined => {
  const b = c.boxes[name];
  if (!b) return undefined;
  const d = c.dpr || 1;
  return [b[0] / d, b[1] / d, b[2] / d, b[3] / d];
};

/** Centre of a box. */
export const boxCentre = (b: Box) => ({ x: b[0] + b[2] / 2, y: b[1] + b[3] / 2 });
