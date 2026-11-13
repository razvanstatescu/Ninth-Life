/**
 * Scenes 6 and 7, bars 1-4: one continuous hero shot on one clock (`t` = frames since Act 2 bar 1
 * beat 1), so S06's last frame and S07's first frame are the same picture.
 *
 * Bar 1  The handoff dot (28 px, exact centre) becomes the ninth key; keys 1-8 cut in on eighths.
 * Bar 2  A light comes on: the moon panel grows out of the ninth key into the icon's 3x3 shape, the
 *        ground glow and the dot field rise, legends light from the ninth key outwards, the 4th row
 *        rises in as the panel extends, the camera pulls back to the whole app (Speak disabled: the
 *        sentence is empty, so the ninth key stays the one ember thing).
 * Bar 3  The camera pushes in on the downbeat as the first key is pressed ("hello"); Speak is out of
 *        frame from here, so the pressed ring is the one ember thing. One move, on Space.
 * Bar 4  "again", then on beat 4 a whip to Speak (now ember), pressed just before the bar line.
 */
import React from 'react';
import { AbsoluteFill, Easing, interpolateColors } from 'remotion';
import { C } from '../../tokens';
import { EIGHTH, HEIGHT, WIDTH } from '../../timeline';
import { World, At, cameraAt, cameraVelocity, type CamKey } from '../../lib/camera';
import { EASE, jump, mix, ramp } from '../../lib/anim';
import { KEY_ROWS, keyCenter, keyIdOf, keypadLayout, type KeyId } from '../brand/Keypad';
import { NightGround, DotField } from '../brand/Logo';
import decoded from '../../data/decoded.json';
import { HeroKeypad, keyBox, mixBox, panelBox, type HeroKeyState } from './HeroKeypad';
import { HeroBar, barGeometry } from './HeroBar';
import { b } from './time';

// ---- Layout (world px; origin at the keypad's centre) ------------------------------------------

/** Key edge in world px. On screen it is never under 130 px (zoom >= 0.9). */
export const SIZE = 150;
const L = keypadLayout(SIZE);
const k = SIZE / 96;
const keyWorld = (id: KeyId) => keyCenter(id, SIZE);

const BAR_SCALE = 2;
const TEXT_W = 700;
const SPEAK_W = 320;
const BAR = barGeometry(BAR_SCALE, TEXT_W, SPEAK_W);
const BAR_LEFT = L.width / 2 + 80;
const BAR_CY = 0;
const BAR_CX = BAR_LEFT + BAR.width / 2;
const SPEAK = { x: BAR_LEFT + BAR.speakX, y: BAR_CY };

// ---- Times (t) ----------------------------------------------------------------------------------

export const T = {
  morphEnd: 12,
  /** Keys 1-8 cut in on the eighths after the downbeat: 1 at bar 1 beat 1.5 ... 8 at bar 2 beat 1. */
  keyIn: (n: number) => b(1) + n * EIGHTH,
  panel: b(2),
  legends: b(2, 2),
  /** The pull-back to the whole app starts with the 4th row and lands with the speak bar. */
  pullBack: b(2, 2, 1),
  pullBackEnd: b(2, 3, 1),
  row4: b(2, 2, 1),
  barIn: b(2, 2, 1) + 12,
  pushIn: b(3) - 12,
  /** Presses of "hello again": bar 3 from beat 1 (6 presses), bar 4 from beat 1 (5 presses). */
  press: decoded.sentences['hello-again'].presses.map((_, i) => (i < 6 ? b(3) + i * EIGHTH : b(4) + (i - 6) * EIGHTH)),
  spaceMove: b(3, 3, 1),
  whip: b(4, 4) - 12,
  speakPress: b(5) - 6,
} as const;

const SENTENCE = decoded.sentences['hello-again'];
const PRESS_KEYS = SENTENCE.presses.map((p) => keyIdOf(p));

// ---- Camera -------------------------------------------------------------------------------------

const Z1 = 1.45;
const EST = { x: (-L.width / 2 + BAR_LEFT + BAR.width) / 2, y: 0, zoom: 0.93 };
const A = { zoom: 1.28, x: (WIDTH / 2 - 120) / 1.28 - L.width / 2, y: 0 };
const B = { zoom: 1.5, x: (WIDTH / 2 - 110) / 1.5 - L.width / 2, y: -60 };
const SPK = { zoom: 2.4, x: SPEAK.x, y: SPEAK.y };

const k9 = keyWorld('9');
const k5 = keyWorld('5');

