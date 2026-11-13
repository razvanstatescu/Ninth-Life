/**
 * Scene 11 (the proof, bars 24-29) on the spatial stage: research-v2/15 6.3 A, "Lock and key, frontal". Beats, layout
 * and cameras; shared with s12 (which starts on s11's last frame). World = the phone world (components/mid/set3.tsx):
 * image px of the phone capture, one level floor (the phone's base line, FLOOR).
 *
 *   the lock      the five keys pressed for "water" (9 2 8 3 7) on a strip of the keypad's moon panel, floating
 *   the chip      "water" with its check, attached to the strip's top edge (24 px overlap): each code shows once
 *   the blade     the model's suggestion "wafer", standing on the floor, its code 9 2 3 3 7 as five teeth on its
 *                 top edge (one silhouette), each tooth under its key
 */
import { EIGHTH, atIn, sceneLen, sec } from '../../timeline';
import { aim, type Cam } from '../../lib/camera';
import { keyWordFrames } from '../type/Type';
import { PHONE_H, WATER } from './phone';
import { BLADE, CHIP, FACE_GAP, FLOOR, GROUND_X, KPAD, KS, KGAP, PHONE_DEPTH, PHONE_RIG, STRIP, TOOTH } from './set3';

export { KEYS, PROOF, REJECT, LEGEND } from './set3';

// ---- beats (local) -------------------------------------------------------------------------------------------------
export const END = sceneLen('s11');
export const CUT_HOLD = 2;
/** The lens push into "water" on the phone, the turntable settling from -4 to 0 (frontal before the chip is read). */
export const PUSH = { from: CUT_HOLD, dur: sec(0.42) };
/** The chip forms tight round the screen's own word, then lifts off the screen. */
export const FORM = { from: sec(0.22), dur: sec(0.28) };
export const LIFT = { from: sec(0.5), dur: sec(0.2) };
/** The phone recedes back and left (darkening, defocused) while the chip comes down to the lock, widening to take its check. */
export const RETREAT = { from: sec(0.55), dur: sec(1.1) };
export const DESCEND = { from: sec(0.65), dur: sec(0.95) };
export const WIDEN = { from: sec(0.9), dur: sec(0.5) };
/** Docked: the strip unfolds from under the chip; the keys rise out of it from the middle outwards. */
export const STRIP_IN = { from: sec(1.53), dur: sec(0.4) };
export const KEYS_IN = sec(1.68);
export const KEY_STEP = 5;
export const KEY_ORDER = [3, 1, 0, 2, 4]; // rank of keys 0..4 (8 first, then 2 and 3, then 9 and 7)
/** The blade slides in along the floor from the right, on n15's "sort the guesses". */
export const BLADE_IN = { from: sec(2.15), dur: sec(0.75) };
/** The narrator's key words for n16 ("every word must match"). */
export const MUST = keyWordFrames('s11', 'n16-must-match', 1, 4);
/** A truck left that makes room for the key words (frontal, no blur). */
export const STEP_LEFT = { from: MUST[0]! - sec(0.4), dur: sec(0.4) };
export const MUST_OUT = MUST[3]! + sec(0.25);
/** The lens push into the columns once "match." has landed. */
export const PUSH_IN = { from: MUST_OUT - sec(0.07), dur: sec(0.75) };
/** The teeth extend one per eighth like pistons; the third (3 against 8) is the impact on bar 27 beat 4. */
export const IMPACT = atIn('s11', 27, 4);
export const CHECK_AT = [IMPACT - 2 * EIGHTH, IMPACT - EIGHTH, IMPACT];
export const EXTEND = 8;
export const HOLD = 3;
export const STRIKE = { from: IMPACT + HOLD + sec(0.2), dur: 7 };
/** The teeth retract; the blade slides back and right, out of the lock's line, darkening and defocusing. */
export const RETRACT = { from: STRIKE.from + STRIKE.dur, dur: 12 };
export const EXIT = { from: STRIKE.from + STRIKE.dur + 4, dur: sec(1.2) };
export const PULL_BACK = EXIT;
/** Then "water" matches every key: 8, 3 and 7 take their check, one per eighth. */
export const CONFIRM_AT = [0, 1, 2].map((i) => EXIT.from + sec(0.65) + i * EIGHTH);
export const SWEEP = { from: atIn('s11', 29, 1), dur: sec(0.8) };

