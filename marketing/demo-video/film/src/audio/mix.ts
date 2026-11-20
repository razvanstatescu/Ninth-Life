/**
 * Mix values for the second cut. The sound designer owns the NUMBERS in this file (research-v2/14, section 4);
 * the lead owns how they are applied (Audio.tsx). Gains in dB unless the name says otherwise.
 */
export const MIX = {
  /** Linear gain on the narration files (they are finished at the narrator target, 2 LU under the app voice). */
  narrator: 1,
  /** Linear gain on Act 1's hushed lines (about -2 LU: no music under them, only the room). */
  narratorAct1: 0.79,
  /** Linear gain on the app's voice files. */
  appVoice: 1,
  /** Linear base gain on the music. */
  music: 0.85,
  /**
   * Music dip under the narrator, per stem when stems exist, else `full`. Set for music v2 (about 6 dB quieter than
   * v1): measured over every Act 2 line, the music sits 11.7 to 24.9 LU under him (median 15.5; target at least
   * 11, Torcoli et al. 2019). The drums (the soft kick) dip harder than the rest. Was -15 / -18 / -12 for v1.
   */
  duckUnderNarrator: { full: -12, drums: -14, other: -10 },
  /** Music dip under the app's voice where timeline MUSIC.ducks says so. */
  duckUnderApp: -12,
  /** Effects and key tones dip under the narrator by this much. */
  sfxUnderNarrator: -3,
  /** Duck envelope, seconds: down before the first word, back up after the last. */
  attack: 0.12,
  release: 0.45,
};

/**
 * The Act 2 music. `full` is always set; when the stems exist, `drums` and `other` replace it (they sum to
 * the full track) so the narrator can duck them differently.
 */
export const MUSIC_FILES: { full: string; drums: string | null; other: string | null } = {
  // The "drive" variant (a soft shaker on eighths in the drop, bars 18-21, access and the lift, 14 dB under
  // the music) is the lead's default; the plain version is act2-v2.wav / act2-v2-drums.wav.
  // Third cut: act2-v3, the same bars rearranged to 55 (scripts/audio/music_extend.py).
  full: 'audio/music/act2-v3-drive.wav',
  drums: 'audio/music/act2-v3-drive-drums.wav',
  other: 'audio/music/act2-v3-other.wav',
};
