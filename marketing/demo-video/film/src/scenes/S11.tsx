/**
 * Scene 11, the proof (bars 24-29), on the spatial stage: research-v2/15 6.3 A, "Lock and key, frontal"
 * (STYLE.md "Spatial rules"). One world, one level floor, a long lens in lens mode, pitch 0, the eye raised.
 *
 *  24  Starts on s10's last frame: the real phone standing on the floor, turned 4 degrees. A lens push into "water"
 *      while the turn settles to 0; the app's proof chip forms round the screen's own word (check and word only).
 *      The phone recedes back and left, darkening and defocused, as the chip comes down to the lock: a strip of the
 *      keypad's moon panel grows out from behind it and the five keys pressed for "water" rise out of the strip.
 *  25-26  n15. The model's suggestion slides in along the floor from the right: the "Model ranking (opt-in)" blade,
 *      "wafer", its code 9 2 3 3 7 as five teeth on its top edge, each under its key (one silhouette).
 *  26-27  n16. A truck left for "Every word must match.", then a lens push into the columns. The teeth extend one per
 *      eighth like pistons: 9 meets its key (solid mint ring, check badge, lock click), 2 meets its key; 3 stops short
 *      of 8: the impact on bar 27 beat 4 (abs 4890): the tooth holds 3 frames, a dashed pink ring and an x badge on
 *      key 8, the tooth outlined dashed pink, a small bloom, a low "no" and a sub hit, a 4% push.
 *  28-29  The strike over "wafer"; the teeth retract and the blade slides back and right, out of the lock's line,
 *      darkening and defocusing (never cut, never transparent). The camera pulls back; "water" matches every key: 8, 3
 *      and 7 take their check. n17. One low sweep on the chip, a slow drift. s12 starts on the last frame.
 * Each code shows once: the keys are water's code, the teeth are wafer's.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C } from '../tokens';
import { sec } from '../timeline';
import { useCamera, type Cam } from '../lib/camera';
import { DepthBlur, Plane, Studio } from '../lib/stage';
import { EASE, impact, jump, ramp } from '../lib/anim';
import { LightSweep } from '../components/brand/Studio';
import { Super } from '../components/type/Type';
import { Sfx, SfxFile } from '../audio/Audio';
import {
  BEZEL,
  BLADE,
  BLADE_BOX,
  Blade,
  BladeReflection,
  CHIP,
  FLOOR,
  Grounding,
  KDEPTH,
  KGAP,
  KPAD,
  KEYS,
  KS,
  PhoneSlab,
  ProofKey,
  REJECT,
  STRIP,
  Strip,
  TOOTH,
  WaterChip,
  phoneStage,
  type ToothState,
  type Verdict,
} from '../components/mid/set3';
import { PHONE_H, PHONE_W, PHONE_WATER, WATER } from '../components/mid/phone';
import type { Capture } from '../components/mid/capture';
import * as M from '../components/mid/s11';

// ---- the set's state --------------------------------------------------------------------------------------------------
export type ProofState = {
  phone: { on: boolean; dx: number; dz: number; veil: number; frameVeil?: number; capture: Capture | null; status: string; screen?: React.ReactNode; glass?: number; extra?: React.ReactNode; clip?: string };
  chip: { on: boolean; x: number; y: number; z: number; form: number; widen: number; dim: number; sweep: number };
  strip: { on: boolean; grow: number; keyIn: number[]; sink?: number[]; rings: (Verdict | undefined)[]; badges: (Verdict | undefined)[]; dim: number; x: number; y: number; z: number; scale: number };
  blade: { on: boolean; dx: number; dz: number; dim: number; teeth: ToothState[]; reject: number; strike: number };
  bloom: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The whole set at an s11 frame (s12 starts from proofState(END - 1)). */
