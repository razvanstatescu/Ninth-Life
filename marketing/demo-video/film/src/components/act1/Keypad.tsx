/**
 * The old phone's keys, drawn over the generated plates:
 * - <KeyLegend>: digit and letters on one key (VT323, lower case, a plain old-phone face; never the
 *   brand font). Lit legends glow pale green; unlit ones are faint grey print.
 * - <KeypadPlate>: the keypad close-up (IMG-01 lit over IMG-02 dark). Each ROW's backlight can be
 *   switched off (scene 4); one key can be pressed (its light jumps up).
 * - <PhonePlate>: the whole phone (IMG-06 lit, or IMG-07 dark and dusty) with legends, and an
 *   optional pixel screen on its display.
 */
import React from 'react';
import { Img } from 'remotion';
import { A1, A1_FONT } from './palette';
import { KEY_ORDER, KEY_ROWS, Plate, keyBox, plateInfo, plateSrc, type Box, type KeyName, type PlateId } from './Plate';
import decoded from '../../data/decoded.json';

/** Legends from the real keypad table (decoded.json), in Act 1's lower case. */
export const LEGENDS: Record<KeyName, { main: string; sub: string }> = Object.fromEntries(
  decoded.keypad.keys.map((k) => [k.id, { main: k.digit, sub: k.letters.toLowerCase() }]),
) as Record<KeyName, { main: string; sub: string }>;

/** Row of a key (0..3). */
export const rowOf = (k: KeyName) => KEY_ROWS.findIndex((r) => r.includes(k));

export const KeyLegend: React.FC<{
  box: Box;
  k: KeyName;
  /** 0 = unlit print, 1 = backlit. */
  light?: number;
  /** Extra brightness of a pressed key, 0..1. */
  press?: number;
  opacity?: number;
}> = ({ box, k, light = 1, press = 0, opacity = 1 }) => {
  const [x, y, w, h] = box;
  const { main, sub } = LEGENDS[k];
  const lit = Math.min(1, light);
  // Lit: pale green with a glow; unlit: grey print that the moonlight barely catches.
  const color = lit > 0.5 ? A1.legend : '#7f8a86';
  const a = lit > 0.5 ? 0.92 * lit + 0.08 * press : 0.32;
  const glow = lit > 0.5 ? `0 0 ${h * 0.06}px rgba(199,240,216,${0.55 * lit + 0.4 * press}), 0 0 ${h * 0.015}px rgba(228,251,234,0.8)` : 'none';
  const word = sub.length > 4;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: A1_FONT.tv,
        color,
        opacity: a * opacity,
        textShadow: glow,
        lineHeight: 1,
        // The face of the key sits a little above the box centre (the box includes its rounded sides).
        paddingBottom: h * 0.06,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ fontSize: h * 0.4 }}>{main}</div>
      <div style={{ fontSize: h * (word ? 0.17 : 0.2), marginTop: h * 0.01, letterSpacing: '0.04em' }}>{sub}</div>
    </div>
  );
};

/** A pressed key's light: a soft pale-green bloom over the key (screen blend). */
const PressGlow: React.FC<{ box: Box; amount: number }> = ({ box, amount }) => {
  if (amount <= 0) return null;
  const [x, y, w, h] = box;
  const pad = w * 0.35;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - pad,
        top: y - pad,
        width: w + 2 * pad,
        height: h + 2 * pad,
        borderRadius: '50%',
        background: `radial-gradient(closest-side, rgba(199,240,216,${0.55 * amount}) 0%, rgba(199,240,216,${0.32 * amount}) 45%, rgba(199,240,216,0) 100%)`,
        mixBlendMode: 'screen',
      }}
    />
  );
};

/**
 * The keypad close-up. `rows` = backlight of each row (0 off .. 1 on); the dark plate shows through
 * where a row is off. `press` lights one key. View size w x h; framing as <Plate>.
 */
