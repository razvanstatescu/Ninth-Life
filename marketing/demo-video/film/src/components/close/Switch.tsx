/**
 * Things drawn by us for scene 13 (not anyone's product), for the spatial stage (lib/stage; STYLE.md "Spatial
 * rules": a level floor seen from a raised eye, so objects on it are seen almost from the side):
 * - SwitchDome: one large plain round switch for switch access, standing on the floor: a plum dome lit from the top
 *   left, with a moon rim, on a short round base. A press moves the dome straight down into its base.
 * - Keycap3D: one plain keycap of our own (a rounded square, a mono digit) with real thickness, standing upright on the
 *   floor and facing the camera; a press sinks the cap into its base (as brand Key body="slab" does).
 * Pure: every state comes from props. Ground them with lib/stage GroundShadow and CastShadow.
 */
import React from 'react';
import { C, FONT } from '../../tokens';
import { Crisp } from '../../lib/stage';

// ---- the switch ------------------------------------------------------------------------------------------

/** The switch's box for a diameter D: the dome (domeH) on a base band (baseH), with the base's bottom ellipse. */
export const switchDomeSize = (D: number) => {
  const domeH = D * 0.21;
  const baseH = D * 0.13;
  const rb = D * 0.05; // half-height of the base's ellipses, seen from a little above
  return { w: D, h: domeH + baseH + rb, domeH, baseH, rb };
};

let uid = 0;

export const SwitchDome: React.FC<{ size: number; press?: number }> = ({ size: D, press = 0 }) => {
  const [id] = React.useState(() => `sw${++uid}`);
  const { w, h, domeH, baseH, rb } = switchDomeSize(D);
  const cx = D / 2;
  const R = D / 2; // the base
  const a = D * 0.44; // the dome
  const b = rb * 0.88;
  const yR = domeH; // the base's top ellipse (and the dome's foot) centre line
  const yB = yR + baseH;
  const sink = domeH * 0.22 * press;
  const yC = yR + sink;
  const base = `M ${cx - R} ${yR} L ${cx - R} ${yB} A ${R} ${rb} 0 0 0 ${cx + R} ${yB} L ${cx + R} ${yR} A ${R} ${rb} 0 0 1 ${cx - R} ${yR} Z`;
  const dome = `M ${cx - a} ${yC} A ${a} ${b} 0 0 0 ${cx + a} ${yC} A ${a} ${domeH - sink} 0 0 0 ${cx - a} ${yC} Z`;
  const rimArc = `M ${cx - a} ${yC} A ${a} ${domeH - sink} 0 0 1 ${cx + a} ${yC}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${id}side`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3a2672" />
          <stop offset="0.18" stopColor={C.plum} />
          <stop offset="0.7" stopColor="#1d1040" />
          <stop offset="1" stopColor="#120a2c" />
        </linearGradient>
        <linearGradient id={`${id}rim`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4a3488" />
          <stop offset="1" stopColor="#24164e" />
        </linearGradient>
        <radialGradient id={`${id}dome`} cx="0.34" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#5a3fa0" />
          <stop offset="0.35" stopColor={C.glowCentre} />
          <stop offset="0.72" stopColor={C.plum} />
          <stop offset="1" stopColor="#170c34" />
        </radialGradient>
        <radialGradient id={`${id}hi`} cx="0.33" cy="0.22" r="0.42">
          <stop offset="0" stopColor="rgba(238,232,255,0.5)" />
          <stop offset="1" stopColor="rgba(238,232,255,0)" />
        </radialGradient>
        <linearGradient id={`${id}moon`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(238,232,255,0.95)" />
          <stop offset="0.45" stopColor="rgba(238,232,255,0.6)" />
          <stop offset="0.8" stopColor="rgba(238,232,255,0)" />
        </linearGradient>
      </defs>
      {/* the round base: its side band, then its top surface around the dome */}
      <path d={base} fill={`url(#${id}side)`} />
      <ellipse cx={cx} cy={yR} rx={R} ry={rb} fill={`url(#${id}rim)`} />
      <ellipse cx={cx} cy={yR} rx={R} ry={rb} fill="none" stroke="rgba(238,232,255,0.22)" strokeWidth={D * 0.006} />
      {/* the dome, lit from the top left, and its moon rim along the upper left */}
      <path d={dome} fill={`url(#${id}dome)`} />
      <path d={dome} fill={`url(#${id}hi)`} />
      <path d={rimArc} fill="none" stroke={`url(#${id}moon)`} strokeWidth={D * 0.012} strokeLinecap="round" />
      {/* the sink line where the dome meets the base, darker when pressed */}
      <path d={`M ${cx - a} ${yC} A ${a} ${b} 0 0 0 ${cx + a} ${yC}`} fill="none" stroke={`rgba(8,4,20,${0.35 + 0.25 * press})`} strokeWidth={D * 0.01} />
    </svg>
  );
};

// ---- the keycap ------------------------------------------------------------------------------------------

const CAP_SIDE = '#170c34';
const CAP_SIDE_LIT = '#3a2672';

/**
 * A keycap with thickness (STYLE.md: real thickness, the sides the camera sees): side layers from its base (z 0) to
 * the cap (z depth, sinking 70% of that when pressed). The digit goes through <Crisp>. Needs a preserve-3d chain.
 */
export const Keycap3D: React.FC<{ digit: string; size: number; depth?: number; sink?: number }> = ({ digit, size, depth = 28, sink = 0 }) => {
  const top = Math.max(1, depth * (1 - 0.7 * sink));
  const r = size * 0.2;
  const n = 6;
  return (
    <div style={{ position: 'relative', width: size, height: size, transformStyle: 'preserve-3d' }}>
      {Array.from({ length: n - 1 }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: r,
            background: `linear-gradient(165deg, ${CAP_SIDE_LIT} 0%, ${CAP_SIDE} 55%)`,
            transform: `translateZ(${(top * i) / (n - 1)}px)`,
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: r,
          transform: `translateZ(${top}px)`,
          background: `radial-gradient(ellipse 90% 75% at 38% 22%, ${C.glowCentre} 0%, ${C.plum} 72%)`,
          boxShadow: `inset 0 0 0 ${size * 0.02}px rgba(141,128,194,0.8), inset 0 ${size * 0.022}px 0 rgba(238,232,255,0.16)`,
        }}
      >
        <Crisp w={size} h={size}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              fontFamily: FONT.mono,
              fontSize: size * 0.46,
              fontWeight: 500,
              lineHeight: 1,
              color: C.onKey,
            }}
          >
            {digit}
          </div>
        </Crisp>
      </div>
    </div>
  );
};
