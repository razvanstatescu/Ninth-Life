/**
 * Recreated phone screens (390 x 700 CSS px, the capture viewport), used ONLY when a real capture is
 * missing (see captures.ts). Laid out from the boxes measured on the real app (phone-hello in
 * src/data/captures.json) and its own words (packages/web/components: SettingsSheet, ShowMode).
 * Pure: all state comes from props.
 */
import React from 'react';
import { C, FONT, SHADOW } from '../../tokens';
import { Icon } from '../brand/Icon';
import { KEY_ROWS, type KeyId } from '../brand/Keypad';
import decoded from '../../data/decoded.json';
import type { Box } from './captures';

export const PHONE_VIEWPORT: [number, number] = [390, 700];

const LEGENDS: Record<string, { digit: string; letters: string }> = Object.fromEntries(
  decoded.keypad.keys.map((k) => [k.id, { digit: k.digit, letters: k.letters }]),
);

// ---- layout (CSS px), from the real app -----------------------------------------------------------

const KEY_X = [18, 138.7, 259.3];
const KEY_Y = [284, 368.7, 453, 537.7];
const KEY_W = 112.7;
const KEY_H = 76.5;

export const MAIN_BOXES: Record<string, Box> = {
  header: [12, 8, 366, 56],
  brand: [12, 14, 44, 44],
  status: [64, 18, 97, 36],
  'they-said': [322, 8, 56, 56],
  sentence: [12, 72, 366, 134],
  'sentence-text': [28, 78, 280, 52],
  'sentence-digits': [28, 178, 200, 20],
  clear: [314, 80, 56, 56],
  candidates: [6, 208, 378, 68],
  keypad: [12, 278, 366, 342],
  menu: [12, 628, 104, 64],
  speak: [124, 628, 143.3, 64],
  show: [275.3, 628, 102.7, 64],
  ...Object.fromEntries(
    KEY_ROWS.flatMap((row, r) => row.map((id, c) => [`key-${id}`, [KEY_X[c]!, KEY_Y[r]!, KEY_W, KEY_H] as Box])),
  ),
};

/** The ringed row's box (the row's three keys). */
const rowBox = (r: number): Box => [KEY_X[0]!, KEY_Y[r]!, KEY_X[2]! + KEY_W - KEY_X[0]!, KEY_H];

// ---- small shared pieces ---------------------------------------------------------------------------

const abs = (b: Box): React.CSSProperties => ({ position: 'absolute', left: b[0], top: b[1], width: b[2], height: b[3], boxSizing: 'border-box' });

const SCAN_RING = `0 0 0 6px ${C.ember}, 0 0 0 9px ${C.plum}`;

/** The header's small brand mark: the moon bubble with its ember key. */
const BrandMark: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 44 44" style={{ display: 'block' }}>
    <polygon points="7,12 8,3 16,10" fill={C.moon} />
    <polygon points="37,12 36,3 28,10" fill={C.moon} />
    <polygon points="11,34 10,41 18,35" fill={C.moon} />
    <rect x="4" y="9" width="36" height="27" rx="8" fill={C.moon} />
    <rect x="16" y="17" width="12" height="12" rx="3" fill={C.ember} />
  </svg>
);

