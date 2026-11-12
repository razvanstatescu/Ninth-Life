/**
 * Every time in Act 1, in FILM SECONDS (03-script-storyboard.md, scenes 1-5). Scenes turn them into
 * local frames with tIn('s0N', t); Act1Sound (mounted at frame 0) uses sec(t).
 *
 * Deviations from the storyboard, so every line stays on screen at least 1.8 s:
 * - the second static burst of scene 3 is at 16.5 (storyboard 16.2), the keypad close-up follows it;
 * - scene 5's lines 2-4 arrive at 23.2, 24.4 and 25.6 (storyboard 23.4, 24.8, 26.2).
 */
export const T = {
  // Scene 1: power on
  switchOn: 1 / 3, // after 20 frames of black
  osd: 0.8, // "ch 09", "no signal"
  thin: 2.5, // the static thins, a dim picture starts to hold
  roll1: [2.55, 2.95] as const,
  roll2: [3.05, 3.3] as const,
  lock: 3.35,
  osdNoSignalOff: 2.5,
  osdChannelOff: 4.0,

  // Scene 2: nine keys
  shot2a: 4.0, // the whole phone; "we used to write with 9 keys."
  burst1: 6.0, // 6 frames of static, then the pixel screen
  burst1Len: 0.1,
  hello: [6.5, 7.0, 7.5, 8.0, 8.5], // keys 4 3 5 5 6
  line2b: 7.5, // "one thumb. one press per letter."
  line2bOut: 10.6,

  // Scene 3: the phone worked out the word
  good: [11.0, 11.4, 11.8, 12.2], // keys 4 6 6 3 on a new line
  next: [12.8, 13.4], // the Next key twice: good -> home -> gone
  line3a: 12.7, // "the phone worked out the word."
  burst2: 14.6,
  burst2Len: 0.1,
  shot3b: 14.7, // the worn key; "a whole sentence, from a few keys."
  burst3: 16.5,
  burst3Len: 0.12,
  shot4a: 16.62, // the keypad close-up, lit (continues into scene 4)

  // Scene 4: the keys went away
  rowsOut: [17.0, 17.4, 17.8, 18.2], // one row every 0.4 s, top to bottom
  line4a: 17.0, // "then glass replaced the keys."
  shot4b: 18.8, // the dusty phone; "the keypad went quiet."
  switchOff: 20.6, // collapse to a line (10 frames), then to a dot (20 frames)

  // Scene 5: the dot
  lines5: [22.0, 23.2, 24.4, 25.6],
  wink: 24.8,
  winkLen: 0.6,
  warm: 26.2,
  warmLen: 1.3,
  linesOut: 27.5,
  end: 28.0,
} as const;

/** The act's words, exactly as in the storyboard. */
export const WORDS = {
  s2a: 'we used to write with 9 keys.',
  s2b: 'one thumb. one press per letter.',
  s3a: 'the phone worked out the word.',
  s3b: 'a whole sentence, from a few keys.',
  s4a: 'then glass replaced the keys.',
  s4b: 'the keypad went quiet.',
  s5: ['old is not the same as bad.', 'it had few keys. big ones.', 'it could write with no signal.', 'it still has something to say.'],
  channel: 'ch 09',
  noSignal: 'no signal',
} as const;
