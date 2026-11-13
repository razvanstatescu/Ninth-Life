/**
 * Scene 13. Touch, keyboard, one switch (bars 33 to 34, 1:32 to 1:36). 07-revision-v2.md, section 4 (s13);
 * research-v2/15-spatial-design.md 6.5 option B, "One keypad, three inputs", on lib/stage (STYLE.md "Spatial rules").
 *
 * One statement: the same keypad, any way to press. The app's keypad (brand Keypad body="slab") stands centred and
 * frontal on the level dot floor for the whole four seconds, grounded by its contact and cast shadows. A long lens
 * (5400, optical zoom), pitch 0 with the eye raised, a yaw of 3 degrees; no camera travel, only a slow optical push.
 * The input changes in front of it, on the floor at the right, each landing on the narrator's word (n19, "Use touch,
 * a keyboard, or one switch."), whose key words build a list on the left:
 *
 *  Touch      from the hard cut on bar 33: a fingertip ring taps 9 2 8 3 7 on the eighths; each tapped key sinks
 *             and shows the pressed ring (the one ember thing) with its tone.
 *  Keyboard   three keycaps of our own slide in on the floor; 4, 6 and 7 are pressed on the eighths, and the
 *             keypad's own 4, 6 and 7 answer, each with the pressed ring.
 *  One switch the keycaps leave and a plain round switch slides in: a plum dome lit from the top left, a moon rim.
 *             The ember scan ring steps one row per beat on the kick; the switch is pressed and the row locks (the
 *             ring goes to its first key, as packages/core/src/scan.ts does); the ring steps along the keys on the
 *             beats; the switch is pressed on key 9. The cut to scene 14 on bar 35.
 *
 * No tablet, no laptop. The scan clock is the bar grid; it starts on the first beat after the switch lands, so it
 * still fits if the narration moves.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C } from '../tokens';
import { BEAT, EIGHTH, JUMP, atIn, sceneLen, sec } from '../timeline';
import { At, cameraAt, cameraVelocity, type CamKey } from '../lib/camera';
import { EASE, jump, ramp } from '../lib/anim';
import { CastShadow, GroundShadow, Plane, Studio } from '../lib/stage';
import { Keypad, keyCenter, keypadLayout, type KeyId, type KeyState } from '../components/brand/Keypad';
import { Super, keyWordFrames } from '../components/type/Type';
import { KeyTone, Sfx, SfxFile } from '../audio/Audio';
import decoded from '../data/decoded.json';
import { TouchRing } from '../components/close/Phone';
import { Keycap3D, SwitchDome, switchDomeSize } from '../components/close/Switch';

const b = (bar: number, beat = 1, eighth = 0) => atIn('s13', bar, beat, eighth);
const END = sceneLen('s13');

// ---- the narrator's words ---------------------------------------------------------------------------------
const W_TOUCH = keyWordFrames('s13', 'n19-access', 1, 1); // "touch,"
const W_KEYBOARD = keyWordFrames('s13', 'n19-access', 3, 1); // "keyboard,"
const W_SWITCH = keyWordFrames('s13', 'n19-access', 5, 2); // "one switch."
const LAND_KEYS = W_KEYBOARD[0]!;
const LAND_SWITCH = W_SWITCH[0]!;
/** UI arrivals on the floor: 16 frames, landing on the word; the keycaps leave in 10 just before the switch lands. */
const SLIDE = sec(0.27);
const LEAVE = sec(0.17);

// ---- the set (world px; the keypad's centre at the origin, the floor line under it) -------------------------
const PAD = 150;
const PADL = keypadLayout(PAD);
const DEPTH = 8;
const CAP_Z = (DEPTH * PAD) / 96 + 2; // just in front of the keys' caps
const FLOOR_Y = PADL.height / 2;
/** The inputs stand on the floor in front, at the right of the keypad. */
const INPUT_X = 600;
const INPUT_Z = 250;
const OFF_X = 1900; // where they slide in from and out to
const CAP = 150;
const CAP_GAP = 22;
const CAP_DEPTH = 30;
const CAPS = ['4', '6', '7'].map((digit, i) => ({ digit, dx: (i - 1) * (CAP + CAP_GAP) }));
const SWITCH_D = 430;
const SW = switchDomeSize(SWITCH_D);

