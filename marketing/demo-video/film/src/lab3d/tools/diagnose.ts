/**
 * Spatial lab: the numbers behind the diagnosis (research-v2/16-spatial-tech.md, section 1).
 *
 *   npx tsx src/lab3d/tools/diagnose.ts
 *
 * For every camera of s09-s13 it prints, in today's <World> maths (legacy):
 *   - the eye level: where a level floor would meet the sky (screen y),
 *   - where the 78-degree <Floor> actually vanishes (screen y), and the screen-space haze band (<StudioGround horizon>),
 *   - the floor's angle as seen (90 = edge-on), which in legacy maths changes with the zoom,
 *   - the camera distance the zoom implies (P / zoom) and the keystone of the scene's main subject.
 * Then it checks that the physical camera in 'dolly' mode puts every z = 0 point on exactly the same pixel as today.
 */
import { FOLD_LANDING } from '../../components/handoff';
import { HOME, MACRO } from '../../components/problem/layout';
import { PHONE_CAM_END, PHONE_CAM_HOLD } from '../../components/mid/PhoneShot';
import * as M from '../../components/mid/s11';
import * as G from '../../components/mid/s12';
import { project } from '../../components/mid/geo';
import type { Cam } from '../../lib/camera';
import { floorAngleSeen, floorVanishY, horizonY, keystone, projectLens, type LensCam } from '../lens';

type Row = { scene: string; name: string; cam: Cam; haze: number; floor: number; subjectW: number };
const t = (zoom: number, rx: number, ry: number): Cam => ({ x: 0, y: 0, zoom, rx, ry, rz: 0 });

// S10.tsx and S13.tsx keep their cameras local; their zoom and turn are copied here (positions do not matter below).
const rows: Row[] = [
  { scene: 's09', name: 'HOME', cam: HOME, haze: 62, floor: 78, subjectW: 460 },
  { scene: 's09', name: 'MACRO', cam: MACRO, haze: 62, floor: 78, subjectW: 460 },
  { scene: 's10', name: 'CAM0 = FOLD_LANDING', cam: FOLD_LANDING.cam, haze: 62, floor: 78, subjectW: 712 },
  { scene: 's10', name: 'CAM_FLY_B (S10.tsx)', cam: t(1.4, -10, -24), haze: 62, floor: 78, subjectW: 1100 },
  { scene: 's10', name: 'CAM_SPEAK (S10.tsx)', cam: t(1.32, -6, -6), haze: 62, floor: 78, subjectW: 740 },
  { scene: 's10', name: 'CAM_MATCH (PhoneShot)', cam: t(216 / 120, -4, -16), haze: 66, floor: 78, subjectW: 1170 },
  { scene: 's10', name: 'PHONE_CAM_HOLD', cam: PHONE_CAM_HOLD, haze: 66, floor: 78, subjectW: 1170 },
  { scene: 's11', name: 'start = PHONE_CAM_END', cam: PHONE_CAM_END, haze: 66, floor: 78, subjectW: 1170 },
  { scene: 's11', name: 'CAM_CHIP', cam: M.CAM_CHIP, haze: 66, floor: 78, subjectW: M.CHIP.width },
  { scene: 's11', name: 'CAM_STRUCT_A', cam: M.CAM_STRUCT_A, haze: 66, floor: 78, subjectW: M.CARD_W },
  { scene: 's11', name: 'CAM_STRUCT_B', cam: M.CAM_STRUCT_B, haze: 66, floor: 78, subjectW: M.CARD_W },
  { scene: 's11', name: 'CAM_COMPARE_CREEP', cam: M.CAM_COMPARE_CREEP, haze: 66, floor: 78, subjectW: M.CARD_W },
  { scene: 's11', name: 'after impact (x1.05)', cam: { ...M.CAM_COMPARE_CREEP, zoom: M.CAM_COMPARE_CREEP.zoom * 1.05 }, haze: 66, floor: 78, subjectW: M.CARD_W },
  { scene: 's11', name: 'CAM_LAST', cam: M.CAM_LAST, haze: 66, floor: 78, subjectW: M.CHIP.width },
  { scene: 's12', name: 'CAM_PHONE', cam: G.CAM_PHONE, haze: 66, floor: 78, subjectW: 1170 },
  { scene: 's12', name: 'INSIDE_CAM_START', cam: G.INSIDE_CAM_START, haze: 0, floor: 0, subjectW: 1400 },
  { scene: 's13', name: 'CAM_A (S13.tsx)', cam: t(1.1, -8, -5), haze: 60, floor: 78, subjectW: 600 },
  { scene: 's13', name: 'mid-move (ry -10)', cam: t(1.0, -8, -10), haze: 60, floor: 78, subjectW: 1400 },
];

