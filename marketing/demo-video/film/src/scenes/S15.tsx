/**
 * Scene 15. Same keys, and "I have something to say" (bars 37 to 40, 1:40 to 1:48).
 * 07-revision-v2.md, section 4 (s15). Left is the past, right is now: a true side by side.
 *
 * Bars 37-38  Left, the past: the old phone as Act 1 left it, in its drawer (the Act 1 builder's act1/v2
 *             PhoneScreen on the drawer still p5, the accepted "Hello"), framed on its screen and keypad at
 *             about 70% of the frame height. Right, now: the app's keypad (brand Keypad, thickness and the
 *             top-left light) standing on the night floor, the same weight, with the "Hello again" card
 *             above it. n20, "Same keys. A ninth life.", its key words centred over both.
 *             From the first eighth of "Same", keys 4 3 5 5 6 light in step on BOTH keypads, one per
 *             eighth: the old key's green light with the old beep, the app key's pressed ring (the one
 *             ember thing) with the new tone; the card's 43556 lights digit by digit with them.
 * Bar 38 b3   The old screen dies (Act 1's switch-off, PhoneScreen offAt; power-down.wav). The right side
 *             becomes the "I have something to say" card (4 4283 766384464 86 729, decoded.json): the past
 *             leaves at the left, the keypad gives way, the card settles larger at the centre and Speak
 *             rises under it, the one ember thing, at components/close/layout.ts NINTH_KEY.
 * Bar 39 b1   Speak is pressed (a fingertip ring), then a hard cut to the sentence on night; the app's voice
 *             (VOICE_AT) and the music's stop are global; the words light and the ember pool breathes under
 *             the spoken word.
 * Bar 40      The sentence holds 2 beats, then night. Four notes of the five-note motif on eighths, in the
 *             app's tones; the fifth lands on scene 16's first frame, as the icon fades in.
 *
 * The eye match: Speak's centre at the press is NINTH_KEY, where scene 16's ninth key fades in.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C } from '../tokens';
import { EIGHTH, JUMP, SCENES, VOICE_AT, atIn, sec } from '../timeline';
import { World } from '../lib/camera';
import { EASE, jump, mix, ramp } from '../lib/anim';
import { Floor, StudioGround } from '../components/brand/Studio';
import { Keypad, keypadLayout, type KeyId, type KeyState } from '../components/brand/Keypad';
import { SpeakButton } from '../components/brand/Parts';
import { Super, SpokenLine, keyWordFrames } from '../components/type/Type';
import { KeyTone, Sfx, SfxFile } from '../audio/Audio';
import decoded from '../data/decoded.json';
import { PhoneScreen, type PlateKey } from '../components/act1/v2/PhoneScreen';
import { plate } from '../components/act1/v2/plates';
import { NowCard, nowCardHeight } from '../components/close/NowCard';
import { TouchRing } from '../components/close/Phone';
import { FloorGlow } from '../components/close/FloorGlow';
import { NINTH_KEY } from '../components/close/layout';

const b = (bar: number, beat = 1, eighth = 0) => atIn('s15', bar, beat, eighth);

// ---- time -----------------------------------------------------------------------------------------------
const SAME = keyWordFrames('s15', 'n20-same-keys', 0, 2); // "Same keys."
const NINTH = keyWordFrames('s15', 'n20-same-keys', 2, 3); // "A ninth life."
/** The rhyme: the keys of "Hello", one per eighth from the first eighth at or after "Same". */
const HELLO = decoded.sentences.hello;
const RHYME0 = Math.ceil(SAME[0]! / EIGHTH) * EIGHTH;
const RHYME = HELLO.presses.map((k, i) => ({ k, at: RHYME0 + i * EIGHTH }));
const OFF = b(38, 3); // the old screen dies; the card changes
const GLIDE = OFF + sec(0.1);
const GLIDE_DUR = sec(0.33);
const SPEAK_IN = GLIDE + GLIDE_DUR;
const RISE = sec(0.15);
const PRESS = b(39);
const CUT = PRESS + sec(0.1); // 6 frames after the press
const VOICE = VOICE_AT['something-to-say'] - SCENES.s15.from;
const NIGHT = b(40, 3); // the sentence held 2 beats of bar 40
const FADE = sec(0.2);
const MOTIF = (['4', '3', '5', '5'] as const).map((k, i) => ({ k, at: NIGHT + i * EIGHTH }));