export const KeypadPlate: React.FC<{
  w: number;
  h: number;
  cx?: number;
  cy?: number;
  zoom?: number;
  rows?: [number, number, number, number];
  press?: { k: KeyName; amount: number } | null;
  legends?: number;
  /** Wider than the picture allows (zoom < 1): see <Plate extend>. */
  extend?: boolean;
}> = ({ w, h, cx, cy, zoom = 1, rows = [1, 1, 1, 1], press = null, legends = 1, extend = false }) => {
  const lit: PlateId = 'img-01-keypad-lit';
  const info = plateInfo(lit);
  // Row bands split half-way between rows, feathered, and limited to the keypad's width.
  const tops = KEY_ROWS.map((r) => keyBox(lit, r[0]!)[1]);
  const bots = KEY_ROWS.map((r) => keyBox(lit, r[0]!)[1] + keyBox(lit, r[0]!)[3]);
  const left = keyBox(lit, '1')[0];
  const right = keyBox(lit, '3')[0] + keyBox(lit, '3')[2];
  const padX = 90;
  const feather = 22;
  return (
    <Plate id="img-02-keypad-dark" w={w} h={h} cx={cx} cy={cy} zoom={zoom} extend={extend}>
      {rows.map((level, r) => {
        if (level <= 0) return null;
        // The outer bands stop a little beyond the keys (not at the picture's edge, which may be in view).
        const y0 = r === 0 ? Math.max(feather, tops[0]! - 40) : (bots[r - 1]! + tops[r]!) / 2;
        const y1 = r === 3 ? Math.min(info.height - feather, bots[3]! + 70) : (bots[r]! + tops[r + 1]!) / 2;
        const mask = `linear-gradient(to bottom, transparent ${y0 - feather}px, black ${y0 + feather}px, black ${y1 - feather}px, transparent ${y1 + feather}px), linear-gradient(to right, transparent ${left - padX - 60}px, black ${left - padX + 60}px, black ${right + padX - 60}px, transparent ${right + padX + 60}px)`;
        return (
          <Img
            key={r}
            src={plateSrc(lit)}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: info.width,
              height: info.height,
              opacity: Math.min(1, level),
              maskImage: mask,
              WebkitMaskImage: mask,
              maskComposite: 'intersect',
              WebkitMaskComposite: 'source-in',
            }}
          />
        );
      })}
      {press ? <PressGlow box={keyBox(lit, press.k)} amount={press.amount} /> : null}
      {legends > 0
        ? KEY_ORDER.map((k) => (
            <KeyLegend
              key={k}
              k={k}
              box={keyBox(lit, k)}
              light={rows[rowOf(k)]}
              press={press && press.k === k ? press.amount : 0}
              opacity={legends}
            />
          ))
        : null}
    </Plate>
  );
};

/**
 * The worn key (IMG-03): one key in macro, its legend ("4 ghi", the key that starts both "hello" and
 * "good") half rubbed away where a thumb pressed it for years. The wear is a fixed noise pattern
 * (feTurbulence with a fixed seed), so it is the same on every frame.
 */
export const WornKeyPlate: React.FC<{ w: number; h: number; cx?: number; cy?: number; zoom?: number }> = ({ w, h, cx, cy, zoom = 1 }) => {
  const face = plateInfo('img-03-worn-key').face as Box;
  const [fx, fy, fw, fh] = face;
  // The top face of the key, seen from a low angle: the legend sits a little above the box centre.
  const lx = fx + fw / 2;
  const ly = fy + fh * 0.4;
  const size = fh * 0.44;
  return (
    <Plate id="img-03-worn-key" w={w} h={h} cx={cx} cy={cy} zoom={zoom}>
      <svg
        width={fw}
        height={fh}
        viewBox={`0 0 ${fw} ${fh}`}
        style={{ position: 'absolute', left: fx, top: fy, overflow: 'visible' }}
      >
        <defs>
          <filter id="wear-noise" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="5" seed="9" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 9 -3.7" />
          </filter>
          <radialGradient id="wear-centre" cx="0.4" cy="0.33" r="0.3">
            <stop offset="0" stopColor="#000" stopOpacity="0.75" />
            <stop offset="0.55" stopColor="#000" stopOpacity="0.35" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <mask id="wear-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={fw} height={fh}>
            <rect x="0" y="0" width={fw} height={fh} fill="#fff" filter="url(#wear-noise)" />
            <rect x="0" y="0" width={fw} height={fh} fill="url(#wear-centre)" />
          </mask>
        </defs>
        {/* The mask lives in the face's own space; the legend is placed (and foreshortened) inside it. */}
        <g mask="url(#wear-mask)">
          <g
            style={{ fontFamily: A1_FONT.tv, fill: A1.legend }}
            transform={`translate(${lx - fx} ${ly - fy}) scale(1 0.86)`}
            filter="drop-shadow(0 0 10px rgba(199,240,216,0.55))"
            opacity={0.82}
          >
            <text x="0" y={size * 0.1} fontSize={size} textAnchor="middle">
              4
            </text>
            <text x="0" y={size * 0.62} fontSize={size * 0.46} textAnchor="middle" letterSpacing="0.04em">
              ghi
            </text>
          </g>
        </g>
      </svg>
    </Plate>
  );
};

/**
 * The whole phone. `dusty` uses IMG-07 (switched off, years later): legends are faint print.
 * `screen` is drawn on the display box (plate px), for example a <PixelScreen>.
 */
export const PhonePlate: React.FC<{
  w: number;
  h: number;
  cx?: number;
  cy?: number;
  zoom?: number;
  dusty?: boolean;
  screen?: (box: Box) => React.ReactNode;
  press?: { k: KeyName; amount: number } | null;
}> = ({ w, h, cx, cy, zoom = 1, dusty = false, screen, press = null }) => {
  const id: PlateId = dusty ? 'img-07-phone-dusty' : 'img-06-phone-lit';
  const disp = plateInfo(id).display as Box;
  return (
    <Plate id={id} w={w} h={h} cx={cx} cy={cy} zoom={zoom}>
      {screen ? screen(disp) : null}
      {press && !dusty ? <PressGlow box={keyBox(id, press.k)} amount={press.amount} /> : null}
      {KEY_ORDER.map((k) => (
        <KeyLegend key={k} k={k} box={keyBox(id, k)} light={dusty ? 0 : 1} press={press && press.k === k ? press.amount : 0} opacity={dusty ? 0.75 : 1} />
      ))}
    </Plate>
  );
};
