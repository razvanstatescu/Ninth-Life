/**
 * The soft moon glow that seats an object on the night floor, for the close scenes. Same look as
 * brand/Studio ContactGlow, without its CSS blur filter: inside the tilted 3D world that filter renders as
 * a hard-edged light rectangle (seen in out/close/s13-50.png), so the softness here comes from the
 * gradient alone. WORLD space; `z` places it at a depth.
 */
import React from 'react';

export const FloorGlow: React.FC<{ x: number; y: number; w: number; h?: number; z?: number; strength?: number }> = ({ x, y, w, h = w * 0.16, z = 0, strength = 1 }) => (
  <div
    style={{
      position: 'absolute',
      left: x - w / 2,
      top: y - h / 2,
      width: w,
      height: h,
      borderRadius: '50%',
      transform: z ? `translateZ(${z}px)` : undefined,
      background: `radial-gradient(closest-side, rgba(238,232,255,${0.11 * strength}) 0%, rgba(238,232,255,${0.06 * strength}) 40%, rgba(238,232,255,${0.02 * strength}) 70%, rgba(238,232,255,0) 100%)`,
      pointerEvents: 'none',
    }}
  />
);
