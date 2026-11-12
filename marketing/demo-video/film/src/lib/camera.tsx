/**
 * Act 2's camera. A scene lays its parts out on a large flat "world" (world coordinates in px, origin
 * at the centre of the scene's layout) and the camera looks at a world point with a zoom and an
 * optional tilt. Scenes change by moving, not by fading (02-creative-direction.md, section 5).
 *
 *   const cam = useCamera([
 *     { f: 0, x: 0, y: 0, zoom: 1 },
 *     { f: atIn('s07', 3, 1), x: 0, y: 0, zoom: 1 },            // hold until bar 3
 *     { f: atIn('s07', 3, 1) + 10, x: 220, y: 140, zoom: 2.4 },  // 10-frame move
 *   ]);
 *   return <World cam={cam}> <At x={0} y={0}><Keypad .../></At> </World>;
 *
 * Rules: a move takes 8 to 14 frames, then the picture holds still at least half a second. Ease is
 * EASE.camera unless a key says otherwise. Zoom is interpolated in log space so it feels even.
 * <World> blurs the picture in the direction of travel while the camera moves fast (above `blurAbove`, default 10 px a
 * frame; <Studio> uses 40, whips only).
 *
 * The camera is physical (research-v2/16-spatial-tech.md, STYLE.md "Spatial rules"): it looks at (x, y, 0) from a
 * distance D with a focal length F. `zoom` is always the magnification of the z = 0 plane (screen px per world px).
 *   lens      focal length in px at zoom 1 (CSS perspective). Default 2400 (about 45 mm on 1920 px); UI close-ups
 *             use a long lens, 3600-5400 (about 70-100 mm)
 *   zoomMode  'dolly' (default): zoom moves the camera (F = lens, D = lens / zoom). Every z = 0 pixel is the picture
 *             the World has always drawn. 'lens': zoom changes the focal length (F = lens x zoom, D = lens), so the
 *             perspective stays put as the camera pushes in: an optical zoom
 *   dolly     world px the camera has moved towards (x, y, 0) on top of that (a real dolly: things get bigger)
 *   eye       screen y of the eye level (CSS perspective-origin, a lens shift). Default 540, the frame centre. With
 *             no pitch (rx 0), a level floor vanishes exactly here, so raise the eye (200-320) to see the floor
 *             instead of pitching the camera down
 * In CSS: `perspective: F; perspective-origin: 50% eye`, then
 *   translate(centre) rotateX(rx) rotateY(ry) rotateZ(rz) scale3d(s, s, s) translate(-x, -y), s = F / D.
 */
import React from 'react';
import { AbsoluteFill, HtmlInCanvas, useCurrentFrame } from 'remotion';
import { blur } from '@remotion/effects/blur';
import { zoomBlur } from '@remotion/effects/zoom-blur';
import { EASE } from './anim';
import { HEIGHT, WIDTH } from '../timeline';

export type ZoomMode = 'dolly' | 'lens';
export type Cam = {
  x: number;
  y: number;
  zoom: number;
  rx: number;
  ry: number;
  rz: number;
  /** Focal length in px at zoom 1. Default 2400. */
  lens?: number;
  /** How `zoom` is made: 'dolly' (default, the camera moves) or 'lens' (the focal length changes). */
  zoomMode?: ZoomMode;
  /** World px the camera moves towards the look-at point on top of the zoom. Default 0. */
  dolly?: number;
  /** Screen y of the eye level (perspective-origin). Default 540. */
  eye?: number;
};
export type CamKey = Partial<Cam> & { f: number; ease?: (t: number) => number };

export const DEFAULT_LENS = 2400;
const DEFAULT: Cam = { x: 0, y: 0, zoom: 1, rx: 0, ry: 0, rz: 0 };
const rad = (d: number) => (d * Math.PI) / 180;

/** True when a camera uses none of the lens options: it is drawn exactly as the World always drew it. */
const isPlain = (c: Cam) => (c.lens === undefined || c.lens === DEFAULT_LENS) && (c.zoomMode ?? 'dolly') === 'dolly' && !c.dolly && (c.eye === undefined || c.eye === HEIGHT / 2);

/**
 * The camera's optics: focal length F (the CSS perspective, px), distance D from the look-at point (world px), and
 * s = F / D, the magnification of the z = 0 plane (equal to `zoom` unless `dolly` is set).
 */
