import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunicationScreen } from '@/components/CommunicationScreen';
import { miniDict } from './fixtures';

function press(label: string, times = 1) {
  for (let i = 0; i < times; i++) fireEvent.click(screen.getByRole('button', { name: label }));
}
const KEY = { 2: '2, A B C', 3: '3, D E F', 4: '4, G H I', 6: '6, M N O', 7: '7, P Q R S', 8: '8, T U V', 9: '9, W X Y Z', 0: '0, space' } as Record<string, string>;
function typeDigits(digits: string) {
  for (const d of digits) {
    if (d === '#') press('Next word');
    else press(KEY[d]!);
  }
}
const utterance = () => document.getElementById('utterance')!.textContent ?? '';

beforeEach(() => {
  // Each press is a new key, but the accept delay would drop a quick repeat of the same key.
  vi.spyOn(Date, 'now').mockImplementation(((t = 0) => () => (t += 1000))());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CommunicationScreen (ghost mode)', () => {
  it('types "I need water" and shows candidates and proof', () => {
    render(<CommunicationScreen initialDict={miniDict()} />);
    expect(utterance()).toBe('Press a key to start');
    typeDigits('406333092837');
    expect(utterance()).toContain('I need water');
    expect(utterance()).toContain('4 6333 92837');
    const list = screen.getByRole('region', { name: 'Sentences for your keys' });
    const rows = within(list).getAllByRole('button');
    expect(rows[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(rows.some((r) => r.textContent?.includes('Sentence 2: I need waves'))).toBe(true);
    const proof = screen.getByRole('region', { name: 'Proof' });
    expect(proof.querySelectorAll('.nl-chip--match')).toHaveLength(3);
  });

  it('# cycles the last word; choosing a row does not speak', () => {
    const speak = vi.fn();
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => [], addEventListener: vi.fn(), removeEventListener: vi.fn(), paused: false });
    render(<CommunicationScreen initialDict={miniDict()} />);
    typeDigits('406333092837#');
    expect(utterance()).toContain('I need waves');
    fireEvent.click(screen.getByRole('button', { name: /Sentence 1/ }));
    expect(speak).not.toHaveBeenCalled();
  });

  it('Speak without a voice opens big-text show mode', async () => {
    render(<CommunicationScreen initialDict={miniDict()} />);
    typeDigits('406333092837');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Speak' }));
    });
    const show = document.querySelector('dialog.show')!;
    expect(show.hasAttribute('open')).toBe(true);
    expect(show.textContent).toContain('I need water');
    expect(show.textContent).toContain('No voice is available');
  });

  it('physical keyboard: digits, Backspace, Space and Alt+2', () => {
    render(<CommunicationScreen initialDict={miniDict()} />);
    for (const k of ['4', ' ', '6', '3', '3', '3', ' ', '9', '2', '8', '3', '7']) fireEvent.keyDown(window, { key: k, code: k === ' ' ? 'Space' : `Digit${k}` });
    expect(utterance()).toContain('I need water');
    fireEvent.keyDown(window, { key: '2', code: 'Digit2', altKey: true });
    expect(utterance()).toContain('I need waves');
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(utterance()).not.toContain('waves');
  });

  it('shows "Dictionary not loaded" when the files are missing', () => {
    render(<CommunicationScreen initialDict={{ status: 'missing' }} />);
    expect(screen.getAllByText(/Dictionary not loaded/).length).toBeGreaterThan(0);
    typeDigits('4663');
    expect(utterance()).toContain('4663');
    expect((screen.getByRole('button', { name: 'Speak' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the offline indicator', async () => {
    render(<CommunicationScreen initialDict={miniDict()} />);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await act(async () => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText('Offline. Using your dictionary.')).toBeTruthy();
  });

  it('model ranking: re-checks suggestions, shows the dropped word, never speaks on its own', async () => {
    const speak = vi.fn();
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => [], addEventListener: vi.fn(), removeEventListener: vi.fn(), paused: false });
    const fetchMock = vi.fn(async (url: string) => {
      if (url !== '/api/decode') return new Response('', { status: 404 });
      return new Response(JSON.stringify({ v: 1, candidates: [{ words: ['i', 'need', 'waves'] }, { words: ['i', 'need', 'wafer'] }], rejected: 0 }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(Date.now).mockRestore();
    render(<CommunicationScreen initialDict={miniDict()} initialSettings={{ llm: true, acceptDelayMs: 0 }} />);
    typeDigits('406333092837');
    await waitFor(() => expect(fetchMock).toHaveBeenCalled(), { timeout: 2000 });
    await waitFor(() => expect(utterance()).toContain('I need waves'));
    const proof = screen.getByRole('region', { name: 'Proof' });
    expect(proof.querySelector('.nl-chip--reject')?.textContent).toContain('wafer');
    expect(proof.textContent).toContain('so wafer was dropped and will not be spoken');
    expect(speak).not.toHaveBeenCalled();
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(Object.keys(body).sort()).toEqual(['beams', 'codes', 'context', 'k', 'lang', 'lattice', 'mode', 'v']);
  });
});
