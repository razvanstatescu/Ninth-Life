/** Settings (contracts.md §4) with defaults and clamping. */

export type AccessMode = 'keyboard' | 'touch' | 'scan1' | 'scan2';
export type ThemeChoice = 'night' | 'day' | 'system';

export type Settings = {
  mode: 'letter' | 'initials';
  access: AccessMode;
  scanMs: number;
  scanLoops: number;
  acceptDelayMs: number;
  voiceURI?: string;
  rate: number;
  pitch: number;
  llm: boolean;
  theme: ThemeChoice;
  targetSize: 'l' | 'xl';
  lang: 'en';
};

export const SCAN_MS = { min: 400, max: 5000, step: 100, default: 1200 } as const;
export const SCAN_LOOPS = { min: 1, max: 10, default: 3 } as const;
export const ACCEPT_DELAY = { min: 0, max: 1000, step: 50, default: 150 } as const;
export const RATE = { min: 0.5, max: 2, step: 0.1, default: 1 } as const;
export const PITCH = { min: 0.5, max: 2, step: 0.1, default: 1 } as const;

export const DEFAULT_SETTINGS: Settings = Object.freeze({
  mode: 'letter',
  access: 'keyboard',
  scanMs: SCAN_MS.default,
  scanLoops: SCAN_LOOPS.default,
  acceptDelayMs: ACCEPT_DELAY.default,
  voiceURI: undefined,
  rate: RATE.default,
  pitch: PITCH.default,
  llm: false,
  theme: 'night',
  targetSize: 'l',
  lang: 'en',
}) as Settings;

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function oneOf<T extends string>(v: unknown, options: readonly T[], fallback: T): T {
  return typeof v === 'string' && (options as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Accept anything (stored data, form input) and return valid Settings. */
export function sanitizeSettings(input: unknown): Settings {
  const s = (input && typeof input === 'object' ? input : {}) as Partial<Record<keyof Settings, unknown>>;
  const d = DEFAULT_SETTINGS;
  return {
    mode: oneOf(s.mode, ['letter', 'initials'] as const, d.mode),
    access: oneOf(s.access, ['keyboard', 'touch', 'scan1', 'scan2'] as const, d.access),
    scanMs: Math.round(clamp(s.scanMs, SCAN_MS.min, SCAN_MS.max, d.scanMs)),
    scanLoops: Math.round(clamp(s.scanLoops, SCAN_LOOPS.min, SCAN_LOOPS.max, d.scanLoops)),
    acceptDelayMs: Math.round(clamp(s.acceptDelayMs, ACCEPT_DELAY.min, ACCEPT_DELAY.max, d.acceptDelayMs)),
    voiceURI: typeof s.voiceURI === 'string' && s.voiceURI ? s.voiceURI : undefined,
    rate: Math.round(clamp(s.rate, RATE.min, RATE.max, d.rate) * 10) / 10,
    pitch: Math.round(clamp(s.pitch, PITCH.min, PITCH.max, d.pitch) * 10) / 10,
    llm: s.llm === true,
    theme: oneOf(s.theme, ['night', 'day', 'system'] as const, d.theme),
    targetSize: oneOf(s.targetSize, ['l', 'xl'] as const, d.targetSize),
    lang: 'en',
  };
}

export function isScan(access: AccessMode): access is 'scan1' | 'scan2' {
  return access === 'scan1' || access === 'scan2';
}

/** "1.2 s" */
export function formatSeconds(ms: number): string {
  const s = ms / 1000;
  return `${Number.isInteger(s) ? s.toFixed(0) : s.toFixed(1)} s`;
}

/** Slower / Faster under the keypad: 200 ms steps, within the allowed range. */
export function stepScanMs(ms: number, dir: 1 | -1): number {
  return Math.min(SCAN_MS.max, Math.max(SCAN_MS.min, Math.round((ms + dir * 200) / 100) * 100));
}

/* The theme is mirrored to localStorage so the first paint already has the right colors. */
export const THEME_KEY = 'nl-theme';
export const KEYSIZE_KEY = 'nl-keysize';

export function applyLook(settings: Pick<Settings, 'theme' | 'targetSize'>, doc: Document = document): void {
  doc.documentElement.dataset.theme = settings.theme;
  doc.documentElement.dataset.keysize = settings.targetSize;
  try {
    localStorage.setItem(THEME_KEY, settings.theme);
    localStorage.setItem(KEYSIZE_KEY, settings.targetSize);
  } catch {
    /* private mode: the theme still applies for this visit */
  }
}

/** The look mirrored in localStorage (used until IndexedDB answers, or when it is unavailable). */
export function readStoredLook(): Partial<Pick<Settings, 'theme' | 'targetSize'>> {
  try {
    const theme = localStorage.getItem(THEME_KEY);
    const size = localStorage.getItem(KEYSIZE_KEY);
    return {
      ...(theme === 'night' || theme === 'day' || theme === 'system' ? { theme } : {}),
      ...(size === 'l' || size === 'xl' ? { targetSize: size } : {}),
    };
  } catch {
    return {};
  }
}

/** Inline script for <head>: sets data-theme before the first paint. */
export const THEME_BOOT_SCRIPT = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('${THEME_KEY}');if(t==='night'||t==='day'||t==='system')d.dataset.theme=t;var k=localStorage.getItem('${KEYSIZE_KEY}');if(k==='l'||k==='xl')d.dataset.keysize=k;}catch(e){}})();`;
