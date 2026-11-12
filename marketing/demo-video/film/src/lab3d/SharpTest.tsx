/**
 * Spatial lab: is text on 3D planes blurry? The same card ("wafer 92337" on the card surface) at the same on-screen size
 * (zoom 2 by default: word 96 px) and the same turn (rx -4, ry -8) through six pipelines, a 3 x 2 grid:
 *   A  screen space (the reference: plain 2D DOM)
 *   B  the old <World> maths: perspective 2400, `rotate... scale(zoom)` (2D scale inside the 3D transform)
 *   C  lens camera, lens 5200: perspective F = 10400 and a uniform 3D scale
 *   D  the old World with the plane authored at 2x and scaled 0.5 inside: forces a higher raster scale
 *   E  the old World with lib/stage <Crisp factor={2}>: the same supersampling done with CSS `zoom`, no re-authoring
 *   F  the production camera (lib/camera World, lens 5400, zoomMode 'lens') with <Crisp>: what the builders use
 * src/lab3d/tools/sharpness.py measures each cell against A. (A three.js canvas-texture cell measured 77-87%; it was
 * removed with three.js, research-v2/16-spatial-tech.md section 1.4.)
 */
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from 'remotion';
import { C, FONT } from '../tokens';
import { fontsReady } from '../fonts';
import { HEIGHT, WIDTH } from '../timeline';
import { World, aim } from '../lib/camera';
import { Crisp } from '../lib/stage';
import { LensWorld, aimLens } from './lens';

const CARD = { w: 300, h: 80, r: 22 };
const WORD = 48;
const CODE = 30;
export const CELLS = { w: 640, h: 540 };
const centre = (col: number, row: number) => ({ x: col * CELLS.w + CELLS.w / 2, y: row * CELLS.h + CELLS.h / 2 });

const Card2D: React.FC<{ s: number }> = ({ s }) => (
  <div
    style={{
      width: CARD.w * s,
      height: CARD.h * s,
      boxSizing: 'border-box',
      borderRadius: CARD.r * s,
      background: C.surface,
      border: `${2.5 * s}px solid ${C.lineStrong}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10 * s,
      fontFamily: FONT.sans,
    }}
  >
    <div style={{ fontSize: WORD * s, lineHeight: 1, fontWeight: 600, color: C.ink, marginTop: -4 * s }}>wafer</div>
    <div style={{ fontFamily: FONT.mono, fontSize: CODE * s, lineHeight: 1, fontWeight: 500, letterSpacing: '0.12em', color: C.inkMuted }}>92337</div>
  </div>
);

const Cell: React.FC<{ col: number; row: number; children: React.ReactNode; label: string }> = ({ col, row, children, label }) => (
  <AbsoluteFill style={{ clipPath: `inset(${row * CELLS.h}px ${WIDTH - (col + 1) * CELLS.w}px ${HEIGHT - (row + 1) * CELLS.h}px ${col * CELLS.w}px)` }}>
    {children}
    <div style={{ position: 'absolute', left: col * CELLS.w + 18, top: row * CELLS.h + 14, fontFamily: FONT.mono, fontSize: 22, color: 'rgba(238,232,255,0.8)' }}>{label}</div>
  </AbsoluteFill>
);

const TheCard: React.FC = () => (
  <div style={{ position: 'absolute', left: -CARD.w / 2, top: -CARD.h / 2 }}>
    <Card2D s={1} />
  </div>
);

const TURN = { rx: -4, ry: -8, rz: 0 };

export const SharpTest: React.FC<{ zoom?: number; animate?: boolean }> = ({ zoom: fixed = 2, animate = false }) => {
  const frame = useCurrentFrame();
  const ZOOM = animate ? 1 + (2.5 * frame) / 239 : fixed;
  const [handle] = useState(() => delayRender('lab3d sharp: fonts'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    fontsReady.then(() => Promise.all([document.fonts.load(`600 48px ${FONT.sans}`), document.fonts.load(`500 30px ${FONT.mono}`)])).then(() => setReady(true));
  }, []);
  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, handle]);
  const legacy = (col: number, row: number) => aimLens({ x: 0, y: 0 }, centre(col, row), { zoom: ZOOM, ...TURN, lens: 2400 }, 'legacy');
  return (
    <AbsoluteFill style={{ backgroundColor: C.night }}>
      <Cell col={0} row={0} label="A screen space">
        <div style={{ position: 'absolute', left: centre(0, 0).x - (CARD.w * ZOOM) / 2, top: centre(0, 0).y - (CARD.h * ZOOM) / 2 }}>
          <Card2D s={ZOOM} />
        </div>
      </Cell>
      <Cell col={1} row={0} label="B the old World (2D zoom)">
        <LensWorld cam={legacy(1, 0)} mode="legacy" noBlur>
          <TheCard />
        </LensWorld>
      </Cell>
      <Cell col={2} row={0} label="C lens camera (lens 5200)">
        <LensWorld cam={aimLens({ x: 0, y: 0 }, centre(2, 0), { zoom: ZOOM, ...TURN, lens: 5200 }, 'lens')} mode="lens" noBlur>
          <TheCard />
        </LensWorld>
      </Cell>
      <Cell col={0} row={1} label="D old World + 2x authored">
        <LensWorld cam={legacy(0, 1)} mode="legacy" noBlur>
          <div style={{ position: 'absolute', left: -CARD.w / 2, top: -CARD.h / 2, transform: 'scale(0.5)', transformOrigin: '0 0' }}>
            <Card2D s={2} />
          </div>
        </LensWorld>
      </Cell>
      <Cell col={1} row={1} label="E old World + <Crisp>">
        <LensWorld cam={legacy(1, 1)} mode="legacy" noBlur>
          <Crisp w={0} h={0} factor={2}>
            <TheCard />
          </Crisp>
        </LensWorld>
      </Cell>
      <Cell col={2} row={1} label="F lib/camera lens 5400 + <Crisp>">
        <World cam={aim({ x: 0, y: 0 }, centre(2, 1), { zoom: ZOOM, ...TURN, lens: 5400, zoomMode: 'lens' })} noBlur>
          <Crisp w={0} h={0} factor={ZOOM <= 1.5 ? 2 : 1}>
            <TheCard />
          </Crisp>
        </World>
      </Cell>
    </AbsoluteFill>
  );
};