// ---- layout (world = phone image px) -------------------------------------------------------------------------------
export const CX = GROUND_X;
export const BLADE_LEFT = CX - BLADE.w / 2;
export const BLADE_TOP = FLOOR - BLADE.h;
export const STRIP_BOTTOM = BLADE_TOP - TOOTH.h - TOOTH.gap;
export const STRIP_TOP = STRIP_BOTTOM - STRIP.h;
export const STRIP_LEFT = CX - STRIP.w / 2;
export const keyLeft = (i: number) => STRIP_LEFT + KPAD + i * (KS + KGAP);
export const KEY_TOP = STRIP_TOP + KPAD;
/** The chip, attached: its bottom 24 px over the strip's top edge, its back on the strip's face. */
export const CHIP_REST = { x: CX - CHIP.w / 2, y: STRIP_TOP + 24 - CHIP.h, z: STRIP.depth + 1 };
/** The chip as it forms on the phone: its word on the screen's own "water", its back on the screen. */
export const CHIP_ON_PHONE = { x: WATER.x - CHIP.wordLeft, y: WATER.cy - CHIP.h / 2, z: PHONE_DEPTH + FACE_GAP + 1 };
/** The phone's retreat: back and left, out of the set's way. */
export const PHONE_AWAY = { x: -2050, z: -1900, veil: 0.62 };
/** The blade's exit: back and right, out of the lock's line. */
export const BLADE_AWAY = { x: 330, z: -440, dim: 0.55 };

/** The whole set, chip top to floor. */
export const SET = { top: CHIP_REST.y, bottom: FLOOR, mid: (CHIP_REST.y + FLOOR) / 2 };

// ---- cameras (phone rig: lens 12000 in lens mode, pitch 0, eye 302) ------------------------------------------------
const at = (p: { x: number; y: number; z?: number }, s: { x: number; y: number }, zoom: number, ry: number): Cam => aim(p, s, { ...PHONE_RIG, zoom, ry });

/** s10's last frame and s11's frame 0: the real phone standing on the floor, turned 4 degrees, whole in frame. */
export const PHONE_STAND_ZOOM = 0.43;
/** The phone's centre (frame included), world px. */
export const PHONE_MID = { x: CX, y: PHONE_H / 2 };
export const camStand = (zoom: number, ry: number): Cam => at({ x: CX, y: PHONE_H / 2, z: PHONE_DEPTH / 2 }, { x: 960, y: 540 }, zoom, ry);
export const CAM_STAND_END = camStand(PHONE_STAND_ZOOM, -4);

const WATER_C = { x: WATER.x + WATER.w / 2, y: WATER.cy, z: PHONE_DEPTH + FACE_GAP + 1 };
export const CAM_WATER = at(WATER_C, { x: 960, y: 520 }, 1.45, 0);
export const CAM_WATER2 = at(WATER_C, { x: 960, y: 520 }, 1.5, 0);
/** The whole lock and key, centred, frontal. */
export const CAM_SET = at({ x: CX, y: SET.mid }, { x: 960, y: 548 }, 0.95, 0);
export const CAM_SET2 = at({ x: CX, y: SET.mid }, { x: 960, y: 548 }, 0.975, 0);
/** Trucked left for the key words. */
export const CAM_LEFT = at({ x: CX, y: SET.mid }, { x: 700, y: 548 }, 0.95, 0);
export const CAM_LEFT2 = at({ x: CX, y: SET.mid }, { x: 700, y: 548 }, 0.968, 0);
/** The lens push: the five columns (keys, teeth, the blade's word) fill the frame. */
const COLUMNS = { x: CX, y: 1705 };
export const CAM_COMPARE = at(COLUMNS, { x: 960, y: 548 }, 1.16, 0);
export const CAM_COMPARE_CREEP = { ...CAM_COMPARE, zoom: CAM_COMPARE.zoom * 1.02 };
export const CAM_IMPACT_PUSH = { ...CAM_COMPARE, zoom: CAM_COMPARE.zoom * 1.02 * 1.04 };
/** After: "water" and its lock, large, the struck blade back and right, all of it in frame. */
const END_C = { x: CX + 120, y: SET.mid + 30 };
export const CAM_END = at(END_C, { x: 960, y: 548 }, 0.93, 0);
export const CAM_LAST = at(END_C, { x: 960, y: 548 }, 0.96, 0);

export { FLOOR, CHIP, STRIP, BLADE, TOOTH, KS, PHONE_DEPTH };

// ---- names the lab's diagnostics (src/lab3d/tools) read from the second cut, mapped onto this design ----------------
export const CAM_CHIP = CAM_WATER;
export const CAM_STRUCT_A = CAM_SET;
export const CAM_STRUCT_B = CAM_SET2;
export const CARD_W = BLADE.w;
export const CARD_L = { closedH: BLADE.h };
export const CARD_TOP_DOCK = BLADE_TOP;
export const FLOOR_Y = FLOOR;
export const CHIP_C = { x: CX, y: CHIP_REST.y + CHIP.h / 2 };
