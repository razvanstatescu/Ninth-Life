/**
 * M1 review follow-ups: phone layout (F1, web-ui Req 15), switch access in sheets (F4, Req 16)
 * and quick phrases (F6, Req 17).
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunicationScreen } from '@/components/CommunicationScreen';
import type { DictState } from '@/lib/data';
import { miniDict } from './fixtures';
import { openSection } from './settings-section';

const QUICK = ['I love you.', 'Thank you.', 'I am hungry.', 'Why?', 'How are you?', 'Thanks.', 'Hello.', 'Water.', 'Yes.', 'Help.', 'No.', 'Sorry.', 'Good night.', 'Bye.'];
function dictWithPack(): DictState {
  return { ...miniDict(), pack: { id: 'core-en', lang: 'en', version: 1, words: [], phrases: QUICK } };
}

const KEYS: Record<string, string> = { '0': 'Digit0', '2': 'Digit2', '3': 'Digit3', '4': 'Digit4', '6': 'Digit6', '7': 'Digit7', '8': 'Digit8', '9': 'Digit9' };
function typeKeys(digits: string) {
  for (const d of digits) fireEvent.keyDown(window, { key: d, code: KEYS[d] });
}
/** A switch press: Space (2 switches: move) or Enter (choose). */
function sw(key: ' ' | 'Enter') {
  act(() => {
    fireEvent.keyDown(window, { key, code: key === ' ' ? 'Space' : 'Enter' });
    fireEvent.keyUp(window, { key, code: key === ' ' ? 'Space' : 'Enter' });
  });
}
const litRow = () => document.querySelector('[data-scan-state="row"]')?.getAttribute('data-scan-row') ?? null;
const litCell = () => document.querySelector('[data-scan-state="lit"]')?.textContent?.trim() ?? null;
/** Move the highlight (Space) until the sheet row `name` is lit. */
function moveToRow(name: string) {
  for (let i = 0; i < 40 && litRow() !== name; i++) sw(' ');
  expect(litRow()).toBe(name);
}
/** Inside an open row, move until the cell reading `text` is lit. */
function moveToCell(text: string) {
  for (let i = 0; i < 10 && litCell() !== text; i++) sw(' ');
  expect(litCell()).toBe(text);
}
const openSheet = (name: string) => document.querySelector(`dialog[data-overlay="${name}"][open]`);
/** Let the sheet scanner's MutationObserver re-read the rows after the sheet's content changed. */
const flushRows = () => act(async () => {});

beforeEach(() => {
  vi.spyOn(Date, 'now').mockImplementation(((t = 0) => () => (t += 1000))());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('phone layout (web-ui Req 15)', () => {
  it('Req 15.1: SpeakBar, then keypad, then sentences, then proof, in DOM (and focus) order', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="compact" />);
    const order = [...document.querySelectorAll('[data-section]')].map((el) => el.getAttribute('data-section'));
    expect(order).toEqual(['speak', 'pad', 'cands', 'proof', 'thread']);
  });

  it('Req 15.2 + 15.3 + 21.3 + 37.1: one status pill and a Menu that opens Phrases, My words, Voice and Settings', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="compact" />);
    const compact = document.querySelector('.app-header__actions.app-header--compact')!;
    expect(within(compact as HTMLElement).getAllByRole('button').map((b) => b.textContent)).toEqual(['Menu']);
    expect(document.querySelectorAll('.app-header__pills.app-header--compact .pill')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const menu = openSheet('menu') as HTMLElement;
    expect(menu).toBeTruthy();
    // Web-ui Req 28.4: the quick replies come first in every Menu; then the tiles, the rows and Status (Req 37.1).
    expect(within(menu).getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual([
      'Close', 'Hold on.', 'Yes.', 'No.', 'Pardon?', 'Thanks.', 'Phrases', 'Show a card', 'Conversation', 'They said', 'My words', 'Voice', 'Settings', 'Status: On device',
    ]);
    fireEvent.click(within(menu).getByRole('button', { name: 'Settings' }));
    expect(openSheet('menu')).toBeNull();
    expect(openSheet('settings')).toBeTruthy();
  });

  it('Req 15.4: 3 sentences on phones, More shows the rest, and a chosen 4th opens the list', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="compact" />);
    typeKeys('406333092837');
    const list = () => screen.getByRole('region', { name: 'Sentences for your keys' });
    expect(within(list()).getAllByRole('button', { pressed: false }).length + 1).toBe(3);
    fireEvent.click(screen.getByRole('button', { name: 'More sentences' }));
    expect(list().querySelectorAll('.nl-candidate')).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'Fewer sentences' }));
    expect(list().querySelectorAll('.nl-candidate')).toHaveLength(3);
    for (let i = 0; i < 3; i++) fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(list().querySelectorAll('.nl-candidate')).toHaveLength(5);
    expect(list().querySelector('.nl-candidate[aria-pressed="true"]')?.getAttribute('data-rank')).toBe('4');
  });

  it('Req 15.6 + 37.5: wide keeps every pill and Phrases, Voice, Settings, More in the header', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" />);
    const wide = document.querySelector('.app-header__actions.app-header--wide') as HTMLElement;
    expect(within(wide).getAllByRole('button').map((b) => b.textContent)).toEqual(['Phrases', 'Voice', 'Settings', 'More']);
    // Every state as its own pill (from 1366px; below that CSS shows the summary pill, Req 37.6).
    expect(document.querySelectorAll('.app-header__pills.app-header--wide .status-btn__line')).toHaveLength(2);
  });
});

