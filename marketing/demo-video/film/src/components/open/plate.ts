/**
 * The old phone's keypad for s06 ("Same keys", 07-revision-v2.md V5): the Act 1 still
 * public/img/v2/v2-p3-keypad.png (3840 x 2160, the keypad straight on, under dust, in the drawer) and its
 * light pass v2-p3-lit.png (they line up to 0 px).
 *
 * Key quads come from src/data/plates-v2.json (the Act 1 builder's measurement, fit error about 2 px):
 * read, never copied, so a re-measure flows through. The quads are axis-aligned on this still.
 *
 * World units in s06/s07 are screen px at zoom 1. The plate is drawn at PLATE.scale with key 9's centre
 * at world (0, 0): the hand-off dot (screen 960, 540) sits exactly on key 9 when the camera is at the
 * origin, zoom 1, flat.
 */
import plates from '../../data/plates-v2.json';
import type { KeyId } from '../brand/Keypad';

type Pt = [number, number];
type PlateEntry = { file: string; width: number; height: number; keys: Record<string, { center: Pt; quad: Pt[] }> };
const P3 = (plates as unknown as Record<string, PlateEntry>)['v2-p3-keypad']!;

export const PLATE = {
  file: P3.file,
  width: P3.width,
  height: P3.height,
  /** World px per plate px. Keys are then about 310 x 152 px on screen at zoom 1. */
  scale: 0.6,
  /** Corner radius of the rubber keys, plate px (read off the overlay). */
  keyRadius: 112,
} as const;

/** The app's key ids in the old keypad's places: 1-9, then star (Back), 0 (Space), hash (Next). */
export const OLD_ROWS: KeyId[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['star', '0', 'hash'],
];

const quadBox = (id: KeyId) => {
  const q = P3.keys[id]!.quad;
  const xs = q.map((p) => p[0]);
  const ys = q.map((p) => p[1]);
  return { l: Math.min(...xs), t: Math.min(...ys), r: Math.max(...xs), b: Math.max(...ys) };
};

/** Key 9's centre in plate px: the world origin. */
export const KEY9_PLATE = { x: P3.keys['9']!.center[0], y: P3.keys['9']!.center[1] };

/** Plate px to world px. */
export const plateToWorld = (x: number, y: number) => ({ x: (x - KEY9_PLATE.x) * PLATE.scale, y: (y - KEY9_PLATE.y) * PLATE.scale });

export type WBox = { l: number; t: number; r: number; b: number; radius: number };

/** An old key's box in world px. */
export const oldKeyBox = (id: KeyId): WBox => {
  const q = quadBox(id);
  const a = plateToWorld(q.l, q.t);
  const z = plateToWorld(q.r, q.b);
  return { l: a.x, t: a.y, r: z.x, b: z.y, radius: PLATE.keyRadius * PLATE.scale };
};

/** The old keypad's box (all twelve keys) in world px. */
export const oldKeypadBox = (): WBox => {
  const boxes = OLD_ROWS.flat().map(oldKeyBox);
  return {
    l: Math.min(...boxes.map((b) => b.l)),
    t: Math.min(...boxes.map((b) => b.t)),
    r: Math.max(...boxes.map((b) => b.r)),
    b: Math.max(...boxes.map((b) => b.b)),
    radius: 0,
  };
};

/** The plate's own box in world px (where the <Img> goes). */
export const plateBox = () => {
  const a = plateToWorld(0, 0);
  return { l: a.x, t: a.y, w: PLATE.width * PLATE.scale, h: PLATE.height * PLATE.scale };
};

export const boxCenter = (b: WBox) => ({ x: (b.l + b.r) / 2, y: (b.t + b.b) / 2 });

export const mixWBox = (a: WBox, z: WBox, p: number): WBox => ({
  l: a.l + (z.l - a.l) * p,
  t: a.t + (z.t - a.t) * p,
  r: a.r + (z.r - a.r) * p,
  b: a.b + (z.b - a.b) * p,
  radius: a.radius + (z.radius - a.radius) * p,
});

/** Grow a box by `d` px on every side. */
export const growBox = (b: WBox, d: number): WBox => ({ l: b.l - d, t: b.t - d, r: b.r + d, b: b.b + d, radius: b.radius + d });
