/**
 * Scene 9's letter grid and its fold into the keypad.
 *
 * Bar 10: a plain grid of the 26 letters, A-Z in rows of 7, 7, 6, 6, left-aligned like a table (never
 * staggered like a keyboard), drawn in the brand's key style. An ember highlight steps one cell per
 * beat, the app's scanning look (lit fill, 120 ms jump).
 * Bar 11: the cells fly to their keys and the letters regroup (ABC, DEF, ...): each letter lands exactly
 * where the brand Key draws it, so the finished keypad is the real Key component.
 */
import React, { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { C, FONT, SHADOW } from '../../tokens';
import { EASE, mix, ramp } from '../../lib/anim';
import { Key, KEY_ROWS, keypadLayout, type KeyId } from '../brand/Keypad';
import decoded from '../../data/decoded.json';
import { fontsReady } from '../../fonts';

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ROW_LENGTHS = [7, 7, 6, 6];

export type FoldLayout = { cx: number; cy: number; cell: number; gap: number; key: number };

/** Centre of letter i's cell in the grid (left-aligned rows). */
export const cellCenter = (i: number, L: FoldLayout) => {
  let row = 0;
  let col = i;
  while (col >= ROW_LENGTHS[row]!) {
    col -= ROW_LENGTHS[row]!;
    row++;
  }
  const w = 7 * L.cell + 6 * L.gap;
  const h = 4 * L.cell + 3 * L.gap;
  return { x: L.cx - w / 2 + col * (L.cell + L.gap) + L.cell / 2, y: L.cy - h / 2 + row * (L.cell + L.gap) + L.cell / 2 };
};

const KEY_OF: Record<string, KeyId> = {};
for (const k of decoded.keypad.keys) {
  if (/^[A-Z]+$/.test(k.letters)) for (const ch of k.letters) KEY_OF[ch] = k.id as KeyId;
}
const LABEL_OF: Record<string, string> = Object.fromEntries(decoded.keypad.keys.map((k) => [k.id, k.letters]));

/** Centre of a key of the keypad (centred on cx, cy). */
export const keyCenterAt = (id: KeyId, L: FoldLayout) => {
  const P = keypadLayout(L.key);
  const row = KEY_ROWS.findIndex((r) => r.includes(id));
  const col = KEY_ROWS[row]!.indexOf(id);
  return { x: L.cx - P.width / 2 + P.pad + col * (L.key + P.gap) + L.key / 2, y: L.cy - P.height / 2 + P.pad + row * (L.key + P.gap) + L.key / 2 };
};

/**
 * Glyph geometry of the key labels as the brand Key draws them (font, size, 0.04em tracking, centred),
 * measured once the film's fonts have loaded (the render waits for it), so the regrouped letters land
 * exactly on the Key's own legend.
 */
type Glyphs = Record<string, { x: number; size: number }>; // letter -> x offset from the key centre, font size
export const useLabelGlyphs = (key: number): Glyphs | null => {
  const [glyphs, setGlyphs] = useState<Glyphs | null>(null);
  const [handle] = useState(() => delayRender('Measuring key labels'));
  useEffect(() => {
    let live = true;
    fontsReady
      .then(() => {
        const k = key / 96;
        const out: Glyphs = {};
        const measure = (text: string, size: number) => {
          const span = document.createElement('span');
          span.style.cssText = `position:absolute;top:-10000px;white-space:pre;font-family:${FONT.sans};font-weight:700;font-size:${size}px;letter-spacing:0.04em`;
          span.textContent = text;
          document.body.appendChild(span);
          const w = span.getBoundingClientRect().width;
          document.body.removeChild(span);
          return w;
        };
        for (const id of ['2', '3', '4', '5', '6', '7', '8', '9']) {
          const label = LABEL_OF[id]!;
          const size = (label.length > 3 ? 26 : 30) * k;
          const total = measure(label, size);
          for (let i = 0; i < label.length; i++) {
            const before = i === 0 ? 0 : measure(label.slice(0, i), size);
            const through = measure(label.slice(0, i + 1), size);
            // The trailing tracking of the glyph is not ink: centre on the glyph's own advance.
            const advance = through - before - 0.04 * size;
            out[label[i]!] = { x: -total / 2 + before + advance / 2, size };
          }
        }
        if (live) setGlyphs(out);
        continueRender(handle);
      })
      .catch(() => continueRender(handle));
    return () => {
      live = false;
    };
  }, [handle, key]);
  return glyphs;
};

/** One letter tile: the brand key look at any size, with a quiet rim while it is a grid cell (`rim`);
 *  `lit` is the scanning highlight (ember fill). */
const Tile: React.FC<{ size: number; lit: number; rim: number }> = ({ size, lit, rim }) => {
  const r = size * 0.25;
  return (
    <div style={{ position: 'absolute', inset: 0, borderRadius: r, background: C.key, boxShadow: rim > 0 ? `inset 0 0 0 3px rgba(141,128,194,${0.38 * rim})` : undefined }}>
      {lit > 0 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: r,
            background: `linear-gradient(135deg, #ffd27a 0%, ${C.ember} 55%, #ff9f2e 100%)`,
            boxShadow: `inset 0 0 0 ${size * 0.031}px ${C.plum}, ${SHADOW.glowEmber}`,
            opacity: lit,
          }}
        />
      ) : null}
    </div>
  );
};

