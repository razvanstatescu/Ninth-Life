/**
 * Ghost mode, inside the phone (s12; research-v2/15 6.4 A "The ghost phone"; STYLE.md "Particles: allowed once, as
 * content"). The offline dictionary as texture inside the phone's glass, in three faked depths (size, faintness and
 * defocus), drifting; only the words that match the typed keys sharpen and brighten (drawn by the scene, not here).
 * Every position is deterministic (remotion random(seed), @remotion/noise), so any frame renders the same.
 *
 * The words are the most frequent words of the app's own dictionary (data/lexicon/en.v1.json), filtered by hand:
 * ghost-words.json. Screen px = image px of the phone capture; the parent clips to the screen.
 */
import React from 'react';
import { random } from 'remotion';
import { noise2D } from '@remotion/noise';
import { FONT } from '../../tokens';
import ghost from './ghost-words.json';
import decoded from '../../data/decoded.json';

/** The cloud's words, without the ones the scene lights for the typed keys (so no second "water" floats by). */
const MATCHED = new Set(Object.values(decoded.matches as Record<string, string[]>).flat().map((w) => w.toLowerCase()));
const WORDS = (ghost as { words: string[] }).words.filter((w) => !MATCHED.has(w));

type Layer = { count: number; size: number; alpha: number; blur: number; drift: number; seed: string };
/** Far, middle, near (research-v2/15 6.4 A, in image px at about 2.3 per screen px of the whole-phone view). */
const LAYERS: Layer[] = [
  { count: 70, size: 30, alpha: 0.08, blur: 2.6, drift: 0.2, seed: 'gfar' },
  { count: 46, size: 40, alpha: 0.09, blur: 1.6, drift: 0.32, seed: 'gmid' },
  { count: 30, size: 50, alpha: 0.11, blur: 0.7, drift: 0.5, seed: 'gnear' },
];

export type Rect = { x: number; y: number; w: number; h: number };
const inside = (x: number, y: number, r: Rect) => Math.abs(x - r.x) < r.w / 2 && Math.abs(y - r.y) < r.h / 2;
const W = 1170;

/** The dictionary in the glass: `top`..`bottom` (screen px), `clear` rects kept free (centre and size). */
export const GhostGlass: React.FC<{ frame: number; top: number; bottom: number; amount?: number; clear?: Rect[] }> = ({ frame, top, bottom, amount = 1, clear = [] }) => {
  const H = bottom - top;
  return (
    <div style={{ position: 'absolute', left: 0, top, width: W, height: H, overflow: 'hidden' }}>
      {LAYERS.map((L) => (
        <div key={L.seed} style={{ position: 'absolute', inset: 0, filter: L.blur > 0 ? `blur(${L.blur}px)` : undefined }}>
          {Array.from({ length: L.count }, (_, i) => {
            const x0 = random(`${L.seed}x${i}`) * (W + 400) - 200;
            const y = random(`${L.seed}y${i}`) * H;
            const span = W + 400;
            const wrap = (v: number) => ((((v + 200) % span) + span) % span) - 200;
            const x = wrap(x0 - frame * L.drift);
            // Keep-out tested at a fixed moment (frame 200, the middle of the typing), so no word pops while it drifts.
            if (clear.some((r) => inside(wrap(x0 - 200 * L.drift), y + top, r))) return null;
            const wob = noise2D(`${L.seed}${i}`, frame * 0.01, i * 0.37) * 6;
            const word = WORDS[Math.floor(random(`${L.seed}w${i}`) * WORDS.length)]!;
            const a = L.alpha * (0.75 + 0.5 * random(`${L.seed}a${i}`)) * amount;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y + wob,
                  transform: 'translate(-50%, -50%)',
                  fontFamily: FONT.sans,
                  fontSize: L.size,
                  lineHeight: 1,
                  fontWeight: 600,
                  color: `rgba(238,232,255,${a.toFixed(3)})`,
                  whiteSpace: 'nowrap',
                }}
              >
                {word}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
