/**
 * Scene 10 (the solution, bars 18-23) on the spatial stage: research-v2/15 6.2 A, "Keypad on the floor, card in front
 * of the eye". World px, origin at the keypad panel's centre; frame 0 is FOLD_LANDING (components/handoff.ts,
 * components/mid/landing.tsx), where s09's fold lands. Lens 5400 in lens mode, pitch 0, the eye at 302.
 *
 *   the keypad (left, turned 5 degrees inward,      They said (back plane, z -500, veiled 25%)
 *   standing on the floor, key 4 ember)             the words of the sentence, then the card round them (frontal,
 *                                                   floating), Speak attached to its bottom edge
 * Bar 23 is the phone world (components/mid/set3.tsx): the real phone standing on the floor, the turntable from 12 to
 * 4 degrees; s11 starts on its last frame.
 */
import { FOLD_LANDING } from '../handoff';
import { keypadLayout, keyCenter, type KeyId } from '../brand/Keypad';
import { EIGHTH, SCENES, VOICE_AT, atIn, sceneLen, sec } from '../../timeline';
import decoded from '../../data/decoded.json';
import { narrIn } from '../type/Type';
import { aim, type Cam } from '../../lib/camera';
import { w600, MONO_ADV } from './metrics';
import { SAY_BACK, SAY_BACK_W, SAY_BACK_H } from './landing';

export const SENT = decoded.sentences['i-need-water'];
export const MATCHES = decoded.matches as Record<string, string[]>;

// ---- beats (local frames) -------------------------------------------------------------------------
export const B19 = atIn('s10', 19);
export const B20 = atIn('s10', 20);
export const B21 = atIn('s10', 21);
export const B22 = atIn('s10', 22);
export const B23 = atIn('s10', 23);
export const END = sceneLen('s10');

/** 4 0 6 3 3 3 0 9 2 8 3 7 on eighths from bar 19 beat 1 (the narrator's "One press per letter."). */
export const PRESS_AT = SENT.presses.map((_, i) => B19 + i * EIGHTH);
export const LAST_PRESS = PRESS_AT[PRESS_AT.length - 1]!;
/** "wave" becomes "water" on the last press: the open word holds 2 frames there. */
export const WATER_HOLD = 2;

/** The truck right along the sentence (bar 21), then the card forms round it (n14 "It finds the sentence."). */
export const FLIGHT = { from: LAST_PRESS + sec(0.2), dur: sec(0.75) };
export const COLLAPSE = { from: FLIGHT.from + FLIGHT.dur - sec(0.05), dur: sec(0.25) };
export const CARD_DONE = COLLAPSE.from + COLLAPSE.dur;
/** Speak comes on the narrator's "You" (n14 "You press Speak."). */
export const TO_SPEAK = { from: Math.max(CARD_DONE + sec(0.3), narrIn('s10', 'n14-finds', 4) - sec(0.05)), dur: sec(0.4) };
/** The app's line (VOICE_AT, bar 22 beat 2 + 0.1 s), local. */
export const VOICE = VOICE_AT['i-need-water'] - SCENES.s10.from;
/**
 * Speak is pressed on the last eighth at least a quarter second before the voice, the picture holds 3
 * frames, then the hard cut to the sentence (which shows a few frames before the voice, as in s07).
 */
export const SPEAK_AT = Math.floor((VOICE - sec(0.25)) / EIGHTH) * EIGHTH;
export const CUT_TO_LINE = SPEAK_AT + 3;

// ---- world layout ---------------------------------------------------------------------------------
export const KEY = FOLD_LANDING.keySize;
export const PAD = keypadLayout(KEY);
export const KP = FOLD_LANDING.world;
export const FLOOR_Y = FOLD_LANDING.floorY;
export const keyAt = (id: KeyId) => {
  const c = keyCenter(id, KEY);
  return { x: KP.x + c.x, y: KP.y + c.y };
};

/** The sentence's column, far enough from the keypad that a close look at the card leaves the keypad out of frame. */
export const COL = { x: 740, w: 740 };
/** The sentence card and its words (sans 600). It floats on the hero plane, frontal. */
export const FONT_PX = 112;
export const CARD = { x: COL.x, y: -230, w: COL.w, h: 286, pad: 44, r: 64, depth: 26 };
export const TEXT_Y = CARD.y + 34; // top of the words' line box
export const LINE_H = Math.round(FONT_PX * 1.16);
export const CODE_PX = 46;
export const CODE_Y = CARD.y + CARD.h - 34 - CODE_PX; // top of the key line
export const WORD_X0 = CARD.x + CARD.pad;

/** Left edge of word k of a sentence written with `words` (single spaces). */
export const wordX = (words: string[], k: number) => {
  let x = WORD_X0;
  for (let i = 0; i < k; i++) x += w600(words[i]!, FONT_PX) + w600(' ', FONT_PX);
  return x;
};
/** Left edge of code k on the card's key line ("4 6333 92837"). */
export const codeLineX = (codes: string[], k: number) => {
  let chars = 0;
  for (let i = 0; i < k; i++) chars += codes[i]!.length + 1;
  return WORD_X0 + chars * MONO_ADV * CODE_PX;
};

/** Speak, attached to the card's bottom edge (24 px over it), the app's ember button with real thickness. */
export const SPEAK = { w: 420, h: 140, r: 70, depth: 16, x: CARD.x + (CARD.w - 420) / 2, y: CARD.y + CARD.h - 24 };

/** The lattice: a slot's other words sit behind it (z), up and right so they peek out, veiled and defocused. */
export const ALT = { z: [-160, -320], dx: 10, dy: -24, veil: [0.55, 0.78], blur: [4, 8] };

/** Kept for readers of the second cut's names (S09 until it moves to landing.tsx's TheySaidBack). */
export const SAY = { x: SAY_BACK.x, y: SAY_BACK.y, s: SAY_BACK.s };
export const SAY_W = SAY_BACK_W;
export const SAY_H = SAY_BACK_H;

// ---- cameras (the landing rig: lens 5400 in lens mode, pitch 0, eye 302) -----------------------------
export const CAM0 = FOLD_LANDING.cam as Cam;
const RIG = { lens: CAM0.lens, zoomMode: CAM0.zoomMode, eye: CAM0.eye, rx: 0, rz: 0 };
const at = (p: { x: number; y: number; z?: number }, s: { x: number; y: number }, zoom: number, ry = 0): Cam => aim(p, s, { ...RIG, zoom, ry });
/** The hold: a slow drift to the right. */
export const CAM_HOLD = { ...CAM0, x: CAM0.x + 30, zoom: 1.012 };
/** On each Space, a small step right and in (the keypad stays whole, the words stay in frame). */
export const CAM_SPACE1 = { ...CAM0, x: 480, y: 0, zoom: 1.02 };
export const CAM_SPACE2 = { ...CAM0, x: 535, y: 4, zoom: 1.03 };
/** After the truck: the card centred, the keypad out of frame, They said up on its back plane. */
const GROUP = { x: CARD.x + CARD.w / 2, y: (CARD.y + SPEAK.y + SPEAK.h) / 2 };
export const CAM_CARD = at(GROUP, { x: 960, y: 548 }, 1.3);
export const CAM_SPEAK = at(GROUP, { x: 960, y: 548 }, 1.33);
