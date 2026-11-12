/**
 * Scene 9's objects for the spatial stage (lib/stage; STYLE.md "Spatial rules"). Pure: every state comes from props.
 * Each is drawn in its own px with (0, 0) at its top-left, for a lib/stage <Plane>; thickness is real (brand Key
 * body="slab", lib/stage Slab), faces are opaque, text on faces goes through <Crisp>.
 *
 *  CellBody   a letter cell: the brand key in slab form, a quiet rim, the letter on the cap (and, for the fold, the
 *             legend's place and the digit); a soft shadow on the cap from the fingertip above it
 *  FieldFace  the reply field's content (what was typed, the words put in, a steady caret)
 *  ChipFace   the grey suggestion chip's content (like no real app's: no icon, no brand colour)
 *  SwitchBody the one switch, a plain dome on a low base, seen from the front
 *  Ring       the fingertip: a moon ring
 *  Bubble     the other person's line: moon type in a plain plum bubble, opening upward, veiled
 */
import React from 'react';
import { interpolateColors } from 'remotion';
import { C, FONT } from '../../tokens';
import { Crisp } from '../../lib/stage';
import { Key, type KeyId } from '../brand/Keypad';

/** Colour a of the way from p to q (a mix of brand tokens). */
export const tint = (p: string, q: string, a: number) => (a <= 0 ? p : a >= 1 ? q : interpolateColors(a, [0, 1], [p, q]));

/** Sides of plum slabs (the field, the chip): the brand surface pushed to night, lit a little at the top left. */
export const SLAB_SIDE = tint(C.surface, C.night, 0.6);
export const SLAB_SIDE_LIT = tint(C.surface, C.lineStrong, 0.22);
/** The grey chip: moon mixed into the surface (opaque), its rim and its words. */
export const GREY = {
  face: tint(C.surface, C.moon, 0.15),
  side: tint(C.surface, C.night, 0.3),
  sideLit: tint(C.surface, C.moon, 0.24),
  rim: tint(C.surface, C.moon, 0.34),
  rimAccept: tint(C.surface, C.moon, 0.62),
  text: tint(C.surface, C.moon, 0.8),
};

/** The cap's z of a brand slab key (Keypad.tsx): its thickness, less the press travel. */
export const capTop = (size: number, depth: number, sink = 0) => Math.max(0.5, depth * (size / 96) * (1 - 0.7 * sink));

