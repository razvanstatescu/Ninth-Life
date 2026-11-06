import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, formatSeconds, sanitizeSettings, stepScanMs } from '@/lib/settings';

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
