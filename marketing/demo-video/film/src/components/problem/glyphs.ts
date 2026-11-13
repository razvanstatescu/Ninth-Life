/**
 * Where each letter of a key's legend sits, as the brand Key draws it (Atkinson Hyperlegible Next 700,
 * 0.04em tracking, centred, 30 px or 26 px at size 96), measured once the film's fonts have loaded (the
 * render waits). The fold's letters land on these, so the swap to the real Keypad on the last frame is
 * invisible. Adapted from the first cut's components/open/Fold.tsx.
 */
import { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import decoded from '../../data/decoded.json';
import { FONT } from '../../tokens';
import { fontsReady } from '../../fonts';

/** letter -> x offset of the glyph's centre from the key's centre, and the legend's font size (px). */
export type Glyphs = Record<string, { x: number; size: number }>;

const LABEL_OF: Record<string, string> = Object.fromEntries(decoded.keypad.keys.map((k) => [k.id, k.letters]));

/** The legend's font size for a key of `size` px (Keypad.tsx: 26 for four letters, 30 for three). */
export const legendSize = (letters: string, size: number) => (letters.length > 3 ? 26 : 30) * (size / 96);

export const useLegendGlyphs = (size: number): Glyphs | null => {
  const [glyphs, setGlyphs] = useState<Glyphs | null>(null);
  const [handle] = useState(() => delayRender('Measuring key legends'));
  useEffect(() => {
    let live = true;
    fontsReady
      .then(() => {
        const out: Glyphs = {};
        const measure = (text: string, px: number) => {
          const span = document.createElement('span');
          span.style.cssText = `position:absolute;top:-10000px;white-space:pre;font-family:${FONT.sans};font-weight:700;font-size:${px}px;letter-spacing:0.04em`;
          span.textContent = text;
          document.body.appendChild(span);
          const w = span.getBoundingClientRect().width;
          document.body.removeChild(span);
          return w;
        };
        for (const id of ['2', '3', '4', '5', '6', '7', '8', '9']) {
          const label = LABEL_OF[id]!;
          const px = legendSize(label, size);
          const total = measure(label, px);
          for (let i = 0; i < label.length; i++) {
            const before = i === 0 ? 0 : measure(label.slice(0, i), px);
            const through = measure(label.slice(0, i + 1), px);
            // The glyph's own advance, without the tracking that follows it.
            const advance = through - before - 0.04 * px;
            out[label[i]!] = { x: -total / 2 + before + advance / 2, size: px };
          }
        }
        if (live) setGlyphs(out);
        continueRender(handle);
      })
      .catch(() => continueRender(handle));
    return () => {
      live = false;
    };
  }, [handle, size]);
  return glyphs;
};
