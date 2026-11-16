// They said in its sheet, Save phrase answered in place, and naming (web-ui Req 39). Placement over the keyboard, sizes and the
// two-switch path in a browser: test/e2e/surfaces.mjs.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({ existing: false, phrases: [] as { id: string; text: string; lang: string; uses: number; lastUsed: number; pinned: boolean }[] }));
vi.mock('@/lib/storage', async (orig) => {
  const real = await orig<typeof import('@/lib/storage')>();
  return {
    ...real,
    storageAvailable: () => true,
    loadSettings: async () => null,
    saveSettings: async () => undefined,
    listMyWords: async () => [],
    putMyWords: async () => undefined,
    listPhrases: async () => store.phrases.slice(),
    savePhrase: async (text: string) => {
      const had = store.phrases.find((p) => p.text === text.trim());
      if (had) return { ...had, uses: had.uses + 1 };
      if (store.existing) return { id: 'old', text: text.trim(), lang: 'en', uses: 2, lastUsed: 1, pinned: false };
      const p = { id: `p${store.phrases.length + 1}`, text: text.trim(), lang: 'en', uses: 1, lastUsed: 1, pinned: false };
      store.phrases.push(p);
      return p;
    },
    deletePhrase: async (id: string) => {
      store.phrases = store.phrases.filter((p) => p.id !== id);
    },
  };
});

import { CommunicationScreen } from '@/components/CommunicationScreen';
import { PartnerTurn } from '@/components/PartnerTurn';
import { miniDict } from './fixtures';

const KEY = { 4: '4 GHI, G H I', 6: '6 MNO, M N O', 3: '3 DEF, D E F', 0: '0 Space' } as Record<string, string>;
const press = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const snackText = () => document.querySelector('[data-snackbar] .snackbar__text')?.textContent ?? null;

beforeEach(() => {
  store.phrases = [];
  store.existing = false;
  vi.spyOn(Date, 'now').mockImplementation(((t = 0) => () => (t += 1000))());
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('39.4 Save phrase answers in place', () => {
  const announced = () => document.querySelector('[role="status"][aria-live="polite"].nl-sr-only')?.textContent ?? '';
  const sw = (key: ' ' | 'Enter') => {
    fireEvent.keyDown(window, { key, code: key === ' ' ? 'Space' : 'Enter' });
    fireEvent.keyUp(window, { key, code: key === ' ' ? 'Space' : 'Enter' });
  };

  it('laptops: the button turns into Undo save (both labels in one cell); Undo deletes it; the next key turns it back', async () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" />);
    for (const d of '406333') press(KEY[d]!);
    const btn = () => document.querySelector<HTMLButtonElement>('[data-action="save"]')!;
    expect(btn().getAttribute('aria-label')).toBe('Save phrase');
    await act(async () => press('Save phrase'));
    expect(store.phrases).toHaveLength(1);
    expect(btn().getAttribute('aria-label')).toBe('Saved to Phrases. Undo save');
    expect(btn().textContent).toContain('Undo save');
    expect(btn().textContent).toContain('Save phrase'); // the hidden label keeps the size
    await act(async () => new Promise((r) => setTimeout(r, 60))); // the polite region updates a moment later
    expect(announced()).toBe('Saved to Phrases.');
    expect(document.querySelector('.snackbar, [data-snackbar]')).toBeNull();
    await act(async () => press('Saved to Phrases. Undo save'));
    expect(store.phrases).toHaveLength(0);
    expect(btn().getAttribute('aria-label')).toBe('Save phrase');
    await act(async () => press('Save phrase'));
    press(KEY[0]!);
    expect(btn().getAttribute('aria-label')).toBe('Save phrase');
    expect(store.phrases).toHaveLength(1);
  });

  it('a phrase already saved is said so, and the button stays Save phrase', async () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" />);
    for (const d of '406333') press(KEY[d]!);
    store.existing = true; // saved on an earlier visit
    await act(async () => press('Save phrase'));
    await act(async () => new Promise((r) => setTimeout(r, 60)));
    expect(announced()).toBe('Already in Phrases.');
    expect(document.querySelector('[data-action="save"]')!.getAttribute('aria-label')).toBe('Save phrase');
  });

  it('by switch, the action row\'s save cell undoes the save', async () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" initialSettings={{ access: 'scan2', acceptDelayMs: 0 }} />);
    for (const d of '406333') press(KEY[d]!);
    await act(async () => press('Save phrase'));
    for (let i = 0; i < 20 && !document.querySelector('.speak-group.is-scanning'); i++) sw(' ');
    sw('Enter');
    for (let i = 0; i < 6 && !document.querySelector('[data-action="save"]')!.classList.contains('is-lit'); i++) sw(' ');
    await act(async () => sw('Enter'));
    expect(store.phrases).toHaveLength(0);
  });

  it('phones: the Menu stays open and Save phrase becomes "Saved to Phrases" with Undo, its own scan row, focused', async () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    for (const d of '406333') press(KEY[d]!);
    press('Menu');
    const menu = () => document.querySelector<HTMLElement>('dialog[data-overlay="menu"][open]');
    await act(async () => fireEvent.click(within(menu()!).getByRole('button', { name: 'Save phrase' })));
    expect(menu()).not.toBeNull();
    const row = menu()!.querySelector<HTMLElement>('[data-scan-row="saved"]')!;
    expect(row.textContent).toContain('Saved to Phrases');
    expect(within(row).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Saved to Phrases. Undo']);
    expect(document.activeElement?.id).toBe('menu-item-save-undo');
    expect(within(menu()!).queryByRole('button', { name: 'Save phrase' })).toBeNull();
    await act(async () => fireEvent.click(within(row).getByRole('button')));
    expect(store.phrases).toHaveLength(0);
    expect(document.activeElement?.id).toBe('menu-item-save');
  });
});

describe('39.1 They said in its sheet', () => {
  it('the field first, its label for screen readers only, then Done before Listen, no Cancel', () => {
    vi.stubGlobal('SpeechRecognition', function SR() {});
    render(<PartnerTurn value="" onChange={() => undefined} cancel={false} sheet dictation={{ allowed: true, onAllow: () => undefined }} />);
    expect(screen.getByLabelText('They said').tagName).toBe('INPUT');
    expect(document.querySelector('label')?.className).toBe('nl-sr-only');
    const names = within(document.querySelector<HTMLElement>('[data-scan-row="partner"]')!)
      .getAllByRole('button')
      .map((b) => b.textContent);
    expect(names[0]).toBe('Done');
    expect(names).not.toContain('Cancel');
    vi.unstubAllGlobals();
  });
});

describe('39.5 naming', () => {
  it('Check the words has no "Proof" heading; the Sentences sheet does not repeat its title', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="stack" />);
    press(KEY[4]!);
    press('Menu');
    fireEvent.click(within(document.querySelector<HTMLElement>('dialog[data-overlay="menu"]')!).getByRole('button', { name: 'Check the words' }));
    const proof = document.querySelector<HTMLElement>('dialog[data-overlay="proof"][open]')!;
    expect(proof.querySelector('h2, h3')?.textContent).toBe('Check the words');
    expect(proof.textContent).not.toMatch(/\bProof\b/);
  });

  it('Phrases has no My words button; the laptop conversation button says Whole conversation', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" />);
    press('Phrases');
    expect(within(document.querySelector<HTMLElement>('dialog[data-overlay="phrases"]')!).queryByRole('button', { name: 'My words' })).toBeNull();
    press('Close');
    expect(within(document.querySelector<HTMLElement>('[data-thread="panel"]')!).getByRole('button', { name: 'Whole conversation' })).toBeTruthy();
  });
});
