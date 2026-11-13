/**
 * Spatial lab (research-v2/16-spatial-tech.md): the camera maths of the comparison views and tools, INCLUDING the old
 * <World> ('legacy', before 2026-11-11). Production code uses lib/camera (the physical camera) and lib/stage.
 *
 * The old lib/camera:  perspective P on the frame, world = translate(centre) rotateX rotateY rotateZ scale(zoom) translate(-cam)
 *   `scale(zoom)` is a 2D scale (x and y only). For anything flat at z = 0 that is the same as a camera at distance
 *   P / zoom (a dolly), but anything with depth is squashed or stretched as the zoom changes: the tilted floor turns
 *   towards the viewer when the camera zooms in, translateZ layers lose their parallax, a phone's thickness plates get
 *   thinner, and the keystone of a turned plane grows with the zoom.
 *
 * Here the camera is physical: it orbits the look-at point (cam.x, cam.y, 0) at a distance D, with a focal length F.
 *   CSS: perspective F on the frame, world = translate(centre) scale3d(s, s, s) rotateX rotateY rotateZ translate(-cam)
 *   with s = F / D (a UNIFORM 3D scale, so depth scales with x and y).
 *
 *   mode 'dolly'  zoom moves the camera (D = lens / zoom, F = lens). Every pixel at z = 0 is identical to today's
 *                 <World> (seams stay pixel-matched); floors, translateZ layers and thickness become correct.
 *   mode 'lens'   zoom changes the focal length (F = lens * zoom, D = lens - dolly). The perspective no longer changes
 *                 with zoom: a close-up is a longer lens, not a camera in the subject's face. `dolly` moves the camera.
 *   mode 'legacy' today's maths, for comparisons.
 *
 * `lens` is the focal length in px at zoom 1 (2400 = today's World, about a 45 mm lens on full frame across 1920 px;
 * 4800 is about 90 mm, 7200 about 135 mm).
 */
import React from 'react';
import { AbsoluteFill, HtmlInCanvas } from 'remotion';
import { blur } from '@remotion/effects/blur';
import { zoomBlur } from '@remotion/effects/zoom-blur';
import type { Cam } from '../lib/camera';
import { HEIGHT, WIDTH } from '../timeline';

export type ZoomMode = 'legacy' | 'dolly' | 'lens';
export type LensCam = Cam & {
  /** Focal length in px at zoom 1 (CSS perspective at zoom 1). Default 2400 (today's World). */
  lens?: number;
  /** World px the camera has moved towards the look-at point (lens and dolly modes). */
  dolly?: number;
};

export const DEFAULT_LENS = 2400;
const rad = (d: number) => (d * Math.PI) / 180;

/** Focal length F (the CSS perspective), camera distance D from the look-at point, uniform world scale s = F / D. */
export const optics = (cam: LensCam, mode: ZoomMode) => {
  const lens = cam.lens ?? DEFAULT_LENS;
  const dolly = cam.dolly ?? 0;
  if (mode === 'legacy') return { F: lens, D: lens / cam.zoom, s: cam.zoom };
  if (mode === 'dolly') {
    const D = lens / cam.zoom - dolly;
    return { F: lens, D, s: lens / D };
  }
  const D = lens - dolly;
  const F = lens * cam.zoom;
  return { F, D, s: F / D };
};

/** The world transform (CSS) for a camera. */
export const lensTransform = (cam: LensCam, mode: ZoomMode) => {
  const c = `translate(${WIDTH / 2}px, ${HEIGHT / 2}px)`;
  const r = `rotateX(${cam.rx}deg) rotateY(${cam.ry}deg) rotateZ(${cam.rz}deg)`;
  if (mode === 'legacy') return `${c} ${r} scale(${cam.zoom}) translate(${-cam.x}px, ${-cam.y}px)`;
  const { s } = optics(cam, mode);
  return `${c} scale3d(${s}, ${s}, ${s}) ${r} translate3d(${-cam.x}px, ${-cam.y}px, 0px)`;
};

type V3 = { x: number; y: number; z: number };
/** rotateZ, then rotateY, then rotateX: the CSS order for `rotateX() rotateY() rotateZ()` (as components/mid/geo.ts). */
const rotate = (v: V3, cam: Cam): V3 => {
  let { x, y, z } = v;
  {
    const c = Math.cos(rad(cam.rz));
    const s = Math.sin(rad(cam.rz));
    [x, y] = [x * c - y * s, x * s + y * c];
  }
  {
    const c = Math.cos(rad(cam.ry));
    const s = Math.sin(rad(cam.ry));
    [x, z] = [x * c + z * s, -x * s + z * c];
  }
  {
    const c = Math.cos(rad(cam.rx));
    const s = Math.sin(rad(cam.rx));
    [y, z] = [y * c - z * s, y * s + z * c];
  }
  return { x, y, z };
};

/** Screen position (px) of world point p under a camera and mode, and its scale k (screen px per world px). */
export const projectLens = (p: { x: number; y: number; z?: number }, cam: LensCam, mode: ZoomMode) => {
  if (mode === 'legacy') {
    // 2D scale first (z untouched), then the turn, then perspective `lens` (components/mid/geo.ts project()).
    const lens = cam.lens ?? DEFAULT_LENS;
    const q = rotate({ x: (p.x - cam.x) * cam.zoom, y: (p.y - cam.y) * cam.zoom, z: p.z ?? 0 }, cam);
    const k = lens / (lens - q.z);
    return { x: WIDTH / 2 + q.x * k, y: HEIGHT / 2 + q.y * k, k: k * cam.zoom, behind: q.z >= lens };
  }
  const { F, D } = optics(cam, mode);
  const q = rotate({ x: p.x - cam.x, y: p.y - cam.y, z: p.z ?? 0 }, cam);
  const k = F / (D - q.z);
  return { x: WIDTH / 2 + q.x * k, y: HEIGHT / 2 + q.y * k, k, behind: q.z >= D };
};