const Pill: React.FC<{ box: Box; label: string }> = ({ box, label }) => (
  <div
    style={{
      ...abs(box),
      borderRadius: 999,
      border: `2px solid ${C.lineStrong}`,
      display: 'grid',
      placeItems: 'center',
      fontFamily: FONT.sans,
      fontSize: 17,
      fontWeight: 700,
      color: C.ink,
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </div>
);

const SecondaryButton: React.FC<{ box: Box; label: string; icon?: React.ReactNode; size?: number; lit?: boolean }> = ({ box, label, icon, size = 21, lit }) => (
  <div
    style={{
      ...abs(box),
      borderRadius: 22,
      background: C.surfaceSunken,
      color: C.ink,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      fontFamily: FONT.sans,
      fontSize: size,
      fontWeight: 700,
      whiteSpace: 'nowrap',
      boxShadow: lit ? SCAN_RING : undefined,
    }}
  >
    {icon}
    {label}
  </div>
);

// ---- the main screen ----------------------------------------------------------------------------------

export type MainState = {
  text: string;
  digits: string;
  /** Keypad row 0-3 with the scanning ring, or null. */
  scanRow?: number | null;
  /** The lit key while scanning along a row. */
  scanKey?: KeyId | null;
  /** Second header pill (switch scanning), e.g. "Scanning". */
  scanPill?: string;
  /** Speak is quiet while scanning (the highlight is the one ember thing). */
  speakQuiet?: boolean;
};

export const PhoneMain: React.FC<MainState> = ({ text, digits, scanRow = null, scanKey = null, scanPill, speakQuiet }) => (
  <div style={{ position: 'relative', width: 390, height: 700, background: C.ground, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', left: 12, top: 14 }}>
      <BrandMark size={44} />
    </div>
    <Pill box={MAIN_BOXES.status!} label="On device" />
    {scanPill ? <Pill box={[169, 18, 104, 36]} label={scanPill} /> : null}
    <div style={{ ...abs(MAIN_BOXES['they-said']!), borderRadius: 22, border: `2px solid ${C.lineStrong}`, display: 'grid', placeItems: 'center' }}>
      <Icon name="show" size={24} color={C.ink} />
    </div>

    <div style={{ ...abs(MAIN_BOXES.sentence!), borderRadius: 26, background: C.surfaceSunken }} />
    <div style={{ position: 'absolute', left: 28, top: 78, fontFamily: FONT.sans, fontSize: 40, lineHeight: '52px', fontWeight: 600, color: C.ink, whiteSpace: 'nowrap' }}>
      {text}
    </div>
    <div style={{ position: 'absolute', left: 28, top: 178, fontFamily: FONT.mono, fontSize: 20, lineHeight: '20px', fontWeight: 500, letterSpacing: '0.06em', color: C.inkMuted, whiteSpace: 'pre' }}>
      {digits.split(' ').join('  ')}
    </div>
    <div style={{ ...abs(MAIN_BOXES.clear!), borderRadius: 22, border: `2px solid ${C.lineStrong}`, display: 'grid', placeItems: 'center' }}>
      <Icon name="x" size={24} color={C.ink} />
    </div>

    <div style={{ ...abs([12, 214, 279.7, 56]), borderRadius: 18, border: `2px solid ${C.line}`, background: C.surface }} />
    <div style={{ ...abs([299.7, 214, 78.3, 56]), borderRadius: 22, border: `2px solid ${C.lineStrong}`, display: 'grid', placeItems: 'center', fontFamily: FONT.sans, fontSize: 19, fontWeight: 700, color: C.ink }}>
      More
    </div>

    <div style={{ ...abs(MAIN_BOXES.keypad!), borderRadius: 30, background: C.panel }} />
    {scanRow !== null && scanRow !== undefined ? <div style={{ ...abs(rowBox(scanRow)), borderRadius: 27, boxShadow: SCAN_RING }} /> : null}
    {KEY_ROWS.map((row, r) =>
      row.map((id, c) => {
        const lit = scanKey === id;
        const { digit, letters } = LEGENDS[id]!;
        const word = letters.length > 4;
        return (
          <div
            key={id}
            style={{
              ...abs([KEY_X[c]!, KEY_Y[r]!, KEY_W, KEY_H]),
              borderRadius: 26,
              background: lit ? C.ember : C.key,
              color: lit ? C.onEmber : C.onKey,
              boxShadow: lit ? `inset 0 0 0 3px ${C.plum}, ${SHADOW.glowEmber}` : undefined,
            }}
          >
            <div style={{ position: 'absolute', left: 12, top: 7, fontFamily: FONT.mono, fontSize: 16, fontWeight: 500 }}>{digit}</div>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                paddingTop: 6,
                fontFamily: FONT.sans,
                fontSize: word ? 22 : id === '1' ? 22 : 30,
                fontWeight: 700,
                letterSpacing: word ? 0 : '0.03em',
              }}
            >
              {letters}
            </div>
          </div>
        );
      }),
    )}

    <SecondaryButton box={MAIN_BOXES.menu!} label="Menu" icon={<Icon name="menu" size={24} color={C.ink} />} />
    {speakQuiet ? (
      <SecondaryButton box={MAIN_BOXES.speak!} label="Speak" size={24} icon={<Icon name="speaker" size={26} color={C.ink} />} />
    ) : (
      <div
        style={{
          ...abs(MAIN_BOXES.speak!),
          borderRadius: 22,
          background: C.ember,
          color: C.onEmber,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontFamily: FONT.sans,
          fontSize: 24,
          fontWeight: 800,
        }}
      >
        <Icon name="speaker" size={26} color={C.onEmber} />
        Speak
      </div>
    )}
    <SecondaryButton box={MAIN_BOXES.show!} label="Show" icon={<Icon name="show" size={24} color={C.ink} />} />
  </div>
);

// ---- the Settings sheet at "Ways to type" -------------------------------------------------------------

export const SETTINGS_BOXES: Record<string, Box> = {
  sheet: [0, 0, 390, 700],
  'sheet-title': [16, 22, 90, 30],
  close: [290, 16, 84, 44],
  'ways-to-type-title': [16, 96, 140, 28],
  'one-switch': [16, 196, 173, 48],
  'scan-speed': [16, 316, 358, 176],
  'scan-speed-label': [16, 316, 110, 24],
  'scan-speed-value': [250, 316, 124, 24],
  'scan-speed-faster': [16, 432, 92, 48],
  'scan-speed-slider': [120, 432, 150, 48],
  'scan-speed-slower': [282, 432, 92, 48],
};

const SCAN_MS = { min: 400, max: 5000 };
const formatSeconds = (ms: number) => {
  const s = ms / 1000;
  return Number.isInteger(s) ? `${s}` : s.toFixed(1);
};

export const PhoneSettings: React.FC<{ scanMs: number }> = ({ scanMs }) => {
  const t = (scanMs - SCAN_MS.min) / (SCAN_MS.max - SCAN_MS.min);
  const seg = (box: Box, label: string, on: boolean) => (
    <div
      style={{
        ...abs(box),
        borderRadius: 16,
        border: `2px solid ${on ? C.moon : C.lineStrong}`,
        background: on ? C.moon : 'transparent',
        color: on ? C.onEmber : C.ink,
        display: 'grid',
        placeItems: 'center',
        fontFamily: FONT.sans,
        fontSize: 18,
        fontWeight: 700,
      }}
    >
      {label}
    </div>
  );
  const btn = (box: Box, label: string) => (
    <div style={{ ...abs(box), borderRadius: 16, border: `2px solid ${C.lineStrong}`, display: 'grid', placeItems: 'center', fontFamily: FONT.sans, fontSize: 18, fontWeight: 700, color: C.ink }}>
      {label}
    </div>
  );
  return (
    <div style={{ position: 'relative', width: 390, height: 700, background: C.surface, overflow: 'hidden', fontFamily: FONT.sans, color: C.ink }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 76, borderBottom: `2px solid ${C.line}`, boxSizing: 'border-box' }} />
      <div style={{ position: 'absolute', left: 16, top: 22, fontSize: 24, fontWeight: 700 }}>Settings</div>
      {btn(SETTINGS_BOXES.close!, 'Close')}
      <div style={{ position: 'absolute', left: 16, top: 96, fontSize: 22, fontWeight: 700 }}>Ways to type</div>
      {seg([16, 140, 173, 48], 'Keyboard', false)}
      {seg([201, 140, 173, 48], 'Touch', false)}
      {seg(SETTINGS_BOXES['one-switch']!, 'One switch', true)}
      {seg([201, 196, 173, 48], 'Two switches', false)}
      <div style={{ position: 'absolute', left: 16, top: 256, width: 358, fontSize: 15, lineHeight: '21px', color: C.inkMuted }}>
        One switch scans on its own; press to choose. Two switches: Space moves, Enter chooses.
      </div>
      <div style={{ position: 'absolute', left: 16, top: 316, fontSize: 18, fontWeight: 700 }}>Scan speed</div>
      <div style={{ position: 'absolute', right: 16, top: 316, fontSize: 18, fontWeight: 700 }}>{formatSeconds(scanMs)} s a step</div>
      <div style={{ position: 'absolute', left: 16, top: 350, width: 358, fontSize: 15, lineHeight: '21px', color: C.inkMuted }}>
        How long the highlight stays on each row or key. There is no time limit to finish a sentence.
      </div>
      {btn(SETTINGS_BOXES['scan-speed-faster']!, 'Faster')}
      <div style={{ position: 'absolute', left: 120, top: 454, width: 150, height: 4, borderRadius: 2, background: C.line }} />
      <div style={{ position: 'absolute', left: 120, top: 454, width: 150 * t, height: 4, borderRadius: 2, background: C.lineStrong }} />
      <div style={{ position: 'absolute', left: 120 + 150 * t - 12, top: 444, width: 24, height: 24, borderRadius: 12, background: C.moon }} />
      {btn(SETTINGS_BOXES['scan-speed-slower']!, 'Slower')}
    </div>
  );
};

// ---- Show mode -------------------------------------------------------------------------------------------

export const SHOW_BOXES: Record<string, Box> = {
  'show-screen': [0, 0, 390, 700],
  'show-message': [32, 214, 326, 166],
  'show-label': [32, 214, 230, 20],
  'show-text': [32, 266, 300, 114],
  'show-done': [32, 412, 118, 64],
  'show-flip': [162, 412, 112, 64],
};

/** A small "turn around" mark for the Flip button. */
const FlipMark: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
    <path d="M7 4v6h6" />
    <path d="M7 10a7 7 0 1 1 1.5 7.5" />
  </svg>
);

export const PhoneShow: React.FC<{ text: string; flipped: boolean }> = ({ text, flipped }) => (
  <div style={{ position: 'relative', width: 390, height: 700, background: C.ground, overflow: 'hidden', fontFamily: FONT.sans, color: C.ink }}>
    <div
      style={{
        ...abs(SHOW_BOXES['show-message']!),
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        transform: flipped ? 'rotate(180deg)' : undefined,
      }}
    >
      <div style={{ fontSize: 16, lineHeight: '20px', fontWeight: 600, color: C.inkMuted }}>Show this to the other person</div>
      <div style={{ fontSize: 48, lineHeight: 1.1, fontWeight: 700 }}>{text}</div>
    </div>
    <SecondaryButton box={SHOW_BOXES['show-done']!} label="Done" size={22} />
    <SecondaryButton box={SHOW_BOXES['show-flip']!} label="Flip" size={22} icon={<FlipMark size={24} />} />
  </div>
);
