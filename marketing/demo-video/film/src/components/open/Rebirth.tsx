/**
 * Parts of s06, "Same keys" (07-revision-v2.md V5, s06): the old keypad lit by the hand-off dot, each old
 * key turning into the app's key in fine cells, and the app's keys and panel re-forming into the keypad.
 *
 * Pure: every state comes from props. Positions are WORLD px (inside <World>), from ./plate.ts.
 *
 * MorphKey and MorphPanel copy the brand Keypad's recipe (components/brand/Keypad.tsx: colours, radius,
 * thickness, top-left light) so that, once the keys have reached the keypad's layout, the brand
 * <Keypad> can take over on the next frame with no visible change.
 */
import React from 'react';
import { Img, random, staticFile } from 'remotion';
import { C, FONT, SHADOW } from '../../tokens';
import decoded from '../../data/decoded.json';
import { LightSweep } from '../brand/Studio';
import type { KeyId } from '../brand/Keypad';
import { KEY9_PLATE, PLATE, plateBox, type WBox } from './plate';

/** The key's side and the panel's side: the same values as components/brand/Keypad.tsx. */
const KEY_SIDE = '#170c34';
const PANEL_SIDE = '#a99fd1';

const LEGENDS: Record<string, { digit: string; letters: string }> = Object.fromEntries(
  decoded.keypad.keys.map((k) => [k.id, { digit: k.digit, letters: k.letters }]),
);

// ---- The fine-cell dissolve ------------------------------------------------------------------------

/**
 * A clip-path that shows the cells of a w x h box whose random threshold is below `progress`
 * (0 = nothing, 1 = everything). Same seed, same order: deterministic, like an old computer's dissolve.
 * Returns undefined at 1 (no clip).
 */
export const cellClip = (w: number, h: number, cell: number, progress: number, seed: string): string | undefined => {
  if (progress >= 1) return undefined;
  if (progress <= 0) return 'path("M0 0Z")';
  const cols = Math.ceil(w / cell);
  const rows = Math.ceil(h / cell);
  let d = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (random(`${seed}-${r}-${c}`) < progress) {
        const x = c * cell;
        const y = r * cell;
        // Cells overlap their neighbours by a hair so no seams show once they have all landed.
        d += `M${x.toFixed(1)} ${y.toFixed(1)}h${(cell + 0.6).toFixed(1)}v${(cell + 0.6).toFixed(1)}h${(-(cell + 0.6)).toFixed(1)}Z`;
      }
    }
  }
  return `path("${d || 'M0 0Z'}")`;
};

// ---- The app's key, in any box ---------------------------------------------------------------------

export type MorphKeyState = {
  /** 0..1 the ember fill (the ninth key). */
  lit?: number;
  /** Thickness in px at key size 96 (the brand Keypad's `depth`). */
  depth?: number;
  /** 0..1 the top-left key light. */
  light?: number;
  /** A clip-path for the dissolve (from cellClip). */
  clip?: string;
};

/**
 * The app's key (brand recipe) drawn in a world box. `size` is the key edge its legend is set for
 * (the final keypad's key size), so the legend never changes size while the box morphs.
 */
export const MorphKey: React.FC<{ id: KeyId; box: WBox; size: number; state?: MorphKeyState }> = ({ id, box, size, state = {} }) => {
  const k = size / 96;
  const { lit = 0, depth = 0, light = 0, clip } = state;
  const { digit, letters } = LEGENDS[id]!;
  const isWord = letters.length > 4 || /[a-z]/.test(letters);
  const isPunct = id === '1';
  const side = depth * k;
  const textColor = lit > 0.5 ? C.onEmber : C.onKey;
  return (
    <div
      style={{
        position: 'absolute',
        left: box.l,
        top: box.t,
        width: box.r - box.l,
        height: box.b - box.t,
        clipPath: clip,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: box.radius,
          background: C.key,
          color: textColor,
          boxShadow: side > 0 ? `0 ${side}px 0 0 ${KEY_SIDE}` : undefined,
        }}
      >
        {light > 0 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: box.radius,
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
              borderRadius: box.radius,
              background: `linear-gradient(135deg, #ffd27a 0%, ${C.ember} 55%, #ff9f2e 100%)`,
              boxShadow: `inset 0 0 0 ${3 * k}px ${C.plum}, ${SHADOW.glowEmber}`,
              opacity: lit,
            }}
          />
        ) : null}
        <div style={{ position: 'absolute', top: 9 * k, left: 12 * k, fontFamily: FONT.mono, fontSize: 15 * k, lineHeight: `${16 * k}px`, fontWeight: 500 }}>
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
    </div>
  );
};

