/**
 * A phone in a plain device frame showing either a real capture or, when the capture is missing, the
 * recreated screen (PhoneApp.tsx). Everything inside is drawn in CSS px of the app's 390 x 700 viewport
 * and scaled by `scale`, so overlays (the fingertip ring) use the same coordinates as capture boxes.
 */
import React from 'react';
import { Img, staticFile, useCurrentFrame } from 'remotion';
import { DeviceFrame } from '../brand/Parts';
import { EASE, ramp } from '../../lib/anim';
import type { Capture } from './captures';
import { PHONE_VIEWPORT, PhoneMain, PhoneSettings, PhoneShow, type MainState } from './PhoneApp';

export type Shot =
  | { kind: 'capture'; cap: Capture }
  | { kind: 'main'; state: MainState }
  | { kind: 'settings'; scanMs: number }
  | { kind: 'show'; text: string; flipped: boolean };

export const ScreenShot: React.FC<{ shot: Shot }> = ({ shot }) => {
  const [vw, vh] = PHONE_VIEWPORT;
  switch (shot.kind) {
    case 'capture':
      return <Img src={staticFile(shot.cap.file)} style={{ position: 'absolute', left: 0, top: 0, width: vw, height: vh, display: 'block' }} />;
    case 'main':
      return <PhoneMain {...shot.state} />;
    case 'settings':
      return <PhoneSettings scanMs={shot.scanMs} />;
    case 'show':
      return <PhoneShow text={shot.text} flipped={shot.flipped} />;
  }
};

/** Outer size in px of the phone frame for a given screen scale (DeviceFrame's bezel rule). */
export const phoneFrameSize = (scale: number) => {
  const w = PHONE_VIEWPORT[0] * scale;
  const h = PHONE_VIEWPORT[1] * scale;
  const bezel = Math.round(w * 0.045);
  return { w: w + bezel * 2, h: h + bezel * 2, bezel };
};

export const Phone: React.FC<{ scale: number; shot: Shot; overlay?: React.ReactNode; style?: React.CSSProperties }> = ({ scale, shot, overlay, style }) => {
  const [vw, vh] = PHONE_VIEWPORT;
  return (
    <DeviceFrame kind="phone" screen={[vw * scale, vh * scale]} style={style}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: vw, height: vh, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
        <ScreenShot shot={shot} />
        {overlay}
      </div>
    </DeviceFrame>
  );
};

/**
 * A fingertip-sized soft ring that taps (no hand). It touches down a few frames before `at` (the frame
 * the app reacts), holds, and lifts. Centre (x, y) and diameter `d` in the parent's px.
 */
export const TouchRing: React.FC<{ x: number; y: number; d: number; at: number; hold?: number }> = ({ x, y, d, at, hold = 8 }) => {
  const frame = useCurrentFrame();
  const down = at - 3;
  const up = at + hold;
  if (frame < down - 1 || frame > up + 8) return null;
  const inP = ramp(frame, down, 5, 0, 1, EASE.camera);
  const outP = ramp(frame, up, 7, 0, 1, EASE.out);
  const opacity = inP * (1 - outP);
  const scale = (1.35 - 0.35 * inP) * (1 + 0.12 * outP);
  const k = d / 72;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - d / 2,
        top: y - d / 2,
        width: d,
        height: d,
        borderRadius: '50%',
        boxSizing: 'border-box',
        border: `${3 * k}px solid rgba(238,232,255,0.92)`,
        background: 'rgba(238,232,255,0.2)',
        boxShadow: `0 0 ${18 * k}px rgba(238,232,255,0.35), inset 0 0 ${10 * k}px rgba(238,232,255,0.25)`,
        opacity,
        transform: `scale(${scale})`,
        pointerEvents: 'none',
      }}
    />
  );
};