describe('switch access everywhere (web-ui Req 16)', () => {
  it('Req 16.1 + 16.2 + 16.3: the header is a scan row; Settings scans its own rows, Close first, and scan speed changes by switch', async () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" initialSettings={{ access: 'scan2', acceptDelayMs: 0 }} />);
    // Keypad rows 0-3, the quick replies in the sentences' row (web-ui Req 28.6), actions, header: 7 moves.
    for (let i = 0; i < 7; i++) sw(' ');
    expect(document.querySelector('.app-header__actions.app-header--wide')!.classList.contains('is-scanning')).toBe(true);
    sw('Enter');
    sw(' '); // the status button is the row's first cell (web-ui Req 37.6)
    sw(' ');
    sw(' ');
    expect(screen.getByRole('button', { name: 'Settings' }).classList.contains('is-lit')).toBe(true);
    sw('Enter');
    expect(openSheet('settings')).toBeTruthy();
    expect(litRow()).toBe('close'); // the sheet starts scanning on its own, at Close
    // Settings opens on its groups (Req 38): pick Ways to type by switch.
    moveToRow('sections');
    sw('Enter');
    for (let i = 0; i < 10 && !litCell()?.startsWith('Ways to type'); i++) sw(' ');
    sw('Enter');
    await flushRows();

    moveToRow('Scan speed');
    sw('Enter');
    expect(litCell()).toBe('Faster');
    sw('Enter');
    const field = screen.getByText('Scan speed').closest('.field') as HTMLElement;
    expect(field.querySelector('output')?.textContent).toBe('1 s a step');
    expect(litRow()).toBe('close'); // after a choice the scan starts again at the first row
  });

  it('Req 16.4: scanning can be turned off and back on by switch alone before the sheet closes', async () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" initialSettings={{ access: 'scan2', acceptDelayMs: 0 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    openSection('Ways to type');
    await flushRows();
    expect(litRow()).toBe('close');
    moveToRow('access');
    sw('Enter');
    moveToCell('Keyboard');
    sw('Enter');
    // Plan F11 (Req 16.7): asked first; the question's row comes straight after Close.
    await flushRows();
    moveToRow('confirm-scan-off');
    sw('Enter');
    moveToCell('Turn off, use Keyboard');
    sw('Enter');
    await flushRows();
    expect((screen.getByRole('radio', { name: 'Keyboard' }) as HTMLInputElement).checked).toBe(true);
    // Still scanning inside the sheet: change your mind.
    moveToRow('access');
    sw('Enter');
    moveToCell('Two switches');
    sw('Enter');
    expect((screen.getByRole('radio', { name: 'Two switches' }) as HTMLInputElement).checked).toBe(true);
    // Close by switch.
    sw('Enter');
    sw('Enter');
    expect(openSheet('settings')).toBeNull();
    expect(screen.getByText('Step scanning with 2 switches')).toBeTruthy();
  });

  it('Req 16.4: choosing Touch by switch turns scanning off once the sheet closes', async () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" initialSettings={{ access: 'scan2', acceptDelayMs: 0 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    openSection('Ways to type');
    await flushRows();
    moveToRow('access');
    sw('Enter');
    moveToCell('Touch');
    sw('Enter');
    await flushRows();
    moveToRow('confirm-scan-off'); // plan F11 (Req 16.7)
    sw('Enter');
    moveToCell('Turn off, use Touch');
    sw('Enter');
    await flushRows();
    moveToRow('close');
    sw('Enter');
    sw('Enter');
    expect(openSheet('settings')).toBeNull();
    expect(screen.getByText('Switch scanning is off')).toBeTruthy();
  });

  it('Req 16.1 + 16.5 + 37.1: on phones the header row is Menu; the Menu sheet scans Close, then its rows; Voice opens Voice', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="compact" initialSettings={{ access: 'scan2', acceptDelayMs: 0 }} />);
    // Keypad rows 0-3, the quick replies (web-ui Req 28.6), actions, header.
    for (let i = 0; i < 7; i++) sw(' ');
    sw('Enter');
    expect(screen.getByRole('button', { name: 'Menu' }).classList.contains('is-lit')).toBe(true);
    sw('Enter');
    expect(openSheet('menu')).toBeTruthy();
    expect(litRow()).toBe('close');
    moveToRow('rows');
    sw('Enter');
    moveToCell('Voice');
    sw('Enter');
    expect(openSheet('voice')).toBeTruthy();
    expect(litRow()).toBe('close');
  });

  it('Req 16.6: while a sheet scans, Speak is not ember and no control in the sheet has focus', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" initialSettings={{ access: 'scan2', acceptDelayMs: 0 }} />);
    typeKeys('406333092837');
    const speak = () => document.querySelector('button[data-action="speak"]')!;
    expect(speak().classList.contains('nl-btn--primary')).toBe(true); // idle: Speak is the ember thing
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(speak().classList.contains('nl-btn--primary')).toBe(false);
    expect(document.activeElement?.tagName).not.toBe('BUTTON');
    expect(document.querySelectorAll('[data-scan-state]')).toHaveLength(1);
  });
});

