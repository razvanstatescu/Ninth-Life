/**
 * s06 and s07, bars 1 to 4: one continuous shot on one clock (`t` = frames since Act 2 bar 1 beat 1), so
 * S06's last frame and S07's first frame are the same picture (07-revision-v2.md, section 4).
 *
 * Bar 1  "Same keys". t = 0 is s05's last frame exactly: the ember dot, 28 px, at (960, 540), on night.
 *        The dot is key 9's backlight on the old phone's keypad (the Act 1 still, straight on, under dust);
 *        its light spreads over the keypad. Key 9 turns into the app's ember key, then 8 and 6, 5, 7 and 3,
 *        4 and 2, 1 (by distance from the ninth), one per eighth, each in fine cells. The picture moves on
 *        Act 1's 12 Hz steps through the first eighth, then 20, 30 and 60: the frame rate comes back.
 * Bar 2  The bottom row (Back, Space, Next) changes as a group; the phone's body fades to night; the keys
 *        re-form into the app's keypad while the moon panel grows out of the ninth key; the camera pulls
 *        back onto the night studio floor; one light sweep crosses the panel. Key 9 is the one ember thing.
 * Bar 3  "hello": the camera comes in (the keypad about 68% of the frame's height) with room above the keys;
 *        4 3 5 5 6 on eighths, Space; the decoder's guess redraws large above the keys on every press ("Hell"
 *        stays one eighth). A slow 3% push runs across bars 3-4.
 * Bar 4  "again": 2 4 2 4 6, then on beat 4 a whip right to Speak (ember), pressed just before bar 5.
 *
 * World px = screen px at zoom 1; key 9's centre is the world origin (see ./plate.ts).
 */
import React from 'react';
import { AbsoluteFill, interpolateColors } from 'remotion';
import { C, FONT } from '../../tokens';
import { EIGHTH } from '../../timeline';
import { World, At, cameraAt, cameraVelocity, type CamKey } from '../../lib/camera';
import { EASE, jump, ramp, rateRamp } from '../../lib/anim';
import { Keypad, keyCenter, keyIdOf, keypadLayout, type KeyId, type KeyState } from '../brand/Keypad';
import { ContactGlow, EmberSpill, Floor, StudioGround } from '../brand/Studio';
import { Icon } from '../brand/Icon';
import decoded from '../../data/decoded.json';
import { b } from './time';
import { OLD_ROWS, boxCenter, growBox, mixWBox, oldKeyBox, oldKeypadBox, type WBox } from './plate';
import { Key9Light, MorphKey, MorphPanel, OldPlate, cellClip } from './Rebirth';

// ---- The app's keypad (world px, key 9 at the origin) ------------------------------------------------

/** Key edge of the app's keypad in world px. */
export const K = 160;
const L = keypadLayout(K);
const kk = K / 96;
const C9 = keyCenter('9', K);
/** The panel's centre: key 9 stays where the old key 9 was. */
export const PANEL_C = { x: -C9.x, y: -C9.y };
const newKeyBox = (id: KeyId): WBox => {
  const c = keyCenter(id, K);
  const x = c.x + PANEL_C.x;
  const y = c.y + PANEL_C.y;
  return { l: x - K / 2, t: y - K / 2, r: x + K / 2, b: y + K / 2, radius: 24 * kk };
};
const PANEL_BOX: WBox = {
  l: PANEL_C.x - L.width / 2,
  t: PANEL_C.y - L.height / 2,
  r: PANEL_C.x + L.width / 2,
  b: PANEL_C.y + L.height / 2,
  radius: 44 * kk,
};
/** Where the keypad stands. */
export const FLOOR_Y = PANEL_BOX.b + 14;

/** The words above the keys (world px): the decoder's guess (160 px on screen), its codes under it (46 px). */
const GUESS = { x: PANEL_C.x, y: PANEL_BOX.t - 174, size: 170 };
const CODES = { x: PANEL_C.x, y: PANEL_BOX.t - 38, size: 49 };

/** Speak: a big ember key standing on the floor to the right, off the frame until the whip. */
const SPEAK = { x: 1480, w: 576, h: 192, side: 12 };
const SPEAK_Y = FLOOR_Y - SPEAK.side - SPEAK.h / 2 - 2;

// ---- Times (t) ---------------------------------------------------------------------------------------

const SENTENCE = decoded.sentences['hello-again'];

