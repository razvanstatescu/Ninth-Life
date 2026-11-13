/**
 * The old phone's key legends, drawn by the film on the measured key quads of a still (the generated keys
 * are blank on purpose: research-v2/10-act1-old-world.md, 4.6). Wide keys: the digit on the left, the letters
 * (ITU-T E.161) on the right. Unlit they are pale printed paint; lit, the backlight shines through them
 * (laser-etched legends). A pressed key's light jumps up and its face dips a little.
 *
 * Plain straight-sided grotesque (Barlow Semi Condensed, SIL OFL, public/img/v2/fonts with its licence), never a
 * pixel face: these are printed keys, not a screen. Its zero is plain (the brand font's is slashed).
 */
import React from 'react';
import { staticFile } from 'remotion';
import { loadFont } from '@remotion/fonts';
import { quadTransform, type PlateInfo, type PlateKey, PLATE_KEYS } from './plates';

/** Loaded once, like src/fonts.ts; Remotion waits for loadFont() before rendering frames. */
export const legendFontReady = Promise.all([
  loadFont({ family: 'Barlow Semi Condensed', url: staticFile('img/v2/fonts/BarlowSemiCondensed-Medium.ttf'), weight: '500', format: 'truetype' }),
  loadFont({ family: 'Barlow Semi Condensed', url: staticFile('img/v2/fonts/BarlowSemiCondensed-SemiBold.ttf'), weight: '600', format: 'truetype' }),
]);

export const LEGENDS: Record<PlateKey, [string, string]> = {
  '1': ['1', '.,?'],
  '2': ['2', 'abc'],
  '3': ['3', 'def'],
  '4': ['4', 'ghi'],
  '5': ['5', 'jkl'],
  '6': ['6', 'mno'],
  '7': ['7', 'pqrs'],
  '8': ['8', 'tuv'],
  '9': ['9', 'wxyz'],
  star: ['*', ''],
  '0': ['0', '+'],
  hash: ['#', ''],
};

/** Key box in its own units before it is pinned onto the key's quad. */
const KW = 250;
const KH = 130;

export type Press = { k: PlateKey; amount: number } | null;

export const KeyLegends: React.FC<{
  plate: PlateInfo;
  /** 0..1 backlight. */
  light: number;
  press?: Press;
  /** Only these keys (default: all twelve). */
  only?: PlateKey[];
  /** Scale of the type inside the key (1 = default). */
  size?: number;
}> = ({ plate, light, press = null, only, size = 1 }) => (
  <>
    {(only ?? PLATE_KEYS).map((k) => {
      const q = plate.keys[k].quad;
      const [digit, letters] = LEGENDS[k];
      const pressed = press && press.k === k ? press.amount : 0;
      // The press is a film conceit (a real key's light does not change): the pressed key's face lifts and its
      // legend burns whiter, only while the backlight is on.
      const pr = pressed * light;
      const l = light;
      const glowA = 0.55 * l;
      const mix = (a: number, b: number) => Math.round(a + (b - a) * pr);
      const lit = `rgba(${mix(233, 252)},${mix(247, 255)},${mix(192, 236)},${(0.35 + 0.65 * l).toFixed(3)})`;
      const unlit = 'rgba(206,212,202,0.30)';
      const color = l > 0.02 ? lit : unlit;
      const shadow =
        l > 0.02
          ? [
              `0 0 ${6 * size}px rgba(205,235,130,${Math.min(1, glowA + 0.4 * pr).toFixed(3)})`,
              `0 0 ${18 * size}px rgba(185,220,110,${Math.min(1, 0.7 * glowA + 0.3 * pr).toFixed(3)})`,
              ...(pr > 0 ? [`0 0 ${40 * size}px rgba(205,240,140,${(0.6 * pr).toFixed(3)})`] : []),
            ].join(', ')
          : 'none';
      return (
        <div
          key={k}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: KW,
            height: KH,
            transformOrigin: '0 0',
            transform: quadTransform(KW, KH, q),
          }}
        >
          {pr > 0 ? (
            <>
              <div
                style={{
                  position: 'absolute',
                  inset: -KH * 0.15,
                  borderRadius: KH * 0.6,
                  background: `radial-gradient(closest-side, rgba(205,235,140,${(0.18 * pr).toFixed(3)}) 0%, rgba(205,235,140,0) 100%)`,
                  mixBlendMode: 'screen',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: KH * 0.07,
                  borderRadius: KH * 0.42,
                  background: `radial-gradient(ellipse at 50% 55%, rgba(215,245,150,${(0.32 * pr).toFixed(3)}) 0%, rgba(215,245,150,${(0.14 * pr).toFixed(3)}) 60%, rgba(215,245,150,0) 100%)`,
                  mixBlendMode: 'screen',
                }}
              />
            </>
          ) : null}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: letters ? 'space-between' : 'center',
              padding: `0 ${KW * 0.2}px 0 ${KW * (letters ? 0.22 : 0)}px`,
              transform: `scale(${1 - 0.015 * pressed})`,
              fontFamily: '"Barlow Semi Condensed", sans-serif',
              color,
              textShadow: shadow,
              lineHeight: 1,
            }}
          >
            <span style={{ fontSize: 70 * size, fontWeight: 600 }}>{digit}</span>
            {letters ? <span style={{ fontSize: 38 * size, fontWeight: 500, letterSpacing: '0.03em' }}>{letters}</span> : null}
          </div>
        </div>
      );
    })}
  </>
);
