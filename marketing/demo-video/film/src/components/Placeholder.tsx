/** Stand-in for a scene that is not built yet: its id, title and time, so the film renders end to end. */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, FONT } from '../tokens';
import { FPS, SCENES, sceneLen, type SceneId } from '../timeline';

const tc = (f: number) => `${Math.floor(f / FPS / 60)}:${String(Math.floor((f / FPS) % 60)).padStart(2, '0')}`;

export const Placeholder: React.FC<{ id: SceneId }> = ({ id }) => {
  const frame = useCurrentFrame();
  const s = SCENES[id];
  return (
    <AbsoluteFill style={{ backgroundColor: C.night, color: C.inkMuted, fontFamily: FONT.mono, justifyContent: 'center', alignItems: 'center', gap: 24 }}>
      <div style={{ fontSize: 40 }}>{id.toUpperCase()}</div>
      <div style={{ fontFamily: FONT.sans, fontSize: 72, fontWeight: 800, color: C.moon }}>{s.title}</div>
      <div style={{ fontSize: 32 }}>
        {tc(s.from)} to {tc(s.to)} · frame {frame} of {sceneLen(id)}
      </div>
      <div style={{ position: 'absolute', left: 0, bottom: 0, height: 8, width: `${(frame / sceneLen(id)) * 100}%`, background: C.line }} />
    </AbsoluteFill>
  );
};
