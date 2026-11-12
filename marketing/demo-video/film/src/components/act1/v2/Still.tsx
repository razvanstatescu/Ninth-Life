/**
 * One of the second cut's stills, framed by a slow camera, with its lit edit crossfaded in by `lit` (the
 * phone's backlights: lit minus unlit is the light, so a crossfade is the light switching on). Children are
 * placed in the still's own pixels (plates.ts), so measured quads can be used as they are.
 *
 *   <Still plate="p5" w={1920} h={1080} zoom={1.07} lit={backlight}>{(p) => <LcdOnQuad quad={p.active!} .../>}</Still>
 *
 * zoom 1 = the still just covers the view; cx/cy = the still's point at the view's centre.
 */
import React from 'react';
import { Img, staticFile } from 'remotion';
import { plate, type PlateId, type PlateInfo } from './plates';

export const stillScale = (p: PlateInfo, w: number, h: number, zoom = 1) => Math.max(w / p.width, h / p.height) * zoom;

export const Still: React.FC<{
  plate: PlateId;
  w: number;
  h: number;
  zoom?: number;
  cx?: number;
  cy?: number;
  /** 0..1: the lit edit over the still. */
  lit?: number;
  /** Multiplies the still (0..1): moonlight dimming, the act's grade. */
  light?: number;
  /** Depth of field drawn by the film: the still blurred by `px`, fading in from still-y `y0` to `y1`. */
  dof?: { y0: number; y1: number; px: number };
  children?: React.ReactNode | ((p: PlateInfo) => React.ReactNode);
}> = ({ plate: id, w, h, zoom = 1, cx, cy, lit = 0, light = 1, dof, children }) => {
  const p = plate(id);
  const s = stillScale(p, w, h, zoom);
  // The camera centre is kept where the still still covers the whole view (no black edges).
  const clampC = (v: number, view: number, size: number) => Math.min(Math.max(v, view / (2 * s)), size - view / (2 * s));
  const px = clampC(cx ?? p.width / 2, w, p.width);
  const py = clampC(cy ?? p.height / 2, h, p.height);
  const tx = w / 2 - px * s;
  const ty = h / 2 - py * s;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, overflow: 'hidden', background: '#050407' }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: p.width,
          height: p.height,
          transformOrigin: '0 0',
          transform: `translate(${tx}px, ${ty}px) scale(${s})`,
        }}
      >
        <Img src={staticFile(p.src)} style={{ position: 'absolute', left: 0, top: 0, width: p.width, height: p.height }} />
        {p.lit && lit > 0 ? (
          <Img
            src={staticFile(p.lit)}
            style={{ position: 'absolute', left: -p.litShift[0], top: -p.litShift[1], width: p.width, height: p.height, opacity: Math.min(1, lit) }}
          />
        ) : null}
        {dof ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: p.width,
              height: p.height,
              filter: `blur(${dof.px}px)`,
              maskImage: `linear-gradient(to bottom, transparent ${dof.y0}px, black ${dof.y1}px)`,
              WebkitMaskImage: `linear-gradient(to bottom, transparent ${dof.y0}px, black ${dof.y1}px)`,
            }}
          >
            <Img src={staticFile(p.src)} style={{ position: 'absolute', left: 0, top: 0, width: p.width, height: p.height }} />
            {p.lit && lit > 0 ? (
              <Img
                src={staticFile(p.lit)}
                style={{ position: 'absolute', left: -p.litShift[0], top: -p.litShift[1], width: p.width, height: p.height, opacity: Math.min(1, lit) }}
              />
            ) : null}
          </div>
        ) : null}
        {typeof children === 'function' ? children(p) : children}
        {light < 1 ? <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: 1 - Math.max(0, light) }} /> : null}
      </div>
    </div>
  );
};
