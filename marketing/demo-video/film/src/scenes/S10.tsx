/**
 * Scene 10, the solution (bars 18-23), on the spatial stage: research-v2/15 6.2 A, "Keypad on the floor, card in front
 * of the eye" (STYLE.md "Spatial rules"). Lens 5400 in lens mode, pitch 0, the eye raised to 302.
 *
 *  18  Frame 0 is FOLD_LANDING (components/mid/landing.tsx): the keypad standing on the level floor, turned 5 degrees
 *      inward, key 4 ember (the fold's baton); They said on its back plane: "What do you need?". n13 "So, nine big
 *      keys. One press per letter."
 *  19-20  Keys 4, Space, 6333, Space, 92837 on eighths: each key sinks, its code builds in mono under its word, the
 *      open word redraws with the decoder's real guess. A slot's other words for the same keys (decoded.json matches)
 *      sit right behind it in depth, veiled and defocused, peeking out; on Space the chosen word steps forward and the
 *      others recede into the dark. "wave" becomes "water" on the last press (a 2 frame hold).
 *  20-21  n14. A truck right along the sentence (the keypad leaves the frame whole), the card forms round the words,
 *      frontal; Speak, the one ember thing now, attaches to its bottom edge.
 *  22  Speak pressed on its eighth, 3 frames held, hard cut to the sentence on night: the app says "I need water"
 *      (SpokenLine).
 *  23  The sentence becomes the real phone's card: the screen opens round it and the camera pulls back to the whole
 *      phone standing on the floor, the turntable going from 12 to 4 degrees. s11 starts on the last frame.
 */
import React from 'react';
import { AbsoluteFill, interpolateColors, useCurrentFrame } from 'remotion';
import { C, FONT } from '../tokens';
import { EIGHTH, sec } from '../timeline';
import { aim, useCamera, type CamKey } from '../lib/camera';
import { GroundShadow, Plane, Slab, Studio } from '../lib/stage';
import { EASE, impact, jump, ramp } from '../lib/anim';
import { keyIdOf, type KeyId, type KeyState } from '../components/brand/Keypad';
import { Icon } from '../components/brand/Icon';
import { NightGround } from '../components/brand/Logo';
import { Super, SpokenLine, keyWordFrames } from '../components/type/Type';
import { KeyTone, Sfx } from '../audio/Audio';
import { LandingKeypad, LandingShadows, TheySaidBack, landingStage } from '../components/mid/landing';
import { FOLD_LANDING } from '../components/handoff';
import { Face, PHONE_RIG, PHONE_DEPTH, FACE_GAP } from '../components/mid/set3';
import { w600, MONO_ADV } from '../components/mid/metrics';
import { CARD_BOX, DPR, PHONE_H, PHONE_W, TEXT_BOX } from '../components/mid/phone';
import { CARD as HERO_CARD } from '../components/mid/HeroCard';
import { ProofSet, proofState } from './S11';
import * as L from '../components/mid/s10';
import * as M from '../components/mid/s11';

const SAID = 'What do you need?';

// ---- the typing, from decoded.json ---------------------------------------------------------------
const committedBy = (i: number) => L.SENT.presses.slice(0, i + 1).filter((p) => p === '0').length;
/** Slot k locks on the Space after it; the last slot at the collapse. */
const LOCK_AT = [L.PRESS_AT[1]!, L.PRESS_AT[6]!, L.COLLAPSE.from];
/** The press that completes slot k's code (its other words come in behind it then). */
const FULL_AT = [L.PRESS_AT[0]!, L.PRESS_AT[5]!, L.LAST_PRESS];
const FINAL = L.SENT.text.split(' '); // I need water
const FINAL_CODES = L.SENT.codes; // 4 6333 92837
/** The other words for each slot's keys (real decoder matches, chosen word removed). */
const ALTS = FINAL_CODES.map((code, k) => (L.MATCHES[code] ?? []).filter((w) => w.toLowerCase() !== FINAL[k]!.toLowerCase()).slice(0, 2));

const pressIndex = (t: number) => {
  let last = -1;
  L.PRESS_AT.forEach((p, i) => {
    if (t >= p) last = i;
  });
  return last;
};

const keyStates = (t: number) => {
  const keys: Partial<Record<KeyId, KeyState>> = {};
  // The fold's ember: key 4 lit until its own first press turns the fill into the pressed ring.
  const lit = 1 - jump(t, L.PRESS_AT[0]!);
  if (lit > 0) keys['4'] = { lit };
  const i = pressIndex(t);
  let spillFrom: KeyId | undefined = lit > 0 ? '4' : undefined;
  let spill = lit > 0 ? 0.14 * lit : 0;
  if (i >= 0) {
    const at = L.PRESS_AT[i]!;
    const id = keyIdOf(L.SENT.presses[i]!);
    const ring = jump(t, at) * (1 - jump(t, at + EIGHTH));
    const sink = ramp(t, at, 4, 0, 1, EASE.linear) * ramp(t, at + 8, 10, 1, 0);
    if (ring > 0 || sink > 0) keys[id] = { ...keys[id], press: ring, sink };
    if (ring > 0) {
      spillFrom = id;
      spill = 0.12 * ring;
    }
  }
  return { keys, spillFrom, spill };
};

