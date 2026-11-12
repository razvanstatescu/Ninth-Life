/**
 * Scene 9's clock, local frames (bar 9 beat 1 = 0). Narrator anchors come from the measured lines
 * (components/type/Type.tsx helpers), so the scene follows NARRATION_AT if a line moves; events that are
 * music land on the eighth or beat nearest their word.
 */
import { BEAT, EIGHTH, atIn, sceneLen, sec } from '../../timeline';
import { keyWordFrames, narrEndIn, narrIn } from '../type/Type';

const S = 's09' as const;

export const END = sceneLen(S);
/** The last frame this scene draws: the landing, identical to s10's frame 0 (bar 18 beat 1 = END). */
export const LAST = END - 1;

const nextEighth = (f: number) => Math.ceil(f / EIGHTH) * EIGHTH;
const nearestEighth = (f: number) => Math.round(f / EIGHTH) * EIGHTH;
const nextBeat = (f: number) => Math.ceil(f / BEAT) * BEAT;
const nearestBeat = (f: number) => Math.round(f / BEAT) * BEAT;
/** Minimum time on screen of a super of `words` words (STYLE.md: 0.35 s a word + 0.5 s). */
const hold = (words: number) => sec(0.35 * words + 0.5);

// ---- the narrator ----------------------------------------------------------------------------------------
const line = (id: Parameters<typeof narrIn>[1]) => ({ at: narrIn(S, id), end: narrEndIn(S, id), word: (k: number) => narrIn(S, id, k) });
export const N08 = line('n08-type-to-talk');
export const N09 = line('n09-small-keys');
export const N10 = line('n10-one-switch');
export const N11 = line('n11-moves-on');
export const N12 = line('n12-words-mouth');

// ---- key words (exact excerpts, landing 2 frames before each spoken word) --------------------------------
export const KW = {
  type: keyWordFrames(S, 'n08-type-to-talk', 2, 3), // type to talk,
  afternoon: keyWordFrames(S, 'n08-type-to-talk', 5, 6), // for an afternoon, or for good.
  hard: keyWordFrames(S, 'n09-small-keys', 4, 3), // hard to hit.
  wait: keyWordFrames(S, 'n10-one-switch', 3, 5), // every letter is a wait.
  mouth: keyWordFrames(S, 'n12-words-mouth', 6, 4), // words in your mouth.
};

// ---- the fold (bar 17 beat 4 to bar 18 beat 1), the narrator silent ---------------------------------------
export const FOLD = atIn(S, 17, 4);
/** Everything of the fold has arrived one frame before the landing frame (LAST draws s10's frame 0). */
export const SETTLED = LAST - 1;
/** The ember cell ("I") flies first, into key 4's place; the keypad grows out of it. */
export const EMBER_FLIGHT = { from: FOLD, dur: sec(0.3) };
export const GROW = { from: FOLD + sec(0.17), dur: SETTLED - (FOLD + sec(0.17)) };
/** The other cells leave one key group a frame apart and arrive by SETTLED. */
export const CELL_FLIGHT = { from: FOLD + 1, dur: sec(0.33) };
export const DIGITS_IN = { from: SETTLED - sec(0.17), dur: sec(0.17) };
export const SPILL_IN = { from: SETTLED - sec(0.15), dur: sec(0.15) };
/** The field steps back behind the arriving panel, darkening. */
export const FIELD_BACK = { from: FOLD, dur: sec(0.25) };
/** The person's shadows lift away with the cells; the keypad's come in as it lands. */
export const SHADOW_OUT = { from: FOLD, dur: sec(0.2) };
export const SHADOW_IN = { from: FOLD + sec(0.22), dur: SETTLED - (FOLD + sec(0.22)) };
/** The other person's lines go on up, out of the frame. */
export const TALK_OUT = { from: FOLD, dur: sec(0.27) };
/** s10's They said comes down into its place from above the frame, where the question went. */
export const SAY_IN = { from: FOLD + sec(0.13), dur: SETTLED - (FOLD + sec(0.13)) };

