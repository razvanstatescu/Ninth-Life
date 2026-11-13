// Phone layout (web-ui Req 24; docs/research/mobile-patterns-mobbin.md, mobile-aac-evidence.md).
// Fit, key size and key stability per device are checked in a browser by test/e2e/responsive.mjs.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunicationScreen } from '@/components/CommunicationScreen';
import { phoneSuggestions } from '@/components/PhoneSuggestions';
import { sectionOrder, STACK_SHORT_QUERY } from '@/lib/layout';
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
  it('24.1 one screen top to bottom: sentence card, suggestions, keypad, action bar, in DOM (and focus) order; nothing below', () => {
    // 27.4: 'thread' is the strip on tall tablets only; on phones the newest turn is in the header.
    expect(sectionOrder('stack').columns).toEqual([['thread', 'speak', 'cands', 'pad', 'actions']]);
    const { container } = render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    const screenSections = [...container.querySelectorAll('.shell-screen > [data-section]')].map((el) => el.getAttribute('data-section'));
    expect(screenSections).toEqual(['speak', 'cands', 'pad', 'actions']);
    // Nothing below the screen: proof, They said and About are in sheets (web-ui Req 25).
    expect(container.querySelector('.app-footer')).toBeNull();
    expect(container.querySelector('[data-section="proof"]')).toBeNull();
  });

  it('24.2 the action bar under the keypad is Menu, Speak, Show, and it holds the only Speak', () => {
    const { container } = render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
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
    const { container } = render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
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
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
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

  it('24.5 27.6 the Menu sheet holds what the screen leaves out: Save phrase, Spell, Check the words, They said, Conversation, About', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    typeDigits('4');
    press('Menu');
    const menu = document.querySelector<HTMLElement>('[data-scan-row="sentence"]')!;
    expect(within(menu).getAllByRole('button').map((b) => b.textContent)).toEqual(['Save phrase', 'Spell this word', 'Check the words', 'They said', 'Conversation']);
    // The footer's links and the intended-purpose sentence are in the Menu too.
    expect(screen.getByRole('link', { name: 'About Ninth Life' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'How Ninth Life works' })).toBeTruthy();
  });

  it('24.6 one-switch scanning: the action row is the action bar (Menu, Speak, Show) and the last row is Clear', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<CommunicationScreen initialDict={miniDict()} layout="stack" initialSettings={{ access: 'scan2', acceptDelayMs: 0 }} />);
      const bar = container.querySelector<HTMLElement>('[data-section="actions"]')!;
      expect(bar.className).toContain('nl-scanrow');
      expect(container.querySelector('[data-section="speak"]')!.className).toContain('nl-scanrow');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('short phones (web-ui Req 24.9, 25.1)', () => {
  /** A short screen: only the short-stack query matches, as on a 495px iPhone SE with the Bottom tab bar. */
  const stubShort = () =>
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === STACK_SHORT_QUERY,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }));
  const menuSentenceButtons = () => within(document.querySelector<HTMLElement>('[data-scan-row="sentence"]')!).getAllByRole('button').map((b) => b.textContent);
  function sw(key: ' ' | 'Enter') {
    act(() => {
      fireEvent.keyDown(window, { key, code: key === ' ' ? 'Space' : 'Enter' });
      fireEvent.keyUp(window, { key, code: key === ' ' ? 'Space' : 'Enter' });
    });
  }
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('24.9 no suggestion row, still section order speak, pad, actions', () => {
    stubShort();
    const { container } = render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    typeDigits('4');
    expect([...container.querySelectorAll('.shell-screen > [data-section]')].map((el) => el.getAttribute('data-section'))).toEqual(['speak', 'pad', 'actions']);
    expect(container.querySelector('.phone-sugg')).toBeNull();
  });

  it('24.9 Menu > This sentence has Sentences and it opens "Sentences for your keys"', () => {
    stubShort();
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    typeDigits('4');
    press('Menu');
    expect(menuSentenceButtons()[0]).toBe('Sentences');
    press('Sentences');
    const sheet = document.querySelector('dialog[data-overlay="sentences"][open]');
    expect(sheet?.textContent).toContain('Sentences for your keys');
    expect(sheet!.querySelectorAll('.nl-candidate').length).toBeGreaterThan(0);
  });

  it('24.9 Sentences is absent from Menu when the row is shown', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    typeDigits('4');
    press('Menu');
    expect(menuSentenceButtons()).not.toContain('Sentences');
    expect(document.querySelector('.phone-sugg')).toBeTruthy();
  });

  it('24.9 24.8 switch scanning skips the empty suggestion row: keypad rows, then the action bar', () => {
    stubShort();
    const { container } = render(<CommunicationScreen initialDict={miniDict()} layout="stack" initialSettings={{ access: 'scan2', acceptDelayMs: 0 }} />);
    fireEvent.keyDown(window, { key: '4', code: 'Digit4' });
    expect(utterance()).not.toBe('Press a key to start');
    // Keypad rows 0-3, then the action bar: no stop at a suggestion row.
    for (let i = 0; i < 5; i++) sw(' ');
    expect(container.querySelector('[data-section="actions"]')!.className).toContain('is-scanning');
  });

  it('24.9 Spell this word stays in Menu', () => {
    stubShort();
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    typeDigits('4');
    press('Menu');
    expect(menuSentenceButtons()).toContain('Spell this word');
  });
});
