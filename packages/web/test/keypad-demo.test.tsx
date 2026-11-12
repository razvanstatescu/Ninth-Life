// The hero demo (marketing-site design.md "KeypadDemo changes", "Test plan" keypad-demo.test.tsx):
// fake timers, a mocked matchMedia, IntersectionObserver and speech engine.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTOPLAY_DELAY_FALLBACK_MS, DEMO_STEP_FALLBACK_MS, KeypadDemo } from '@/components/site/KeypadDemo';
import { MOTION_QUERY, msToken } from '@/components/site/motion';
import { getDemoData } from '@/components/site/site-data';

const tokens = JSON.parse(readFileSync(resolve(__dirname, '../../../design/system/tokens.json'), 'utf8'));
const tokenValue = (name: string): string => tokens.motion.tokens.find((t: { name: string }) => t.name === name).value;

const demo = getDemoData();
const STEP = DEMO_STEP_FALLBACK_MS;
const AUTOPLAY = AUTOPLAY_DELAY_FALLBACK_MS;
/** Time from the start of a play to its finished frame: one step per press after the first. */
const PLAY_MS = (demo.steps.length - 1) * STEP;

function mockMotion(noPreference: boolean) {
  const listeners = new Set<() => void>();
  const mq = {
    matches: noPreference,
    media: MOTION_QUERY,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  vi.stubGlobal('matchMedia', vi.fn(() => mq));
  return {
    set(value: boolean) {
      mq.matches = value;
      act(() => {
        for (const fn of [...listeners]) fn();
      });
    },
  };
}

class FakeObserver {
  static all: FakeObserver[] = [];
  target: Element | null = null;
  constructor(
    public callback: IntersectionObserverCallback,
    public options?: IntersectionObserverInit,
  ) {
    FakeObserver.all.push(this);
  }
  observe(el: Element) {
    this.target = el;
  }
  unobserve() {}
  disconnect() {
    this.target = null;
  }
  takeRecords() {
    return [];
  }
}
/** Report the demo `ratio` in view. */
function inView(ratio: number) {
  const io = FakeObserver.all[FakeObserver.all.length - 1]!;
  act(() => {
    io.callback(
      [{ target: io.target!, intersectionRatio: ratio, isIntersecting: ratio > 0 } as unknown as IntersectionObserverEntry],
      io as unknown as IntersectionObserver,
    );
  });
}

class FakeUtterance {
  voice: unknown = null;
  lang = '';
  rate = 1;
  pitch = 1;
  onstart: unknown = null;
  onend: unknown = null;
  onerror: unknown = null;
  constructor(public text: string) {}
}
function mockSpeech(voices: object[] = []) {
  const synth = { getVoices: () => voices, speak: vi.fn(), cancel: vi.fn(), resume: vi.fn(), speaking: false, pending: false, paused: false };
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return synth;
}

const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const root = () => document.querySelector('.site-demo') as HTMLElement;
const playButton = () => document.querySelector('.site-demo__foot button') as HTMLButtonElement;
const label = () => document.querySelector('.site-demo__label')!.textContent;
const sentence = () => document.querySelector('.site-demo__text')!.textContent;
const keys = () => document.querySelector('.site-demo__keys')!.textContent;
const status = () => document.querySelector('.site-demo [role="status"]')!.textContent;
const hearButton = () => screen.queryByRole('button', { name: 'Hear it' }) as HTMLButtonElement | null;
const FINISHED = 'I need water';

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeObserver.all = [];
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  setHidden(false);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (document as unknown as Record<string, unknown>).visibilityState;
});