/** The moon panel behind the keys (brand recipe), in a world box. `size` = the keypad's key size. */
export const MorphPanel: React.FC<{ box: WBox; size: number; depth?: number; light?: number; color?: string; sweep?: number }> = ({
  box,
  size,
  depth = 0,
  light = 0,
  color = C.panel,
  sweep = 0,
}) => {
  const k = size / 96;
  const side = depth * 1.2 * k;
  return (
    <div
      style={{
        position: 'absolute',
        left: box.l,
        top: box.t,
        width: Math.max(0, box.r - box.l),
        height: Math.max(0, box.b - box.t),
        borderRadius: box.radius,
        background: color,
        boxShadow: [side > 0 ? `0 ${side}px 0 0 ${PANEL_SIDE}` : '', SHADOW.lift].filter(Boolean).join(', '),
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
  );
};

// ---- The old phone, lit by the dot -----------------------------------------------------------------

/**
 * The Act 1 still of the keypad, in world px, lit only by key 9: a soft pool of light from key 9 that
 * reaches `reach` world px (0 = dark), at `level` brightness. `opacity` fades the whole phone (bar 2).
 */
export const OldPlate: React.FC<{ reach: number; level: number; opacity: number }> = ({ reach, level, opacity }) => {
  if (opacity <= 0 || reach <= 0) return null;
  const p = plateBox();
  // Key 9 in the plate box's own px.
  const cx = KEY9_PLATE.x * PLATE.scale;
  const cy = KEY9_PLATE.y * PLATE.scale;
  const light = `radial-gradient(circle at ${cx}px ${cy}px, rgba(0,0,0,1) 0px, rgba(0,0,0,0.8) ${reach * 0.3}px, rgba(0,0,0,0.36) ${reach * 0.66}px, rgba(0,0,0,0) ${reach}px)`;
  // The still's own edges fade out, so no edge of the picture ever shows.
  const sides = 'linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)';
  const ends = 'linear-gradient(to bottom, transparent 0%, black 9%, black 91%, transparent 100%)';
  const fill: React.CSSProperties = { position: 'absolute', inset: 0 };
  return (
    <div style={{ position: 'absolute', left: p.l, top: p.t, width: p.w, height: p.h, opacity, maskImage: sides, WebkitMaskImage: sides }}>
      <div style={{ ...fill, maskImage: ends, WebkitMaskImage: ends }}>
        <div style={{ ...fill, maskImage: light, WebkitMaskImage: light }}>
          <Img src={staticFile(PLATE.file)} style={{ ...fill, width: '100%', height: '100%', filter: `brightness(${level})` }} />
        </div>
      </div>
    </div>
  );
};

/**
 * Key 9's backlight on the old key: the hand-off dot (28 px at zoom 1, the exact Act 1 look) and, as it
 * spreads, the ember light leaking around the rubber key's rim and through its face. `spread` 0 = only
 * the dot (s05's last frame); 1 = the key's rim and face are lit.
 */
export const Key9Light: React.FC<{ box: WBox; spread: number; dot: number }> = ({ box, spread, dot }) => {
  const cx = (box.l + box.r) / 2;
  const cy = (box.t + box.b) / 2;
  const w = box.r - box.l;
  const h = box.b - box.t;
  return (
    <>
      {spread > 0 ? (
        <>
          {/* Light through the rubber: a warm glow over the key's face, brightest at its centre. */}
          <div
            style={{
              position: 'absolute',
              left: box.l,
              top: box.t,
              width: w,
              height: h,
              borderRadius: box.radius,
              background: `radial-gradient(ellipse 60% 70% at 50% 50%, rgba(255,177,61,${0.34 * spread}) 0%, rgba(255,177,61,${0.12 * spread}) 60%, rgba(255,177,61,0) 100%)`,
              mixBlendMode: 'screen',
            }}
          />
          {/* Light leaking around the rim, as the old keypad's backlight did. */}
          <div
            style={{
              position: 'absolute',
              left: box.l,
              top: box.t,
              width: w,
              height: h,
              borderRadius: box.radius,
              boxShadow: `0 0 0 ${2.5 * spread}px rgba(255,196,110,${0.9 * spread}), 0 0 ${18 * spread}px ${4 * spread}px rgba(255,177,61,${0.5 * spread}), inset 0 0 ${16 * spread}px rgba(255,177,61,${0.3 * spread})`,
            }}
          />
        </>
      ) : null}
      {dot > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: cx - 14,
            top: cy - 14,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: C.ember,
            boxShadow: '0 0 24px rgba(255,177,61,0.6)',
            opacity: dot,
          }}
        />
      ) : null}
    </>
  );
};
