/**
 * Scene 13's laptop: a plain frame drawn by us (brand/Parts DeviceFrame, no maker's shape) with the real
 * capture `laptop-hello` (public/captures, src/data/captures.json) and a plain base under it, seen from the
 * front. Never `laptop-water` (its fifth candidate shows a brand name) and never the tablet.
 *
 * `dim` darkens the screen like a far plane (STYLE.md: darken first): the capture's own Speak and selected
 * candidate are ember, and the keycaps in front carry the shot's one ember thing.
 * If the capture is missing, a recreated screen (the sentence card on the app's ground) stands in.
 */
import React from 'react';
import { Img, staticFile } from 'remotion';
import { C } from '../../tokens';
import { DeviceFrame, SentenceCard } from '../brand/Parts';
import { capture } from './captures';
import decoded from '../../data/decoded.json';

const hello = decoded.sentences['hello-again'];
const CAP = capture('laptop-hello', { 'sentence-text': hello.text });

/** The capture's viewport is 1440 x 900 (16:10). */
export const LAPTOP_RATIO = 900 / 1440;

/** Outer size of the laptop (frame and base) for a screen width. */
export const laptopSize = (width: number) => {
  const bezel = Math.round(width * 0.018);
  const frameH = width * LAPTOP_RATIO + bezel * 2;
  const base = Math.round(width * 0.03);
  return { w: width + bezel * 2, h: frameH + base, frameH, base, bezel };
};

export const Laptop: React.FC<{ width: number; dim?: number }> = ({ width, dim = 0 }) => {
  const h = width * LAPTOP_RATIO;
  const L = laptopSize(width);
  return (
    <div style={{ position: 'relative', width: L.w, height: L.h }}>
      <DeviceFrame kind="laptop" screen={[width, h]}>
        {CAP ? (
          <Img src={staticFile(CAP.file)} style={{ position: 'absolute', left: 0, top: 0, width, height: h, display: 'block' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: C.ground, padding: width * 0.02, boxSizing: 'border-box' }}>
            <SentenceCard text={hello.text} digits={hello.codes.join('  ')} width={560} scale={width / 1440} />
          </div>
        )}
        {dim > 0 ? <div style={{ position: 'absolute', inset: 0, background: C.night, opacity: dim }} /> : null}
      </DeviceFrame>
      {/* The base: the deck's front edge, a little wider than the screen, lit along its top. */}
      <div
        style={{
          position: 'absolute',
          left: -L.w * 0.05,
          width: L.w * 1.1,
          top: L.frameH - 2,
          height: L.base,
          borderRadius: `${L.base * 0.3}px ${L.base * 0.3}px ${L.base}px ${L.base}px`,
          background: `linear-gradient(180deg, ${C.lineStrong} 0%, ${C.surface} 22%, ${C.surfaceSunken} 100%)`,
          boxShadow: '0 18px 40px rgba(8,4,20,0.55)',
        }}
      />
    </div>
  );
};
