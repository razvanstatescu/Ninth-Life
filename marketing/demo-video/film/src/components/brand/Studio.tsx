/**
 * The "lit night studio" (07-revision-v2.md V6; research-v2/11, 3.12): the look of Act 2 in the second cut.
 * Flat UI reads as objects when it has a ground to stand on, a light direction, thickness and spill.
 *
 *  <StudioGround />                      screen space: night, the moon glow, a horizon haze (behind <World>)
 *  <Floor y={...} />                     WORLD space (inside <World>): a dot floor in perspective
 *  <ContactGlow x y w />                 WORLD space: the soft moon glow that seats an object on the floor
 *  <LightSweep progress />               inside any box with overflow hidden: one soft band of light
 *  <EmberSpill x y size strength />      the ember thing's light on its neighbours (<= 0.15)
 *
 * Rules (STYLE.md, second cut): one light sweep per chapter at most, low intensity (<= 0.15); the
 * spill is the ember thing's light, not a second ember thing; nothing flashes (no large-area change of
 * more than 10% luminance in under 3 frames, research-v2/12 section 8).
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C } from '../../tokens';
import { HEIGHT } from '../../timeline';
import { horizonY, type Cam } from '../../lib/camera';

/**
 * Screen-space ground: night, the icon's moon glow, and a faint horizon haze at `horizon` (% of height). Pass `cam`
 * to put the haze ON the camera's horizon instead (lib/camera horizonY: where a level floor meets the sky); use it
 * with `<Floor level>`, whose horizon that is (lib/stage <Studio> does both).
 */