describe('KeypadDemo', () => {
  it('MS-6.2 shows the finished frame first, with a match chip per word and "Play the example"', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    expect(sentence()).toBe(FINISHED);
    expect(keys()).toBe('Keys: 4 6333 92837');
    expect(document.querySelectorAll('.site-demo__slot > [data-state="match"]')).toHaveLength(3);
    expect(label()).toBe('Play the example');
    expect(screen.getByRole('button', { name: 'Play the example' })).toBe(playButton());
  });

  it('MS-6.3 plays once on its own after 1,200 ms at 60% in view, and never again', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    expect(FakeObserver.all[0]!.options).toEqual({ threshold: [0, 0.1, 0.6] });
    inView(0.6);
    tick(AUTOPLAY - 1);
    expect(label()).toBe('Play the example');
    tick(1);
    expect(label()).toBe('Stop');
    expect(sentence()).not.toBe(FINISHED);
    tick(PLAY_MS);
    expect(label()).toBe('Play the example again');
    expect(sentence()).toBe(FINISHED);
    inView(0);
    inView(0.6);
    tick(AUTOPLAY * 3);
    expect(label()).toBe('Play the example again');
    expect(root().classList.contains('is-playing')).toBe(false);
  });

  it('MS-6.3 the timer restarts when the demo drops under 60% before it fires', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    inView(0.6);
    tick(AUTOPLAY - 100);
    inView(0.3);
    tick(AUTOPLAY);
    expect(label()).toBe('Play the example');
    inView(0.6);
    tick(AUTOPLAY);
    expect(label()).toBe('Stop');
  });

  it('MS-6.3 does not play on its own after the visitor pressed Play or Stop', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    fireEvent.click(playButton());
    expect(label()).toBe('Stop');
    fireEvent.click(playButton());
    expect(label()).toBe('Play the example again');
    inView(0.6);
    tick(AUTOPLAY * 2);
    expect(label()).toBe('Play the example again');
  });

  it('MS-6.3 a press while the autoplay timer is pending cancels it', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    inView(0.6);
    tick(AUTOPLAY / 2);
    fireEvent.click(playButton());
    tick(PLAY_MS);
    expect(label()).toBe('Play the example again');
    tick(AUTOPLAY * 2);
    expect(label()).toBe('Play the example again');
  });

  it('MS-6.3 does not play on its own while the page is hidden', () => {
    mockMotion(true);
    setHidden(true);
    render(<KeypadDemo data={demo} />);
    inView(1);
    tick(AUTOPLAY * 2);
    expect(label()).toBe('Play the example');
  });

  it('MS-6.3 with no IntersectionObserver there is no autoplay, and Play works', () => {
    mockMotion(true);
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<KeypadDemo data={demo} />);
    tick(AUTOPLAY * 3);
    expect(label()).toBe('Play the example');
    fireEvent.click(playButton());
    expect(label()).toBe('Stop');
    tick(PLAY_MS);
    expect(sentence()).toBe(FINISHED);
  });

  it('MS-6.4 reads "Stop" while playing; Stop shows the finished frame', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    fireEvent.click(playButton());
    tick(STEP * 3);
    expect(screen.getByRole('button', { name: 'Stop' })).toBe(playButton());
    expect(sentence()).not.toBe(FINISHED);
    fireEvent.click(playButton());
    expect(sentence()).toBe(FINISHED);
    expect(keys()).toBe('Keys: 4 6333 92837');
    expect(document.querySelectorAll('.site-demo__slot > [data-state="match"]')).toHaveLength(3);
    expect(label()).toBe('Play the example again');
    tick(PLAY_MS);
    expect(sentence()).toBe(FINISHED);
  });

  it('MS-6.4 falling under 10% in view, a hidden page and a change to reduce each stop on the finished frame', () => {
    const motion = mockMotion(true);
    render(<KeypadDemo data={demo} />);
    inView(1);

    fireEvent.click(playButton());
    tick(STEP * 2);
    inView(0.05);
    expect(sentence()).toBe(FINISHED);
    expect(label()).toBe('Play the example again');

    inView(1);
    fireEvent.click(playButton());
    tick(STEP * 2);
    setHidden(true);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(sentence()).toBe(FINISHED);
    expect(label()).toBe('Play the example again');
    setHidden(false);

    fireEvent.click(playButton());
    tick(STEP * 2);
    motion.set(false);
    expect(sentence()).toBe(FINISHED);
    expect(label()).toBe('Play the example again');
  });

  it('MS-6.5 at most one key carries the pressed ring at a time, never the lit style', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    expect(document.querySelectorAll('.site-key.is-pressed')).toHaveLength(0);
    fireEvent.click(playButton());
    for (let i = 0; i < demo.steps.length; i += 1) {
      const pressed = document.querySelectorAll('.site-demo .site-key.is-pressed');
      expect(pressed.length).toBeLessThanOrEqual(1);
      if (label() === 'Stop') expect(pressed).toHaveLength(1);
      expect(document.querySelectorAll('.site-demo .is-lit')).toHaveLength(0);
      tick(STEP);
    }
    expect(document.querySelectorAll('.site-key.is-pressed')).toHaveLength(0);
  });

  it('MS-6.6 announces after a play the visitor started, and never after an automatic play', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    inView(1);
    tick(AUTOPLAY);
    expect(label()).toBe('Stop');
    tick(PLAY_MS);
    expect(label()).toBe('Play the example again');
    expect(status()).toBe('');

    fireEvent.click(playButton());
    expect(status()).toBe('');
    tick(PLAY_MS);
    expect(status()).toBe('Typed 4 6333 92837. Ninth Life shows: I need water.');
    expect(document.querySelector('.site-demo [role="status"]')!.getAttribute('aria-live')).toBe('polite');

    fireEvent.click(playButton());
    expect(status()).toBe('');
    fireEvent.click(playButton());
    expect(status()).toBe('');
  });

  it('MS-6.7 Hear it is aria-disabled while playing, stays focusable, ignores presses, and speaks the sentence in English, in the click', () => {
    mockMotion(true);
    const synth = mockSpeech([
      { voiceURI: 'ro', name: 'Voice R', lang: 'ro-RO', localService: true, default: true },
      { voiceURI: 'en', name: 'Voice E', lang: 'en-GB', localService: true, default: false },
    ]);
    render(<KeypadDemo data={demo} />);
    const hear = hearButton()!;
    expect(hear).not.toBeNull();
    expect(hear.hasAttribute('aria-disabled')).toBe(false);
    fireEvent.click(playButton());
    // Still a focusable, enabled button (it keeps its place in the Tab order), marked aria-disabled.
    expect(hearButton()!.disabled).toBe(false);
    expect(hearButton()!.getAttribute('aria-disabled')).toBe('true');
    hearButton()!.focus();
    expect(document.activeElement).toBe(hearButton());
    fireEvent.click(hearButton()!);
    expect(synth.speak).not.toHaveBeenCalled();
    tick(PLAY_MS);
    expect(hearButton()!.hasAttribute('aria-disabled')).toBe(false);
    fireEvent.click(hearButton()!);
    expect(synth.speak).toHaveBeenCalledTimes(1);
    const u = synth.speak.mock.calls[0]![0] as FakeUtterance;
    expect(u.text).toBe('I need water.');
    expect((u.voice as { voiceURI: string }).voiceURI).toBe('en');
    expect(u.lang).toBe('en-GB');
    expect(document.querySelector('.site-demo')!.textContent).not.toMatch(/Voice [RE]/);
  });

  it('MS-6.7 with no voices, Hear it still speaks with lang "en"', () => {
    mockMotion(true);
    const synth = mockSpeech([]);
    render(<KeypadDemo data={demo} />);
    fireEvent.click(hearButton()!);
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect((synth.speak.mock.calls[0]![0] as FakeUtterance).lang).toBe('en');
  });

  it('MS-6.7 there is no Hear it button without a speech engine', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    expect(hearButton()).toBeNull();
  });

  it('MS-6.8 with reduced motion: no autoplay, Play still steps, and a play still stops under 10% in view', () => {
    mockMotion(false);
    render(<KeypadDemo data={demo} />);
    inView(1);
    tick(AUTOPLAY * 3);
    expect(label()).toBe('Play the example');
    fireEvent.click(playButton());
    const pressedDigit = () => document.querySelector('.site-demo .site-key.is-pressed .nl-key__digit')!.textContent;
    expect(pressedDigit()).toBe(demo.steps[0]!.key);
    tick(STEP);
    expect(pressedDigit()).toBe(demo.steps[1]!.key);
    expect(demo.steps[1]!.key).not.toBe(demo.steps[0]!.key);
    expect(label()).toBe('Stop');
    inView(0.05);
    expect(sentence()).toBe(FINISHED);
    expect(label()).toBe('Play the example again');
  });

  it('MS-6.9 key 9 keeps site-key--ninth through a whole play; is-playing is set only while playing', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    const ninth = () => [...document.querySelectorAll('.site-demo .site-key--ninth')];
    const check = () => {
      expect(ninth()).toHaveLength(1);
      expect(ninth()[0]!.querySelector('.nl-key__digit')!.textContent).toBe('9');
    };
    check();
    expect(root().classList.contains('is-playing')).toBe(false);
    fireEvent.click(playButton());
    for (let i = 0; i < demo.steps.length - 1; i += 1) {
      check();
      expect(root().classList.contains('is-playing')).toBe(true);
      tick(STEP);
    }
    check();
    expect(root().classList.contains('is-playing')).toBe(false);
  });

  it('MS-6.10 hidden sizer copies hold the finished frame and every button label', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    const ghosts = [...document.querySelectorAll('.site-demo .site-sizer__ghost')];
    for (const g of ghosts) expect(g.getAttribute('aria-hidden')).toBe('true');
    const texts = ghosts.map((g) => g.textContent);
    expect(texts).toContain(FINISHED);
    expect(texts).toContain('4 6333 92837');
    for (const l of ['Play the example', 'Play the example again', 'Stop']) expect(texts).toContain(l);
    expect(document.querySelectorAll('.site-demo__chip-ghost [data-state="match"]')).toHaveLength(3);
  });

  it('MS-6.10 every chip keeps a fixed slot, sized by its finished chip, for the whole play', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    const slots = () => [...document.querySelectorAll('.site-demo__chips > li.site-demo__slot')];
    expect(slots()).toHaveLength(3);
    fireEvent.click(playButton());
    for (let i = 0; i < demo.steps.length; i++) {
      const s = slots();
      expect(s).toHaveLength(3);
      const typed = demo.steps[Math.min(i, demo.steps.length - 1)]!.codes.length;
      s.forEach((slot, j) => {
        expect(slot.querySelector('.site-demo__chip-ghost [data-state="match"]')).not.toBeNull();
        // A slot whose word is not typed yet holds no live chip and is hidden from screen readers.
        if (j >= typed) {
          expect(slot.querySelector(':scope > [data-state]')).toBeNull();
          expect(slot.getAttribute('aria-hidden')).toBe('true');
        } else expect(slot.hasAttribute('aria-hidden')).toBe(false);
      });
      tick(STEP);
    }
  });

  it('MS-8.2 the fallbacks equal the motion-demo-step and motion-autoplay-delay tokens', () => {
    expect(DEMO_STEP_FALLBACK_MS).toBe(msToken(tokenValue('motion-demo-step')));
    expect(AUTOPLAY_DELAY_FALLBACK_MS).toBe(msToken(tokenValue('motion-autoplay-delay')));
  });
});