export const proofState = (frame: number): ProofState => {
  // The subject's clock: it holds 3 frames on the impact, then runs on.
  const t = impact(frame, M.IMPACT, M.HOLD);
  const retreat = ramp(frame, M.RETREAT.from, M.RETREAT.dur, 0, 1, EASE.inOut);
  const descend = ramp(frame, M.DESCEND.from, M.DESCEND.dur, 0, 1, EASE.flight);
  const exit = ramp(frame, M.EXIT.from, M.EXIT.dur, 0, 1, EASE.inOut);
  const retract = ramp(frame, M.RETRACT.from, M.RETRACT.dur, 0, 1, EASE.camera);

  const teeth: ToothState[] = KEYS.map((_, i) => {
    if (i < REJECT.diffAt) {
      const at = M.CHECK_AT[i]!;
      return { fit: true, ext: ramp(t, at - M.EXTEND, M.EXTEND, 0, TOOTH.gap, EASE.out) * (1 - retract), verdict: jump(t, at) };
    }
    if (i === REJECT.diffAt) {
      // It stops short: 3 is not 8. The outline lands on the hit itself, on the real clock.
      return { fit: false, ext: ramp(t, M.IMPACT - 6, 6, 0, TOOTH.gap * 0.42, EASE.out) * (1 - retract), verdict: ramp(frame, M.IMPACT, 3, 0, 1, EASE.out) };
    }
    return { fit: true, ext: 0, verdict: 0 };
  });

  // Verdicts on the keys: 9 and 2 fit; 8 refuses wafer's 3; then "water" matches every key.
  const confirm = (j: number) => ramp(frame, M.CONFIRM_AT[j]!, 6, 0, 1, EASE.out);
  const rejectGone = ramp(frame, M.EXIT.from + sec(0.2), sec(0.35), 0, 1, EASE.out);
  const rings: (Verdict | undefined)[] = KEYS.map((_, i) => {
    if (i < REJECT.diffAt) return teeth[i]!.verdict > 0 ? { amount: teeth[i]!.verdict, fit: true } : undefined;
    const j = i - REJECT.diffAt;
    if (confirm(j) > 0) return { amount: confirm(j), fit: true };
    if (i === REJECT.diffAt && teeth[i]!.verdict > 0) return { amount: teeth[i]!.verdict * (1 - rejectGone), fit: false };
    return undefined;
  });

  return {
    phone: {
      on: retreat < 1,
      dx: M.PHONE_AWAY.x * retreat,
      dz: M.PHONE_AWAY.z * retreat,
      veil: M.PHONE_AWAY.veil * retreat,
      capture: PHONE_WATER,
      status: 'On device',
      screen: frame >= M.FORM.from ? <WordGone /> : undefined,
    },
    chip: {
      on: frame >= M.FORM.from,
      x: lerp(M.CHIP_ON_PHONE.x, M.CHIP_REST.x, descend),
      y: lerp(M.CHIP_ON_PHONE.y, M.CHIP_REST.y, descend),
      z: lerp(M.CHIP_ON_PHONE.z + 70 * ramp(frame, M.LIFT.from, M.LIFT.dur, 0, 1, EASE.out), M.CHIP_REST.z, descend),
      form: ramp(frame, M.FORM.from, M.FORM.dur, 0, 1, EASE.camera),
      widen: ramp(frame, M.WIDEN.from, M.WIDEN.dur, 0, 1, EASE.inOut),
      dim: 0,
      sweep: ramp(frame, M.SWEEP.from, M.SWEEP.dur, 0, 1, EASE.inOut),
    },
    strip: {
      on: frame >= M.STRIP_IN.from,
      grow: ramp(frame, M.STRIP_IN.from, M.STRIP_IN.dur, 0, 1, EASE.camera),
      keyIn: KEYS.map((_, i) => ramp(frame, M.KEYS_IN + M.KEY_ORDER[i]! * M.KEY_STEP, sec(0.2), 0, 1, EASE.camera)),
      rings,
      badges: rings,
      dim: 0,
      x: M.STRIP_LEFT,
      y: M.STRIP_TOP,
      z: 0,
      scale: 1,
    },
    blade: {
      on: frame >= M.BLADE_IN.from,
      dx: (1 - ramp(frame, M.BLADE_IN.from, M.BLADE_IN.dur, 0, 1, EASE.camera)) * 1900 + M.BLADE_AWAY.x * exit,
      dz: M.BLADE_AWAY.z * exit,
      dim: M.BLADE_AWAY.dim * exit,
      teeth,
      reject: jump(t, M.STRIKE.from),
      strike: ramp(t, M.STRIKE.from, M.STRIKE.dur, 0, 1, EASE.out),
    },
    bloom: ramp(frame, M.IMPACT, 4, 0, 1, EASE.out) * ramp(frame, M.IMPACT + M.HOLD + 6, sec(0.3), 1, 0),
  };
};

/** The phone's own "water", gone with the chip: the card's sunken fill over the word (screen px = image px). */
const WordGone: React.FC = () => <div style={{ position: 'absolute', left: WATER.x - 8, top: WATER.top + 6, width: WATER.w + 22, height: WATER.h - 12, background: C.surfaceSunken }} />;

// ---- the set ------------------------------------------------------------------------------------------------------------
const PHONE_BOX = { x: -BEZEL - 10, y: -BEZEL - 10, w: PHONE_W + 2 * BEZEL + 20, h: PHONE_H + 2 * BEZEL + 20 };