const HERO_CAM: CamKey[] = [
  { f: 0, ...L.CAM0 },
  { f: L.B19, ...L.CAM_HOLD, ease: EASE.linear },
  { f: L.PRESS_AT[1]! },
  { f: L.PRESS_AT[1]! + sec(0.25), ...L.CAM_SPACE1, ease: EASE.camera },
  { f: L.PRESS_AT[6]! },
  { f: L.PRESS_AT[6]! + sec(0.25), ...L.CAM_SPACE2, ease: EASE.camera },
  { f: L.FLIGHT.from },
  { f: L.FLIGHT.from + L.FLIGHT.dur, ...L.CAM_CARD, ease: EASE.flight },
  { f: L.TO_SPEAK.from },
  { f: L.TO_SPEAK.from + L.TO_SPEAK.dur, ...L.CAM_SPEAK, ease: EASE.camera },
  { f: L.SPEAK_AT, zoom: L.CAM_SPEAK.zoom * 1.02, ease: EASE.linear },
];

/** A soft, darkened word behind a slot (a padded box with a near-invisible fill, so its blur is never clipped). */
const AltWord: React.FC<{ text: string; x: number; y: number; z: number; veil: number; blur: number }> = ({ text, x, y, z, veil, blur }) => (
  <div
    style={{
      position: 'absolute',
      left: x - 24,
      top: y - 24,
      padding: 24,
      transform: `translateZ(${z}px)`,
      background: 'rgba(20,10,46,0.004)',
      filter: blur > 0.2 ? `blur(${blur.toFixed(2)}px)` : undefined,
      fontFamily: FONT.sans,
      fontSize: L.FONT_PX,
      lineHeight: `${L.LINE_H}px`,
      fontWeight: 600,
      color: interpolateColors(Math.min(1, veil), [0, 1], [C.moon, C.night]),
      whiteSpace: 'nowrap',
    }}
  >
    {text}
  </div>
);

