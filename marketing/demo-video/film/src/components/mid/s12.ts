/**
 * Scene 12 (no signal: ghost mode, bars 30-32) on the spatial stage: research-v2/15 6.4 A, "The ghost phone". Beats,
 * layout and cameras. One world with s11 (the phone world, components/mid/set3.tsx), starting on s11's last frame. No
 * dive: the phone stands on the floor; its body turns to glass and the dictionary shows inside it as texture.
 */
import { BEAT, atIn, sceneLen, sec } from '../../timeline';
import decoded from '../../data/decoded.json';
import { keyWordFrames, narrIn } from '../type/Type';
import { aim, type Cam } from '../../lib/camera';
import { PHONE_DEFAULT } from './capture';
import { PHONE_H, PHONE_W, PHONE_WATER } from './phone';
import { BEZEL, PHONE_DEPTH, PHONE_RIG } from './set3';
import { W600 } from './metrics';

export const END = sceneLen('s12');

// ---- beats (local) ------------------------------------------------------------------------------------------------
/** The swap: the lock packs away into the chip (keys sink, the strip folds under it), the chip flies to the phone and
 *  becomes its status pill, the phone comes forward from back-left, the blade goes on out to the right. */
export const SINK = { from: 1, step: 2, dur: 8 };
export const FOLD = { from: 10, dur: 14 };
export const MORPH = { from: 8, dur: sec(0.62) };
export const PHONE_IN = { from: 1, dur: sec(0.62) };
export const BLADE_OUT = { from: 1, dur: sec(0.6) };
export const SWAP_CAM = { from: 2, to: 44 };
/** Our signal icon on the phone's corner loses one bar per beat; on the last the pill reads the app's own "Offline". */
export const BAR_FALL = [1, 2, 3, 4].map((i) => atIn('s12', 30, 1) + i * BEAT);
export const OFFLINE_AT = BAR_FALL[3]!;
/** n18: "It still works." The body turns to glass over 30 frames from "It". */
export const WORKS = keyWordFrames('s12', 'n18-ghost-mode', 2, 3);
export const GLASS = { from: WORKS[0]!, dur: 30 };
/** The lens push to the phone's upper half, in the pause after "works.". */
const worksEnd = narrIn('s12', 'n18-ghost-mode', 4) + sec(0.42);
export const PUSH = { from: worksEnd - sec(0.05), dur: sec(0.6) };
/** Three codes are typed, one per beat from bar 31 beat 3; each brightens its matches; the chosen word rises into the card. */
export const SEND = [0, 1, 2].map((i) => atIn('s12', 31, 3) + i * BEAT);
export const KEY_STEP = 4;
/** "Ghost mode" lands on the phone's top edge on the narrator's words. */
export const GHOST = keyWordFrames('s12', 'n18-ghost-mode', 8, 2);

// ---- the phone (screen px = image px) -------------------------------------------------------------------------------
const cap = PHONE_WATER ?? PHONE_DEFAULT;
const box = (name: string) => cap.boxes[name] ?? PHONE_DEFAULT.boxes[name] ?? [0, 0, 0, 0];
export const STATUS_BOX = box('status');
export const CARD_BOX = box('sentence');
export const TEXT_BOX = box('sentence-text');
export const DIGITS_BOX = box('sentence-digits');
/** The glass below the card: where the dictionary shows. */
export const GLASS_TOP = CARD_BOX[1] + CARD_BOX[3] + 22;

export const SENT = decoded.sentences['i-need-water'];
export const CODES = SENT.codes; // 4 6333 92837
export const FINAL = SENT.text.split(' '); // I need water
export const MATCHES = decoded.matches as Record<string, string[]>;
export const WORD_PX = 120;
export const DIGIT_PX = 48;
/** Slot k's left edge in the card's text line. */
export const slotX = (k: number) => {
  let x = TEXT_BOX[0];
  for (let i = 0; i < k; i++) x += (W600[FINAL[i]!] ?? FINAL[i]!.length * 0.56) * WORD_PX + W600[' ']! * WORD_PX;
  return x;
};
export const LINE_CY = TEXT_BOX[1] + TEXT_BOX[3] / 2;
/** The matches in the glass (centres, screen px), the chosen word first; dim as texture, lit at LIT_PX. */
export const DIM_PX = 50;
export const LIT_PX = 92;
export const MATCH_SPOTS: Record<string, { x: number; y: number }[]> = {
  '4': [
    { x: 215, y: 806 },
    { x: 165, y: 700 },
    { x: 905, y: 700 },
  ],
  '6333': [{ x: 300, y: 916 }],
  '92837': [
    { x: 575, y: 806 },
    { x: 925, y: 806 },
    { x: 520, y: 700 },
    { x: 770, y: 916 },
  ],
};

/** Our signal icon (centre, world px): a badge on the phone's right edge near the top, over the bezel only (never the app's UI). */
export const SIGNAL = { size: 330, x: PHONE_W + BEZEL + 125, y: 260, depth: 18 };
/** "Ghost mode", on the phone's top edge (20 px over it). */
export const TAG = { font: 60, h: 112, y: -BEZEL + 20 - 112, depth: 16 };

// ---- cameras (phone rig) ------------------------------------------------------------------------------------------
const at = (p: { x: number; y: number; z?: number }, s: { x: number; y: number }, zoom: number, ry: number): Cam => aim(p, s, { ...PHONE_RIG, zoom, ry });
const PHONE_C = { x: PHONE_W / 2, y: PHONE_H / 2, z: PHONE_DEPTH / 2 };
/** The phone standing whole, left of centre (the key words on the right). */
export const CAM_PHONE = at(PHONE_C, { x: 760, y: 548 }, 0.43, -3);
export const CAM_PHONE2 = at(PHONE_C, { x: 760, y: 548 }, 0.438, -3);
/** Its upper half, frontal: the tag on its edge, the pill, the card, the glass's top with the matches. */
const UPPER = { x: PHONE_W / 2 + 90, y: 400, z: PHONE_DEPTH };
export const CAM_UPPER = at(UPPER, { x: 960, y: 540 }, 0.88, 0);
export const CAM_UPPER_END = at(UPPER, { x: 960, y: 540 }, 0.905, 0);

// ---- names the lab's diagnostics (src/lab3d/tools) read from the second cut ------------------------------------------
export const DIVE = { from: PUSH.from, dur: PUSH.dur };
export const CAM_DIVE = CAM_UPPER;
export const INSIDE_CAM_START = CAM_UPPER;
