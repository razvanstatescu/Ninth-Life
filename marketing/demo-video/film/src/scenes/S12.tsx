/**
 * Scene 12, no signal: ghost mode (bars 30-32), on the spatial stage: research-v2/15 6.4 A, "The ghost phone"
 * (STYLE.md "Spatial rules"). One world with s11, no dive.
 *
 *  30  Starts on s11's last frame. The lock packs away into the chip (the keys sink into the strip, the strip folds
 *      under the chip) and the chip flies to the phone, becoming its status pill ("On device", the app's own); the
 *      real phone comes forward from back left to stand on the floor; the struck blade goes on out to the right.
 *      Our signal icon, on the phone's top-right corner, loses one bar per beat; on the last the pill reads the app's
 *      own "Offline" (lib/status.ts statusSummary). n18 "No signal? It still works."
 *  31  On "It still works" the phone's body turns to glass (30 frames) and the dictionary shows inside it as texture.
 *      A lens push to its upper half in the narrator's pause; the card clears. Three codes are typed, one per beat:
 *      each code's matches (decoded.json) sharpen and brighten in the glass and the chosen word rises into the card.
 *      n18 "We call it ghost mode.": the tag "Ghost mode" rises from behind the phone's top edge.
 *  32  "I need water" in the card, the dictionary drifting; s13 starts on a hard cut at bar 33.
 * Truth: works offline; never "nothing leaves your device" (model ranking sends data when it is on).
 */
import React from 'react';
import { AbsoluteFill, interpolateColors, useCurrentFrame } from 'remotion';
import { C, FONT } from '../tokens';
import { sec } from '../timeline';
import { useCamera } from '../lib/camera';
import { Plane, Slab } from '../lib/stage';
import { EASE, jump, ramp } from '../lib/anim';
import { Super } from '../components/type/Type';
import { KeyTone, Sfx, SfxFile } from '../audio/Audio';
import { SignalIcon } from '../components/mid/Parts2';
import { GhostGlass, type Rect } from '../components/mid/Ghost';
import { CHIP, FACE_GAP, Face, PHONE_DEPTH, WORD_PX as CHIP_WORD_PX } from '../components/mid/set3';
import { Icon } from '../components/brand/Icon';
import { getCapture } from '../components/mid/capture';
import { PHONE_W } from '../components/mid/phone';
import { W600 } from '../components/mid/metrics';
import { ProofSet, proofState, type ProofState } from './S11';
import * as M from '../components/mid/s11';
import * as G from '../components/mid/s12';

const PHONE_WATER = getCapture('phone-water');
const PHONE_OFFLINE = getCapture('phone-offline');
const MATCH_FILL = '#2a2f54';
/** The app's Clear button in the card (the wipe stops short of it). */
const CLEAR_LEFT = (PHONE_WATER?.boxes.clear ?? [942])[0]!;

// ---- the typing -----------------------------------------------------------------------------------------------------
type Fly = { word: string; code: string; spot: { x: number; y: number }; chosen: boolean; slot: number };
const FLIES: Fly[] = G.CODES.flatMap((code, k) =>
  (G.MATCHES[code] ?? []).slice(0, (G.MATCH_SPOTS[code] ?? []).length).map((w, j) => ({
    word: j === 0 ? G.FINAL[k]! : w,
    code,
    spot: G.MATCH_SPOTS[code]![j]!,
    chosen: j === 0,
    slot: k,
  })),
);
const sentAt = (k: number) => G.SEND[k]!;
const codeDone = (k: number) => sentAt(k) + (G.CODES[k]!.length - 1) * G.KEY_STEP;
const litAt = (k: number) => codeDone(k) + 4;
const flyAt = (k: number) => litAt(k) + sec(0.2);
const FLY_DUR = sec(0.4);
const wordW = (w: string, px: number) => (W600[w] ?? w.length * 0.56) * px;
/** The glass keeps these clear of texture (centre and size, screen px): the matches. */
const CLEAR: Rect[] = FLIES.map((f) => ({ x: f.spot.x, y: f.spot.y, w: wordW(f.word, G.LIT_PX) + 90, h: G.LIT_PX * 1.4 }));