export const StudioGround: React.FC<{
  glow?: { x: number; y: number; r?: number; strength?: number };
  horizon?: number;
  haze?: number;
  cam?: Cam;
  children?: React.ReactNode;
}> = ({ glow = { x: 50, y: 40, r: 70, strength: 1 }, horizon: horizonPct = 62, haze = 0.5, cam, children }) => {
  const r = glow.r ?? 70;
  const a = glow.strength ?? 1;
  const camHorizon = cam ? horizonY(cam) : null;
  // No horizon in front of the camera (it looks far down): the band goes off the top of the frame.
  const horizon = cam ? (camHorizon === null ? -40 : (camHorizon / HEIGHT) * 100) : horizonPct;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.night,
        backgroundImage: [
          `radial-gradient(ellipse ${r}% ${r * 1.1}% at ${glow.x}% ${glow.y}%, rgba(61,36,120,${0.9 * a}) 0%, rgba(37,21,79,${0.7 * a}) 45%, rgba(20,10,46,0) 100%)`,
          `linear-gradient(to bottom, rgba(20,10,46,0) ${horizon - 14}%, rgba(61,36,120,${0.22 * haze}) ${horizon}%, rgba(20,10,46,0) ${horizon + 22}%)`,
        ].join(', '),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * A floor of faint dots in perspective, in WORLD space. Its near line is at world y = `y` (where objects
 * stand); it reaches `near` px towards the viewer and `far` px away, and fades out with distance.
 * Put it first inside <World> so everything stands on it.
 *
 * Today's default (angle 78) is a ramp tilted 12 degrees towards the camera, which the camera must look DOWN to see
 * (cam.rx < 0). `level` (STYLE.md "Spatial rules") lays it exactly perpendicular to the UI planes (angle 90), so it
 * vanishes on the camera's eye level: show it by raising the eye (cam.eye) rather than pitching the camera, and give
 * it dots drawn `aspect` x longer in depth (default 3 when level) so they read as dots in rows at a grazing angle.
 * Children lie on the floor (floor coordinates: x across from the centre, y = towards the camera), e.g. lib/stage
 * GroundShadow / CastShadow.
 */
export const Floor: React.FC<{
  y: number;
  x?: number;
  width?: number;
  near?: number;
  far?: number;
  spacing?: number;
  opacity?: number;
  /** Floor angle before the camera's tilt: 90 = seen exactly level. Default 78 (today's look); see `level`. */
  angle?: number;
  /** A level floor: angle 90, dots with aspect 3. */
  level?: boolean;
  /** Dot radius in px (default 5). */
  dot?: number;
  /** Dots and rows this much longer in depth (default 1, or 3 when `level`). */
  aspect?: number;
  children?: React.ReactNode;
}> = ({ y, x = 0, width = 9000, near = 1400, far = 5200, spacing = 84, opacity = 1, angle, level = false, dot, aspect, children }) => {
  const depth = near + far;
  const originPct = (far / depth) * 100;
  const a = angle ?? (level ? 90 : 78);
  const k = aspect ?? (level ? 3 : 1);
  const plain = k === 1 && dot === undefined;
  const r = (dot ?? 5) * 1.4;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - width / 2,
        top: y - far,
        width,
        height: depth,
        transformOrigin: `50% ${originPct}%`,
        transform: `rotateX(${a}deg)`,
        opacity,
        backgroundImage: plain
          ? `radial-gradient(circle, rgba(141,128,194,0.42) 5px, rgba(141,128,194,0) 7px)`
          : `radial-gradient(${r}px ${r * k}px at 50% 50%, rgba(141,128,194,0.42) 0%, rgba(141,128,194,0.42) 70%, rgba(141,128,194,0) 100%)`,
        backgroundSize: plain ? `${spacing}px ${spacing}px` : `${spacing}px ${spacing * k}px`,
        backgroundPosition: plain ? `${spacing / 2}px ${spacing / 2}px` : `${spacing / 2}px ${(spacing * k) / 2}px`,
        maskImage: `linear-gradient(to bottom, transparent 0%, black ${originPct * 0.55}%, black ${originPct + 6}%, transparent 100%)`,
        WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, black ${originPct * 0.55}%, black ${originPct + 6}%, transparent 100%)`,
        pointerEvents: 'none',
      }}
    >
      {children ? <div style={{ position: 'absolute', left: width / 2, top: far, width: 0, height: 0 }}>{children}</div> : null}
    </div>
  );
};

/** The soft moon glow under an object standing on the floor (shadows do not read on night). WORLD space. */
export const ContactGlow: React.FC<{ x: number; y: number; w: number; h?: number; strength?: number }> = ({ x, y, w, h = w * 0.16, strength = 1 }) => (
  <div
    style={{
      position: 'absolute',
      left: x - w / 2,
      top: y - h / 2,
      width: w,
      height: h,
      borderRadius: '50%',
      // No CSS filter: inside a tilted <World> a blur filter renders as a hard-edged rectangle. The
      // radial gradient is soft on its own.
      background: `radial-gradient(closest-side, rgba(238,232,255,${0.1 * strength}) 0%, rgba(238,232,255,${0.05 * strength}) 45%, rgba(238,232,255,${0.015 * strength}) 75%, rgba(238,232,255,0) 100%)`,
      pointerEvents: 'none',
    }}
  />
);

/**
 * One soft band of light crossing its parent (the parent needs `overflow: hidden` and its radius).
 * `progress` 0..1 drives the band from off the left edge to off the right edge.
 */
export const LightSweep: React.FC<{ progress: number; intensity?: number; angle?: number; width?: number; color?: string }> = ({
  progress,
  intensity = 0.12,
  angle = 105,
  width = 45,
  color = '238,232,255',
}) => {
  if (progress <= 0 || progress >= 1) return null;
  const left = -width - 20 + progress * (140 + width);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 'inherit', pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          top: '-30%',
          bottom: '-30%',
          left: `${left}%`,
          width: `${width}%`,
          background: `linear-gradient(${angle - 90}deg, rgba(${color},0) 0%, rgba(${color},${intensity}) 50%, rgba(${color},0) 100%)`,
          transform: `skewX(${-(angle - 90)}deg)`,
          mixBlendMode: 'screen',
        }}
      />
    </div>
  );
};

/** The ember thing's light on what is around it: a warm radial glow, centred on (x, y), at most 0.15. */
export const EmberSpill: React.FC<{ x: number; y: number; size: number; strength?: number }> = ({ x, y, size, strength = 0.12 }) => {
  if (strength <= 0) return null;
  const s = Math.min(0.15, strength);
  return (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(closest-side, rgba(255,177,61,${s}) 0%, rgba(255,177,61,${s * 0.45}) 45%, rgba(255,177,61,0) 100%)`,
        mixBlendMode: 'screen',
        pointerEvents: 'none',
      }}
    />
  );
};
