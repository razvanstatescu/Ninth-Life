/**
 * The phone world on the spatial stage (STYLE.md "Spatial rules"; research-v2/15, 6.3 A and 6.4 A), shared by s10's
 * last bar, s11 and s12. World px = image px of the phone capture (1170 x 2100, 3 per CSS px); the screen's top-left
 * corner is world (0, 0); everything stands on one level floor, the phone's base line.
 *
 *  PHONE_RIG, phoneStage()   the lens (12000 world px in lens mode: about F 5200 at the whole-phone framing, the act's
 *                            100 mm look in this world's larger px), the eye and the <Studio> ground
 *  PhoneSlab                 the real phone: the capture in a frame with real thickness and a moon rim, no drop shadow
 *  Grounding                 a light pool, contact shadow and cast shadow on the floor for any standing slab
 *  ProofKey, Strip           the lock: the five keys pressed for "water", mounted on a strip of the keypad's moon panel
 *  WaterChip                 the app's proof chip: check and word only (the keys under it are its code)
 *  Blade                     the model's suggestion as ONE silhouette: the "Model ranking (opt-in)" card standing on the
 *                            floor, its code as five teeth on its top edge (one SVG path), each tooth able to extend
 *  BladeReflection           its faint, blurred reflection on the floor
 */
import React from 'react';
import { Img, interpolateColors } from 'remotion';
import { C, FONT } from '../../tokens';
import { Icon } from '../brand/Icon';
import { CastShadow, Crisp, GroundShadow, Slab, type GroundLook } from '../../lib/stage';
import type { Cam } from '../../lib/camera';
import decoded from '../../data/decoded.json';
import { PHONE_DEFAULT, type Capture } from './capture';
import { PhoneFallback } from './Screens';
import { PHONE_H, PHONE_W } from './phone';
import { Pool } from './landing';
import { W600 } from './metrics';

// ---- the rig -------------------------------------------------------------------------------------------------------
export const PHONE_RIG = { lens: 12000, zoomMode: 'lens' as const, eye: 302, rx: 0, rz: 0 };
export const BEZEL = Math.round(PHONE_W * 0.045);
export const OUTER_R = Math.round(PHONE_W * 0.14);
export const INNER_R = OUTER_R - BEZEL;
/** The phone's thickness (world px). */
export const PHONE_DEPTH = 40;
/** World y of the floor: the phone's base. Everything in this world stands on it. */
export const FLOOR = PHONE_H + BEZEL;
/** The x the ground is centred on (the phone's centre). Floor coordinates are relative to it. */
export const GROUND_X = PHONE_W / 2;

export const phoneStage = (over: Partial<GroundLook> = {}) => ({
  ground: { y: FLOOR, x: GROUND_X, width: 14000, spacing: 150, dot: 7, aspect: 3, far: 9000, near: 3000, ...over } as GroundLook,
  glow: { x: 50, y: 44, r: 70, strength: 1 },
  groundDof: { radius: 5 },
  aperture: 120,
  focusZ: 0,
});

export const camOf = (c: { x: number; y: number; zoom: number; ry: number }): Cam => ({ ...PHONE_RIG, ...c });

const mix = (c: string, to: string, a: number) => (a <= 0 ? c : interpolateColors(Math.min(1, a), [0, 1], [c, to]));
export const toNight = (c: string, a: number) => mix(c, C.night, a);

/**
 * A slab's face content, drawn in its own plane FACE_GAP px in front of the face. (A Slab's own children sit 0.5 px in
 * front of the face, which Chromium's depth sort can lose on a frontal camera with a long lens: the text vanished on
 * some frames.)
 */
export const FACE_GAP = 8;
/**
 * `crisp` > 1 lays the content out larger and scales it back (lib/stage <Crisp>). Default 1 here: in this world the
 * CSS-zoomed layer was dropped by Chromium on some frames (whole faces of text missing), which is worse than the
 * slightly softer raster.
 */
