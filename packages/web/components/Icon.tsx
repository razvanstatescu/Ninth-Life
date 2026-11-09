/** Inline SVG icons: 24px grid, 2.5px round stroke in currentColor (brand book, Iconography). */

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
  save: ['M6 4h12v16l-6-4-6 4z'],
  menu: ['M4 7h16M4 12h16M4 17h16'],
  show: ['M3 6h18v12H3z', 'M7 10h10M7 14h6'],
  /** Two arrows turning: flip the show-mode text for the person opposite. */
  flip: ['M5 10a7 7 0 0 1 12.5-3.5', 'M18 3v4h-4', 'M19 14a7 7 0 0 1-12.5 3.5', 'M6 21v-4h4'],
  /** A letter over a line: spell a word, my words. */
  spell: ['M4 17l5-12 5 12', 'M6 12.5h6', 'M15 20h6'],
  offline: ['M3 3l18 18', 'M8.5 16.5a5 5 0 0 1 7 0', 'M5 13a10 10 0 0 1 5-2.7M14 10.4A10 10 0 0 1 19 13', 'M2 9.5a15 15 0 0 1 4.6-2.8M11 5.6A15 15 0 0 1 22 9.5', 'M12 20h.01'],
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, label, className }: { name: IconName; label?: string; className?: string }) {
  const extra = name === 'gear' ? <circle cx="12" cy="12" r="3" /> : name === 'switch' ? <circle cx="12" cy="12" r="3" /> : null;
  return (
    <svg
      className={className ? `nl-icon ${className}` : 'nl-icon'}
      viewBox="0 0 24 24"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
    >
      {extra}
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
