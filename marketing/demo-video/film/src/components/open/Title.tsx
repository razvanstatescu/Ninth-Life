/**
 * s08's title card and its dive (07-revision-v2.md, s08), and the type both s07 and s08 share.
 *
 * - The type match: s07's spoken line "Hello again." and s08's wordmark "Ninth Life" use the same size,
 *   weight, tracking and line box, centred on the same y, so the name lands on the baseline and cap height
 *   the spoken line had.
 * - The lockup: the icon (whole, never animated, tilted or built up) left of the wordmark, in the end card's
 *   proportion (icon box 300 for a 134 px wordmark), centred on the frame.
 * - The dive: on bar 8 beat 4 the camera dives into the icon's CENTRE key (plum) until plum fills the frame;
 *   s09 lands from zoom 1.15 on night. World coordinates are screen px of the still card (origin top-left,
 *   camera centre 960, 540), so the card is laid out like a poster and the dive is a camera move over it.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C } from '../../tokens';
import { WIDTH, HEIGHT } from '../../timeline';

/** The spoken line (s07) and the wordmark (s08): size, line box (SpokenLine's), and the line's centre y. */
export const TITLE = { size: 200, lineHeight: 1.04, y: 540 } as const;

/** The AppIcon's box (the end card's proportion: 300 for a 134 px wordmark). */
export const ICON = Math.round((TITLE.size * 300) / 134);
/** The icon's bubble spans 24.6%-75.4% of its box (logo SVG): its empty sides, trimmed in the lockup. */
const ICON_SIDE = ICON * 0.246;
/** The wordmark's width at TITLE.size, measured on a render (out/open/s08-measure.png: 912 px incl. side bearing). */
export const WORDMARK_W = 912;
const GAP = 44;
const LOCKUP_W = ICON - 2 * ICON_SIDE + GAP + WORDMARK_W;
const LOCKUP_LEFT = WIDTH / 2 - LOCKUP_W / 2;
/**
 * The bubble's own centre is at 530/1024 of the box; set it on the cap-height centre of the name (measured:
 * the N runs 473-606 px with the line centred on 540, so its centre is 539.5).
 */
const CAP_CENTRE_Y = TITLE.y;

/** Centre of the icon's box on the card. */
export const ICON_AT = { x: LOCKUP_LEFT - ICON_SIDE + ICON / 2, y: CAP_CENTRE_Y + ICON / 2 - (530 / 1024) * ICON };
/** Left edge of the wordmark. */
export const TEXT_X = LOCKUP_LEFT + ICON - 2 * ICON_SIDE + GAP;

/** The icon's centre key (plum), from the icon's own geometry: rect x 460-564, y 478-582 of 1024. */
export const centreKey = () => ({
  x: ICON_AT.x - ICON / 2 + (512 / 1024) * ICON,
  y: ICON_AT.y - ICON / 2 + (530 / 1024) * ICON,
  size: (104 / 1024) * ICON,
});

/**
 * The dive's camera and where the centre key is on screen (its centre and half-size in px). Zoom grows
 * in log space; the centre key glides from where it is on screen when the dive starts (`start`) to the
 * middle of the frame, so it never leaves the picture on the way in. `key` = the centre key's world
 * position (the lockup may have moved). `u` = zoom progress 0..1, `s` = glide progress 0..1.
 */
export const diveFrom = (
  u: number,
  s: number,
  zoomStart: number,
  zoomEnd: number,
  key: { x: number; y: number },
  start: { x: number; y: number },
) => {
  const zoom = Math.exp(Math.log(zoomStart) + (Math.log(zoomEnd) - Math.log(zoomStart)) * u);
  const sx = start.x + (WIDTH / 2 - start.x) * s;
  const sy = start.y + (HEIGHT / 2 - start.y) * s;
  return { camX: key.x - (sx - WIDTH / 2) / zoom, camY: key.y - (sy - HEIGHT / 2) / zoom, zoom, sx, sy, half: (centreKey().size * zoom) / 2 };
};

/**
 * Viewer safety for the dive (02-creative-direction.md, section 9; research-v2/12, section 8). Diving into
 * the centre key passes the icon's moon bubble and the moon gaps between its keys; in the first cut they
 * swept across the frame for about 8 frames (frames 2628-2636 there). So the camera looks through a window
 * in the key's own shape: plum closes in from the frame's edges onto the 3 x 3 of keys while the zoom is
 * still small, then hugs the centre key before the zoom races. Outside the window is plum, the colour
 * the dive ends on; the bright area never grows.
 */
export const DiveWindow: React.FC<{ sx: number; sy: number; half: number; keyHalf: number }> = ({ sx, sy, half, keyHalf }) => {
  if (half > 2400) return null;
  // Soft while it is far from the key (darkness closing in, like an iris), crisp once it hugs the key.
  const soft = Math.min(160, Math.max(8, (half - keyHalf) * 0.35));
  return (
    <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: sx - half,
          top: sy - half,
          width: half * 2,
          height: half * 2,
          borderRadius: half * 0.5,
          // Plum outside (hard), and an inset fade of the same plum inside the edge (the soft part).
          boxShadow: `0 0 0 4000px ${C.plum}, inset 0 0 ${soft}px ${soft * 0.5}px ${C.plum}`,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * The window's size as a multiple of the centre key's half-size, by dive progress u (0..1): off at first,
 * on the 3 x 3 of keys by u = 0.45 (zoom about 1.5), hugging the key by u = 0.8. Log-interpolated.
 */
const WINDOW_FACTOR: [number, number][] = [
  [0, 140],
  [0.1, 140],
  [0.45, 4.2],
  [0.65, 1.2],
  [0.8, 1.06],
  [1, 1.03],
];

export const windowHalf = (u: number, keyHalf: number) => {
  const keys = WINDOW_FACTOR;
  let f = keys[keys.length - 1]![1];
  if (u <= keys[0]![0]) f = keys[0]![1];
  else {
    for (let i = 1; i < keys.length; i++) {
      const [u1, v1] = keys[i]!;
      const [u0, v0] = keys[i - 1]!;
      if (u <= u1) {
        f = Math.exp(Math.log(v0) + (Math.log(v1) - Math.log(v0)) * ((u - u0) / (u1 - u0)));
        break;
      }
    }
  }
  return keyHalf * f;
};
