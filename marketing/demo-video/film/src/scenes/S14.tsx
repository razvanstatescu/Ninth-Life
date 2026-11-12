/**
 * Scene 14. Made for Kiroween (bars 35 to 36, 1:36 to 1:40). No narration; the music lifts.
 * 07-revision-v2.md, section 4 (s14), V10; decision D15: never "Built with Kiro".
 *
 * Bar 35 b1   A hard cut on the downbeat to night: "Made for Kiroween 2026", its words on the eighths.
 * Bar 35 b3   The line rises to the top as the header, and four glass cards land in depth, one per beat
 *  to 36 b2   (beats 3 and 4, then bar 36 beats 1 and 2): Spec, Steering, Hook, Workflow. Each holds one
 *             real excerpt from .kiro/ (components/close/kiro.ts, checked by verify-kiro.ts) in mono at
 *             38 px. They land in a 2 x 2 wall and all stay to the end, so the last card is on screen
 *             1.5 s and the first 3 s. One soft light sweep crosses the wall in bar 36.
 *
 * Truth (docs/KIRO_LOG.md, product.md "How we work"): the cards show what specs, steering, hooks and a
 * workflow are in this repository; no line on screen says Kiro wrote them. No Kiro logo: the word only.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C } from '../tokens';
import { BEAT, EIGHTH, atIn, sceneLen, sec } from '../timeline';
import { EASE, mix, ramp } from '../lib/anim';
import { StudioGround } from '../components/brand/Studio';
import { Super } from '../components/type/Type';
import { Sfx } from '../audio/Audio';
import { KIRO_CARDS } from '../components/close/kiro';
import { GlassCard } from '../components/close/KiroCards';

const b = (bar: number, beat = 1, eighth = 0) => atIn('s14', bar, beat, eighth);
const END = sceneLen('s14');

// ---- time -----------------------------------------------------------------------------------------------
/** "Made for" is formed on the cut's first frame; "Kiroween" and "2026" land on the next eighths. */
const RISE = sec(0.2);
const EARLY = sec(0.03); // 2 frames: a word lands just before its eighth
const TITLE_WORDS = [-RISE - EARLY, -RISE, EIGHTH - EARLY, BEAT - EARLY];
/** The title becomes the header, landing just before the first card. */
const HEAD_MOVE = sec(0.27);
const HEAD_AT = b(35, 3) - HEAD_MOVE - EARLY;
/** One card per beat. Each starts its flight a little before its beat so it lands on it. */
const CARD_BEATS = [b(35, 3), b(35, 4), b(36, 1), b(36, 2)];
const FLY = sec(0.25);
const LEAD = sec(0.1);
/** One light sweep across the wall in bar 36, left column first. */
const SWEEP_AT = b(36, 3);
const SWEEP = sec(0.75);

// ---- layout (screen px) ---------------------------------------------------------------------------------
const HERO = { size: 128, y: 528 };
const HEAD = { size: 70, y: 112 };
/** Four 50 px excerpt lines fit with a margin (the Spec and Workflow cards); text is never clipped. */
const CARD = { w: 846, h: 398 };
const GAP = { x: 36, y: 28 };
const TOP = 186;
const slot = (i: number) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  return {
    col,
    row,
    x: 960 + (col === 0 ? -1 : 1) * (CARD.w + GAP.x) / 2,
    y: TOP + CARD.h / 2 + row * (CARD.h + GAP.y),
  };
};

export const S14: React.FC = () => {
  const frame = useCurrentFrame();
  const head = ramp(frame, HEAD_AT, HEAD_MOVE, 0, 1, EASE.camera);
  const breath = ramp(frame, CARD_BEATS[0]!, END - CARD_BEATS[0]!, 0, 1, EASE.linear);
  return (
    <AbsoluteFill style={{ backgroundColor: C.night }}>
      <StudioGround glow={{ x: 50, y: mix(48, 56, head), r: 66, strength: 0.95 }} haze={0} />

      {/* The wall: perspective, the cards slightly turned towards the centre, landing from z +360. */}
      <AbsoluteFill style={{ perspective: '2400px', perspectiveOrigin: '50% 52%' }}>
        <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `translateZ(${24 * breath}px)` }}>
          {KIRO_CARDS.map((card, i) => {
            const start = CARD_BEATS[i]! - LEAD;
            if (frame < start) return null;
            const s = slot(i);
            const p = ramp(frame, start, FLY, 0, 1, EASE.camera);
            const ry = (s.col === 0 ? 3 : -3) + (s.col === 0 ? -6 : 6) * (1 - p);
            const rx = (s.row === 0 ? -2 : 2) - 6 * (1 - p);
            const sweep = ramp(frame, SWEEP_AT + s.col * sec(0.12), SWEEP, 0, 1, EASE.inOut);
            return (
              <div
                key={card.path}
                style={{
                  position: 'absolute',
                  left: s.x - CARD.w / 2,
                  top: s.y - CARD.h / 2,
                  transform: `translate3d(${(s.col === 0 ? -1 : 1) * 60 * (1 - p)}px, ${40 * (1 - p)}px, ${360 * (1 - p)}px) rotateX(${rx}deg) rotateY(${ry}deg)`,
                  opacity: ramp(frame, start, sec(0.08), 0, 1, EASE.out),
                }}
              >
                <GlassCard card={card} width={CARD.w} height={CARD.h} sweep={sweep} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <Super
        text="Made for Kiroween 2026"
        at={TITLE_WORDS[0]!}
        wordFrames={TITLE_WORDS}
        rise={RISE}
        size={mix(HERO.size, HEAD.size, head)}
        y={mix(HERO.y, HEAD.y, head)}
        maxWidth={1800}
      />

      {/* One soft hit on the downbeat (the lift is the music's); a quiet tick as each card lands. */}
      <Sfx id="sub-hit" at={b(35)} volume={0.35} />
      {CARD_BEATS.map((f) => (
        <Sfx key={f} id="tick" at={f} volume={0.35} />
      ))}
    </AbsoluteFill>
  );
};
