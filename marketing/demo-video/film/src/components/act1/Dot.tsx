/**
 * The dot: what the television leaves behind when it switches off (S04), the hinge of S05, and the
 * first ember of the film. At `warm` = 1 it is exactly the hand-off to S06 (STYLE.md): 28 px, #ffb13d,
 * glow 0 0 24px rgba(255,177,61,0.6), centred on (960, 540).
 *
 * <BeamDot> draws the second half of the switch-off: the line left by the collapsing picture shrinks
 * to the dot, slowing down, thinner at its ends, its brightness falling. It ends on <Dot warm={0}>.
 */
import React from 'react';
import { interpolateColors } from 'remotion';
import { A1, DOT } from './palette';
import { EASE, mix, ramp } from '../../lib/anim';
import { TUBE, screenBox } from './TubePicture';

const PALE_GLOW = { r: 215, g: 220, b: 220, a: 0.32, blur: 18 };
const EMBER_GLOW = { r: 255, g: 177, b: 61, a: 0.6, blur: 24 };

/** Colour and glow of the dot for a warmth 0 (pale) .. 1 (ember). */
export const dotLook = (warm: number) => {
  const t = Math.min(1, Math.max(0, warm));
  if (t >= 1) return { color: DOT.ember, shadow: DOT.emberGlow };
  const color = interpolateColors(t, [0, 1], [A1.dotPale, DOT.ember]);
  const g = (k: keyof typeof PALE_GLOW) => mix(PALE_GLOW[k], EMBER_GLOW[k], t);
  const shadow = `0 0 ${g('blur').toFixed(2)}px rgba(${Math.round(g('r'))},${Math.round(g('g'))},${Math.round(g('b'))},${g('a').toFixed(3)})`;
  return { color, shadow };
};

export const Dot: React.FC<{ x?: number; y?: number; size?: number; warm?: number; opacity?: number }> = ({
  x = DOT.x,
  y = DOT.y,
  size = DOT.size,
  warm = 0,
  opacity = 1,
}) => {
  const { color, shadow } = dotLook(warm);
  return (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: shadow,
        opacity,
      }}
    />
  );
};

/**
 * The line left by the switch-off shrinking to the dot. `at` is the frame the switch-off started
 * (the same `at` given to switchOff()); before at + collapseFrames it draws nothing, after the
 * shrink it draws the pale dot. Sizes follow the set (`width`, `height`), so the S15 inset can use it.
 */
export const BeamDot: React.FC<{
  frame: number;
  at: number;
  width?: number;
  height?: number;
  dotSize?: number;
  /** Colour warmth of the final dot (S05 warms it later). */
  warm?: number;
}> = ({ frame, at, width = 1920, height = 1080, dotSize = DOT.size, warm = 0 }) => {
  const start = at + TUBE.collapseFrames;
  if (frame < start) return null;
  const cx = width / 2;
  const cy = height / 2;
  const t = ramp(frame, start, TUBE.shrinkFrames, 0, 1, EASE.linear);
  if (t >= 1) return <Dot x={cx} y={cy} size={dotSize} warm={warm} />;
  const s = screenBox(width, height);
  // Shrinks fast, then slows down (ease-out); the line grows a little thicker as it gathers into the dot.
  const p = EASE.out(t);
  const w = mix(s.w * 0.985, dotSize, p);
  const h = mix(Math.max(3, height * 0.006), dotSize, Math.pow(p, 3));
  // Brightness falls from the line's pale white to the dot's pale grey.
  const light = mix(0.9, 0.82, p);
  const core = `rgba(${Math.round(236 * light + 18)},${Math.round(240 * light + 16)},${Math.round(240 * light + 16)},1)`;
  // In the last frames the beam hands over to the solid dot that stays.
  const handover = ramp(t, 0.7, 0.3, 0, 1, EASE.linear);
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: cx - w / 2,
          top: cy - h / 2,
          width: w,
          height: h,
          borderRadius: '50%',
          // Brightest in the middle, thinning and dimming towards the ends.
          background: `radial-gradient(ellipse at center, ${core} 0%, ${core} 38%, rgba(205,211,211,0.5) 76%, rgba(205,211,211,0) 100%)`,
          boxShadow: `0 0 ${mix(22, 18, p).toFixed(1)}px rgba(215,220,220,${mix(0.42, 0.32, p).toFixed(3)})`,
          opacity: 1 - handover,
        }}
      />
      {handover > 0 ? <Dot x={cx} y={cy} size={dotSize} warm={warm} opacity={handover} /> : null}
    </>
  );
};
