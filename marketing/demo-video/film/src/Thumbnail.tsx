/** The YouTube thumbnail (1280 x 720): the icon, the name, the promise. */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, FONT } from './tokens';
import { AppIcon, NightGround, Wordmark } from './components/brand/Logo';

export const Thumbnail: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: C.night }}>
    <NightGround glow={{ x: 30, y: 45, r: 55, strength: 1 }} />
    <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', padding: '0 80px', gap: 40 }}>
      <AppIcon size={420} ninth={1} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Wordmark size={120} />
        <div style={{ fontFamily: FONT.sans, fontWeight: 700, fontSize: 50, lineHeight: 1.15, color: C.ink, whiteSpace: 'nowrap' }}>
          The old phone keypad,
          <br />
          back as a way to talk.
        </div>
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);
