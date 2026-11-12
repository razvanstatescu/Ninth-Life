/**
 * Scene 7, Hello again (bars 3-5; 07-revision-v2.md s07). Bars 3-4: the shot of S06 goes on (one clock):
 * 4 3 5 5 6, Space, 2 4 2 4 6 on eighths with the key melody, the decoder's guess large above the keys
 * (it redraws on every press; "Hell" stays one eighth), then on beat 4 a whip right to Speak (ember).
 * Bar 5, beat 1: Speak pressed, a hard cut to "Hello again." on night. The music's stop and the voice are
 * global (audio/Audio.tsx); SpokenLine lights the words and breathes the ember pool under the spoken word.
 * The line uses the title's type (components/open/Title.tsx), so s08's name lands on its baseline.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C } from '../tokens';
import { SCENES, VOICE_AT, atIn, sec } from '../timeline';
import { KeyTone, Sfx } from '../audio/Audio';
import { NightGround } from '../components/brand/Logo';
import { SpokenLine } from '../components/type/Type';
import decoded from '../data/decoded.json';
import { Stage, T } from '../components/open/Stage';
import { TITLE } from '../components/open/Title';
import { act2Offset } from '../components/open/time';

const OFFSET = act2Offset('s07');
const CUT = atIn('s07', 5);
const VOICE = VOICE_AT['hello-again'] - SCENES.s07.from;

export const S07: React.FC = () => {
  const frame = useCurrentFrame();
  const presses = decoded.sentences['hello-again'].presses;
  return (
    <AbsoluteFill style={{ backgroundColor: C.night }}>
      {frame < CUT ? (
        <Stage t={frame + OFFSET} />
      ) : (
        <AbsoluteFill>
          <NightGround glow={{ x: 50, y: 50, r: 64, strength: 0.55 }} />
          <SpokenLine voice="hello-again" at={VOICE} appear={CUT} size={TITLE.size} y={TITLE.y} />
        </AbsoluteFill>
      )}
      {presses.map((p, i) => (
        <KeyTone key={i} k={p} at={T.press[i]! - OFFSET} set="new" volume={0.7} />
      ))}
      {/* The whip to Speak (no narrator here): whoosh-3 peaks 0.41 s in, on the whip's landing. */}
      <Sfx id="whoosh-3" at={atIn('s07', 4, 4) - sec(0.41)} volume={0.6} />
      <Sfx id="thump" at={T.speakPress - OFFSET} volume={0.45} />
      {/* Bar 5 beat 4: a one-beat swell into the drop on bar 6 (it peaks on the cut). */}
      <Sfx id="reverse-swell" at={atIn('s07', 5, 4)} volume={0.8} />
    </AbsoluteFill>
  );
};
