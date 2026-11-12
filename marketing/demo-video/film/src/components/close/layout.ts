/**
 * Layout shared by scenes 15 and 16 (screen px at 1920 x 1080).
 *
 * The eye match across the silence (07-revision-v2.md, section 6, s15 -> s16): Speak is pressed at
 * NINTH_KEY in scene 15, and the icon's ninth key fades in at exactly that point in scene 16's lockup.
 * The icon box is placed from fixed numbers (not from the measured wordmark), so the ninth key is
 * exact even if the font's width changes; WORDMARK_WIDTH only centres the lockup.
 */

/** The horizontal lockup (design/system/README.md: the wordmark sits beside the icon). */
export const LOCKUP = {
  /** The icon's box (the 1024 viewBox drawn at this size): the visible icon is about 230 x 277 px. */
  icon: 429,
  /** The wordmark's font size (1.3 x the first lockup's 120). */
  wordmark: 156,
  /**
   * "Ninth Life" at 156 px (Atkinson Hyperlegible Next 800, -0.02em): from the box's left edge to the
   * last glyph's ink (546 px at 120 px, measured in out/close/s16-130.png, scaled; checked again in a render).
   */
  wordmarkWidth: 710,
  /** Space between the bubble's outer edge (its moon stroke) and the wordmark's box. */
  gap: 62,
  /** Screen y of the bubble's centre line (and of the wordmark's caps' centre). */
  y: 500,
  /** Screen y of the address line's centre, just under the lockup. */
  addressY: 694,
} as const;

/** Parts of the icon in its 1024 viewBox, as fractions of the box (brand/Logo.tsx, the logo SVG). */
export const ICON_GEOMETRY = {
  /** The bubble rect spans x 252..772 and y 300..760; its 28-unit moon stroke takes the ink to 238..786. */
  bubbleLeft: 238 / 1024,
  bubbleRight: 786 / 1024,
  bubbleMidY: 530 / 1024,
  /** The ninth key: rect 588..692 x 606..710. */
  ninthX: 640 / 1024,
  ninthY: 658 / 1024,
  ninthSize: 104 / 1024,
} as const;

const visible = (ICON_GEOMETRY.bubbleRight - ICON_GEOMETRY.bubbleLeft) * LOCKUP.icon;
const lockupLeft = 960 - (visible + LOCKUP.gap + LOCKUP.wordmarkWidth) / 2;

/** Top-left of the icon's box on screen. */
export const ICON_BOX = {
  x: Math.round(lockupLeft - ICON_GEOMETRY.bubbleLeft * LOCKUP.icon),
  y: Math.round(LOCKUP.y - ICON_GEOMETRY.bubbleMidY * LOCKUP.icon),
};

/** Left edge of the wordmark. */
export const WORDMARK_X = Math.round(lockupLeft + visible + LOCKUP.gap);

/** Screen centre of the icon's ninth key: where scene 15 presses Speak. */
export const NINTH_KEY = {
  x: ICON_BOX.x + ICON_GEOMETRY.ninthX * LOCKUP.icon,
  y: ICON_BOX.y + ICON_GEOMETRY.ninthY * LOCKUP.icon,
};