export const T = {
  /** The picture's frame rate comes back: 12, 20, 30, then 60 per second, one eighth each. */
  rateStarts: [0, b(1, 1, 1), b(1, 2), b(1, 2, 1)],
  rates: [12, 20, 30, 60],
  /** When each old key turns into the app's key (by distance from the ninth). */
  conv: {
    '9': b(1, 1, 1),
    '8': b(1, 2),
    '6': b(1, 2),
    '5': b(1, 2, 1),
    '7': b(1, 3),
    '3': b(1, 3),
    '4': b(1, 3, 1),
    '2': b(1, 3, 1),
    '1': b(1, 4),
    star: b(2),
    '0': b(2),
    hash: b(2),
  } as Record<KeyId, number>,
  /** Frames a key takes to change, cell by cell. */
  dissolve: 10,
  /** The slots that get a rising key tone (A C D E G A C): one per change. */
  toneSlots: [b(1, 1, 1), b(1, 2), b(1, 2, 1), b(1, 3), b(1, 3, 1), b(1, 4), b(2)],
  bodyFade: b(2) + 4,
  bodyFadeLen: 12,
  reform: b(2) + 8,
  reformLen: 22,
  /** The panel grows once the keys are most of the way to their places, done for the handover. */
  panel: b(2) + 18,
  panelLen: 14,
  /** The brand <Keypad> takes over once the keys have reached its layout. */
  handover: b(2, 2) + 2,
  pull: b(2, 2),
  pullEnd: b(2, 3, 1),
  sweep: b(2, 2, 1) + 3,
  sweepLen: 54,
  pushIn: b(3) - 12,
  /** Presses of "hello again": bar 3 from beat 1 (6 presses, the 6th is Space), bar 4 from beat 1 (5). */
  press: SENTENCE.presses.map((_, i) => (i < 6 ? b(3) + i * EIGHTH : b(4) + (i - 6) * EIGHTH)),
  whip: b(4, 4) - 12,
  speakPress: b(5) - 6,
  end: b(5),
};

const PRESS_KEYS = SENTENCE.presses.map((p) => keyIdOf(p));

/** Picture time: Act 1's steps through the first three eighths, smooth from the fourth. */
const pictureTime = (t: number) => rateRamp(t, T.rateStarts, T.rates);

// ---- Camera ------------------------------------------------------------------------------------------

const OLD_C = boxCenter(oldKeypadBox());
const DRIFT = { x: OLD_C.x, y: OLD_C.y, zoom: 0.86 };
/** The keys settle large while the panel grows, then the camera pulls back onto the floor. */
const MID = { x: PANEL_C.x, y: PANEL_C.y, zoom: 1.1, rx: -2, ry: -2 };
const EST = { x: PANEL_C.x, y: PANEL_C.y + 34, zoom: 0.86, rx: -9, ry: -7 };
/** Typing: the keypad about 67% of the frame's height, low in the frame, the words above it (inside the 64 px margin). */
const TYPE = { x: PANEL_C.x, y: -222, zoom: 0.92, rx: -6, ry: -4 };
/** A slow push of 3% across bars 3-4, so the shot is never static. */
const TYPE_PUSH = 1.03;
const SPK = { x: SPEAK.x, y: SPEAK_Y - 60, zoom: 1.12, rx: -8, ry: -3 };

export const STAGE_CAMERA: CamKey[] = [
  { f: 0, x: 0, y: 0, zoom: 1, rx: 0, ry: 0, rz: 0 },
  // Bar 1: a slow drift onto the old keypad (it carries the frame rate coming back).
  { f: b(2), ...DRIFT, ease: EASE.out },
  // Bar 2: in with the keys as they re-form, then back onto the studio floor.
  { f: T.reform + T.reformLen, ...MID, ease: EASE.inOut },
  { f: T.pullEnd, ...EST, ease: EASE.flight },
  { f: T.pushIn, ...EST, zoom: EST.zoom * 1.01, ease: EASE.linear },
  // Bar 3: in, with room for the words, landing on the first press; then a slow push to the whip.
  { f: b(3), ...TYPE, ease: EASE.camera },
  { f: T.whip, ...TYPE, zoom: TYPE.zoom * TYPE_PUSH, ry: -2.5, ease: EASE.linear },
  // Bar 4: on beat 4 the whip right to Speak.
  { f: b(4, 4), ...SPK, ease: EASE.whip },
  { f: T.end, ...SPK, zoom: SPK.zoom * 1.01, ease: EASE.linear },
];

