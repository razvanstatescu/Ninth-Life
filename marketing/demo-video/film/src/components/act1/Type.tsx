/**
 * Act 1's text: the set's on-screen display (`ch 09`, `no signal`) and the act's lines.
 * VT323, lower case, pale green. Put them in <TubePicture overlay={...}> so they sit on the tube
 * (curve, scanlines) but above the static; S05's lines are on clean black (the set is off).
 *
 * Lines are at least 56 px (readable at half size) and each stays on screen at least 1.8 s
 * (the scene decides the times; see LINE_MIN).
 */
import React from 'react';
import { A1, A1_FONT } from './palette';
import { sec } from '../../timeline';

/** Shortest time an Act 1 line may stay on screen. */
export const LINE_MIN = sec(1.8);

const glow = (alpha: number) => `0 0 14px rgba(191,232,204,${alpha}), 0 0 2px rgba(191,232,204,${alpha * 0.8})`;

/** One line of Act 1 text. Position it with `x`/`y` (top-left of the line box) inside its parent. */
export const Line: React.FC<{
  text: string;
  x: number;
  y: number;
  size?: number;
  align?: 'left' | 'center';
  width?: number;
  opacity?: number;
}> = ({ text, x, y, size = 64, align = 'left', width, opacity = 1 }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: width ?? 'auto',
      textAlign: align,
      fontFamily: A1_FONT.tv,
      fontSize: size,
      lineHeight: 1,
      color: A1.text,
      textShadow: glow(0.42),
      whiteSpace: 'pre',
      letterSpacing: '0.02em',
      opacity,
    }}
  >
    {text}
  </div>
);

/** The set's own small display text: `ch 09` top right, `no signal` bottom left. */
export const Osd: React.FC<{ text: string; corner: 'tl' | 'tr' | 'bl' | 'br'; w: number; h: number; size?: number }> = ({
  text,
  corner,
  w,
  h,
  size = 52,
}) => {
  const mx = Math.round(w * 0.06);
  const my = Math.round(h * 0.075);
  const pos: React.CSSProperties = {
    position: 'absolute',
    ...(corner[0] === 't' ? { top: my } : { bottom: my }),
    ...(corner[1] === 'l' ? { left: mx } : { right: mx }),
  };
  return (
    <div
      style={{
        ...pos,
        fontFamily: A1_FONT.tv,
        fontSize: size,
        lineHeight: 1,
        color: A1.text,
        textShadow: `${glow(0.35)}, 2px 2px 0 rgba(0,0,0,0.55)`,
        letterSpacing: '0.04em',
        whiteSpace: 'pre',
      }}
    >
      {text}
    </div>
  );
};