export const CellBody: React.FC<{
  id: KeyId;
  letter: string;
  size: number;
  depth: number;
  light?: number;
  lit?: number;
  sink?: number;
  /** 0..1: the quiet moon rim that seats a cell on night. */
  rim?: number;
  /** 0..1: the moon flash of a key that registers. */
  flash?: number;
  /** The letter: px, offset from the cap's centre, colour. */
  letterPx?: number;
  letterDx?: number;
  letterDy?: number;
  letterColor?: string;
  showLetter?: boolean;
  /** The digit at the cap's top left (Keypad.tsx), 0..1. */
  digit?: number;
  /** A soft shadow on the cap (cell px): the fingertip above it. */
  shade?: { x: number; y: number; r: number; a: number } | null;
  crisp?: number;
}> = ({ id, letter, size, depth, light = 1, lit = 0, sink = 0, rim = 0, flash = 0, letterPx, letterDx = 0, letterDy = 0, letterColor, showLetter = true, digit = 0, shade, crisp = 2 }) => {
  const k = size / 96;
  const top = capTop(size, depth, sink);
  const px = letterPx ?? size * 0.5;
  return (
    <div style={{ position: 'relative', width: size, height: size, transformStyle: 'preserve-3d' }}>
      <Key id={id} size={size} depth={depth} light={light} body="slab" state={{ legend: 0, lit, sink }} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, transform: `translateZ(${top + 0.5}px)` }}>
        {shade && shade.a > 0 ? (
          <div style={{ position: 'absolute', inset: 0, borderRadius: 24 * k, overflow: 'hidden' }}>
            <div
              style={{
                position: 'absolute',
                left: shade.x - shade.r,
                top: shade.y - shade.r,
                width: 2 * shade.r,
                height: 2 * shade.r,
                borderRadius: '50%',
                background: `radial-gradient(closest-side, rgba(6,2,16,${shade.a}) 0%, rgba(6,2,16,${shade.a * 0.5}) 50%, rgba(6,2,16,0) 100%)`,
              }}
            />
          </div>
        ) : null}
        {rim > 0 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 24 * k,
              // A quiet moon rim, and the cap's lit top edge and shaded bottom edge (key light top left): a raised key.
              boxShadow: [
                `inset 0 0 0 ${Math.max(1.5, 3 * k)}px rgba(141,128,194,${0.4 * rim})`,
                `inset 0 ${3 * k}px 0 rgba(238,232,255,${0.2 * rim})`,
                `inset 0 ${-3 * k}px 0 rgba(6,2,16,${0.28 * rim})`,
              ].join(', '),
            }}
          />
        ) : null}
        {flash > 0 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 24 * k,
              boxShadow: `inset 0 0 0 ${6.5 * k}px rgba(238,232,255,0.92), 0 0 ${44 * k}px rgba(238,232,255,0.38)`,
              opacity: flash,
            }}
          />
        ) : null}
        <Crisp w={size} h={size} factor={crisp}>
          {digit > 0 ? (
            <div
              style={{
                position: 'absolute',
                top: 9 * k,
                left: 12 * k,
                fontFamily: FONT.mono,
                fontSize: 15 * k,
                lineHeight: `${16 * k}px`,
                fontWeight: 500,
                color: lit > 0.5 ? C.onEmber : C.onKey,
                opacity: digit,
              }}
            >
              {id}
            </div>
          ) : null}
          {showLetter ? (
            <div
              style={{
                position: 'absolute',
                left: size / 2 + letterDx,
                top: size / 2 + letterDy,
                translate: '-50% -50%',
                fontFamily: FONT.sans,
                fontWeight: 700,
                fontSize: px,
                lineHeight: 1,
                color: letterColor ?? (lit > 0.5 ? C.onEmber : C.onKey),
                whiteSpace: 'pre',
              }}
            >
              {letter}
            </div>
          ) : null}
        </Crisp>
      </div>
    </div>
  );
};

/** The reply field's content (inside a lib/stage Slab): typed text, the inserted words rising in, a steady caret. */
export const FieldFace: React.FC<{ w: number; h: number; text: string; padX: number; px: number; inserted: string; insert: number; caret: number }> = ({
  w,
  h,
  text,
  padX,
  px,
  inserted,
  insert,
  caret,
}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: w,
      height: h,
      boxSizing: 'border-box',
      padding: `0 ${padX}px`,
      display: 'flex',
      alignItems: 'center',
      fontFamily: FONT.sans,
      fontWeight: 600,
      fontSize: px,
      lineHeight: 1,
      color: C.ink,
      whiteSpace: 'pre',
    }}
  >
    <span>{text}</span>
    {inserted ? (
      // The words put in rise out of a mask (as the supers do): no fade.
      <span style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: px * 0.18, marginBottom: -px * 0.18 }}>
        <span style={{ display: 'inline-block', translate: `0 ${(1 - insert) * px * 1.2}px` }}>{inserted}</span>
      </span>
    ) : null}
    {caret > 0 ? <span style={{ display: 'inline-block', width: 4, height: px * 1.04, marginLeft: 4, borderRadius: 2, background: C.moon }} /> : null}
  </div>
);

/** The grey chip's words. */
export const ChipFace: React.FC<{ w: number; h: number; px: number; text: string }> = ({ w, h, px, text }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: w,
      height: h,
      display: 'grid',
      placeItems: 'center',
      fontFamily: FONT.sans,
      fontWeight: 600,
      fontSize: px,
      lineHeight: 1,
      color: GREY.text,
      whiteSpace: 'nowrap',
    }}
  >
    {text}
  </div>
);

