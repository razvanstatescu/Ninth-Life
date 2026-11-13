/**
 * Spatial lab: the proof shot (s11's "lock and key") as ONE spatial layout, shared by the CSS 2.5D rebuild and the
 * three.js version, so the two can be compared frame for frame. Content as in s11: "water 92837" matches; the model's
 * card offers "wafer 92337", its code as five teeth; the teeth rise into the five keys pressed for "water", 9 fits,
 * 2 fits, 3 against 8 does not; "wafer" is struck and the card recedes.
 *
 * World px, CSS axes (x right, y DOWN, z towards the camera), origin at the middle of the structure. Every object's
 * back is on the z = 0 plane and its thickness comes towards the camera: one shared plane, one shared turn.
 */
import decoded from '../../data/decoded.json';
import { EASE, impact, jump, ramp } from '../../lib/anim';
import { cameraAt, type Cam, type CamKey } from '../../lib/camera';

export const PROOF = decoded.proof;
export const KEYS = PROOF.keys.split(''); // 9 2 8 3 7
export const REJECT = PROOF.reject; // wafer 92337, diffAt 2
export const TEETH = REJECT.code.split('');
export const LEGEND: Record<string, string> = Object.fromEntries(decoded.keypad.keys.map((k) => [k.id, k.letters]));

// ---- layout ------------------------------------------------------------------------------------------------------
export const KS = 184;
export const KGAP = 26;
export const keyX = (i: number) => (i - 2) * (KS + KGAP);
export const KEY = { top: -205, depth: 46, r: 44 };
export const KEY_BOTTOM = KEY.top + KS;

export const CHIP = { w: 840, h: 196, x: -420, y: -470, depth: 26, r: 48 };
export const CHIP_C = { x: 0, y: CHIP.y + CHIP.h / 2 };

/** The card: body w x h; its teeth stand on its top edge, one under each key. */
export const CARD = { w: 1100, h: 312, depth: 30, r: 64, restTop: 165 };
export const TOOTH = { w: 116, h: 84, r: 22, fillet: 14 };
/** The card rises this far into the lock, then each tooth travels DOCK to touch its key. */
export const RISE_PX = 66;
export const DOCK_PX = CARD.restTop - TOOTH.h - RISE_PX - KEY_BOTTOM;
export const FLOOR_Y = CARD.restTop + CARD.h;

/** Inside the card: the label and the "wafer" chip (card-local px). */
export const CARD_IN = { padX: 52, labelY: 34, labelFont: 46, chipX: 52, chipY: 108, chipW: 700, chipH: 160, chipR: 40 };

// ---- time (60 fps) -----------------------------------------------------------------------------------------------
export const DURATION = 240;
export const RISE = { from: 60, dur: 24 };
export const CHECK_AT = [100, 115, 130];
export const IMPACT = CHECK_AT[2]!;
export const HOLD = 3;
export const PUSHBACK = { from: IMPACT + HOLD, dur: 12 };
export const STRIKE = { from: PUSHBACK.from + 12, dur: 7 };
export const PULL_BACK = { from: 158, dur: 72 };
/** The stills: the lock and key (s11 f180), the reject (s11 f480), the pull back to "water" (s11 f540). */
export const STILLS = { rest: 40, reject: 156, end: 236 } as const;

// ---- cameras -------------------------------------------------------------------------------------------------------
/** A long lens: 5200 px focal at zoom 1 (about 100 mm on full frame across 1920 px; today's World is 2400, about 45 mm). */
export const LENS = 5200;
const K = (f: number, c: Partial<Cam> & { x: number; y: number; zoom: number; rx: number; ry: number }, ease?: (t: number) => number): CamKey => ({ f, ...c, rz: 0, lens: LENS, zoomMode: 'lens', ease });
const REST = { x: 0, y: 4, zoom: 1.0, rx: -3.5, ry: -7 };
const COMPARE = { x: 0, y: 122, zoom: 1.34, rx: -3.5, ry: -5 };
const END = { x: 0, y: -250, zoom: 1.32, rx: -3, ry: -4 };
export const CAM_KEYS: CamKey[] = [
  K(0, REST),
  K(RISE.from, { ...REST, zoom: 1.02 }, EASE.linear),
  K(RISE.from + 36, COMPARE, EASE.flight),
  K(IMPACT, { ...COMPARE, zoom: COMPARE.zoom * 1.02 }, EASE.linear),
  K(IMPACT + HOLD, { ...COMPARE, zoom: COMPARE.zoom * 1.02 }),
  K(IMPACT + HOLD + 7, { ...COMPARE, zoom: COMPARE.zoom * 1.06 }, EASE.camera),
  K(PULL_BACK.from, { ...COMPARE, zoom: COMPARE.zoom * 1.06 }),
  K(PULL_BACK.from + PULL_BACK.dur, END, EASE.flight),
  K(DURATION - 1, { ...END, zoom: END.zoom * 1.015 }, EASE.linear),
];
export const camAt = (frame: number): Cam => cameraAt(frame, CAM_KEYS);

