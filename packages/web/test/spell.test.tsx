/**
 * Spell mode, unknown keys, my words and word packs on the communication screen (web-ui Req 19-22).
 */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunicationScreen } from '@/components/CommunicationScreen';
import type { MyWord } from '@/lib/myWords';
import { miniDict } from './fixtures';

const CODES: Record<string, string> = { '0': 'Digit0', '2': 'Digit2', '3': 'Digit3', '4': 'Digit4', '6': 'Digit6', '7': 'Digit7', '8': 'Digit8', '9': 'Digit9' };
function typeKeys(digits: string) {
  for (const d of digits) fireEvent.keyDown(window, { key: d, code: CODES[d] });
}
const utterance = () => document.getElementById('utterance')!.textContent ?? '';
const sheet = (name: string) => document.querySelector<HTMLElement>(`dialog[data-overlay="${name}"][open]`);
const proof = () => screen.getByRole('region', { name: 'Check the words' });
const chips = () => [...proof().querySelectorAll('.nl-chip')].map((c) => c.getAttribute('data-state'));
function sw(key: ' ' | 'Enter') {
  act(() => {
    fireEvent.keyDown(window, { key, code: key === ' ' ? 'Space' : 'Enter' });
    fireEvent.keyUp(window, { key, code: key === ' ' ? 'Space' : 'Enter' });
  });
}
const litRow = () => document.querySelector('[data-scan-state="row"]')?.getAttribute('data-scan-row') ?? null;
const litText = () => document.querySelector('[data-scan-state="lit"]')?.textContent?.trim() ?? null;
function moveToRow(name: string) {
  for (let i = 0; i < 40 && litRow() !== name; i++) sw(' ');
  expect(litRow()).toBe(name);
}
function moveToCell(match: RegExp) {
  for (let i = 0; i < 10 && !match.test(litText() ?? ''); i++) sw(' ');
  expect(litText()).toMatch(match);
}
const mihai = (extra: Partial<MyWord> = {}): MyWord => ({ w: 'mihai', display: 'Mihai', boost: 2, added: 1, source: 'spelled', ...extra });

