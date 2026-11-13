/**
 * Parts for the proof scene, drawn from the design system (bundle.css .nl-chip, .nl-key) and driven
 * by the frame:
 *   BigChip   a proof chip that can form around its word, and turn from a model's suggestion
 *             (neutral) into a dropped word (reject: x icon, proof-reject border, strike).
 *   DigitKey  a key with its digit large and its letters small, for "letters over digits".
 *   Panel     the app's card surface.
 * Meaning is never colour alone: the reject state always has the x icon, the strike and the border.
 */
import React from 'react';
import { interpolateColors } from 'remotion';
import { C, FONT, SHADOW } from '../../tokens';
import { Icon } from '../brand/Icon';
import { EM } from './metrics';

const MATCH_FILL = '#2a2f54'; // color-mix(proof-match 14%, surface), as in .nl-chip--match

export type ChipKind = 'match' | 'neutral';

/** Advance of one mono digit without letter-spacing, in em (measured: "92837" = 3.36 em at 0.04 em spacing). */
const DIGIT_EM = EM.code5 / 5 - 0.04;

/**
 * Laid out absolutely (not flex) so every box is known: [pad 12][icon 22][gap 4][word][gap 4 + 4][code][pad 16]
 * in CSS px at s = 1, height 48, word 22/28 px weight 600, code 15 px mono. `spacing` is the code's
 * letter-spacing in em (the app uses 0.04; wider lets each digit carry its own box).
 */
export const chipGeometry = (s: number, wordEm: number, withIcon: number, withCode: number, spacing = 0.04) => {
  const font = 22 * s;
  const word = wordEm * font;
  const codeFont = 15 * s;
  const pitch = (DIGIT_EM + spacing) * codeFont;
  const code = 5 * pitch;
  const iconW = 26 * s * withIcon; // icon 22 + gap 4
  const codeW = (8 * s + code) * withCode; // gap 4 + margin 4 + code
  const wordLeft = 12 * s + iconW;
  const codeLeft = wordLeft + word + 8 * s;
  const width = 12 * s + iconW + word + codeW + 16 * s;
  /** Centre x of digit i of the code, relative to the chip's left edge. */
  const digitX = (i: number) => codeLeft + i * pitch + (DIGIT_EM * codeFont) / 2;
  return { font, word, code, codeFont, pitch, wordLeft, codeLeft, width, height: 48 * s, digitX };
};

export type BigChipProps = {
  word: string;
  /** Width of the word in em (from metrics.ts) so the chip's boxes are exact. */
  wordEm: number;
  code?: string;
  kind: ChipKind;
  s: number;
  /** 0..1: the chip's fill and border grow from around the word out to the whole chip. */
  form?: number;
  /** 0..1: the icon (check for match, x when rejected). */
  icon?: number;
  /** 0..1: the key code rises in. */
  codeIn?: number;
  /** 0..1: the reject style (proof-reject border and word, x icon). Neutral chips only. */
  reject?: number;
  /** 0..1: the strike through the word, drawn left to right. */
  strike?: number;
  /** 0..1: room for the icon and the code (lets a neutral chip widen into a reject chip). */
  slots?: number;
  /** Letter-spacing of the code in em (the app's 0.04 by default). */
  spacing?: number;
  /** Boxes around single digits of the code: [index, colour, 0..1]. */
  digitBoxes?: [number, string, number][];
  style?: React.CSSProperties;
};

