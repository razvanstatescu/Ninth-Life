/**
 * Scene 16. The lockup, then the closing card (bars 41 to 45, 1:48 to 1:58). The film's last frame.
 * 07-revision-v2.md, section 4 (s16) and V9: two quiet cards, nothing else.
 *
 * Bars 41-42  The lockup. Night; the icon (its ninth key plum) and "Ninth Life" fade in WHOLE over 36 f
 *             on the downbeat, with the address on one line under them (APP_URL, or "Link in the
 *             description" while it is null). Then the ninth key's ember fades in, last, at exactly the
 *             point where scene 15 pressed Speak (components/close/layout.ts NINTH_KEY): the eye match
 *             across the silence. The narrator's n21, "Ninth Life. Free, in your browser.", over it.
 * Bars 43-45  The closing card. The lockup fades out over 24 f, ending on bar 43; the intended-purpose
 *             sentence (INTENDED_PURPOSE, verbatim; verify-kiro.ts checks it against product.md) fades in
 *             alone, centred, moon on night, and stays for the last 6 s. No narration.
 *
 * Brand rule (Logo.tsx): the icon is never animated, tilted or built up; it only fades in whole, and only
 * the ninth key's ember fades in last. Sound: the motif's fifth note on frame 0 (scene 15 plays the first
 * four), one soft hit, the ninth key's own tone as its ember comes up. The music's end chord is global.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, FONT } from '../tokens';
import { atIn, sec } from '../timeline';
import { EASE, ramp } from '../lib/anim';
import { AppIcon, Wordmark } from '../components/brand/Logo';
import { StudioGround } from '../components/brand/Studio';
import { KeyTone, Sfx } from '../audio/Audio';
import { APP_URL, INTENDED_PURPOSE } from '../config';
import { ICON_BOX, LOCKUP, WORDMARK_X } from '../components/close/layout';

const b = (bar: number, beat = 1, eighth = 0) => atIn('s16', bar, beat, eighth);

/** The lockup and the address fade in whole on the downbeat (600 ms). */
const LOCKUP_IN = { at: b(41), dur: sec(0.6) };
/** The ninth key's ember, last, from beat 3 (900 ms). */
const EMBER_IN = { at: b(41, 3), dur: sec(0.9) };
/** The closing card owns the last 6 s (bar 43 to the end). */
const CARD_AT = b(43);
const LOCKUP_OUT = { at: CARD_AT - sec(0.4), dur: sec(0.4) };
const CARD_IN = { at: CARD_AT, dur: sec(0.6) };

/** The intended-purpose sentence's two sentences (joined by one space they are INTENDED_PURPOSE, verbatim). */
const SENTENCES = INTENDED_PURPOSE.split(/(?<=\.) /);

/** Optical nudge: the wordmark's caps sit centred on the bubble (Atkinson's box is taller than its caps). */
const WORDMARK_NUDGE = 8;

export const S16: React.FC = () => {
  const frame = useCurrentFrame();
  const lockup = ramp(frame, LOCKUP_IN.at, LOCKUP_IN.dur, 0, 1, EASE.out) * ramp(frame, LOCKUP_OUT.at, LOCKUP_OUT.dur, 1, 0, EASE.inOut);
  const ember = ramp(frame, EMBER_IN.at, EMBER_IN.dur, 0, 1, EASE.inOut);
  const card = ramp(frame, CARD_IN.at, CARD_IN.dur, 0, 1, EASE.out);
  const address = APP_URL ?? 'Link in the description';
  return (
    <AbsoluteFill style={{ backgroundColor: C.night }}>
      {/* The icon's own moon glow comes and goes with the lockup; the closing card is on plain night. */}
      <StudioGround glow={{ x: 50, y: 44, r: 62, strength: 0.9 * lockup }} haze={0} />

      {lockup > 0 ? (
        <AbsoluteFill style={{ opacity: lockup }}>
          <div style={{ position: 'absolute', left: ICON_BOX.x, top: ICON_BOX.y }}>
            <AppIcon size={LOCKUP.icon} ninth={ember} />
          </div>
          <div style={{ position: 'absolute', left: WORDMARK_X, top: LOCKUP.y + WORDMARK_NUDGE, transform: 'translateY(-50%)' }}>
            <Wordmark size={LOCKUP.wordmark} />
          </div>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: LOCKUP.addressY,
              transform: 'translateY(-50%)',
              textAlign: 'center',
              fontFamily: FONT.sans,
              fontSize: 54,
              lineHeight: 1.2,
              fontWeight: 700,
              color: C.inkMuted,
              whiteSpace: 'nowrap',
            }}
          >
            {address}
          </div>
        </AbsoluteFill>
      ) : null}

      {card > 0 ? (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: card }}>
          <div
            style={{
              maxWidth: 1330,
              textAlign: 'center',
              textWrap: 'balance',
              fontFamily: FONT.sans,
              fontSize: 42,
              lineHeight: 1.42,
              fontWeight: 600,
              color: C.moon,
            }}
          >
            {/* Verbatim. Each sentence starts its own line, and words never break at a hyphen. */}
            {SENTENCES.map((sentence, si) => (
              <div key={si}>
                {sentence.split(' ').map((w, i, all) => (
                  <React.Fragment key={i}>
                    <span style={{ whiteSpace: 'nowrap' }}>{w}</span>
                    {i < all.length - 1 ? ' ' : null}
                  </React.Fragment>
                ))}
              </div>
            ))}
          </div>
        </AbsoluteFill>
      ) : null}

      {/* The motif's fifth note lands on the downbeat with the lockup (scene 15 plays the first four). */}
      <KeyTone k="6" at={LOCKUP_IN.at} volume={0.45} />
      <Sfx id="sub-hit" at={LOCKUP_IN.at} volume={0.35} />
      {/* The ninth key's own tone as its ember comes up: a tone, quiet, under "Life." */}
      <KeyTone k="9" at={EMBER_IN.at} volume={0.3} />
    </AbsoluteFill>
  );
};
