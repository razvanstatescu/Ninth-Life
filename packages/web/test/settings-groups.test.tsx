// Settings in groups (web-ui Req 38): the phone list and drill-in, the two panes on larger screens.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsSheet, sectionValue } from '@/components/SettingsSheet';
import { DEFAULT_SETTINGS, type Settings } from '@/lib/settings';
import { collectScanRows } from '@/lib/useOverlayScan';
import type { VoicesState } from '@/lib/useVoices';
import { openSection } from './settings-section';

const VOICES: VoicesState = { supported: true, loaded: true, voices: [{ voiceURI: 'a', name: 'Ada', lang: 'en-GB', localService: true, default: true } as SpeechSynthesisVoice] };

/** Make (max-width: 599px) match, as on a phone. */
function asPhone(on: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: on && q.includes('max-width: 599px'),
    media: q,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
}
function renderSettings(props: Partial<Parameters<typeof SettingsSheet>[0]> = {}) {
  const onChange = vi.fn();
  const utils = render(
    <SettingsSheet open settings={{ ...DEFAULT_SETTINGS } as Settings} voices={VOICES} onChange={onChange} onTestVoice={() => undefined} onClose={() => undefined} {...props} />,
  );
  return { ...utils, onChange };
}
const dialog = () => document.querySelector<HTMLElement>('dialog[data-overlay="settings"]')!;
const rowNames = () => collectScanRows(dialog()).map((r) => r.row.getAttribute('data-scan-row'));

beforeEach(() => {
  vi.spyOn(Date, 'now').mockImplementation(((t = 0) => () => (t += 1000))());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('38.1 the groups and their values', () => {
  it('each row shows its current value', () => {
    const s = { ...DEFAULT_SETTINGS } as Settings;
    expect(sectionValue('voice', s, VOICES)).toBe('Ada');
    expect(sectionValue('look', { ...s, theme: 'day', targetSize: 'xl' }, VOICES)).toBe('Day, 128 px keys');
    expect(sectionValue('access', { ...s, access: 'scan2' }, VOICES)).toBe('Two switches');
    expect(sectionValue('replies', { ...s, quickReplies: false }, VOICES)).toBe('Off');
    expect(sectionValue('partner', { ...s, partnerStrip: 'facing' }, VOICES)).toBe('Facing them');
    expect(sectionValue('about', s, VOICES)).toBe('');
  });
});

describe('38.2 phones: the list, then one group', () => {
  it('opens on the list (one scan row after Close), a group drills in with All settings second, and back returns focus to its row', () => {
    asPhone(true);
    renderSettings();
    expect(rowNames()).toEqual(['close', 'sections']);
    expect(screen.queryByRole('radio')).toBeNull();
    expect(document.activeElement?.id).toBe('settings-nav-voice');
    act(() => openSection('Ways to type'));
    expect(rowNames().slice(0, 3)).toEqual(['close', 'back', 'access']);
    expect(screen.getByRole('button', { name: 'All settings' })).toBeTruthy();
    expect((document.activeElement as HTMLInputElement).name).toBe('access');
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'All settings' }));
    });
    expect(rowNames()).toEqual(['close', 'sections']);
    expect(document.activeElement?.id).toBe('settings-nav-access');
  });
});

describe('38.3 38.4 larger screens: two panes', () => {
  it('the list on the left with the chosen group marked, its settings on the right; reopening lands on the last group', () => {
    asPhone(false);
    const { unmount } = renderSettings();
    const nav = within(dialog()).getByRole('navigation', { name: 'Settings groups' });
    expect(nav.querySelector('[aria-current="true"] .menu-row__label')?.textContent).toBe('Voice');
    expect(rowNames()[1]).toBe('sections');
    openSection('Typing');
    expect(nav.querySelector('[aria-current="true"] .menu-row__label')?.textContent).toBe('Typing');
    expect(screen.getByRole('switch', { name: 'Finish words' })).toBeTruthy();
    unmount();
    renderSettings();
    expect(screen.getByRole('switch', { name: 'Finish words' })).toBeTruthy();
  });

  it('a caller can open a group, and focusVoice opens Voice on the picker', () => {
    asPhone(true);
    const { unmount } = renderSettings({ section: 'partner' });
    expect(screen.getAllByRole('radio').map((r) => r.closest('label')?.textContent)).toContain('Off');
    unmount();
    renderSettings({ focusVoice: true });
    expect(document.activeElement?.id).toBe('voice-picker');
  });

  it('38.5 while the scan-off question is asked, it is alone after Close', () => {
    asPhone(false);
    renderSettings({ settings: { ...DEFAULT_SETTINGS, access: 'scan2' } as Settings, scanning: true });
    openSection('Ways to type');
    fireEvent.click(screen.getByRole('radio', { name: 'Keyboard' }));
    expect(rowNames()).toEqual(['close', 'confirm-scan-off']);
  });
});