/** The camera: long lens, optical zoom, pitch 0 with the eye raised, a slow push; the keypad stays centred. */
const LENS = { lens: 5400, zoomMode: 'lens' as const, eye: 250, rx: 0, ry: -3, rz: 0 };
const KEYS: CamKey[] = [
  { f: 0, x: 0, y: 70, zoom: 0.88, ...LENS },
  { f: END, x: 0, y: 70, zoom: 0.93, ...LENS, ease: EASE.linear }, // about 1.4% a second
];

/** A press that goes down fast, holds, and comes back up (no overshoot). */
const tap = (frame: number, f: number, hold = sec(0.1)) =>
  frame < f ? 0 : frame < f + JUMP / 2 + hold ? ramp(frame, f, JUMP / 2, 0, 1, EASE.out) : ramp(frame, f + JUMP / 2 + hold, sec(0.13), 1, 0, EASE.out);
/** The pressed ring: on with the app's 120 ms jump, off over the end of its eighth. */
const ringOf = (frame: number, f: number) => (frame < f || frame >= f + EIGHTH ? 0 : jump(frame, f) * ramp(frame, f + EIGHTH - JUMP, JUMP, 1, 0, EASE.linear));

// ---- touch: 9 2 8 3 7 on the eighths from the cut ----------------------------------------------------------
const water = decoded.sentences['i-need-water'];
const TOUCH = water.steps.slice(7, 12).map((st, i) => ({ key: st.key as KeyId, at: b(33, 1) + i * EIGHTH }));

// ---- keyboard: 4, 6, 7 on the eighths after the keycaps land ----------------------------------------------
const CAPS_AT0 = Math.ceil((LAND_KEYS + JUMP / 2) / EIGHTH) * EIGHTH;
const KEYCAPS = CAPS.map((c, i) => ({ ...c, at: CAPS_AT0 + i * EIGHTH }));
const CAPS_OUT = LAND_SWITCH - SLIDE + sec(0.03);

// ---- one switch: the scan ---------------------------------------------------------------------------------
/** The first beat at or after the switch lands (at the latest bar 34 beat 2, so the whole sequence fits). */
const S0 = Math.min(Math.ceil(LAND_SWITCH / BEAT) * BEAT, b(34, 2));
const PRESS_ROW = S0 + EIGHTH;
const PRESS_KEY = S0 + 2 * BEAT + EIGHTH;
type Ring = { row: number } | { key: KeyId };
const RING: { at: number; ring: Ring }[] = [
  // The scan is running as the switch arrives: the ring shows once the last keycap's ring is gone (one ember thing).
  { at: Math.min(S0 - EIGHTH, CAPS_AT0 + 3 * EIGHTH), ring: { row: 1 } },
  { at: S0, ring: { row: 2 } },
  { at: PRESS_ROW, ring: { key: '7' } }, // the row locks: the ring goes to its first key
  { at: S0 + BEAT, ring: { key: '8' } },
  { at: S0 + 2 * BEAT, ring: { key: '9' } },
];
const SCAN_STEPS = [S0, S0 + BEAT, S0 + 2 * BEAT];

