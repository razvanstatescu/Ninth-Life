// Menu, Voice, More and Status (web-ui Req 37). Sizes and placement in a browser: test/e2e/surfaces.mjs.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunicationScreen } from '@/components/CommunicationScreen';
import { NOT_A_MEDICAL_DEVICE } from '@/components/Footer';
import { statusExplained } from '@/components/StatusSheet';
import { statusLines } from '@/lib/status';
import { SCAN_CELL_SELECTOR, collectScanRows } from '@/lib/useOverlayScan';
import { miniDict } from './fixtures';
import { openSection } from './settings-section';

beforeEach(() => {
  vi.spyOn(Date, 'now').mockImplementation(((t = 0) => () => (t += 1000))());
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const KEY4 = '4 GHI, G H I';
const open = (name: string) => document.querySelector<HTMLElement>(`dialog[data-overlay="${name}"][open]`);
const press = (name: string | RegExp, within_?: HTMLElement) => fireEvent.click((within_ ? within(within_) : screen).getByRole('button', { name }));
const rows = (d: HTMLElement) => collectScanRows(d).map((r) => [r.row.getAttribute('data-scan-row'), r.cells.map((c) => c.getAttribute('aria-label') ?? c.textContent?.trim())]);

describe('37.1 the Menu', () => {
  it('blocks top to bottom, each its scan row: replies, tiles, This sentence pairs, rows, Status and About', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    fireEvent.click(screen.getByRole('button', { name: KEY4 }));
    press('Menu');
    const menu = open('menu')!;
    expect(rows(menu)).toEqual([
      ['close', ['Close']],
      ['quick-replies', ['Hold on.', 'Yes.', 'No.', 'Pardon?', 'Thanks.']],
      ['tiles', ['Phrases', 'Show a card', 'Conversation', 'They said']],
      ['sentence', ['Fix a word', 'Spell this word']],
      ['sentence-2', ['Save phrase', 'Check the words']],
      ['rows', ['My words', 'Voice', 'Settings']],
      ['status', ['Status: On device', 'About Ninth Life (opens in a new tab)']],
    ]);
    // The About link opens the website in a new tab.
    expect(within(menu).getByRole('link', { name: 'About Ninth Life (opens in a new tab)' }).getAttribute('target')).toBe('_blank');
  });

  it('with nothing typed there is no This sentence block', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    press('Menu');
    expect(open('menu')!.querySelector('[data-scan-row^="sentence"]')).toBeNull();
  });

  it('37.2 opens on Phrases; Back to Menu returns to the item the surface came from', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    press('Menu');
    expect(document.activeElement?.textContent).toBe('Phrases');
    press('Settings', open('menu')!);
    expect(open('settings')).not.toBeNull();
    press('Back to Menu');
    expect(open('menu')).not.toBeNull();
    expect(document.activeElement?.id).toBe('menu-item-settings');
  });

  it('37.3 a link is a scan cell', () => {
    const d = document.createElement('div');
    d.innerHTML = '<div data-scan-row="x"><a href="/about">About</a><button type="button">B</button></div>';
    expect(collectScanRows(d)[0]!.cells.map((c) => c.textContent)).toEqual(['About', 'B']);
    expect(SCAN_CELL_SELECTOR).toContain('a[href]');
  });

  it('37.1 Settings > About holds the intended-purpose sentence and the website links', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    press('Menu');
    press('Settings', open('menu')!);
    openSection('About');
    const s = open('settings')!;
    expect(s.textContent).toContain('not a medical device');
    expect(within(s).getByRole('link', { name: 'How Ninth Life works (opens in a new tab)' })).toBeTruthy();
  });
});

describe('37.4 Voice', () => {
  it('Menu > Voice opens its own short surface with the picker focused, not Settings', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    press('Menu');
    press('Voice', open('menu')!);
    const v = open('voice');
    expect(v?.getAttribute('data-kind')).toBe('fit');
    expect(open('settings')).toBeNull();
    expect(within(v!).getByRole('button', { name: 'Test voice' })).toBeTruthy();
    expect(within(v!).getByText('Speed')).toBeTruthy();
  });

  it('the laptop header Voice opens Voice too', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" />);
    press('Voice');
    expect(open('voice')).not.toBeNull();
  });
});

describe('37.5 37.6 the laptop header: More and the status button', () => {
  it('More holds My words, Show a card, Conversation, Check the words, then Keyboard shortcuts, Status and the website; a choice has Back to More', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" />);
    press('More');
    const more = open('more')!;
    expect(rows(more).slice(1)).toEqual([
      ['more', ['My words', 'Show a card', 'Conversation', 'Check the words']],
      ['more-2', ['Keyboard shortcuts', 'Status']],
      ['more-3', ['About Ninth Life (opens in a new tab)', 'How Ninth Life works (opens in a new tab)']],
    ]);
    // The intended-purpose sentence that was the laptop footer (web-ui Req 40.8).
    expect(more.textContent).toContain(NOT_A_MEDICAL_DEVICE);
    press('Check the words', more);
    expect(open('proof')).not.toBeNull();
    press('Back to More');
    expect(open('more')).not.toBeNull();
    expect(document.activeElement?.id).toBe('menu-item-proof');
  });

  it('the status is a button named with the full status, and it opens Status', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" />);
    const btn = document.querySelector<HTMLButtonElement>('.status-btn.app-header--wide')!;
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.textContent).toMatch(/^Status: Offline dictionary ready/);
    fireEvent.click(btn);
    const s = open('status')!;
    expect(s.textContent).toContain('Offline dictionary ready');
    expect(s.textContent).toContain(statusExplained('Offline dictionary ready'));
  });

  it('the wide header scan row is status, Phrases, Voice, Settings, More', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" initialSettings={{ access: 'scan2', acceptDelayMs: 0 }} />);
    const sw = (key: ' ' | 'Enter') => {
      fireEvent.keyDown(window, { key, code: key === ' ' ? 'Space' : 'Enter' });
      fireEvent.keyUp(window, { key, code: key === ' ' ? 'Space' : 'Enter' });
    };
    for (let i = 0; i < 7; i++) sw(' ');
    sw('Enter');
    expect(document.querySelector('.status-btn.app-header--wide')!.classList.contains('is-lit')).toBe(true);
    for (let i = 0; i < 4; i++) sw(' ');
    expect(screen.getByRole('button', { name: 'More' }).classList.contains('is-lit')).toBe(true);
    sw('Enter');
    expect(open('more')).not.toBeNull();
  });

  it('every status line has an explanation', () => {
    for (const dict of ['ready', 'loading', 'missing'] as const)
      for (const online of [true, false]) for (const llm of [true, false]) for (const l of statusLines(dict, online, llm)) expect(statusExplained(l.text), l.text).not.toBe('');
  });
});
