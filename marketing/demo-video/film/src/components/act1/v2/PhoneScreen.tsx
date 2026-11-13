/**
 * The old phone, reusable outside Act 1: one of the second cut's stills with the 96 x 64 screen in a given state
 * pinned on its measured screen quad (STN dots multiplied into the photographed glass), its backlight (the
 * still's lit edit, or a drawn glow on the master) and the printed key legends.
 *
 *   <PhoneScreen plate="p5" state="hello" />                              // the drawer, Hello on screen, lit
 *   <PhoneScreen plate="p2" state="hello" offAt={90} />                   // the macro; switches off at frame 90
 *   <PhoneScreen plate="p5" state="idle" onAt={12} w={960} h={540} />     // wakes at frame 12, in a 960 x 540 box
 *
 * Frames are the caller's own (useCurrentFrame(), so local to its <Sequence>). The screen and the backlight change
 * on Act 1's 12 Hz grid (every 5 frames at 60 fps), with the panel's slow response: a switch-off shows on the
 * next step, the backlight drops to 0.4 for one step then to 0, and the dots clear over three steps (0.5, 0.2, 0).
 * A wake is the reverse: the backlight half, low, full, the dots darkening over three steps (0.6, 0.9, 1).
 *
 * Act 1 draws the same layers (PhoneLayers) from its own script.
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { sec } from '../../../timeline';
import { GlassGlow, LcdOnQuad } from './LcdView';
import { KeyLegends, type Press } from './Legends';
import { LCD_STEP, PRESET, levels, render, type Bits, type LcdState, type PresetName } from './lcdModel';
import { plate as plateInfo, type PlateId, type PlateInfo, type PlateKey } from './plates';
import { DRAWER_ZOOM_AT_PUSH } from './script';
import { Still } from './Still';

export { PRESET, type PresetName, type LcdState, type PlateId, type PlateKey };

/** Each still's framing as Act 1 uses it (zoom 1 = the still just covers the view; cx, cy in still px). */
export const FRAMING: Record<PlateId, { zoom: number; cx: number; cy: number }> = {
  /** The drawer: the whole phone, as shot 3 frames it. */
  p5: { zoom: DRAWER_ZOOM_AT_PUSH * 1.045, cx: 1276, cy: 730 },
  /** The macro: the screen at an angle, the keys below the frame (shot 4). */
  p2: { zoom: 1.03, cx: 1300, cy: 650 },
  /** The master, straight on (portrait still: in a 16:9 view, a band around the screen). */
  p1: { zoom: 1, cx: 720, cy: 900 },
  /** The keypad, straight on (no screen in it: legends only). */
  p3: { zoom: 1, cx: 1920, cy: 1080 },
};

/**
 * The phone's own layers in the still's pixels, for use inside a <Still> (as Act 1 does): the screen at the given
 * darkness levels (lcdModel `levels`), the drawn glass glow where the still has no lit edit (p1), the legends.
 */
export const PhoneLayers: React.FC<{
  plate: PlateInfo;
  /** Per-pixel darkness 0..1, 96 x 64 (lcdModel `levels`, or `staticLevels` below). */
  levels: Float32Array;
  /** 0..1, the screen's and the keys' light. The still's lit edit is the caller's (<Still lit={...}>). */
  backlight: number;
  press?: Press;
  /** Ink contrast (Act 1 uses 0.85 on the macro, where the glass is brighter). */
  contrast?: number;
  /** Draw the key legends (default: where the keys are measured, so not on the macro p2). */
  legends?: boolean;
  legendSize?: number;
}> = ({ plate: p, levels: lv, backlight, press = null, contrast = 1, legends, legendSize }) => {
  const showLegends = legends ?? p.id !== 'p2';
  return (
    <>
      {!p.lit && p.window ? <GlassGlow quad={p.window} level={backlight} /> : null}
      {p.active ? <LcdOnQuad quad={p.active} levels={lv} backlight={backlight} contrast={contrast} /> : null}
      {showLegends ? <KeyLegends plate={p} light={backlight} press={press} size={legendSize ?? (p.id === 'p3' ? 1 : 1.05)} /> : null}
    </>
  );
};

const OFF_BITS: Bits = render({ kind: 'off' });
const bitsCache = new Map<string, Bits>();
const bitsOf = (s: LcdState, blink: boolean) => {
  const key = `${JSON.stringify(s)}|${blink ? 1 : 0}`;
  let b = bitsCache.get(key);
  if (!b) {
    if (bitsCache.size > 200) bitsCache.clear();
    b = render(s, blink);
    bitsCache.set(key, b);
  }
  return b;
};

/** The first 12 Hz step at or after frame f. */
const stepAtOrAfter = (f: number) => Math.ceil(f / LCD_STEP) * LCD_STEP;

