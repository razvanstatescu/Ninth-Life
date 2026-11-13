/**
 * Camera helpers for the middle of Act 2, on top of lib/camera.
 */
import { Easing } from 'remotion';
import type { Cam } from '../../lib/camera';
import { HEIGHT, WIDTH } from '../../timeline';

/** Arriving at speed (the second half of a whip): fast start, soft landing, no overshoot. */
export const WHIP_IN = Easing.bezier(0.25, 0.75, 0.3, 1);

/**
 * Camera centre that puts world point `p` at screen point `s` with zoom `zoom` (no tilt). Use it to
 * zoom about a point (the point stays put) or to land a part exactly where another shot had it.
 */
export const aim = (p: { x: number; y: number }, s: { x: number; y: number }, zoom: number) => ({
  x: p.x - (s.x - WIDTH / 2) / zoom,
  y: p.y - (s.y - HEIGHT / 2) / zoom,
  zoom,
});

/** Where a world point lands on screen (no tilt). */
export const toScreen = (p: { x: number; y: number }, cam: { x: number; y: number; zoom: number }) => ({
  x: WIDTH / 2 + (p.x - cam.x) * cam.zoom,
  y: HEIGHT / 2 + (p.y - cam.y) * cam.zoom,
});

/** Picture speed of a camera function, in the shape <World vel> expects (as lib/camera cameraVelocity). */
export const velocityOf = (fn: (f: number) => Cam, frame: number) => {
  const a = fn(frame - 0.5);
  const b = fn(frame + 0.5);
  const z = (a.zoom + b.zoom) / 2;
  return { vx: (b.x - a.x) * z, vy: (b.y - a.y) * z, zoomRate: Math.log(b.zoom / a.zoom) };
};

/**
 * A zoom about a fixed point: between frames a and b the zoom goes z0 -> z1 (log space, eased) and
 * world point p stays at screen point s the whole time.
 */
export const zoomAbout = (frame: number, a: number, b: number, z0: number, z1: number, p: { x: number; y: number }, s: { x: number; y: number }, ease: (t: number) => number) => {
  const t = ease(Math.max(0, Math.min(1, (frame - a) / Math.max(1, b - a))));
  const zoom = Math.exp(Math.log(z0) + (Math.log(z1) - Math.log(z0)) * t);
  return aim(p, s, zoom);
};