export const stageCam = (t: number) => cameraAt(t < T.rateStarts[3]! ? pictureTime(t) : t, STAGE_CAMERA);

// ---- States ------------------------------------------------------------------------------------------

/** The pressed ring of press i: on with the app's jump, off in 3 frames when the next press lands. */
const ringOf = (t: number, i: number) => {
  const p = T.press[i]!;
  if (t < p) return 0;
  const next = T.press[i + 1];
  const end = next !== undefined ? Math.min(next, p + EIGHTH) : p + EIGHTH;
  return jump(t, p) * (1 - ramp(t, end, 3, 0, 1, EASE.linear));
};

/** A key going down on a press and back up (no overshoot). */
const sinkOf = (t: number, p: number) => (t < p ? 0 : ramp(t, p, 3, 0, 1, EASE.out) * (1 - ramp(t, p + 7, 8, 0, 1, EASE.out)));

const keypadStates = (t: number) => {
  const keys: Partial<Record<KeyId, KeyState>> = {};
  // The ninth key keeps its ember until the first press takes it.
  keys['9'] = { lit: 1 - jump(t, T.press[0]!) };
  let spillKey: KeyId = '9';
  let spill = 0.13 * (1 - jump(t, T.press[0]!));
  PRESS_KEYS.forEach((id, i) => {
    const ring = ringOf(t, i);
    const sink = sinkOf(t, T.press[i]!);
    const prev = keys[id] ?? {};
    keys[id] = { ...prev, press: Math.max(prev.press ?? 0, ring), sink: Math.max(prev.sink ?? 0, sink) };
    if (ring > 0) {
      spillKey = id;
      spill = 0.1 * ring;
    }
  });
  return { keys, spillKey, spill };
};

/** The guess and its codes after the presses so far. */
const guessAt = (t: number) => {
  const n = T.press.filter((p) => t >= p).length;
  const step = n > 0 ? SENTENCE.steps[n - 1]! : undefined;
  return { text: step?.text ?? '', codes: step?.codes.join(' ') ?? '' };
};

// ---- Pieces ------------------------------------------------------------------------------------------

/** Bar 1 and the start of bar 2: the old keypad and the keys turning into the app's keys. */
const SameKeys: React.FC<{ t: number }> = ({ t }) => {
  const tp = pictureTime(t);
  // The dot's light spreads over the keypad through the first beat, then grows as the keys come alive.
  const reach = ramp(tp, 0, 40, 0, 1100, EASE.out) + ramp(tp, 30, 90, 0, 600, EASE.inOut);
  const body = 1 - ramp(t, T.bodyFade, T.bodyFadeLen, 0, 1, EASE.out);
  const re = ramp(t, T.reform, T.reformLen, 0, 1, EASE.inOut);
  const depth = ramp(t, T.reform, T.reformLen, 0, 8, EASE.inOut);
  const light = ramp(t, T.reform, T.reformLen + 10, 0, 1, EASE.out);
  const grow = ramp(t, T.panel, T.panelLen, 0, 1, EASE.camera);
  const panelColor = interpolateColors(ramp(t, T.panel, T.panelLen, 0, 1, EASE.out), [0, 1], ['#5b4a99', C.panel]);
  const k9 = oldKeyBox('9');
  return (
    <>
      <OldPlate reach={reach} level={0.86} opacity={body} />
      {/* The dot's warm light on the dusty plastic around key 9 (the ember thing's light, not a second one). */}
      {body > 0 && reach > 0 ? <EmberSpill x={0} y={0} size={1300} strength={0.15 * Math.min(1, reach / 600) * body} /> : null}
      {t >= T.panel ? <MorphPanel box={mixWBox(newKeyBox('9'), PANEL_BOX, grow)} size={K} depth={depth} light={light} color={panelColor} /> : null}
      {OLD_ROWS.flat().map((id) => {
        const at = T.conv[id];
        const p = ramp(tp, at, T.dissolve, 0, 1, EASE.linear);
        if (p <= 0) return null;
        const from = growBox(oldKeyBox(id), 4);
        const box = mixWBox(from, newKeyBox(id), re);
        const clip = cellClip(from.r - from.l, from.b - from.t, 9, p, `nl-same-keys-${id}`);
        return <MorphKey key={id} id={id} box={box} size={K} state={{ lit: id === '9' ? 1 : 0, depth, light, clip }} />;
      })}
      {/* Key 9's backlight: the hand-off dot, then the light around and through the old key. */}
      {tp < T.conv['9'] + T.dissolve ? (
        <Key9Light box={k9} spread={ramp(tp, 0, 10, 0, 1, EASE.out)} dot={1 - ramp(tp, 5, 15, 0, 0.55, EASE.out)} />
      ) : null}
    </>
  );
};

