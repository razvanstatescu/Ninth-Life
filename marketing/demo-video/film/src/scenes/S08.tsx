/**
 * Scene 8, the title (bars 6-8; 07-revision-v2.md s08). The music's drop: the film's launch moment.
 * Bar 6 beat 1: a type match. The icon cuts in whole; on the same frame "Ninth Life" rises out of its
 * mask (9 f) onto the baseline and cap height "Hello again." had. Right after the drop one light sweep
 * crosses the wordmark's letters (never the icon). The card pushes in about 4.5% until the dive.
 * The narrator (n07, from bar 6 beat 2): "This is Ninth Life. The old phone keypad, back as a way to talk."
 * As "The" arrives the lockup lifts (10 f) and his words land under it, an exact excerpt, word by word:
 * "The old phone keypad," then "back as a way to talk." They stay until the dive's window closes over them.
 * Bar 8 beat 4: the dive into the icon's plum centre key. Its slow first half sits under his last word with
 * no sound; it speeds up after the word, its whip peaks on the cut, and the frame ends on plum. The window
 * closes onto the keys before the moon gaps can grow (the first cut's moon pulse). s09 lands from x1.15.
 * The icon is never animated, tilted, recoloured or built up: the push, lift and dive move the camera
 * or the whole lockup.
 */
import React from 'react';
import { AbsoluteFill, Easing, useCurrentFrame } from 'remotion';
import { C } from '../tokens';
import { HEIGHT, SCENES, WIDTH, atIn, sceneLen } from '../timeline';
import { World } from '../lib/camera';
import { EASE, ramp } from '../lib/anim';
import { Sfx } from '../audio/Audio';
import { AppIcon, NightGround, Wordmark } from '../components/brand/Logo';
import { Super, keyWordFrames, narrWords } from '../components/type/Type';
import { DiveWindow, ICON, ICON_AT, TEXT_X, TITLE, centreKey, diveFrom, windowHalf } from '../components/open/Title';

const END = sceneLen('s08');
const DIVE = atIn('s08', 8, 4);
const DIVE_LEN = END - 1 - DIVE;
/** Zoom at the end of the dive: the centre key is then wider than the frame's diagonal (plum everywhere). */
const ZOOM_END = 64;
/** Slow first half (under the narrator's last word), fast second half. */
const DIVE_ZOOM = Easing.bezier(0.6, 0, 0.88, 0.25);
/** The push over the card, bars 6-8, about the frame's centre. */
const PUSH = 0.045;

/** His words on screen: "The old phone keypad," (words 4-7) and "back as a way to talk." (words 8-13). */
const LINE1 = keyWordFrames('s08', 'n07-this-is', 4, 4);
const LINE2 = keyWordFrames('s08', 'n07-this-is', 8, 6);
const WORDS = { size: 104, y1: 690, y2: 818 };
/** The lockup lifts to make room as line 1 arrives (world px, before the push). */
const LIFT = { by: -126, at: LINE1[0]! - 6, len: 10 };
/** The wordmark rises out of its mask on the drop; the light sweep follows it. */
const RISE = { at: 0, len: 9 };
const SWEEP = { at: 10, len: 40 };

/** The whip peaks 8 frames (0.13 s) after it starts: on the cut. It must start after his last word. */
const WHIP_AT = END - 8;
const N07 = narrWords('n07-this-is');
/** Where his last word ("talk.") ends, local (the file runs a little longer, on breath and room). */
const SPEECH_END = N07[N07.length - 1]!.end - SCENES.s08.from;

const liftAt = (f: number) => ramp(f, LIFT.at, LIFT.len, 0, LIFT.by, EASE.camera);
const pushAt = (f: number) => 1 + PUSH * ramp(f, 0, DIVE, 0, 1, EASE.linear);

