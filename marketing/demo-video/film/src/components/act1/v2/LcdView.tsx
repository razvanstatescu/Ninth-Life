/**
 * Draws the 96 x 64 screen (lcdModel.ts) as an STN panel (research-v2/10-act1-old-world.md, section 3.5) and pins it
 * onto a quad of a still with a CSS matrix3d, so it sits in the photographed glass with its perspective.
 *
 * - Dots fill 94% of the pitch (6% gaps, from an STN module drawing), dark blue-grey, multiplied into the
 *   photographed backlit glass so its scratches and dust stay visible.
 * - Unlit dots are faintly visible (the matrix), only while the backlight is on.
 * - Each dark dot casts a faint parallax shadow down and right (the moonlight comes from the upper left).
 */
import React, { useMemo } from 'react';
import { LCD_H, LCD_W } from './lcdModel';
import { quadTransform, type Quad } from './plates';

/** The SVG's own size in px before it is pinned (any value; the transform maps it onto the quad). */
const UNIT = 10;
const DOT = 0.94;
const INK = '#3a3f4a';

let uid = 0;

const pathFor = (lv: Float32Array, min: number, max: number, dx = 0, dy = 0) => {
  const inset = (1 - DOT) / 2;
  let d = '';
  for (let y = 0; y < LCD_H; y++)
    for (let x = 0; x < LCD_W; x++) {
      const v = lv[y * LCD_W + x]!;
      if (v > min && v <= max) d += `M${x + inset + dx} ${y + inset + dy}h${DOT}v${DOT}h${-DOT}z`;
    }
  return d;
};

/** The screen in its own 96 x 64 units: dots at their darkness, the faint matrix and the shadows. */
export const LcdSurface: React.FC<{ levels: Float32Array; backlight: number; contrast?: number }> = ({ levels, backlight, contrast = 1 }) => {
  const [pid] = React.useState(() => `lcdv2-${++uid}`);
  const bands = useMemo(
    () => [
      { min: 0, max: 0.25, a: 0.2 },
      { min: 0.25, max: 0.55, a: 0.5 },
      { min: 0.55, max: 0.75, a: 0.6 },
      { min: 0.75, max: 0.95, a: 0.9 },
      { min: 0.95, max: 1, a: 1 },
    ].map((b) => ({ ...b, d: pathFor(levels, b.min, b.max) })),
    [levels],
  );
  const shadow = useMemo(() => pathFor(levels, 0.45, 1, 0.3, 0.4), [levels]);
  // In the dark (backlight off) the shadows are what show: the moon lights the glass from one side.
  const shadowA = 0.12 + 0.2 * (1 - backlight);
  return (
    <svg width={LCD_W * UNIT} height={LCD_H * UNIT} viewBox={`0 0 ${LCD_W} ${LCD_H}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} shapeRendering="crispEdges">
      <defs>
        <pattern id={pid} width="1" height="1" patternUnits="userSpaceOnUse">
          <rect x={(1 - DOT) / 2} y={(1 - DOT) / 2} width={DOT} height={DOT} fill={INK} />
        </pattern>
      </defs>
      {backlight > 0 ? <rect x="0" y="0" width={LCD_W} height={LCD_H} fill={`url(#${pid})`} opacity={0.045 * backlight} /> : null}
      {shadow ? <path d={shadow} fill={INK} opacity={shadowA * contrast} /> : null}
      {bands.map((b, i) => (b.d ? <path key={i} d={b.d} fill={INK} opacity={0.92 * b.a * contrast} /> : null))}
    </svg>
  );
};

/** The screen pinned onto a quad of the still (still pixels), multiplied into the glass. */
export const LcdOnQuad: React.FC<{ quad: Quad; levels: Float32Array; backlight: number; contrast?: number }> = ({ quad, levels, backlight, contrast }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: LCD_W * UNIT,
      height: LCD_H * UNIT,
      transformOrigin: '0 0',
      transform: quadTransform(LCD_W * UNIT, LCD_H * UNIT, quad),
      mixBlendMode: 'multiply',
    }}
  >
    <LcdSurface levels={levels} backlight={backlight} contrast={contrast} />
  </div>
);

/**
 * A backlit glass drawn by the film, for a still with no lit edit (the master, p1): a soft yellow-green
 * gradient, brighter at the LED edge (bottom), screened onto the dark glass of the window quad, and a faint
 * glow around it. `level` 0..1.
 */
export const GlassGlow: React.FC<{ quad: Quad; level: number }> = ({ quad, level }) => {
  if (level <= 0) return null;
  const W = 340;
  const H = 260;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: W,
          height: H,
          transformOrigin: '0 0',
          transform: quadTransform(W, H, quad),
          background: 'linear-gradient(to top, #c9e08c 0%, #b3cf76 45%, #9fbd66 100%)',
          mixBlendMode: 'screen',
          opacity: level,
          borderRadius: 10,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: W,
          height: H,
          transformOrigin: '0 0',
          transform: quadTransform(W, H, quad),
          boxShadow: `0 0 60px 18px rgba(185,215,120,${0.28 * level})`,
          mixBlendMode: 'screen',
          borderRadius: 10,
        }}
      />
    </>
  );
};