export const BigChip: React.FC<BigChipProps> = ({
  word,
  wordEm,
  code,
  kind,
  s,
  form = 1,
  icon = 1,
  codeIn = 1,
  reject = 0,
  strike = 0,
  slots = 1,
  spacing = 0.04,
  digitBoxes = [],
  style,
}) => {
  const g = chipGeometry(s, wordEm, slots, code ? slots : 0, spacing);
  const line = 28 * s;
  const neutralBorder = C.lineStrong;
  const border = kind === 'match' ? C.proofMatch : interpolateColors(reject, [0, 1], [neutralBorder, C.proofReject]);
  const fill = kind === 'match' ? MATCH_FILL : C.surface;
  const wordColor = kind === 'match' ? C.ink : interpolateColors(reject, [0, 1], [C.ink, C.proofReject]);
  // Formation: clip from a box just around the word to the whole chip.
  const padW = 10 * s;
  const fromL = g.wordLeft - padW;
  const fromR = g.width - (g.wordLeft + g.word + padW);
  const fromT = (g.height - line) / 2 - 2 * s;
  const f = Math.max(0, Math.min(1, form));
  const inset = `inset(${fromT * (1 - f)}px ${fromR * (1 - f)}px ${fromT * (1 - f)}px ${fromL * (1 - f)}px round ${14 * s}px)`;
  const iconName = kind === 'match' ? 'check' : 'x';
  const iconColor = kind === 'match' ? C.proofMatch : C.proofReject;
  return (
    <div style={{ position: 'relative', width: g.width, height: g.height, fontFamily: FONT.sans, ...style }}>
      {f > 0 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            boxSizing: 'border-box',
            borderRadius: 14 * s,
            border: `${2 * s}px solid ${border}`,
            background: fill,
            clipPath: f < 1 ? inset : undefined,
            opacity: Math.min(1, f * 3),
          }}
        />
      ) : null}
      {icon > 0 && slots > 0 ? (
        <div style={{ position: 'absolute', left: 12 * s, top: (g.height - 22 * s) / 2, opacity: icon * slots }}>
          <Icon name={kind === 'neutral' && reject < 0.5 ? 'x' : iconName} size={22 * s} color={iconColor} stroke={2.5} />
        </div>
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: g.wordLeft,
          top: (g.height - line) / 2,
          fontSize: g.font,
          lineHeight: `${line}px`,
          fontWeight: 600,
          color: wordColor,
          whiteSpace: 'nowrap',
        }}
      >
        {word}
        {strike > 0 ? (
          <span
            style={{
              position: 'absolute',
              left: 0,
              top: '56%',
              height: 2.5 * s,
              width: `${Math.min(1, strike) * 100}%`,
              background: C.proofReject,
              borderRadius: 2 * s,
            }}
          />
        ) : null}
      </div>
      {code && codeIn > 0 && slots > 0
        ? digitBoxes.map(([i, color, a]) =>
            a > 0 ? (
              <div
                key={`b${i}${color}`}
                style={{
                  position: 'absolute',
                  left: g.digitX(i) - 0.4 * g.codeFont,
                  top: g.height / 2 - 0.66 * g.codeFont,
                  width: 0.8 * g.codeFont,
                  height: 1.32 * g.codeFont,
                  boxSizing: 'border-box',
                  borderRadius: 0.2 * g.codeFont,
                  border: `${0.85 * s}px solid ${color}`,
                  opacity: a,
                }}
              />
            ) : null,
          )
        : null}
      {code && codeIn > 0 && slots > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: g.codeLeft,
            top: (g.height - 16 * s) / 2,
            fontFamily: FONT.mono,
            fontSize: g.codeFont,
            lineHeight: `${16 * s}px`,
            fontWeight: 500,
            letterSpacing: `${spacing}em`,
            color: C.inkMuted,
            whiteSpace: 'nowrap',
            opacity: codeIn * slots,
            translate: `0 ${(1 - codeIn) * 10 * s}px`,
          }}
        >
          {code}
        </div>
      ) : null}
    </div>
  );
};

/** A key showing its digit large and its letters small under it (bundle.css .nl-key colours). */
export const DigitKey: React.FC<{ digit: string; letters: string; size: number; lit?: number; dim?: number; style?: React.CSSProperties }> = ({
  digit,
  letters,
  size,
  lit = 0,
  dim = 0,
  style,
}) => {
  const k = size / 96;
  const onEmber = lit > 0.5;
  return (
    <div style={{ position: 'relative', width: size, height: size, borderRadius: 24 * k, background: C.key, opacity: 1 - dim * 0.6, flex: 'none', ...style }}>
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
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: onEmber ? C.onEmber : C.onKey,
        }}
      >
        <div style={{ fontFamily: FONT.mono, fontSize: 44 * k, lineHeight: 1, fontWeight: 500 }}>{digit}</div>
        <div style={{ fontFamily: FONT.sans, fontSize: 15 * k, lineHeight: 1, fontWeight: 700, letterSpacing: '0.08em', marginTop: 8 * k, opacity: 0.85 }}>{letters}</div>
      </div>
    </div>
  );
};

/** The app's card surface (.card): surface fill, line border, card radius, lift shadow. */
export const Panel: React.FC<{ width: number; height: number; u: number; children?: React.ReactNode; style?: React.CSSProperties }> = ({ width, height, u, children, style }) => (
  <div
    style={{
      position: 'relative',
      width,
      height,
      boxSizing: 'border-box',
      borderRadius: 28 * u,
      background: C.surface,
      border: `${2 * u}px solid ${C.line}`,
      boxShadow: `0 ${16 * u}px ${40 * u}px rgba(8,4,20,0.55)`,
      ...style,
    }}
  >
    {children}
  </div>
);