export const Face: React.FC<{ w: number; h: number; z: number; crisp?: number; children: React.ReactNode }> = ({ w, h, z, crisp = 2, children }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `translateZ(${z + FACE_GAP}px)` }}>
    <Crisp w={w} h={h} factor={crisp}>
      {children}
    </Crisp>
  </div>
);

// ---- grounding -------------------------------------------------------------------------------------------------------
/**
 * Pool, contact shadow and cast shadow (key light top left, in front) for an object of width w standing on the floor
 * at world x (its centre) and depth z (its back), `height` tall; `lift` above the floor for a floating one (then only a
 * wide, faint shadow). Floor coordinates are relative to GROUND_X.
 */
export const Grounding: React.FC<{ x: number; z?: number; w: number; height: number; lift?: number; strength?: number; pool?: number }> = ({ x, z = 0, w, height, lift = 0, strength = 1, pool = 1 }) => {
  const fx = x - GROUND_X;
  if (lift > 0) return <GroundShadow x={fx + lift * 0.1} z={z - lift * 0.3} w={w} d={120 + lift * 0.3} lift={lift} strength={0.34 * strength} />;
  return (
    <>
      {pool > 0 ? <Pool x={fx} z={z} w={w} strength={pool * strength} /> : null}
      <CastShadow x={fx} z={z} w={w} height={height} strength={0.45 * strength} />
      <GroundShadow x={fx} z={z + 10} w={w * 1.04} d={80} strength={0.85 * strength} />
    </>
  );
};

// ---- the phone -------------------------------------------------------------------------------------------------------
/**
 * The real phone standing: the capture in a frame with thickness (Slab layers), a moon rim, the screen on its face.
 * `screen` children are drawn over the capture, in image px, clipped to the screen. `veil` 0..1 darkens it all towards
 * night (it recedes by darkening, never by transparency).
 */
export const PhoneSlab: React.FC<{ capture: Capture | null; status: string; screen?: React.ReactNode; veil?: number; frameVeil?: number; rim?: number; glass?: number; clip?: string }> = ({ capture, status, screen, veil = 0, frameVeil = 0, rim = 1, glass = 0, clip }) => {
  const fv = Math.min(1, veil + frameVeil);
  const entry = capture ?? PHONE_DEFAULT;
  const w = entry.width;
  const h = entry.height;
  const vw = entry.viewport?.[0] ?? w / entry.dpr;
  const vh = entry.viewport?.[1] ?? h / entry.dpr;
  return (
    <div style={{ position: 'absolute', left: -BEZEL, top: -BEZEL, transformStyle: 'preserve-3d' }}>
      <Slab
        w={w + 2 * BEZEL}
        h={h + 2 * BEZEL}
        r={OUTER_R}
        depth={PHONE_DEPTH}
        layers={7}
        face={toNight(interpolateColors(glass, [0, 1], [C.surface, '#1a0f3c']), fv)}
        side={toNight('#0e0722', fv)}
        sideLit={toNight(interpolateColors(glass, [0, 1], ['#3a2a6e', '#5a4a9a']), fv)}
        border={{ width: 5 + 2 * glass, color: toNight(`rgba(238,232,255,${(0.42 + 0.2 * glass) * rim})`, fv) }}
        crisp={1}
      />
      <Face w={w + 2 * BEZEL} h={h + 2 * BEZEL} z={PHONE_DEPTH} crisp={1}>
        <div style={{ position: 'absolute', left: BEZEL, top: BEZEL, width: w, height: h, borderRadius: INNER_R, overflow: 'hidden', background: C.ground, clipPath: clip }}>
          {capture ? (
            <Img src={capture.src} style={{ display: 'block', width: w, height: h }} />
          ) : (
            <div style={{ width: vw, height: vh, transform: `scale(${w / vw})`, transformOrigin: '0 0' }}>
              <PhoneFallback status={status} />
            </div>
          )}
          {screen}
          {veil > 0 ? <div style={{ position: 'absolute', inset: 0, background: `rgba(20,10,46,${Math.min(1, veil)})` }} /> : null}
        </div>
      </Face>
    </div>
  );
};

