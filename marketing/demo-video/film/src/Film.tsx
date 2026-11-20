/** The whole film: every scene in its time slot, Act 1's beds, the music, the narrator and the app's voice. */
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { C } from './tokens';
import { SCENES, SCENE_IDS, sceneLen, type SceneId } from './timeline';
import { SceneStart, Soundtrack } from './audio/Audio';
import { Act1Sound } from './scenes/Act1Sound';
import { S01 } from './scenes/S01';
import { S02 } from './scenes/S02';
import { S03 } from './scenes/S03';
import { S04 } from './scenes/S04';
import { S05 } from './scenes/S05';
import { S06 } from './scenes/S06';
import { S07 } from './scenes/S07';
import { S08 } from './scenes/S08';
import { S09 } from './scenes/S09';
import { S10 } from './scenes/S10';
import { S11 } from './scenes/S11';
import { S12 } from './scenes/S12';
import { S12B } from './scenes/S12B';
import { S13 } from './scenes/S13';
import { S14 } from './scenes/S14';
import { S15 } from './scenes/S15';
import { S16 } from './scenes/S16';

export const SCENE_COMPONENTS: Record<SceneId, React.FC> = {
  s01: S01, s02: S02, s03: S03, s04: S04, s05: S05, s06: S06, s07: S07, s08: S08,
  s09: S09, s10: S10, s11: S11, s12: S12, s12b: S12B, s13: S13, s14: S14, s15: S15, s16: S16,
};

export const Film: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: C.night }}>
    {SCENE_IDS.map((id) => {
      const Scene = SCENE_COMPONENTS[id];
      return (
        <Sequence key={id} from={SCENES[id].from} durationInFrames={sceneLen(id)} name={`${id} ${SCENES[id].title}`}>
          <SceneStart.Provider value={SCENES[id].from}>
            <Scene />
          </SceneStart.Provider>
        </Sequence>
      );
    })}
    <Act1Sound />
    <Soundtrack />
  </AbsoluteFill>
);

/** One scene alone, with the film's sound at the right offset (for previews and renders). */
export const SceneWithSound: React.FC<{ id: SceneId }> = ({ id }) => {
  const Scene = SCENE_COMPONENTS[id];
  return (
    <AbsoluteFill style={{ backgroundColor: C.night }}>
      <SceneStart.Provider value={SCENES[id].from}>
        <Scene />
      </SceneStart.Provider>
      <Sequence from={-SCENES[id].from} layout="none">
        <Act1Sound />
        <Soundtrack />
      </Sequence>
    </AbsoluteFill>
  );
};