/** The card, cleared by a wipe, then the typed keys and the words that have landed (screen px = image px). */
const CardOverlay: React.FC<{ frame: number }> = ({ frame }) => {
  const wipe = ramp(frame, G.PUSH.from + 6, 10, 0, 1, EASE.inOut);
  if (wipe <= 0) return null;
  const [tx, ty, tw, th] = G.TEXT_BOX;
  const [dx, dy, dw, dh] = G.DIGITS_BOX;
  // The keys typed so far, as the card's key line shows them.
  let typed = '';
  G.CODES.forEach((code, k) => {
    if (frame < sentAt(k)) return;
    const n = Math.min(code.length, Math.floor((frame - sentAt(k)) / G.KEY_STEP) + 1);
    typed += (typed ? ' ' : '') + code.slice(0, n);
  });
  return (
    <>
      <div style={{ position: 'absolute', left: tx - 10, top: ty, width: (CLEAR_LEFT - 12 - (tx - 10)) * wipe, height: th, background: C.surfaceSunken }} />
      <div style={{ position: 'absolute', left: dx - 10, top: dy - 6, width: (dw + 120) * wipe, height: dh + 12, background: C.surfaceSunken }} />
      {typed ? (
        <div style={{ position: 'absolute', left: dx, top: dy, height: dh, display: 'flex', alignItems: 'center', fontFamily: FONT.mono, fontSize: G.DIGIT_PX, fontWeight: 500, color: C.inkMuted, whiteSpace: 'pre' }}>{typed}</div>
      ) : null}
      {FINAL_LANDED(frame)}
    </>
  );
};

/** The chosen words that have landed in the card (the flight itself is drawn in the glass layer). */
const FINAL_LANDED = (frame: number) =>
  G.FINAL.map((w, k) =>
    frame >= flyAt(k) + FLY_DUR ? (
      <div key={w} style={{ position: 'absolute', left: G.slotX(k), top: G.LINE_CY - G.WORD_PX / 2, height: G.WORD_PX, display: 'flex', alignItems: 'center', fontFamily: FONT.sans, fontSize: G.WORD_PX, lineHeight: 1, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap' }}>
        {w}
      </div>
    ) : null,
  );

/** The glass: night-plum over the app's lower screen, the dictionary as texture, the matches, the flights. */
const Glass: React.FC<{ frame: number; glass: number }> = ({ frame, glass }) => {
  if (glass <= 0) return null;
  const top = G.GLASS_TOP;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: top - 40,
          width: PHONE_W,
          height: 2100 - top + 40,
          background: `radial-gradient(ellipse 80% 60% at 50% 30%, ${C.plum} 0%, #1f1146 45%, ${C.night} 100%)`,
          opacity: glass,
          maskImage: 'linear-gradient(to bottom, transparent 0px, black 40px)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, black 40px)',
        }}
      />
      <GhostGlass frame={frame} top={top} bottom={2100} amount={glass} clear={CLEAR} />
    </>
  );
};