export const LetterFold: React.FC<{
  L: FoldLayout;
  /** 0..1 per letter: the scanning highlight. */
  lit: (i: number) => number;
  /** 0..1 fold progress per letter (0 = in the grid, 1 = on its key). */
  fold: (i: number) => number;
  /** 0..1 the finished keypad (panel, the other keys, digits) */
  done: number;
  glyphs: Glyphs | null;
}> = ({ L, lit, fold, done, glyphs }) => {
  const P = keypadLayout(L.key);
  const kk = L.key / 96;
  const swap = done >= 1;
  const tileAt = (i: number, ch: string) => {
    const p = fold(i);
    const from = cellCenter(i, L);
    const to = keyCenterAt(KEY_OF[ch]!, L);
    return { p, x: mix(from.x, to.x, p), y: mix(from.y, to.y, p), size: mix(L.cell, L.key, p) };
  };
  return (
    <>
      {/* The moon panel comes up behind the keys as they land. */}
      {done > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: L.cx - P.width / 2,
            top: L.cy - P.height / 2,
            width: P.width,
            height: P.height,
            borderRadius: 44 * kk,
            background: C.panel,
            boxShadow: SHADOW.lift,
            opacity: Math.min(1, done * 1.6),
          }}
        />
      ) : null}
      {/* The finished keypad is the brand Key, placed where the tiles landed. */}
      {done > 0
        ? KEY_ROWS.flat().map((id) => {
            const c = keyCenterAt(id, L);
            const isLetterKey = /^[2-9]$/.test(id);
            const appear = isLetterKey ? (swap ? 1 : 0) : ramp(done, 0.2, 0.8, 0, 1, EASE.out);
            if (appear <= 0) return null;
            return (
              <div key={id} style={{ position: 'absolute', left: c.x - L.key / 2, top: c.y - L.key / 2 + (isLetterKey ? 0 : (1 - appear) * 16) }}>
                <Key id={id} size={L.key} state={{ appear, legend: 1 }} />
              </div>
            );
          })
        : null}
      {/* Digits of the letter keys light once the letters have landed (the Key above draws them after the swap). */}
      {!swap && done > 0
        ? (['2', '3', '4', '5', '6', '7', '8', '9'] as KeyId[]).map((id) => {
            const c = keyCenterAt(id, L);
            return (
              <div
                key={`d${id}`}
                style={{
                  position: 'absolute',
                  left: c.x - L.key / 2 + 12 * kk,
                  top: c.y - L.key / 2 + 9 * kk,
                  fontFamily: FONT.mono,
                  fontSize: 15 * kk,
                  lineHeight: `${16 * kk}px`,
                  fontWeight: 500,
                  color: C.onKey,
                  opacity: done,
                  zIndex: 2,
                }}
              >
                {id}
              </div>
            );
          })
        : null}
      {/* The 26 tiles, flying from the grid to their keys: all tiles first, then all letters on top, so
          tiles that meet on one key never hide each other's letters. */}
      {!swap
        ? LETTERS.map((ch, i) => {
            const t = tileAt(i, ch);
            return (
              <div key={`t${ch}`} style={{ position: 'absolute', left: t.x - t.size / 2, top: t.y - t.size / 2, width: t.size, height: t.size }}>
                <Tile size={t.size} lit={lit(i)} rim={1 - t.p} />
              </div>
            );
          })
        : null}
      {!swap
        ? LETTERS.map((ch, i) => {
            const t = tileAt(i, ch);
            const g = glyphs?.[ch];
            return (
              <div
                key={`l${ch}`}
                style={{
                  position: 'absolute',
                  left: t.x + mix(0, g?.x ?? 0, t.p),
                  top: t.y + mix(0, 2 * kk, t.p),
                  translate: '-50% -50%',
                  fontFamily: FONT.sans,
                  fontWeight: mix(800, 700, t.p),
                  fontSize: mix(L.cell * 0.5, g?.size ?? L.key * 0.3, t.p),
                  lineHeight: 1,
                  color: lit(i) > 0.5 ? C.onEmber : C.onKey,
                  whiteSpace: 'pre',
                }}
              >
                {ch}
              </div>
            );
          })
        : null}
    </>
  );
};
