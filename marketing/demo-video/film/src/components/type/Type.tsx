/**
 * On-screen words. They live in SCREEN space (outside <World>), so camera moves never blur or tilt
 * what the viewer is reading. Sizes are px at 1920x1080.
 *
 * Rules (02-creative-direction.md 5 and 11; second cut 07-revision-v2.md 3): one idea per card, 1-5
 * words, sentence case, no exclamation marks. With the narrator, on-screen text is an EXACT excerpt
 * of what he says, appearing 0 to 4 frames before the word is spoken: use keyWordFrames(). Ember is
 * never text: to stress a word, put it on an ember block (emphasis), and only when nothing else ember
 * is on screen.
 */
import React from 'react';
import { AbsoluteFill, staticFile, useCurrentFrame } from 'remotion';
import { useAudioData } from '@remotion/media-utils';
import { C, FONT } from '../../tokens';
import { EASE, ramp, jump } from '../../lib/anim';
import { FPS, NARRATION_AT, SCENES, sec, type NarrationId, type SceneId } from '../../timeline';
import voice from '../../data/voice.json';
import narration from '../../data/narration.json';
import narrationScript from '../../../scripts/audio/prompts/narration.json';

export type SuperProps = {
  /** The words. Use '\n' for a line break. */
  text: string;
  /** Local frame of the first word. */
  at: number;
  /** Frame of each word (overrides `stagger`). Same length as the word list. */
  wordFrames?: number[];
  /** Frames between words when `wordFrames` is not given. Default 3. 0 = the whole line at once. */
  stagger?: number;
  /** Frames a word takes to rise into place. Default 12. 0 = cut in. */
  rise?: number;
  /** Local frame to leave. Omit to stay until the scene ends. */
  out?: number;
  /** How to leave: cut (default) or a quick mask up (8 frames before `out`). */
  outMode?: 'cut' | 'up';
  size?: number;
  weight?: number;
  color?: string;
  font?: keyof typeof FONT;
  letterSpacing?: string;
  lineHeight?: number;
  /** Centre of the text block in px. Default: centre of the frame. */
  x?: number;
  y?: number;
  align?: 'center' | 'left' | 'right';
  maxWidth?: number;
  /** Index of the word to put on an ember block, and when (default: when the word lands). */
  emphasis?: { word: number; at?: number };
  style?: React.CSSProperties;
};

