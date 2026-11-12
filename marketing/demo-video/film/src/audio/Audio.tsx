/**
 * Every sound in the film is placed with a frame. File names are a contract with the sound designer
 * (public/audio/**, manifest/audio.json); placeholders are silent until the real files land.
 *
 * In a scene:   <Sfx id="whoosh-1" at={atIn('s08', 9) - sec(0.45)} />   <KeyTone k="4" at={f} />
 * Volumes are linear gain (1 = file level; files are normalised to -3 dBFS peak).
 *
 * Second cut: the narrator. His lines are placed in timeline.ts (NARRATION_AT) and played here, once,
 * by <Soundtrack>. While he speaks the music dips (mix.ts) and every Sfx/KeyTone/Bed dips a little, so
 * scenes never duck anything by hand. Effects need to know the absolute frame: Film.tsx provides each
 * scene's start through <SceneStart.Provider>.
 */
import React, { createContext, useContext } from 'react';
import { Sequence, staticFile, useCurrentFrame } from 'remotion';
import { Audio } from '@remotion/media';
import { ACT2_START, MUSIC, NARRATION_AT, VOICE_AT, sec, type NarrationId, type VoiceId } from '../timeline';
import { ramp } from '../lib/anim';
import voice from '../data/voice.json';
import narration from '../data/narration.json';
import { MIX, MUSIC_FILES } from './mix';

export const SFX = {
  'tv-on': 'audio/sfx/tv-on.wav',
  'tv-off': 'audio/sfx/tv-off.wav',
  'static-burst': 'audio/sfx/static-burst.wav',
  'static-burst-2': 'audio/sfx/static-burst-2.wav',
  crackle: 'audio/sfx/crackle.wav',
  rise: 'audio/sfx/rise.wav',
  ember: 'audio/sfx/ember.wav',
  'sub-hit': 'audio/sfx/sub-hit.wav',
  riser: 'audio/sfx/riser.wav',
  'reverse-swell': 'audio/sfx/reverse-swell.wav',
  'whoosh-1': 'audio/sfx/whoosh-1.wav',
  'whoosh-2': 'audio/sfx/whoosh-2.wav',
  'whoosh-3': 'audio/sfx/whoosh-3.wav',
  whip: 'audio/sfx/whip.wav',
  tick: 'audio/sfx/tick.wav',
  thump: 'audio/sfx/thump.wav',
  no: 'audio/sfx/no.wav',
  button: 'audio/sfx/button.wav',
  flip: 'audio/sfx/flip.wav',
  'chord-tail': 'audio/sfx/chord-tail.wav',
} as const;
export type SfxId = keyof typeof SFX;

export const AMB = {
  hum: 'audio/amb/hum.wav',
  hiss: 'audio/amb/hiss.wav',
  room: 'audio/amb/room.wav',
  drone: 'audio/amb/drone.wav',
} as const;
export type AmbId = keyof typeof AMB;

/** Absolute frame of the current scene's frame 0. Film.tsx provides it; the film-level sound uses 0. */
export const SceneStart = createContext(0);

const db = (x: number) => Math.pow(10, x / 20);

type Line = { file: string; duration: number; words?: { text: string; start: number; end: number }[] };
const NARR = narration as unknown as Record<string, Line | undefined>;
const VOICES = voice as unknown as Record<string, Line | undefined>;

/** [from, to) absolute frames where the narrator speaks, from the measured files. */
export const NARRATOR_SPANS: [number, number][] = (Object.keys(NARRATION_AT) as NarrationId[])
  .filter((id) => NARR[id])
  .map((id) => [NARRATION_AT[id], NARRATION_AT[id] + sec(NARR[id]!.duration)]);

/** 0..1: how far everything else is ducked for the narrator at an absolute frame. */
export const narratorDuck = (abs: number) => {
  let d = 0;
  for (const [a, b] of NARRATOR_SPANS) {
    if (abs < a - sec(MIX.attack) || abs > b + sec(MIX.release)) continue;
    const down = ramp(abs, a - sec(MIX.attack), sec(MIX.attack), 0, 1);
    const up = ramp(abs, b, sec(MIX.release), 1, 0);
    d = Math.max(d, Math.min(down, up));
  }
  return d;
};

/** Gain an effect gets at an absolute frame (the narrator's small dip). */
export const sfxGain = (abs: number) => db(MIX.sfxUnderNarrator * narratorDuck(abs));

/** Key tone file for a key: '1'-'9', '0', 'star' (Back) or 'hash' (Next); '*' and '#' are accepted. */
export const keyToneFile = (set: 'old' | 'new', k: string) => `audio/keys/${set}-${k === '*' ? 'star' : k === '#' ? 'hash' : k}.wav`;

const Ducked: React.FC<{ src: string; at: number; volume: number; playbackRate?: number }> = ({ src, at, volume, playbackRate }) => {
  const f = useCurrentFrame();
  const start = useContext(SceneStart);
  return <Audio src={staticFile(src)} volume={volume * sfxGain(start + at + f)} playbackRate={playbackRate} />;
};