beforeEach(() => {
  vi.spyOn(Date, 'now').mockImplementation(((t = 0) => () => (t += 1000))());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('unknown keys and spell mode (web-ui Req 19, 20)', () => {
  it('Req 20.2 + 20.3: keys with no word show the digits, "not spelled yet", and block Speak', () => {
    render(<CommunicationScreen initialDict={miniDict()} initialWords={[]} />);
    typeKeys('4064424');
    expect(utterance()).toContain('I 64424');
    expect(chips()).toEqual(['match', 'unspelled']);
    expect(proof().textContent).toContain('not spelled yet');
    expect(screen.getByText(/Not in your words yet: 64424\. Spell this word/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Speak' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('Req 19.1 + 19.4 + 19.6: spell "Mihai" by keyboard (digits pick, Enter uses), then add it', async () => {
    render(<CommunicationScreen initialDict={miniDict()} initialWords={[]} />);
    typeKeys('4064424');
    fireEvent.click(screen.getByRole('button', { name: 'Spell this word' }));
    const s = sheet('spell')!;
    expect(s).toBeTruthy();
    // One row per key, each with only that key's letters.
    expect([...s.querySelectorAll('fieldset')].map((f) => [...f.querySelectorAll('input')].map((i) => (i as HTMLInputElement).value).join(''))).toEqual(['mno', 'ghi', 'ghi', 'abc', 'ghi']);
    // m=1, i=3, h=2, a=1, i=3 on each position's chosen letter.
    for (const [pos, digit] of [[0, '1'], [1, '3'], [2, '2'], [3, '1'], [4, '3']] as const) {
      fireEvent.keyDown(document.getElementById(`spell-pos-${pos}`)!, { key: digit });
    }
    expect(s.querySelector('.spell__word')?.textContent).toBe('Mihai'); // a word with no dictionary match starts with a capital
    fireEvent.keyDown(document.getElementById('spell-pos-4')!, { key: 'Enter' });
    expect(sheet('spell')).toBeNull();
    expect(utterance()).toContain('I Mihai');
    expect(chips()).toEqual(['match', 'new']);
    expect(proof().textContent).toContain('Not in your words yet. Add it?');
    expect((screen.getByRole('button', { name: 'Speak' }) as HTMLButtonElement).disabled).toBe(false);
    // The sentence list now has full sentences with the spelled word.
    expect(screen.getByRole('button', { name: /Sentence 1: I Mihai/ })).toBeTruthy();

    fireEvent.click(within(proof()).getByRole('button', { name: 'Add to my words' }));
    expect(chips()).toEqual(['match', 'match']);
    expect(within(proof()).queryByRole('button', { name: 'Add to my words' })).toBeNull();
  });

  it('Req 19.4: arrows change the letter and move between keys; Escape-like Close keeps the sentence', () => {
    render(<CommunicationScreen initialDict={miniDict()} initialWords={[]} />);
    typeKeys('4064424');
    fireEvent.click(screen.getByRole('button', { name: 'Spell this word' }));
    const first = document.getElementById('spell-pos-0')!;
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(document.activeElement?.id).toBe('spell-pos-1');
    fireEvent.click(within(sheet('spell')!).getByRole('button', { name: 'Close' }));
    expect(sheet('spell')).toBeNull();
    expect(chips()).toEqual(['match', 'unspelled']);
  });

  it('Req 19.5: spell "Mihai" with two switches inside the sheet, and "Add to my words" there', () => {
    render(<CommunicationScreen initialDict={miniDict()} initialWords={[]} initialSettings={{ access: 'scan2' }} />);
    typeKeys('4064424');
    // Main grid: the actions row, then Spell (the 5th cell).
    for (let i = 0; i < 20 && !document.querySelector('.speak-group.is-scanning'); i++) sw(' ');
    sw('Enter');
    for (let i = 0; i < 10 && !document.querySelector('[data-action="spell"].is-lit'); i++) sw(' ');
    sw('Enter');
    expect(sheet('spell')).toBeTruthy();
    expect(litRow()).toBe('close');
    const pick = (pos: number, letter: string) => {
      moveToRow(`pos-${pos}`);
      sw('Enter');
      moveToCell(new RegExp(`^${letter}\\d$`, 'i'));
      sw('Enter');
    };
    pick(1, 'i');
    pick(2, 'h');
    pick(4, 'i'); // positions 0 (m) and 3 (a) already start on the first letter
    expect(sheet('spell')!.querySelector('.spell__word')?.textContent).toBe('Mihai');
    moveToRow('spell-done');
    sw('Enter');
    moveToCell(/^Add to my words$/);
    sw('Enter');
    expect(sheet('spell')).toBeNull();
    expect(utterance()).toContain('I Mihai');
    expect(chips()).toEqual(['match', 'match']);
  });

  it('Req 21.2: the Add offers are a scan row of their own', () => {
    render(<CommunicationScreen initialDict={miniDict()} initialWords={[]} initialSettings={{ access: 'scan2' }} />);
    typeKeys('4064424');
    fireEvent.click(screen.getByRole('button', { name: 'Spell this word' }));
    fireEvent.keyDown(document.getElementById('spell-pos-0')!, { key: 'Enter' }); // keyboard ignored while scanning
    expect(sheet('spell')).toBeTruthy();
    fireEvent.click(within(sheet('spell')!).getByRole('button', { name: 'Use this word' }));
    expect(chips()).toEqual(['match', 'new']);
    for (let i = 0; i < 20 && !document.querySelector('.proof__offers.is-scanning'); i++) sw(' ');
    expect(document.querySelector('.proof__offers.is-scanning')).toBeTruthy();
    sw('Enter');
    sw('Enter');
    expect(chips()).toEqual(['match', 'match']);
  });
});

describe('my words (web-ui Req 21)', () => {
  it('Req 21.4 + 21.5: stored words are boosted on load, so "Mihai" ranks and keeps its capital', () => {
    render(<CommunicationScreen initialDict={miniDict()} initialWords={[mihai()]} />);
    typeKeys('4064424');
    expect(utterance()).toContain('I Mihai');
    expect(chips()).toEqual(['match', 'match']);
    expect(screen.getByRole('button', { name: /Sentence 1: I Mihai/ })).toBeTruthy();
  });

  it('Req 21.3 + 21.6 + 37.5: My words (More > My words) lists the word; Remove asks first and rebuilds the lexicon', async () => {
    const reloadDict = vi.fn(async () => miniDict());
    render(<CommunicationScreen initialDict={miniDict()} initialWords={[mihai()]} reloadDict={reloadDict} layout="wide" />);
    // My words is in the laptop header's More (web-ui Req 37.5), no longer inside Phrases.
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(within(sheet('more')!).getByRole('button', { name: 'My words' }));
    const words = sheet('words')!;
    expect(words.textContent).toContain('Mihai');
    expect(words.textContent).toContain('64424');
    fireEvent.click(within(words).getByRole('button', { name: 'Remove Mihai' }));
    fireEvent.click(within(words).getByRole('button', { name: 'Remove word' }));
    // The help text of Add names and phrases (Req 35.4) shows "Mihai" as an example, so look for the word's own row.
    expect(within(words).queryByRole('button', { name: 'Remove Mihai' })).toBeNull();
    await waitFor(() => expect(reloadDict).toHaveBeenCalledTimes(1));
    fireEvent.click(within(words).getByRole('button', { name: 'Close' }));
    await act(async () => undefined);
    typeKeys('4064424');
    expect(chips()).toEqual(['match', 'unspelled']);
  });

  it('Req 21.1 + 21.5: a helper can type a word with its capitals; bad words get a plain message', () => {
    render(<CommunicationScreen initialDict={miniDict()} initialWords={[]} layout="wide" />);
    // My words is in the laptop header's More (web-ui Req 37.5), no longer inside Phrases.
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(within(sheet('more')!).getByRole('button', { name: 'My words' }));
    const words = sheet('words')!;
    const input = within(words).getByLabelText('Add a word');
    fireEvent.change(input, { target: { value: 'r2d2' } });
    fireEvent.click(within(words).getByRole('button', { name: 'Add to my words' }));
    expect(words.textContent).toContain('Use letters only');
    fireEvent.change(input, { target: { value: 'Ana' } });
    fireEvent.click(within(words).getByRole('button', { name: 'Add to my words' }));
    expect(within(words).getByRole('button', { name: 'Remove Ana' })).toBeTruthy();
    fireEvent.click(within(words).getByRole('button', { name: 'Close' }));
    typeKeys('262');
    expect(utterance()).toContain('Ana');
  });
});

describe('word packs (web-ui Req 22)', () => {
  it('Req 22.1 + 22.3 + 22.4: a pack file is checked and shown, and nothing is added until Add', async () => {
    render(<CommunicationScreen initialDict={miniDict()} initialWords={[]} layout="wide" />);
    // My words is in the laptop header's More (web-ui Req 37.5), no longer inside Phrases.
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(within(sheet('more')!).getByRole('button', { name: 'My words' }));
    const words = sheet('words')!;
    const pack = { id: 'family-example', lang: 'en', version: 1, words: [{ w: 'Ana', boost: 2 }, { w: 'Mihai', boost: 2 }, { w: 'Bucharest', boost: 1 }, { w: 'x2', boost: 1 }], phrases: [] };
    const file = new File([JSON.stringify(pack)], 'family.json', { type: 'application/json' });
    const input = words.querySelector<HTMLInputElement>('input[type="file"]')!;
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    await waitFor(() => expect(words.textContent).toContain('Pack "family-example", version 1'));
    expect(words.textContent).toContain('Adds 3 words: Ana, Mihai, Bucharest.');
    expect(words.textContent).toContain('Leaves out 1 entry: "x2" (use letters only)');
    expect(within(words).queryByRole('button', { name: 'Remove Mihai' })).toBeNull();
    fireEvent.click(within(words).getByRole('button', { name: 'Add 3 words' }));
    expect(within(words).getByRole('button', { name: 'Remove Mihai' })).toBeTruthy();
    expect(within(words).getByRole('button', { name: 'Remove Bucharest' })).toBeTruthy();
    fireEvent.click(within(words).getByRole('button', { name: 'Close' }));
    typeKeys('4064424');
    expect(utterance()).toContain('I Mihai');
  });

  it('Req 22.2: a pack in the wrong shape is refused with a plain message', async () => {
    render(<CommunicationScreen initialDict={miniDict()} initialWords={[]} layout="wide" />);
    // My words is in the laptop header's More (web-ui Req 37.5), no longer inside Phrases.
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(within(sheet('more')!).getByRole('button', { name: 'My words' }));
    const words = sheet('words')!;
    const file = new File(['{"id":"x","lang":"ro","version":1,"words":[],"phrases":[]}'], 'ro.json', { type: 'application/json' });
    await act(async () => {
      fireEvent.change(words.querySelector('input[type="file"]')!, { target: { files: [file] } });
    });
    await waitFor(() => expect(words.textContent).toContain('This pack is for "ro".'));
  });
});
