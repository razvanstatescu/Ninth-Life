/**
 * The app's speak bar (design system nl-speakbar: the sentence, its keys in mono under it, and Speak at
 * its end), recreated for the opening at film scale. The shared SentenceCard has no Speak button, so
 * this local variant composes both, with Speak in the app's three looks:
 * - disabled (nothing to say yet): an outlined button with muted ink (the app's `secondary` look),
 * - enabled: the ember primary (an ember thing),
 * - pressed: ember-deep.
 * Pure: every state comes from props.
 */
import React from 'react';
import { C, FONT } from '../../tokens';
import { Icon } from '../brand/Icon';

export type SpeakLook = { enabled: number; pressed: number };

/** Geometry of the bar at a scale (app px x scale). Widths of the text area and Speak are fixed. */
export const barGeometry = (scale: number, textWidth: number, speakWidth: number) => {
  const s = scale;
  const padL = 24 * s;
  const padR = 16 * s;
  const gap = 16 * s;
  const height = (16 + 80 + 16) * s;
  const width = padL + textWidth + gap + speakWidth + padR;
  // Speak's centre, relative to the bar's left edge and vertical centre.
  const speakX = width - padR - speakWidth / 2;
  return { padL, padR, gap, height, width, speakX };
};

export const SpeakKey: React.FC<{ scale: number; width: number; look: SpeakLook }> = ({ scale, width, look }) => {
  const s = scale;
  const on = look.enabled;
  const deep = look.pressed;
  const shared: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8 * s,
    borderRadius: 24 * s,
    fontFamily: FONT.sans,
    fontSize: 22 * s,
    lineHeight: `${26 * s}px`,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  };
  return (
    <div style={{ position: 'relative', width, height: 80 * s, flex: 'none' }}>
      {on < 1 ? (
        <div style={{ ...shared, boxShadow: `inset 0 0 0 ${2 * s}px ${C.lineStrong}`, color: C.inkMuted, opacity: 1 - on }}>
          <Icon name="speaker" size={24 * s} color={C.inkMuted} />
          Speak
        </div>
      ) : null}
      {on > 0 ? (
        <div
          style={{
            ...shared,
            background: deep > 0 ? `color-mix(in srgb, ${C.emberDeep} ${Math.round(deep * 100)}%, ${C.ember})` : C.ember,
            color: C.onEmber,
            boxShadow: `0 0 ${32 * s}px rgba(255,177,61,${0.25 * (1 - deep)})`,
            opacity: on,
          }}
        >
          <Icon name="speaker" size={24 * s} color={C.onEmber} />
          Speak
        </div>
      ) : null}
    </div>
  );
};

export const HeroBar: React.FC<{
  scale: number;
  textWidth: number;
  speakWidth: number;
  text: string;
  digits: string;
  placeholder?: string;
  speak: SpeakLook & { appear: number; dy?: number };
  style?: React.CSSProperties;
}> = ({ scale, textWidth, speakWidth, text, digits, placeholder = 'Press a key to start', speak, style }) => {
  const s = scale;
  const g = barGeometry(s, textWidth, speakWidth);
  const empty = text.length === 0;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: g.gap,
        width: g.width,
        height: g.height,
        boxSizing: 'border-box',
        padding: `0 ${g.padR}px 0 ${g.padL}px`,
        borderRadius: 28 * s,
        background: C.surfaceSunken,
        color: C.ink,
        fontFamily: FONT.sans,
        ...style,
      }}
    >
      <div style={{ width: textWidth, flex: 'none' }}>
        <div
          style={{
            fontSize: 40 * s,
            lineHeight: `${48 * s}px`,
            fontWeight: empty ? 400 : 600,
            color: empty ? C.inkMuted : C.ink,
            whiteSpace: 'nowrap',
          }}
        >
          {empty ? placeholder : text}
        </div>
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
      </div>
      <div style={{ position: 'relative', top: speak.dy ?? 0, opacity: speak.appear }}>
        <SpeakKey scale={s} width={speakWidth} look={speak} />
      </div>
    </div>
  );
};
