/**
 * Plate: one of Act 1's generated still pictures (public/img), framed by a slow camera, with
 * children positioned in the picture's own pixels (the boxes in src/data/plates.json).
 *
 *   <Plate id="img-01-keypad-lit" w={1920} h={1080} cx={1280} cy={640} zoom={1.03}>
 *     <div style={{ position: 'absolute', left: box[0], top: box[1], ... }} />   // plate px
 *   </Plate>
 *
 * zoom 1 = the picture just covers the view; cx/cy = the picture point at the view's centre.
 */
import React from 'react';
import { Img, staticFile } from 'remotion';
import plates from '../../data/plates.json';

export type PlateId =
  | 'img-01-keypad-lit'
  | 'img-02-keypad-dark'
  | 'img-03-worn-key'
  | 'img-04-screen-empty'
  | 'img-06-phone-lit'
  | 'img-07-phone-dusty';

export type Box = [number, number, number, number];
export type KeyName = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'star' | '0' | 'hash';
export const KEY_ORDER: KeyName[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'star', '0', 'hash'];
export const KEY_ROWS: KeyName[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['star', '0', 'hash'],
];

type PlateInfo = { width: number; height: number; keys?: Record<string, number[]>; display?: number[]; face?: number[] };
const P = plates as unknown as Record<string, PlateInfo>;

export const plateInfo = (id: PlateId) => {
  const p = P[id];
  if (!p) throw new Error(`plates.json has no ${id}`);
  return p;
};
export const keyBox = (id: PlateId, k: KeyName): Box => plateInfo(id).keys![k] as Box;
export const displayBox = (id: PlateId): Box => plateInfo(id).display as Box;
export const plateSrc = (id: PlateId) => staticFile(`img/${id}.png`);

/** Scale and offset that put plate point (cx, cy) at the centre of a w x h view. */
export const plateTransform = (id: PlateId, w: number, h: number, cx?: number, cy?: number, zoom = 1) => {
  const p = plateInfo(id);
  const s = Math.max(w / p.width, h / p.height) * zoom;
  const px = cx ?? p.width / 2;
  const py = cy ?? p.height / 2;
  return { s, tx: w / 2 - px * s, ty: h / 2 - py * s, pw: p.width, ph: p.height };
};

/** Map a plate point to view coordinates for a given framing. */
export const toView = (t: ReturnType<typeof plateTransform>, x: number, y: number) => ({ x: t.tx + x * t.s, y: t.ty + y * t.s });

export const Plate: React.FC<{
  id: PlateId;
  w: number;
  h: number;
  cx?: number;
  cy?: number;
  zoom?: number;
  /** CSS filter on the picture only (not the children). */
  filter?: string;
  opacity?: number;
  /**
   * For zoom < 1 (a wider view than the picture allows): fill the view behind the picture with a
   * blurred, darker copy of it, and feather the picture's edges into it.
   */
  extend?: boolean;
  children?: React.ReactNode;
}> = ({ id, w, h, cx, cy, zoom = 1, filter, opacity = 1, extend = false, children }) => {
  const t = plateTransform(id, w, h, cx, cy, zoom);
  const f = 90; // feather, plate px
  const edgeMask = `linear-gradient(to right, transparent 0px, black ${f}px, black ${t.pw - f}px, transparent ${t.pw}px), linear-gradient(to bottom, transparent 0px, black ${f}px, black ${t.ph - f}px, transparent ${t.ph}px)`;
  const cover = plateTransform(id, w, h, undefined, undefined, 1.08);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, overflow: 'hidden' }}>
      {extend ? (
        <Img
          src={plateSrc(id)}
          style={{
            position: 'absolute',
            left: cover.tx,
            top: cover.ty,
            width: cover.pw * cover.s,
            height: cover.ph * cover.s,
            filter: 'blur(18px) brightness(0.62)',
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: t.pw,
          height: t.ph,
          transformOrigin: '0 0',
          transform: `translate(${t.tx}px, ${t.ty}px) scale(${t.s})`,
        }}
      >
        <Img
          src={plateSrc(id)}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: t.pw,
            height: t.ph,
            filter,
            opacity,
            ...(extend ? { maskImage: edgeMask, WebkitMaskImage: edgeMask, maskComposite: 'intersect', WebkitMaskComposite: 'source-in' } : {}),
          }}
        />
        {children}
      </div>
    </div>
  );
};
