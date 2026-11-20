/**
 * Every time in the film, in one place (05-production-guide.md section 6; second cut: 07-revision-v2.md).
 *
 * - Scenes are mounted in <Sequence>s by Film.tsx, so inside a scene useCurrentFrame() is LOCAL
 *   (0 = the scene's first frame). Use atIn()/tIn() to turn storyboard times into local frames.
 * - Never write a bare frame count in a scene. Write seconds (sec), beats (BEAT, EIGHTH) or named
 *   constants (JUMP), so the film still works if FPS changes.
 * - The narrator's and the app's lines are placed HERE (NARRATION_AT, VOICE_AT). Scenes read their
 *   word timings with nWords()/narrIn() (components/type/Type.tsx) and never place their own voice audio.
 */

export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const BPM = 120;
/** Frames in one beat (30 at 60 fps). */
export const BEAT = (60 / BPM) * FPS;
/** Frames in one eighth note (15 at 60 fps). */
export const EIGHTH = BEAT / 2;
/** Frames in one bar of 4 beats (120 at 60 fps = 2 s). */
export const BAR = 4 * BEAT;

/** Seconds to frames (rounded). */
export const sec = (s: number) => Math.round(s * FPS);

/** The app's highlight change: 120 ms, linear (design tokens: motion-jump). */
export const JUMP = sec(0.12);

/** Act 2 starts at 0:28. Bar 1 beat 1 of the music is this frame. */
export const ACT2_START = sec(28);

/** Absolute frame of a position in Act 2. Bars and beats count from 1; `eighth` is 0 or 1. */
export const at = (bar: number, beat = 1, eighth = 0) =>
  ACT2_START + (bar - 1) * BAR + (beat - 1) * BEAT + eighth * EIGHTH;

/**
 * Act 2 has 55 bars: the film is 2:18 (8,280 frames). The third cut (2026-11-19) added 10 bars to the 1:58 cut: the
 * real-app conversation reel (s12b, 5 bars) after ghost mode, and a Kiro chapter of 7 bars instead of 2 (s14).
 */
export const ACT2_BARS = 55;
export const TOTAL = at(ACT2_BARS + 1);

export type SceneId =
  | 's01' | 's02' | 's03' | 's04' | 's05'
  | 's06' | 's07' | 's08' | 's09' | 's10' | 's11' | 's12' | 's12b' | 's13' | 's14' | 's15' | 's16';

/**
 * Absolute frame ranges [from, to) of every scene (07-revision-v2.md, section 4; third cut: 08-revision-v3.md).
 * `shift`: bars to add to the bar numbers a scene's code uses (atIn). Scenes s13, s15 and s16 were written for the
 * 1:58 cut and still number their bars as in it (s13: 33-34, s15: 37-40, s16: 41-45); their shift moves them.
 * Third-cut bars: s12b 33-37, s13 38-39, s14 40-46, s15 47-50, s16 51-55.
 */
export const SCENES: Record<SceneId, { from: number; to: number; title: string; shift?: number }> = {
  s01: { from: 0, to: sec(4), title: 'Dead air' },
  s02: { from: sec(4), to: sec(11), title: 'The phone wakes' },
  s03: { from: sec(11), to: sec(17), title: 'Ghost typing, battery low' },
  s04: { from: sec(17), to: sec(22), title: 'Quiet, and off' },
  s05: { from: sec(22), to: sec(28), title: 'The dot' },
  s06: { from: at(1), to: at(3), title: 'Rebirth: same keys' },
  s07: { from: at(3), to: at(6), title: 'Hello again' },
  s08: { from: at(6), to: at(9), title: 'Title' },
  s09: { from: at(9), to: at(18), title: 'The problem, and the fold' },
  s10: { from: at(18), to: at(24), title: 'The solution' },
  s11: { from: at(24), to: at(30), title: 'The proof' },
  s12: { from: at(30), to: at(33), title: 'No signal: ghost mode' },
  s12b: { from: at(33), to: at(38), title: 'Keeps up with the conversation (the real app)' },
  s13: { from: at(38), to: at(40), title: 'Touch, keyboard, one switch', shift: 5 },
  s14: { from: at(40), to: at(47), title: 'Made for Kiroween: how Kiro was used' },
  s15: { from: at(47), to: at(51), title: 'Same keys, I have something to say', shift: 10 },
  s16: { from: at(51), to: at(56), title: 'Lockup and closing card', shift: 10 },
};

export const SCENE_IDS = Object.keys(SCENES) as SceneId[];

/** Length of a scene in frames. */
export const sceneLen = (id: SceneId) => SCENES[id].to - SCENES[id].from;

/** LOCAL frame (inside scene `id`) of an Act 2 position, in the bar numbers the scene's code uses (see `shift`). */
export const atIn = (id: SceneId, bar: number, beat = 1, eighth = 0) => at(bar + (SCENES[id].shift ?? 0), beat, eighth) - SCENES[id].from;

/** LOCAL frame (inside scene `id`) of an absolute film time in seconds, e.g. tIn('s02', 6.5). */
export const tIn = (id: SceneId, filmSeconds: number) => sec(filmSeconds) - SCENES[id].from;

/** Absolute frames where the app's voice starts (Soundtrack plays them; scenes light the words). */
export const VOICE_AT = {
  'hello-again': at(5) + sec(0.2),
  // Bar 22 beat 2: n14 ("...You press Speak.") ends at 69.8 s, so the app speaks a beat after it.
  'i-need-water': at(22, 2) + sec(0.1),
  'something-to-say': at(49) + sec(0.2),
} as const;
export type VoiceId = keyof typeof VOICE_AT;