/** Position and zoom. Tilt has its own tracks (below), so a plane can swing in and settle on its own time. */
export const HERO_CAMERA: CamKey[] = [
  { f: 0, x: k9.x, y: k9.y, zoom: Z1 },
  { f: 2 },
  // The dot grows into the ninth key while it glides into its slot of the 3x3.
  { f: 18, x: k5.x, y: k5.y, ease: EASE.flight },
  { f: T.pullBack, zoom: Z1 * 0.985, ease: EASE.linear },
  { f: T.pullBackEnd, x: EST.x, y: EST.y, zoom: EST.zoom, ease: EASE.flight },
  { f: T.pushIn, zoom: EST.zoom * 1.01, ease: EASE.linear },
  { f: b(3), x: A.x, y: A.y, zoom: A.zoom, ease: EASE.camera },
  { f: T.spaceMove, zoom: A.zoom * 1.012, ease: EASE.linear },
  { f: T.spaceMove + 12, x: B.x, y: B.y, zoom: B.zoom, ease: EASE.camera },
  { f: T.whip, zoom: B.zoom * 1.012, ease: EASE.linear },
  { f: b(4, 4), x: SPK.x, y: SPK.y, zoom: SPK.zoom, ease: EASE.whip },
  { f: b(5), zoom: SPK.zoom * 1.01, ease: EASE.linear },
];

type Track = { f: number; v: number; ease?: (x: number) => number }[];
const track = (t: number, keys: Track) => {
  if (t <= keys[0]!.f) return keys[0]!.v;
  for (let i = 1; i < keys.length; i++) {
    const z = keys[i]!;
    if (t <= z.f) {
      const a = keys[i - 1]!;
      return a.v + (z.v - a.v) * (z.f === a.f ? 1 : (z.ease ?? EASE.out)((t - a.f) / (z.f - a.f)));
    }
  }
  return keys[keys.length - 1]!.v;
};

/** Turn about the vertical axis: each arrival swings in at about -7 degrees and settles near -3. */
const RY: Track = [
  { f: 0, v: 0 },
  { f: 18, v: -2, ease: EASE.flight },
  { f: T.pullBack, v: -2 },
  { f: T.pullBackEnd - 6, v: -7.5, ease: EASE.inOut },
  { f: T.pushIn, v: -3.5, ease: EASE.out },
  { f: b(3), v: -6.5, ease: EASE.camera },
  { f: b(3) + 36, v: -3.5, ease: EASE.out },
  { f: T.spaceMove, v: -3.5 },
  { f: T.spaceMove + 12, v: -6, ease: EASE.camera },
  { f: T.spaceMove + 48, v: -2.5, ease: EASE.out },
  { f: T.whip, v: -2.5 },
  { f: b(4, 4), v: -2, ease: EASE.whip },
];
/** Tilt back: at most 2 degrees while text is read. */
const RX: Track = [
  { f: 0, v: 0 },
  { f: 18, v: 1, ease: EASE.flight },
  { f: T.pullBack, v: 1 },
  { f: T.pullBackEnd, v: 2, ease: EASE.flight },
  { f: b(3), v: 1.5, ease: EASE.camera },
  { f: T.spaceMove + 12, v: 1, ease: EASE.camera },
  { f: b(4, 4), v: 0.5, ease: EASE.whip },
];

export const heroCam = (t: number) => ({ ...cameraAt(t, HERO_CAMERA), rx: track(t, RX), ry: track(t, RY) });

// ---- States -------------------------------------------------------------------------------------

/**
 * The ring of press i: it comes on with the app's 120 ms jump; when the next press lands it goes off in
 * 3 frames (or an eighth after the press if nothing follows), so two rings never share the picture.
 */
const RING_OFF = 3;
const ringOf = (t: number, i: number) => {
  const p = T.press[i]!;
  if (t < p) return 0;
  const next = T.press[i + 1];
  const end = next !== undefined ? Math.min(next, p + EIGHTH) : p + EIGHTH;
  return jump(t, p) * (1 - ramp(t, end, RING_OFF, 0, 1, EASE.linear));
};

/** Order in which legends light: from the ninth key outwards (2 frames per step). */
const LIGHT_ORDER: Record<string, number> = { '9': 0, '6': 1, '8': 1, '3': 2, '5': 2, '7': 2, '2': 3, '4': 3, '1': 4 };

const keyStates = (t: number): Partial<Record<KeyId, HeroKeyState>> => {
  const out: Partial<Record<KeyId, HeroKeyState>> = {};
  const ids = KEY_ROWS.flat();
  for (const id of ids) {
    const st: HeroKeyState = {};
    if (id === '9') {
      st.appear = t >= T.morphEnd ? 1 : 0;
      st.lit = 1 - jump(t, T.press[0]!);
    } else if (id === 'star' || id === '0' || id === 'hash') {
      const order = id === 'hash' ? 0 : id === '0' ? 1 : 2;
      const s = T.row4 + order * 4;
      st.appear = ramp(t, s, 8, 0, 1, EASE.camera);
      st.dy = ramp(t, s, 8, 24, 0, EASE.camera);
      st.legend = 1;
    } else {
      st.appear = t >= T.keyIn(Number(id)) ? 1 : 0;
    }
    if (LIGHT_ORDER[id] !== undefined) st.legend = ramp(t, T.legends + LIGHT_ORDER[id]! * 2, 8, 0, 1, EASE.out);
    // Pressed ring (and the heavier ring for a few frames right after each press).
    let press = 0;
    let hit = 0;
    PRESS_KEYS.forEach((pk, i) => {
      if (pk !== id) return;
      const r = ringOf(t, i);
      if (r > press) press = r;
      const p = T.press[i]!;
      if (t >= p && t < p + 10) hit = Math.max(hit, 1 - ramp(t, p, 10, 0, 1, EASE.out));
    });
    st.press = press;
    st.hit = hit;
    out[id] = st;
  }
  return out;
};

