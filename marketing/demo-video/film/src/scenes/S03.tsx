/**
 * Scene 3 of Act 1 (second cut). The whole act is drawn from the absolute frame by components/act1/v2/Act1.tsx
 * (shots and times in components/act1/v2/script.ts), so shots can run across scene lines; sound is Act1Sound.
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { SCENES } from '../timeline';
import { Act1 } from '../components/act1/v2/Act1';

export const S03: React.FC = () => {
  const frame = useCurrentFrame();
  return <Act1 abs={SCENES.s03.from + frame} />;
};
