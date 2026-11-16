/** Punctuation where typed, and capitals: the composer and the screen (web-ui Req 34). */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunicationScreen } from '@/components/CommunicationScreen';
import { EMPTY, actionForKey, codesOf, composerReducer, marksOf, startsOf, type ComposerAction, type ComposerState } from '@/lib/composer';
import { buildSentence } from '@/lib/sentence';
import { miniDict } from './fixtures';

const run = (actions: ComposerAction[], from: ComposerState = EMPTY) => actions.reduce(composerReducer, from);
const keys = (s: string): ComposerAction[] => s.split('').map((k) => actionForKey(k as never)!).filter(Boolean);

describe('composer marks (Req 34.1, 34.2, 34.6)', () => {
  it('1 closes the open word and puts the mark after it; it stays there as more words come', () => {
    let s = run(keys('4'));
    s = run(keys('1'), s);
    expect(s.open).toBe(false);
    expect(marksOf(s)).toEqual(['.']);
    s = run(keys('6333'), s);
    expect(codesOf(s)).toEqual(['4', '6333']);
    expect(marksOf(s)).toEqual(['.', undefined]);
    expect([...startsOf(s)]).toEqual([1]);
  });
  it('1 cycles . ? ! , none on that word; nothing typed does nothing', () => {
    let s = run(keys('4'));
    const seen: unknown[] = [];
    for (let i = 0; i < 5; i++) {
      s = composerReducer(s, { type: 'punct' });
      seen.push(s.slots[0]!.punct);
    }
    expect(seen).toEqual(['.', '?', '!', ',', undefined]);
    expect(composerReducer(EMPTY, { type: 'punct' })).toBe(EMPTY);
  });
  it('Back removes the mark first, then the word', () => {
    let s = run(keys('4106333'));
    s = run(keys('01'), s);
    expect(marksOf(s)).toEqual(['.', '.']);
    s = composerReducer(s, { type: 'back' });
    expect(marksOf(s)).toEqual(['.', undefined]);
    s = composerReducer(s, { type: 'back' });
    expect(codesOf(s)).toEqual(['4']);
  });
  it("Ask's ? is handed over: 1 on the last word cycles on from ?", () => {
    let s = composerReducer(EMPTY, { type: 'intent', intent: 'ask', turn: 1 });
    s = run(keys('4'), s);
    expect(s.punct).toBe('?');
    s = composerReducer(s, { type: 'punct' });
    expect(s.slots[0]!.punct).toBe('!');
    expect(s.punct).toBeUndefined();
  });
  it('mark sets or clears one word', () => {
    let s = run(keys('406333'));
    s = composerReducer(s, { type: 'mark', index: 0, punct: ',' });
    expect(marksOf(s)).toEqual([',', undefined]);
    s = composerReducer(s, { type: 'mark', index: 0 });
    expect(marksOf(s)).toEqual([undefined, undefined]);
  });
  it('the text shows marks where typed; the key line has no mark', () => {
    const d = miniDict();
    const s = run(keys('41063330'));
    const out = buildSentence(s, [], d.lexicon);
    expect(out.text).toBe('I. Need');
    expect(out.codes).toEqual(['4', '6333']);
    expect(out.tokens).toHaveLength(2);
  });
});

describe('screen (Req 34.4, 34.8)', () => {
  beforeEach(() => vi.spyOn(Date, 'now').mockImplementation(((t = 0) => () => (t += 1000))()));
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  const press = (n: string) => fireEvent.click(screen.getByRole('button', { name: n }));
  it('each press of 1 is said in words; Back on a mark says Mark removed', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" />);
    const status = () => document.querySelector('p.nl-sr-only[role="status"]')!.textContent;
    press('4 GHI, G H I');
    press('1 punctuation, .,?!');
    await act(async () => vi.advanceTimersByTime(50));
    expect(status()).toBe('Full stop after I.');
    press('1 punctuation, .,?!');
    await act(async () => vi.advanceTimersByTime(50));
    expect(status()).toBe('Question mark after I.');
    press('Back');
    await act(async () => vi.advanceTimersByTime(50));
    expect(status()).toBe('Mark removed.');
    vi.useRealTimers();
  });
});