/**
 * The screen's darkness levels and backlight at frame f, for a state shown between onAt and offAt (both optional,
 * in the same frames as f). `blink` = the cursor's 1 Hz blink (counted from onAt, or from 0).
 */
export const phoneAt = (
  f: number,
  state: LcdState,
  opt: { onAt?: number; offAt?: number; blink?: boolean; backlight?: number } = {},
): { levels: Float32Array; backlight: number } => {
  const { onAt, offAt, blink = true, backlight: max = 1 } = opt;
  const t0 = onAt ?? -Infinity;
  const t1 = offAt ?? Infinity;
  const blinkOn = (s: number) => !blink || Math.floor((s - (onAt ?? 0)) / sec(0.5)) % 2 === 0;
  const bitsAt = (s: number) => (s < t0 || s >= t1 ? OFF_BITS : bitsOf(state, blinkOn(s)));
  const s = Math.floor(f / LCD_STEP) * LCD_STEP;
  let bl = 1;
  if (onAt !== undefined) {
    const on0 = stepAtOrAfter(onAt);
    bl = s < on0 ? 0 : s < on0 + LCD_STEP ? 0.45 : s < on0 + 2 * LCD_STEP ? 0.15 : 1;
  }
  if (offAt !== undefined) {
    const off0 = stepAtOrAfter(offAt);
    if (s >= off0) bl = s < off0 + LCD_STEP ? Math.min(bl, 0.4) : 0;
  }
  return { levels: levels(bitsAt, f), backlight: bl * max };
};

export type PhoneScreenProps = {
  /** Which still: 'p5' the drawer, 'p2' the macro, 'p1' the master (straight on), 'p3' the keypad (no screen). */
  plate: PlateId;
  /** A named state (PRESET: 'off', 'idle', 'editor-empty', 'I', 'He', 'Gel', 'Hell', 'Hello', 'hello', 'battery-low') or your own LcdState. */
  state: PresetName | LcdState;
  /** The view's size in px (default 1920 x 1080). The still covers it. */
  w?: number;
  h?: number;
  /** Framing (default FRAMING[plate]): zoom 1 = the still just covers the view; cx, cy = the still's point at the view's centre. */
  zoom?: number;
  cx?: number;
  cy?: number;
  /** Peak backlight 0..1 (default 1). 0 = a dark phone with its screen still showing in the moonlight. */
  backlight?: number;
  /** Frame at which the phone wakes (default: already on). */
  onAt?: number;
  /** Frame at which the phone switches off (default: never). */
  offAt?: number;
  /** The cursor's 1 Hz blink (default true). */
  blink?: boolean;
  /** A key lit as pressed (default none). */
  press?: PlateKey | null;
  /** Draw the key legends (default true on p5, p1 and p3; false on p2, whose keys are out of frame). */
  legends?: boolean;
  /** Dims the whole still 0..1 (default 1): moonlight, a grade, a fade to black. */
  light?: number;
  /** Ink contrast (default 1; 0.85 on p2). */
  contrast?: number;
  /** Depth of field drawn by the film (default: Act 1's on p2, none elsewhere). */
  dof?: { y0: number; y1: number; px: number } | null;
  /** Override the frame (default useCurrentFrame()). */
  frame?: number;
  /** Extra layers in the still's pixels (drawn over the phone). */
  children?: React.ReactNode;
};

export const PhoneScreen: React.FC<PhoneScreenProps> = ({
  plate: id,
  state,
  w = 1920,
  h = 1080,
  zoom,
  cx,
  cy,
  backlight = 1,
  onAt,
  offAt,
  blink = true,
  press = null,
  legends,
  light = 1,
  contrast,
  dof,
  frame,
  children,
}) => {
  const current = useCurrentFrame();
  const f = frame ?? current;
  const p = plateInfo(id);
  const s: LcdState = typeof state === 'string' ? PRESET[state] : state;
  const now = phoneAt(f, s, { onAt, offAt, blink, backlight });
  const fr = FRAMING[id];
  const depth = dof === undefined ? (id === 'p2' ? { y0: 980, y1: 1320, px: 7 } : undefined) : (dof ?? undefined);
  return (
    <Still plate={id} w={w} h={h} zoom={zoom ?? fr.zoom} cx={cx ?? fr.cx} cy={cy ?? fr.cy} lit={now.backlight} light={light} dof={depth}>
      <PhoneLayers
        plate={p}
        levels={now.levels}
        backlight={now.backlight}
        press={press && now.backlight > 0 ? { k: press, amount: 1 } : null}
        contrast={contrast ?? (id === 'p2' ? 0.85 : 1)}
        legends={legends}
      />
      {children}
    </Still>
  );
};
