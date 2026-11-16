// Improvement plan Part 1, "Bugs" (docs/plan/02-improvement-plan.md; evidence in
// docs/research/improvement-plan/engine.md §2 and §6 and app-ux.md polish 4):
//   1. model ranking keeps running after a word is pinned (# or a chosen sentence), each pin sent as a
//      one-word lattice;
//   2. no ranking request while the last word is still open;
//   3. the 17th key of a word and the 21st word are refused with an announcement;
//   4. an ignored fast repeat press (the accept delay) gets visible and announced feedback.
// Model ranking is exercised with a mocked fetch, as in screen.test.tsx.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommunicationScreen } from '@/components/CommunicationScreen';
import { MAX_CODE, MAX_WORDS } from '@/lib/composer';
import { miniDict } from './fixtures';

const KEY = { 2: '2 ABC, A B C', 3: '3 DEF, D E F', 4: '4 GHI, G H I', 6: '6 MNO, M N O', 7: '7 PQRS, P Q R S', 8: '8 TUV, T U V', 9: '9 WXYZ, W X Y Z', 0: '0 Space' } as Record<string, string>;
const press = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
function typeDigits(digits: string) {
  for (const d of digits) {
    if (d === '#') press('Next word');
    else press(KEY[d]!);
  }
}
const utterance = () => document.getElementById('utterance')!.textContent ?? '';
const announced = () => document.querySelector('[role="status"][aria-live="polite"].nl-sr-only')?.textContent ?? '';
/** The keys on the sentence card's key line. */
const keyLine = () => document.querySelector('.nl-speakbar__digits-end')?.textContent ?? '';

type Body = { codes: string[]; lattice: string[][]; beams?: string[][] };
function mockDecode(candidates: string[][] = [['i', 'need', 'waves']]) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url !== '/api/decode') return new Response('', { status: 404 });
    return new Response(JSON.stringify({ v: 1, candidates: candidates.map((words) => ({ words })), rejected: 0 }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  const bodies = (): Body[] => fetchMock.mock.calls.map((c) => JSON.parse((c as unknown as [string, RequestInit])[1].body as string));
  return { fetchMock, bodies };
}
/** Let the 400 ms ranking debounce (LLM_DEBOUNCE_MS) run out, with real timers. */
const pastDebounce = () => act(() => new Promise((r) => setTimeout(r, 900)));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('plan bug 1: model ranking after a pin (engine.md §2)', () => {
  it('after # pins the last word, ranking is still requested with that word as a one-word lattice', async () => {
    const d = mockDecode([['i', 'need', 'water']]);
    render(<CommunicationScreen initialDict={miniDict()} initialSettings={{ llm: true, acceptDelayMs: 0 }} />);
    typeDigits('4063330928370'); // i need water, closed (model and offline agree)
    await waitFor(() => expect(d.fetchMock).toHaveBeenCalled(), { timeout: 2000 });
    const before = d.fetchMock.mock.calls.length;
    typeDigits('#'); // water -> waves, pinned
    await waitFor(() => expect(d.fetchMock.mock.calls.length).toBeGreaterThan(before), { timeout: 2000 });
    const last = d.bodies().at(-1)!;
    expect(last.codes).toEqual(['4', '6333', '92837']);
    expect(last.lattice[2]).toEqual(['waves']);
    // The words not pinned keep their full lattice.
    expect(last.lattice[1]).toContain('need');
    expect(last.lattice[1]!.length).toBeGreaterThan(1);
  });

  it('after choosing a sentence and typing on, ranking is still requested with each chosen word as a one-word lattice', async () => {
    const d = mockDecode([['i', 'need', 'waves', 'as']]);
    render(<CommunicationScreen initialDict={miniDict()} initialSettings={{ llm: true, acceptDelayMs: 0 }} />);
    typeDigits('4063330928370');
    fireEvent.click(screen.getByRole('button', { name: /Sentence 2: I need waves/ }));
    typeDigits('270'); // "as", closed: the chosen words become pins
    await waitFor(() => expect(d.bodies().some((b) => b.codes.length === 4)).toBe(true), { timeout: 2000 });
    const last = d.bodies().filter((b) => b.codes.length === 4).at(-1)!;
    expect(last.lattice.slice(0, 3)).toEqual([['i'], ['need'], ['waves']]);
    expect(last.lattice[3]).toContain('as');
    // The model's sentence agrees with the pins, so it is shown.
    await waitFor(() => expect(utterance()).toContain('I need waves as'));
  });

  it('a model sentence that disagrees with a pin is still never shown', async () => {
    const d = mockDecode([['i', 'need', 'water']]);
    render(<CommunicationScreen initialDict={miniDict()} initialSettings={{ llm: true, acceptDelayMs: 0 }} />);
    typeDigits('4063330928370#'); // waves pinned
    await waitFor(() => expect(d.fetchMock).toHaveBeenCalled(), { timeout: 2000 });
    await pastDebounce();
    expect(utterance()).toContain('I need waves');
    expect(utterance()).not.toContain('water');
  });
});

describe('plan bug 2: ranking timing around an open word (engine.md §6, Requirement 30)', () => {
  const wait = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));

  it('while the last word is open and keys keep coming, nothing is sent', async () => {
    const d = mockDecode([['i', 'need', 'water']]);
    render(<CommunicationScreen initialDict={miniDict()} initialSettings={{ llm: true, acceptDelayMs: 0 }} />);
    typeDigits('406333092');
    // Keys keep coming, 500 ms apart: longer than the 400 ms debounce, shorter than the 1,000 ms idle wait.
    for (const k of '837') {
      await wait(500);
      typeDigits(k);
    }
    await wait(500);
    expect(d.fetchMock).not.toHaveBeenCalled();
  });

  it('after Space closes the word, a request follows the normal debounce (about 400 ms)', async () => {
    const d = mockDecode([['i', 'need', 'water']]);
    render(<CommunicationScreen initialDict={miniDict()} initialSettings={{ llm: true, acceptDelayMs: 0 }} />);
    typeDigits('4063330928370');
    const t0 = Date.now();
    await waitFor(() => expect(d.fetchMock).toHaveBeenCalledTimes(1), { timeout: 900, interval: 20 });
    expect(Date.now() - t0).toBeLessThan(850);
    expect(d.bodies()[0]!.codes).toEqual(['4', '6333', '92837']);
  });

  it('an open last word left alone for about 1,000 ms is ranked too, without pressing 0', async () => {
    const d = mockDecode([['i', 'need', 'water']]);
    render(<CommunicationScreen initialDict={miniDict()} initialSettings={{ llm: true, acceptDelayMs: 0 }} />);
    typeDigits('406333092837');
    const t0 = Date.now();
    await wait(650); // past the 400 ms debounce: still nothing for an open word
    expect(d.fetchMock).not.toHaveBeenCalled();
    await waitFor(() => expect(d.fetchMock).toHaveBeenCalledTimes(1), { timeout: 1500, interval: 20 });
    expect(Date.now() - t0).toBeGreaterThanOrEqual(900);
    expect(d.bodies()[0]!.codes).toEqual(['4', '6333', '92837']);
  });
});

