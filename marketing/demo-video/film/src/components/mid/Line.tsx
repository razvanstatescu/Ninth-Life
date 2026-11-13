/**
 * A kinetic super for the middle of Act 2. Same look and motion as <Super> (components/type), with
 * one difference: every word is laid out from the first frame and waits hidden in its mask, so a
 * centred line never shifts sideways when a later word arrives on a later beat ("Phone." then
 * "Tablet."). Screen space, like <Super>.
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, FONT } from '../../tokens';
import { EASE, ramp } from '../../lib/anim';

export type LineProps = {
  /** The words. '\n' breaks the line. */
  text: string;
  /** Local frame of the first word. */
  at: number;
  /** Frame of each word (overrides `stagger`). */
  wordFrames?: number[];
  /** Frames between words. 0 = all at once. */
  stagger?: number;
  /** Frames a word takes to rise into place. 0 = cut in. */
  rise?: number;
  /** Local frame to leave (cut), or the end of the 8-frame mask-out with outMode 'up'. */
  out?: number;
  outMode?: 'cut' | 'up';
  size?: number;
  weight?: number;
  color?: string;
  font?: keyof typeof FONT;
  letterSpacing?: string;
  lineHeight?: number;
  /** Anchor point in px: centre of the block (align centre), its left edge (left) or right edge (right). */
  x?: number;
  y?: number;
  align?: 'center' | 'left' | 'right';
  /** The word on an ember block, and when the block wipes in (default: when the word lands). */
  emphasis?: { word: number; at?: number };
  style?: React.CSSProperties;
};

export const Line: React.FC<LineProps> = ({
  text,
  at,
  wordFrames,
  stagger = 3,
  rise = 12,
  out,
  outMode = 'cut',
  size = 96,
  weight = 800,
  color = C.moon,
  font = 'sans',
  letterSpacing = '-0.015em',
  lineHeight = 1.08,
  x = 960,
  y = 540,
  align = 'center',
  emphasis,
  style,
}) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  if (out !== undefined && frame >= out) return null;
  const lines = text.split('\n').map((l) => l.split(' ').filter(Boolean));
  const outP = out !== undefined && outMode === 'up' ? ramp(frame, out - 8, 8, 0, 1, EASE.in) : 0;
  let index = 0;
  const tx = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(${tx}, -50%)`,
        textAlign: align,
        fontFamily: FONT[font],
        fontSize: size,
        fontWeight: weight,
        lineHeight,
        letterSpacing,
        color,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {lines.map((words, li) => (
        <div key={li}>
          {words.map((w, wi) => {
            const i = index++;
            const start = wordFrames?.[i] ?? at + i * stagger;
            const p = frame < start ? 0 : rise > 0 ? ramp(frame, start, rise, 0, 1, EASE.reveal) : 1;
            const isEmph = emphasis !== undefined && emphasis.word === i;
            const e = isEmph ? ramp(frame, emphasis!.at ?? start, 8, 0, 1, EASE.camera) : 0;
            return (
              <span
                key={wi}
                style={{
                  display: 'inline-block',
                  overflow: 'hidden',
                  verticalAlign: 'top',
                  padding: '0.06em 0.18em 0.16em',
                  margin: '-0.06em -0.18em -0.16em',
                  marginRight: wi < words.length - 1 ? '0.06em' : '-0.18em',
                }}
              >
                <span
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    translate: `0 ${(1 - p) * 116 - outP * 116}%`,
                    color: e > 0.5 ? C.onEmber : color,
                  }}
                >
                  {isEmph ? (
                    <span
                      style={{
                        position: 'absolute',
                        left: '-0.14em',
                        right: '-0.14em',
                        top: '0.02em',
                        bottom: '-0.04em',
                        borderRadius: '0.14em',
                        background: C.ember,
                        transformOrigin: 'left center',
                        scale: `${e} 1`,
                      }}
                    />
                  ) : null}
                  <span style={{ position: 'relative' }}>{w}</span>
                </span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