/** Kinetic super: each word rises out of a mask. */
export const Super: React.FC<SuperProps> = ({
  text,
  at,
  wordFrames,
  stagger = 3,
  rise = 12,
  out,
  outMode = 'cut',
  size = 96,
  weight = 800,
  color = C.moon,
  font = 'sans',
  letterSpacing = '-0.015em',
  lineHeight = 1.08,
  x = 960,
  y = 540,
  align = 'center',
  maxWidth = 1600,
  emphasis,
  style,
}) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  if (out !== undefined && frame >= out) return null;
  const lines = text.split('\n').map((l) => l.split(' ').filter(Boolean));
  let index = 0;
  const outP = out !== undefined && outMode === 'up' ? ramp(frame, out - 8, 8, 0, 1, EASE.in) : 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(${align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0'}, -50%)`,
        width: maxWidth,
        textAlign: align,
        fontFamily: FONT[font],
        fontSize: size,
        fontWeight: weight,
        lineHeight,
        letterSpacing,
        color,
        ...style,
      }}
    >
      {lines.map((words, li) => (
        <div key={li} style={{ whiteSpace: 'nowrap' }}>
          {words.map((w, wi) => {
            const i = index++;
            const start = wordFrames?.[i] ?? at + i * stagger;
            // A word that has not started keeps its width (hidden below its mask), so a centred line never shifts.
            const p = frame < start ? 0 : rise > 0 ? ramp(frame, start, rise, 0, 1, EASE.reveal) : 1;
            const isEmph = emphasis && emphasis.word === i;
            const emphStart = isEmph ? (emphasis!.at ?? start) : 0;
            const e = isEmph ? ramp(frame, emphStart, 8, 0, 1, EASE.camera) : 0;
            return (
              <span
                key={wi}
                style={{
                  display: 'inline-block',
                  overflow: 'hidden',
                  verticalAlign: 'top',
                  padding: '0.06em 0.04em 0.14em',
                  margin: '-0.06em -0.04em -0.14em',
                  marginRight: wi < words.length - 1 ? '0.24em' : undefined,
                }}
              >
                <span
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    translate: `0 ${(1 - p) * 112 - outP * 112}%`,
                    color: e > 0.5 ? C.onEmber : color,
                  }}
                >
                  {isEmph ? (
                    <span
                      style={{
                        position: 'absolute',
                        left: '-0.16em',
                        right: '-0.16em',
                        top: '0.04em',
                        bottom: '-0.02em',
                        borderRadius: '0.16em',
                        background: C.ember,
                        transformOrigin: 'left center',
                        scale: `${e} 1`,
                        zIndex: 0,
                      }}
                    />
                  ) : null}
                  <span style={{ position: 'relative' }}>{w}</span>
                </span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

type Word = { text: string; start: number; end: number };
type VoiceEntry = { file: string; text: string; duration: number; words: Word[] };
const VOICE = voice as unknown as Record<string, VoiceEntry | undefined>;
const NARR = narration as unknown as Record<string, VoiceEntry | undefined>;
const SCRIPT = Object.fromEntries((narrationScript.lines as { id: string; text: string }[]).map((l) => [l.id, l.text]));

/** Word timings (in local frames) of an app-voice line that starts at local frame `at`. */
export const voiceWords = (id: string, at: number) =>
  (VOICE[id]?.words ?? []).map((w) => ({ text: w.text, start: at + sec(w.start), end: at + sec(w.end) }));

export const voiceDuration = (id: string) => sec(VOICE[id]?.duration ?? 1.5);

// ---------------------------------------------------------------------------------------------------
// The narrator. Lines are placed in timeline.ts (NARRATION_AT) and timed by src/data/narration.json.
// Until a line is measured its words are estimated at 0.4 s each from the script, so scenes can be
// built now and snap to the real timing when the files land.
// ---------------------------------------------------------------------------------------------------

/** The text of a narrator line (measured file first, then the script). */
export const narrText = (id: NarrationId) => NARR[id]?.text ?? SCRIPT[id] ?? id;

/** ABSOLUTE frames of every word of a narrator line. */
export const narrWords = (id: NarrationId): { text: string; start: number; end: number }[] => {
  const measured = NARR[id]?.words;
  const at = NARRATION_AT[id];
  if (measured && measured.length) return measured.map((w) => ({ text: w.text, start: at + sec(w.start), end: at + sec(w.end) }));
  return narrText(id)
    .split(' ')
    .filter(Boolean)
    .map((t, i) => ({ text: t, start: at + sec(i * 0.4), end: at + sec(i * 0.4 + 0.34) }));
};

/** Length of a narrator line in frames (measured, or estimated). */
export const narrDuration = (id: NarrationId) => {
  const d = NARR[id]?.duration;
  if (d) return sec(d);
  const w = narrWords(id);
  return (w[w.length - 1]?.end ?? NARRATION_AT[id]) - NARRATION_AT[id];
};

/** LOCAL frame inside `scene` where narrator line `id` starts, or where its word number `word` starts. */
export const narrIn = (scene: SceneId, id: NarrationId, word?: number) => {
  const abs = word === undefined ? NARRATION_AT[id] : (narrWords(id)[word]?.start ?? NARRATION_AT[id]);
  return abs - SCENES[scene].from;
};

/** LOCAL frame inside `scene` where narrator line `id` ends. */
export const narrEndIn = (scene: SceneId, id: NarrationId) => NARRATION_AT[id] + narrDuration(id) - SCENES[scene].from;

/**
 * Local word frames for a Super that shows an exact excerpt of a narrator line: words
 * [first, first + count) of `id`, each landing `lead` frames before it is spoken (0 to 4, default 2).
 *   <Super text="Every word must match." at={f[0]} wordFrames={f} ... />  with f = keyWordFrames('s11', 'n16-must-match', 1, 4)
 */
export const keyWordFrames = (scene: SceneId, id: NarrationId, first: number, count: number, lead = 2) =>
  narrWords(id)
    .slice(first, first + count)
    .map((w) => w.start - lead - SCENES[scene].from);

// ---------------------------------------------------------------------------------------------------
// The app's voice, made visible.
// ---------------------------------------------------------------------------------------------------

/** 0..1 loudness of a mono/stereo waveform around time t (40 ms window): -40 dBFS = 0, -10 dBFS = 1. */
const levelAt = (wave: Float32Array | undefined, rate: number, t: number) => {
  if (!wave || t < 0) return 0;
  const half = Math.round(rate * 0.02);
  const c = Math.round(t * rate);
  let sum = 0;
  let n = 0;
  for (let i = Math.max(0, c - half); i < Math.min(wave.length, c + half); i++) {
    sum += wave[i]! * wave[i]!;
    n++;
  }
  if (n === 0) return 0;
  const dbfs = 10 * Math.log10(sum / n + 1e-12);
  return Math.min(1, Math.max(0, (dbfs + 40) / 30));
};

/**
 * The spoken sentence, full screen, moon on night: every word is there from `appear`, dim, and each
 * lights (a 120 ms jump) as the voice reaches it. Under the word being spoken a soft ember pool
 * breathes with the voice's loudness: while it shows, it is the one ember thing on screen.
 * `at` = local frame where the voice starts.
 */
export const SpokenLine: React.FC<{ voice: string; at: number; appear?: number; size?: number; y?: number; maxWidth?: number; pool?: boolean }> = ({
  voice: id,
  at,
  appear = at,
  size = 156,
  y = 540,
  maxWidth = 1680,
  pool = true,
}) => {
  const frame = useCurrentFrame();
  const file = VOICE[id]?.file ?? `audio/voice/${id}.wav`;
  const audio = useAudioData(staticFile(file));
  if (frame < appear) return null;
  const words = voiceWords(id, at);
  const fallback = (VOICE[id]?.text ?? id).split(' ');
  const list = words.length ? words : fallback.map((t, i) => ({ text: t, start: at + i * 12, end: at + i * 12 + 10 }));
  // The word being spoken: the last one that has started, held until 12 frames after the line ends.
  let current = -1;
  for (let i = 0; i < list.length; i++) if (frame >= list[i]!.start) current = i;
  const lastEnd = list[list.length - 1]?.end ?? at;
  const poolFade = ramp(frame, lastEnd, 12, 1, 0);
  const level = audio ? levelAt(audio.channelWaveforms[0], audio.sampleRate, (frame - at) / FPS) : 0.5;
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div
        style={{
          position: 'absolute',
          top: y,
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: maxWidth,
          textAlign: 'center',
          fontFamily: FONT.sans,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.04,
          letterSpacing: '-0.02em',
          color: C.moon,
        }}
      >
        {list.map((w, i) => (
          <span key={i} style={{ position: 'relative', display: 'inline-block', marginRight: i < list.length - 1 ? '0.24em' : 0 }}>
            {pool && i === current && poolFade > 0 ? (
              <span
                style={{
                  position: 'absolute',
                  left: '-8%',
                  right: '-8%',
                  top: '78%',
                  height: '0.34em',
                  borderRadius: '50%',
                  background: `radial-gradient(closest-side, rgba(255,177,61,${0.5 + 0.4 * level}) 0%, rgba(255,177,61,0.18) 55%, rgba(255,177,61,0) 100%)`,
                  filter: 'blur(10px)',
                  scale: `${0.9 + 0.2 * level} ${0.8 + 0.4 * level}`,
                  opacity: poolFade * ramp(frame, list[i]!.start, 4, 0.4, 1),
                }}
              />
            ) : null}
            <span style={{ position: 'relative', opacity: 0.3 + 0.7 * jump(frame, w.start) }}>{w.text}</span>
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** A small label (for "then" / "now", "test model", credits). */
export const Label: React.FC<{ text: string; x: number; y: number; size?: number; color?: string; font?: keyof typeof FONT; align?: 'center' | 'left'; opacity?: number }> = ({
  text,
  x,
  y,
  size = 28,
  color = C.inkMuted,
  font = 'sans',
  align = 'center',
  opacity = 1,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      transform: `translate(${align === 'center' ? '-50%' : '0'}, -50%)`,
      fontFamily: FONT[font],
      fontSize: size,
      fontWeight: 600,
      color,
      opacity,
      whiteSpace: 'nowrap',
    }}
  >
    {text}
  </div>
);
