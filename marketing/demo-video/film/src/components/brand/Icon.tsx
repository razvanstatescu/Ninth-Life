/**
 * The app's own icons (packages/web/components/Icon.tsx): 24px grid, 2.5px round stroke.
 */
import React from 'react';

const PATHS = {
  speaker: ['M4 9v6h4l5 4V5L8 9H4z', 'M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12'],
  voice: ['M4 9v6h4l5 4V5L8 9H4z', 'M16.5 8.5a5 5 0 0 1 0 7'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  plus: ['M12 5v14M5 12h14'],
  x: ['M6 6l12 12M18 6L6 18'],
  back: ['M15 5l-7 7 7 7'],
  space: ['M4 10v4h16v-4'],
  gear: ['M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1'],
  switch: ['M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 1 0 0-15z'],
  offline: [
    'M3 3l18 18',
    'M8.5 16.5a5 5 0 0 1 7 0',
    'M5 13a10 10 0 0 1 5-2.7M14 10.4A10 10 0 0 1 19 13',
    'M2 9.5a15 15 0 0 1 4.6-2.8M11 5.6A15 15 0 0 1 22 9.5',
    'M12 20h.01',
  ],
  show: ['M3 6.5h18v11H3z', 'M7 10.5h10M7 13.5h6'],
  menu: ['M4 7h16M4 12h16M4 17h16'],
  keyboard: ['M3 7h18v10H3z', 'M7 10.5h.01M11 10.5h.01M15 10.5h.01M8 14h8'],
  touch: ['M9 11V5.5a1.5 1.5 0 0 1 3 0V11', 'M12 10.5v-1a1.5 1.5 0 0 1 3 0v1.5', 'M15 11a1.5 1.5 0 0 1 3 0v3.5a5.5 5.5 0 0 1-5.5 5.5h-1a5 5 0 0 1-4-2l-2.8-3.6a1.5 1.5 0 0 1 2.3-1.9L9 13'],
  lock: ['M6 11h12v9H6z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'],
} as const;

export type IconName = keyof typeof PATHS;

export const Icon: React.FC<{ name: IconName; size?: number; color?: string; stroke?: number; style?: React.CSSProperties }> = ({
  name,
  size = 24,
  color = 'currentColor',
  stroke = 2.5,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flex: 'none', display: 'block', ...style }}
    aria-hidden
  >
    {PATHS[name].map((d) => (
      <path key={d} d={d} />
    ))}
    {name === 'gear' || name === 'switch' ? <circle cx="12" cy="12" r="3" /> : null}
  </svg>
);
