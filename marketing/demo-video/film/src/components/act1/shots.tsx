/**
 * Act 1's shots, driven by the ABSOLUTE film frame so a shot that runs across a scene boundary
 * (the pixel screen across S02/S03, the keypad close-up across S03/S04) is the same picture on both
 * sides of the cut. A scene passes `abs = SCENES[id].from + useCurrentFrame()`.
 *
 * Contents step at 12 Hz (stepped()); the slow camera push-ins are smooth.
 */
import React from 'react';
import { sec } from '../../timeline';
import { EASE, ramp, stepped } from '../../lib/anim';
import decoded from '../../data/decoded.json';
import { T } from './timing';
import { STATIC_HZ } from './TubePicture';
import { KeypadPlate, PhonePlate, WornKeyPlate } from './Keypad';
import { PixelScreen, ScreenPlate, type ScreenState } from './PixelScreen';
import type { KeyName } from './Plate';

/** One step of Act 1's 12 Hz grid, in frames (5 at 60 fps). */
export const STEP = sec(1 / STATIC_HZ);

/** A slow push-in: zoom from `from` to `to` between two film times, smooth (EASE.inOut). */
export const push = (abs: number, t0: number, t1: number, from = 1, to = 1.03) =>
  ramp(abs, sec(t0), sec(t1) - sec(t0), from, to, EASE.inOut);

/** The light of a pressed key: on at once, held for 3 steps, half for one, then off (stepped). */
export const pressLight = (f: number, at: number) => {
  if (f < at) return 0;
  const d = f - at;
  if (d < 3 * STEP) return 1;
  if (d < 4 * STEP) return 0.45;
  return 0;
};

type Press = { k: KeyName; at: number };

/** All key presses of the pixel-screen shot, in absolute frames. */
const presses = (): (Press & { state: ScreenState })[] => {
  const hello = decoded.sentences.hello;
  const good = decoded.sentences.good;
  const out: (Press & { state: ScreenState })[] = [];
  hello.steps.forEach((s, i) => {
    out.push({ k: s.key as KeyName, at: sec(T.hello[i]!), state: { text: s.text.toLowerCase(), code: s.codes.join(' ') } });
  });
  const line1 = hello.steps[hello.steps.length - 1]!.text.toLowerCase();
  good.steps.forEach((s, i) => {
    out.push({ k: s.key as KeyName, at: sec(T.good[i]!), state: { text: line1, text2: s.text.toLowerCase(), code: s.codes.join(' ') } });
  });
  // The Next key: good -> home -> gone (the decoder's own order for 4663).
  const code = good.steps[good.steps.length - 1]!.codes.join(' ');
  T.next.forEach((t, i) => {
    out.push({ k: 'hash', at: sec(t), state: { text: line1, text2: decoded.cycle4663[i + 1]!, code } });
  });
  return out;
};
const PRESSES = presses();

/** What the pixel screen shows at absolute frame `abs` (redrawn one step after each key press). */
export const screenAt = (abs: number) => {
  const f = stepped(abs, STATIC_HZ);
  let state: ScreenState = { text: '' };
  let prevState: ScreenState | null = null;
  let changedAt = -Infinity;
  let press: { k: KeyName; amount: number } | null = null;
  for (const p of PRESSES) {
    // The key light jumps on at the press; the screen redraws on the next step.
    if (f >= p.at + STEP) {
      prevState = state;
      state = p.state;
      changedAt = p.at + STEP;
    }
    const a = pressLight(f, p.at);
    if (a > 0) press = { k: p.k, amount: a };
  }
  // LCD ghosting: the previous state shows faintly for one step after a redraw.
  const ghost = prevState && f - changedAt < STEP ? { ...prevState, amount: 1 } : null;
  return { state, ghost, press, f };
};

/** The pixel screen (IMG-04) with the keypad inset at the bottom right: shots 2b and 3a. */
export const ScreenShot: React.FC<{ abs: number; w: number; h: number }> = ({ abs, w, h }) => {
  const { state, ghost, press, f } = screenAt(abs);
  const zoom = push(abs, T.burst1 + T.burst1Len, T.burst2, 1.0, 1.035);
  // Inset: the keypad close-up in a picture-in-picture, bottom right, over the window's empty glass.
  const iw = Math.round(w * 0.25);
  const ih = Math.round(iw * 1.18);
  const ix = Math.round(w - iw - w * 0.045);
  const iy = Math.round(h - ih - h * 0.07);
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <ScreenPlate w={w} h={h} cx={1295} cy={747} zoom={zoom} {...state} ghost={ghost} cursor frame={f} align="left" />
      <div
        style={{
          position: 'absolute',
          left: ix,
          top: iy,
          width: iw,
          height: ih,
          overflow: 'hidden',
          border: '4px solid #050506',
          boxShadow: '0 0 0 1px rgba(191,232,204,0.26), 0 12px 34px rgba(0,0,0,0.65)',
        }}
      >
        <KeypadPlate w={iw} h={ih} cx={1283} cy={650} zoom={1.1} press={press} />
      </div>
    </div>
  );
};

/** The whole phone (IMG-06) lit, or years later (IMG-07): shots 2a and 4b, and the end of scene 1. */
export const PhoneShot: React.FC<{ abs: number; w: number; h: number; dusty?: boolean; zoom: number; light?: number }> = ({
  abs,
  w,
  h,
  dusty = false,
  zoom,
}) => {
  const f = stepped(abs, STATIC_HZ);
  return (
    <PhonePlate
      w={w}
      h={h}
      cx={1282}
      cy={700}
      zoom={zoom}
      dusty={dusty}
      screen={
        dusty
          ? undefined
          : (b) => (
              <div style={{ position: 'absolute', left: b[0], top: b[1], width: b[2], height: b[3] }}>
                <PixelScreen w={b[2]} h={b[3]} cursor frame={f} fill={0.84} />
              </div>
            )
      }
    />
  );
};

/** Backlight of each keypad row at absolute frame `abs`: rows go out top to bottom (scene 4). */
export const rowsAt = (abs: number): [number, number, number, number] => {
  const f = stepped(abs, STATIC_HZ);
  return T.rowsOut.map((t) => {
    const at = sec(t);
    if (f < at) return 1;
    // A dying backlight: a step at half, a step faint, then dark.
    if (f < at + STEP) return 0.5;
    if (f < at + 2 * STEP) return 0.18;
    return 0;
  }) as [number, number, number, number];
};

/** The keypad close-up (IMG-01 over IMG-02): shot 4a, from the end of scene 3 into scene 4. */
export const KeypadShot: React.FC<{ abs: number; w: number; h: number }> = ({ abs, w, h }) => {
  // A little wider than the picture, so the keys sit above a quiet strip for the caption.
  const zoom = push(abs, T.shot4a, T.shot4b, 0.88, 0.9);
  return <KeypadPlate w={w} h={h} cx={1283} cy={746} zoom={zoom} rows={rowsAt(abs)} extend />;
};

/** The worn key (IMG-03), its legend half rubbed away: shot 3b. */
export const WornKeyShot: React.FC<{ abs: number; w: number; h: number }> = ({ abs, w, h }) => {
  const zoom = push(abs, T.shot3b, T.burst3 + 0.2, 1.0, 1.05);
  return <WornKeyPlate w={w} h={h} zoom={zoom} cx={1290} cy={700} />;
};
