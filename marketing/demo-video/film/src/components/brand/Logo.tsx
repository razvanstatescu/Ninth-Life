/**
 * The Ninth Life icon (design/system/assets/Logos/ninth-life-icon.svg), inlined so the ninth key can
 * fade in on its own on the end card. Brand rule: never animate, tilt, squash, recolour or build up the
 * icon. It may cut or fade in whole; only the ninth key's ember may fade in last.
 * Also the ground: night with the icon's own moon glow, and a faint dot field for camera moves.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, FONT } from '../../tokens';

const KEYS: [number, number][] = [
  [332, 350], [460, 350], [588, 350],
  [332, 478], [460, 478], [588, 478],
  [332, 606], [460, 606],
];

export const AppIcon: React.FC<{
  size?: number;
  /** 0..1: the ninth key's ember. At 0 the ninth key is plum like the others. */
  ninth?: number;
  /** Draw the night tile behind the bubble (the full icon). Off on a night ground. */
  tile?: boolean;
  style?: React.CSSProperties;
}> = ({ size = 320, ninth = 1, tile = false, style }) => (
  <svg width={size} height={size} viewBox="0 0 1024 1024" style={{ display: 'block', overflow: 'visible', ...style }} aria-label="Ninth Life">
    <defs>
      <radialGradient id="nlIconNight" cx="34%" cy="26%" r="90%">
        <stop offset="0%" stopColor="#3D2478" />
        <stop offset="55%" stopColor="#25154F" />
        <stop offset="100%" stopColor="#140A2E" />
      </radialGradient>
      <linearGradient id="nlIconMoon" gradientUnits="userSpaceOnUse" x1="0" y1="186" x2="0" y2="846">
        <stop offset="0%" stopColor="#F3EEFF" />
        <stop offset="100%" stopColor="#DCD2F7" />
      </linearGradient>
      <linearGradient id="nlIconEmber" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFD27A" />
        <stop offset="100%" stopColor="#FF9F2E" />
      </linearGradient>
      <filter id="nlIconGlow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="22" />
      </filter>
    </defs>
    {tile ? <rect width="1024" height="1024" fill="url(#nlIconNight)" /> : null}
    <g fill="none" stroke="url(#nlIconMoon)" strokeWidth="28" strokeLinejoin="round">
      <polygon points="290,336 310,186 430,306" />
      <polygon points="734,336 714,186 594,306" />
      <polygon points="340,730 318,846 450,752" />
      <rect x="252" y="300" width="520" height="460" rx="110" />
    </g>
    <g fill="url(#nlIconMoon)">
      <polygon points="290,336 310,186 430,306" />
      <polygon points="734,336 714,186 594,306" />
      <polygon points="340,730 318,846 450,752" />
      <rect x="252" y="300" width="520" height="460" rx="110" />
    </g>
    <g fill="#2A1856">
      {KEYS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="104" height="104" rx="26" />
      ))}
      <rect x="588" y="606" width="104" height="104" rx="26" />
    </g>
    <g opacity={ninth}>
      <rect x="588" y="606" width="104" height="104" rx="26" fill="#FFB13D" opacity="0.75" filter="url(#nlIconGlow)" />
      <rect x="588" y="606" width="104" height="104" rx="26" fill="url(#nlIconEmber)" />
      <rect x="606" y="622" width="48" height="14" rx="7" fill="#FFF3D6" opacity="0.7" />
    </g>
  </svg>
);

/** The wordmark: "Ninth Life" in Atkinson Hyperlegible Next ExtraBold (never redrawn). */
export const Wordmark: React.FC<{ size?: number; color?: string; style?: React.CSSProperties }> = ({ size = 96, color = C.moon, style }) => (
  <div style={{ fontFamily: FONT.sans, fontWeight: 800, fontSize: size, lineHeight: 0.95, letterSpacing: '-0.02em', color, whiteSpace: 'nowrap', ...style }}>
    Ninth Life
  </div>
);

/** Night ground with the icon's moon glow. `glow` positions the glow in % of the frame. */
export const NightGround: React.FC<{ glow?: { x: number; y: number; r?: number; strength?: number }; children?: React.ReactNode }> = ({
  glow = { x: 50, y: 42, r: 70, strength: 1 },
  children,
}) => {
  const r = glow.r ?? 70;
  const a = glow.strength ?? 1;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.night,
        backgroundImage: `radial-gradient(ellipse ${r}% ${r * 1.1}% at ${glow.x}% ${glow.y}%, rgba(61,36,120,${0.95 * a}) 0%, rgba(37,21,79,${0.75 * a}) 45%, rgba(20,10,46,0) 100%)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * A faint field of dots in WORLD space (put it inside <World>), so camera moves read as moves.
 * Centred on world (cx, cy). Spacing 48 px, like a quiet grid of keys.
 */
export const DotField: React.FC<{ cx?: number; cy?: number; width?: number; height?: number; spacing?: number; opacity?: number }> = ({
  cx = 0,
  cy = 0,
  width = 9000,
  height = 6000,
  spacing = 48,
  opacity = 1,
}) => (
  <div
    style={{
      position: 'absolute',
      left: cx - width / 2,
      top: cy - height / 2,
      width,
      height,
      opacity,
      backgroundImage: `radial-gradient(circle, rgba(141,128,194,0.22) 1.6px, rgba(141,128,194,0) 2.4px)`,
      backgroundSize: `${spacing}px ${spacing}px`,
      backgroundPosition: `${spacing / 2}px ${spacing / 2}px`,
    }}
  />
);
