/** The partner strip on the screen (web-ui Req 33.1-33.4). */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunicationScreen } from '@/components/CommunicationScreen';
import { conversationStore } from '@/lib/conversation';
import { DEFAULT_SETTINGS, sanitizeSettings } from '@/lib/settings';
import { miniDict } from './fixtures';

const KEY = { 4: '4 GHI, G H I', 6: '6 MNO, M N O', 3: '3 DEF, D E F', 9: '9 WXYZ, W X Y Z', 2: '2 ABC, A B C', 8: '8 TUV, T U V', 7: '7 PQRS, P Q R S', 0: '0 Space' } as Record<string, string>;
const type = (s: string) => {
  for (const d of s) fireEvent.click(screen.getByRole('button', { name: KEY[d]! }));
};
const strip = () => document.querySelector('[data-section="partner"]');

beforeEach(() => {
  vi.spyOn(Date, 'now').mockImplementation(((t = 0) => () => (t += 1000))());
  act(() => conversationStore.dispatch({ type: 'clear' }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('partner strip (Req 33)', () => {
  it('33.1 off by default, and unknown values sanitise to off', () => {
    expect(DEFAULT_SETTINGS.partnerStrip).toBe('off');
    expect(sanitizeSettings({ partnerStrip: 'loud' }).partnerStrip).toBe('off');
    expect(sanitizeSettings({ partnerStrip: 'upright' }).partnerStrip).toBe('upright');
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" />);
    type('4');
    expect(strip()).toBeNull();
  });

  it('33.2, 33.3 Typing… while typing (never the words), then what was said; turned when facing', async () => {
    const speak = vi.fn((u: { onend?: () => void }) => u.onend?.());
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => [{ voiceURI: 'v', name: 'v', lang: 'en-US', localService: true, default: true }], addEventListener: vi.fn(), removeEventListener: vi.fn(), paused: false });
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" initialSettings={{ partnerStrip: 'facing' }} />);
    expect(strip()!.textContent).toBe('');
    for (const d of '4063330928') {
      type(d);
      const t = strip()!.textContent ?? '';
      expect(t).toBe('Typing…');
    }
    type('37');
    expect(strip()!.hasAttribute('data-flipped')).toBe(true);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Speak' }));
    });
    expect(strip()!.textContent).toBe('I need water');
    type('4');
    expect(strip()!.textContent).toBe('Typing…');
  });

  it('33.4 no controls and no live region', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" initialSettings={{ partnerStrip: 'upright' }} />);
    type('4');
    const s = strip()!;
    expect(s.querySelector('button, a, input, [tabindex]')).toBeNull();
    expect(s.closest('[aria-live]')).toBeNull();
    expect(s.getAttribute('aria-live')).toBeNull();
    expect(s.hasAttribute('data-flipped')).toBe(false);
  });

  it('their line empties it', () => {
    render(<CommunicationScreen initialDict={miniDict()} layout="wide" initialSettings={{ partnerStrip: 'upright' }} />);
    act(() => conversationStore.dispatch({ type: 'add', who: 'me', text: 'Hello.', via: 'keys', at: Date.now() }));
    expect(strip()!.textContent).toBe('Hello.');
    act(() => conversationStore.dispatch({ type: 'add', who: 'them', text: 'Hi there', via: 'typed', at: Date.now() }));
    expect(strip()!.textContent).toBe('');
  });
});