/** The matches: texture until their code is typed, then sharp and bright; the chosen one rises into the card (drawn over it). */
const Matches: React.FC<{ frame: number; glass: number }> = ({ frame, glass }) => {
  if (glass <= 0) return null;
  return (
    <>
      {FLIES.map((f) => {
        const k = f.slot;
        const lit = jump(frame, litAt(k));
        const grow = ramp(frame, litAt(k), 7, 0, 1, EASE.camera);
        const fly = f.chosen ? ramp(frame, flyAt(k), FLY_DUR, 0, 1, EASE.flight) : 0;
        if (fly >= 1) return null;
        const back = f.chosen ? 0 : ramp(frame, flyAt(k) + sec(0.3), sec(0.4), 0, 1, EASE.out);
        const size = (G.DIM_PX + (G.LIT_PX - G.DIM_PX) * grow * (1 - back)) * (1 - fly) + G.WORD_PX * fly;
        const cx = f.spot.x + (G.slotX(k) + wordW(f.word, G.WORD_PX) / 2 - f.spot.x) * fly;
        const cy = f.spot.y + (G.LINE_CY - f.spot.y) * fly;
        // Texture (11%) until lit, then 100% and sharp; the others settle back to 45%.
        const a = (0.11 + 0.89 * lit * (1 - 0.55 * back)) * glass;
        const blur = lit > 0 ? 0 : 0.7 * (1 - grow);
        return (
          <div
            key={`${f.code}${f.word}`}
            style={{
              position: 'absolute',
              left: cx,
              top: cy,
              transform: 'translate(-50%, -50%)',
              fontFamily: FONT.sans,
              fontSize: size,
              lineHeight: 1,
              fontWeight: 600,
              color: `rgba(238,232,255,${a.toFixed(3)})`,
              filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
              textShadow: lit > 0 && fly < 1 ? `0 0 ${18 * lit}px rgba(238,232,255,${0.3 * lit * (1 - fly) * (1 - back)})` : undefined,
              whiteSpace: 'nowrap',
            }}
          >
            {f.word}
          </div>
        );
      })}
    </>
  );
};

// ---- the chip becomes the pill ------------------------------------------------------------------------------------------
/** From the proof chip (at rest on the strip) to the phone's status pill (on its face), size, corners, colours and content. */
const PillMorph: React.FC<{ p: number }> = ({ p }) => {
  const [px, py, pw, ph] = G.STATUS_BOX;
  const x = M.CHIP_REST.x + (px - M.CHIP_REST.x) * p;
  const y = M.CHIP_REST.y + (py - M.CHIP_REST.y) * p;
  const z = M.CHIP_REST.z + (PHONE_DEPTH + FACE_GAP + 1 - M.CHIP_REST.z) * p;
  const w = CHIP.w + (pw - CHIP.w) * p;
  const h = CHIP.h + (ph - CHIP.h) * p;
  const depth = CHIP.depth * (1 - p) + 2 * p;
  const chipContent = ramp(p, 0, 0.35, 1, 0, EASE.linear);
  const pillContent = ramp(p, 0.65, 0.35, 0, 1, EASE.linear);
  const k = w / CHIP.w;
  return (
    <Plane x={x} y={y} z={z}>
      <div style={{ position: 'relative', width: w, height: h, transformStyle: 'preserve-3d' }}>
        <Slab
          w={w}
          h={h}
          r={h / 2 * p + CHIP.r * (1 - p)}
          depth={depth}
          layers={4}
          face={interpolateColors(p, [0, 1], [MATCH_FILL, C.night])}
          side="#141a3a"
          sideLit="#2c3a66"
          border={{ width: 7 * (1 - p) + 5 * p, color: interpolateColors(p, [0, 1], [C.proofMatch, C.lineStrong]) }}
        />
        <Face w={w} h={h} z={depth}>
          {chipContent > 0 ? (
            <div style={{ position: 'absolute', left: 0, top: 0, width: CHIP.w, height: CHIP.h, transform: `scale(${k}, ${h / CHIP.h})`, transformOrigin: '0 0', opacity: chipContent }}>
              <div style={{ position: 'absolute', left: CHIP.padX, top: (CHIP.h - CHIP.icon) / 2 }}>
                <Icon name="check" size={CHIP.icon} color={C.proofMatch} stroke={2.6} />
              </div>
              <div style={{ position: 'absolute', left: CHIP.wordLeft, top: 0, height: CHIP.h, display: 'flex', alignItems: 'center', fontFamily: FONT.sans, fontSize: CHIP_WORD_PX, lineHeight: 1, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap' }}>water</div>
            </div>
          ) : null}
          {pillContent > 0 ? (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: FONT.sans, fontSize: 45, fontWeight: 600, color: C.ink, opacity: pillContent, whiteSpace: 'nowrap' }}>On device</div>
          ) : null}
        </Face>
      </div>
    </Plane>
  );
};

