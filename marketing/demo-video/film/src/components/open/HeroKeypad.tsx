/**
 * The app's keypad for the opening hero shots, built from the brand `Key` so it looks the same as
 * everywhere else, but with every key placed on its own: keys can cut in one by one, legends land
 * later, the 4th row rises in, and the moon panel can grow out of one key (its box is a prop, so it
 * keeps its lift shadow, which a clip-path would cut off).
 *
 * Coordinates are keypad-local px: (0, 0) is the panel's top-left corner, like keypadLayout().
 */
import React from 'react';
import { C } from '../../tokens';
import { Key, KEY_ROWS, keypadLayout, type KeyId } from '../brand/Keypad';

export type HeroKeyState = {
  /** 0..1 the key is there (cut it: 0 or 1; a fade only for the 4th row's arrival). */
  appear?: number;
  /** 0..1 digit and letters. */
  legend?: number;
  /** 0..1 ember fill (the ninth key). */
  lit?: number;
  /** 0..1 the pressed ring. */
  press?: number;
  /** 0..1 extra ring weight right after a press (so a second press on the same key shows). */
  hit?: number;
  /** Vertical offset in px (a rising arrival). */
  dy?: number;
};

export type Box = { l: number; t: number; r: number; b: number; radius: number };

/** Slot (top-left corner) of a key in keypad-local px. */
export const keySlot = (id: KeyId, size: number) => {
  const L = keypadLayout(size);
  const row = KEY_ROWS.findIndex((r) => r.includes(id));
  const col = KEY_ROWS[row]!.indexOf(id);
  return { x: L.pad + col * (size + L.gap), y: L.pad + row * (size + L.gap), row, col };
};

/** Box of one key in keypad-local px. */
export const keyBox = (id: KeyId, size: number): Box => {
  const s = keySlot(id, size);
  return { l: s.x, t: s.y, r: s.x + size, b: s.y + size, radius: 24 * (size / 96) };
};

/** Box of the panel behind the first `rows` rows (3 = the 3x3, the icon's shape; 4 = the whole keypad). */
export const panelBox = (size: number, rows = 4): Box => {
  const L = keypadLayout(size);
  return { l: 0, t: 0, r: L.width, b: L.pad * 2 + rows * size + (rows - 1) * L.gap, radius: 44 * (size / 96) };
};

export const mixBox = (a: Box, z: Box, p: number): Box => ({
  l: a.l + (z.l - a.l) * p,
  t: a.t + (z.t - a.t) * p,
  r: a.r + (z.r - a.r) * p,
  b: a.b + (z.b - a.b) * p,
  radius: a.radius + (z.radius - a.radius) * p,
});

export const HeroKeypad: React.FC<{
  size: number;
  keys: Partial<Record<KeyId, HeroKeyState>>;
  /** The moon panel's box, its colour and opacity; null = no panel yet. */
  panel: (Box & { color?: string; opacity?: number }) | null;
}> = ({ size, keys, panel }) => {
  const L = keypadLayout(size);
  const k = size / 96;
  return (
    <div style={{ position: 'relative', width: L.width, height: L.height }}>
      {panel && (panel.opacity ?? 1) > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: panel.l,
            top: panel.t,
            width: Math.max(0, panel.r - panel.l),
            height: Math.max(0, panel.b - panel.t),
            borderRadius: panel.radius,
            background: panel.color ?? C.panel,
            opacity: panel.opacity ?? 1,
            boxShadow: `0 ${16 * k}px ${40 * k}px rgba(8,4,20,0.55)`,
          }}
        />
      ) : null}
      {KEY_ROWS.flat().map((id) => {
        const st = keys[id];
        const appear = st?.appear ?? 0;
        if (appear <= 0) return null;
        const slot = keySlot(id, size);
        const hit = st?.hit ?? 0;
        const press = st?.press ?? 0;
        return (
          <div key={id} style={{ position: 'absolute', left: slot.x, top: slot.y + (st?.dy ?? 0) }}>
            <Key id={id} size={size} state={{ appear, legend: st?.legend ?? 0, lit: st?.lit ?? 0, press }} />
            {press > 0 && hit > 0 ? (
              // The moment of a press: the ring is heavier for a few frames, then settles (never grows back).
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 24 * k,
                  boxShadow: `inset 0 0 0 ${4 * k * (1 + hit)}px ${C.ember}`,
                  opacity: press,
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