/** One sound effect starting at local frame `at`. A negative `at` is fine (starts before the scene). */
export const Sfx: React.FC<{ id: SfxId; at: number; volume?: number; playbackRate?: number }> = ({ id, at, volume = 1, playbackRate }) => (
  <Sequence from={at} layout="none" name={`sfx ${id}`}>
    <Ducked src={SFX[id]} at={at} volume={volume} playbackRate={playbackRate} />
  </Sequence>
);

/** Any file under public/ as a one-shot effect (for effects a scene owns, e.g. audio/sfx/v2/*.wav). */
export const SfxFile: React.FC<{ src: string; at: number; volume?: number; playbackRate?: number; name?: string }> = ({ src, at, volume = 1, playbackRate, name }) => (
  <Sequence from={at} layout="none" name={name ?? `sfx ${src}`}>
    <Ducked src={src} at={at} volume={volume} playbackRate={playbackRate} />
  </Sequence>
);

/** The tone of one key press at local frame `at`. Act 1 uses set 'old', Act 2 'new'. */
export const KeyTone: React.FC<{ k: string; at: number; set?: 'old' | 'new'; volume?: number }> = ({ k, at, set = 'new', volume = 0.8 }) => (
  <Sequence from={at} layout="none" name={`key ${set} ${k}`}>
    <Ducked src={keyToneFile(set, k)} at={at} volume={volume} />
  </Sequence>
);

/**
 * A looping bed between local frames [from, to) with a volume that may change over time.
 * `level(frame)` gets the frame relative to `from`. Beds dip under the narrator like effects do.
 */
export const Bed: React.FC<{ id: AmbId; from: number; to: number; level: number | ((f: number) => number) }> = ({ id, from, to, level }) => (
  <Sequence from={from} durationInFrames={Math.max(1, to - from)} layout="none" name={`bed ${id}`}>
    <BedInner id={id} from={from} level={level} />
  </Sequence>
);

const BedInner: React.FC<{ id: AmbId; from: number; level: number | ((f: number) => number) }> = ({ id, from, level }) => {
  const f = useCurrentFrame();
  const start = useContext(SceneStart);
  const v = typeof level === 'number' ? level : level(f);
  return <Audio src={staticFile(AMB[id])} loop volume={Math.max(0, v) * sfxGain(start + from + f)} />;
};

/**
 * Music gain at an absolute frame: hard mutes where the app speaks alone, the app-voice duck, the
 * narrator's dip (per stem), and a safety fade over the last 4 s of the track.
 */
export const musicLevel = (abs: number, stem: 'full' | 'drums' | 'other' = 'full') => {
  for (const [a, b] of MUSIC.mutes) if (abs >= a && abs < b) return 0;
  let g = MIX.music;
  for (const [a, b] of MUSIC.ducks) {
    // Down over 3 frames before `a`, back up over the last 6 frames before `b`.
    const d = abs < a ? ramp(abs, a - 3, 3, 0, 1) : ramp(abs, b - 6, 6, 1, 0);
    g *= db(MIX.duckUnderApp * d);
  }
  g *= db(MIX.duckUnderNarrator[stem] * narratorDuck(abs));
  const end = MUSIC.from + sec(MUSIC.length);
  return g * ramp(abs, end - sec(4), sec(4), 1, 0);
};

const MusicInner: React.FC<{ src: string; stem: 'full' | 'drums' | 'other' }> = ({ src, stem }) => {
  const f = useCurrentFrame();
  return <Audio src={staticFile(src)} volume={musicLevel(f + ACT2_START, stem)} />;
};

/** Music, the app's voice and the narrator for the whole film. Mounted once by Film.tsx. */
export const Soundtrack: React.FC = () => {
  const stems = MUSIC_FILES.drums && MUSIC_FILES.other;
  return (
    <>
      <Sequence from={ACT2_START} layout="none" name="music act2">
        {stems ? (
          <>
            <MusicInner src={MUSIC_FILES.drums!} stem="drums" />
            <MusicInner src={MUSIC_FILES.other!} stem="other" />
          </>
        ) : (
          <MusicInner src={MUSIC_FILES.full} stem="full" />
        )}
      </Sequence>
      {(Object.keys(VOICE_AT) as VoiceId[]).map((id) => (
        <Sequence key={id} from={VOICE_AT[id]} durationInFrames={sec((VOICES[id]?.duration ?? 2) + 0.5)} layout="none" name={`app voice ${id}`}>
          <Audio src={staticFile(VOICES[id]?.file ?? `audio/voice/${id}.wav`)} volume={MIX.appVoice} />
        </Sequence>
      ))}
      {(Object.keys(NARRATION_AT) as NarrationId[]).map((id) => {
        const line = NARR[id];
        if (!line) return null;
        return (
          <Sequence key={id} from={NARRATION_AT[id]} durationInFrames={sec(line.duration + 0.3)} layout="none" name={`narrator ${id}`}>
            <Audio src={staticFile(line.file)} volume={NARRATION_AT[id] < ACT2_START ? MIX.narratorAct1 : MIX.narrator} />
          </Sequence>
        );
      })}
    </>
  );
};
