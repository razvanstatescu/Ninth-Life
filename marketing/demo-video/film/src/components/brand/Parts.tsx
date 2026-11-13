/**
 * The app's other parts, recreated for film from design/system/components/bundle.css:
 * SentenceCard (.nl-speakbar), Candidate (.nl-candidate), ProofChip (.nl-chip), SpeakButton
 * (.nl-btn--primary --xl), StatusPill, DeviceFrame. All sizes scale with `scale` (1 = app size).
 * Pure components: state comes from props.
 */
import React from 'react';
import { C, FONT, SHADOW } from '../../tokens';
import { Icon, type IconName } from './Icon';

/** The sentence being composed: big text, mono key codes under it. */
export const SentenceCard: React.FC<{
  text: string;
  digits?: string;
  width?: number;
  scale?: number;
  /** Show a steady caret after the text (no blinking). */
  caret?: boolean;
  placeholder?: string;
  /** 0..1 per word: lights words (used when speaking); undefined = all lit. */
  wordLight?: number[];
  style?: React.CSSProperties;
}> = ({ text, digits, width = 640, scale = 1, caret = false, placeholder = 'Press a key to start', wordLight, style }) => {
  const s = scale;
  const empty = text.length === 0;
  const words = text.split(' ');
  return (
    <div
      style={{
        width: width * s,
        boxSizing: 'border-box',
        padding: `${16 * s}px ${24 * s}px ${18 * s}px ${24 * s}px`,
        borderRadius: 28 * s,
        background: C.surfaceSunken,
        color: C.ink,
        fontFamily: FONT.sans,
        ...style,
      }}
    >
      <div
        style={{
          fontSize: 40 * s,
          lineHeight: `${48 * s}px`,
          fontWeight: empty ? 400 : 600,
          color: empty ? C.inkMuted : C.ink,
          minHeight: 48 * s,
          whiteSpace: 'nowrap',
        }}
      >
        {empty
          ? placeholder
          : words.map((w, i) => (
              <span key={i} style={{ opacity: wordLight ? 0.3 + 0.7 * (wordLight[i] ?? 1) : 1 }}>
                {w}
                {i < words.length - 1 ? ' ' : ''}
              </span>
            ))}
        {caret && !empty ? (
          <span
            style={{
              display: 'inline-block',
              width: 3 * s,
              height: 40 * s,
              marginLeft: 4 * s,
              background: C.ink,
              verticalAlign: `${-6 * s}px`,
              borderRadius: 2 * s,
              opacity: 0.85,
            }}
          />
        ) : null}
      </div>
      {digits !== undefined ? (
        <div
          style={{
            marginTop: 4 * s,
            fontFamily: FONT.mono,
            fontSize: 20 * s,
            lineHeight: `${28 * s}px`,
            fontWeight: 500,
            letterSpacing: '0.06em',
            color: C.inkMuted,
            minHeight: 28 * s,
            whiteSpace: 'nowrap',
          }}
        >
          {digits}
        </div>
      ) : null}
    </div>
  );
};

/** One sentence candidate row. `selected` draws the ember selection ring (an ember thing). */
export const Candidate: React.FC<{ rank: number; text: string; selected?: number; width?: number; scale?: number; style?: React.CSSProperties }> = ({
  rank,
  text,
  selected = 0,
  width = 560,
  scale = 1,
  style,
}) => {
  const s = scale;
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 12 * s,
        width: width * s,
        boxSizing: 'border-box',
        minHeight: 72 * s,
        padding: `${12 * s}px ${24 * s}px ${12 * s}px ${16 * s}px`,
        borderRadius: 28 * s,
        border: `${2 * s}px solid ${C.line}`,
        background: C.surface,
        color: C.ink,
        fontFamily: FONT.sans,
        ...style,
      }}
    >
      {selected > 0 ? (
        <div
          style={{
            position: 'absolute',
            inset: -2 * s,
            borderRadius: 28 * s,
            background: C.emberSoft,
            boxShadow: `inset 0 0 0 ${2 * s}px ${C.ember}, 0 0 0 ${2 * s}px ${C.ember}`,
            opacity: selected,
          }}
        />
      ) : null}
      <div
        style={{
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          width: 40 * s,
          height: 40 * s,
          borderRadius: 14 * s,
          background: selected > 0.5 ? C.ember : C.surfaceSunken,
          color: selected > 0.5 ? C.onEmber : C.inkMuted,
          fontFamily: FONT.mono,
          fontSize: 18 * s,
          fontWeight: 500,
        }}
      >
        {rank}
      </div>
      <div style={{ position: 'relative', fontSize: 26 * s, lineHeight: `${34 * s}px`, fontWeight: 600, whiteSpace: 'nowrap' }}>{text}</div>
    </div>
  );
};

export type ProofKind = 'match' | 'new' | 'reject';

