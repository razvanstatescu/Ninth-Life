/**
 * The app's keypad (design/system/components/bundle.css: .nl-key, .nl-keypad), recreated for film.
 * Pure: every visual state comes from props, so a scene drives it from the frame number.
 *
 * Sizes scale with `size` (the key's edge in px; the app's default is 96, the design's range 72-128).
 * Use keyCenter() to aim the camera at a key.
 *
 * Second cut, the lit night studio (07-revision-v2.md V6): keys may have thickness (`depth`, px at
 * size 96), sink when pressed (`state.sink`), take a top-left light (`light`), and the ember key may
 * light its neighbours (`spillFrom`). All default to off, so the first cut's look is unchanged.
 */
import React from 'react';
import { interpolateColors } from 'remotion';
import { C, FONT, SHADOW } from '../../tokens';
import decoded from '../../data/decoded.json';
import { EmberSpill, LightSweep } from './Studio';

export type KeyId = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'star' | '0' | 'hash';

export const KEY_ROWS: KeyId[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['star', '0', 'hash'],
];

const LEGENDS: Record<string, { digit: string; letters: string }> = Object.fromEntries(
  decoded.keypad.keys.map((k) => [k.id, { digit: k.digit, letters: k.letters }]),
);

/** The key's side (thickness) and the panel's side: plum and moon pushed towards night. */
const KEY_SIDE = '#170c34';
/** The lit (top) sliver of a 'slab' key's side. */
const KEY_SIDE_LIT = '#3a2672';
const PANEL_SIDE = '#a99fd1';

/** Map a typed character ('0'-'9', '*', '#') to its key id. */
export const keyIdOf = (ch: string): KeyId => (ch === '*' ? 'star' : ch === '#' ? 'hash' : (ch as KeyId));

export type KeyState = {
  /** 0..1: the ember ring of a pressed key (the website demo's pressed ring). */
  press?: number;
  /** 0..1: ember fill (the ninth key of the icon; a lit key). */
  lit?: number;
  /** 0..1: the key itself (0 = not there). Cut it, do not scale-bounce it. */
  appear?: number;
  /** 0..1: digit and letters. */
  legend?: number;
  /** 0..1: dim the key towards the panel (for focus on other keys). */
  dim?: number;
  /** 0..1: how far the key is pushed down (needs `depth`). */
  sink?: number;
};

/**
 * How a key's thickness is drawn. 'drawn' (default, today's look): a solid band under the cap, in the key's plane.
 * 'slab': real thickness in 3D (the cap raised by `depth` above stacked side layers), so a camera looking down sees the
 * top side and one turned right (ry < 0) sees the right side, as STYLE.md "Spatial rules" asks. Needs a preserve-3d
 * chain up to the <World>; `dim` darkens the cap towards the panel instead of fading the key (no see-through).
 */
export type KeyBody = 'drawn' | 'slab';

