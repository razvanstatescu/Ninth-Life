/**
 * "Lock and key" for s11 (second cut; research-v2/11, 4.4A). Pure parts, driven by the frame.
 *
 *  LockKey     one key pressed for "water" (digit large, letters small): together they are the lock
 *  ModelCard   the app's "Model ranking (opt-in)" card offering a word, with that word's code cut into
 *              its top edge as five teeth that rise into the lock, one column at a time
 *
 * Meaning is never colour alone: a fit gets the proof-match border and a check; the mismatch gets the
 * proof-reject colour AND a dashed border AND an x icon; the dropped word gets the strike (BigChip).
 */
import React from 'react';
import { C, FONT } from '../../tokens';
import { Icon } from '../brand/Icon';
import { BigChip } from './Proof';

/** Per-column state of the compare: 0..1 docking travel, 0..1 verdict shown. */
export type ToothState = { dock: number; fit: boolean; verdict: number };

export const LockKey: React.FC<{ digit: string; letters: string; size: number; dim?: number; ring?: { color: string; amount: number; dashed?: boolean } }> = ({ digit, letters, size, dim = 0, ring }) => {
  const k = size / 96;
  return (
    <div style={{ position: 'relative', width: size, height: size, opacity: 1 - 0.55 * dim }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 24 * k,
          background: C.key,
          boxShadow: `0 ${8 * k}px 0 0 #170c34`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 24 * k,
            background: 'linear-gradient(160deg, rgba(238,232,255,0.16) 0%, rgba(238,232,255,0) 46%)',
            boxShadow: `inset 0 ${2 * k}px 0 rgba(238,232,255,0.14)`,
          }}
        />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.onKey }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 46 * k, lineHeight: 1, fontWeight: 500 }}>{digit}</div>
          <div style={{ fontFamily: FONT.sans, fontSize: 15 * k, lineHeight: 1, fontWeight: 700, letterSpacing: '0.08em', marginTop: 8 * k, opacity: 0.85 }}>{letters}</div>
        </div>
      </div>
      {ring && ring.amount > 0 ? (
        <div
          style={{
            position: 'absolute',
            inset: -7 * k,
            borderRadius: 30 * k,
            border: `${4 * k}px ${ring.dashed ? 'dashed' : 'solid'} ${ring.color}`,
            opacity: ring.amount,
          }}
        />
      ) : null}
    </div>
  );
};

export type ModelCardProps = {
  word: string;
  wordEm: number;
  code: string;
  /** World px per CSS px of the chip (BigChip s). */
  s: number;
  width: number;
  /** Tooth geometry: centre x of tooth i (card-local), width, height. */
  toothX: (i: number) => number;
  toothW: number;
  toothH: number;
  /** How far the teeth sink into the card's top edge, and how far a tooth travels to dock (world px). */
  overlap: number;
  dockTravel: number;
  toothFont: number;
  iconSize: number;
  border: number;
  teeth: ToothState[];
  /** Chip state (reject style, strike, icon). */
  reject?: number;
  strike?: number;
  /** 0..1 the app's own sentence under the chip. */
  note?: number;
  noteText: string;
  noteFont: number;
  /** Lines the note wraps to (sets the open card's height). */
  noteLines?: number;
  /** Code spacing for the chip (em). */
  spacing?: number;
  /** Card layout (defaults to modelCardLayout(s)). */
  layout?: ModelCardLayout;
};

/** Card layout in card-local px (top = the card body's top; teeth stand above it). */
export type ModelCardLayout = { padX: number; labelY: number; labelFont: number; chipY: number; chipH: number; noteY: number; closedH: number };
export const modelCardLayout = (s: number, o: { padX?: number; labelY?: number; labelFont?: number; gap?: number; padBottom?: number } = {}): ModelCardLayout => {
  const padX = o.padX ?? 22 * s;
  const labelY = o.labelY ?? 18 * s;
  const labelFont = o.labelFont ?? 18 * s;
  const chipY = labelY + labelFont * 1.25 + (o.gap ?? 7 * s);
  const chipH = 48 * s;
  const noteY = chipY + chipH + 16 * s;
  return { padX, labelY, labelFont, chipY, chipH, noteY, closedH: chipY + chipH + (o.padBottom ?? 22 * s) };
};