/** The camera centre that puts world point p at screen point s (as geo.ts aimTilted, for any mode). */
export const aimLens = (p: { x: number; y: number; z?: number }, s: { x: number; y: number }, cam: Omit<LensCam, 'x' | 'y'>, mode: ZoomMode): LensCam => {
  let c: LensCam = { x: p.x, y: p.y, ...cam };
  for (let i = 0; i < 40; i++) {
    const q = projectLens(p, c, mode);
    const dx = (s.x - q.x) / q.k;
    const dy = (s.y - q.y) / q.k;
    if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) break;
    c = { ...c, x: c.x - dx, y: c.y - dy };
  }
  return c;
};

/**
 * Screen y of the vanishing point of a world direction (a ray going away from the camera), or null if the direction
 * does not recede. Directions do not depend on the camera position, only on its turn (and, in legacy mode, the zoom).
 */
export const vanishingPoint = (dir: V3, cam: LensCam, mode: ZoomMode) => {
  const d = mode === 'legacy' ? { x: dir.x * cam.zoom, y: dir.y * cam.zoom, z: dir.z } : dir;
  const v = rotate(d, cam);
  if (v.z >= -1e-9) return null;
  const F = optics(cam, mode).F;
  return { x: WIDTH / 2 + (F * v.x) / -v.z, y: HEIGHT / 2 + (F * v.y) / -v.z };
};

/** The eye level: where a level floor (perpendicular to the upright UI planes) meets the sky, screen y at the centre. */
export const horizonY = (cam: LensCam, mode: ZoomMode) => vanishingPoint({ x: 0, y: 0, z: -1 }, cam, mode)?.y ?? null;

/**
 * Where a <Floor angle={a}> (brand/Studio: rotateX(a) about its near line) vanishes: its far direction is
 * (0, -cos a, -sin a). With a = 90 this is the eye level.
 */
export const floorVanishY = (cam: LensCam, mode: ZoomMode, angle = 78) =>
  vanishingPoint({ x: 0, y: -Math.cos(rad(angle)), z: -Math.sin(rad(angle)) }, cam, mode)?.y ?? null;

/** The floor's angle to the screen as the camera sees it (90 = edge-on). Legacy mode skews it by the zoom. */
export const floorAngleSeen = (cam: LensCam, mode: ZoomMode, angle = 78) => {
  const a = rad(angle);
  const dy = Math.cos(a) * (mode === 'legacy' ? cam.zoom : 1);
  const dz = Math.sin(a);
  return (Math.atan2(dz, dy) * 180) / Math.PI + cam.rx;
};

/** Keystone of a plane of width w (world px) centred on the look-at point at depth z: right edge height / left edge height. */
export const keystone = (cam: LensCam, mode: ZoomMode, w: number, h = 200, z = 0) => {
  const at = (x: number) => {
    const a = projectLens({ x: cam.x + x, y: cam.y - h / 2, z }, cam, mode);
    const b = projectLens({ x: cam.x + x, y: cam.y + h / 2, z }, cam, mode);
    return Math.hypot(b.x - a.x, b.y - a.y);
  };
  return at(w / 2) / at(-w / 2);
};

// ---- the World, lens-correct ---------------------------------------------------------------------------------------

type LensWorldProps = {
  cam: LensCam;
  mode?: ZoomMode;
  vel?: { vx: number; vy: number; zoomRate: number };
  noBlur?: boolean;
  background?: React.ReactNode;
  children: React.ReactNode;
};

const BLUR_THRESHOLD = 10;

/** lib/camera <World> with a physical camera. Same props, plus `mode` and the camera's `lens` / `dolly`. */
export const LensWorld: React.FC<LensWorldProps> = ({ cam, mode = 'lens', vel, noBlur, background, children }) => {
  const { F } = optics(cam, mode);
  const inner = (
    <AbsoluteFill style={{ perspective: `${F}px`, perspectiveOrigin: '50% 50%', overflow: 'hidden' }}>
      {background}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          transformOrigin: '0 0',
          transformStyle: 'preserve-3d',
          transform: lensTransform(cam, mode),
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
  if (noBlur || !vel) return inner;
  const speed = Math.hypot(vel.vx, vel.vy);
  const zoomSpeed = Math.abs(vel.zoomRate);
  const effects = [];
  if (speed > BLUR_THRESHOLD) {
    const radius = Math.min(48, (speed - BLUR_THRESHOLD) * 0.35);
    effects.push(blur({ radius, horizontal: Math.abs(vel.vx) >= Math.abs(vel.vy) * 0.5, vertical: Math.abs(vel.vy) >= Math.abs(vel.vx) * 0.5 }));
  }
  if (zoomSpeed > 0.05) effects.push(zoomBlur({ amount: Math.min(36, (zoomSpeed - 0.05) * 220), samples: 24 }));
  if (effects.length === 0) return inner;
  return (
    <HtmlInCanvas width={WIDTH} height={HEIGHT} effects={effects}>
      {inner}
    </HtmlInCanvas>
  );
};
