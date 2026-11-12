/**
 * TubePicture: the old television of Act 1 (and the small "then" inset of S15).
 *
 *   <TubePicture noise={0.12} overlay={<Caption text="..." />}>
 *     <PhonePlate ... />                        // the picture ("signal")
 *   </TubePicture>
 *
 * Two layers, each an <HtmlInCanvas> with the tube's look:
 * - the SIGNAL (children): static (tubeStatic), slight softness, a small barrel curve, 1-2 px colour
 *   fringe, faint scanlines that never move, vignette;
 * - the SET's own text (`overlay`: the on-screen display and Act 1's lines): the same curve, fringe,
 *   scanlines and vignette, but no static, so it stays readable through "no signal".
 * Both sit in a dark surround with a hint of the tube's rounded corners. No brand plate.
 *
 * Power: `open` (vertical opening), `power` (brightness) come from switchOn()/switchOff(); spread them:
 *   <TubePicture {...switchOn(frame, at)} noise={1}>...
 * The second half of the switch-off (the line shrinking to a dot) is drawn by <BeamDot>, outside
 * the tube, so the dot left behind is crisp and identical to the dot of S05.
 *
 * Act 1 changes its contents on a 12 Hz grid: pass stepped frames to anything that moves. The
 * static's pattern changes 12 times a second by itself (seed from the frame, stepped).
 *
 * A small "then" inset (scene 15), tested at 720 x 405:
 *
 *   const s = screenBox(W, H);                                   // the picture area of a W x H set
 *   const tube = frame >= offAt ? switchOff(frame, offAt) : { open: 1, power: 1 };
 *   {frame < offAt + TUBE.collapseFrames ? (
 *     <TubePicture width={W} height={H} noise={0.1} {...tube}>
 *       <ScreenPlate w={s.w} h={s.h} text="hello" code="43556" cursor frame={stepped(frame, 12)} align="left" zoom={1.3} />
 *     </TubePicture>
 *   ) : (
 *     <BeamDot frame={frame} at={offAt} width={W} height={H} dotSize={12} />   // line, then a pale dot
 *   )}
 *
 * Each TubePicture is two <HtmlInCanvas> layers: keep it outside any other <HtmlInCanvas> (for
 * example outside <World>, which blurs with one) unless HtmlInCanvas.isNestingSupported().
 */
import React from 'react';
import { AbsoluteFill, HtmlInCanvas, useCurrentFrame } from 'remotion';
import { barrelDistortion } from '@remotion/effects/barrel-distortion';
import { chromaticAberration } from '@remotion/effects/chromatic-aberration';
import { scanlines } from '@remotion/effects/scanlines';
import { vignette } from '@remotion/effects/vignette';
import { blur } from '@remotion/effects/blur';
import { tubeStatic } from './tubeStatic';
import { A1 } from './palette';
import { EASE, ramp, stepped } from '../../lib/anim';
import { sec } from '../../timeline';

export const STATIC_HZ = 12;

export type TubeProps = {
  /** Size of the whole set in px. Defaults to the full frame. */
  width?: number;
  height?: number;
  /** 0..1: how much of the picture is replaced by static. 1 = "no signal"; 0.1-0.15 over a locked picture. */
  noise?: number;
  /** Added to the static's seed so two tubes on screen do not share a pattern. */
  seedSalt?: number;
  /** 0..1: vertical opening of the picture (switch-on and switch-off). */
  open?: number;
  /** 0..1: brightness of the tube. */
  power?: number;
  /** Vertical roll of the picture, in picture heights (wraps; a dark blanking bar passes through). */
  roll?: number;
  /** The set's own layer: on-screen display and lines. Not covered by the static. */
  overlay?: React.ReactNode;
  /**
   * 0..1: strength of the tube's look (blur, curve, colour fringe, scanlines, vignette). 1 = the set as
   * before; the second cut ramps it to 0 to push through the glass into a clean picture, and back.
   */
  look?: number;
  /** Analog multipath "ghost": a faint copy of the picture offset to the right. amount 0..1, offset px. */
  ghost?: { amount: number; offset: number };
  /** The picture. Laid out in a box of the screen's size (see screenBox()). */
  children?: React.ReactNode;
};

/** The picture area inside the set, in px of the set: a small dark margin, then the screen. */
export const screenBox = (width = 1920, height = 1080) => {
  const m = Math.round(width * 0.0125);
  return { x: m, y: m, w: width - 2 * m, h: height - 2 * m, r: Math.round(width * 0.028) };
};

/** The tube's look, scaled to the set's width (fringe and blur are in px). */
const lookEffects = (width: number, look = 1) => {
  const k = width / 1920;
  const l = Math.max(0, Math.min(1, look));
  const off = l < 0.01;
  return [
    blur({ radius: Math.max(0.35, 0.7 * k) * l, disabled: off }),
    barrelDistortion({ amount: 0.05 * l, disabled: off }),
    chromaticAberration({ amount: Math.max(0.6, 1.5 * k) * l, angle: 0, disabled: off }),
    // Multiplicative, faint (about 18% darker between lines), never animated.
    scanlines({ amount: 0.2 * l, spacing: 4, thickness: 2, premultiply: true, disabled: off }),
    vignette({ amount: 0.6 * l, radius: 0.62, feather: 0.55, roundness: 0.75, disabled: off }),
  ];
};

