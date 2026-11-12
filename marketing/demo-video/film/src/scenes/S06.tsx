/**
 * Scene 6, Rebirth: same keys (bars 1-2; 07-revision-v2.md V5 and s06; research-v2/12, section 3, option A).
 * Frame 0 is s05's last frame: the ember dot alone on night. On the downbeat the dot turns out to be key 9's
 * light on the old phone's keypad; the old keys turn into the app's keys one per eighth, the frame rate
 * comes back from 12 to 60, the phone's body fades to night, the keys re-form into the app's keypad, the
 * moon panel grows out of the ninth key, and the camera pulls back onto the night studio floor.
 * Picture: components/open/Stage.tsx (shared with S07, one clock).
 *
 * Sound: the sub hit on the downbeat (the hum glide before it stops dead 24 f earlier, in s05); one rising
 * key tone per change (A C D E G A C); the pull-back lands with a soft whoosh (no narrator here).
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { sec } from '../timeline';
import { KeyTone, Sfx } from '../audio/Audio';
import { Stage, T } from '../components/open/Stage';
import { act2Offset } from '../components/open/time';

const OFFSET = act2Offset('s06');

export const S06: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame + OFFSET;
  return (
    <AbsoluteFill>
      <Stage t={t} />
      {/* The downbeat: one soft deep hit with the first kick, the chapter's one hit. */}
      <Sfx id="sub-hit" at={-OFFSET} volume={0.9} />
      {/* One rising tone per change: key 9, 8 and 6, 5, 7 and 3, 4 and 2, 1, then the bottom row. */}
      {T.toneSlots.map((f, i) => (
        <KeyTone key={f} k={String(i + 1)} at={f - OFFSET} set="new" volume={0.7} />
      ))}
      {/* The pull-back onto the floor: a soft whoosh peaking as it lands (whoosh-1 peaks 0.48 s in). */}
      <Sfx id="whoosh-1" at={T.pullEnd - sec(0.48) - OFFSET} volume={0.4} />
      <Sfx id="tick" at={T.pullEnd - OFFSET} volume={0.3} />
    </AbsoluteFill>
  );
};