const f = (v: number | null, d = 0) => (v === null ? '  none' : v.toFixed(d).padStart(6));
console.log('scene name                       zoom   rx   ry | eye   floorVP  haze  gap | floor seen | P/zoom | keystone');
for (const r of rows) {
  const cam: LensCam = { ...r.cam };
  const eye = horizonY(cam, 'legacy');
  const fv = r.floor ? floorVanishY(cam, 'legacy', r.floor) : null;
  const haze = r.haze ? (r.haze / 100) * 1080 : null;
  const gap = eye !== null && fv !== null ? eye - fv : null;
  const seen = r.floor ? floorAngleSeen(cam, 'legacy', r.floor) : null;
  const ks = keystone(cam, 'legacy', r.subjectW);
  console.log(
    `${r.scene} ${r.name.padEnd(28)} ${cam.zoom.toFixed(2).padStart(5)} ${String(cam.rx).padStart(4)} ${String(cam.ry).padStart(4)} |` +
      `${f(eye)} ${f(fv)} ${f(haze)} ${f(gap)} | ${f(seen, 1)}     | ${f(2400 / cam.zoom)} | ${((ks - 1) * 100).toFixed(1).padStart(5)}%`,
  );
}

// The floor's angle as the camera zooms, s11's push (legacy maths), against the lens maths.
console.log('\nfloor seen (deg, 90 = edge-on) through s11, legacy vs lens/dolly:');
for (const z of [0.435, 0.8, 0.87, 1.0, 1.18, 1.28, 2, 4, 14]) {
  const cam: LensCam = { ...M.CAM_COMPARE, zoom: z };
  console.log(`  zoom ${z.toFixed(3).padStart(6)}  legacy ${floorAngleSeen(cam, 'legacy').toFixed(1)}  physical ${floorAngleSeen(cam, 'lens').toFixed(1)}`);
}

// Dolly mode equals today's World for every point at z = 0, and differs for points in depth.
let maxFlat = 0;
let maxDeep = 0;
const cams = rows.map((r) => r.cam);
for (const cam of cams) {
  for (const p of [
    { x: cam.x - 600, y: cam.y - 300 },
    { x: cam.x + 700, y: cam.y + 250 },
    { x: cam.x + 100, y: cam.y + 900 },
  ]) {
    const a = project(p, cam);
    const b = projectLens(p, cam, 'dolly');
    maxFlat = Math.max(maxFlat, Math.hypot(a.x - b.x, a.y - b.y));
    const pz = { ...p, z: -300 };
    const c = project(pz, cam);
    const d = projectLens(pz, cam, 'dolly');
    maxDeep = Math.max(maxDeep, Math.hypot(c.x - d.x, c.y - d.y));
  }
}
console.log(`\ndolly vs today, z = 0 points: max difference ${maxFlat.toExponential(2)} px; points at z = -300: up to ${maxDeep.toFixed(1)} px`);

// s11's struck card recedes (S11.tsx ProofParts: top + 50 back + 160 away, translateZ(-260 back - 520 away)) while the
// 78-degree floor rises behind its line (rotateX(78) about FLOOR_Y: height FLOOR_Y - |z| / tan 78 at depth z).
console.log('\ns11: the struck card against the floor (world px; positive = card bottom below the floor surface):');
const floorAt = (z: number) => M.FLOOR_Y - Math.abs(z) / Math.tan((78 * Math.PI) / 180);
for (const [back, away] of [
  [0, 0],
  [1, 0],
  [1, 0.5],
  [1, 1],
]) {
  const top = M.CARD_TOP_DOCK + back * 50 + away * 160; // the card has risen into the lock (RISE = 1)
  const z = -260 * back - 520 * away;
  const bottom = top + M.CARD_L.closedH;
  console.log(`  back ${back} away ${away}: card bottom y ${bottom.toFixed(0)}, z ${z}, floor there y ${floorAt(z).toFixed(0)} -> ${(bottom - floorAt(z)).toFixed(0)} px into the floor`);
}
