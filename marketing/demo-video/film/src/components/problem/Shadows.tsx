/**
 * What lies on the floor in scene 9 (lib/stage, floor coordinates: x from the ground's centre, z towards the camera),
 * passed as <Studio shadows>. Key light top left and in front, as everywhere in Act 2:
 *  - a light pool under the person's side (mid/landing Pool, the light that lets a shadow read on night);
 *  - the grid and the field float GRID_LIFT above the floor: one wide, soft shadow under them and a faint cast shadow;
 *  - the switch stands on the floor: a tight contact shadow and a cast shadow back and right.
 * At the fold the person's shadows lift away with the cells and the landed keypad's own grounding comes in
 * (mid/landing LandingShadows), so the last frame lies on the floor exactly as s10's frame 0.
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE, ramp } from '../../lib/anim';
import { CastShadow, GroundShadow } from '../../lib/stage';
import { LandingShadows, Pool } from '../mid/landing';
import { CELL_DEPTH, CELL, FIELD, FLOOR_Y, GRID_LIFT, GRID_W, LAND, SWITCH, SWITCH_H, floorX } from './layout';
import { SHADOW_IN, SHADOW_OUT, SWITCH_GONE } from './time';

export const Shadows: React.FC = () => {
  const frame = useCurrentFrame();
  const stay = 1 - ramp(frame, SHADOW_OUT.from, SHADOW_OUT.dur, 0, 1, EASE.in);
  const landed = ramp(frame, SHADOW_IN.from, SHADOW_IN.dur, 0, 1, EASE.out);
  const x = floorX(LAND.x);
  const cellFace = CELL_DEPTH * (CELL / 96);
  return (
    <>
      {landed < 1 ? <Pool x={x} z={0} w={GRID_W} strength={1 - landed} /> : null}
      {stay > 0 ? (
        <>
          <CastShadow x={x} z={2} w={GRID_W} height={FLOOR_Y - GRID_LIFT - FIELD.top} lift={GRID_LIFT} strength={0.4 * stay} />
          <GroundShadow x={x} z={cellFace / 2} w={GRID_W * 1.04} d={90} lift={GRID_LIFT} strength={0.8 * stay} />
        </>
      ) : null}
      {frame < SWITCH_GONE ? (
        <>
          <CastShadow x={floorX(SWITCH.x)} z={2} w={SWITCH.w * 0.92} height={SWITCH_H} strength={0.45} />
          <GroundShadow x={floorX(SWITCH.x)} z={0} w={SWITCH.w * 1.06} d={SWITCH.w * 0.3} strength={0.85} />
        </>
      ) : null}
      {landed > 0 ? <LandingShadows strength={landed} /> : null}
    </>
  );
};