/** Camera and the centre key's screen place. Before the dive: a push about the frame's centre. */
const keyAt = (f: number) => {
  const k = centreKey();
  const key = { x: k.x, y: k.y + liftAt(f) };
  const z0 = pushAt(Math.min(f, DIVE));
  const start = { x: WIDTH / 2 + (key.x - WIDTH / 2) * z0, y: HEIGHT / 2 + (key.y - HEIGHT / 2) * z0 };
  if (f < DIVE) return { ...diveFrom(0, 0, z0, z0, key, start), u: 0 };
  const u = ramp(f, DIVE, DIVE_LEN, 0, 1, DIVE_ZOOM);
  const s = ramp(f, DIVE, DIVE_LEN, 0, 1, EASE.inOut);
  return { ...diveFrom(u, s, z0, ZOOM_END, key, start), u: ramp(f, DIVE, DIVE_LEN, 0, 1, EASE.linear) };
};
const camAt = (f: number) => {
  const k = keyAt(f);
  return { x: k.camX, y: k.camY, zoom: k.zoom, rx: 0, ry: 0, rz: 0 };
};

export const S08: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = camAt(frame);
  const a = camAt(frame - 0.5);
  const z = camAt(frame + 0.5);
  const vel = { vx: (z.x - a.x) * cam.zoom, vy: (z.y - a.y) * cam.zoom, zoomRate: Math.log(z.zoom / a.zoom) };
  const k = keyAt(frame);
  const lift = liftAt(frame);
  const rise = ramp(frame, RISE.at, RISE.len, 0, 1, EASE.reveal);
  // The light band's centre crosses the letters from left to right (in % of the wordmark's box).
  const band = ramp(frame, SWEEP.at, SWEEP.len, -30, 130, EASE.inOut);
  const sweepOn = frame >= SWEEP.at && frame < SWEEP.at + SWEEP.len;
  const lineBox = TITLE.size * TITLE.lineHeight;
  return (
    <AbsoluteFill style={{ backgroundColor: C.night }}>
      <NightGround glow={{ x: 50, y: 50 + (lift / HEIGHT) * 100, r: 60, strength: 1 }} />
      <World cam={cam} vel={vel}>
        <div style={{ position: 'absolute', left: 0, top: lift, width: WIDTH, height: HEIGHT }}>
          <AppIcon size={ICON} style={{ position: 'absolute', left: ICON_AT.x - ICON / 2, top: ICON_AT.y - ICON / 2 }} />
          {/* The wordmark rises out of its mask into the spoken line's line box (same size, tracking, line height). */}
          <div
            style={{
              position: 'absolute',
              left: TEXT_X,
              top: TITLE.y - lineBox / 2,
              fontSize: TITLE.size,
              overflow: 'hidden',
              padding: '0.08em 0.06em 0.16em',
              margin: '-0.08em -0.06em -0.16em',
            }}
          >
            <div style={{ position: 'relative', translate: `0 ${(1 - rise) * 112}%` }}>
              <Wordmark size={TITLE.size} style={{ lineHeight: TITLE.lineHeight }} />
              {sweepOn ? (
                // One light sweep, on the letters only: a bright band clipped to the glyphs, with a soft bloom.
                <Wordmark
                  size={TITLE.size}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    lineHeight: TITLE.lineHeight,
                    color: 'transparent',
                    backgroundImage: `linear-gradient(105deg, rgba(255,255,255,0) ${band - 18}%, rgba(255,255,255,1) ${band}%, rgba(255,255,255,0) ${band + 18}%)`,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.85)) drop-shadow(0 0 26px rgba(255,255,255,0.5))',
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
      </World>
      {/* His words, under the lockup; the dive's window closes over them. */}
      <Super text="The old phone keypad," at={LINE1[0]!} wordFrames={LINE1} size={WORDS.size} y={WORDS.y1} />
      <Super text="back as a way to talk." at={LINE2[0]!} wordFrames={LINE2} size={WORDS.size} y={WORDS.y2} />
      {frame >= DIVE ? <DiveWindow sx={k.sx} sy={k.sy} half={windowHalf(k.u, k.half)} keyHalf={k.half} /> : null}
      {/* The drop: the chapter's one hit. */}
      <Sfx id="sub-hit" at={0} volume={0.85} />
      {SPEECH_END + 2 <= WHIP_AT ? <Sfx id="whip" at={WHIP_AT} volume={0.5} /> : null}
    </AbsoluteFill>
  );
};