export const optics = (cam: Cam) => {
  const lens = cam.lens ?? DEFAULT_LENS;
  const dolly = cam.dolly ?? 0;
  if ((cam.zoomMode ?? 'dolly') === 'dolly') {
    if (!dolly) return { F: lens, D: lens / cam.zoom, s: cam.zoom };
    const D = Math.max(1, lens / cam.zoom - dolly);
    return { F: lens, D, s: lens / D };
  }
  const D = Math.max(1, lens - dolly);
  const F = lens * cam.zoom;
  return { F, D, s: F / D };
};

/** Screen px per world px at the look-at point (the z = 0 plane). */
export const magnification = (cam: Cam) => optics(cam).s;

function resolveKeys(keys: CamKey[]): (Cam & { f: number; ease?: (t: number) => number })[] {
  // Missing fields carry over from the previous key.
  let prev: Cam = DEFAULT;
  return keys.map((k) => {
    const c: Cam = {
      x: k.x ?? prev.x,
      y: k.y ?? prev.y,
      zoom: k.zoom ?? prev.zoom,
      rx: k.rx ?? prev.rx,
      ry: k.ry ?? prev.ry,
      rz: k.rz ?? prev.rz,
      lens: k.lens ?? prev.lens,
      zoomMode: k.zoomMode ?? prev.zoomMode,
      dolly: k.dolly ?? prev.dolly,
      eye: k.eye ?? prev.eye,
    };
    prev = c;
    return { ...c, f: k.f, ease: k.ease };
  });
}

const strip = (c: Cam & { f?: number; ease?: unknown }): Cam => {
  const { f: _f, ease: _e, ...rest } = c;
  return rest;
};

/** Camera state at a (possibly fractional) frame. */
export function cameraAt(frame: number, keys: CamKey[]): Cam {
  const ks = resolveKeys(keys);
  if (ks.length === 0) return DEFAULT;
  if (frame <= ks[0]!.f) return strip(ks[0]!);
  for (let i = 1; i < ks.length; i++) {
    const b = ks[i]!;
    if (frame <= b.f) {
      const a = ks[i - 1]!;
      const t = b.f === a.f ? 1 : (b.ease ?? EASE.camera)((frame - a.f) / (b.f - a.f));
      const lerp = (p: number, q: number) => p + (q - p) * t;
      const base = { x: lerp(a.x, b.x), y: lerp(a.y, b.y), rx: lerp(a.rx, b.rx), ry: lerp(a.ry, b.ry), rz: lerp(a.rz, b.rz) };
      const same = a.lens === b.lens && a.zoomMode === b.zoomMode && (a.dolly ?? 0) === (b.dolly ?? 0) && a.eye === b.eye;
      if (same && !a.dolly) {
        // The plain case (and any segment that keeps its lens): zoom in log space, the lens options carried as they are.
        return { ...base, zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom))), lens: a.lens, zoomMode: a.zoomMode, dolly: a.dolly, eye: a.eye };
      }
      // Anything else (a lens change, a dolly, a switch of zoom mode): interpolate the optics themselves, F and D in log
      // space, so the move is continuous; express the result as a camera with no dolly.
      const oa = optics(a);
      const ob = optics(b);
      const F = Math.exp(lerp(Math.log(oa.F), Math.log(ob.F)));
      const D = Math.exp(lerp(Math.log(oa.D), Math.log(ob.D)));
      const eye = a.eye === undefined && b.eye === undefined ? undefined : lerp(a.eye ?? HEIGHT / 2, b.eye ?? HEIGHT / 2);
      return oa.F === ob.F ? { ...base, zoom: F / D, lens: F, zoomMode: 'dolly', eye } : { ...base, zoom: F / D, lens: D, zoomMode: 'lens', eye };
    }
  }
  return strip(ks[ks.length - 1]!);
}

/** Screen-space speed of the picture at a frame: px per frame along x and y, and zoom rate. */
export function cameraVelocity(frame: number, keys: CamKey[]) {
  const a = cameraAt(frame - 0.5, keys);
  const b = cameraAt(frame + 0.5, keys);
  const ma = isPlain(a) ? a.zoom : magnification(a);
  const mb = isPlain(b) ? b.zoom : magnification(b);
  const z = (ma + mb) / 2;
  return { vx: (b.x - a.x) * z, vy: (b.y - a.y) * z, zoomRate: Math.log(mb / ma) };
}