/** The scan ring around a row or a key of the keypad (keypad px), as the app draws it. */
const RingBox: React.FC<{ ring: Ring; alpha: number }> = ({ ring, alpha }) => {
  if (alpha <= 0) return null;
  const k = PAD / 96;
  const isRow = 'row' in ring;
  const c = isRow ? null : keyCenter(ring.key, PAD);
  const left = isRow ? PADL.pad : PADL.width / 2 + c!.x - PAD / 2;
  const top = isRow ? PADL.pad + ring.row * (PAD + PADL.gap) : PADL.height / 2 + c!.y - PAD / 2;
  const w = isRow ? 3 * PAD + 2 * PADL.gap : PAD;
  return (
    <div
      style={{
        position: 'absolute',
        left: left - 6 * k,
        top: top - 6 * k,
        width: w + 12 * k,
        height: PAD + 12 * k,
        borderRadius: 30 * k,
        boxShadow: `0 0 0 ${6 * k}px ${C.ember}, 0 0 0 ${9 * k}px ${C.plum}, 0 0 ${30 * k}px rgba(255,177,61,0.35)`,
        opacity: alpha,
      }}
    />
  );
};

/** The key words, a list in the left third: each lands on its word, the earlier ones dim. */
const LIST_X = 112;
const LIST = [
  { text: 'Touch.', frames: W_TOUCH, y: 412 },
  { text: 'Keyboard.', frames: W_KEYBOARD, y: 522 },
  { text: 'One switch.', frames: W_SWITCH, y: 632 },
];

