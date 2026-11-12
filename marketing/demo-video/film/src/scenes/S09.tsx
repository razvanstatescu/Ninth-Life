/**
 * Scene 9, the problem, and the fold (bars 9-17). Second cut: 07-revision-v2.md s09; research-v2/11 4.2A ("the
 * conversation moves on"); research-v2/12 (the fold); spatial rework on lib/stage (STYLE.md "Spatial rules";
 * research-v2/15, 6.1 A "One table, frontal").
 *
 * One frontal world on s10's rig (lens 5400 in lens mode, the eye raised to 302, no pitch or yaw) and s10's ground:
 * the person's side floats over the level floor, the switch stands on it, the other person's lines are on a back plane
 * in the same world, and every push is optical.
 *
 *  9-10  Lands from x1.15 out of s08's dive. "What do you need?" opens on the back plane, upper left, and starts to
 *        drift up, as time does. The person's side: a reply field over a plain grid of the 26 letters, the switch to
 *        the right. n08, key words "Type to talk." and, small, "For an afternoon, or for good."
 *  11-12 n09: a closer look (optical push; the conversation goes up out of the frame and comes back with the pull).
 *        A fingertip comes in from below, hovers over I (its shadow on the cells), comes down between I and J: J
 *        registers, then it is deleted. "Hard to hit."
 *  13-14 n10: back to home with the switch, which comes on. The ember highlight steps one cell per beat, A to I, a
 *        tick each. "Every letter is a wait." In the narrator's pause "Tea?" opens where the question was.
 *  15    n11: the focus racks back to the conversation; the stack makes room, the question leaves the top of the
 *        frame and "I'll get you tea." lands; the focus comes back to the reply just as the switch picks I.
 *  16-17 Up and in on the words. n12: a plain grey chip rises from behind the field, offers "I need tea" and writes
 *        it into the reply: words nobody typed. "Words in your mouth."
 *  17/4  The fold, narrator silent: the cells fly in their own depth lanes into s10's keypad, which grows out of the
 *        ember cell as it becomes key 4; the field steps back behind it, s10's They said comes down into its place,
 *        a reverse swell peaks on the landing. The last frame is s10's frame 0, drawn with s10's own parts.
 *
 * No numbers, no comparison, no "faster", no "fewer presses"; the chip looks like no real app.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C } from '../tokens';
import { sec } from '../timeline';
import { useCamera, type Cam, type CamKey } from '../lib/camera';
import { EASE, mix, ramp } from '../lib/anim';
import { Studio } from '../lib/stage';
import { Sfx } from '../audio/Audio';
import { Super } from '../components/type/Type';
import { LandingKeypad, LandingShadows, SAY_BACK_H, TheySaidBack, landingStage } from '../components/mid/landing';
import { DRIFT_X, HOME, LAND, LANDING_CAM, MACRO, TALK, WORDS, WORDS_COL, crispAt, fieldTopOn } from '../components/problem/layout';
import {
  CAM_T,
  CHIP_T,
  END,
  FOLD,
  KW,
  LAST,
  OUT,
  PLUM_OUT,
  RACK,
  SAY_IN,
  SCAN_STEPS,
  SELECT,
  TALK_AT,
  TOUCH_T,
  scanStep,
} from '../components/problem/time';
import { Talk } from '../components/problem/Talk';
import { Side } from '../components/problem/Side';
import { Fold } from '../components/problem/Fold';
import { Shadows } from '../components/problem/Shadows';
import { useLegendGlyphs } from '../components/problem/glyphs';

/** s10's They said line: the question, back in the app's own panel. */
const SAID = 'What do you need?';
/** The aperture for n11's rack focus (about 6 px of blur on the person's side); s10's own from the fold on. */
const RACK_APERTURE = 90;

/**
 * A hold: the camera trucks slowly right (and breathes in a little), so the floor's rows and the back plane slide at
 * their own speeds (parallax; an optical zoom alone has none).
 */
const drift = (c: Cam): Partial<Cam> => ({ x: c.x + DRIFT_X, zoom: c.zoom * 1.01 });

const CAMERA: CamKey[] = [
  // Lands from s08's dive at x1.15.
  { f: 0, ...HOME, zoom: HOME.zoom * 1.15 },
  { f: CAM_T.landed, ...HOME },
  { f: CAM_T.push.from, ...drift(HOME), ease: EASE.linear },
  // n09: a closer look at the small keys.
  { f: CAM_T.push.to, ...MACRO, ease: EASE.camera },
  { f: CAM_T.pull.from, ...drift(MACRO), ease: EASE.linear },
  // n10: back to home, with the switch.
  { f: CAM_T.pull.to, ...HOME, ease: EASE.camera },
  { f: CAM_T.up.from, ...drift(HOME), ease: EASE.linear },
  // After the switch has picked I: up and in on the words.
  { f: CAM_T.up.to, ...WORDS, ease: EASE.camera },
  { f: CAM_T.fold.from, ...drift(WORDS), ease: EASE.linear },
  // The fold: on into s10's frame-0 camera.
  { f: CAM_T.fold.to, ...LANDING_CAM, ease: EASE.flight },
];

/** Super y (its centre) for a block of `lines` lines whose top is at `top`. */
const centreOf = (top: number, lines: number, size: number) => top + (lines * size * WORDS_COL.lineHeight) / 2;
const TOP = { home: fieldTopOn(HOME), macro: fieldTopOn(MACRO), words: fieldTopOn(WORDS) };