// ---- the hero set --------------------------------------------------------------------------------
const Hero: React.FC = () => {
  const frame = useCurrentFrame();
  // The subject's clock: "water" lands with a 2 frame hold; Speak's press holds 3 frames.
  const t = impact(frame, L.LAST_PRESS, L.WATER_HOLD);
  const { cam, vel } = useCamera(HERO_CAM);
  const { keys, spillFrom, spill } = keyStates(t);
  const i = pressIndex(t);
  const step = i >= 0 ? L.SENT.steps[i]! : null;
  const committed = i >= 0 ? committedBy(i) : 0;
  const words = step ? step.text.split(' ') : [];
  const codes = step ? step.codes : [];

  const collapse = ramp(frame, L.COLLAPSE.from, L.COLLAPSE.dur, 0, 1, EASE.camera);
  const form = ramp(frame, L.COLLAPSE.from, L.COLLAPSE.dur, 0, 1, EASE.camera);
  const sentenceW = w600(L.SENT.text, L.FONT_PX);
  const speakIn = ramp(frame, L.TO_SPEAK.from + sec(0.12), sec(0.22), 0, 1, EASE.camera);
  const pressed = ramp(frame, L.SPEAK_AT, 3, 0, 1, EASE.out);

  // The card forms from the words' box to the whole card (its face just behind the words).
  const box = { x: L.WORD_X0 - 26, y: L.TEXT_Y - 16, w: sentenceW + 52, h: L.LINE_H + 32 };
  const cx = box.x + (L.CARD.x - box.x) * form;
  const cy = box.y + (L.CARD.y - box.y) * form;
  const cw = box.w + (L.CARD.w - box.w) * form;
  const ch = box.h + (L.CARD.h - box.h) * form;

  const lastWord = words.length - 1;
  return (
    <Studio
      cam={cam}
      vel={vel}
      {...landingStage()}
      shadows={
        <>
          <LandingShadows />
          {form > 0 ? <GroundShadow x={L.CARD.x + L.CARD.w / 2 - FOLD_LANDING.stage.ground.x} z={-40} w={L.CARD.w * 1.1} d={160} lift={L.FLOOR_Y - (L.CARD.y + L.CARD.h)} strength={0.3 * form} /> : null}
        </>
      }
    >
      <TheySaidBack text={SAID} />
      <LandingKeypad keys={keys} spillFrom={spillFrom} spill={spill} />

      {/* The sentence card forms round the words: frontal, floating, its face just behind them. */}
      {form > 0 ? (
        <Plane x={cx} y={cy} z={-(L.CARD.depth + FACE_GAP)}>
          <Slab w={cw} h={ch} r={L.CARD.r * (0.5 + 0.5 * form)} depth={L.CARD.depth} layers={5} face={C.surfaceSunken} side="#170c34" sideLit="#3a2672" border={{ width: 3, color: C.line }} />
        </Plane>
      ) : null}

      {/* The slots: the chosen word in front, the other words for the same keys right behind it in depth. */}
      {FINAL.map((_, k) => {
        const shown = k < committed || (k === committed && k <= lastWord && words[k]);
        if (!shown) return null;
        const word = words[k] ?? FINAL[k]!;
        const x = L.wordX(FINAL, k);
        const locked = frame >= LOCK_AT[k]!;
        const forward = ramp(frame, LOCK_AT[k]!, sec(0.2), 0, 1, EASE.camera) * (1 - collapse);
        const isWater = k === 2 && i === L.SENT.presses.length - 1;
        const push = isWater ? ramp(t, L.LAST_PRESS + 1, 7, 0, 1, EASE.camera) * ramp(frame, L.FLIGHT.from, sec(0.3), 1, 0) : 0;
        const altIn = ramp(frame, FULL_AT[k]!, sec(0.18), 0, 1, EASE.camera);
        const altGone = ramp(frame, LOCK_AT[k]!, sec(0.3), 0, 1, EASE.in);
        return (
          <React.Fragment key={k}>
            {altIn > 0 && altGone < 1
              ? ALTS[k]!.map((alt, j) => {
                  const z = L.ALT.z[j]! * altIn - 420 * altGone;
                  const veil = Math.min(1, L.ALT.veil[j]! + (1 - altIn) * 0.4 + altGone * (1 - L.ALT.veil[j]!));
                  return <AltWord key={alt} text={alt} x={x + L.ALT.dx * (j + 1)} y={L.TEXT_Y + L.ALT.dy * (j + 1)} z={z} veil={veil} blur={L.ALT.blur[j]! + 6 * altGone} />;
                })
              : null}
            <div
              style={{
                position: 'absolute',
                left: x,
                top: L.TEXT_Y,
                transform: `translateZ(${40 * forward + 4 * push}px) scale(${1 + 0.04 * push})`,
                transformOrigin: '0% 60%',
                fontFamily: FONT.sans,
                fontSize: L.FONT_PX,
                lineHeight: `${L.LINE_H}px`,
                fontWeight: 600,
                color: locked || collapse > 0.5 ? C.ink : C.moon,
                whiteSpace: 'nowrap',
              }}
            >
              {word}
            </div>
          </React.Fragment>
        );
      })}

      {/* The keys, in mono: under each word while it is typed, then the card's key line. */}
      {codes.map((code, k) => {
        const x0 = L.wordX(FINAL, k);
        const x1 = L.codeLineX(FINAL_CODES, k);
        const x = x0 + (x1 - x0) * collapse;
        return (
          <div
            key={`c${k}`}
            style={{
              position: 'absolute',
              left: x,
              top: L.CODE_Y,
              fontFamily: FONT.mono,
              fontSize: L.CODE_PX,
              lineHeight: `${L.CODE_PX * 1.2}px`,
              fontWeight: 500,
              color: C.inkMuted,
              whiteSpace: 'pre',
              width: (code.length + 0.5) * MONO_ADV * L.CODE_PX,
            }}
          >
            {code}
          </div>
        );
      })}

      {/* Speak, attached to the card's bottom edge: the one ember thing once the keys are done. */}
      {speakIn > 0 ? (
        <Plane x={L.SPEAK.x} y={L.SPEAK.y} z={6 - 9 * pressed}>
          <div style={{ position: 'relative', width: L.SPEAK.w, height: L.SPEAK.h, transformStyle: 'preserve-3d', transformOrigin: '50% 0%', transform: `scale(${0.7 + 0.3 * speakIn})` }}>
            <Slab w={L.SPEAK.w} h={L.SPEAK.h} r={L.SPEAK.r} depth={L.SPEAK.depth * (1 - 0.6 * pressed)} layers={4} face={pressed > 0.5 ? C.emberDeep : C.ember} side="#a85a08" sideLit="#ffcf7a" />
            <Face w={L.SPEAK.w} h={L.SPEAK.h} z={L.SPEAK.depth * (1 - 0.6 * pressed)}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, fontFamily: FONT.sans, fontSize: 56, fontWeight: 800, color: C.onEmber }}>
                <Icon name="speaker" size={60} color={C.onEmber} stroke={2.5} />
                Speak
              </div>
            </Face>
          </div>
        </Plane>
      ) : null}
    </Studio>
  );
};

