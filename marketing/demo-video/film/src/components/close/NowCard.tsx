/**
 * Scene 15's "now": the app's sentence card (brand/Parts SentenceCard, design .nl-speakbar) as an object in
 * the lit night studio: the same type and colours, plus thickness, a top-left light and the lift shadow.
 * The key codes are drawn digit by digit so single digits can light (the "same keys" rhyme with the old
 * phone's keys). Pure: every state comes from props.
 */
import React from 'react';
import { C, FONT, SHADOW } from '../../tokens';

/** The card's side (plum pushed towards night), as the keys' sides in brand/Keypad. */
const SIDE = '#170c34';

export type NowCardProps = {
  text: string;
  /** The key code of each word, e.g. ['43556', '24246']. */
  codes: string[];
  /** Layout width in app px (the card scales with `scale`). */
  width: number;
  scale: number;
  /** 0..1 per code, per digit: lights a digit from ink-muted to moon. */
  light?: number[][];
  /** Thickness in px at scale 1. */
  depth?: number;
  style?: React.CSSProperties;
};

/** Height of the card in px (padding 16 + 18, text 48, gap 4, digits 28: the SentenceCard metrics). */
export const nowCardHeight = (scale: number) => 114 * scale;

const mixColor = (a: [number, number, number], b: [number, number, number], t: number) =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i]! - v) * t)).join(',')})`;
const MUTED: [number, number, number] = [189, 179, 224]; // C.inkMuted
const MOON: [number, number, number] = [238, 232, 255]; // C.moon

export const NowCard: React.FC<NowCardProps> = ({ text, codes, width, scale: s, light, depth = 6, style }) => {
  const d = depth * s;
  return (
    <div
      style={{
        position: 'relative',
        width: width * s,
        height: nowCardHeight(s),
        boxSizing: 'border-box',
        padding: `${16 * s}px ${24 * s}px ${18 * s}px`,
        borderRadius: 28 * s,
        background: C.surfaceSunken,
        boxShadow: `0 ${d}px 0 0 ${SIDE}, ${SHADOW.lift}, 0 40px 100px rgba(8,4,20,0.5)`,
        color: C.ink,
        fontFamily: FONT.sans,
        ...style,
      }}
    >
      {/* The top-left light on the card's face. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 28 * s,
          background: 'linear-gradient(160deg, rgba(238,232,255,0.11) 0%, rgba(238,232,255,0) 42%)',
          boxShadow: `inset 0 ${2 * s}px 0 rgba(238,232,255,0.09)`,
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', fontSize: 40 * s, lineHeight: `${48 * s}px`, fontWeight: 600, whiteSpace: 'nowrap' }}>{text}</div>
      <div
        style={{
          position: 'relative',
          marginTop: 4 * s,
          display: 'flex',
          gap: `${0.9 * 20 * s}px`,
          fontFamily: FONT.mono,
          fontSize: 20 * s,
          lineHeight: `${28 * s}px`,
          fontWeight: 500,
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
        }}
      >
        {codes.map((code, ci) => (
          <span key={ci}>
            {code.split('').map((ch, di) => {
              const t = light?.[ci]?.[di] ?? 0;
              return (
                <span key={di} style={{ color: t > 0 ? mixColor(MUTED, MOON, t) : C.inkMuted }}>
                  {ch}
                </span>
              );
            })}
          </span>
        ))}
      </div>
    </div>
  );
};