// ---- layout (screen px) ---------------------------------------------------------------------------------
const FOOT = 962; // where both sides stand on the floor
/** Left: the photograph of the drawer, framed on the phone's screen and keypad (still y 262 to 1150). */
const PHOTO = { x: 180, w: 600, h: 790, cx: 1275, y0: 262, y1: 1150 };
const PHOTO_Y = FOOT - PHOTO.h;
const PHOTO_SCALE = PHOTO.h / (PHOTO.y1 - PHOTO.y0);
const PHOTO_ZOOM = PHOTO_SCALE / Math.max(PHOTO.w / 2560, PHOTO.h / 1440);
/** Right: the app's keypad on the floor, with the card above it; centred on x 1440. */
const RIGHT_X = 1440;
const PAD = 116;
const PADL = keypadLayout(PAD);
const PAD_DEPTH = 8;
const PAD_SIDE = PAD_DEPTH * 1.2 * (PAD / 96);
const PAD_TOP = FOOT - PAD_SIDE - PADL.height;
const CARD0 = { width: 550, scale: 1.42 };
const CARD0_Y = PAD_TOP - 34 - nowCardHeight(CARD0.scale);
const CARD0_X = RIGHT_X - (CARD0.width * CARD0.scale) / 2;
/** The end: Speak centred on the icon's ninth key of scene 16; the card above it, their left edges lined up. */
const SPEAK = { w: 230, scale: 1.6 };
const SPEAK_W = SPEAK.w * SPEAK.scale;
const SPEAK_H = 80 * SPEAK.scale;
const CARD = { width: 640, scale: 1.9 };
const CARD_X = NINTH_KEY.x - SPEAK_W / 2;
const CARD_Y = NINTH_KEY.y - SPEAK_H / 2 - 34 - nowCardHeight(CARD.scale);
/** How far the picture travels left when the past leaves. */
const SHIFT = CARD0_X - CARD_X;
const WORDS_Y = 92;

/**
 * The old key's press, made readable next to the app's ring: Act 1's own press is a subtle burn (its
 * backlight already lights every legend), so a stronger green glow (Act 1's backlight colour, never ember)
 * is laid on the pressed key's measured quad, in the still's pixels.
 */
const OLD_KEYS = plate('p5').keys;
const OldKeyFlash: React.FC<{ k: PlateKey; amount: number }> = ({ k, amount }) => {
  if (amount <= 0) return null;
  const q = OLD_KEYS[k].quad;
  const xs = q.map((p) => p[0]);
  const ys = q.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const w = Math.max(...xs) - x0;
  const h = Math.max(...ys) - y0;
  return (
    <div
      style={{
        position: 'absolute',
        left: x0 - h * 0.45,
        top: y0 - h * 0.45,
        width: w + h * 0.9,
        height: h * 1.9,
        borderRadius: h,
        background: 'radial-gradient(closest-side, rgba(232,252,190,0.85) 0%, rgba(214,244,150,0.5) 45%, rgba(205,240,140,0) 100%)',
        mixBlendMode: 'screen',
        opacity: amount,
      }}
    />
  );
};

const helloAgain = decoded.sentences['hello-again'];
const something = decoded.sentences['something-to-say'];

