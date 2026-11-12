/**
 * PixelScreen: the old phone's 84 x 48 monochrome display. Everything on it is drawn here, on a real
 * 84 x 48 grid: text in Tiny5 is rasterised into the grid at runtime (so every glyph sits on the
 * dots), then each lit cell is drawn as a square dot in #43523d on the plate's green.
 *
 *   <PixelScreen w={box[2]} h={box[3]} text="hello" code="43556" cursor frame={f} />
 *   <ScreenPlate w={1920} h={1080} text="hello" code="43556" />     // IMG-04 with the screen on it
 *
 * - `text`: the word being typed (lower case) on the first line, in the large font (Tiny5 with each
 *   font pixel drawn as 2 x 2 dots, as old phones did for typing). `text2`: a second line under it.
 * - `code`: the small key code in the top-right corner (Tiny5, 1 font pixel = 1 dot).
 * - `cursor`: a slow (1 Hz), low-contrast blinking bar after the last line.
 * - `ghost`: the previous state at low opacity (LCD ghosting) for a few frames after a change.
 * - Pass stepped frames (12 Hz) so the screen redraws on Act 1's grid.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { A1 } from './palette';
import { Plate, displayBox, type Box } from './Plate';

export const COLS = 84;
export const ROWS = 48;

/** Tiny5's native size: 1 font pixel = 1 px (measured: the fewest grey levels at 8 px). */
export const TINY5_PX = 8;

/** Layout of the screen, in dots. */
export const LAYOUT = {
  code: { right: 81, y: 2, scale: 1 },
  text: { x: 3, y: 11, scale: 2 },
  text2: { x: 3, y: 28, scale: 2 },
} as const;

type Glyphs = { bits: Uint8Array; w: number; h: number; width: number };
const cache = new Map<string, Glyphs>();

/** Rasterise `text` with Tiny5 at its native size into a 1-bit bitmap; threshold at half coverage. */
const rasterize = (text: string): Glyphs => {
  const hit = cache.get(text);
  if (hit) return hit;
  const w = 128;
  const h = 12;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.clearRect(0, 0, w, h);
  ctx.font = `${TINY5_PX}px Tiny5`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#fff';
  ctx.fillText(text, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;
  const bits = new Uint8Array(w * h);
  let width = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const on = data[(y * w + x) * 4 + 3]! > 127 ? 1 : 0;
      bits[y * w + x] = on;
      if (on) width = Math.max(width, x + 1);
    }
  const g = { bits, w, h, width };
  cache.set(text, g);
  return g;
};

/** Holds the render until Tiny5 can be drawn on a canvas. */
const useTiny5 = () => {
  const spec = `${TINY5_PX}px Tiny5`;
  const [ready, setReady] = useState(() => typeof document !== 'undefined' && document.fonts.check(spec));
  const [handle] = useState(() => (ready ? null : delayRender('Tiny5 for the pixel screen')));
  useEffect(() => {
    if (ready) return;
    document.fonts.load(spec).then(
      () => {
        setReady(true);
        if (handle !== null) continueRender(handle);
      },
      () => handle !== null && continueRender(handle),
    );
  }, [ready, handle, spec]);
  return ready;
};

type Stamp = { text: string; x: number; y: number; scale: number; right?: boolean };
type Composed = { grid: Uint8Array; ends: { x: number; y: number; scale: number }[] };

/** All lit cells of a list of stamps on the 84 x 48 grid. */
const compose = (stamps: Stamp[]): Composed => {
  const grid = new Uint8Array(COLS * ROWS);
  const ends: Composed['ends'] = [];
  for (const s of stamps) {
    if (!s.text) {
      ends.push({ x: s.x - s.scale, y: s.y, scale: s.scale });
      continue;
    }
    const g = rasterize(s.text);
    const x0 = s.right ? s.x - g.width * s.scale : s.x;
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.width; x++) {
        if (!g.bits[y * g.w + x]) continue;
        for (let dy = 0; dy < s.scale; dy++)
          for (let dx = 0; dx < s.scale; dx++) {
            const gx = x0 + x * s.scale + dx;
            const gy = s.y + y * s.scale + dy;
            if (gx >= 0 && gx < COLS && gy >= 0 && gy < ROWS) grid[gy * COLS + gx] = 1;
          }
      }
    ends.push({ x: x0 + g.width * s.scale, y: s.y, scale: s.scale });
  }
  return { grid, ends };
};

/** An SVG path of square dots for every lit cell. */
const dotsPath = (grid: Uint8Array, size: number) => {
  const inset = (1 - size) / 2;
  let d = '';
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) if (grid[y * COLS + x]) d += `M${x + inset} ${y + inset}h${size}v${size}h${-size}z`;
  return d;
};

export type ScreenState = { text?: string; text2?: string; code?: string };

const stampsOf = (s: ScreenState): Stamp[] => {
  const out: Stamp[] = [{ text: s.text ?? '', ...LAYOUT.text }];
  if (s.text2 !== undefined) out.push({ text: s.text2, ...LAYOUT.text2 });
  if (s.code) out.push({ text: s.code, x: LAYOUT.code.right, y: LAYOUT.code.y, scale: LAYOUT.code.scale, right: true });
  return out;
};

