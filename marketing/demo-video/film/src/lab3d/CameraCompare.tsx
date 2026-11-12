/**
 * Spatial lab, option (a): today's <World> (mode 'legacy') against the lens-correct camera ('dolly', 'lens') on the
 * SAME content: the brand keypad with its thickness, today's 78-degree <Floor>, a word stack in depth (z -400, as s10's
 * alternatives), a chip in front (z +160) and a phone-like slab with thickness plates (as Phone3D).
 *
 * Frames 0 / 60 / 120 hold zoom 1 / 1.8 / 3 with the same turn (rx -8, ry -14): the keypad's centre stays on the same
 * pixel at the same size in every mode, so only the depth behaviour differs. Overlays: the eye level (dashed moon) and
 * where the floor actually vanishes (dashed pink), with the numbers.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, FONT } from '../tokens';
import { At } from '../lib/camera';
import { Keypad, keypadLayout } from '../components/brand/Keypad';
import { ContactGlow, Floor, StudioGround } from '../components/brand/Studio';
import { LensWorld, aimLens, floorAngleSeen, floorVanishY, horizonY, keystone, type LensCam, type ZoomMode } from './lens';

const SIZE = 120;
const PAD = keypadLayout(SIZE);
const FLOOR_Y = PAD.height / 2 + 14;
const ZOOMS = [1, 1.8, 3];

export const CameraCompare: React.FC<{ mode: ZoomMode }> = ({ mode }) => {
  const frame = useCurrentFrame();
  const zoom = ZOOMS[Math.min(2, Math.floor(frame / 60))]!;
  // Aim at the keypad's upper right keys so the depth layers stay in frame as the zoom grows.
  const focus = { x: 90, y: -60 };
  const cam: LensCam = aimLens(focus, { x: 900, y: 560 }, { zoom, rx: -8, ry: -14, rz: 0, lens: 2400 }, mode);
  const eye = horizonY(cam, mode);
  const fv = floorVanishY(cam, mode, 78);
  const ks = keystone(cam, mode, PAD.width);
  const seen = floorAngleSeen(cam, mode, 78);
  return (
    <AbsoluteFill>
      <StudioGround glow={{ x: 40, y: 42, r: 72, strength: 1 }} horizon={62} />
      <LensWorld cam={cam} mode={mode} noBlur>
        <Floor y={FLOOR_Y} />
        <ContactGlow x={0} y={FLOOR_Y + 4} w={PAD.width * 1.3} />
        {/* the word stack behind (s10's alternatives at -150 per step) */}
        {['wave', 'wavy', 'wax'].map((w, i) => (
          <div key={w} style={{ position: 'absolute', left: 330, top: -330 - i * 70, transform: `translateZ(${-400 * (i + 1)}px)`, fontFamily: FONT.sans, fontWeight: 600, fontSize: 112, color: C.moon, opacity: 0.5 - i * 0.12, whiteSpace: 'nowrap' }}>
            {w}
          </div>
        ))}
        <At x={0} y={0}>
          <Keypad size={SIZE} depth={8} light={1} keys={{ '9': { press: 1 } }} />
        </At>
        {/* a slab with thickness plates behind it (Phone3D's construction) */}
        <div style={{ position: 'absolute', left: 300, top: -120, width: 0, height: 0, transformStyle: 'preserve-3d' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: 260, height: 330, borderRadius: 40, background: i === 3 ? '#0e0722' : '#170c34', boxShadow: 'inset 0 0 0 2px #2a1b55', transform: `translateZ(${-12 * i}px)` }} />
          ))}
          <div style={{ position: 'absolute', left: 0, top: 0, width: 260, height: 330, borderRadius: 40, background: C.surface, border: `3px solid ${C.lineStrong}`, boxSizing: 'border-box', transform: 'translateZ(0.5px)', display: 'grid', placeItems: 'center', fontFamily: FONT.sans, fontWeight: 600, fontSize: 56, color: C.ink }}>
            Show
          </div>
        </div>
        {/* a chip in front of the plane */}
        <div style={{ position: 'absolute', left: -300, top: -470, transform: 'translateZ(160px)', padding: '18px 36px', borderRadius: 28, background: '#2a2f54', border: `5px solid ${C.proofMatch}`, fontFamily: FONT.sans, fontWeight: 600, fontSize: 64, color: C.ink, whiteSpace: 'nowrap' }}>
          water 92837
        </div>
      </LensWorld>
      {eye !== null && eye > 0 && eye < 1080 ? <div style={{ position: 'absolute', left: 0, right: 0, top: eye, borderTop: '3px dashed rgba(238,232,255,0.75)' }} /> : null}
      {fv !== null && fv > 0 && fv < 1080 ? <div style={{ position: 'absolute', left: 0, right: 0, top: fv, borderTop: '3px dashed rgba(255,143,166,0.9)' }} /> : null}
      <div style={{ position: 'absolute', left: 36, top: 28, fontFamily: FONT.mono, fontSize: 30, lineHeight: 1.35, color: C.ink, background: 'rgba(20,10,46,0.78)', padding: '14px 20px', borderRadius: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 36 }}>
          {mode === 'legacy' ? "today's World" : mode === 'dolly' ? 'physical camera, dolly' : 'physical camera, lens'}, zoom {zoom}
        </div>
        <div>eye level y {eye === null ? '-' : eye.toFixed(0)}  floor vanishes y {fv === null ? '-' : fv.toFixed(0)}</div>
        <div>floor seen {seen.toFixed(1)} deg  keystone {((ks - 1) * 100).toFixed(1)}%</div>
      </div>
    </AbsoluteFill>
  );
};
