/**
 * The real-app reel (s12b, third cut 2026-11-19): pieces of real captures moved in a plane, a camera over that plane,
 * and a pointer that clicks what the app reacts to. 08-revision-v3.md, "The real-app reel".
 *
 * Units: a plane's px are the app's CSS px (laptop 1440 x 900, phone 390 x 700). A capture box from captures.json is
 * in IMAGE px (CSS px x dpr), so every box is divided by the capture's dpr here. The captures are 4x (laptop) and 3x
 * (phone), so the camera can push in up to 4x (3x) before an image is shown larger than it was shot.
 *
 * Recipes (the researcher's report, 2026-11-19): lift and re-seat (cut a real screen into its own blocks, fly them in
 * depth, put them back on the beat); swap only the boxes that changed (the app changes state in one step, so no
 * cross-dissolves between states); a pointer that clicks on eighths, so each change has a visible cause.
 */
import React from 'react';
import { Img } from 'remotion';
import { C } from '../../tokens';
import { EASE, mix, ramp } from '../../lib/anim';
import { getCapture, type Capture } from '../mid/capture';

export type Rect = { x: number; y: number; w: number; h: number };

/** A capture, or throws: the reel has no recreated fallback (it exists to show the real app). */
export const cap = (id: string): Capture => {
  const c = getCapture(id);
  if (!c) throw new Error(`s12b needs the capture "${id}" (node scripts/capture/capture.mjs convo show-water)`);
  return c;
};

/** A box of a capture in its plane's px (CSS px). */
export const box = (c: Capture, name: string): Rect => {
  const b = c.boxes[name];
  if (!b) throw new Error(`capture ${c.file} has no box "${name}"`);
  return { x: b[0] / c.dpr, y: b[1] / c.dpr, w: b[2] / c.dpr, h: b[3] / c.dpr };
};

export const centre = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** The plane size of a capture (CSS px). */
export const planeOf = (c: Capture) => ({ w: c.width / c.dpr, h: c.height / c.dpr });

/**
 * One piece of a real capture: the region `src` of capture `c`, drawn at `at` (default: where it was). `h` clips the
 * visible height (a panel growing), `z` lifts it off the plane, `dim` darkens it towards night (objects recede by
 * darkening, never by transparency). A flat leaf: safe inside a preserve-3d parent.
 */
export const Tile: React.FC<{
  c: Capture;
  src: Rect;
  at?: { x: number; y: number };
  h?: number;
  z?: number;
  dim?: number;
  radius?: number;
  opacity?: number;
  rotate?: number;
  clipRight?: number;
}> = ({ c, src, at, h, z = 0, dim = 0, radius = 0, opacity = 1, rotate = 0, clipRight }) => {
  const p = planeOf(c);
  const x = at?.x ?? src.x;
  const y = at?.y ?? src.y;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: src.w,
        height: h ?? src.h,
        overflow: 'hidden',
        borderRadius: radius,
        transform: `translateZ(${z}px)${rotate ? ` rotate(${rotate}deg)` : ''}`,
        opacity,
        clipPath: clipRight !== undefined ? `inset(0 ${(1 - clipRight) * 100}% 0 0)` : undefined,
      }}
    >
      <Img src={c.src} style={{ position: 'absolute', left: -src.x, top: -src.y, width: p.w, height: p.h, maxWidth: 'none', display: 'block' }} />
      {dim > 0 ? <div style={{ position: 'absolute', inset: 0, background: C.night, opacity: Math.min(1, dim) }} /> : null}
    </div>
  );
};

/** A camera over a plane: the plane point (x, y) at the frame's centre, z screen px per plane px, a small yaw. */
export type PlaneCam = { x: number; y: number; z: number; ry?: number; rx?: number };
type Key = { f: number; cam: PlaneCam; ease?: (t: number) => number };