// ---- super exits --------------------------------------------------------------------------------------------
export const OUT = {
  type: N09.at - sec(0.07),
  hard: KW.wait[0]! - sec(0.07),
  wait: N11.at - sec(0.03),
  /** Held its full reading time, but gone (with a quick mask up) as the fold starts. */
  mouth: Math.min(Math.max(KW.mouth[0]! + hold(4), FOLD), FOLD + sec(0.13)),
};

// ---- the other person's lines ---------------------------------------------------------------------------
/** "What do you need?" arrives with the first line; "Tea?" in the pause before n11; "I'll get you tea." on "conversation". */
export const TALK_AT = {
  question: N08.at,
  tea: nearestBeat(N11.at - BEAT),
  getTea: nextEighth(N11.word(1)),
};
/** The stack makes room for "I'll get you tea." just before it arrives: the question leaves the top of the frame. */
export const TALK_PUSH = { from: TALK_AT.getTea - sec(0.2), dur: sec(0.2) };
/** A new line opens upward out of its slot. */
export const TALK_OPEN = sec(0.13);

// ---- the fingertip (n09) -------------------------------------------------------------------------------
const TAP = nearestEighth(N09.word(4)); // "hard"
export const TOUCH_T = {
  /** Comes in from below the frame, hovers over I, comes down. */
  enter: TAP - sec(0.6),
  hover: TAP - sec(0.2),
  tap: TAP,
  lift: TAP + EIGHTH,
  gone: TAP + EIGHTH + sec(0.45),
  del: nextEighth(N09.word(6)), // "hit."
};

// ---- one switch (n10): the highlight steps one cell per beat, A to I ----------------------------------------
export const SWITCH_IN = N10.word(1) - sec(0.05); // "one": the switch comes on
export const SCAN0 = nextBeat(N10.word(1));
export const SCAN_STEPS = 9; // A..I
export const scanStep = (k: number) => SCAN0 + k * BEAT;
export const SCAN_LAST = scanStep(SCAN_STEPS - 1);
/** The switch is pressed an eighth after the highlight reaches "i": the reply gets its first letter. */
export const SELECT = SCAN_LAST + EIGHTH;

// ---- n11: a rack focus to the conversation and back --------------------------------------------------------------
/** Focus goes to the back plane as n11 starts ("What do you need?" leaves), and is back on the reply for SELECT. */
export const RACK = { out: { from: N11.at - sec(0.25), dur: sec(0.4) }, back: { from: SELECT - sec(0.4), dur: sec(0.4) } };

// ---- the suggestion (n12) ------------------------------------------------------------------------------
export const CHIP_T = {
  in: nextEighth(N12.word(2)), // "language"
  write: nextEighth(N12.word(5)), // "put"
};
export const CHIP_RISE = sec(0.2);

// ---- camera ---------------------------------------------------------------------------------------------
export const CAM_T = {
  /** Lands from the dive: zoom x1.15 to home. */
  landed: sec(0.27),
  /** n09: the closer look lands on "small". */
  push: { from: N09.at - sec(0.25), to: N09.at + sec(0.25) },
  /** Back to home, with the switch, before "one switch". */
  pull: { from: N10.at - sec(0.4), to: N10.at + sec(0.15) },
  /** Up and in on the words, after the switch has picked I and before n12. */
  up: { from: SELECT + sec(0.35), to: SELECT + sec(1.1) },
  /** The fold: the camera keeps going, into s10's frame-0 camera. */
  fold: { from: FOLD, to: LAST },
};
/** From here on the switch is below the frame for good: it is no longer drawn. */
export const SWITCH_GONE = CAM_T.up.to;

/** The plum of s08's dive clears in the first frames. */
export const PLUM_OUT = sec(0.13);