export const useCamera = (keys: CamKey[]) => {
  const frame = useCurrentFrame();
  return { cam: cameraAt(frame, keys), vel: cameraVelocity(frame, keys) };
};

/**
 * The CSS transform that puts world point (cam.x, cam.y) at the centre of the frame. The zoom is a UNIFORM 3D scale
 * (research-v2/16-spatial-tech.md): for everything at z = 0 it is the same picture as the old 2D `scale(zoom)` (a
 * camera at 2400 / zoom), and depth now scales with x and y, so the floor no longer swings with the zoom and
 * translateZ layers and thickness keep their proportions. Use with `perspective: optics(cam).F`.
 */
export const worldTransform = (cam: Cam) => {
  const s = isPlain(cam) ? cam.zoom : optics(cam).s;
  return `translate(${WIDTH / 2}px, ${HEIGHT / 2}px) rotateX(${cam.rx}deg) rotateY(${cam.ry}deg) rotateZ(${cam.rz}deg) scale3d(${s}, ${s}, ${s}) translate(${-cam.x}px, ${-cam.y}px)`;
};

/** The CSS perspective and perspective-origin for a camera. */
export const perspectiveStyle = (cam: Cam): React.CSSProperties => ({
  perspective: `${optics(cam).F}px`,
  perspectiveOrigin: cam.eye === undefined ? '50% 50%' : `50% ${cam.eye}px`,
});

type V3 = { x: number; y: number; z: number };
/** rotateZ, then rotateY, then rotateX: the CSS order of `rotateX() rotateY() rotateZ()` applied to a point. */
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

/**
 * Where world point p (z towards the viewer) lands on screen under a camera: { x, y } in px, `k` the perspective factor
 * against the z = 0 plane (as components/mid/geo.ts), `scale` screen px per world px at that point, `behind` when the
 * point is behind the eye. The same maths as the <World> CSS.
 */
export const project = (p: { x: number; y: number; z?: number }, cam: Cam) => {
  const { F, s } = optics(cam);
  const q = rotate({ x: (p.x - cam.x) * s, y: (p.y - cam.y) * s, z: (p.z ?? 0) * s }, cam);
  const k = F / (F - q.z);
  const eye = cam.eye ?? HEIGHT / 2;
  return { x: WIDTH / 2 + q.x * k, y: eye + (HEIGHT / 2 + q.y - eye) * k, k, scale: s * k, behind: q.z >= F };
};

/** The camera centre (x, y) that puts world point p at screen point `at`, for a given zoom, turn and lens (solved). */
export const aim = (p: { x: number; y: number; z?: number }, at: { x: number; y: number }, cam: Omit<Cam, 'x' | 'y'>): Cam => {
  let c: Cam = { x: p.x, y: p.y, ...cam };
  for (let i = 0; i < 40; i++) {
    const q = project(p, c);
    const dx = (at.x - q.x) / q.scale;
    const dy = (at.y - q.y) / q.scale;
    if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) break;
    c = { ...c, x: c.x - dx, y: c.y - dy };
  }
  return c;
};

/**
 * Screen y of the eye level: where a level floor (perpendicular to the UI planes) meets the sky. Null when the camera
 * looks so far down that there is no horizon in front of it. Put a haze band here; with rx 0 it is `cam.eye`.
 */
export const horizonY = (cam: Cam) => {
  const v = rotate({ x: 0, y: 0, z: -1 }, cam);
  if (v.z >= -1e-9) return null;
  return (cam.eye ?? HEIGHT / 2) + (optics(cam).F * v.y) / -v.z;
};

/**
 * Depth of field: the circle of confusion (screen px) of a plane at depth z (world px, towards the viewer) when the
 * plane at `focusZ` is sharp and the lens has an aperture of `aperture` world px. Darken first, blur second.
 */
export const cocAt = (z: number, cam: Cam, focus: { focusZ?: number; aperture: number }) => {
  const { F, D } = optics(cam);
  return focus.aperture * F * Math.abs(1 / Math.max(1, D - (focus.focusZ ?? 0)) - 1 / Math.max(1, D - z));
};