// ---- the lock --------------------------------------------------------------------------------------------------------
export const PROOF = decoded.proof;
export const KEYS = PROOF.keys.split(''); // 9 2 8 3 7
export const REJECT = PROOF.reject; // wafer 92337, diffAt 2
export const TEETH = REJECT.code.split('');
export const LEGEND: Record<string, string> = Object.fromEntries(decoded.keypad.keys.map((k) => [k.id, k.letters]));

export const KS = 180;
export const KGAP = 26;
export const KPAD = 34;
export const KDEPTH = 15;
export const STRIP = { w: 5 * KS + 4 * KGAP + 2 * KPAD, h: KS + 2 * KPAD, r: 64, depth: 22 };
export const keyOffset = (i: number) => (i - 2) * (KS + KGAP);

export type Verdict = { amount: number; fit: boolean };

const KEY_SIDE = '#170c34';
const KEY_SIDE_LIT = '#3a2672';

/** A pressed key of the lock (digit large, letters under it), real thickness; its verdict ring and badge. */
export const ProofKey: React.FC<{ digit: string; ring?: Verdict; badge?: Verdict; dim?: number }> = ({ digit, ring, badge, dim = 0 }) => {
  const k = KS / 96;
  const r = 24 * k;
  return (
    <div style={{ position: 'relative', width: KS, height: KS, transformStyle: 'preserve-3d' }}>
    <Slab w={KS} h={KS} r={r} depth={KDEPTH} layers={6} face={toNight(C.key, dim)} side={toNight(KEY_SIDE, dim)} sideLit={toNight(KEY_SIDE_LIT, dim)} />
    <Face w={KS} h={KS} z={KDEPTH}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: r, background: `linear-gradient(160deg, rgba(238,232,255,${0.15 * (1 - dim)}) 0%, rgba(238,232,255,0) 46%)`, boxShadow: `inset 0 ${2 * k}px 0 rgba(238,232,255,${0.18 * (1 - dim)})` }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: toNight(C.onKey, dim * 0.8) }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 46 * k, lineHeight: 1, fontWeight: 500 }}>{digit}</div>
        <div style={{ fontFamily: FONT.sans, fontSize: 15 * k, lineHeight: 1, fontWeight: 700, letterSpacing: '0.08em', marginTop: 8 * k, color: toNight(C.inkMuted, dim * 0.8) }}>{LEGEND[digit]}</div>
      </div>
      {ring && ring.amount > 0 ? (
        <div
          style={{
            position: 'absolute',
            inset: -13,
            borderRadius: r + 13,
            border: `8px ${ring.fit ? 'solid' : 'dashed'} ${ring.fit ? C.proofMatch : C.proofReject}`,
            opacity: ring.amount,
          }}
        />
      ) : null}
      {badge && badge.amount > 0 ? <Badge fit={badge.fit} amount={badge.amount} x={6} y={KS - 6} /> : null}
    </Face>
    </div>
  );
};

/** A verdict badge: a filled circle with a check (fits) or an x (does not), so never colour alone. */
export const Badge: React.FC<{ fit: boolean; amount: number; x: number; y: number; size?: number }> = ({ fit, amount, x, y, size = 66 }) => {
  const s = 0.6 + 0.4 * Math.min(1, amount);
  return (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
        background: fit ? C.proofMatch : C.proofReject,
        boxShadow: `0 0 0 5px ${C.night}`,
        display: 'grid',
        placeItems: 'center',
        transform: `scale(${s})`,
        opacity: Math.min(1, amount * 1.5),
      }}
    >
      <Icon name={fit ? 'check' : 'x'} size={size * 0.62} color={C.night} stroke={3.4} />
    </div>
  );
};

/**
 * The strip of moon panel the five keys are mounted on (its top-left corner at the parent's origin, at full size).
 * `grow` 0..1 unfolds it from under the chip: from the chip's width and its 24 px overlap to the whole strip, anchored at
 * the top centre (by size, not by a 2D scale on a 3D element).
 */