/** Everything that stands in the phone world for s11 (and s12's opening): the floor's shadows and the objects. */
export const ProofSet: React.FC<{
  s: ProofState;
  cam: Cam;
  vel?: { vx: number; vy: number; zoomRate: number };
  extra?: React.ReactNode;
  shadows?: React.ReactNode;
  /** The floor's light (the ground pass only), e.g. dimmed when a device's base leaves the frame. */
  groundOpacity?: number;
  /** s12 draws its own chip (becoming the pill) once it moves. */
  hideChip?: boolean;
}> = ({ s, cam, vel, extra, shadows, groundOpacity = 1, hideChip = false }) => {
  const st = s.strip;
  return (
    <Studio
      cam={cam}
      vel={vel}
      {...phoneStage({ opacity: groundOpacity })}
      shadows={
        <>
          {s.phone.on ? <Grounding x={PHONE_W / 2 + s.phone.dx} z={s.phone.dz} w={PHONE_W + 2 * BEZEL} height={PHONE_H + 2 * BEZEL} strength={1 - 0.7 * s.phone.veil} pool={1 - s.phone.veil} /> : null}
          {st.on ? <Grounding x={st.x + STRIP.w / 2} z={st.z} w={STRIP.w * st.scale} height={STRIP.h} lift={FLOOR - (st.y + STRIP.h)} strength={st.grow * (1 - st.dim)} /> : null}
          {s.blade.on ? <Grounding x={M.BLADE_LEFT + s.blade.dx + BLADE.w / 2} z={s.blade.dz} w={BLADE.w} height={BLADE.h + TOOTH.h} strength={1 - 0.5 * s.blade.dim} /> : null}
          {shadows}
        </>
      }
    >
      {/* The real phone, receding back and left (darkening, defocused). */}
      {s.phone.on ? (
        <Plane x={s.phone.dx} y={0} z={s.phone.dz}>
          {s.phone.dz < -4 ? (
            <DepthBlur z={s.phone.dz} box={PHONE_BOX}>
              <PhoneSlab capture={s.phone.capture} status={s.phone.status} veil={s.phone.veil} screen={s.phone.screen} glass={s.phone.glass} clip={s.phone.clip} frameVeil={s.phone.frameVeil} />
              {s.phone.extra}
            </DepthBlur>
          ) : (
            <>
              <PhoneSlab capture={s.phone.capture} status={s.phone.status} veil={s.phone.veil} screen={s.phone.screen} glass={s.phone.glass} clip={s.phone.clip} frameVeil={s.phone.frameVeil} />
              {s.phone.extra}
            </>
          )}
        </Plane>
      ) : null}

      {/* The blade's reflection on the floor, then the blade itself. */}
      {s.blade.on ? (
        <Plane x={M.BLADE_LEFT + s.blade.dx} y={FLOOR} z={s.blade.dz}>
          <BladeReflection teeth={s.blade.teeth} reject={s.blade.reject} strike={s.blade.strike} dim={s.blade.dim} />
        </Plane>
      ) : null}
      {s.blade.on ? (
        <Plane x={M.BLADE_LEFT + s.blade.dx} y={M.BLADE_TOP} z={s.blade.dz}>
          {s.blade.dz < -4 ? (
            <DepthBlur z={s.blade.dz} box={BLADE_BOX}>
              <Blade teeth={s.blade.teeth} reject={s.blade.reject} strike={s.blade.strike} dim={s.blade.dim} crisp={1} />
            </DepthBlur>
          ) : (
            <Blade teeth={s.blade.teeth} reject={s.blade.reject} strike={s.blade.strike} dim={s.blade.dim} />
          )}
        </Plane>
      ) : null}

      {/* The lock: the strip unfolds from under the chip; the keys come down onto it from in front. */}
      {st.on ? (
        <Plane x={st.x} y={st.y} z={st.z}>
          <Strip grow={st.grow} keyIn={(i) => st.keyIn[i]! * (1 - (st.sink?.[i] ?? 0))} dim={st.dim} />
          {KEYS.map((d, i) => {
            const p = st.keyIn[i]!;
            const sink = st.sink?.[i] ?? 0;
            if (p <= 0 || sink >= 1 || st.grow < 1) return null;
            return (
              <div key={i} style={{ position: 'absolute', left: KPAD + i * (KS + KGAP), top: KPAD, transform: `translateZ(${STRIP.depth + 1 + (1 - p) * 90 - sink * (KDEPTH + 6)}px)`, transformStyle: 'preserve-3d' }}>
                <ProofKey digit={d} ring={st.rings[i]} badge={st.badges[i]} dim={st.dim} />
              </div>
            );
          })}
        </Plane>
      ) : null}

      {/* The bloom where the third column failed (240 px, well under the flash area). */}
      {s.bloom > 0 ? (
        <Plane x={M.keyLeft(REJECT.diffAt) + KS / 2 - 120} y={M.STRIP_BOTTOM + TOOTH.gap / 2 - 120} z={60}>
          <div style={{ width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,143,166,0.32) 0%, rgba(255,143,166,0.11) 50%, rgba(255,143,166,0) 100%)', opacity: s.bloom }} />
        </Plane>
      ) : null}

      {/* "water": the proof chip. */}
      {s.chip.on && !hideChip ? (
        <Plane x={s.chip.x} y={s.chip.y} z={s.chip.z}>
          <WaterChip
            form={s.chip.form}
            widen={s.chip.widen}
            dim={s.chip.dim}
            sweep={s.chip.sweep > 0 && s.chip.sweep < 1 ? <div style={{ position: 'absolute', inset: 0, borderRadius: CHIP.r, overflow: 'hidden' }}><LightSweep progress={s.chip.sweep} intensity={0.15} width={40} /></div> : null}
          />
        </Plane>
      ) : null}
      {extra}
    </Studio>
  );
};

