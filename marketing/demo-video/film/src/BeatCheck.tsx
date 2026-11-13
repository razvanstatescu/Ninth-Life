/** The Act 2 music with a tick on every beat and the bar number on screen, to check the beat grid. */
import React from 'react';
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { Audio } from '@remotion/media';
import { C, FONT } from './tokens';
import { BAR, BEAT, sec } from './timeline';

export const BeatCheck: React.FC = () => {
  const f = useCurrentFrame();
  const bar = Math.floor(f / BAR) + 1;
  const beat = Math.floor((f % BAR) / BEAT) + 1;
  return (
    <AbsoluteFill style={{ backgroundColor: C.night, color: C.moon, fontFamily: FONT.mono, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ fontSize: 160 }}>
        {bar}.{beat}
      </div>
      <div style={{ position: 'absolute', bottom: 80, display: 'flex', gap: 24 }}>
        {[1, 2, 3, 4].map((b) => (
          <div key={b} style={{ width: 60, height: 60, borderRadius: 16, background: b === beat ? C.ember : C.plum }} />
        ))}
      </div>
      <Audio src={staticFile('audio/music/act2.wav')} volume={0.8} />
      {Array.from({ length: Math.floor(sec(86) / BEAT) }, (_, i) => (
        <Sequence key={i} from={i * BEAT} durationInFrames={10} layout="none">
          <Audio src={staticFile(i % 4 === 0 ? 'audio/sfx/tick.wav' : 'audio/sfx/tick.wav')} volume={i % 4 === 0 ? 1 : 0.5} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