export const Strip: React.FC<{ grow?: number; keyIn?: (i: number) => number; dim?: number }> = ({ grow = 1, keyIn = () => 1, dim = 0 }) => {
  const g = Math.max(0, Math.min(1, grow));
  const w = CHIP.w + (STRIP.w - CHIP.w) * g;
  const h = 24 + (STRIP.h - 24) * g;
  const x = (STRIP.w - w) / 2;
  return (
    <div style={{ position: 'absolute', left: x, top: 0, width: w, height: h, transformStyle: 'preserve-3d' }}>
      <Slab w={w} h={h} r={Math.min(STRIP.r, h / 2)} depth={STRIP.depth} layers={5} face={toNight(C.panel, dim)} side={toNight('#a99fd1', dim)} sideLit={toNight('#d6cff3', dim)} />
      <Face w={w} h={h} z={STRIP.depth - FACE_GAP + 1.5}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: Math.min(STRIP.r, h / 2), background: `linear-gradient(150deg, rgba(255,255,255,${0.35 * (1 - dim)}) 0%, rgba(255,255,255,0) 38%, rgba(20,10,46,0) 70%, rgba(20,10,46,${0.08 * (1 - dim)}) 100%)` }} />
        {g >= 1
          ? KEYS.map((_, i) => {
              const p = keyIn(i);
              if (p <= 0) return null;
              // The key's cast shadow on the panel (mounted keys may carry one: research-v2/15, 5.4).
              return <div key={`s${i}`} style={{ position: 'absolute', left: KPAD + i * (KS + KGAP), top: KPAD, width: KS, height: KS, borderRadius: 45, boxShadow: `7px 12px 18px rgba(20,10,46,${0.3 * p})` }} />;
            })
          : null}
      </Face>
    </div>
  );
};

// ---- the chip ----------------------------------------------------------------------------------------------------------
/** The word's font in the phone's card (40 css px x 3): the chip forms round the screen's own word at this size. */
export const WORD_PX = 120;
export const CHIP = (() => {
  const icon = 84;
  const gap = 28;
  const padX = 58;
  const word = W600.water! * WORD_PX;
  const w = Math.round(padX * 2 + icon + gap + word);
  return { w, h: 196, r: 52, depth: 20, icon, gap, padX, word, wordLeft: padX + icon + gap, width: w, height: 196 };
})();
const MATCH_FILL = '#2a2f54';
const CARD_FILL = C.surfaceSunken;

/**
 * "water" with its check. `form` 0..1 makes a tight chip round the word alone (starting in the screen card's own sunken
 * colour, so its first frames are invisible over the phone's word); `widen` 0..1 grows it to the whole chip and brings
 * the check in. Its content sits in its own plane in front of the face.
 */
export const WaterChip: React.FC<{ form?: number; widen?: number; dim?: number; sweep?: React.ReactNode }> = ({ form = 1, widen = 1, dim = 0, sweep }) => {
  const f = Math.max(0, Math.min(1, form));
  const g = Math.max(0, Math.min(1, widen));
  const tight = { x: CHIP.wordLeft - 26, y: 28, w: CHIP.word + 52, h: CHIP.h - 56 };
  const x = tight.x * (1 - g);
  const y = tight.y * (1 - g);
  const w = tight.w + (CHIP.w - tight.w) * g;
  const h = tight.h + (CHIP.h - tight.h) * g;
  const fill = toNight(interpolateColors(f, [0, 1], [CARD_FILL, MATCH_FILL]), dim);
  const depth = CHIP.depth * f + 0.5;
  return (
    <div style={{ position: 'relative', width: CHIP.w, height: CHIP.h, transformStyle: 'preserve-3d' }}>
      <div style={{ position: 'absolute', left: x, top: y, transformStyle: 'preserve-3d' }}>
        <Slab
          w={w}
          h={h}
          r={34 + (CHIP.r - 34) * g}
          depth={depth}
          layers={4}
          face={fill}
          side={toNight('#141a3a', dim)}
          sideLit={toNight('#2c3a66', dim)}
          border={f > 0.02 ? { width: 7 * f, color: toNight(C.proofMatch, dim) } : undefined}
        />
        {sweep ? (
          <Face w={w} h={h} z={depth - FACE_GAP + 1.5} crisp={1}>
            {sweep}
          </Face>
        ) : null}
      </div>
      <Face w={CHIP.w} h={CHIP.h} z={depth}>
        {g > 0 ? (
          <div style={{ position: 'absolute', left: CHIP.padX, top: (CHIP.h - CHIP.icon) / 2, opacity: Math.min(1, g * 1.4), transform: `scale(${0.6 + 0.4 * g})` }}>
            <Icon name="check" size={CHIP.icon} color={toNight(C.proofMatch, dim)} stroke={2.6} />
          </div>
        ) : null}
        <div style={{ position: 'absolute', left: CHIP.wordLeft, top: 0, height: CHIP.h, display: 'flex', alignItems: 'center', fontFamily: FONT.sans, fontSize: WORD_PX, lineHeight: 1, fontWeight: 600, color: toNight(C.ink, dim), whiteSpace: 'nowrap' }}>
          water
        </div>
      </Face>
    </div>
  );
};