// ---- the narrator's key words (exact excerpts, on his words) ---------------------------------------
const NINE = keyWordFrames('s10', 'n13-nine-big-keys', 1, 3);
const ONE = keyWordFrames('s10', 'n13-nine-big-keys', 4, 4);
const FINDS = keyWordFrames('s10', 'n14-finds', 0, 4);

const KeyWords: React.FC = () => (
  <>
    <Super text="Nine big keys." at={NINE[0]!} wordFrames={NINE} out={ONE[0]! - sec(0.2)} outMode="up" size={104} align="left" x={1010} y={840} maxWidth={860} />
    <Super text="One press per letter." at={ONE[0]!} wordFrames={ONE} out={L.FLIGHT.from - sec(0.1)} outMode="up" size={88} align="left" x={1010} y={840} maxWidth={860} />
    <Super text="It finds the sentence." at={FINDS[0]!} wordFrames={FINDS} out={L.TO_SPEAK.from} outMode="up" size={88} align="center" x={960} y={972} maxWidth={1200} />
  </>
);

// ---- bar 23: the real phone ------------------------------------------------------------------------
/** The card's words as SpokenLine sets them (216 px): the phone card's 40 css px x dpr 3 at zoom 1.8, turned 12 degrees. */
const MATCH_ZOOM = 216 / (HERO_CARD.font * DPR);
const TEXT_CENTRE = { x: TEXT_BOX[0] + TEXT_BOX[2] / 2, y: TEXT_BOX[1] + TEXT_BOX[3] / 2, z: PHONE_DEPTH + FACE_GAP };
const CAM_MATCH = aim(TEXT_CENTRE, { x: 960, y: 540 }, { ...PHONE_RIG, zoom: MATCH_ZOOM, ry: -12 });

const PhoneBar: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const t = frame - from;
  const { cam, vel } = useCamera([
    { f: from, ...CAM_MATCH },
    { f: from + 5 },
    { f: from + sec(1.0), ...M.camStand(M.PHONE_STAND_ZOOM, -8), ease: EASE.flight },
    { f: L.END - 1, ...M.CAM_STAND_END, ease: EASE.linear },
  ]);
  // The screen opens round the card; the frame comes up out of the dark; the floor's light comes on.
  const open = ramp(t, 3, sec(0.3), 0, 1, EASE.camera);
  const [x, y, w, h] = CARD_BOX;
  const r = HERO_CARD.radius * DPR;
  const clip = open < 1 ? `inset(${y * (1 - open)}px ${(PHONE_W - x - w) * (1 - open)}px ${(PHONE_H - y - h) * (1 - open)}px ${x * (1 - open)}px round ${r * (1 - open)}px)` : undefined;
  const base = proofState(0);
  const s = { ...base, phone: { ...base.phone, frameVeil: ramp(t, 6, sec(0.3), 1, 0, EASE.out), clip } };
  return <ProofSet s={s} cam={cam} vel={vel} groundOpacity={ramp(t, sec(0.2), sec(0.45), 0, 1, EASE.out)} />;
};

const Sounds: React.FC = () => (
  <>
    {L.PRESS_AT.map((at, i) => (
      <KeyTone key={i} k={L.SENT.presses[i]!} at={at} volume={0.7} />
    ))}
    <Sfx id="tick" at={L.FLIGHT.from + L.FLIGHT.dur - sec(0.1)} volume={0.3} />
    <Sfx id="tick" at={L.COLLAPSE.from + L.COLLAPSE.dur} volume={0.35} />
    <Sfx id="tick" at={L.TO_SPEAK.from + L.TO_SPEAK.dur} volume={0.35} />
    <Sfx id="button" at={L.SPEAK_AT} volume={0.6} />
    <Sfx id="sub-hit" at={L.SPEAK_AT} volume={0.35} />
    <Sfx id="whoosh-2" at={L.B23 - sec(0.15)} volume={0.5} />
    <Sfx id="thump" at={L.B23 + sec(0.85)} volume={0.35} />
  </>
);

export const S10: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: C.night }}>
      {frame < L.CUT_TO_LINE ? (
        <>
          <Hero />
          <KeyWords />
        </>
      ) : frame < L.B23 ? (
        <AbsoluteFill>
          <NightGround glow={{ x: 50, y: 50, r: 64, strength: 0.55 }} />
          <SpokenLine voice="i-need-water" at={L.VOICE} appear={L.CUT_TO_LINE} size={216} />
        </AbsoluteFill>
      ) : (
        <PhoneBar from={L.B23} />
      )}
      <Sounds />
    </AbsoluteFill>
  );
};
