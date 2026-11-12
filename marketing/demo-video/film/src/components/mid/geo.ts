/**
 * Geometry for the middle of Act 2 (s10 to s12), second cut.
 *
 * project() reproduces the CSS 3D maths of lib/camera's <World> (perspective 2400 px with its origin at
 * the frame centre; world transform `translate(W/2, H/2) rotateX(rx) rotateY(ry) rotateZ(rz) scale(zoom)
 * translate(-x, -y)`), so a scene can say where a world point lands on screen, to place supers beside UI
 * and to state the fold landing (handoff.ts FOLD_LANDING) in screen px.
 */
import type { Cam } from '../../lib/camera';
import { HEIGHT, WIDTH } from '../../timeline';

export const PERSPECTIVE = 2400;

const rad = (d: number) => (d * Math.PI) / 180;

/** Screen position (px) of world point p (z towards the viewer) under camera `cam`, and its scale. */
export const project = (p: { x: number; y: number; z?: number }, cam: Cam, perspective = PERSPECTIVE) => {
  // translate(-x, -y), then scale (3D since 2026-11-11, lib/camera: z scales too)
  let x = (p.x - cam.x) * cam.zoom;
  let y = (p.y - cam.y) * cam.zoom;
  let z = (p.z ?? 0) * cam.zoom;
  // rotateZ
  {
    const c = Math.cos(rad(cam.rz));
    const s = Math.sin(rad(cam.rz));
    [x, y] = [x * c - y * s, x * s + y * c];
  }
  // rotateY (CSS: x' = x cos + z sin, z' = -x sin + z cos)
  {
    const c = Math.cos(rad(cam.ry));
    const s = Math.sin(rad(cam.ry));
    [x, z] = [x * c + z * s, -x * s + z * c];
  }
  // rotateX (CSS: y' = y cos - z sin, z' = y sin + z cos)
  {
    const c = Math.cos(rad(cam.rx));
    const s = Math.sin(rad(cam.rx));
    [y, z] = [y * c - z * s, y * s + z * c];
  }
  const k = perspective / (perspective - z);
  return { x: WIDTH / 2 + x * k, y: HEIGHT / 2 + y * k, k };
};

/** The camera centre (x, y) that puts world point p at screen point s, for a given zoom and tilt (solved). */
export const aimTilted = (p: { x: number; y: number }, s: { x: number; y: number }, cam: Omit<Cam, 'x' | 'y'>) => {
  let c: Cam = { x: p.x, y: p.y, ...cam };
  for (let i = 0; i < 30; i++) {
    const q = project(p, c);
    const dx = (s.x - q.x) / (cam.zoom * q.k);
    const dy = (s.y - q.y) / (cam.zoom * q.k);
    if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) break;
    c = { ...c, x: c.x - dx, y: c.y - dy };
  }
  return c;
};