/** The camera at `frame`, each key reached with its own easing (EASE.camera by default). */
export const camAt = (frame: number, keys: Key[]): PlaneCam => {
  if (frame <= keys[0]!.f) return keys[0]!.cam;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i]!;
    const p = keys[i - 1]!;
    if (frame <= k.f) {
      const t = (k.ease ?? EASE.camera)((frame - p.f) / Math.max(1, k.f - p.f));
      // Zoom is interpolated in log space so a push feels even.
      const z = Math.exp(mix(Math.log(p.cam.z), Math.log(k.cam.z), t));
      return { x: mix(p.cam.x, k.cam.x, t), y: mix(p.cam.y, k.cam.y, t), z, ry: mix(p.cam.ry ?? 0, k.cam.ry ?? 0, t), rx: mix(p.cam.rx ?? 0, k.cam.rx ?? 0, t) };
    }
  }
  return keys[keys.length - 1]!.cam;
};

/** The plane under the camera. Children are positioned in plane px. */
export const PlaneView: React.FC<{ cam: PlaneCam; blur?: number; children: React.ReactNode }> = ({ cam, blur = 0, children }) => (
  <div style={{ position: 'absolute', inset: 0, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
    <div style={{ position: 'absolute', inset: 0, perspective: '2400px', perspectiveOrigin: '50% 50%' }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformStyle: 'preserve-3d',
          transformOrigin: '0 0',
          transform: `translate(960px, 540px) rotateX(${cam.rx ?? 0}deg) rotateY(${cam.ry ?? 0}deg) scale(${cam.z}) translate(${-cam.x}px, ${-cam.y}px)`,
        }}
      >
        {children}
      </div>
    </div>
  </div>
);

/** Plane -> screen for a flat camera (no yaw): where a plane point lands in the 1920 x 1080 frame. */
export const toScreen = (cam: PlaneCam, p: { x: number; y: number }) => ({ x: 960 + (p.x - cam.x) * cam.z, y: 540 + (p.y - cam.y) * cam.z });

/** A pointer of our own (a plain arrow, no system's shape), in plane px; it dips on a click. */
export const Pointer: React.FC<{ x: number; y: number; size?: number; click?: number; opacity?: number }> = ({ x, y, size = 26, click = 0, opacity = 1 }) => {
  const s = size / 26;
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translateZ(2px) scale(${s * (1 - 0.12 * click)})`, transformOrigin: '0 0', opacity }}>
      {click > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: -18,
            top: -18,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: `3px solid rgba(238,232,255,${0.9 * click})`,
            background: `rgba(238,232,255,${0.18 * click})`,
            transform: `scale(${1.25 - 0.25 * click})`,
          }}
        />
      ) : null}
      <svg width={26} height={34} viewBox="0 0 26 34" style={{ position: 'absolute', left: -2, top: -2, overflow: 'visible' }}>
        <path d="M2 2 L2 27 L8.5 21 L13 31.5 L17.5 29.5 L13 19.5 L22 19.5 Z" fill={C.moon} stroke={C.night} strokeWidth={2.2} strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/** Where a pointer is at `frame`, moving between waypoints on eased curves; `click` is 0..1 around each click frame. */
export type Way = { f: number; x: number; y: number; click?: boolean };
export const pointerAt = (frame: number, ways: Way[]) => {
  let x = ways[0]!.x;
  let y = ways[0]!.y;
  for (let i = 1; i < ways.length; i++) {
    const a = ways[i - 1]!;
    const b = ways[i]!;
    if (frame >= b.f) {
      x = b.x;
      y = b.y;
      continue;
    }
    if (frame > a.f) {
      // Each move takes at most 18 frames and ends on its waypoint's frame.
      const start = Math.max(a.f, b.f - 18);
      const t = ramp(frame, start, b.f - start, 0, 1, EASE.inOut);
      x = mix(a.x, b.x, t);
      y = mix(a.y, b.y, t);
    }
    break;
  }
  let click = 0;
  for (const w of ways) if (w.click) click = Math.max(click, frame < w.f + 2 ? 0 : ramp(frame, w.f + 2, 3, 0, 1, EASE.out) * ramp(frame, w.f + 8, 8, 1, 0, EASE.out));
  return { x, y, click };
};
