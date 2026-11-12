/**
 * The real phone in the night studio (second cut): s10's last bar, the start of s11 and the start of s12.
 * World px = image px of the phone capture (components/mid/phone.ts); the phone stands on the dot floor.
 *
 *  PhoneStage     the ground, the floor, the contact glow and the phone (a capture in our frame, with thickness)
 *  PhonePullBack  s10 bar 23: the spoken sentence becomes the card; the screen opens round it and the
 *                 camera pulls back to the whole phone with a 3D turn (16 degrees settling to 5) and one
 *                 sheen across the glass; ends on PHONE_CAM_END, where s11 starts
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { World, useCamera, type Cam } from '../../lib/camera';
import { EASE, ramp } from '../../lib/anim';
import { sec } from '../../timeline';
import { ContactGlow, StudioGround } from '../brand/Studio';
import { CARD } from './HeroCard';
import { CARD_BOX, DPR, PHONE_H, PHONE_TILT, PHONE_W, PHONE_WATER, TEXT_BOX } from './phone';
import { MidFloor, Phone3D } from './Parts2';
import { aimTilted } from './geo';
import type { Capture } from './capture';

/**
 * The camera at the end of s10 and the start of s11: the phone's upper part (header, card, suggestions)
 * at about 2x the whole-phone view (zoom 0.87), so its text reads in a 640 px player; the bottom is
 * cropped. Turned 5 degrees after the 3D turn. (The coordinator's note, option a.)
 */
const UPPER = { x: PHONE_W / 2, y: 430 };
export const PHONE_CAM_HOLD: Cam = { ...aimTilted(UPPER, { x: 960, y: 548 }, { zoom: 0.86, ...PHONE_TILT, rz: 0 }), zoom: 0.86, ...PHONE_TILT, rz: 0 };
export const PHONE_CAM_END: Cam = { ...aimTilted(UPPER, { x: 960, y: 548 }, { zoom: 0.87, ...PHONE_TILT, rz: 0 }), zoom: 0.87, ...PHONE_TILT, rz: 0 };

const BEZEL = Math.round(PHONE_W * 0.045);
/** World y of the floor line under the phone. */
export const PHONE_FLOOR_Y = PHONE_H + BEZEL + 22;
/** Floor numbers in image px, so the dots read as in s10 at the hold zoom (0.435). */
const FLOOR = { spacing: 190, dot: 11, near: 3200, far: 12000, width: 20000 };

/** The studio ground of the phone world (s10 bar 23, s11, s12 before the dive): keep it identical across the cuts. */
export const PHONE_GROUND = { glow: { x: 50, y: 44, r: 70, strength: 1 }, horizon: 66 } as const;

export const PhoneStage: React.FC<{
  cam: Cam;
  vel?: { vx: number; vy: number; zoomRate: number };
  capture?: Capture | null;
  status?: string;
  chrome?: number;
  clip?: string;
  sweep?: number;
  phone?: number;
  floor?: number;
  children?: React.ReactNode;
  over?: React.ReactNode;
  noBlur?: boolean;
}> = ({ cam, vel, capture = PHONE_WATER, status = 'On device', chrome = 1, clip, sweep = 0, phone = 1, floor = 1, children, over, noBlur }) => (
  <AbsoluteFill>
    <StudioGround glow={PHONE_GROUND.glow} horizon={PHONE_GROUND.horizon} />
    <World cam={cam} vel={vel} noBlur={noBlur}>
      {floor > 0 ? <MidFloor y={PHONE_FLOOR_Y} x={PHONE_W / 2} width={FLOOR.width} near={FLOOR.near} far={FLOOR.far} spacing={FLOOR.spacing} dot={FLOOR.dot} opacity={floor} /> : null}
      {floor > 0 ? <ContactGlow x={PHONE_W / 2} y={PHONE_FLOOR_Y + 6} w={PHONE_W * 1.35} strength={floor * chrome} /> : null}
      {children}
      {phone > 0 ? (
        <div style={{ position: 'absolute', left: 0, top: 0, opacity: phone, transformStyle: 'preserve-3d' }}>
          <Phone3D capture={capture} status={status} zoom={cam.zoom} chrome={chrome} clip={clip} sweep={sweep} />
        </div>
      ) : null}
      {over}
    </World>
  </AbsoluteFill>
);

/** The card's words as SpokenLine sets them (216 px): the phone card's 40 css px x dpr 3 at zoom 1.8. */
const MATCH_ZOOM = 216 / (CARD.font * DPR);
const TEXT_CENTRE = { x: TEXT_BOX[0] + TEXT_BOX[2] / 2, y: TEXT_BOX[1] + TEXT_BOX[3] / 2 };
const CAM_MATCH = aimTilted(TEXT_CENTRE, { x: 960, y: 540 }, { zoom: MATCH_ZOOM, rx: -4, ry: -16, rz: 0 });

export const PhonePullBack: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const t = frame - from;
  const { cam, vel } = useCamera([
    { f: from, ...CAM_MATCH },
    { f: from + sec(0.08) },
    { f: from + sec(0.92), ...PHONE_CAM_HOLD, ease: EASE.flight },
    { f: to - 1, ...PHONE_CAM_END, ease: EASE.linear },
  ]);
  // The screen opens round the card, the frame and the floor come in, then one sheen crosses the glass.
  const open = ramp(t, sec(0.05), sec(0.3), 0, 1, EASE.camera);
  const [x, y, w, h] = CARD_BOX;
  const r = CARD.radius * DPR;
  const clip = open < 1 ? `inset(${y * (1 - open)}px ${(PHONE_W - x - w) * (1 - open)}px ${(PHONE_H - y - h) * (1 - open)}px ${x * (1 - open)}px round ${r * (1 - open)}px)` : undefined;
  return (
    <PhoneStage
      cam={cam}
      vel={vel}
      chrome={ramp(t, sec(0.15), sec(0.2), 0, 1, EASE.out)}
      floor={ramp(t, sec(0.25), sec(0.4), 0, 1, EASE.out)}
      clip={clip}
      sweep={ramp(t, sec(0.95), sec(0.7), 0, 1, EASE.inOut)}
    />
  );
};