// ---- the scene ----------------------------------------------------------------------------------------------------------
export const S11_CAM_KEYS = [
  { f: 0, ...M.CAM_STAND_END },
  { f: M.CUT_HOLD },
  { f: M.PUSH.from + M.PUSH.dur, ...M.CAM_WATER, ease: EASE.camera },
  { f: M.DESCEND.from, ...M.CAM_WATER2, ease: EASE.linear },
  { f: M.DESCEND.from + M.DESCEND.dur + sec(0.1), ...M.CAM_SET, ease: EASE.flight },
  // n15: a slow push, never still.
  { f: M.STEP_LEFT.from, ...M.CAM_SET2, ease: EASE.linear },
  { f: M.STEP_LEFT.from + M.STEP_LEFT.dur, ...M.CAM_LEFT, ease: EASE.camera },
  { f: M.PUSH_IN.from, ...M.CAM_LEFT2, ease: EASE.linear },
  { f: M.PUSH_IN.from + M.PUSH_IN.dur, ...M.CAM_COMPARE, ease: EASE.flight },
  { f: M.IMPACT, ...M.CAM_COMPARE_CREEP, ease: EASE.linear },
  { f: M.IMPACT + M.HOLD },
  { f: M.IMPACT + M.HOLD + 7, ...M.CAM_IMPACT_PUSH, ease: EASE.camera },
  { f: M.EXIT.from },
  { f: M.EXIT.from + M.EXIT.dur, ...M.CAM_END, ease: EASE.flight },
  { f: M.END - 1, ...M.CAM_LAST, ease: EASE.inOut },
];

export const S11: React.FC = () => {
  const frame = useCurrentFrame();
  const { cam, vel } = useCamera(S11_CAM_KEYS);
  return (
    <AbsoluteFill style={{ backgroundColor: C.night }}>
      <ProofSet s={proofState(frame)} cam={cam} vel={vel} />

      <Super text={'Every word\nmust match.'} at={M.MUST[0]!} wordFrames={M.MUST} out={M.MUST_OUT} outMode="up" size={104} align="left" x={1250} y={540} maxWidth={640} />

      <Sfx id="whip" at={M.CUT_HOLD} volume={0.28} />
      <SfxFile src="audio/sfx/v2/chip.wav" at={M.FORM.from + M.FORM.dur} volume={0.45} />
      <Sfx id="tick" at={M.STRIP_IN.from + M.STRIP_IN.dur} volume={0.3} />
      <Sfx id="tick" at={M.BLADE_IN.from + M.BLADE_IN.dur} volume={0.35} />
      {/* One lock click per matching digit; the mismatch is the "no" below. */}
      <SfxFile src="audio/sfx/v2/lock-click.wav" at={M.CHECK_AT[0]!} volume={0.55} />
      <SfxFile src="audio/sfx/v2/lock-click.wav" at={M.CHECK_AT[1]!} volume={0.55} />
      <Sfx id="no" at={M.IMPACT} volume={0.7} />
      <Sfx id="sub-hit" at={M.IMPACT} volume={0.45} />
      <Sfx id="thump" at={M.STRIKE.from} volume={0.3} />
      <Sfx id="whip" at={M.EXIT.from} volume={0.2} />
      {M.CONFIRM_AT.map((at, j) => (
        <Sfx key={j} id="tick" at={at} volume={0.28} />
      ))}
    </AbsoluteFill>
  );
};
