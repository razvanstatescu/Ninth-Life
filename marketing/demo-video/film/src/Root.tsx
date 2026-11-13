import React from 'react';
import { Composition, Folder, Still } from 'remotion';
import './fonts';
import { FPS, HEIGHT, SCENE_IDS, SCENES, TOTAL, WIDTH, sceneLen, sec } from './timeline';
import { Film, SceneWithSound } from './Film';
import { BeatCheck } from './BeatCheck';
import { Lab } from './Lab';
import { StudioLab } from './StudioLab';
import { Thumbnail } from './Thumbnail';
import { SpatialLab, type SpatialLabProps } from './lab3d/SpatialLab';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={TOTAL} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Folder name="Scenes">
      {SCENE_IDS.map((id) => (
        <Composition
          key={id}
          id={id.toUpperCase()}
          component={SceneWithSound}
          defaultProps={{ id }}
          durationInFrames={sceneLen(id)}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      ))}
    </Folder>
    <Folder name="Tools">
      <Composition id="Lab" component={Lab} durationInFrames={sec(4)} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="StudioLab" component={StudioLab} durationInFrames={sec(3)} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Still id="Thumbnail" component={Thumbnail} width={1280} height={720} />
      <Composition id="BeatCheck" component={BeatCheck} durationInFrames={sec(86)} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="SpatialLab" component={SpatialLab} defaultProps={{ view: 'proof-css' } as SpatialLabProps} durationInFrames={240} fps={FPS} width={WIDTH} height={HEIGHT} />
    </Folder>
  </>
);

// Unused export kept for scripts that need the scene table.
export { SCENES };