/**
 * The handoff dot growing into the ninth key (t < morphEnd). World px, centred on the key. Frame 0 is
 * S05's last frame exactly: a flat ember dot, 28 px on screen, glow 0 0 24px rgba(255,177,61,0.6). It
 * ends exactly on the lit Key (gradient, inset plum ring, SHADOW.glowEmber), which then takes over.
 */
const ROUND_TO_SQUARE = Easing.bezier(0.55, 0, 0.45, 1);

const Morph: React.FC<{ t: number; zoom: number }> = ({ t, zoom }) => {
  // Grows on an S-curve; stays round while it grows and squares off late, so the change of shape reads.
  const p = ramp(t, 0, T.morphEnd, 0, 1, EASE.inOut);
  const q = ramp(t, 2, T.morphEnd - 2, 0, 1, ROUND_TO_SQUARE);
  const size = mix(28 / zoom, SIZE, p);
  const radius = size * mix(0.5, 0.25, q);
  const glowBlur = mix(24 / zoom, 36, p);
  const glowA = mix(0.6, 0.55, p);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: radius, background: C.ember }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: radius,
          background: `linear-gradient(135deg, #ffd27a 0%, ${C.ember} 55%, #ff9f2e 100%)`,
          opacity: p,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: radius,
          boxShadow: `inset 0 0 0 ${3 * k * p}px ${C.plum}, 0 0 0 ${6 * p}px rgba(255,177,61,${0.35 * p}), 0 0 ${glowBlur}px rgba(255,177,61,${glowA})`,
        }}
      />
    </div>
  );
};

/** Screen position of a world point (no tilt), for screen-space things that follow the world. */
const toScreen = (cam: { x: number; y: number; zoom: number }, x: number, y: number) => ({
  x: WIDTH / 2 + (x - cam.x) * cam.zoom,
  y: HEIGHT / 2 + (y - cam.y) * cam.zoom,
});

export const OpenHero: React.FC<{ t: number }> = ({ t }) => {
  const cam = heroCam(t);
  const vel = cameraVelocity(t, HERO_CAMERA);

  // The light comes on in bar 2.
  const light = ramp(t, T.panel, 50, 0, 1, EASE.out);
  // The moon glow sits between the keypad and the sentence, so both are in its light.
  const glowAt = toScreen(cam, mix(0, BAR_LEFT, ramp(t, T.pullBack, 30, 0, 0.6, EASE.flight)), 0);
  const glow = { x: (glowAt.x / WIDTH) * 100, y: (glowAt.y / HEIGHT) * 100, r: 66, strength: 0.9 * light };

  // Panel: grows out of the ninth key into the 3x3 (the icon's shape), then down over the 4th row.
  const grow = ramp(t, T.panel, 14, 0, 1, EASE.camera);
  const extend = ramp(t, T.row4, 14, 0, 1, EASE.camera);
  const panel =
    t < T.panel
      ? null
      : {
          ...mixBox(mixBox(keyBox('9', SIZE), panelBox(SIZE, 3), grow), panelBox(SIZE, 4), extend),
          color: interpolateColors(ramp(t, T.panel, 20, 0, 1, EASE.out), [0, 1], ['#5b4a99', C.panel]),
        };

  // The speak bar lands with the camera; Speak (disabled: nothing to say yet) 4 frames later.
  const barP = ramp(t, T.barIn, 8, 0, 1, EASE.camera);
  const speakP = ramp(t, T.barIn + 4, 8, 0, 1, EASE.camera);
  const n = T.press.filter((p) => t >= p).length;
  const step = n > 0 ? SENTENCE.steps[n - 1]! : undefined;

  return (
    <AbsoluteFill style={{ backgroundColor: C.night }}>
      <NightGround glow={glow} />
      <World cam={cam} vel={vel}>
        <DotField opacity={0.75 * light} />
        <At x={0} y={0}>
          <HeroKeypad size={SIZE} keys={keyStates(t)} panel={panel} />
        </At>
        {t < T.morphEnd ? (
          <At x={k9.x} y={k9.y}>
            <Morph t={t} zoom={cam.zoom} />
          </At>
        ) : null}
        {barP > 0 ? (
          <At x={BAR_CX} y={BAR_CY + (1 - barP) * 24} z={18} style={{ opacity: barP }}>
            <HeroBar
              scale={BAR_SCALE}
              textWidth={TEXT_W}
              speakWidth={SPEAK_W}
              text={step?.text ?? ''}
              digits={step?.codes.join(' ') ?? ''}
              speak={{
                appear: speakP,
                dy: (1 - speakP) * 24,
                enabled: t >= T.whip ? 1 : 0,
                pressed: t >= T.speakPress ? 1 : 0,
              }}
            />
          </At>
        ) : null}
      </World>
    </AbsoluteFill>
  );
};