export const ModelCard: React.FC<ModelCardProps> = ({
  word,
  wordEm,
  code,
  s,
  width,
  toothX,
  toothW,
  toothH,
  overlap,
  dockTravel,
  toothFont,
  iconSize,
  border,
  teeth,
  reject = 0,
  strike = 0,
  note = 0,
  noteText,
  noteFont,
  noteLines = 3,
  spacing = 0.22,
  layout,
}) => {
  const Lc = layout ?? modelCardLayout(s);
  const height = Lc.closedH + (note > 0 ? (noteFont * 1.35 * noteLines + 18 * s) * note : 0);
  const r = 28 * s;
  return (
    <div style={{ position: 'relative', width, height }}>
      {/* The teeth: the suggested word's code, standing on the card's top edge. */}
      {code.split('').map((d, i) => {
        const t = teeth[i]!;
        const verdictColor = t.fit ? C.proofMatch : C.proofReject;
        const v = t.verdict;
        const style = !t.fit && v > 0 ? 'dashed' : 'solid';
        const edge = `${border}px ${style} ${v > 0 ? verdictColor : C.lineStrong}`;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: toothX(i) - toothW / 2,
              top: -toothH + overlap - t.dock * dockTravel,
              width: toothW,
              height: toothH,
              boxSizing: 'border-box',
              borderRadius: `${toothW * 0.18}px ${toothW * 0.18}px 0 0`,
              background: C.surface,
              borderTop: edge,
              borderLeft: edge,
              borderRight: edge,
              display: 'grid',
              placeItems: 'center',
              fontFamily: FONT.mono,
              fontSize: toothFont,
              lineHeight: 1,
              fontWeight: 500,
              color: v > 0 && !t.fit ? C.proofReject : C.ink,
              paddingBottom: overlap * 0.8,
            }}
          >
            {d}
            {v > 0 ? (
              <div style={{ position: 'absolute', top: toothH * 0.5 - overlap * 0.4 - iconSize / 2, left: toothW + iconSize * 0.15, opacity: v }}>
                <Icon name={t.fit ? 'check' : 'x'} size={iconSize} color={verdictColor} stroke={3} />
              </div>
            ) : null}
          </div>
        );
      })}
      {/* The card body (.card): surface, line border. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width,
          height,
          boxSizing: 'border-box',
          borderRadius: r,
          background: C.surface,
          border: `${2 * s}px solid ${C.line}`,
          boxShadow: `0 ${16 * s}px ${40 * s}px rgba(8,4,20,0.55)`,
        }}
      >
        <div style={{ position: 'absolute', left: Lc.padX, top: Lc.labelY, fontFamily: FONT.sans, fontSize: Lc.labelFont, lineHeight: `${Lc.labelFont * 1.25}px`, fontWeight: 700, color: C.inkMuted, whiteSpace: 'nowrap' }}>
          Model ranking (opt-in)
        </div>
        <div style={{ position: 'absolute', left: Lc.padX, top: Lc.chipY }}>
          <BigChip word={word} wordEm={wordEm} code={code} kind="neutral" s={s} spacing={spacing} reject={reject} strike={strike} icon={reject} />
        </div>
        {note > 0 ? (
          <div
            style={{
              position: 'absolute',
              left: Lc.padX,
              right: Lc.padX,
              top: Lc.noteY + (1 - note) * 10 * s,
              fontFamily: FONT.sans,
              fontSize: noteFont,
              lineHeight: `${noteFont * 1.35}px`,
              fontWeight: 500,
              color: C.ink,
              opacity: note,
            }}
          >
            {noteText}
          </div>
        ) : null}
      </div>
    </div>
  );
};