describe('quick phrases (web-ui Req 17)', () => {
  it('Req 17.1 + 17.2: the Phrases sheet lists pack phrases next to saved ones; a tap speaks (or shows) it', async () => {
    render(<CommunicationScreen initialDict={dictWithPack()} layout="wide" />);
    fireEvent.click(screen.getByRole('button', { name: 'Phrases' }));
    const sheet = openSheet('phrases') as HTMLElement;
    expect(within(sheet).getByRole('heading', { name: 'Your phrases' })).toBeTruthy();
    const quick = within(sheet).getByRole('list', { name: 'Quick phrases' });
    expect(within(quick).getAllByRole('button')).toHaveLength(12);
    fireEvent.click(within(sheet).getByRole('button', { name: 'More quick phrases' }));
    expect(within(quick).getAllByRole('button')).toHaveLength(14);
    expect(within(sheet).queryByRole('button', { name: 'More quick phrases' })).toBeNull();
    await act(async () => {
      fireEvent.click(within(quick).getByRole('button', { name: 'Speak "I love you."' }));
    });
    // No voice in jsdom: the phrase goes to big-text show mode instead.
    expect(document.querySelector('dialog.show')!.textContent).toContain('I love you.');
  });

  it('Req 17.2: speaks a quick phrase with the voice when there is one', () => {
    const speak = vi.fn();
    class Utterance {
      text: string;
      onstart: unknown;
      onend: unknown;
      onerror: unknown;
      constructor(t: string) {
        this.text = t;
      }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
    const voice = { voiceURI: 'v1', name: 'Test', lang: 'en-US', localService: true, default: true };
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => [voice], addEventListener: vi.fn(), removeEventListener: vi.fn(), paused: false });
    render(<CommunicationScreen initialDict={dictWithPack()} layout="wide" />);
    fireEvent.click(screen.getByRole('button', { name: 'Phrases' }));
    fireEvent.click(screen.getByRole('button', { name: 'Speak "Thank you."' }));
    expect(speak).toHaveBeenCalled();
    expect((speak.mock.calls[0]![0] as Utterance).text).toBe('Thank you.');
  });

  it('Req 17.3: a switch picks a group of 4, then the phrase; show mode then scans its Done', async () => {
    render(<CommunicationScreen initialDict={dictWithPack()} layout="wide" initialSettings={{ access: 'scan2', acceptDelayMs: 0 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Phrases' }));
    moveToRow('quick-1');
    sw('Enter');
    moveToCell('Thanks.');
    await act(async () => sw('Enter'));
    expect(document.querySelector('dialog.show')!.textContent).toContain('Thanks.');
    expect(litRow()).toBe('done');
    sw('Enter');
    sw('Enter');
    expect(document.querySelector('dialog.show')!.hasAttribute('open')).toBe(false);
    expect(openSheet('phrases')).toBeTruthy();
    expect(litRow()).toBe('close');
  });
});