describe('plan bug 3: a refused key or word is announced (engine.md "Fragile", composer.ts MAX_CODE / MAX_WORDS)', () => {
  it(`the ${MAX_CODE + 1}th key of a word is refused and announced`, async () => {
    render(<CommunicationScreen initialDict={miniDict()} initialSettings={{ acceptDelayMs: 0 }} />);
    typeDigits('23'.repeat(MAX_CODE / 2));
    await act(() => new Promise((r) => setTimeout(r, 60)));
    const quiet = announced();
    typeDigits('4');
    await waitFor(() => expect(announced()).not.toBe(quiet));
    expect(announced()).toMatch(/\b16\b|longest|too long|no more keys|full/i);
    expect(utterance()).toContain('23'.repeat(MAX_CODE / 2));
    expect(utterance()).not.toContain('23'.repeat(MAX_CODE / 2) + '4');
  });

  it(`the ${MAX_WORDS + 1}st word is refused and announced`, async () => {
    render(<CommunicationScreen initialDict={miniDict()} initialSettings={{ acceptDelayMs: 0 }} />);
    typeDigits('40'.repeat(MAX_WORDS));
    await act(() => new Promise((r) => setTimeout(r, 60)));
    const quiet = announced();
    typeDigits('6');
    await waitFor(() => expect(announced()).not.toBe(quiet));
    expect(announced()).toMatch(/\b20\b|longest|too long|no more words|full/i);
    // No 21st word was added: the sentence still has 20 words of "4".
    expect(utterance()).not.toMatch(/\b6\b/);
  });

  it('a key that is accepted announces no refusal', async () => {
    render(<CommunicationScreen initialDict={miniDict()} initialSettings={{ acceptDelayMs: 0 }} />);
    typeDigits('23'.repeat(MAX_CODE / 2 - 1) + '2');
    await act(() => new Promise((r) => setTimeout(r, 60)));
    expect(announced()).not.toMatch(/longest|too long|no more keys|refused/i);
  });
});

describe('plan bug 4: an ignored fast repeat press is shown and announced (app-ux.md polish 4)', () => {
  /** Date.now steps by `ms` per call, so two presses land `ms` apart. */
  const clock = (ms: number) => vi.spyOn(Date, 'now').mockImplementation(((t = 1_000_000) => () => (t += ms))());
  /** Everything a sighted person sees: the page without the screen-reader-only regions. */
  const visible = () => {
    const c = document.body.cloneNode(true) as HTMLElement;
    c.querySelectorAll('.nl-sr-only').forEach((n) => n.remove());
    return c.innerHTML;
  };

  it('a second press of the same key inside the accept delay is ignored, marked and announced', async () => {
    clock(20);
    render(<CommunicationScreen initialDict={miniDict()} initialSettings={{ acceptDelayMs: 150 }} />);
    typeDigits('4');
    await act(() => new Promise((r) => setTimeout(r, 60)));
    const seen = visible();
    const quiet = announced();
    typeDigits('4'); // 20 ms later: a tremor repeat
    // Not typed: one key, not two.
    expect(keyLine()).not.toContain('44');
    // Something visible marks the ignored press.
    await waitFor(() => expect(visible()).not.toBe(seen));
    // And it is announced.
    await waitFor(() => expect(announced()).not.toBe(quiet));
    expect(announced()).toMatch(/ignored|too (quick|fast|soon)|again|repeat/i);
  });

  it('a repeat after the accept delay is typed with no ignored mark', async () => {
    clock(400);
    render(<CommunicationScreen initialDict={miniDict()} initialSettings={{ acceptDelayMs: 150 }} />);
    typeDigits('44');
    await act(() => new Promise((r) => setTimeout(r, 60)));
    expect(keyLine()).toContain('44');
    expect(announced()).not.toMatch(/ignored/i);
  });

  it('a fast press of a different key is typed (only a repeat of the same key is a tremor)', async () => {
    clock(20);
    render(<CommunicationScreen initialDict={miniDict()} initialSettings={{ acceptDelayMs: 150 }} />);
    typeDigits('43');
    expect(keyLine()).toContain('43');
  });
});