const Supers: React.FC = () => {
  const col = { align: 'left' as const, x: WORDS_COL.x, maxWidth: WORDS_COL.maxWidth, size: WORDS_COL.size, lineHeight: WORDS_COL.lineHeight };
  return (
    <>
      <Super text="Type to talk." at={KW.type[0]!} wordFrames={KW.type} out={OUT.type} {...col} y={centreOf(TOP.home, 1, WORDS_COL.size)} />
      <Super
        text={'For an afternoon,\nor for good.'}
        at={KW.afternoon[0]!}
        wordFrames={KW.afternoon}
        out={OUT.type}
        {...col}
        size={WORDS_COL.small}
        weight={700}
        letterSpacing="0"
        color={C.inkMuted}
        y={centreOf(TOP.home + WORDS_COL.size * WORDS_COL.lineHeight + 30, 2, WORDS_COL.small)}
      />
      <Super text="Hard to hit." at={KW.hard[0]!} wordFrames={KW.hard} out={OUT.hard} {...col} y={centreOf(TOP.macro, 1, WORDS_COL.size)} />
      <Super text={'Every letter\nis a wait.'} at={KW.wait[0]!} wordFrames={KW.wait} out={OUT.wait} {...col} y={centreOf(TOP.home, 2, WORDS_COL.size)} />
      <Super text={'Words in\nyour mouth.'} at={KW.mouth[0]!} wordFrames={KW.mouth} out={OUT.mouth} outMode="up" {...col} y={centreOf(TOP.words, 2, WORDS_COL.size)} />
    </>
  );
};

/** Every sound is an effect of this scene; all of them dip under the narrator by themselves. */
const Sounds: React.FC = () => (
  <>
    {Object.values(TALK_AT).map((f) => (
      <Sfx key={`talk${f}`} id="tick" at={f} volume={0.3} />
    ))}
    {/* The wrong key, then its deletion. */}
    <Sfx id="tick" at={TOUCH_T.tap} volume={0.5} playbackRate={0.8} />
    <Sfx id="tick" at={TOUCH_T.del} volume={0.25} playbackRate={1.3} />
    {/* One tick per scan step; the switch picks I. */}
    {Array.from({ length: SCAN_STEPS }, (_, k) => (
      <Sfx key={`scan${k}`} id="tick" at={scanStep(k)} volume={0.35} />
    ))}
    <Sfx id="button" at={SELECT} volume={0.5} />
    {/* The chip lands, then writes. */}
    <Sfx id="tick" at={CHIP_T.in} volume={0.3} playbackRate={1.15} />
    <Sfx id="tick" at={CHIP_T.write} volume={0.3} playbackRate={0.9} />
    {/* The fold: a reverse swell (0.5 s, peaking at its end) that peaks on the landing, bar 18 beat 1. */}
    <Sfx id="reverse-swell" at={END - sec(0.5)} volume={0.7} />
  </>
);

/** s10's frame 0, exactly (components/mid/landing.tsx, the mid builder's): the fold's last frame. */
const Landing: React.FC = () => (
  <AbsoluteFill>
    <Studio cam={LANDING_CAM} {...landingStage()} shadows={<LandingShadows />}>
      <LandingKeypad keys={{ [LAND.ember]: { lit: 1 } }} spillFrom={LAND.ember} spill={LAND.spill} />
      <TheySaidBack text={SAID} />
    </Studio>
  </AbsoluteFill>
);

export const S09: React.FC = () => {
  const frame = useCurrentFrame();
  const { cam, vel } = useCamera(CAMERA);
  const glyphs = useLegendGlyphs(LAND.key);
  // n11: the focus racks to the conversation and back (0..1).
  const rack = ramp(frame, RACK.out.from, RACK.out.dur, 0, 1, EASE.inOut) * ramp(frame, RACK.back.from, RACK.back.dur, 1, 0, EASE.inOut);
  const stage = landingStage();
  const plum = 1 - ramp(frame, 0, PLUM_OUT, 0, 1, EASE.out);
  // s10's They said comes down into its place from above the frame.
  const sayIn = ramp(frame, SAY_IN.from, SAY_IN.dur, 0, 1, EASE.camera);
  return (
    <AbsoluteFill style={{ backgroundColor: C.night }}>
      {frame >= LAST ? (
        <Landing />
      ) : (
        <>
          {/* No motion blur: nothing in this scene is a whip (STYLE.md "Spatial rules"), and text is read throughout. */}
          <Studio
            cam={cam}
            vel={vel}
            noBlur
            {...stage}
            focusZ={mix(stage.focusZ, TALK.z, rack)}
            aperture={frame < FOLD ? RACK_APERTURE : stage.aperture}
            shadows={<Shadows />}
          >
            <Talk rack={rack} />
            <Side rack={rack} crisp={crispAt(cam.zoom)} />
            {frame >= FOLD ? <Fold glyphs={glyphs} /> : null}
            {frame >= SAY_IN.from ? <TheySaidBack text={SAID} dy={-(SAY_BACK_H + 520) * (1 - sayIn)} /> : null}
          </Studio>
          <Supers />
          {plum > 0 ? <AbsoluteFill style={{ backgroundColor: C.plum, opacity: plum }} /> : null}
        </>
      )}
      <Sounds />
    </AbsoluteFill>
  );
};