/**
 * Absolute frames where each narrator line starts (07-revision-v2.md, section 3). Lines live in
 * src/data/narration.json (file, duration, word times). The Act 1 builder owns the Act 1 values; the
 * lead owns the Act 2 values. `npx tsx scripts/check-narration.ts` checks overlaps and the quiet zones.
 */
export const NARRATION_AT = {
  // Act 1 (Act 1 builder; shots in components/act1/v2/script.ts; line lengths in narration.json).
  'n01-ghost-story': sec(0.7), // 4.05 s, over the static and the push through the glass; ends 4.75 s, the phone wakes at 5.0 s
  'n02-nine-keys': sec(6.6), // 3.04 s, over the ghost typing (keys 4 3 5 5 6 at 6.8-8.8 s)
  'n03-worked-out': sec(10.25), // 2.09 s, Hello accepted (the 0 press at 9.75 s); ends 12.34 s, then the battery beeps
  'n04-glass': sec(13.75), // 4.12 s, the dark drawer; ends 17.87 s, then the pull back and the switch-off (18.6 s)
  'n05-not-bad': sec(19.4), // 2.81 s, the dot; ends 22.21 s, then the two unvoiced lines (22.4, 23.2 s)
  'n06-something': sec(24.9), // 2.06 s, the dot warms; ends 26.96 s
  // Act 2 (lead). Measured lengths in the comments; check with scripts/check-narration.ts.
  'n07-this-is': at(6, 2), // 5.44 s: the drop gets beat 1 alone; speech ends 43.8 s, before the dive
  'n08-type-to-talk': at(9, 1, 1), // 4.43 s
  'n09-small-keys': at(11, 3), // 2.35 s
  'n10-one-switch': at(13), // 3.26 s
  'n11-moves-on': at(15), // 1.70 s
  'n12-words-mouth': at(16), // 3.07 s, ends 61.1 s; the fold from 61.5 s
  'n13-nine-big-keys': at(18, 1, 1), // 4.07 s, an eighth after the fold lands
  'n14-finds': at(20, 2) + sec(0.2), // 3.11 s, ends 69.8 s
  'n15-model': at(24, 1, 1), // 3.97 s
  'n16-must-match': at(26, 2), // 2.79 s, ends 81.3 s; the proof's impact after it
  'n17-never': at(28, 2), // 2.45 s
  'n18-ghost-mode': at(30, 1, 1), // 4.38 s
  // Third cut: the real-app reel (s12b, bars 33-37), answering the problem's "The conversation moves on."
  'n18b-keeps-up': at(33, 1, 1), // 2.52 s, speech 0.35-2.57 s into the reel
  'n18c-listen': at(34, 2, 1), // 3.37 s, speech 2.87-5.89 s
  'n18d-show-flip': at(36, 1, 1), // 3.12 s, speech 6.35-9.21 s; "flip" at 7.75 s
  'n19-access': at(38, 1, 1), // 3.07 s
  // Third cut: the Kiro chapter (s14, bars 40-46). The title has the lift's first two beats to itself.
  'n19b-specs': at(40, 3), // 3.07 s, speech 1.10-3.80 s into the chapter
  'n19c-hooks': at(42, 1, 1), // 4.39 s, speech 4.47-8.51 s
  'n19d-cli': at(44, 2, 1), // 4.87 s, speech 8.83-13.39 s
  'n20-same-keys': at(47, 1, 1), // 2.80 s
  'n21-free': at(51, 2), // 3.25 s; the closing card from bar 53
} as const;
export type NarrationId = keyof typeof NARRATION_AT;

/**
 * Where the narrator must be silent (absolute [from, to)): the app's lines with a beat either side,
 * the drop bar, the fold, the proof's impact, the Kiro lift and the closing card.
 */
export const QUIET_ZONES: { from: number; to: number; why: string }[] = [
  { from: sec(27.0), to: at(6, 2), why: 'handover, rebirth, Hello again, the drop' },
  { from: at(17, 4), to: at(18, 1, 1), why: 'the fold' },
  { from: at(27, 4) - sec(0.17), to: at(28, 2), why: "the proof's impact (s11, bar 27 beat 4)" },
  { from: at(40), to: at(40, 3), why: 'the Kiro title on the lift' },
  { from: at(48, 4), to: at(51, 2), why: 'I have something to say, the motif, the lockup fade' },
  { from: at(53), to: at(56), why: 'closing card' },
  // The app's lines are checked separately (a beat either side of VOICE_AT); the proof's impact is
  // added when the mid builder fixes its frame.
];

/**
 * Music: one track for Act 2 (110 s, bar 1 beat 1 at ACT2_START; act2-v3, built from v2's bars by
 * scripts/audio/music_extend.py). Muted where the app speaks alone.
 */
export const MUSIC = {
  from: ACT2_START,
  /** Length of the track in seconds. */
  length: ACT2_BARS * 2,
  /** [from, to) absolute frames with the music fully off (hard cut). */
  mutes: [
    [at(5), at(6)],
    [at(49), at(51)],
  ] as [number, number][],
  /** [from, to) absolute frames with the music ducked under the app's voice. */
  ducks: [[at(22), at(23)]] as [number, number][],
};
