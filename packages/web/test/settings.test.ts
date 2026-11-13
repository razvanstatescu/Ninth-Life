import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, THEME_BOOT_SCRIPT, applyLook, formatSeconds, readStoredLook, sanitizeSettings, stepScanMs } from '@/lib/settings';

describe('settings', () => {
  it('defaults: ghost mode, model ranking off, 1.2 s scan, night', () => {
    expect(DEFAULT_SETTINGS.llm).toBe(false);
    expect(DEFAULT_SETTINGS.scanMs).toBe(1200);
    expect(DEFAULT_SETTINGS.theme).toBe('night');
    expect(DEFAULT_SETTINGS.targetSize).toBe('l');
  });

  it('clamps and repairs stored values', () => {
    const s = sanitizeSettings({ scanMs: 50, scanLoops: 99, acceptDelayMs: -5, rate: 9, theme: 'pink', access: 'scan2', llm: 'yes' });
    expect(s.scanMs).toBe(400);
    expect(s.scanLoops).toBe(10);
    expect(s.acceptDelayMs).toBe(0);
    expect(s.rate).toBe(2);
    expect(s.theme).toBe('night');
    expect(s.access).toBe('scan2');
    expect(s.llm).toBe(false);
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ scanMs: 9000 }).scanMs).toBe(5000);
  });

  it('formats and steps scan speed inside 0.4 to 5 s', () => {
    expect(formatSeconds(1200)).toBe('1.2 s');
    expect(formatSeconds(2000)).toBe('2 s');
    expect(stepScanMs(1200, 1)).toBe(1400);
    expect(stepScanMs(400, -1)).toBe(400);
    expect(stepScanMs(5000, 1)).toBe(5000);
  });
});

/** Run the head script against a fake page: the theme it leaves on <html>, starting from the layout's "night". */
function bootTheme(path: string, stored: Record<string, string> | 'blocked'): string | undefined {
  const html = { dataset: { theme: 'night', keysize: 'l' } as Record<string, string> };
  const storage = {
    getItem: (k: string) => {
      if (stored === 'blocked') throw new Error('SecurityError');
      return stored[k] ?? null;
    },
  };
  new Function('document', 'localStorage', 'location', THEME_BOOT_SCRIPT)({ documentElement: html }, storage, { pathname: path });
  return html.dataset.theme;
}

describe('THEME_BOOT_SCRIPT (ADR-006 amendment 2026-11-12, W2)', () => {
  it('a stored theme wins on every page', () => {
    for (const path of ['/', '/about', '/app']) {
      expect(bootTheme(path, { 'nl-theme': 'day' })).toBe('day');
      expect(bootTheme(path, { 'nl-theme': 'night' })).toBe('night');
    }
  });

  it('with nothing stored, the website follows the device and the app keeps Night', () => {
    expect(bootTheme('/', {})).toBe('system');
    expect(bootTheme('/about', {})).toBe('system');
    expect(bootTheme('/app', {})).toBe('night');
    expect(bootTheme('/app/', {})).toBe('night');
    expect(bootTheme('/apple', {})).toBe('system');
    expect(bootTheme('/', { 'nl-theme': 'pink' })).toBe('system');
    expect(bootTheme('/', 'blocked')).toBe('system');
    expect(bootTheme('/app', 'blocked')).toBe('night');
  });
});

describe('applyLook mirrors only a chosen theme (W2 holds after a visit to /app)', () => {
  /** A fresh <html>-like element per call, so the document's own theme is never touched. */
  const fakeDoc = () => ({ documentElement: { dataset: {} as Record<string, string> } }) as unknown as Document;
  beforeEach(() => localStorage.clear());

  it('the untouched default (Night) applies to the page but is not stored, so the website keeps following the device', () => {
    const doc = fakeDoc();
    applyLook({ theme: 'night', targetSize: 'l' }, doc);
    expect(doc.documentElement.dataset.theme).toBe('night'); // /app still shows Night
    expect(localStorage.getItem('nl-theme')).toBeNull();
    expect(localStorage.getItem('nl-keysize')).toBe('l');
    expect(bootTheme('/', {})).toBe('system');
    expect(bootTheme('/app', {})).toBe('night');
  });

  it('a chosen theme is stored and wins on every page, including a later switch back to Night', () => {
    applyLook({ theme: 'day', targetSize: 'l' }, fakeDoc());
    expect(localStorage.getItem('nl-theme')).toBe('day');
    for (const path of ['/', '/about', '/app']) expect(bootTheme(path, { 'nl-theme': 'day' })).toBe('day');
    applyLook({ theme: 'night', targetSize: 'xl' }, fakeDoc());
    expect(localStorage.getItem('nl-theme')).toBe('night');
    expect(readStoredLook()).toEqual({ theme: 'night', targetSize: 'xl' });
    applyLook({ theme: 'system', targetSize: 'l' }, fakeDoc());
    expect(localStorage.getItem('nl-theme')).toBe('system');
  });

  it('reloading the app with the default never creates a stored theme', () => {
    for (let i = 0; i < 3; i++) applyLook({ ...DEFAULT_SETTINGS }, fakeDoc());
    expect(localStorage.getItem('nl-theme')).toBeNull();
  });
});
