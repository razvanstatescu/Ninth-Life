/**
 * Spatial lab, view 'stage': the production stage on brand parts, as a reference for the builders (STYLE.md "Spatial
 * rules"). A keypad with real thickness (Keypad body="slab") and a sentence card (Slab) stand on a level floor; the
 * camera has no pitch (the eye is raised instead), a 5400 px lens in lens mode, and a yaw under 4 degrees.
 *   frames 0-59     hold (a still for review)
 *   frames 60-89    a whip to the right (about 70 px a frame, so <Studio>'s one motion blur covers both passes)
 *   frames 90-149   an optical push-in (zoomMode 'lens'): the perspective does not change, only the size
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, FONT } from '../tokens';
import { At, cameraAt, cameraVelocity, type CamKey } from '../lib/camera';
import { EASE } from '../lib/anim';
import { CastShadow, GroundShadow, Plane, Slab, Studio } from '../lib/stage';
import { Keypad, keypadLayout } from '../components/brand/Keypad';

const SIZE = 150;
const PAD = keypadLayout(SIZE);
const FLOOR_Y = PAD.height / 2;
const CARD = { x: 520, w: 820, h: 300, depth: 30 };

const LENS = { lens: 5400, zoomMode: 'lens' as const, eye: 260, rx: 0, rz: 0 };
const KEYS: CamKey[] = [
  { f: 0, x: 380, y: 40, zoom: 0.92, ry: -3.5, ...LENS },
  { f: 60, x: 380, y: 40, zoom: 0.93, ry: -3.5, ease: EASE.linear },
  { f: 90, x: 2400, y: 40, zoom: 0.93, ry: -3.5, ease: EASE.whip },
  { f: 91, x: 380, y: 40, zoom: 0.93, ry: -3.5 },
  { f: 150, x: 380, y: 40, zoom: 1.3, ry: -2.5, ease: EASE.camera },
];

export const StageTest: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame, KEYS);
  const vel = cameraVelocity(frame, KEYS);
  return (
    <Studio
      cam={cam}
      vel={vel}
      ground={{ y: FLOOR_Y, far: 9000, near: 2400 }}
      groundDof={{ radius: 5 }}
      aperture={60}
      focusZ={10}
      glow={{ x: 50, y: 40 }}
      shadows={
        <>
          <GroundShadow x={0} z={8} w={PAD.width * 1.04} d={70} strength={0.85} />
          <CastShadow x={0} z={4} w={PAD.width} height={PAD.height} strength={0.45} />
          <GroundShadow x={CARD.x + CARD.w / 2} z={CARD.depth / 2} w={CARD.w * 1.04} d={70} strength={0.85} />
          <CastShadow x={CARD.x + CARD.w / 2} z={4} w={CARD.w} height={CARD.h} strength={0.45} />
        </>
      }
    >
      <At x={0} y={0}>
        <Keypad size={SIZE} depth={8} light={1} body="slab" keys={{ '9': { press: 1 } }} spillFrom="9" spill={0.12} />
      </At>
      <Plane x={CARD.x} y={FLOOR_Y - CARD.h}>
        <Slab w={CARD.w} h={CARD.h} r={56} depth={CARD.depth} face={C.surface} side="#120a2c" sideLit="#2c1d5c" border={{ width: 4, color: C.line }}>
          <div style={{ position: 'absolute', left: 48, top: 40, fontFamily: FONT.sans, fontSize: 96, lineHeight: 1.1, fontWeight: 600, color: C.ink }}>I need water</div>
          <div style={{ position: 'absolute', left: 48, top: 196, fontFamily: FONT.mono, fontSize: 46, fontWeight: 500, color: C.inkMuted }}>4 6333 92837</div>
        </Slab>
      </Plane>
    </Studio>
  );
};
