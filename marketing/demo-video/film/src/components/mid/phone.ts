/**
 * The "phone world" shared by S10 (bars 16-17) and S11 (bar 18): world units are IMAGE px of the
 * phone capture (1170 x 2100 at 3 px per CSS px), the screen's top-left corner at world (0, 0).
 * The hero sentence card at s = dpr sits exactly on the capture's card, so the film can cut between
 * the hero card and the real screen without a jump, in both directions.
 */
import { boxOf, getCapture, PHONE_DEFAULT, type Box } from './capture';
import { CARD } from './HeroCard';
import { WATER_FROM, WATER_SPAN } from './metrics';
import { aim } from './cam';

export const PHONE_WATER = getCapture('phone-water');
export const PHONE_GEO = PHONE_WATER ?? PHONE_DEFAULT;
export const pbox = (name: string): Box => boxOf(PHONE_WATER, PHONE_DEFAULT, name);

/** CSS px -> image px. */
export const DPR = PHONE_GEO.dpr;
export const PHONE_W = PHONE_GEO.width;
export const PHONE_H = PHONE_GEO.height;

/** The sentence card's top-left corner (world) and the words' content box. */
export const CARD_BOX = pbox('sentence');
export const TEXT_BOX = pbox('sentence-text');

/** The word "water" inside the sentence (world px): left, width, vertical centre, font size. */
export const WATER = (() => {
  const [x, y, w, h] = TEXT_BOX;
  return { x: x + w * WATER_FROM, w: w * WATER_SPAN, cy: y + h / 2, font: CARD.font * DPR, top: y, h };
})();

/** The whole phone in frame (bar 17 hold): screen centred, 0.435 screen px per image px. */
export const HOLD_ZOOM = 0.435;
export const HOLD_START = { x: PHONE_W / 2, y: PHONE_H / 2, zoom: HOLD_ZOOM };
/** A 1.2% breathing push over the hold; S11 starts exactly here. */
export const HOLD_END = { ...HOLD_START, zoom: HOLD_ZOOM * 1.012 };

/**
 * Shared tilt of the phone world (degrees). Second cut: the camera looks down a little (negative rx shows
 * the floor) and the phone stays turned 5 degrees after its 3D turn (s10 bar 23), where s11 starts.
 */
export const PHONE_TILT = { rx: -3, ry: -5 };

/** Bar 16 close-up: the card and Speak, the words' centre held still while the camera creeps in. */
export const SPEAK_BOX = (() => {
  const [cx, cy, cw, ch] = CARD_BOX;
  const w = 470;
  const h = 192;
  return { x: cx + cw - w, y: cy + ch + 72, w, h };
})();
const TEXT_CENTRE = { x: TEXT_BOX[0] + TEXT_BOX[2] / 2, y: TEXT_BOX[1] + TEXT_BOX[3] / 2 };
/** Group centre of card + Speak, and where the words sit on screen at the end of bar 16. */
const GROUP = { x: CARD_BOX[0] + CARD_BOX[2] / 2, y: (CARD_BOX[1] + SPEAK_BOX.y + SPEAK_BOX.h) / 2 };
export const CLOSE_ZOOM = 1;
export const CLOSE_END = aim(GROUP, { x: 960, y: 600 }, CLOSE_ZOOM);
const TEXT_ON_SCREEN = { x: 960 + (TEXT_CENTRE.x - CLOSE_END.x) * CLOSE_ZOOM, y: 540 + (TEXT_CENTRE.y - CLOSE_END.y) * CLOSE_ZOOM };
export const CLOSE_START = aim(TEXT_CENTRE, TEXT_ON_SCREEN, 0.97);
/** The card's left edge on screen at the end of bar 16 (supers align to it). */
export const CLOSE_CARD_LEFT = 960 + (CARD_BOX[0] - CLOSE_END.x) * CLOSE_ZOOM;