export const Key: React.FC<{ id: KeyId; size?: number; state?: KeyState; depth?: number; light?: number; body?: KeyBody; style?: React.CSSProperties }> = ({
  id,
  size = 96,
  state = {},
  depth = 0,
  light = 0,
  body = 'drawn',
  style,
}) => {
  const k = size / 96;
  const { press = 0, lit = 0, appear = 1, legend = 1, dim = 0, sink = 0 } = state;
  const { digit, letters } = LEGENDS[id]!;
  const isWord = letters.length > 4 || /[a-z]/.test(letters);
  const isPunct = id === '1';
  const textColor = lit > 0.5 ? C.onEmber : C.onKey;
  const d = depth * k;
  const travel = d * 0.7 * sink;
  const side = d - travel;
  const cap = (
    <>
        {light > 0 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 24 * k,
              background: `linear-gradient(160deg, rgba(238,232,255,${0.16 * light}) 0%, rgba(238,232,255,0) 46%)`,
              boxShadow: `inset 0 ${2 * k}px 0 rgba(238,232,255,${0.14 * light})`,
            }}
          />
        ) : null}
        {lit > 0 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 24 * k,
              background: `linear-gradient(135deg, #ffd27a 0%, ${C.ember} 55%, #ff9f2e 100%)`,
              boxShadow: `inset 0 0 0 ${3 * k}px ${C.plum}, ${SHADOW.glowEmber}`,
              opacity: lit,
            }}
          />
        ) : null}
        {press > 0 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 24 * k,
              boxShadow: `inset 0 0 0 ${4 * k}px ${C.ember}, 0 0 ${28 * k}px rgba(255,177,61,0.45)`,
              opacity: press,
            }}
          />
        ) : null}
        <div style={{ position: 'absolute', inset: 0, opacity: legend }}>
          <div
            style={{
              position: 'absolute',
              top: 9 * k,
              left: 12 * k,
              fontFamily: FONT.mono,
              fontSize: 15 * k,
              lineHeight: `${16 * k}px`,
              fontWeight: 500,
            }}
          >
            {digit}
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              fontFamily: FONT.sans,
              fontSize: (isWord ? 18 : isPunct ? 22 : letters.length > 3 ? 26 : 30) * k,
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: isWord ? 0 : '0.04em',
              paddingTop: 4 * k,
            }}
          >
            {letters}
          </div>
        </div>
    </>
  );
  if (body === 'slab') {
    // The cap stands `depth` in front of the key's base (sinking 70% of that when pressed), over stacked side layers
    // shaded lighter at the top left, so the visible sliver is lit on top and in shade on the right.
    const top = Math.max(0.5, d * (1 - 0.7 * sink));
    const n = 5;
    const toPanel = (c: string) => (dim > 0 ? interpolateColors(dim * 0.7, [0, 1], [c, C.panel]) : c);
    return (
      <div style={{ position: 'relative', width: size, height: size, flex: 'none', transformStyle: 'preserve-3d', opacity: appear < 1 ? appear : undefined, ...style }}>
        {d > 0
          ? Array.from({ length: n - 1 }, (_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 24 * k,
                  background: `linear-gradient(165deg, ${toPanel(KEY_SIDE_LIT)} 0%, ${toPanel(KEY_SIDE)} 55%)`,
                  transform: `translateZ(${0.5 + ((top - 0.5) * i) / (n - 1)}px)`,
                }}
              />
            ))
          : null}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 24 * k, background: C.key, color: textColor, transform: `translateZ(${top}px)` }}>
          {cap}
          {dim > 0 ? <div style={{ position: 'absolute', inset: 0, borderRadius: 24 * k, background: C.panel, opacity: dim * 0.7 }} /> : null}
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flex: 'none',
        opacity: appear * (1 - dim * 0.7),
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          translate: `0 ${travel}px`,
          borderRadius: 24 * k,
          background: C.key,
          color: textColor,
          boxShadow: side > 0 ? `0 ${side}px 0 0 ${KEY_SIDE}` : undefined,
        }}
      >
        {cap}
      </div>
    </div>
  );
};

export type KeypadLayout = { size: number; gap: number; pad: number; width: number; height: number };

export const keypadLayout = (size = 96): KeypadLayout => {
  const k = size / 96;
  const gap = 12 * k;
  const pad = 24 * k;
  return { size, gap, pad, width: 3 * size + 2 * gap + 2 * pad, height: 4 * size + 3 * gap + 2 * pad };
};

/** Centre of a key relative to the keypad panel's centre (add the panel's world position). */
export const keyCenter = (id: KeyId, size = 96) => {
  const L = keypadLayout(size);
  const row = KEY_ROWS.findIndex((r) => r.includes(id));
  const col = KEY_ROWS[row]!.indexOf(id);
  return {
    x: L.pad + col * (size + L.gap) + size / 2 - L.width / 2,
    y: L.pad + row * (size + L.gap) + size / 2 - L.height / 2,
  };
};

/** Centre of a row relative to the panel's centre. */
export const rowCenter = (row: number, size = 96) => {
  const L = keypadLayout(size);
  return { x: 0, y: L.pad + row * (size + L.gap) + size / 2 - L.height / 2 };
};

export type KeypadProps = {
  size?: number;
  /** Per-key state. Missing keys use `base`. */
  keys?: Partial<Record<KeyId, KeyState>>;
  base?: KeyState;
  /** 0..1: the moon panel behind the keys. */
  panel?: number;
  /** Row index 0-3 with the switch-scanning ring, and its 0..1 opacity. */
  scanRow?: number;
  scanAmount?: number;
  /** A single key with the scanning ring (when scanning along a row). */
  scanKey?: KeyId;
  shadow?: boolean;
  /** Key thickness in px at size 96 (6-10 reads well); the panel gets 1.2x. 0 = flat (first cut). */
  depth?: number;
  /** 0..1: the top-left key light on keys and a sheen on the panel. */
  light?: number;
  /** The ember key whose light falls on its neighbours, and how much (0..0.15). */
  spillFrom?: KeyId;
  spill?: number;
  /** 0..1 progress of one light sweep across the panel (one per chapter at most). */
  sweep?: number;
  /**
   * 'drawn' (default, today's look) or 'slab': real 3D thickness for the keys and the panel (see Key). In 'slab' the
   * panel drops its drop shadow (a shadow on an invisible wall): put lib/stage GroundShadow / CastShadow on the floor.
   */
  body?: KeyBody;
  style?: React.CSSProperties;
};

