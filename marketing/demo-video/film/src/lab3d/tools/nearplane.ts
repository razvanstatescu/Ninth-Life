/**
 * Spatial lab: how close each floor's near edge comes to the camera's eye, per frame (lib/camera maths). Geometry
 * behind the eye (a negative gap) is what s12's opening has (its MidFloors reach 3000-3200 px towards the viewer), and
 * sequence renders of those frames can stall Chromium (STYLE.md "Spatial rules": nothing reaches behind the camera).
 *
 *   npx tsx src/lab3d/tools/nearplane.ts
 *
 * Gap = eye distance left before the floor's near edge, as a share of the eye distance (negative = behind the eye).
 * Keep it above +40% (ground.near under 0.6 x optics(cam).D).
 */
import { cameraAt, optics, type Cam, type CamKey } from '../../lib/camera';
import { EASE } from '../../lib/anim';
import * as G from '../../components/mid/s12';
import * as M from '../../components/mid/s11';
import { PHONE_FLOOR_Y } from '../../components/mid/PhoneShot';
import { PHONE_W } from '../../components/mid/phone';

const rad = (d: number) => (d * Math.PI) / 180;

/** Camera-space depth (towards the viewer) of a world point, as lib/camera project() computes it. */
const depth = (p: { x: number; y: number; z: number }, cam: Cam) => {
  const { s } = optics(cam);
  let x = (p.x - cam.x) * s;
  let y = (p.y - cam.y) * s;
  let z = p.z * s;
  [x, y] = [x * Math.cos(rad(cam.rz)) - y * Math.sin(rad(cam.rz)), x * Math.sin(rad(cam.rz)) + y * Math.cos(rad(cam.rz))];
  [x, z] = [x * Math.cos(rad(cam.ry)) + z * Math.sin(rad(cam.ry)), -x * Math.sin(rad(cam.ry)) + z * Math.cos(rad(cam.ry))];
  [y, z] = [y * Math.cos(rad(cam.rx)) - z * Math.sin(rad(cam.rx)), y * Math.sin(rad(cam.rx)) + z * Math.cos(rad(cam.rx))];
  return z;
};

/** The worst gap along the near edge of a Floor/MidFloor (rotateX(angle) about its line y). */
export const nearGap = (cam: Cam, floor: { y: number; x: number; near: number; width: number; angle?: number }) => {
  const a = rad(floor.angle ?? 78);
  const F = optics(cam).F;
  let worst = Infinity;
  for (const dx of [-floor.width / 2, 0, floor.width / 2]) {
    const z = depth({ x: floor.x + dx, y: floor.y + floor.near * Math.cos(a), z: floor.near * Math.sin(a) }, cam);
    worst = Math.min(worst, F - z);
  }
  return worst / F;
};

const S12_KEYS: CamKey[] = [
  { f: 0, ...M.CAM_LAST },
  { f: G.MORPH.from + G.MORPH.dur, ...G.CAM_PHONE, ease: EASE.flight },
  { f: G.DIVE.from, zoom: G.CAM_PHONE.zoom * 1.03, ease: EASE.linear },
  { f: G.DIVE.from + G.DIVE.dur, ...G.CAM_DIVE, ease: EASE.in },
];
const proofFloor = { y: M.FLOOR_Y, x: M.CHIP_C.x, near: 3000, width: 20000 };
const phoneFloor = { y: PHONE_FLOOR_Y, x: PHONE_W / 2, near: 3200, width: 20000 };
console.log('s12 floors, gap to the eye (negative = behind the camera):');
for (const f of [0, 12, 24, 36, 48, 100, G.DIVE.from]) {
  const cam = cameraAt(f, S12_KEYS);
  console.log(`  f${f} zoom ${cam.zoom.toFixed(3)}  proof floor ${(nearGap(cam, proofFloor) * 100).toFixed(1)}%  phone floor ${(nearGap(cam, phoneFloor) * 100).toFixed(1)}%`);
}