// ---- state -----------------------------------------------------------------------------------------------------------
export type Tooth = { dock: number; fit: boolean; verdict: number };
export type ShotState = {
  /** Card body top (world y) and its depth offset (z, negative = pushed back), and how dark it is (0..1). */
  cardTop: number;
  cardZ: number;
  cardDim: number;
  teeth: Tooth[];
  /** Verdict rings on the keys. */
  rings: { amount: number; fit: boolean }[];
  keyDim: number;
  reject: number;
  strike: number;
  /** Small bloom at the failed column. */
  bloom: number;
  /** The card's lift above the floor (world px), for its shadow. */
  lift: number;
};

export const stateAt = (frame: number): ShotState => {
  const t = impact(frame, IMPACT, HOLD);
  const rise = ramp(t, RISE.from, RISE.dur, 0, 1, EASE.camera);
  const back = ramp(frame, PUSHBACK.from, PUSHBACK.dur, 0, 1, EASE.camera);
  const away = ramp(frame, PULL_BACK.from, PULL_BACK.dur, 0, 1, EASE.inOut);
  const teeth: Tooth[] = TEETH.map((_, i) => {
    if (i < REJECT.diffAt) {
      const at = CHECK_AT[i]!;
      return { fit: true, dock: ramp(t, at - 6, 8, 0, 1, EASE.camera), verdict: jump(t, at) };
    }
    if (i === REJECT.diffAt) return { fit: false, dock: ramp(t, IMPACT - 6, 6, 0, 0.55, EASE.out), verdict: ramp(frame, IMPACT, 3, 0, 1, EASE.out) };
    return { fit: true, dock: 0, verdict: 0 };
  });
  const rings = teeth.map((th) => ({ amount: th.verdict * (1 - away), fit: th.fit }));
  // After the reject the card drops back to the floor (it fell out of the lock) and recedes; it darkens, never fades.
  const cardTop = CARD.restTop - RISE_PX * rise * (1 - back);
  return {
    cardTop,
    cardZ: -120 * back - 610 * away,
    cardDim: 0.3 * back + 0.35 * away,
    teeth: teeth.map((th) => ({ ...th, dock: th.dock * (1 - back) })),
    rings,
    keyDim: 0.45 * away,
    reject: jump(t, STRIKE.from),
    strike: ramp(t, STRIKE.from, STRIKE.dur, 0, 1, EASE.out),
    bloom: ramp(frame, IMPACT, 4, 0, 1, EASE.out) * ramp(frame, IMPACT + HOLD + 6, 18, 1, 0),
    lift: Math.max(0, FLOOR_Y - (cardTop + CARD.h)),
  };
};

/**
 * The card's outline WITH its teeth as one path (card-local px: body from (0, 0) to (w, h), teeth above y = 0).
 * One silhouette, one stroke: a tooth can never be cut by the body it belongs to.
 */
export const cardPath = (teeth: Tooth[]) => {
  const { w, h, r } = CARD;
  const tw = TOOTH.w;
  const tr = TOOTH.r;
  const fl = TOOTH.fillet;
  const xs = TEETH.map((_, i) => keyX(i) + CARD.w / 2);
  let d = `M ${r} 0`;
  xs.forEach((cx, i) => {
    const th = TOOTH.h + teeth[i]!.dock * DOCK_PX;
    const l = cx - tw / 2;
    const rr = cx + tw / 2;
    // fillet into the tooth, up, round over the top, down, fillet out
    d += ` L ${l - fl} 0 Q ${l} 0 ${l} ${-fl}`;
    d += ` L ${l} ${-th + tr} Q ${l} ${-th} ${l + tr} ${-th}`;
    d += ` L ${rr - tr} ${-th} Q ${rr} ${-th} ${rr} ${-th + tr}`;
    d += ` L ${rr} ${-fl} Q ${rr} 0 ${rr + fl} 0`;
  });
  d += ` L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
  return d;
};

/** Just one tooth's three sides (for its verdict outline), card-local. */
export const toothPath = (i: number, dock: number) => {
  const cx = keyX(i) + CARD.w / 2;
  const th = TOOTH.h + dock * DOCK_PX;
  const l = cx - TOOTH.w / 2;
  const rr = cx + TOOTH.w / 2;
  const tr = TOOTH.r;
  return `M ${l} 2 L ${l} ${-th + tr} Q ${l} ${-th} ${l + tr} ${-th} L ${rr - tr} ${-th} Q ${rr} ${-th} ${rr} ${-th + tr} L ${rr} 2`;
};
export const toothCentre = (i: number, dock: number) => ({ x: keyX(i) + CARD.w / 2, y: -(TOOTH.h + dock * DOCK_PX) / 2 });
