/**
 * Plan Part 1 bugs (web-ui Req 30): model ranking goes on after a pin, waits while a word is open, the
 * word and sentence caps are announced, and an ignored quick repeat press is shown on its key.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunicationScreen, IGNORED_MARK_MS, IGNORED_MESSAGE } from '@/components/CommunicationScreen';
import { EMPTY, LIMIT_MESSAGE, MAX_CODE, MAX_WORDS, actionForKey, codesOf, composerReducer, limitFor, type ComposerAction, type ComposerState } from '@/lib/composer';
import { buildRequest } from '@/lib/decodeClient';
import { RANK_DEBOUNCE_MS, RANK_PAUSE_OPEN_MS, rankDelayMs, rankingLattice } from '@/lib/sentence';
import { miniDict } from './fixtures';

const d = miniDict();
const run = (actions: ComposerAction[], from: ComposerState = EMPTY) => actions.reduce(composerReducer, from);
const keys = (s: string): ComposerAction[] => s.split('').map((k) => actionForKey(k as never)!).filter(Boolean);

describe('Req 30.1: ranking request with pinned words', () => {
  it('sends each pinned slot as a one-word lattice slot', () => {
    let s = run(keys('4063330928370'));
    s = composerReducer(s, { type: 'pin', index: 2, word: 'waves' });
    const lat = rankingLattice(s, d.lexicon)!;
    expect(lat[0]).toEqual(expect.arrayContaining(['i', 'g', 'h']));
    expect(lat[1]).toEqual(['need', 'meed']);
    expect(lat[2]).toEqual(['waves']);
    const req = buildRequest(codesOf(s), lat, undefined, 'letter', 5)!;
    expect(req.codes).toEqual(['4', '6333', '92837']);
    expect(req.lattice[2]).toEqual(['waves']);
  });

  it('a chosen sentence becomes pins when typing goes on, and still ranks', () => {
    let s = run(keys('40633309'));
    s = composerReducer(s, { type: 'select', words: ['i', 'need', 'w'] });
    s = run(keys('2837'), s);
    const lat = rankingLattice(s, d.lexicon)!;
    expect(lat.slice(0, 2)).toEqual([['i'], ['need']]);
    expect(lat[2]).toEqual(['water', 'waves']);
  });

  it('a pinned word the dictionary does not know (spelled or My words) still goes', () => {
    const s = composerReducer(run(keys('2')), { type: 'pin', index: 0, word: 'c' });
    expect(rankingLattice(s, d.lexicon)).toEqual([['c']]);
  });

  it('nothing to rank: no keys, or a slot with no word yet', () => {
    expect(rankingLattice(EMPTY, d.lexicon)).toBeNull();
    expect(rankingLattice(run(keys('40633')), d.lexicon)).toBeNull(); // "63" spells nothing yet
  });
});

describe('Req 30.2: ranking waits while a word is open', () => {
  it('waits longer for an open word than for a closed one', () => {
    expect(RANK_DEBOUNCE_MS).toBe(400);
    expect(RANK_PAUSE_OPEN_MS).toBe(1000);
    expect(rankDelayMs(run(keys('4')))).toBe(RANK_PAUSE_OPEN_MS);
    expect(rankDelayMs(run(keys('40')))).toBe(RANK_DEBOUNCE_MS);
    expect(rankDelayMs(EMPTY)).toBe(RANK_DEBOUNCE_MS);
  });
});

describe('Req 30.3: the caps', () => {
  it('limitFor names the cap a letter would pass, and the reducer keeps the cap', () => {
    const long = run(Array.from({ length: MAX_CODE }, () => ({ type: 'digit', digit: '2' }) as const));
    expect(codesOf(long)[0]).toHaveLength(MAX_CODE);
    expect(limitFor(long, { type: 'digit', digit: '3' })).toBe('word');
    expect(composerReducer(long, { type: 'digit', digit: '3' })).toBe(long);
    expect(limitFor(long, { type: 'space' })).toBeNull();
    expect(limitFor(composerReducer(long, { type: 'back' }), { type: 'digit', digit: '3' })).toBeNull();

    const full = run(keys('20'.repeat(MAX_WORDS)));
    expect(full.slots).toHaveLength(MAX_WORDS);
    expect(limitFor(full, { type: 'digit', digit: '2' })).toBe('sentence');
    expect(composerReducer(full, { type: 'digit', digit: '2' }).slots).toHaveLength(MAX_WORDS);
    // After Speak the next letter starts a new sentence, so no cap applies.
    expect(limitFor({ ...full, spoken: true }, { type: 'digit', digit: '2' })).toBeNull();
    expect(limitFor(full, { type: 'digit', digit: '1' })).toBeNull();
  });

  it('has the plain messages', () => {
    expect(LIMIT_MESSAGE.word).toBe('Words can be at most 16 letters.');
    expect(LIMIT_MESSAGE.sentence).toBe('A sentence can have at most 20 words.');
  });
});

// ---- the screen -------------------------------------------------------------------------------------

const KEY = { 2: '2 ABC, A B C', 3: '3 DEF, D E F', 4: '4 GHI, G H I', 6: '6 MNO, M N O', 9: '9 WXYZ, W X Y Z', 8: '8 TUV, T U V', 7: '7 PQRS, P Q R S', 0: '0 Space' } as Record<string, string>;
const press = (k: string) => fireEvent.click(screen.getByRole('button', { name: k === '#' ? 'Next word' : KEY[k]! }));
const typeDigits = (s: string) => {
  for (const k of s) press(k);
};
const status = () => document.querySelector('p.nl-sr-only[role="status"]')!.textContent ?? '';
let now = 0;

function mockDecode() {
  const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify({ v: 1, candidates: [{ words: ['i', 'need', 'waves'] }], rejected: 0 }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, bodies: () => fetchMock.mock.calls.map((c) => JSON.parse(c[1].body as string)) };
}
const wait = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  // Each press is a new key unless a test moves the clock less than the accept delay.
  now = 0;
  vi.spyOn(Date, 'now').mockImplementation(() => (now += 1000));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('CommunicationScreen: model ranking (Req 30.1, 30.2)', () => {
  it('ranks again after # pins a word, with the pin as a one-word slot', async () => {
    const m = mockDecode();
    render(<CommunicationScreen initialDict={miniDict()} initialSettings={{ llm: true, acceptDelayMs: 0 }} />);
    typeDigits('40#'); // "g" pinned on the first word
    typeDigits('63330');
    await wait(RANK_DEBOUNCE_MS + 50);
    expect(m.fetchMock).toHaveBeenCalled();
    const body = m.bodies().at(-1);
    expect(body.codes).toEqual(['4', '6333']);
    expect(body.lattice[0]).toEqual(['g']);
    expect(body.lattice[1]).toEqual(['need', 'meed']);
    // Its beams follow the pin too.
    for (const b of body.beams) expect(b[0]).toBe('g');
  });

  it('sends nothing while an open word is typed with short gaps; a pause of 1,000 ms ranks it', async () => {
    const m = mockDecode();
    render(<CommunicationScreen initialDict={miniDict()} initialSettings={{ llm: true, acceptDelayMs: 0 }} />);
    press('4'); // "i": a word already, but still open
    await wait(RANK_DEBOUNCE_MS + 100); // longer than the 400 ms debounce, shorter than the pause
    press('3'); // "he"
    await wait(RANK_DEBOUNCE_MS + 100);
    expect(m.fetchMock).not.toHaveBeenCalled();
    await wait(RANK_PAUSE_OPEN_MS - (RANK_DEBOUNCE_MS + 100) + 50);
    expect(m.fetchMock).toHaveBeenCalledTimes(1);
    expect(m.bodies()[0].codes).toEqual(['43']);
  });

  it('Space ranks after the normal 400 ms', async () => {
    const m = mockDecode();
    render(<CommunicationScreen initialDict={miniDict()} initialSettings={{ llm: true, acceptDelayMs: 0 }} />);
    typeDigits('40');
    await wait(RANK_DEBOUNCE_MS + 50);
    expect(m.fetchMock).toHaveBeenCalledTimes(1);
    expect(m.bodies()[0].codes).toEqual(['4']);
  });
});

describe('CommunicationScreen: caps are announced (Req 30.3)', () => {
  it('the 17th letter of a word', async () => {
    render(<CommunicationScreen initialDict={miniDict()} />);
    for (let i = 0; i < MAX_CODE; i++) press('2');
    await wait(50);
    expect(status()).not.toContain('at most');
    press('3');
    await wait(50);
    expect(status()).toBe('Words can be at most 16 letters.');
    expect(document.getElementById('utterance')!.textContent).toContain('2'.repeat(MAX_CODE));
    expect(document.getElementById('utterance')!.textContent).not.toContain(`${'2'.repeat(MAX_CODE)}3`);
  });

  it('the 21st word', async () => {
    render(<CommunicationScreen initialDict={miniDict()} />);
    typeDigits('40'.repeat(MAX_WORDS));
    await wait(50);
    press('4');
    await wait(50);
    expect(status()).toBe('A sentence can have at most 20 words.');
  });
});

describe('CommunicationScreen: an ignored repeat press shows on the key (Req 30.4)', () => {
  it('marks the key, does not count the press, and says so only the first time', async () => {
    render(<CommunicationScreen initialDict={miniDict()} initialSettings={{ acceptDelayMs: 150 }} />);
    const key6 = () => screen.getByRole('button', { name: KEY[6]! });
    vi.mocked(Date.now).mockImplementation(() => now);
    now = 10_000;
    press('4');
    now += 1000;
    press('6');
    now += 100; // inside the accept delay
    press('6');
    expect(key6().classList.contains('is-ignored')).toBe(true);
    expect(key6().hasAttribute('data-ignored')).toBe(true);
    // Not counted: the open word is 46, not 466.
    expect(document.getElementById('utterance')!.textContent).toContain('46');
    expect(document.getElementById('utterance')!.textContent).not.toContain('466');
    await wait(50);
    expect(status()).toBe(IGNORED_MESSAGE);
    await wait(IGNORED_MARK_MS);
    expect(key6().classList.contains('is-ignored')).toBe(false);

    // A second ignored press is marked again, but not announced again.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: KEY[4]! })); // clears the live region text path below
    });
    now += 1000;
    press('6');
    now += 50;
    press('6');
    expect(key6().classList.contains('is-ignored')).toBe(true);
    await wait(50);
    expect(status()).toBe(IGNORED_MESSAGE); // unchanged from before: no new announcement was made
  });

  it('presses outside the accept delay all count and mark nothing', () => {
    render(<CommunicationScreen initialDict={miniDict()} initialSettings={{ acceptDelayMs: 150 }} />);
    press('6');
    press('6');
    expect(document.querySelector('.nl-key.is-ignored')).toBeNull();
  });
});