export type PixelScreenProps = ScreenState & {
  /** Box size in the parent's px (for a plate: plate px). The 84 x 48 grid is centred in it. */
  w: number;
  h: number;
  /** Show the blinking cursor after the last line of text. */
  cursor?: boolean;
  /** Frame for the cursor's blink (1 Hz). */
  frame?: number;
  /** The previous state, shown faintly (LCD ghosting). amount 0..1. */
  ghost?: (ScreenState & { amount: number }) | null;
  /** 0..1: lift the plate's dark olive ground towards the lit LCD green (IMG-04 needs about 1). */
  backlight?: number;
  /** Draw a ground of our own (no plate under the screen). */
  ground?: boolean;
  /** Fraction of the box height the grid uses. */
  fill?: number;
  /** Where the 84 x 48 grid sits in a box wider than 7:4: centred, or at the left like a phone's text. */
  align?: 'center' | 'left';
};

let uid = 0;

export const PixelScreen: React.FC<PixelScreenProps> = ({
  w,
  h,
  text,
  text2,
  code,
  cursor = false,
  frame = 0,
  ghost = null,
  backlight = 0,
  ground = false,
  fill = 0.88,
  align = 'center',
}) => {
  const ready = useTiny5();
  const [pid] = useState(() => `lcd-${++uid}`);
  const main = useMemo(() => (ready ? compose(stampsOf({ text, text2, code })) : null), [ready, text, text2, code]);
  const ghostOn = !!ghost && ghost.amount > 0;
  const prev = useMemo(
    () => (ready && ghostOn ? compose(stampsOf({ text: ghost!.text, text2: ghost!.text2, code: ghost!.code })) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, ghostOn, ghost?.text, ghost?.text2, ghost?.code],
  );
  // The grid: square dots, as tall as `fill` of the box, centred; the faint matrix covers the box.
  const pitch = Math.min(w / COLS, (h * fill) / ROWS);
  const gw = pitch * COLS;
  const gh = pitch * ROWS;
  const ox = align === 'left' ? Math.min((w - gw) / 2, (h - gh) / 2 + w * 0.02) : (w - gw) / 2;
  const oy = (h - gh) / 2;
  // Cursor: 1 dot wide, as tall as the line's capitals, one dot after the end of the last line.
  const end = main ? main.ends[text2 !== undefined ? 1 : 0] : null;
  const blinkOn = Math.floor(frame / 30) % 2 === 0;
  const cur = cursor && end && blinkOn ? `M${end.x + end.scale} ${end.y}h${end.scale >= 2 ? 1.6 : 1}v${7 * end.scale}h${end.scale >= 2 ? -1.6 : -1}z` : '';
  const mx = Math.ceil(ox / pitch) + 1;
  const my = Math.ceil(oy / pitch) + 1;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, overflow: 'hidden' }}>
      {ground ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: Math.min(w, h) * 0.03,
            background: `linear-gradient(to top, #cdeedb 0%, ${A1.lcdLight} 30%, #b0d6bf 100%)`,
          }}
        />
      ) : null}
      {backlight > 0 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, #93c3a2 0%, #79a888 50%, #628d71 100%)',
            mixBlendMode: 'screen',
            opacity: backlight,
          }}
        />
      ) : null}
      <svg
        width={gw}
        height={gh}
        viewBox={`0 0 ${COLS} ${ROWS}`}
        style={{ position: 'absolute', left: ox, top: oy, overflow: 'visible' }}
        shapeRendering="crispEdges"
      >
        <defs>
          <pattern id={pid} width="1" height="1" patternUnits="userSpaceOnUse">
            <rect x="0.07" y="0.07" width="0.86" height="0.86" fill={A1.lcdDark} opacity="0.035" />
          </pattern>
        </defs>
        {/* The unlit matrix, barely there, across the whole window. */}
        <rect x={-mx} y={-my} width={COLS + 2 * mx} height={ROWS + 2 * my} fill={`url(#${pid})`} />
        {prev ? <path d={dotsPath(prev.grid, 0.86)} fill={A1.lcdDark} opacity={0.3 * ghost!.amount} /> : null}
        {main ? (
          <>
            {/* LCD dots cast a faint shadow on the backplane. */}
            <path d={dotsPath(main.grid, 0.86)} fill={A1.lcdDark} opacity={0.14} transform="translate(0.26 0.3)" />
            <path d={dotsPath(main.grid, 0.86)} fill={A1.lcdDark} opacity={0.94} />
          </>
        ) : null}
        {cur ? <path d={cur} fill={A1.lcdDark} opacity={0.5} /> : null}
      </svg>
    </div>
  );
};

/** IMG-04 (the empty pixel screen) with a PixelScreen on its display, framed by a slow camera. */
export const ScreenPlate: React.FC<Omit<PixelScreenProps, 'w' | 'h'> & { w: number; h: number; cx?: number; cy?: number; zoom?: number }> = ({
  w,
  h,
  cx,
  cy,
  zoom = 1,
  ...screen
}) => {
  const box: Box = displayBox('img-04-screen-empty');
  return (
    <Plate id="img-04-screen-empty" w={w} h={h} cx={cx} cy={cy} zoom={zoom}>
      <div style={{ position: 'absolute', left: box[0], top: box[1], width: box[2], height: box[3] }}>
        <PixelScreen backlight={1} {...screen} w={box[2]} h={box[3]} />
      </div>
    </Plate>
  );
};
