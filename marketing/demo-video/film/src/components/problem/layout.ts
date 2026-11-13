/**
 * Scene 9's layout on the spatial stage (STYLE.md "Spatial rules"; research-v2/15, 6.1 A "One table, frontal").
 *
 * One world shared with s10: the origin is the landed keypad panel's centre (FOLD_LANDING.world), the level floor's
 * line is FOLD_LANDING.floorY, and the whole scene uses s10's rig (FOLD_LANDING.cam: lens, zoom mode, eye; no pitch,
 * yaw or roll) and s10's ground, so the fold ends on s10's frame 0 by moving the camera only. Nothing here copies a
 * number from the contract; it reads it.
 *
 *   back plane (z -700)   the other person's lines, upper left, drifting up (Talk.tsx)
 *   hero plane (z 0)      the person's side, floating just above the floor: the reply field over a plain grid of the
 *                         26 letters (rows of 7, 7, 6, 6), centred on the keypad, so that at the fold the field ends
 *                         behind the panel. The grey chip hides behind the field's top edge until it rises
 *   on the floor          the one switch, a dome, right of the grid
 *   screen                the narrator's key words, right third, top-aligned to the field
 */
import decoded from '../../data/decoded.json';
import { FOLD_LANDING } from '../handoff';
import { keyCenter, keypadLayout, type KeyId } from '../brand/Keypad';
import { aim, project, type Cam } from '../../lib/camera';

const L = FOLD_LANDING;

// ---- the landing (s10's frame 0) -----------------------------------------------------------------------
/** s10's frame-0 camera: the scene ends on it. */
export const LANDING_CAM: Cam = { ...L.cam };
/** The rig of the whole scene: s10's lens, zoom mode and eye; pitch, yaw and roll 0 (one lens for the chapter). */
export const RIG = { lens: L.cam.lens, zoomMode: L.cam.zoomMode, eye: L.cam.eye, rx: 0, ry: 0, rz: 0 } as const;
export const FLOOR_Y = L.floorY;
/** lib/stage shadows lie on the floor in floor coordinates: x from the ground's centre, z towards the camera. */
export const floorX = (x: number) => x - L.stage.ground.x;
export const LAND = {
  ...L.world,
  key: L.keySize,
  depth: L.depth,
  light: L.light,
  spill: L.spill,
  turn: L.turn,
  ember: L.emberKey as KeyId,
};
export const PAD = keypadLayout(LAND.key);
/** A landed key's cap face, in front of the panel (Keypad body="slab": depth x size / 96). */
export const CAP_Z = LAND.depth * (LAND.key / 96);
const TH = (LAND.turn * Math.PI) / 180;
/**
 * A point of the landed keypad (panel px from its centre, z towards the camera) in world px. The panel is turned
 * LAND.turn degrees about its vertical centre line (rotateY): x' = x cos, z' = -x sin (handoff.ts).
 */
export const padToWorld = (p: { x: number; y: number; z?: number }) => {
  const z = p.z ?? 0;
  return { x: LAND.x + p.x * Math.cos(TH) + z * Math.sin(TH), y: LAND.y + p.y, z: -p.x * Math.sin(TH) + z * Math.cos(TH) };
};
/** Key `id`'s centre in panel px (before the turn). */
export const keyLocal = (id: KeyId) => keyCenter(id, LAND.key);

// ---- the grid --------------------------------------------------------------------------------------------
export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
/** A plain table of letters (rows of 7, 7, 6, 6, left-aligned): never staggered like a keyboard. */
const ROWS = [7, 7, 6, 6];
/** Cell edge in world px: 101 px on screen at zoom 1.15 (research-v2/15: 96 px or more). */
export const CELL = 88;
export const CELL_GAP = 12;
/** The cells' thickness (brand Key depth, at size 96): enough for a lit top sliver under a long lens. */
export const CELL_DEPTH = 20;
export const GRID_W = 7 * CELL + 6 * CELL_GAP;
export const GRID_H = 4 * CELL + 3 * CELL_GAP;
/** The grid floats this far above the floor: it is UI. The switch, a thing, stands on the floor. */
export const GRID_LIFT = 36;
export const GRID = { left: LAND.x - GRID_W / 2, top: FLOOR_Y - GRID_LIFT - GRID_H };

/** Row and column of letter i. */
export const rowCol = (i: number) => {
  let row = 0;
  let col = i;
  while (col >= ROWS[row]!) {
    col -= ROWS[row]!;
    row++;
  }
  return { row, col };
};
/** World centre of letter i's cell (on the hero plane, z 0). */
export const cellAt = (i: number) => {
  const { row, col } = rowCol(i);
  return { x: GRID.left + col * (CELL + CELL_GAP) + CELL / 2, y: GRID.top + row * (CELL + CELL_GAP) + CELL / 2 };
};
export const indexOf = (ch: string) => LETTERS.indexOf(ch.toUpperCase());

/** The key each letter belongs to, from the app's own legends. */
export const KEY_OF: Record<string, KeyId> = {};
for (const k of decoded.keypad.keys) {
  if (/^[A-Z]+$/.test(k.letters)) for (const ch of k.letters) KEY_OF[ch] = k.id as KeyId;
}
/** The keys that carry letters. */
export const LETTER_KEYS: KeyId[] = ['2', '3', '4', '5', '6', '7', '8', '9'];