export const TubePicture: React.FC<TubeProps> = ({
  width = 1920,
  height = 1080,
  noise = 0.12,
  seedSalt = 0,
  open = 1,
  power = 1,
  roll = 0,
  look: lookAmount = 1,
  ghost,
  overlay,
  children,
}) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(stepped(frame, STATIC_HZ) / (60 / STATIC_HZ)) * 7 + seedSalt * 1013;
  const s = screenBox(width, height);
  const look = lookEffects(width, lookAmount);
  const r = ((roll % 1) + 1) % 1;
  const gap = Math.round(s.h * 0.08); // the blanking bar seen while the picture rolls
  // When nearly closed, the screen's corners round off fully so the line tapers at its ends.
  const thin = 1 - ramp(open, 0.04, 0.3, 0, 1, EASE.linear);
  const rx = s.r + (s.w / 2 - s.r) * thin;
  const ry = s.r + (s.h / 2 - s.r) * thin;
  const screenStyle: React.CSSProperties = {
    position: 'absolute',
    left: s.x,
    top: s.y,
    width: s.w,
    height: s.h,
    borderRadius: `${rx}px / ${ry}px`,
    overflow: 'hidden',
    transform: `scaleY(${Math.max(0.0001, open)})`,
    transformOrigin: '50% 50%',
  };

  return (
    <AbsoluteFill style={{ width, height, background: A1.set, overflow: 'hidden' }}>
      {open > 0 ? (
        <>
          <HtmlInCanvas width={width} height={height} effects={[tubeStatic({ amount: Math.min(1, Math.max(0, noise)), seed, cell: 2 }), ...look]}>
            <AbsoluteFill>
              <div style={{ ...screenStyle, background: A1.noSignal }}>
                {r === 0 ? (
                  <>
                    <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
                    {ghost && ghost.amount > 0 ? (
                      <div style={{ position: 'absolute', inset: 0, transform: `translateX(${ghost.offset}px)`, opacity: ghost.amount }}>{children}</div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div style={{ position: 'absolute', left: 0, top: 0, width: s.w, height: s.h, transform: `translateY(${-r * (s.h + gap)}px)` }}>{children}</div>
                    <div style={{ position: 'absolute', left: 0, top: 0, width: s.w, height: s.h, transform: `translateY(${(1 - r) * (s.h + gap)}px)` }}>{children}</div>
                    <div style={{ position: 'absolute', left: 0, width: s.w, top: (1 - r) * (s.h + gap) - gap, height: gap, background: '#060608' }} />
                  </>
                )}
              </div>
            </AbsoluteFill>
          </HtmlInCanvas>
          {overlay ? (
            <HtmlInCanvas width={width} height={height} effects={look} style={{ position: 'absolute', left: 0, top: 0 }}>
              <AbsoluteFill>
                <div style={{ ...screenStyle, background: 'transparent' }}>{overlay}</div>
              </AbsoluteFill>
            </HtmlInCanvas>
          ) : null}
          {power < 1 ? <AbsoluteFill style={{ background: '#000', opacity: 1 - Math.max(0, power) }} /> : null}
        </>
      ) : null}
    </AbsoluteFill>
  );
};

/** Frames of the switch-on and switch-off (03-script-storyboard.md, scenes 1 and 4). */
export const TUBE = {
  /** A thin line opens to full height. */
  openFrames: 14,
  /** Brightness rises (not a flash). */
  powerUpFrames: 20,
  /** The picture collapses to a line. */
  collapseFrames: 10,
  /** The line shrinks to a dot, slowing down. */
  shrinkFrames: 20,
} as const;

/** Thinnest opening: about a 4 px line at 1080p. */
const LINE = 0.004;

/** Switch-on at local frame `at`: { open, power } to spread on <TubePicture>. Before `at`: closed. */
export const switchOn = (frame: number, at: number) => {
  if (frame < at) return { open: 0, power: 0 };
  // Opening slows down as it reaches full height; brightness rises over 20 frames.
  const open = ramp(frame, at, TUBE.openFrames, LINE, 1, EASE.out);
  const power = ramp(frame, at, TUBE.powerUpFrames, 0.15, 1, EASE.inOut);
  return { open, power };
};

/**
 * Switch-off at local frame `at`: the picture collapses to a line over 10 frames (inside the tube),
 * then <BeamDot> takes over. Returns { open, power } for the tube; `open` is 0 once the line is handed over.
 */
export const switchOff = (frame: number, at: number) => {
  if (frame < at) return { open: 1, power: 1 };
  const t = frame - at;
  if (t >= TUBE.collapseFrames) return { open: 0, power: 0 };
  // A gentle acceleration (quadratic), so the squeeze is seen over all 10 frames, not as a snap.
  const open = ramp(frame, at, TUBE.collapseFrames, 1, LINE * 1.5, (t) => t * t);
  // Brightness falls a little as the picture closes; the line is pale, never a white flash.
  const power = ramp(frame, at, TUBE.collapseFrames, 1, 0.8, EASE.linear);
  return { open, power };
};

/** Seconds helpers for scene code that reads better in seconds. */
export const tubeFrames = {
  open: TUBE.openFrames,
  collapse: TUBE.collapseFrames,
  shrink: TUBE.shrinkFrames,
  all: TUBE.collapseFrames + TUBE.shrinkFrames,
  sec,
};
