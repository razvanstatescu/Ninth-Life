/**
 * Act 1's sound (second cut), mounted once by Film.tsx from frame 0: frames here are ABSOLUTE. Times come
 * from components/act1/v2/script.ts. Everything dips under the narrator by itself (sfxGain in Audio.tsx).
 *
 * - The tube's hum and hiss only around the tube: the switch-on and the static, the push through the glass,
 *   then again on the pull back, until the switch-off.
 * - The drawer: room tone throughout and a low drone that sinks four semitones as the lights die.
 * - The phone: the old set's square beeps for keys 4 3 5 5 6 (E D G G A) and 0 (A2); the battery-low beeps.
 * - The phone, second cut (scripts/audio/make_sfx_v2.py): the wake's click and backlight whine, the battery-low
 *   beeps (the old set's E4 then C4), the power-down at the death.
 * - The dot: a crackle at the wink, one soft E as it warms; then the hiss riser (25.6 s) and the hum gliding from F
 *   up to A (26.0 s) under its end, both stopping dead at 27.6 s.
 * Nothing sounds from 27.6 s to 28.0 s (Act 2's sub hit lands at 28.0 s): the room stops with the glide.
 */
import React from 'react';
import { Sequence, staticFile, useCurrentFrame } from 'remotion';
import { Audio } from '@remotion/media';
import { AMB, Bed, KeyTone, Sfx, SfxFile, type AmbId } from '../audio/Audio';
import { sec } from '../timeline';
import { EASE, ramp } from '../lib/anim';
import { TUBE } from '../components/act1/TubePicture';
import { A1V2 as A } from '../components/act1/v2/script';

/** The sound designer's second-cut Act 1 files (public/). */
export const V2_FILES = {
  /** A tiny click and the backlight's faint whine (0.6 s), at the wake. */
  wake: 'audio/sfx/v2/wake-click.wav',
  /** Two soft falling square beeps (0.3 s: E4, then C4 at 161 ms), at the "Battery low" note. */
  batteryLow: 'audio/sfx/v2/battery-low.wav',
  /** The phone dying: a click and a falling whine (0.5 s), at the death. */
  powerDown: 'audio/sfx/v2/power-down.wav',
  /** The hiss through an opening low-pass (2.0 s): 25.6 to 27.6 s. */
  hissRiser: 'audio/sfx/v2/hiss-riser.wav',
  /** The hum gliding from F up to A (1.6 s): 26.0 to 27.6 s, a dead stop. */
  humGlide: 'audio/amb/hum-glide.wav',
} as const;

/** Act 1's last sound ends here; then silence until Act 2's downbeat at 28.0 s. */
export const ACT1_SILENCE = sec(27.6);

const XFADE = 4;
const SEMITONE = Math.pow(2, -1 / 12);
const ROOM = 0.1;

/** A looping bed segment with its own pitch (toneFrequency, applied at render) and fades at both ends. */
const Segment: React.FC<{ id: AmbId; from: number; to: number; level: number; pitch: number; fadeIn?: number; fadeOut?: number }> = ({
  id,
  from,
  to,
  level,
  pitch,
  fadeIn = XFADE,
  fadeOut = XFADE,
}) => (
  <Sequence from={from} durationInFrames={Math.max(1, to - from)} layout="none" name={`bed ${id} x${pitch.toFixed(3)}`}>
    <SegmentInner id={id} len={to - from} level={level} pitch={pitch} fadeIn={fadeIn} fadeOut={fadeOut} />
  </Sequence>
);

const SegmentInner: React.FC<{ id: AmbId; len: number; level: number; pitch: number; fadeIn: number; fadeOut: number }> = ({
  id,
  len,
  level,
  pitch,
  fadeIn,
  fadeOut,
}) => {
  const f = useCurrentFrame();
  const v = level * Math.min(ramp(f, 0, fadeIn, 0, 1, EASE.linear), ramp(f, len - fadeOut, fadeOut, 1, 0, EASE.linear));
  return <Audio src={staticFile(AMB[id])} loop volume={Math.max(0, v)} toneFrequency={pitch} />;
};

export const Act1Sound: React.FC = () => {
  const offEnd = A.off + TUBE.collapseFrames;
  return (
    <>
      {/* The room, all act long; it dips under the glide and stops with it (a 2-frame fade, no click). */}
      <Bed
        id="room"
        from={0}
        to={ACT1_SILENCE}
        level={(f) => ramp(f, sec(0.15), sec(0.4), 0, ROOM) * ramp(f, sec(26.0), sec(1.0), 1, 0.6) * ramp(f, ACT1_SILENCE - 2, 2, 1, 0, EASE.linear)}
      />

      {/* The tube: switch-on, static, the push through the glass. */}
      <Sfx id="tv-on" at={A.tvOn - 2} volume={0.45} />
      <Segment id="hum" from={A.tvOn} to={A.push[1]} level={0.16} pitch={1} fadeIn={sec(0.6)} fadeOut={A.push[1] - A.push[0]} />
      <Bed
        id="hiss"
        from={A.tvOn}
        to={A.push[1]}
        level={(f) => {
          const abs = f + A.tvOn;
          const noSignal = abs < A.thin ? ramp(abs, A.tvOn, sec(0.5), 0, 0.26) : ramp(abs, A.thin, A.lock - A.thin, 0.26, 0.06);
          return noSignal * ramp(abs, A.push[0], A.push[1] - A.push[0], 1, 0, EASE.linear);
        }}
      />

      {/* The drawer: a low drone, sinking as the lights die. */}
      <Segment id="drone" from={A.thin} to={A.death} level={0.13} pitch={1} fadeIn={sec(1.2)} fadeOut={XFADE} />
      <Segment id="drone" from={A.death - XFADE} to={offEnd + TUBE.shrinkFrames} level={0.13} pitch={Math.pow(SEMITONE, 4)} fadeIn={XFADE} fadeOut={sec(0.4)} />

      {/* The phone. */}
      <SfxFile src={V2_FILES.wake} at={A.wake} volume={0.7} />
      {A.presses.map((at, i) => (
        <KeyTone key={i} k={A.pressKeys[i]!} at={at} set="old" volume={0.5} />
      ))}
      <KeyTone k="0" at={A.space} set="old" volume={0.45} />
      <SfxFile src={V2_FILES.batteryLow} at={A.beeps[0]!} volume={0.4} />
      <SfxFile src={V2_FILES.powerDown} at={A.death} volume={0.6} />

      {/* The tube again: the pull back and the switch-off. */}
      <Segment id="hum" from={A.pull[0]} to={offEnd} level={0.14} pitch={1} fadeIn={A.pull[1] - A.pull[0]} fadeOut={TUBE.collapseFrames} />
      <Bed id="hiss" from={A.pull[0]} to={offEnd} level={(f) => ramp(f, 0, A.pull[1] - A.pull[0], 0, 0.05) * ramp(f + A.pull[0], A.off, TUBE.collapseFrames, 1, 0, EASE.linear)} />
      <Sfx id="tv-off" at={A.off} volume={0.45} />

      {/* The dot; then the bridge to Act 2, both files ending exactly at ACT1_SILENCE. */}
      <Sfx id="crackle" at={A.wink} volume={0.3} />
      <Sfx id="ember" at={A.warm} volume={0.35} />
      <KeyTone k="4" at={A.warm} set="new" volume={0.3} />
      <SfxFile src={V2_FILES.hissRiser} at={sec(25.6)} volume={0.3} />
      <SfxFile src={V2_FILES.humGlide} at={sec(26.0)} volume={0.2} />
    </>
  );
};