/**
 * One switch: a plain dome of our own on a low base, seen from the front (w x baseH + domeH). Lit from the top left;
 * `on` lights its moon rim; `press` sinks the dome into the base.
 */
export const SwitchBody: React.FC<{ w: number; baseH: number; domeW: number; domeH: number; on: number; press: number }> = ({ w, baseH, domeW, domeH, on, press }) => {
  const travel = 10 * press;
  return (
    <div style={{ position: 'relative', width: w, height: baseH + domeH }}>
      {/* the dome, behind the base's top edge */}
      <div
        style={{
          position: 'absolute',
          left: (w - domeW) / 2,
          top: travel,
          width: domeW,
          height: domeH + baseH / 2,
          borderRadius: `${domeW / 2}px ${domeW / 2}px 0 0 / ${domeH}px ${domeH}px 0 0`,
          background: [
            'radial-gradient(ellipse 60% 48% at 34% 26%, rgba(238,232,255,0.42) 0%, rgba(238,232,255,0.1) 45%, rgba(238,232,255,0) 70%)',
            `radial-gradient(ellipse 90% 120% at 42% 30%, ${C.glowCentre} 0%, ${C.plum} 55%, ${C.surface} 100%)`,
          ].join(', '),
          boxShadow: `inset 0 0 0 ${3}px rgba(238,232,255,${0.18 + 0.62 * on})`,
        }}
      />
      {/* the base: a low pill, lit along its top */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: domeH,
          width: w,
          height: baseH,
          boxSizing: 'border-box',
          borderRadius: baseH / 2,
          background: `linear-gradient(to bottom, ${tint(C.surface, C.lineStrong, 0.3)} 0%, ${C.surface} 38%, ${tint(C.surface, C.night, 0.5)} 100%)`,
          boxShadow: `inset 0 0 0 2px ${tint(C.surface, C.lineStrong, 0.55)}`,
        }}
      />
    </div>
  );
};

/** The fingertip: an opaque moon ring with a faint light inside. */
export const Ring: React.FC<{ size: number; down: number }> = ({ size, down }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: size,
      height: size,
      borderRadius: '50%',
      boxShadow: `inset 0 0 0 5px ${C.moon}, 0 0 22px rgba(238,232,255,${0.2 + 0.3 * down})`,
      background: `radial-gradient(closest-side, rgba(238,232,255,${0.1 + 0.2 * down}) 0%, rgba(238,232,255,${0.06 + 0.12 * down}) 70%, rgba(238,232,255,0) 100%)`,
      scale: `${1 - 0.07 * down}`,
    }}
  />
);

/**
 * The other person's line: moon type in a plain plum bubble (never the app's UI; the app's own They said comes in
 * s10). `open` 0..1 opens it upward out of its slot (a mask, no fade); `veil` darkens it (a back plane recedes by
 * darkening, never by transparency).
 */
export const Bubble: React.FC<{ text: string; px: number; padX: number; padY: number; lineHeight: number; open: number; veil: number }> = ({
  text,
  px,
  padX,
  padY,
  lineHeight,
  open,
  veil,
}) => {
  const h = px * lineHeight + 2 * padY;
  const r = 34;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        display: 'inline-block',
        height: h,
        boxSizing: 'border-box',
        padding: `${padY}px ${padX}px`,
        borderRadius: `${r}px ${r}px ${r}px 10px`,
        background: C.plum,
        boxShadow: `inset 0 0 0 2px ${C.line}`,
        fontFamily: FONT.sans,
        fontSize: px,
        lineHeight,
        fontWeight: 700,
        letterSpacing: '-0.01em',
        color: C.moon,
        whiteSpace: 'nowrap',
        clipPath: open < 1 ? `inset(${(1 - open) * 100}% 0 0 0 round ${r}px ${r}px ${r}px 10px)` : undefined,
      }}
    >
      {text}
      {veil > 0 ? <div style={{ position: 'absolute', inset: 0, borderRadius: `${r}px ${r}px ${r}px 10px`, background: `rgba(20,10,46,${veil})` }} /> : null}
    </div>
  );
};