// ---- the person's side above the grid ------------------------------------------------------------------
/** The reply field: as wide as the grid, 30 px above it. */
export const FIELD = { left: GRID.left, top: GRID.top - 30 - 108, w: GRID_W, h: 108, r: 32, depth: 30, text: 58, padX: 36 };
/**
 * The grey suggestion chip: it rises from behind the field's top edge and rests overlapping it by 20 px (still behind
 * it), at the field's right end, clear of the other person's lines on the left.
 */
export const CHIP = { w: 336, h: 90, r: 45, depth: 16, text: 48, overlap: 20, inset: 40, z: -28 };
export const CHIP_REST = { left: FIELD.left + FIELD.w - CHIP.inset - CHIP.w, top: FIELD.top + CHIP.overlap - CHIP.h };
/** How far below its rest the chip hides (its top 6 px under the field's top edge). */
export const CHIP_HIDE = CHIP.h - CHIP.overlap + 6;

/** The one switch: a plain dome of our own on a low base, standing on the floor right of the grid. */
export const SWITCH = { x: GRID.left + GRID_W + 150, w: 176, baseH: 44, domeW: 140, domeH: 72 };
export const SWITCH_H = SWITCH.baseH + SWITCH.domeH;

/** The fingertip (n09): a moon ring reaching for "I" that comes down between I and J, where J registers. */
export const TOUCH = { target: 'I', hit: 'J', landAt: 0.58, size: 84, hover: 160, from: { dx: 300, dy: 460 } };

// ---- cameras: one rig, optical zooms ('lens'), pitch and yaw 0 ---------------------------------------------
const frame = (p: { x: number; y: number }, at: { x: number; y: number }, zoom: number): Cam => aim(p, at, { zoom, ...RIG });
/** Home: the person's side large, the field's left edge at x 280, the floor line at y 915; the switch at right. */
export const HOME = frame({ x: GRID.left, y: FLOOR_Y }, { x: 280, y: 915 }, 1.15);
/**
 * n09 "Hard to hit": a closer look at the I and J cells (cells 141 px on screen). The whole grid and the switch stay
 * in; the field is at the top, clear of the words; the conversation is above the frame until the camera pulls back.
 */
const I = cellAt(indexOf('I'));
const J = cellAt(indexOf('J'));
export const MACRO = frame({ x: (I.x + J.x) / 2, y: I.y }, { x: 400, y: 520 }, 1.6);
/** How far the camera trucks right during a hold (world px): the floor and the back plane slide at their own speeds. */
export const DRIFT_X = 36;
/** Faces read up to zoom 1.5 go through <Crisp> (factor 2); above it, factor 1 (STYLE.md "Text on 3D planes"). */
export const crispAt = (zoom: number) => (zoom > 1.5 ? 1 : 2);

// ---- the other person's lines: a back plane in the same world -----------------------------------------------
/**
 * Plum bubbles on a plane at z -700 (type shows at 0.89 of its size): two slots, the newest at the bottom, set from
 * where they show at home, their left edge under the field's; the stack drifts up one slot in the time between the
 * first two lines, and a new line takes the bottom slot.
 */
const TALK_Z = -700;
/** World px on a plane at depth z that shows at screen px `at` (x or y) under `cam`. */
const onPlane = (axis: 'x' | 'y', at: number, z: number, cam: Cam) => {
  const p0 = project({ x: 0, y: 0, z }, cam);
  return (at - p0[axis]) / p0.scale;
};
export const TALK = {
  z: TALK_Z,
  left: onPlane('x', project({ x: FIELD.left, y: FIELD.top }, HOME).x, TALK_Z, HOME),
  slot0: onPlane('y', 152, TALK_Z, HOME),
  text: 56,
  padX: 32,
  padY: 16,
  lineHeight: 1.1,
  gap: 16,
  veil: 0.15,
};
export const TALK_H = TALK.text * TALK.lineHeight + 2 * TALK.padY;
export const TALK_SLOT = TALK_H + TALK.gap;
/**
 * n12: the words. Up and in: the field and the chip mid-frame, the conversation above, the grid's last row just below
 * the frame (its top 4 px under the edge, no sliver) and the switch with it (it leaves the scene there, unseen).
 */
const WORDS_ZOOM = 1.3;
const LAST_ROW_TOP = cellAt(LETTERS.length - 1).y - CELL / 2;
export const WORDS = frame({ x: LAND.x, y: LAST_ROW_TOP }, { x: 700, y: 1084 }, WORDS_ZOOM);

// ---- screen-space text -----------------------------------------------------------------------------------
/** The narrator's key words: the right third, top-aligned to the field in each framing. */
export const WORDS_COL = { x: 1250, maxWidth: 640, size: 100, small: 46, lineHeight: 1.08 };
/** Screen y of the field's top edge under a camera. */
export const fieldTopOn = (cam: Cam) => project({ x: FIELD.left, y: FIELD.top, z: FIELD.depth }, cam).y;