export const Keypad: React.FC<KeypadProps> = ({
  size = 96,
  keys = {},
  base = {},
  panel = 1,
  scanRow,
  scanAmount = 1,
  scanKey,
  shadow = true,
  depth = 0,
  light = 0,
  spillFrom,
  spill = 0,
  sweep = 0,
  body = 'drawn',
  style,
}) => {
  const L = keypadLayout(size);
  const k = size / 96;
  const panelSide = depth * 1.2 * k;
  const spillAt = spillFrom ? keyCenter(spillFrom, size) : null;
  const slab = body === 'slab';
  const p3d: React.CSSProperties = slab ? { transformStyle: 'preserve-3d' } : {};
  // In 'slab' the rings and the spill float just in front of the raised caps.
  const front = (node: React.ReactNode) => (slab ? <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transform: `translateZ(${depth * k + 1}px)` }}>{node}</div> : node);
  return (
    <div style={{ position: 'relative', width: L.width, height: L.height, ...p3d, ...style }}>
      {slab && panelSide > 0
        ? [1, 2, 3].map((i) => (
            <div
              key={`side${i}`}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 44 * k,
                background: `linear-gradient(165deg, #c9c1ec 0%, ${PANEL_SIDE} 60%)`,
                opacity: panel,
                transform: `translateZ(${(-panelSide * i) / 3}px)`,
              }}
            />
          ))
        : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 44 * k,
          background: C.panel,
          boxShadow: slab ? undefined : [panelSide > 0 ? `0 ${panelSide}px 0 0 ${PANEL_SIDE}` : '', shadow ? SHADOW.lift : ''].filter(Boolean).join(', ') || undefined,
          opacity: panel,
          overflow: 'hidden',
        }}
      >
        {light > 0 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(150deg, rgba(255,255,255,${0.35 * light}) 0%, rgba(255,255,255,0) 38%, rgba(20,10,46,0) 70%, rgba(20,10,46,${0.08 * light}) 100%)`,
            }}
          />
        ) : null}
        <LightSweep progress={sweep} intensity={0.22} />
      </div>
      {KEY_ROWS.map((row, r) => (
        <div
          key={r}
          style={{
            position: 'absolute',
            left: L.pad,
            top: L.pad + r * (size + L.gap),
            display: 'flex',
            gap: L.gap,
            ...p3d,
          }}
        >
          {scanRow === r && scanAmount > 0
            ? front(
                <div
                  style={{
                    position: slab ? undefined : 'absolute',
                    inset: slab ? undefined : -6 * k,
                    borderRadius: 30 * k,
                    boxShadow: `0 0 0 ${6 * k}px ${C.ember}, 0 0 0 ${9 * k}px ${C.plum}`,
                    opacity: scanAmount,
                    ...(slab ? { position: 'absolute', left: -6 * k, top: -6 * k, width: 3 * size + 2 * L.gap + 12 * k, height: size + 12 * k } : {}),
                  }}
                />,
              )
            : null}
          {row.map((id) => (
            <div key={id} style={{ position: 'relative', ...p3d }}>
              <Key id={id} size={size} depth={depth} light={light} body={body} state={{ ...base, ...keys[id] }} />
              {scanKey === id && scanAmount > 0
                ? front(
                    <div
                      style={{
                        position: 'absolute',
                        ...(slab ? { left: -6 * k, top: -6 * k, width: size + 12 * k, height: size + 12 * k } : { inset: -6 * k }),
                        borderRadius: 30 * k,
                        boxShadow: `0 0 0 ${6 * k}px ${C.ember}, 0 0 0 ${9 * k}px ${C.plum}`,
                        opacity: scanAmount,
                      }}
                    />,
                  )
                : null}
            </div>
          ))}
        </div>
      ))}
      {spillAt && spill > 0 ? front(<EmberSpill x={L.width / 2 + spillAt.x} y={L.height / 2 + spillAt.y} size={size * 3.4} strength={spill} />) : null}
    </div>
  );
};
