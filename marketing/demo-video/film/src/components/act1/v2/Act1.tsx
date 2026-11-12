/**
 * The second cut's Act 1, drawn from the ABSOLUTE film frame (so a shot can run across scene lines):
 * S01-S05 each render <Act1 abs={SCENES.sXX.from + frame} />. Times and states: script.ts. Sound: Act1Sound.
 *
 * 1 dead air: the tube switches on, static, `ch 09`, `no signal`; the picture rolls once and locks on the
 *   drawer with a faint multipath ghost.
 * 2 through the glass: the tube's look ramps to nothing while we push in; the cut to the clean still is
 *   invisible (same framing).
 * 3 the drawer: the phone wakes by itself (its lit edit, its screen and its legends, on the 12 Hz grid).
 * 4 the macro: the idle screen, then ghost typing (keys 4 3 5 5 6); the keys' light blooms up from below.
 * 5 the keypad still: key 0 is pressed, Hello is accepted.
 * 6a the macro: Hello, the battery empties, "Battery low", the lights die.
 * 6 the dark drawer: the same place with the light gone; a cloud crosses the moon.
 * 7 out through the glass: the tube's look returns; the set switches off to a line, then the dot.
 * 8 the dot: the lines, the 3 x 3 wink, the dot warms to ember while black deepens to night (the hand-off).
 */
import React from 'react';
import { AbsoluteFill, interpolateColors } from 'remotion';
import { C } from '../../../tokens';
import { sec } from '../../../timeline';
import { EASE, ramp, stepped } from '../../../lib/anim';
import { narrWords } from '../../type/Type';
import { TubePicture, STATIC_HZ, TUBE, screenBox, switchOff, switchOn } from '../TubePicture';
import { Line, Osd } from '../Type';
import { BeamDot, Dot } from '../Dot';
import { A1, DOT } from '../palette';
import { Still } from './Still';
import { FRAMING, PhoneLayers } from './PhoneScreen';
import { levels } from './lcdModel';
import { plate } from './plates';
import { A1V2 as A, DRAWER_ZOOM_AT_PUSH, PUSH_ZOOM, backlightAt, bitsAt, pressAt } from './script';

const W = 1920;
const H = 1080;
/** Where the phone sits in the drawer still (still px). */
const DRAWER_C = { x: FRAMING.p5.cx, y: FRAMING.p5.cy };

/** Zoom moved in log space ("zooming linearly in z feels wrong"). */
const logZoom = (f: number, f0: number, f1: number, z0: number, z1: number, e = EASE.inOut) =>
  Math.exp(ramp(f, f0, Math.max(1, f1 - f0), Math.log(z0), Math.log(z1), e));

// --- captions: the narrator's words, exact, landing 2 frames before he says them ------------------------

const wordAt = (id: Parameters<typeof narrWords>[0], i: number) => (narrWords(id)[i]?.start ?? 0) - 2;

type Cap = { text: string; from: number; to: number; row: 0 | 1 };
const caps = (): Cap[] => [
  { text: 'nine keys.', from: wordAt('n02-nine-keys', 0), to: wordAt('n03-worked-out', 1), row: 0 },
  { text: 'one press per letter.', from: wordAt('n02-nine-keys', 2), to: wordAt('n03-worked-out', 1), row: 1 },
  { text: 'the phone worked out the word.', from: wordAt('n03-worked-out', 1), to: sec(12.7), row: 1 },
  { text: 'then glass replaced the keys.', from: wordAt('n04-glass', 0), to: sec(18.2), row: 0 },
  { text: 'the keypad went quiet.', from: wordAt('n04-glass', 6), to: sec(18.2), row: 1 },
];
const CAP_X = 112;
const CAP_Y = [812, 890];

const Captions: React.FC<{ abs: number }> = ({ abs }) => {
  const on = caps().filter((c) => abs >= c.from && abs < c.to);
  const any = caps().some((c) => abs >= c.from - 8 && abs < c.to + 8);
  const back = any
    ? Math.min(...caps().filter((c) => abs >= c.from - 8 && abs < c.to + 8).map((c) => Math.min(ramp(abs, c.from - 8, 8), ramp(abs, c.to, 8, 1, 0))))
    : 0;
  return (
    <>
      {any ? (
        <AbsoluteFill
          style={{ background: 'linear-gradient(to top, rgba(6,4,12,0.62) 0%, rgba(6,4,12,0.35) 22%, rgba(6,4,12,0) 40%)', opacity: Math.max(back, on.length ? 1 : 0) }}
        />
      ) : null}
      {on.map((c) => (
        <Line key={c.text} text={c.text} x={CAP_X} y={CAP_Y[c.row]!} size={64} />
      ))}
    </>
  );
};

// --- the screen and the legends on a still -----------------------------------------------------------

const Phone: React.FC<{ abs: number; on: 'p5' | 'p2' | 'p3'; contrast?: number; legends?: boolean }> = ({ abs, on, contrast = 1, legends = true }) => (
  <PhoneLayers plate={plate(on)} levels={levels(bitsAt, abs)} backlight={backlightAt(abs)} press={pressAt(abs)} contrast={contrast} legends={legends} />
);