/** Proof chip. Meaning is never colour alone: icon + border style + strike. */
export const ProofChip: React.FC<{ word: string; code?: string; kind: ProofKind; scale?: number; strike?: number; style?: React.CSSProperties }> = ({
  word,
  code,
  kind,
  scale = 1,
  strike,
  style,
}) => {
  const s = scale;
  const color = kind === 'match' ? C.proofMatch : kind === 'new' ? C.proofNew : C.proofReject;
  const icon: IconName = kind === 'match' ? 'check' : kind === 'new' ? 'plus' : 'x';
  const strikeAmount = strike ?? (kind === 'reject' ? 1 : 0);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4 * s,
        minHeight: 48 * s,
        padding: `0 ${16 * s}px 0 ${12 * s}px`,
        borderRadius: 14 * s,
        border: `${2 * s}px ${kind === 'new' ? 'dashed' : 'solid'} ${color}`,
        background: kind === 'match' ? '#2a2f54' : C.surface,
        color: kind === 'reject' ? C.proofReject : C.ink,
        fontFamily: FONT.sans,
        fontSize: 22 * s,
        lineHeight: `${28 * s}px`,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <Icon name={icon} size={22 * s} color={color} stroke={2.5} />
      <span style={{ position: 'relative' }}>
        {word}
        {strikeAmount > 0 ? (
          <span
            style={{
              position: 'absolute',
              left: 0,
              top: '54%',
              height: 2.5 * s,
              width: `${strikeAmount * 100}%`,
              background: C.proofReject,
              borderRadius: 2 * s,
            }}
          />
        ) : null}
      </span>
      {code ? (
        <span style={{ fontFamily: FONT.mono, fontSize: 15 * s, fontWeight: 500, color: C.inkMuted, marginLeft: 4 * s, letterSpacing: '0.04em' }}>
          {code}
        </span>
      ) : null}
    </div>
  );
};

/** The primary action. Ember fill (an ember thing). `pressed` darkens it (ember-deep). */
export const SpeakButton: React.FC<{ scale?: number; pressed?: number; width?: number; label?: string; style?: React.CSSProperties }> = ({
  scale = 1,
  pressed = 0,
  width = 260,
  label = 'Speak',
  style,
}) => {
  const s = scale;
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10 * s,
        width: width * s,
        height: 80 * s,
        borderRadius: 24 * s,
        background: pressed > 0.5 ? C.emberDeep : C.ember,
        color: C.onEmber,
        fontFamily: FONT.sans,
        fontSize: 26 * s,
        fontWeight: 800,
        boxShadow: pressed > 0.5 ? undefined : '0 0 32px rgba(255,177,61,0.25)',
        ...style,
      }}
    >
      <Icon name="speaker" size={30 * s} color={C.onEmber} stroke={2.5} />
      {label}
    </div>
  );
};

/** A quiet secondary button (Menu, Show). */
export const QuietButton: React.FC<{ icon: IconName; label: string; scale?: number; width?: number; style?: React.CSSProperties }> = ({
  icon,
  label,
  scale = 1,
  width = 180,
  style,
}) => {
  const s = scale;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10 * s,
        width: width * s,
        height: 80 * s,
        borderRadius: 24 * s,
        background: C.surfaceSunken,
        color: C.ink,
        fontFamily: FONT.sans,
        fontSize: 22 * s,
        fontWeight: 700,
        ...style,
      }}
    >
      <Icon name={icon} size={26 * s} color={C.ink} />
      {label}
    </div>
  );
};

/** A status pill ("On device", "Offline. Using your dictionary."). */
export const StatusPill: React.FC<{ label: string; icon?: IconName; scale?: number; style?: React.CSSProperties }> = ({ label, icon, scale = 1, style }) => {
  const s = scale;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8 * s,
        height: 44 * s,
        padding: `0 ${18 * s}px`,
        borderRadius: 999,
        border: `${2 * s}px solid ${C.lineStrong}`,
        color: C.ink,
        fontFamily: FONT.sans,
        fontSize: 18 * s,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {icon ? <Icon name={icon} size={20 * s} color={icon === 'check' ? C.proofMatch : C.ink} /> : null}
      {label}
    </div>
  );
};

export type DeviceKind = 'phone' | 'tablet' | 'laptop';

/**
 * A plain device frame drawn by us: rounded body in `surface`, `line-strong` edge, `lift` shadow.
 * No notch, no camera, no buttons, no maker's shape. `screen` is the inner size in px.
 */
export const DeviceFrame: React.FC<{ kind: DeviceKind; screen: [number, number]; children: React.ReactNode; style?: React.CSSProperties }> = ({
  kind,
  screen,
  children,
  style,
}) => {
  const [w, h] = screen;
  const bezel = kind === 'phone' ? Math.round(w * 0.045) : kind === 'tablet' ? Math.round(w * 0.03) : Math.round(w * 0.018);
  const outerR = kind === 'phone' ? Math.round(w * 0.14) : kind === 'tablet' ? Math.round(w * 0.05) : Math.round(w * 0.02);
  const innerR = Math.max(8, outerR - bezel);
  return (
    <div
      style={{
        position: 'relative',
        width: w + bezel * 2,
        height: h + bezel * 2,
        borderRadius: outerR,
        background: C.surface,
        boxShadow: `inset 0 0 0 2px ${C.lineStrong}, ${SHADOW.lift}, 0 40px 120px rgba(8,4,20,0.6)`,
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: bezel,
          top: bezel,
          width: w,
          height: h,
          borderRadius: innerR,
          overflow: 'hidden',
          background: C.ground,
        }}
      >
        {children}
      </div>
    </div>
  );
};