/** Our signal icon on the phone's top-right corner: a small slab with the bars. */
const SignalBadge: React.FC<{ bars: number }> = ({ bars }) => {
  const s = G.SIGNAL.size;
  return (
    <Plane x={G.SIGNAL.x - s / 2} y={G.SIGNAL.y - s / 2} z={PHONE_DEPTH + FACE_GAP + 2}>
      <div style={{ position: 'relative', width: s, height: s, transformStyle: 'preserve-3d' }}>
        <Slab w={s} h={s} r={84} depth={G.SIGNAL.depth} layers={4} face={C.night} side="#0e0722" sideLit="#3a2a6e" border={{ width: 5, color: 'rgba(238,232,255,0.55)' }} />
        <Face w={s} h={s} z={G.SIGNAL.depth}>
          <div style={{ position: 'absolute', left: (s - 200) / 2, top: (s - 200) / 2 - 6 }}>
            <SignalIcon size={200} bars={bars} />
          </div>
        </Face>
      </div>
    </Plane>
  );
};

/** "Ghost mode": a tab rising from behind the phone's top edge (20 px of it stays behind the edge). */
const TAG_W = Math.round(5.36 * G.TAG.font + 2 * 46);
const GhostTab: React.FC<{ rise: number }> = ({ rise }) => {
  if (rise <= 0) return null;
  return (
    <Plane x={PHONE_W / 2 - TAG_W / 2} y={G.TAG.y + (1 - rise) * (G.TAG.h - 4)} z={-G.TAG.depth - 6}>
      <div style={{ position: 'relative', width: TAG_W, height: G.TAG.h, transformStyle: 'preserve-3d' }}>
        <Slab w={TAG_W} h={G.TAG.h} r={G.TAG.h / 2} depth={G.TAG.depth} layers={4} face={C.surface} side="#120a2c" sideLit="#2c1d5c" border={{ width: 5, color: C.lineStrong }} />
        <Face w={TAG_W} h={G.TAG.h} z={G.TAG.depth}>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', paddingBottom: 14, fontFamily: FONT.sans, fontSize: G.TAG.font, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap' }}>Ghost mode</div>
        </Face>
      </div>
    </Plane>
  );
};

// ---- the set at an s12 frame --------------------------------------------------------------------------------------------
const SINK_ORDER = [0, 1, 2, 1, 0]; // 9 and 7 first, then 2 and 3, then 8
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const s12State = (frame: number): ProofState => {
  const base = proofState(M.END - 1);
  const phoneIn = ramp(frame, G.PHONE_IN.from, G.PHONE_IN.dur, 0, 1, EASE.inOut);
  const bladeOut = ramp(frame, G.BLADE_OUT.from, G.BLADE_OUT.dur, 0, 1, EASE.in);
  const glass = ramp(frame, G.GLASS.from, G.GLASS.dur, 0, 1, EASE.inOut);
  const offline = frame >= G.OFFLINE_AT;
  return {
    ...base,
    phone: {
      on: frame >= G.PHONE_IN.from,
      dx: M.PHONE_AWAY.x * (1 - phoneIn),
      dz: M.PHONE_AWAY.z * (1 - phoneIn),
      veil: M.PHONE_AWAY.veil * (1 - phoneIn),
      capture: offline ? PHONE_OFFLINE : PHONE_WATER,
      status: offline ? 'Offline' : 'On device',
      glass,
      screen:
        glass > 0 || frame >= G.PUSH.from ? (
          <>
            <Glass frame={frame} glass={glass} />
            <CardOverlay frame={frame} />
            <Matches frame={frame} glass={glass} />
          </>
        ) : undefined,
    },
    strip: {
      ...base.strip,
      on: ramp(frame, G.FOLD.from, G.FOLD.dur, 0, 1) < 1,
      sink: base.strip.keyIn.map((_, i) => ramp(frame, G.SINK.from + SINK_ORDER[i]! * G.SINK.step, G.SINK.dur, 0, 1, EASE.in)),
      grow: 1 - ramp(frame, G.FOLD.from, G.FOLD.dur, 0, 1, EASE.inOut),
    },
    blade: {
      ...base.blade,
      on: bladeOut < 1,
      dx: lerp(base.blade.dx, 3600, bladeOut),
      dz: lerp(base.blade.dz, -2600, bladeOut),
      dim: lerp(base.blade.dim, 0.85, bladeOut),
    },
  };
};

