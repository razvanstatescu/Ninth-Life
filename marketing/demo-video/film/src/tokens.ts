/**
 * Brand tokens, copied from design/system/tokens.json (Night theme). Act 2 uses ONLY these colours.
 * Act 1 has its own palette (LCD greens, greys) defined in the Act 1 components.
 */
export const C = {
  // Brand
  night: '#140a2e',
  plum: '#2a1856',
  moon: '#eee8ff',
  ember: '#ffb13d',
  emberDeep: '#e08a12',
  onEmber: '#1a0f3a',
  emberSoft: '#3a2440',
  // Semantic (Night)
  ground: '#140a2e',
  surface: '#1f1243',
  surfaceSunken: '#2a1856',
  panel: '#eee8ff',
  key: '#2a1856',
  onKey: '#f3eeff',
  line: '#3a2a6e',
  lineStrong: '#8d80c2',
  ink: '#f3eeff',
  inkMuted: '#bdb3e0',
  link: '#ffc56b',
  proofMatch: '#6be3be',
  proofNew: '#9bbeff',
  proofReject: '#ff8fa6',
  // The icon's own night gradient (logo SVG): centre, middle, edge.
  glowCentre: '#3d2478',
  glowMid: '#25154f',
} as const;

export const FONT = {
  sans: '"Atkinson Hyperlegible Next", system-ui, sans-serif',
  mono: '"Atkinson Hyperlegible Mono", ui-monospace, monospace',
  pixel: '"Tiny5", monospace',
  tv: '"VT323", monospace',
} as const;

export const RADIUS = { chip: 14, key: 24, card: 28, panel: 44, pill: 999 } as const;

export const SHADOW = {
  /** The lit key and the scan highlight on Night. */
  glowEmber: '0 0 0 6px rgba(255,177,61,0.35), 0 0 36px rgba(255,177,61,0.55)',
  /** The keypad panel and floating sheets. */
  lift: '0 16px 40px rgba(8,4,20,0.55)',
} as const;

/** Type scale from tokens.json, in px at app size. Film supers use their own larger sizes (see STYLE.md). */
export const TYPE = {
  displayXl: { fontSize: 96, lineHeight: 0.95, fontWeight: 800, letterSpacing: '-0.02em' },
  display: { fontSize: 56, lineHeight: '60px', fontWeight: 800, letterSpacing: '-0.015em' },
  utterance: { fontSize: 40, lineHeight: '48px', fontWeight: 600 },
  candidate: { fontSize: 26, lineHeight: '34px', fontWeight: 600 },
  keyLetters: { fontSize: 30, lineHeight: '32px', fontWeight: 700, letterSpacing: '0.04em' },
  keyDigit: { fontSize: 15, lineHeight: '16px', fontWeight: 500 },
  digits: { fontSize: 20, lineHeight: '28px', fontWeight: 500, letterSpacing: '0.06em' },
  label: { fontSize: 16, lineHeight: '20px', fontWeight: 600 },
} as const;