/** The macro's keys are below the frame: a pressed key's light blooms up from the bottom edge, out of focus. */
const MacroBloom: React.FC<{ abs: number }> = ({ abs }) => {
  const pr = pressAt(abs);
  const bl = backlightAt(abs);
  if (!pr || bl <= 0) return null;
  const p = plate('p2');
  const k = p.keys[pr.k];
  const row = ['1', '2', '3'].includes(pr.k) ? 0 : 1;
  const x = k.center[0];
  const y = Math.min(k.center[1], p.height + 40);
  const r = row === 0 ? 300 : 380;
  const a = (row === 0 ? 0.32 : 0.22) * pr.amount * bl;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - r,
        top: y - r,
        width: 2 * r,
        height: 2 * r,
        borderRadius: '50%',
        background: `radial-gradient(closest-side, rgba(205,235,140,${a.toFixed(3)}) 0%, rgba(205,235,140,${(a * 0.45).toFixed(3)}) 45%, rgba(205,235,140,0) 100%)`,
        mixBlendMode: 'screen',
      }}
    />
  );
};

// --- the tube bookends -------------------------------------------------------------------------------

const DrawerInTube: React.FC = () => {
  const s = screenBox();
  return <Still plate="p5" w={s.w} h={s.h} zoom={1} cx={DRAWER_C.x} cy={DRAWER_C.y} />;
};

const rollIn = (f: number, t0: number, t1: number) => (f < t0 || f >= t1 ? 0 : ramp(f, t0, t1 - t0, 0, 1, EASE.inOut));

const Tube: React.FC<{ abs: number }> = ({ abs }) => {
  const s = screenBox();
  const f = stepped(abs, STATIC_HZ);
  // Shot 1, shot 2 (push in), shot 7 (pull back, then the switch-off).
  const inPull = abs >= A.pull[0];
  const zoom = inPull ? logZoom(abs, A.pull[0], A.pull[1], PUSH_ZOOM, 1, EASE.inOut) : logZoom(abs, A.push[0], A.push[1], 1, PUSH_ZOOM, EASE.inOut);
  const look = inPull ? ramp(abs, A.pull[0], A.pull[1] - A.pull[0], 0, 1, EASE.inOut) : ramp(abs, A.push[0], A.push[1] - A.push[0], 1, 0, EASE.inOut);
  const noise = inPull
    ? ramp(abs, A.pull[0], A.pull[1] - A.pull[0], 0, 0.1, EASE.linear)
    : f < A.thin
      ? 1
      : abs < A.push[0]
        ? ramp(f, A.thin, A.lock - A.thin, 0.62, 0.12, EASE.out)
        : ramp(abs, A.push[0], A.push[1] - A.push[0], 0.12, 0, EASE.linear);
  const picture = inPull ? 1 : f < A.thin ? 0 : ramp(f, A.thin, A.lock - A.thin, 0.45, 1, EASE.linear);
  const roll = inPull ? 0 : rollIn(f, A.roll[0], A.roll[1]);
  const ghost = inPull
    ? { amount: ramp(abs, A.pull[0], A.pull[1] - A.pull[0], 0, 0.12), offset: 12 }
    : { amount: f < A.thin ? 0 : ramp(f, A.thin + sec(0.15), A.lock - A.thin, 0.18, 0, EASE.linear), offset: 12 };
  const power = inPull ? switchOff(abs, A.off) : switchOn(abs, A.tvOn);
  const osd = inPull ? null : (
    <>
      {abs >= A.osd && abs < A.channelOff ? <Osd text="ch 09" corner="tr" w={s.w} h={s.h} /> : null}
      {abs >= A.osd && abs < A.noSignalOff ? <Osd text="no signal" corner="bl" w={s.w} h={s.h} /> : null}
    </>
  );
  return (
    <AbsoluteFill style={{ background: '#000', transform: `scale(${zoom})`, transformOrigin: '50% 50%' }}>
      {abs >= A.tvOn ? (
        <TubePicture {...power} noise={noise} roll={roll} look={look} ghost={ghost} overlay={osd}>
          {picture > 0 ? (
            <div style={{ position: 'absolute', inset: 0, opacity: picture }}>
              <DrawerInTube />
            </div>
          ) : null}
        </TubePicture>
      ) : null}
    </AbsoluteFill>
  );
};

// --- the dot -----------------------------------------------------------------------------------------

const LINES = { top: 642, pitch: 78, size: 64 } as const;
const WINK_PITCH = 104;
const STEP = sec(1 / STATIC_HZ);

const winkLevel = (f: number) => {
  const d = (f - A.wink) / STEP;
  const seq = [0.05, 0.1, 0.14, 0.09, 0.14, 0.08, 0.03];
  if (d < 0 || d >= seq.length) return 0;
  return seq[Math.floor(d)]!;
};