// ---- the blade ---------------------------------------------------------------------------------------------------------
export const BLADE = { w: 1100, h: 312, r: 60, depth: 30 };
export const TOOTH = { w: 112, h: 96, r: 22, fillet: 14, gap: 56 };
/** Tooth i's centre x from the blade's left edge (under key i). */
export const toothX = (i: number) => BLADE.w / 2 + keyOffset(i);
export type ToothState = { ext: number; verdict: number; fit: boolean };

/** The blade's outline WITH its teeth: one path (blade-local px: body (0, 0) to (w, h), teeth above y = 0). */
export const bladePath = (teeth: ToothState[]) => {
  const { w, h, r } = BLADE;
  const tw = TOOTH.w;
  const tr = TOOTH.r;
  const fl = TOOTH.fillet;
  let d = `M ${r} 0`;
  teeth.forEach((th, i) => {
    const cx = toothX(i);
    const top = TOOTH.h + th.ext;
    const l = cx - tw / 2;
    const rr = cx + tw / 2;
    d += ` L ${l - fl} 0 Q ${l} 0 ${l} ${-fl}`;
    d += ` L ${l} ${-top + tr} Q ${l} ${-top} ${l + tr} ${-top}`;
    d += ` L ${rr - tr} ${-top} Q ${rr} ${-top} ${rr} ${-top + tr}`;
    d += ` L ${rr} ${-fl} Q ${rr} 0 ${rr + fl} 0`;
  });
  d += ` L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
  return d;
};
const toothSides = (i: number, ext: number) => {
  const cx = toothX(i);
  const top = TOOTH.h + ext;
  const l = cx - TOOTH.w / 2;
  const rr = cx + TOOTH.w / 2;
  const tr = TOOTH.r;
  return `M ${l} 4 L ${l} ${-top + tr} Q ${l} ${-top} ${l + tr} ${-top} L ${rr - tr} ${-top} Q ${rr} ${-top} ${rr} ${-top + tr} L ${rr} 4`;
};
export const BLADE_BOX = { x: -12, y: -(TOOTH.h + TOOTH.gap + 40), w: BLADE.w + 24, h: BLADE.h + TOOTH.h + TOOTH.gap + 52 };

export const BLADE_TEXT = { label: 56, word: 120, labelX: 52, wordRight: 60, digit: 72 };

export const Blade: React.FC<{ teeth: ToothState[]; reject?: number; strike?: number; dim?: number; crisp?: number }> = ({ teeth, reject = 0, strike = 0, dim = 0, crisp = 2 }) => {
  const wordColor = toNight(interpolateColors(reject, [0, 1], [C.ink, C.proofReject]), dim);
  const wordW = W600.wafer! * BLADE_TEXT.word;
  return (
    <div style={{ position: 'relative', width: BLADE.w, height: BLADE.h, transformStyle: 'preserve-3d' }}>
    <Slab
      w={BLADE.w}
      h={BLADE.h}
      r={BLADE.r}
      depth={BLADE.depth}
      layers={6}
      face={toNight(C.surface, dim)}
      side={toNight('#120a2c', dim)}
      sideLit={toNight('#2c1d5c', dim)}
      outline={{ d: bladePath(teeth), box: BLADE_BOX }}
      border={{ width: 4, color: toNight(C.lineStrong, dim * 0.6 + 0.25) }}
    />
    <Face w={BLADE.w} h={BLADE.h} z={BLADE.depth} crisp={crisp}>
      {/* The light on the face, top left. */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: BLADE.w, height: BLADE.h, borderRadius: BLADE.r, background: `linear-gradient(160deg, rgba(238,232,255,${0.06 * (1 - dim)}) 0%, rgba(238,232,255,0) 45%)` }} />
      {/* The teeth: the suggested word's code, standing on the blade's top edge (part of its silhouette). */}
      {TEETH.map((d, i) => {
        const th = teeth[i]!;
        const top = TOOTH.h + th.ext;
        const v = th.verdict;
        const colour = toNight(th.fit ? C.proofMatch : C.proofReject, dim);
        return (
          <React.Fragment key={i}>
            <div style={{ position: 'absolute', left: toothX(i) - 56, top: -top + 8, width: 112, height: 84, display: 'grid', placeItems: 'center', fontFamily: FONT.mono, fontSize: BLADE_TEXT.digit, lineHeight: 1, fontWeight: 500, color: v > 0 && !th.fit ? colour : toNight(C.ink, dim) }}>
              {d}
            </div>
            {v > 0 ? (
              <svg width={BLADE.w} height={240} viewBox={`0 -236 ${BLADE.w} 240`} style={{ position: 'absolute', left: 0, top: -236, overflow: 'visible', opacity: Math.min(1, v) }}>
                <path d={toothSides(i, th.ext)} fill="none" stroke={colour} strokeWidth={8} strokeLinejoin="round" strokeDasharray={th.fit ? undefined : '20 13'} />
              </svg>
            ) : null}
          </React.Fragment>
        );
      })}
      <div style={{ position: 'absolute', left: BLADE_TEXT.labelX, top: 0, height: BLADE.h, display: 'flex', alignItems: 'center', fontFamily: FONT.sans, fontSize: BLADE_TEXT.label, lineHeight: 1.2, fontWeight: 700, color: toNight(C.inkMuted, dim), whiteSpace: 'nowrap' }}>
        Model ranking (opt-in)
      </div>
      <div style={{ position: 'absolute', left: BLADE.w - BLADE_TEXT.wordRight - wordW, top: 0, height: BLADE.h, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'relative', fontFamily: FONT.sans, fontSize: BLADE_TEXT.word, lineHeight: 1, fontWeight: 600, color: wordColor, whiteSpace: 'nowrap', marginTop: -8 }}>
          {REJECT.word}
          {strike > 0 ? <span style={{ position: 'absolute', left: -6, top: '56%', height: 10, width: `calc(${strike * 100}% + 12px)`, background: toNight(C.proofReject, dim), borderRadius: 5 }} /> : null}
        </div>
      </div>
    </Face>
    </div>
  );
};

/** The blade's reflection on the floor: a flattened, mirrored, faint, blurred copy fading with height. Place its parent at the floor line. */
export const BladeReflection: React.FC<{ teeth: ToothState[]; reject?: number; strike?: number; dim?: number; strength?: number }> = ({ teeth, reject, strike, dim = 0, strength = 1 }) => {
  const H = BLADE.h + TOOTH.h + TOOTH.gap + 20;
  return (
    <div
      style={{
        position: 'absolute',
        left: -20,
        top: -H,
        width: BLADE.w + 40,
        height: H,
        transformOrigin: `0 ${H}px`,
        transform: 'scaleY(-1)',
        opacity: 0.15 * strength,
        filter: 'blur(6px)',
        maskImage: 'linear-gradient(to bottom, transparent 35%, black 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 35%, black 100%)',
      }}
    >
      <div style={{ position: 'absolute', left: 20, top: H - BLADE.h }}>
        <Blade teeth={teeth} reject={reject} strike={strike} dim={dim} crisp={1} />
      </div>
    </div>
  );
};