/** Speak, as a big ember key standing on the floor. */
const StandingSpeak: React.FC<{ pressed: number }> = ({ pressed }) => {
  const s = SPEAK.h / 80;
  const travel = SPEAK.side * 0.7 * pressed;
  return (
    <div style={{ position: 'relative', width: SPEAK.w, height: SPEAK.h }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          translate: `0 ${travel}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10 * s,
          borderRadius: 24 * s,
          background: pressed > 0.5 ? C.emberDeep : C.ember,
          color: C.onEmber,
          fontFamily: FONT.sans,
          fontSize: 26 * s,
          fontWeight: 800,
          boxShadow: `0 ${SPEAK.side - travel}px 0 0 #9a5a0c, 0 0 ${40 * s * (1 - pressed)}px rgba(255,177,61,0.28)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 24 * s,
            background: 'linear-gradient(160deg, rgba(255,243,214,0.32) 0%, rgba(255,243,214,0) 46%)',
          }}
        />
        <Icon name="speaker" size={30 * s} color={C.onEmber} stroke={2.5} />
        <span style={{ position: 'relative' }}>Speak</span>
      </div>
    </div>
  );
};

export const Stage: React.FC<{ t: number }> = ({ t }) => {
  const cam = stageCam(t);
  const vel = cameraVelocity(t < T.rateStarts[3]! ? pictureTime(t) : t, STAGE_CAMERA);
  // The light comes on in bar 2: the studio's glow, the floor, the contact glow.
  const studio = ramp(t, T.pull, 40, 0, 1, EASE.out);
  const glow = { x: 47, y: 44, r: 66, strength: 0.95 * studio };
  const { keys, spillKey, spill } = keypadStates(t);
  const guess = guessAt(t);
  const speakPressed = t >= T.speakPress ? 1 : 0;
  const words = t >= T.press[0]!;
  return (
    <AbsoluteFill style={{ backgroundColor: C.night }}>
      {studio > 0 ? <StudioGround glow={glow} horizon={64} haze={0.5 * studio} /> : null}
      <World cam={cam} vel={vel}>
        {studio > 0 ? <Floor y={FLOOR_Y} x={PANEL_C.x + 900} opacity={studio} /> : null}
        {studio > 0 ? <ContactGlow x={PANEL_C.x} y={FLOOR_Y + 4} w={L.width * 1.3} strength={studio} /> : null}
        {t < T.handover ? (
          <SameKeys t={t} />
        ) : (
          <At x={PANEL_C.x} y={PANEL_C.y}>
            <Keypad
              size={K}
              depth={8}
              light={1}
              keys={keys}
              spillFrom={spillKey}
              spill={spill}
              sweep={ramp(t, T.sweep, T.sweepLen, 0, 1, EASE.inOut)}
            />
          </At>
        )}
        {words ? (
          <>
            <div
              style={{
                position: 'absolute',
                left: GUESS.x - 1400,
                top: GUESS.y - GUESS.size * 0.6,
                width: 2800,
                textAlign: 'center',
                fontFamily: FONT.sans,
                fontWeight: 700,
                fontSize: GUESS.size,
                lineHeight: 1.2,
                letterSpacing: '-0.015em',
                color: C.ink,
                whiteSpace: 'nowrap',
              }}
            >
              {guess.text}
            </div>
            <div
              style={{
                position: 'absolute',
                left: CODES.x - 1400,
                top: CODES.y - CODES.size * 0.6,
                width: 2800,
                textAlign: 'center',
                fontFamily: FONT.mono,
                fontWeight: 500,
                fontSize: CODES.size,
                lineHeight: 1.2,
                letterSpacing: '0.06em',
                color: C.inkMuted,
                whiteSpace: 'nowrap',
              }}
            >
              {guess.codes}
            </div>
          </>
        ) : null}
        {t >= T.pushIn ? (
          <>
            <ContactGlow x={SPEAK.x} y={FLOOR_Y + 4} w={SPEAK.w * 1.2} />
            <At x={SPEAK.x} y={SPEAK_Y}>
              <StandingSpeak pressed={speakPressed} />
            </At>
          </>
        ) : null}
      </World>
    </AbsoluteFill>
  );
};
