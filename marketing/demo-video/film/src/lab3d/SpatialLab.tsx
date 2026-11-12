/**
 * Spatial lab (Tools / SpatialLab): research-v2/16-spatial-tech.md. One composition, several views chosen by props:
 *
 *   view 'proof-css'    s11's proof shot rebuilt on lib/stage + lib/camera (lens camera, level floor in its own pass,
 *                       real thickness, shadows on the floor, depth blur, teeth in the card's silhouette): the builders'
 *                       reference for STYLE.md "Spatial rules". The three.js version was measured and dropped (research 16)
 *   view 'stage'        the production stage on brand parts (Keypad body="slab", a Slab card, level floor, shadows,
 *                       pitch 0 with a raised eye, lens 5400): still 0-59, a whip 60-89, an optical push 90-149
 *   view 'camera'       today's <World> against the lens-correct camera on the same content (frames 0 / 60 / 120 =
 *                       zoom 1 / 1.8 / 3), `mode` 'legacy' | 'dolly' | 'lens'
 *   view 'sharp'        the same word through every pipeline at the same on-screen size, for a sharpness measure
 *
 *   npx tsx src/lab3d/tools/stills.ts out/spatial-lab SpatialLab:40:css-rest --props '{"view":"proof-css"}'
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C } from '../tokens';
import type { ZoomMode } from './lens';
import { ProofCss } from './proof/ProofCss';
import { CameraCompare } from './CameraCompare';
import { SharpTest } from './SharpTest';
import { StageTest } from './StageTest';

export type SpatialLabProps = {
  view: 'proof-css' | 'stage' | 'camera' | 'sharp';
  mode?: ZoomMode;
  /** sharp: the zoom of the test (default 2); `animate` ramps it 1 -> 3.5 over the 240 frames instead. */
  zoom?: number;
  animate?: boolean;
  /** proof-css: depth of field on (default) or off, to measure what the CSS blur costs. */
  dof?: boolean;
};

export const SpatialLab: React.FC<SpatialLabProps> = ({ view, mode = 'lens', zoom, animate = false, dof = true }) => (
  <AbsoluteFill style={{ backgroundColor: C.night }}>
    {view === 'proof-css' ? <ProofCss dof={dof} /> : null}
    {view === 'stage' ? <StageTest /> : null}
    {view === 'camera' ? <CameraCompare mode={mode} /> : null}
    {view === 'sharp' ? <SharpTest zoom={zoom} animate={animate} /> : null}
  </AbsoluteFill>
);
