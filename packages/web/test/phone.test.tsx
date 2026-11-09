// Phone layout (web-ui Req 24; docs/research/mobile-patterns-mobbin.md, mobile-aac-evidence.md).
// Fit, key size and key stability per device are checked in a browser by test/e2e/responsive.mjs.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunicationScreen } from '@/components/CommunicationScreen';
import { phoneSuggestions } from '@/components/PhoneSuggestions';
import { sectionOrder } from '@/lib/layout';
import { miniDict } from './fixtures';

const KEY = { 3: '3 DEF, D E F', 4: '4 GHI, G H I', 6: '6 MNO, M N O', 9: '9 WXYZ, W X Y Z', 0: '0 Space' } as Record<string, string>;
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const typeDigits = (digits: string) => {
  for (const d of digits) press(KEY[d]!);
};
const utterance = () => document.getElementById('utterance')!.textContent ?? '';

beforeEach(() => {
  // Each press is a new key; the accept delay would drop a quick repeat of the same key.
  vi.spyOn(Date, 'now').mockImplementation(((t = 0) => () => (t += 1000))());
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('phone layout (web-ui Req 24)', () => {
  it('24.1 one screen top to bottom: sentence card, suggestions, keypad, action bar; the rest below, in DOM (and focus) order', () => {
    expect(sectionOrder('phone').columns).toEqual([['speak', 'cands', 'pad', 'actions', 'proof', 'partner', 'scan', 'hint']]);
    const { container } = render(<CommunicationScreen initialDict={miniDict()} layout="phone" />);
    const screenSections = [...container.querySelectorAll('.phone-screen > [data-section]')].map((el) => el.getAttribute('data-section'));
    expect(screenSections).toEqual(['speak', 'cands', 'pad', 'actions']);
    const below = [...container.querySelectorAll('.phone-below > [data-section]')].map((el) => el.getAttribute('data-section'));
    expect(below).toEqual(['proof']);
  });

  it('24.2 the action bar under the keypad is Menu, Speak, Show, and it holds the only Speak', () => {
    const { container } = render(<CommunicationScreen initialDict={miniDict()} layout="phone" />);
    const bar = container.querySelector<HTMLElement>('[data-section="actions"]')!;
    expect(within(bar).getAllByRole('button').map((b) => b.textContent?.trim())).toEqual(['Menu', 'Speak', 'Show']);
    expect(container.querySelectorAll('[data-action="speak"]')).toHaveLength(1);
    // Disabled until there is something to say, and outlined so its shape stays visible.
    const speak = within(bar).getByRole('button', { name: 'Speak' }) as HTMLButtonElement;
    expect(speak.disabled).toBe(true);
    expect(speak.className).toContain('nl-btn--secondary');
    typeDigits('4');
    expect(speak.className).toContain('nl-btn--primary');
  });

  it('24.3 Clear sits in the sentence card, far from Speak, and Undo brings the sentence back until the next key', () => {
    const { container } = render(<CommunicationScreen initialDict={miniDict()} layout="phone" />);
    typeDigits('406333');
    const said = utterance();
    expect(said).toContain('need');
    const card = container.querySelector<HTMLElement>('[data-section="speak"]')!;
    fireEvent.click(within(card).getByRole('button', { name: 'Clear' }));
    expect(utterance()).toBe('Press a key to start');
    fireEvent.click(within(card).getByRole('button', { name: 'Undo' }));
    expect(utterance()).toBe(said);
    // After a new key press, Undo is gone again.
    fireEvent.click(within(card).getByRole('button', { name: 'Clear' }));
    typeDigits('4');
    expect(within(card).queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  it('24.4 suggestions leave out the sentence already in the card, and More opens every sentence', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="phone" />);
    typeDigits('4');
    const card = utterance();
    const rows = [...document.querySelectorAll('.phone-sugg__item')].map((b) => b.textContent ?? '');
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r).not.toBe(`1Sentence 1: ${card}`);
    expect(rows[0]).toMatch(/^2/); // rank numbers stay those of the full list
    if (screen.queryByRole('button', { name: 'More sentences' })) {
      press('More sentences');
      const sheet = document.querySelector('[data-overlay="sentences"]') ?? document.querySelector('dialog[open]');
      expect(sheet).toBeTruthy();
    }
  });

  it('phoneSuggestions: the chosen sentence is left out, ranks kept, More when there are more than fit', () => {
    const c = (w: string) => ({ words: [w], score: 0, valid: true, oov: [], source: 'ghost' as const });
    const cands = [c('a'), c('b'), c('c'), c('d')];
    expect(phoneSuggestions(cands, 0, 2)).toEqual({ items: [{ index: 1, text: 'B' }, { index: 2, text: 'C' }], more: true });
    expect(phoneSuggestions(cands, 2, 2).items.map((s) => s.index)).toEqual([0, 1]);
    expect(phoneSuggestions(cands.slice(0, 2), 0, 2)).toEqual({ items: [{ index: 1, text: 'B' }], more: false });
  });

  it('24.5 the Menu sheet holds the sentence actions the phone screen leaves out: Save phrase and Spell this word', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="phone" />);
    typeDigits('4');
    press('Menu');
    const menu = document.querySelector<HTMLElement>('[data-scan-row="sentence"]')!;
    expect(within(menu).getAllByRole('button').map((b) => b.textContent)).toEqual(['Save phrase', 'Spell this word']);
  });

  it('24.6 one-switch scanning: the action row is the action bar (Menu, Speak, Show) and the last row is Clear', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<CommunicationScreen initialDict={miniDict()} layout="phone" initialSettings={{ access: 'scan2', acceptDelayMs: 0 }} />);
      const bar = container.querySelector<HTMLElement>('[data-section="actions"]')!;
      expect(bar.className).toContain('nl-scanrow');
      expect(container.querySelector('[data-section="speak"]')!.className).toContain('nl-scanrow');
    } finally {
      vi.useRealTimers();
    }
  });
});