const S12_CAM = [
  { f: 0, ...M.CAM_LAST },
  { f: G.SWAP_CAM.from },
  { f: G.SWAP_CAM.to, ...G.CAM_PHONE, ease: EASE.flight },
  { f: G.PUSH.from, ...G.CAM_PHONE2, ease: EASE.linear },
  { f: G.PUSH.from + G.PUSH.dur, ...G.CAM_UPPER, ease: EASE.camera },
  { f: G.END - 1, ...G.CAM_UPPER_END, ease: EASE.linear },
];

export const S12: React.FC = () => {
  const frame = useCurrentFrame();
  const { cam, vel } = useCamera(S12_CAM);
  const bars = 4 - G.BAR_FALL.reduce((n, at) => n + jump(frame, at), 0);
  const rise = ramp(frame, G.GHOST[0]!, 14, 0, 1, EASE.reveal);
  const base = s12State(frame);
  // The signal icon and the tag belong to the phone: they move, blur and darken with it.
  const s = { ...base, phone: { ...base.phone, extra: <><SignalBadge bars={bars} /><GhostTab rise={rise} /></> } };
  const morph = ramp(frame, G.MORPH.from, G.MORPH.dur, 0, 1, EASE.inOut);
  return (
    <AbsoluteFill style={{ backgroundColor: C.night }}>
      <ProofSet
        s={s}
        cam={cam}
        vel={vel}
        hideChip={frame >= G.MORPH.from}
        groundOpacity={1 - 0.65 * ramp(frame, G.PUSH.from, G.PUSH.dur, 0, 1, EASE.inOut)}
        extra={
          <>
            {frame >= G.MORPH.from && morph < 1 ? <PillMorph p={morph} /> : null}

          </>
        }
      />
      <Super text="It still works." at={G.WORKS[0]!} wordFrames={G.WORKS} out={G.PUSH.from - 2} outMode="up" size={96} align="left" x={1220} y={640} maxWidth={700} />

      <Sfx id="whoosh-1" at={G.SWAP_CAM.from} volume={0.4} />
      <SfxFile src="audio/sfx/v2/signal-down.wav" at={G.BAR_FALL[0]!} volume={0.5} />
      <SfxFile src="audio/sfx/v2/chip.wav" at={G.MORPH.from + G.MORPH.dur - 4} volume={0.35} />
      {/* The dictionary in the glass. */}
      <SfxFile src="audio/sfx/v2/shimmer.wav" at={G.GLASS.from} volume={0.5} />
      {G.CODES.map((code, k) =>
        code.split('').map((d, i) => <KeyTone key={`${k}-${i}`} k={d} at={sentAt(k) + i * G.KEY_STEP} volume={0.45} />),
      )}
      {G.CODES.map((_, k) => (
        <Sfx key={`l${k}`} id="tick" at={flyAt(k) + FLY_DUR} volume={0.3} />
      ))}
      <Sfx id="tick" at={G.GHOST[0]! + 10} volume={0.25} />
    </AbsoluteFill>
  );
};

/** For the lab's diagnostics: the face gap in use here. */
export const S12_FACE_GAP = FACE_GAP;