export const S13: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame, KEYS);
  const vel = cameraVelocity(frame, KEYS);

  // Where each input stands now (world x of its centre).
  const capsX = INPUT_X + (OFF_X - INPUT_X) * (1 - ramp(frame, LAND_KEYS - SLIDE, SLIDE, 0, 1, EASE.camera)) + (OFF_X - INPUT_X) * ramp(frame, CAPS_OUT, LEAVE, 0, 1, EASE.in);
  const switchX = INPUT_X + (OFF_X - INPUT_X) * (1 - ramp(frame, LAND_SWITCH - SLIDE, SLIDE, 0, 1, EASE.camera));
  const capsOn = frame >= LAND_KEYS - SLIDE && frame < CAPS_OUT + LEAVE;
  const switchOn = frame >= LAND_SWITCH - SLIDE;

  // The keypad's keys: the tapped key (touch), the key a keycap types (keyboard), key 9 when the switch picks it.
  const keys: Partial<Record<KeyId, KeyState>> = {};
  for (const t of TOUCH) {
    const r = ringOf(frame, t.at);
    if (r > 0) keys[t.key] = { press: r, sink: tap(frame, t.at) };
  }
  for (const k of KEYCAPS) {
    const r = ringOf(frame, k.at);
    if (r > 0) keys[k.digit as KeyId] = { press: r, sink: tap(frame, k.at) };
  }
  const chosen = tap(frame, PRESS_KEY, sec(0.2));
  if (chosen > 0) keys['9'] = { press: chosen, sink: chosen };

  // The scan ring: the app's 120 ms change between positions.
  const iRing = RING.reduce((acc, r, i) => (frame >= r.at ? i : acc), -1);
  const cur = iRing >= 0 ? RING[iRing]! : null;
  const curAlpha = cur ? jump(frame, cur.at) : 0;
  const prev = iRing > 0 ? RING[iRing - 1]! : null;
  const switchPress = Math.max(tap(frame, PRESS_ROW, sec(0.12)), tap(frame, PRESS_KEY, sec(0.12)));

  return (
    <AbsoluteFill style={{ backgroundColor: C.night }}>
      <Studio
        cam={cam}
        vel={vel}
        noBlur
        ground={{ y: FLOOR_Y, far: 9000, near: 2400 }}
        groundDof={{ radius: 5 }}
        glow={{ x: 52, y: 40 }}
        shadows={
          <>
            <GroundShadow x={0} z={8} w={PADL.width * 1.04} d={70} strength={0.85} />
            <CastShadow x={0} z={4} w={PADL.width} height={PADL.height} strength={0.45} />
            {capsOn
              ? CAPS.map((c) => (
                  <React.Fragment key={c.digit}>
                    <GroundShadow x={capsX + c.dx} z={INPUT_Z + 10} w={CAP * 1.12} d={64} strength={0.95} />
                    <CastShadow x={capsX + c.dx} z={INPUT_Z + 2} w={CAP} height={CAP} strength={0.55} />
                  </React.Fragment>
                ))
              : null}
            {switchOn ? (
              <>
                <GroundShadow x={switchX} z={INPUT_Z + 6} w={SWITCH_D * 1.08} d={SWITCH_D * 0.32} strength={0.95} />
                <CastShadow x={switchX} z={INPUT_Z - SW.rb} w={SWITCH_D * 0.9} height={SW.h} strength={0.5} />
              </>
            ) : null}
          </>
        }
      >
        {/* the keypad, centred and frontal, standing on the floor */}
        <At x={0} y={0}>
          <div style={{ position: 'relative', transformStyle: 'preserve-3d' }}>
            <Keypad size={PAD} depth={DEPTH} light={1} body="slab" keys={keys} />
            <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transform: `translateZ(${CAP_Z}px)` }}>
              {prev && cur ? <RingBox ring={prev.ring} alpha={1 - curAlpha} /> : null}
              {cur ? <RingBox ring={cur.ring} alpha={iRing === 0 ? curAlpha : iRing > 0 ? curAlpha : 0} /> : null}
              {TOUCH.map((t) => {
                const c = keyCenter(t.key, PAD);
                return <TouchRing key={t.at} x={PADL.width / 2 + c.x} y={PADL.height / 2 + c.y} d={104} at={t.at} hold={sec(0.08)} />;
              })}
            </div>
          </div>
        </At>

        {/* keyboard: three keycaps of our own on the floor */}
        {capsOn
          ? KEYCAPS.map((c) => (
              <Plane key={c.digit} x={capsX + c.dx - CAP / 2} y={FLOOR_Y - CAP} z={INPUT_Z}>
                <Keycap3D digit={c.digit} size={CAP} depth={CAP_DEPTH} sink={tap(frame, c.at)} />
              </Plane>
            ))
          : null}

        {/* one switch: the dome on the floor */}
        {switchOn ? (
          <Plane x={switchX - SWITCH_D / 2} y={FLOOR_Y - SW.h + SW.rb} z={INPUT_Z}>
            <SwitchDome size={SWITCH_D} press={switchPress} />
          </Plane>
        ) : null}
      </Studio>

      {/* n19's key words, a list in the left third. */}
      {LIST.map((item, i) => {
        const next = LIST[i + 1];
        const dim = next ? ramp(frame, next.frames[0]!, sec(0.15), 0, 1, EASE.out) : 0;
        return (
          <Super
            key={item.text}
            text={item.text}
            at={item.frames[0]!}
            wordFrames={item.frames}
            size={92}
            x={LIST_X}
            y={item.y}
            align="left"
            maxWidth={700}
            style={{ opacity: 1 - 0.6 * dim }}
          />
        );
      })}

      {/* Touch: the key tones of 9 2 8 3 7. */}
      {TOUCH.map((t) => (
        <KeyTone key={`t${t.at}`} k={t.key} at={t.at} volume={0.5} />
      ))}
      {/* Quiet ticks as the inputs land (under his words: no whooshes). */}
      <Sfx id="tick" at={LAND_KEYS} volume={0.3} />
      <Sfx id="tick" at={LAND_SWITCH} volume={0.3} />
      {KEYCAPS.map((k) => (
        <KeyTone key={`k${k.at}`} k={k.digit} at={k.at} volume={0.55} />
      ))}
      {/* The scan clock on the kick, the switch on the presses, key 9's tone when it is chosen. */}
      {SCAN_STEPS.map((f) => (
        <Sfx key={`s${f}`} id="tick" at={f} volume={0.32} />
      ))}
      <SfxFile src="audio/sfx/v2/switch-press.wav" at={PRESS_ROW} volume={0.6} />
      <SfxFile src="audio/sfx/v2/switch-press.wav" at={PRESS_KEY} volume={0.6} />
      <KeyTone k="9" at={PRESS_KEY} volume={0.5} />
    </AbsoluteFill>
  );
};