const dotLines = () => [
  { text: 'old is not the same as bad.', from: wordAt('n05-not-bad', 1) },
  { text: 'it had few keys. big ones.', from: A.extraLines[0] },
  { text: 'it could write with no signal.', from: A.extraLines[1] },
  { text: 'it still has something to say.', from: wordAt('n06-something', 0) },
];

const TheDot: React.FC<{ abs: number }> = ({ abs }) => {
  const f = stepped(abs, STATIC_HZ);
  const warm = ramp(f, A.warm, A.warmLen, 0, 1, EASE.inOut);
  const ground = interpolateColors(warm, [0, 1], [A1.black, C.night]);
  const wink = winkLevel(f);
  const linesOn = abs < A.linesOut;
  return (
    <AbsoluteFill style={{ backgroundColor: ground }}>
      {linesOn
        ? dotLines().map((l, i) =>
            abs >= l.from ? <Line key={i} text={l.text} x={0} width={W} align="center" y={LINES.top + i * LINES.pitch} size={LINES.size} /> : null,
          )
        : null}
      {wink > 0
        ? [0, 1, 2].flatMap((r) =>
            [0, 1, 2].map((c) => (r === 2 && c === 2 ? null : <Dot key={`${r}${c}`} x={DOT.x - (2 - c) * WINK_PITCH} y={DOT.y - (2 - r) * WINK_PITCH} opacity={wink} />)),
          )
        : null}
      {abs < A.off + TUBE.collapseFrames + TUBE.shrinkFrames ? <BeamDot frame={abs} at={A.off} warm={warm} /> : <Dot warm={warm} />}
    </AbsoluteFill>
  );
};

// --- the act -----------------------------------------------------------------------------------------

export const Act1: React.FC<{ abs: number }> = ({ abs }) => {
  let shot: React.ReactNode;
  if (abs < A.shot3) shot = <Tube abs={abs} />;
  else if (abs < A.shot4) {
    // 3: the drawer; a slow push while the phone wakes.
    const z = logZoom(abs, A.shot3, A.shot4, DRAWER_ZOOM_AT_PUSH, DRAWER_ZOOM_AT_PUSH * 1.045);
    shot = (
      <Still plate="p5" w={W} h={H} zoom={z} cx={DRAWER_C.x} cy={DRAWER_C.y} lit={backlightAt(abs)}>
        <Phone abs={abs} on="p5" />
      </Still>
    );
  } else if (abs < A.insert || (abs >= A.back && abs < A.shot6)) {
    // 4 and 6a: the macro. 4 holds; 6a pushes slowly toward the screen.
    const six = abs >= A.back;
    const z = six ? logZoom(abs, A.back, A.shot6, 1.03, 1.09) : logZoom(abs, A.shot4, A.insert, 1.0, 1.03);
    const cx = six ? ramp(abs, A.back, A.shot6 - A.back, 1300, 1340, EASE.inOut) : 1300;
    const cy = six ? ramp(abs, A.back, A.shot6 - A.back, 650, 610, EASE.inOut) : 650;
    shot = (
      <Still plate="p2" w={W} h={H} zoom={z} cx={cx} cy={cy} lit={backlightAt(abs)} dof={{ y0: 980, y1: 1320, px: 7 }}>
        <Phone abs={abs} on="p2" contrast={0.85} legends={false} />
        <MacroBloom abs={abs} />
      </Still>
    );
  } else if (abs < A.back) {
    // 5: the keypad still, key 0.
    const p = plate('p3');
    const c0 = p.keys['0'].center;
    const c8 = p.keys['8'].center;
    const z = logZoom(abs, A.insert, A.back, 2.0, 2.08);
    shot = (
      <Still plate="p3" w={W} h={H} zoom={z} cx={c0[0]} cy={(c0[1] + c8[1]) / 2} lit={backlightAt(abs)}>
        <Phone abs={abs} on="p3" />
      </Still>
    );
  } else if (abs < A.pull[0]) {
    // 6: the dark drawer, pulling back to the framing the tube will take; a cloud crosses the moon.
    const z = logZoom(abs, A.shot6, A.pull[0], DRAWER_ZOOM_AT_PUSH * 1.045, DRAWER_ZOOM_AT_PUSH);
    const mid = (A.cloud[0] + A.cloud[1]) / 2;
    const half = (A.cloud[1] - A.cloud[0]) / 2;
    const cloud = abs < mid ? ramp(abs, A.cloud[0], half, 1, 0.6, EASE.inOut) : ramp(abs, mid, half, 0.6, 1, EASE.inOut);
    shot = <Still plate="p5" w={W} h={H} zoom={z} cx={DRAWER_C.x} cy={DRAWER_C.y} light={cloud} />;
  } else if (abs < A.off + TUBE.collapseFrames) shot = <Tube abs={abs} />;
  else shot = <TheDot abs={abs} />;
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {shot}
      {abs >= A.shot3 && abs < A.off ? <Captions abs={abs} /> : null}
    </AbsoluteFill>
  );
};