export const S15: React.FC = () => {
  const frame = useCurrentFrame();

  // The rhyme: one key at a time on both keypads; the card's digit lights in step and stays lit.
  const pressing = RHYME.filter((p) => frame >= p.at && frame < p.at + EIGHTH).pop();
  const ring = pressing ? jump(frame, pressing.at) * ramp(frame, pressing.at + EIGHTH - JUMP, JUMP, 1, 0, EASE.linear) : 0;
  const sink = pressing ? ramp(frame, pressing.at, JUMP / 2, 0, 1, EASE.out) * ramp(frame, pressing.at + sec(0.13), sec(0.1), 1, 0, EASE.out) : 0;
  const padKeys: Partial<Record<KeyId, KeyState>> = pressing ? { [pressing.k as KeyId]: { press: ring, sink } } : {};
  const changed = frame >= OFF;
  const card = changed
    ? { text: something.text, codes: something.codes, light: undefined }
    : { text: helloAgain.text, codes: helloAgain.codes, light: [RHYME.map((p) => (frame >= p.at ? jump(frame, p.at) : 0)), []] };
  // The app redraws the card at once; the change reads as a 120 ms jump.
  const redraw = changed ? jump(frame, OFF) : 1;

  // After the switch-off: the past leaves at the left, the keypad gives way, the card settles above Speak.
  const g = ramp(frame, GLIDE, GLIDE_DUR, 0, 1, EASE.camera);
  const shift = SHIFT * g;
  const padOut = ramp(frame, GLIDE, sec(0.2), 0, 1, EASE.in);
  const speakIn = ramp(frame, SPEAK_IN, RISE, 0, 1, EASE.camera);
  const nightOut = ramp(frame, NIGHT, FADE, 1, 0, EASE.out);

  return (
    <AbsoluteFill style={{ backgroundColor: C.night }}>
      {frame < CUT ? (
        <>
          <StudioGround glow={{ x: 50 - 12 * g, y: 46, r: 66, strength: 0.95 }} horizon={80} />
          <World cam={{ x: shift, y: 0, zoom: 1, rx: -6, ry: 0, rz: 0 }}>
            <Floor y={FOOT - 540 + 6} opacity={0.85} />
            <FloorGlow x={PHOTO.x + PHOTO.w / 2 - 960} y={FOOT - 540 + 8} w={PHOTO.w * 1.25} strength={1.2} />
            <FloorGlow x={RIGHT_X - 960} y={FOOT - 540 + 8} w={PADL.width * 1.5} strength={(1 - padOut) * 1.2} />
          </World>

          {/* then: the old phone in its drawer, framed on its screen and keypad */}
          <div
            style={{
              position: 'absolute',
              left: PHOTO.x - shift * 1.25,
              top: PHOTO_Y,
              width: PHOTO.w,
              height: PHOTO.h,
              borderRadius: 26,
              overflow: 'hidden',
              boxShadow: '0 0 0 2px rgba(141,128,194,0.35), 0 36px 90px rgba(3,2,8,0.6)',
              opacity: 1 - ramp(frame, GLIDE, GLIDE_DUR, 0, 1, EASE.out),
            }}
          >
            <PhoneScreen
              plate="p5"
              state="hello"
              w={PHOTO.w}
              h={PHOTO.h}
              zoom={PHOTO_ZOOM}
              cx={PHOTO.cx}
              cy={(PHOTO.y0 + PHOTO.y1) / 2}
              offAt={OFF}
              press={pressing ? (pressing.k as PlateKey) : null}
            >
              {pressing ? <OldKeyFlash k={pressing.k as PlateKey} amount={ring} /> : null}
            </PhoneScreen>
          </div>

          {/* now: the app's keypad on the floor (it gives way after the switch-off) */}
          {padOut < 1 ? (
            <div style={{ position: 'absolute', left: RIGHT_X - PADL.width / 2 - shift, top: PAD_TOP + 160 * padOut, opacity: 1 - padOut }}>
              <Keypad size={PAD} depth={PAD_DEPTH} light={1} keys={padKeys} />
            </div>
          ) : null}
          {/* the sentence card, above it, then settling above Speak */}
          <div style={{ position: 'absolute', left: mix(CARD0_X, CARD_X, g), top: mix(CARD0_Y, CARD_Y, g), opacity: 0.35 + 0.65 * redraw }}>
            <NowCard text={card.text} codes={card.codes} width={mix(CARD0.width, CARD.width, g)} scale={mix(CARD0.scale, CARD.scale, g)} light={card.light} />
          </div>
          {frame >= SPEAK_IN ? (
            <div style={{ position: 'absolute', left: NINTH_KEY.x - SPEAK_W / 2, top: NINTH_KEY.y - SPEAK_H / 2 + 24 * (1 - speakIn), opacity: speakIn }}>
              <SpeakButton scale={SPEAK.scale} width={SPEAK.w} pressed={frame >= PRESS ? 1 : 0} />
              <TouchRing x={SPEAK_W / 2} y={SPEAK_H / 2} d={92} at={PRESS} hold={sec(0.1)} />
            </div>
          ) : null}

          {/* n20's key words, centred over both sides. */}
          <Super text="Same keys." at={SAME[0]!} wordFrames={SAME} out={NINTH[0]} size={100} y={WORDS_Y} />
          <Super text="A ninth life." at={NINTH[0]!} wordFrames={NINTH} out={SPEAK_IN} outMode="up" size={100} y={WORDS_Y} />
        </>
      ) : nightOut > 0 ? (
        <AbsoluteFill style={{ opacity: nightOut }}>
          <StudioGround glow={{ x: 50, y: 50, r: 70, strength: 0.4 }} haze={0} />
          {/* Two lines, "I have something / to say.": the width stops "to" from staying on line one. */}
          <SpokenLine voice="something-to-say" at={VOICE} appear={CUT} size={150} maxWidth={1240} />
        </AbsoluteFill>
      ) : null}

      {/* Same keys, then and now: the old beep and the new tone on every press, in step. */}
      {RHYME.map((p) => (
        <React.Fragment key={`r${p.at}`}>
          <KeyTone k={p.k} at={p.at} set="old" volume={0.26} />
          <KeyTone k={p.k} at={p.at} volume={0.38} />
        </React.Fragment>
      ))}
      {/* The old phone dies: Act 1's power-down. */}
      <SfxFile src="audio/sfx/v2/power-down.wav" at={OFF} volume={0.4} />
      <Sfx id="tick" at={SPEAK_IN + RISE} volume={0.3} />
      <Sfx id="thump" at={PRESS} volume={0.4} />
      {/* Four notes of the motif on night; the fifth is scene 16's frame 0. */}
      {MOTIF.map((m) => (
        <KeyTone key={`m${m.at}`} k={m.k} at={m.at} volume={0.45} />
      ))}
    </AbsoluteFill>
  );
};
