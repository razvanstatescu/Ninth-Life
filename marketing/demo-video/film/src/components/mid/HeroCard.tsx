/**
 * The sentence card of the app's phone layout (.phone-card: .nl-speakbar with the key line under it
 * and Clear on the right), recreated for film from the phone capture's geometry. CSS px at s = 1:
 * 366 x 134, text 40/48 px weight 600 from (16, 8), key line 16 px mono at the bottom, Clear 56 x 56.
 * At s = 3 it lands exactly on the phone capture's card (3 image px per CSS px), which is what lets
 * the film cut between the hero card and the real screen without a jump.
 */
import React from 'react';
import { C, FONT } from '../../tokens';
import { Icon } from '../brand/Icon';

export const CARD = {
  width: 366,
  height: 134,
  radius: 28,
  padLeft: 16,
  textTop: 8,
  font: 40,
  line: 48,
  digitsFont: 16,
  digitsLine: 20,
  digitsBottom: 8,
  clear: 56,
  clearRight: 8,
  clearTop: 8,
} as const;

export type HeroCardProps = {
  text: string;
  digits?: string;
  /** Scale: world px per CSS px. */
  s?: number;
  /** Card size in CSS px. */
  width?: number;
  height?: number;
  /** Show the Clear button (the app's phone card has one). */
  clear?: boolean;
  /** 0..1 per word: light while speaking (dim words sit at 30%). Undefined = all lit. */
  wordLight?: number[];
  /** Per-word opacity multiplier (for lifting one word out of the sentence). */
  wordOpacity?: number[];
  /** Opacity of the card's fill, key line and Clear (the words keep theirs). */
  chrome?: number;
  /** Placeholder when empty (the app's own words). */
  placeholder?: string;
  style?: React.CSSProperties;
};

export const HeroCard: React.FC<HeroCardProps> = ({
  text,
  digits,
  s = 1,
  width = CARD.width,
  height = CARD.height,
  clear = true,
  wordLight,
  wordOpacity,
  chrome = 1,
  placeholder = 'Press a key to start',
  style,
}) => {
  const empty = text.length === 0;
  const words = text.split(' ');
  return (
    <div style={{ position: 'relative', width: width * s, height: height * s, fontFamily: FONT.sans, ...style }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: CARD.radius * s, background: C.surfaceSunken, opacity: chrome }} />
      <div
        style={{
          position: 'absolute',
          left: CARD.padLeft * s,
          top: CARD.textTop * s,
          fontSize: CARD.font * s,
          lineHeight: `${CARD.line * s}px`,
          fontWeight: empty ? 400 : 600,
          color: empty ? C.inkMuted : C.ink,
          whiteSpace: 'nowrap',
          opacity: empty ? chrome : 1,
        }}
      >
        {empty
          ? placeholder
          : words.map((w, i) => (
              <span
                key={i}
                style={{
                  opacity: (wordLight ? 0.3 + 0.7 * (wordLight[i] ?? 1) : 1) * (wordOpacity?.[i] ?? 1),
                }}
              >
                {w}
                {i < words.length - 1 ? ' ' : ''}
              </span>
            ))}
      </div>
      {digits !== undefined ? (
        <div
          style={{
            position: 'absolute',
            left: CARD.padLeft * s,
            bottom: CARD.digitsBottom * s,
            fontFamily: FONT.mono,
            fontSize: CARD.digitsFont * s,
            lineHeight: `${CARD.digitsLine * s}px`,
            fontWeight: 500,
            letterSpacing: '0.06em',
            color: C.inkMuted,
            whiteSpace: 'pre',
            opacity: chrome,
          }}
        >
          {digits}
        </div>
      ) : null}
      {clear ? (
        <div
          style={{
            position: 'absolute',
            right: CARD.clearRight * s,
            top: CARD.clearTop * s,
            width: CARD.clear * s,
            height: CARD.clear * s,
            boxSizing: 'border-box',
            borderRadius: 18 * s,
            border: `${2 * s}px solid ${C.lineStrong}`,
            display: 'grid',
            placeItems: 'center',
            opacity: chrome,
          }}
        >
          <Icon name="x" size={22 * s} color={C.ink} stroke={2.5} />
        </div>
      ) : null}
    </div>
  );
};

