/**
 * s10's frame 0 on the spatial stage (STYLE.md "Spatial rules"; research-v2/15, 6.2 A): the set the fold lands in.
 * Shared with s09, whose last frame must be this frame exactly (handoff.ts FOLD_LANDING, owned by the mid builder).
 *
 *   <Studio cam={FOLD_LANDING.cam} {...landingStage()} shadows={<LandingShadows />}>
 *     <TheySaidBack text="What do you need?" />
 *     <LandingKeypad keys={{ '4': { lit: 1 } }} spillFrom="4" spill={FOLD_LANDING.spill} />
 *   </Studio>
 *
 * - Lens 5400 in lens mode, pitch 0, the eye raised to 302 (28%): the level floor vanishes there, behind the keypad.
 * - The keypad (Keypad body="slab") stands on the floor (its panel's bottom edge on the floor line), turned 5 degrees
 *   inward about its vertical centre line (a side panel turns toward the eye; research-v2/15, 3.3).
 * - Under it: a light pool, a contact shadow and a cast shadow back and right (key light top left).
 * - They said is on a back plane (z -500), veiled 25% (darkened, never transparent).
 */
import React from 'react';
import { C } from '../../tokens';
import { CastShadow, GroundShadow, Plane, type GroundLook } from '../../lib/stage';
import { Keypad, keypadLayout, type KeyId, type KeyState } from '../brand/Keypad';
import { FOLD_LANDING } from '../handoff';
import { TheySaid } from './Parts2';
import { W600 } from './metrics';

export const LANDING_PAD = keypadLayout(FOLD_LANDING.keySize);

/** The <Studio> props of s10's frame 0 (besides cam, shadows and children). */
export const landingStage = () => ({
  ground: { ...FOLD_LANDING.stage.ground } as GroundLook,
  glow: { ...FOLD_LANDING.stage.glow },
  groundDof: { ...FOLD_LANDING.stage.groundDof },
  aperture: FOLD_LANDING.stage.aperture,
  focusZ: FOLD_LANDING.stage.focusZ,
});

/**
 * A light pool on the floor (floor coordinates: x across, z towards the camera from the floor line), the light that
 * lets a shadow read on night (research-v2/15, 5.3): an ellipse 2.6 w across and 3.2 w deep, centred 0.3 w in front.
 */
export const Pool: React.FC<{ x: number; z?: number; w: number; strength?: number }> = ({ x, z = 0, w, strength = 1 }) => (
  <div
    style={{
      position: 'absolute',
      left: x - 1.3 * w,
      top: z + 0.3 * w - 1.6 * w,
      width: 2.6 * w,
      height: 3.2 * w,
      borderRadius: '50%',
      background: `radial-gradient(closest-side, rgba(238,232,255,${0.13 * strength}) 0%, rgba(238,232,255,${0.05 * strength}) 40%, rgba(238,232,255,0) 75%)`,
    }}
  />
);

/** The keypad's grounding on the floor: pool, contact shadow, cast shadow, turned with the keypad. */
export const LandingShadows: React.FC<{ strength?: number }> = ({ strength = 1 }) => {
  const w = LANDING_PAD.width;
  const back = -FOLD_LANDING.depth * 1.2 * (FOLD_LANDING.keySize / 96);
  // Floor coordinates are measured from the ground's x (lib/stage <Studio>), not from world 0: the keypad stands at world.x.
  const fx = FOLD_LANDING.world.x - FOLD_LANDING.stage.ground.x;
  return (
    <div style={{ position: 'absolute', left: fx, top: 0 }}>
      <Pool x={0} z={0} w={w} strength={strength} />
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `rotate(${-FOLD_LANDING.turn}deg)` }}>
        <CastShadow x={0} z={back} w={w} height={LANDING_PAD.height} strength={0.42 * strength} />
        <GroundShadow x={0} z={back / 2} w={w * 1.04} d={70} strength={0.85 * strength} />
      </div>
    </div>
  );
};

/** The keypad as it stands at s10's frame 0 (world: its panel centred on FOLD_LANDING.world). */
export const LandingKeypad: React.FC<{
  keys?: Partial<Record<KeyId, KeyState>>;
  base?: KeyState;
  spillFrom?: KeyId;
  spill?: number;
  sweep?: number;
  panel?: number;
}> = ({ keys, base, spillFrom, spill = 0, sweep = 0, panel = 1 }) => (
  <Plane x={FOLD_LANDING.world.x} y={FOLD_LANDING.world.y}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transform: `rotateY(${FOLD_LANDING.turn}deg)`, transformStyle: 'preserve-3d' }}>
      <div style={{ position: 'absolute', left: -LANDING_PAD.width / 2, top: -LANDING_PAD.height / 2, transformStyle: 'preserve-3d' }}>
        <Keypad
          size={FOLD_LANDING.keySize}
          depth={FOLD_LANDING.depth}
          light={FOLD_LANDING.light}
          body="slab"
          keys={keys}
          base={base}
          spillFrom={spillFrom}
          spill={spill}
          sweep={sweep}
          panel={panel}
        />
      </div>
    </div>
  </Plane>
);

/** They said, on the back plane (world px; its top-left corner). */
export const SAY_BACK = FOLD_LANDING.theySaid;
export const SAY_BACK_W = Math.round((W600['What do you need?']! * 22 + 24 + 16 + 40) * SAY_BACK.s);
export const SAY_BACK_H = 86 * SAY_BACK.s;

export const TheySaidBack: React.FC<{ text: string; dy?: number; veil?: number }> = ({ text, dy = 0, veil = SAY_BACK.veil }) => (
  <Plane x={SAY_BACK.x} y={SAY_BACK.y + dy} z={SAY_BACK.z}>
    <TheySaid text={text} s={SAY_BACK.s} width={SAY_BACK_W} veil={veil} />
  </Plane>
);

/** Night, for veils: rgba of C.night. */
export const NIGHT_RGB = '20,10,46';
export const veilOf = (a: number) => `rgba(${NIGHT_RGB},${a})`;
export const NIGHT = C.night;