/**
 * px per frame above which <World> blurs the picture: 10, as it always has (the default keeps every existing scene
 * exactly as rendered). research-v2/15 asks for blur on whips only (text smeared under narration at 10 px a frame):
 * pass `blurAbove={WHIP_BLUR_ABOVE}`, which lib/stage <Studio> does by default.
 *
 * History: with 40, sequence renders of the old s12 opening stalled Chromium (its floors reached behind the camera).
 * The rebuilt s12 has no geometry behind the eye and renders a full sequence at 40 (mid builder, 2026-11-11), so 40
 * is now the default for the whole film: only whips blur, and text no longer smears under narration.
 */
export const DEFAULT_BLUR_ABOVE = 40;
export const WHIP_BLUR_ABOVE = 40;

type Vel = { vx: number; vy: number; zoomRate: number };

/** True when the picture must be drawn through the blur canvas at this speed. */
export const needsCanvas = (vel?: Vel, blurAbove = DEFAULT_BLUR_ABOVE) => !!vel && (Math.hypot(vel.vx, vel.vy) > blurAbove || Math.abs(vel.zoomRate) > 0.05);

/**
 * The motion-blur effects for a picture speed: a directional blur above `blurAbove` px a frame, plus a zoom blur on
 * fast zooms. Used by <World> and lib/stage <Studio>.
 */
export const motionEffects = (vel?: Vel, blurAbove = DEFAULT_BLUR_ABOVE) => {
  if (!vel) return [];
  const speed = Math.hypot(vel.vx, vel.vy);
  const zoomSpeed = Math.abs(vel.zoomRate);
  const effects = [];
  if (speed > blurAbove) {
    const radius = Math.min(48, (speed - blurAbove) * 0.35);
    const horizontal = Math.abs(vel.vx) >= Math.abs(vel.vy) * 0.5;
    const vertical = Math.abs(vel.vy) >= Math.abs(vel.vx) * 0.5;
    effects.push(blur({ radius, horizontal, vertical }));
  }
  if (zoomSpeed > 0.05) {
    effects.push(zoomBlur({ amount: Math.min(36, (zoomSpeed - 0.05) * 220), samples: 24 }));
  }
  return effects;
};

type WorldProps = {
  cam: Cam;
  /** From useCamera(); enables motion blur while the camera moves fast. */
  vel?: { vx: number; vy: number; zoomRate: number };
  /** px per frame above which the picture blurs (default 10; WHIP_BLUR_ABOVE = 40 for whips only). */
  blurAbove?: number;
  /** Perspective distance in px, when the camera has no `lens` (the old way to set the lens). */
  perspective?: number;
  /** Turn automatic motion blur off. */
  noBlur?: boolean;
  /** Extra effects to apply to the whole world picture (forces canvas rendering). */
  children: React.ReactNode;
  background?: React.ReactNode;
};

/** The world's 3D context: the perspective container and the camera's transform, no motion blur. */
export const WorldLayer: React.FC<{ cam: Cam; children: React.ReactNode; background?: React.ReactNode }> = ({ cam, children, background }) => (
  <AbsoluteFill style={{ ...perspectiveStyle(cam), overflow: 'hidden' }}>
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
        transform: worldTransform(cam),
      }}
    >
      {children}
    </div>
  </AbsoluteFill>
);

export const World: React.FC<WorldProps> = ({ cam, vel, blurAbove = DEFAULT_BLUR_ABOVE, perspective, noBlur, children, background }) => {
  const c = perspective !== undefined && cam.lens === undefined ? { ...cam, lens: perspective } : cam;
  const inner = (
    <WorldLayer cam={c} background={background}>
      {children}
    </WorldLayer>
  );
  if (noBlur || !needsCanvas(vel, blurAbove)) return inner;
  return (
    <HtmlInCanvas width={WIDTH} height={HEIGHT} effects={motionEffects(vel, blurAbove)}>
      {inner}
    </HtmlInCanvas>
  );
};

/** Places its children centred on world point (x, y). Use inside <World>. */
export const At: React.FC<{ x: number; y: number; z?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  x,
  y,
  z = 0,
  children,
  style,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      transform: `translate(-50%, -50%) translateZ(${z}px)`,
      transformStyle: 'preserve-3d',
      ...style,
    }}
  >
    {children}
  </div>
);
