// The hero demo (marketing-site design.md "KeypadDemo changes", "Round 4: the hero demo", "Test plan"
// keypad-demo.test.tsx): fake timers, a mocked matchMedia, IntersectionObserver and speech engine. The try-it tests
// (W4) run on real timers with fetch stubbed to read the real files in public/data, so they exercise the app's own
// decoder. Round 4 (2026-11-13, Claude Code): the sentence is the card's proof chips (each word over its keys), the
// result line is read from the live region, and the controls are three icon buttons whose names are their tooltips.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTOPLAY_DELAY_FALLBACK_MS,
  DEMO_STEP_FALLBACK_MS,
  KeypadDemo,
  LABEL_PLAY,
  LABEL_STOP,
  TOOLS_IN_VIEW,
  TRY_ANNOUNCE_MS,
  TRY_COPY,
  tryHint,
  tryLine,
  tryStatus,
} from '@/components/site/KeypadDemo';
import { clear, press, view, type TryView } from '@/components/site/try-engine';
import { EMPTY } from '@/lib/composer';
import { miniDict } from './fixtures';
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
  report(ratio: number) {
    act(() => {
      this.callback(
        [{ target: this.target!, intersectionRatio: ratio, isIntersecting: ratio > 0 } as unknown as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    });
  }
}
/** The live observer watching `selector`. */
const observerOf = (selector: string) => FakeObserver.all.filter((o) => o.target?.matches(selector)).at(-1)!;
/**
 * Report the demo `ratio` in view, and its toolbar `tools` in view (round 4: by default wholly on screen when the demo
 * is at least 60% in view, which is where it sits on a phone scrolled to the keypad).
 */
function inView(ratio: number, tools = ratio >= 0.6 ? 1 : 0) {
  observerOf('.site-demo').report(ratio);
  observerOf('.site-demo__tools').report(tools);
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
const playButton = () => document.querySelector('.site-demo__play') as HTMLButtonElement;
const clearButton = () => document.querySelector('.site-demo__clear') as HTMLButtonElement;
const label = () => document.querySelector('.site-demo__label')!.textContent;
/** The chips the card shows (not the hidden copies that size the example's slots). */
const shownChips = () => [...document.querySelectorAll('.site-demo__card .nl-chip')].filter((c) => !c.closest('.site-sizer__ghost'));
/** The sentence the card shows: its chips' words, in order. */
const sentence = () => shownChips().map((c) => c.querySelector('.nl-chip__word')!.textContent).join(' ');
/** The keys the card shows: one code per chip, in order. */
const keys = () => shownChips().map((c) => (c.querySelector('.nl-chip__code') ?? c.querySelector('.nl-chip__digits'))!.textContent).join(' ');
/** The card's hint while no word is typed. */
const hint = () => document.querySelector('.site-demo__hint')?.textContent ?? '';
/** The status line under the card. */
const statusLine = () => document.querySelector('.site-demo__status')!.textContent ?? '';
/** The polite live region. */
const status = () => document.querySelector('.site-demo [role="status"]')!.textContent ?? '';
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
  it('MS-6.2 shows the finished frame first: a match chip per word, each word over its keys, and "Play the example"', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    expect(sentence()).toBe(FINISHED);
    expect(keys()).toBe('4 6333 92837');
    expect(document.querySelectorAll('.site-demo__slot > [data-state="match"]')).toHaveLength(3);
    expect(screen.getByRole('list', { name: 'Proof check' })).not.toBeNull();
    expect(label()).toBe(LABEL_PLAY);
    expect(screen.getByRole('button', { name: LABEL_PLAY })).toBe(playButton());
    // Round 4: no caption, no check label, no visible button words; the keypad's description holds the example.
    expect(document.querySelector('.site-demo__caption, .site-demo__check, .site-demo__foot')).toBeNull();
    expect(document.getElementById('site-demo-desc')!.textContent).toBe(
      'One press per letter: 4, 0, 6 3 3 3, 0, 9 2 8 3 7 types “I need water”. 0 is space. Press the keys to try your own words. Your keyboard works too.',
    );
    expect(document.querySelector('.site-demo [role="group"]')!.getAttribute('aria-describedby')).toBe('site-demo-desc');
  });

  it('MS-6.2 the status line invites a press once the keys work', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    expect(statusLine()).toBe(TRY_COPY.invite);
  });

  it('MS-6.3 plays once on its own after 1,200 ms at 60% in view with its toolbar on screen, and never again', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    expect(observerOf('.site-demo').options).toEqual({ threshold: [0, 0.1, 0.6] });
    expect(observerOf('.site-demo__tools').options).toEqual({ threshold: [0, TOOLS_IN_VIEW] });
    inView(0.6);
    tick(AUTOPLAY - 1);
    expect(label()).toBe(LABEL_PLAY);
    tick(1);
    expect(label()).toBe(LABEL_STOP);
    expect(sentence()).not.toBe(FINISHED);
    tick(PLAY_MS);
    expect(label()).toBe(LABEL_PLAY);
    expect(sentence()).toBe(FINISHED);
    inView(0);
    inView(0.6);
    tick(AUTOPLAY * 3);
    expect(label()).toBe(LABEL_PLAY);
    expect(root().classList.contains('is-playing')).toBe(false);
  });

  it('MS-6.3 (round 4) waits while its toolbar, and so its Stop, is not wholly on screen', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    inView(0.8, 0.5);
    tick(AUTOPLAY * 3);
    expect(label()).toBe(LABEL_PLAY);
    observerOf('.site-demo__tools').report(1);
    tick(AUTOPLAY);
    expect(label()).toBe(LABEL_STOP);
  });

  it('MS-6.3 (round 4) an automatic play stops on the finished frame when its Stop leaves the screen; a person’s play does not', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    inView(1);
    tick(AUTOPLAY);
    expect(label()).toBe(LABEL_STOP);
    tick(STEP * 2);
    observerOf('.site-demo__tools').report(0.4);
    expect(label()).toBe(LABEL_PLAY);
    expect(sentence()).toBe(FINISHED);
    expect(status()).toBe('');

    observerOf('.site-demo__tools').report(1);
    fireEvent.click(playButton());
    tick(STEP * 2);
    observerOf('.site-demo__tools').report(0.4);
    expect(label()).toBe(LABEL_STOP);
  });

  it('MS-6.3 the timer restarts when the demo drops under 60% before it fires', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    inView(0.6);
    tick(AUTOPLAY - 100);
    inView(0.3);
    tick(AUTOPLAY);
    expect(label()).toBe(LABEL_PLAY);
    inView(0.6);
    tick(AUTOPLAY);
    expect(label()).toBe(LABEL_STOP);
  });

  it('MS-6.3 does not play on its own after the visitor pressed Play or Stop', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    fireEvent.click(playButton());
    expect(label()).toBe(LABEL_STOP);
    fireEvent.click(playButton());
    expect(label()).toBe(LABEL_PLAY);
    inView(0.6);
    tick(AUTOPLAY * 2);
    expect(label()).toBe(LABEL_PLAY);
  });

  it('MS-6.3 a press while the autoplay timer is pending cancels it', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    inView(0.6);
    tick(AUTOPLAY / 2);
    fireEvent.click(playButton());
    tick(PLAY_MS);
    expect(label()).toBe(LABEL_PLAY);
    tick(AUTOPLAY * 2);
    expect(label()).toBe(LABEL_PLAY);
    expect(root().classList.contains('is-playing')).toBe(false);
  });

  it('MS-6.3 does not play on its own while the page is hidden', () => {
    mockMotion(true);
    setHidden(true);
    render(<KeypadDemo data={demo} />);
    inView(1);
    tick(AUTOPLAY * 2);
    expect(label()).toBe(LABEL_PLAY);
  });

  it('MS-6.3 with no IntersectionObserver there is no autoplay, and Play works', () => {
    mockMotion(true);
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<KeypadDemo data={demo} />);
    tick(AUTOPLAY * 3);
    expect(label()).toBe(LABEL_PLAY);
    fireEvent.click(playButton());
    expect(label()).toBe(LABEL_STOP);
    tick(PLAY_MS);
    expect(sentence()).toBe(FINISHED);
  });

  it('MS-6.4 reads "Stop" while playing, with the stop icon; Stop shows the finished frame', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    const replayIcon = playButton().querySelector('svg')!.innerHTML;
    fireEvent.click(playButton());
    tick(STEP * 3);
    expect(screen.getByRole('button', { name: LABEL_STOP })).toBe(playButton());
    expect(playButton().querySelector('svg')!.innerHTML).not.toBe(replayIcon);
    expect(sentence()).not.toBe(FINISHED);
    fireEvent.click(playButton());
    expect(sentence()).toBe(FINISHED);
    expect(keys()).toBe('4 6333 92837');
    expect(document.querySelectorAll('.site-demo__slot > [data-state="match"]')).toHaveLength(3);
    expect(label()).toBe(LABEL_PLAY);
    expect(playButton().querySelector('svg')!.innerHTML).toBe(replayIcon);
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
    expect(label()).toBe(LABEL_PLAY);

    inView(1);
    fireEvent.click(playButton());
    tick(STEP * 2);
    setHidden(true);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(sentence()).toBe(FINISHED);
    expect(label()).toBe(LABEL_PLAY);
    setHidden(false);

    fireEvent.click(playButton());
    tick(STEP * 2);
    motion.set(false);
    expect(sentence()).toBe(FINISHED);
    expect(label()).toBe(LABEL_PLAY);
  });

  it('MS-6.5 at most one key carries the pressed ring at a time, never the lit style', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    expect(document.querySelectorAll('.site-key.is-pressed')).toHaveLength(0);
    fireEvent.click(playButton());
    for (let i = 0; i < demo.steps.length; i += 1) {
      const pressed = document.querySelectorAll('.site-demo .site-key.is-pressed');
      expect(pressed.length).toBeLessThanOrEqual(1);
      if (label() === LABEL_STOP) expect(pressed).toHaveLength(1);
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
    expect(label()).toBe(LABEL_STOP);
    tick(PLAY_MS);
    expect(label()).toBe(LABEL_PLAY);
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

  it('MS-6.7 there is no Hear it button without a speech engine; Play and Clear keep their cells', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    expect(hearButton()).toBeNull();
    const cells = [...document.querySelectorAll('.site-demo__tools > button')].map((b) => b.className.split(' ').pop());
    expect(cells).toEqual(['site-demo__play', 'site-demo__clear']);
  });

  it('MS-6.8 with reduced motion: no autoplay, Play still steps, and a play still stops under 10% in view', () => {
    mockMotion(false);
    render(<KeypadDemo data={demo} />);
    inView(1);
    tick(AUTOPLAY * 3);
    expect(label()).toBe(LABEL_PLAY);
    expect(root().classList.contains('is-playing')).toBe(false);
    fireEvent.click(playButton());
    const pressedDigit = () => document.querySelector('.site-demo .site-key.is-pressed .nl-key__digit')!.textContent;
    expect(pressedDigit()).toBe(demo.steps[0]!.key);
    tick(STEP);
    expect(pressedDigit()).toBe(demo.steps[1]!.key);
    expect(demo.steps[1]!.key).not.toBe(demo.steps[0]!.key);
    expect(label()).toBe(LABEL_STOP);
    inView(0.05);
    expect(sentence()).toBe(FINISHED);
    expect(label()).toBe(LABEL_PLAY);
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

  it('MS-6.10 the only hidden copies are the finished chips that size the example’s slots', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    const ghosts = [...document.querySelectorAll('.site-demo .site-sizer__ghost')];
    expect(ghosts).toHaveLength(3);
    for (const g of ghosts) {
      expect(g.getAttribute('aria-hidden')).toBe('true');
      expect(g.classList.contains('site-demo__chip-ghost')).toBe(true);
    }
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

  it('MS-6.15 the toolbar: Play, Hear it and Clear in that order, each named by its own tooltip text', () => {
    mockMotion(true);
    mockSpeech([]);
    render(<KeypadDemo data={demo} />);
    const buttons = [...document.querySelectorAll('.site-demo__tools > button')] as HTMLButtonElement[];
    expect(buttons.map((b) => b.className.split(' ').pop())).toEqual(['site-demo__play', 'site-demo__hear', 'site-demo__clear']);
    for (const b of buttons) {
      expect(b.classList.contains('site-icon-btn')).toBe(true);
      expect(b.querySelector('svg.nl-icon')!.getAttribute('aria-hidden')).toBe('true');
      const tip = b.querySelector('.site-tip')!;
      // The tooltip is the button's own text, so its accessible name is the word on screen (WCAG 2.5.3).
      expect(screen.getByRole('button', { name: tip.textContent! })).toBe(b);
    }
    expect(buttons.map((b) => b.querySelector('.site-tip')!.textContent)).toEqual([LABEL_PLAY, 'Hear it', 'Clear']);
    expect(buttons[1]!.classList.contains('site-icon-btn--filled')).toBe(true);
  });

  it('MS-6.15 Escape hides the tooltips until focus moves on', () => {
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    playButton().focus();
    fireEvent.keyDown(playButton(), { key: 'Escape' });
    expect(root().hasAttribute('data-tips-off')).toBe(true);
    act(() => clearButton().focus());
    expect(root().hasAttribute('data-tips-off')).toBe(false);
  });

  it('MS-8.2 the fallbacks equal the motion-demo-step and motion-autoplay-delay tokens', () => {
    expect(DEMO_STEP_FALLBACK_MS).toBe(msToken(tokenValue('motion-demo-step')));
    expect(AUTOPLAY_DELAY_FALLBACK_MS).toBe(msToken(tokenValue('motion-autoplay-delay')));
  });
});

// ---- try it (W4, 2026-11-12, Claude Code; MS-6.11 to MS-6.16) -------------------------------------------
const DATA_DIR = resolve(__dirname, '../public/data');
/** fetch for /data/... served from public/data (the files the app ships); `missing` answers 404 for everything. */
function stubFetch({ missing = false } = {}) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      calls.push(url);
      if (missing || !url.startsWith('/data/')) return { ok: false, status: 404, json: async () => null };
      const text = readFileSync(resolve(DATA_DIR, url.slice('/data/'.length).replace(/\?.*$/, '')), 'utf8');
      return { ok: true, status: 200, json: async () => JSON.parse(text) as unknown };
    }),
  );
  return calls;
}
const tryKey = (id: string) => document.querySelector(`[data-try-key="${id}"]`) as HTMLButtonElement;
const liveChips = () =>
  [...document.querySelectorAll('.site-demo__chips:not(.site-sizer__ghost) > li > .nl-chip')].map(
    (c) => `${(c as HTMLElement).dataset.state}:${c.querySelector('.nl-chip__word')!.textContent}`,
  );
const pressAll = (keys: string) => {
  for (const k of keys) fireEvent.click(tryKey(k));
};
/** Waits for the live region's result line (it follows the last change by TRY_ANNOUNCE_MS). */
const result = (re: RegExp) => waitFor(() => expect(status()).toMatch(re), { timeout: 10000 });

describe('KeypadDemo try it (W4)', () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockMotion(false);
  });

  it('MS-6.11 nothing is fetched or imported before the first press; the first press loads the app dictionary', async () => {
    const calls = stubFetch();
    render(<KeypadDemo data={demo} />);
    expect(calls).toEqual([]);
    expect(statusLine()).toBe(TRY_COPY.invite);
    // The engine and the decoder are reached only through a dynamic import (no static import of them).
    const src = readFileSync(resolve(__dirname, '../components/site/KeypadDemo.tsx'), 'utf8');
    expect(src).toMatch(/import\('\.\/try-engine'\)/);
    expect(src).not.toMatch(/^import (?!type )[^;]*from '\.\/try-engine'/m);
    expect(src).not.toMatch(/^import [^;]*from '@\/lib\/(data|sentence|composer)'/m);
    expect(src).not.toMatch(/^import (?!type )[^;]*from '@ninth\/core'/m);
    fireEvent.click(tryKey('4'));
    await waitFor(() => expect(calls.length).toBe(3));
    expect(calls.map((u) => u.replace(/\?.*$/, '')).sort()).toEqual(['/data/lexicon/en.bigram.v1.json', '/data/lexicon/en.v2.json', '/data/packs/core-en.json']);
    pressAll('663');
    await result(/^Keys 4663 match: /);
    expect(calls).toHaveLength(3);
  });

  it('MS-6.12 4663 shows what the offline decoder matches: good, home and gone, each checked against the keys', async () => {
    stubFetch();
    render(<KeypadDemo data={demo} />);
    pressAll('4663');
    await result(/^Keys 4663 match: /);
    const listed = [...status().matchAll(/“([^”]+)”/g)].map((m) => m[1]);
    expect(listed.length).toBeGreaterThanOrEqual(3);
    expect(listed).toEqual(expect.arrayContaining(['Good', 'Home', 'Gone']));
    expect(sentence()).toBe(listed[0]);
    expect(keys()).toBe('4663');
    // The chip writes the word as the sentence does (the app's ProofPanel labels: buildSentence tokens), R3-P8.
    expect(liveChips()).toEqual([`match:${listed[0]}`]);
    expect(root().classList.contains('is-trying')).toBe(true);
    // Round 4: the status line names the readings # gives next, in that order.
    expect(statusLine()).toBe('Next: Home, Gone');
    expect(document.querySelectorAll('.site-demo__status b')).toHaveLength(2);
  });

  it('MS-6.12 # moves to the next reading, 0 is space, * goes back, Clear empties', async () => {
    stubFetch();
    render(<KeypadDemo data={demo} />);
    pressAll('4663');
    await result(/^Keys 4663/);
    const first = sentence();
    fireEvent.click(tryKey('#'));
    await waitFor(() => expect(sentence()).not.toBe(first));
    expect(sentence()).toBe('Home');
    // The shipped dictionary has more readings of 4663 than the three the line lists: # goes on to Gone, then Hood.
    expect(statusLine()).toBe('Next: Gone, Hood');
    pressAll('04');
    await waitFor(() => expect(keys()).toBe('4663 4'));
    fireEvent.click(tryKey('*'));
    await waitFor(() => expect(keys()).toBe('4663'));
    fireEvent.click(clearButton());
    await result(new RegExp(`^${TRY_COPY.start}$`));
    expect(hint()).toContain(TRY_COPY.start);
    expect(liveChips()).toEqual([]);
    expect(statusLine()).toBe('');
  });

  it('MS-6.12 the card answers a 1, 0 or # pressed before any letter', async () => {
    stubFetch();
    render(<KeypadDemo data={demo} />);
    fireEvent.click(tryKey('1'));
    await waitFor(() => expect(hint()).toBe(TRY_COPY.punct));
    fireEvent.click(clearButton());
    fireEvent.click(tryKey('0'));
    await waitFor(() => expect(hint()).toBe(TRY_COPY.letters));
    await result(new RegExp(`^${TRY_COPY.letters}$`));
  });

  it('MS-6.13 keyboard: one Tab stop, arrow keys move it, digits and Backspace type, Enter presses the focused key', async () => {
    stubFetch();
    render(<KeypadDemo data={demo} />);
    const tabbable = () => [...document.querySelectorAll('[data-try-key]')].filter((k) => (k as HTMLButtonElement).tabIndex === 0).map((k) => (k as HTMLElement).dataset.tryKey);
    expect(tabbable()).toEqual(['1']);
    tryKey('1').focus();
    fireEvent.keyDown(tryKey('1'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tryKey('2'));
    fireEvent.keyDown(tryKey('2'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(tryKey('5'));
    expect(tabbable()).toEqual(['5']);
    fireEvent.keyDown(tryKey('5'), { key: 'ArrowDown' });
    fireEvent.keyDown(tryKey('8'), { key: 'ArrowDown' });
    fireEvent.keyDown(tryKey('0'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(tryKey('0'));
    // Typed digits press their keys while focus is on the keypad; a key held down does not repeat.
    for (const k of '4663') fireEvent.keyDown(document.activeElement!, { key: k });
    fireEvent.keyDown(document.activeElement!, { key: '3', repeat: true });
    await result(/^Keys 4663 match/);
    expect(keys()).toBe('4663');
    fireEvent.keyDown(document.activeElement!, { key: 'Backspace' });
    await waitFor(() => expect(keys()).toBe('466'));
    // Enter and Space belong to the focused key: the browser turns them into a click, which presses it.
    fireEvent.keyDown(tryKey('0'), { key: 'Enter' });
    expect(keys()).toBe('466');
    fireEvent.click(tryKey('0'));
    expect(tryKey('0').classList.contains('is-pressed')).toBe(true);
  });

  it('MS-6.16 keys typed while a toolbar button has focus press the keys; arrows there move nothing', async () => {
    stubFetch();
    render(<KeypadDemo data={demo} />);
    clearButton().focus();
    fireEvent.keyDown(clearButton(), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(clearButton());
    for (const k of '4663') fireEvent.keyDown(clearButton(), { key: k });
    await result(/^Keys 4663 match/);
    fireEvent.keyDown(playButton(), { key: 'Backspace' });
    await waitFor(() => expect(keys()).toBe('466'));
    // Modified keys are the browser's.
    fireEvent.keyDown(clearButton(), { key: '5', ctrlKey: true });
    expect(keys()).toBe('466');
  });

  it('MS-6.16 after a pointer press in the demo, keys typed while nothing has focus press the keys; never focus moved by script', async () => {
    stubFetch();
    render(<KeypadDemo data={demo} />);
    // Safari does not focus a clicked button: the press leaves focus on the page itself.
    fireEvent.pointerDown(tryKey('6'));
    expect(document.activeElement).toBe(document.body);
    for (const k of '4663') fireEvent.keyDown(document.body, { key: k });
    await result(/^Keys 4663 match/);
    // A pointer press anywhere else ends it.
    const outside = document.createElement('p');
    document.body.append(outside);
    fireEvent.pointerDown(outside);
    fireEvent.keyDown(document.body, { key: '4' });
    await new Promise((r) => setTimeout(r, TRY_ANNOUNCE_MS * 2));
    expect(keys()).toBe('4663');
    outside.remove();
  });

  it('MS-6.16 nothing is taken from a control outside the demo', async () => {
    stubFetch();
    render(<KeypadDemo data={demo} />);
    const field = document.createElement('input');
    document.body.append(field);
    fireEvent.pointerDown(tryKey('6'));
    field.focus();
    fireEvent.keyDown(field, { key: '4' });
    await new Promise((r) => setTimeout(r, TRY_ANNOUNCE_MS * 2));
    expect(root().classList.contains('is-trying')).toBe(false);
    field.remove();
  });

  it('MS-6.15 Clear is marked unavailable while there is nothing to clear, and ignores presses then', async () => {
    stubFetch();
    render(<KeypadDemo data={demo} />);
    // In the example, Clear empties the example and starts trying.
    expect(clearButton().hasAttribute('aria-disabled')).toBe(false);
    fireEvent.click(clearButton());
    await waitFor(() => expect(clearButton().getAttribute('aria-disabled')).toBe('true'));
    expect(clearButton().disabled).toBe(false);
    pressAll('43');
    await waitFor(() => expect(clearButton().hasAttribute('aria-disabled')).toBe(false));
  });

  it('MS-6.13 the result is announced in the polite live region once typing pauses', async () => {
    stubFetch();
    render(<KeypadDemo data={demo} />);
    const live = document.querySelector('.site-demo [role="status"]')!;
    expect(live.getAttribute('aria-live')).toBe('polite');
    pressAll('4663');
    await waitFor(() => expect(status()).toMatch(/^Keys 4663 match: /), { timeout: TRY_ANNOUNCE_MS * 25 });
    expect(status()).toContain('“Good”');
  });

  it('MS-6.12 Hear it speaks the typed sentence, and is aria-disabled until the keys are a whole sentence', async () => {
    stubFetch();
    const synth = mockSpeech([]);
    render(<KeypadDemo data={demo} />);
    // No dictionary word is 99999: the keys show, nothing can be spoken yet.
    pressAll('99999');
    await result(new RegExp(`^${TRY_COPY.none}$`));
    expect(keys()).toBe('99999');
    expect(statusLine()).toBe(TRY_COPY.noneShort);
    expect(hearButton()!.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(hearButton()!);
    expect(synth.speak).not.toHaveBeenCalled();
    fireEvent.click(clearButton());
    pressAll('4663');
    await waitFor(() => expect(hearButton()!.hasAttribute('aria-disabled')).toBe(false));
    fireEvent.click(hearButton()!);
    expect((synth.speak.mock.calls[0]![0] as FakeUtterance).text).toBe(sentence());
  });

  it('MS-6.12 with no dictionary the keys still type and the page says so plainly', async () => {
    stubFetch({ missing: true });
    render(<KeypadDemo data={demo} />);
    pressAll('4663');
    await result(new RegExp(`^${TRY_COPY.failed}$`));
    expect(statusLine()).toBe(TRY_COPY.failedShort);
    expect(keys()).toBe('4663');
  });

  it('MS-6.14 a press stops the autoplay for good; Play the example goes back to the example', () => {
    vi.useFakeTimers();
    stubFetch();
    mockMotion(true);
    render(<KeypadDemo data={demo} />);
    // Before any press the finished example shows.
    expect(sentence()).toBe(FINISHED);
    inView(0.7);
    tick(AUTOPLAY);
    expect(label()).toBe(LABEL_STOP);
    fireEvent.click(tryKey('4'));
    expect(root().classList.contains('is-playing')).toBe(false);
    expect(root().classList.contains('is-trying')).toBe(true);
    expect(label()).toBe(LABEL_PLAY);
    expect(status()).not.toMatch(/^Typed/);
    inView(0);
    inView(0.7);
    tick(AUTOPLAY * 3);
    expect(root().classList.contains('is-playing')).toBe(false);
    expect(root().classList.contains('is-trying')).toBe(true);
    fireEvent.click(playButton());
    expect(label()).toBe(LABEL_STOP);
    expect(root().classList.contains('is-trying')).toBe(false);
    tick(PLAY_MS);
    expect(sentence()).toBe(FINISHED);
  });

  it('MS-6.12 the try-it copy names what the decoder does and claims no understanding', () => {
    const v: TryView = { codes: ['4663'], text: 'Good', words: [], matches: ['Good', 'Home'], shownIndex: 0, next: ['Home'], speakable: true };
    const all = [...Object.values(TRY_COPY), tryLine(v, miniDict(), false)];
    expect(all.at(-1)).toBe('Keys 4663 match: “Good”, “Home”.');
    for (const line of all) expect(line).not.toMatch(/\b(understand\w*|knows?|guess\w*|reads? your|mind|AI|smart|meant)\b/i);
  });

  it('R3-P4 after # the line lists every match for the keys and marks the one on show; no doubled full stop', () => {
    const dict = miniDict();
    const v = (keys: string) => {
      let st = EMPTY;
      for (const k of keys) st = press(st, k as '4', dict);
      return view(st, dict);
    };
    expect(tryLine(v('4663'), dict, false)).toBe('Keys 4663 match: “Good”, “Home”, “Gone”.');
    expect(tryLine(v('4663#'), dict, false)).toBe('Keys 4663 match: “Good”, “Home” (shown), “Gone”.');
    expect(tryLine(v('4663##'), dict, false)).toBe('Keys 4663 match: “Good”, “Home”, “Gone” (shown).');
    // # cycles through the readings and back: the first is on show again, unmarked.
    expect(tryLine(v('4663###'), dict, false)).toBe('Keys 4663 match: “Good”, “Home”, “Gone”.');
    // Punctuation from key 1 is part of each match; the line adds no second full stop.
    const punct = v('46631');
    expect(tryLine(punct, dict, false)).toBe('Keys 4663 match: “Good.”, “Home.”, “Gone.”');
  });

  it('R3-P8 a press of 1, 0 or # before any letter still answers on the line and in the card', () => {
    const dict = miniDict();
    const empty = view(EMPTY, dict);
    expect(tryLine(empty, dict, false, '1')).toBe(TRY_COPY.punct);
    expect(tryLine(empty, dict, false, '0')).toBe(TRY_COPY.letters);
    expect(tryLine(empty, dict, false, '#')).toBe(TRY_COPY.letters);
    expect(tryLine(empty, dict, false, null)).toBe(TRY_COPY.start);
    expect([tryHint('1'), tryHint('0'), tryHint('#'), tryHint('*'), tryHint(null)]).toEqual([TRY_COPY.punct, TRY_COPY.letters, TRY_COPY.letters, TRY_COPY.start, TRY_COPY.start]);
  });

  it('round 4 the status line: the decoder state in a few words, or the readings # gives next', () => {
    const dict = miniDict();
    const v = (keys: string) => {
      let st = EMPTY;
      for (const k of keys) st = press(st, k as '4', dict);
      return view(st, dict);
    };
    expect(tryStatus(null, { status: 'error', message: 'x' }, false)).toBe(TRY_COPY.failedShort);
    expect(tryStatus(null, { status: 'missing' }, true)).toBe(TRY_COPY.failedShort);
    expect(tryStatus(null, null, true)).toBe(TRY_COPY.loading);
    expect(tryStatus(view(EMPTY, dict), dict, false)).toBe('');
    expect(tryStatus(v('4663'), { status: 'loading' }, false)).toBe(TRY_COPY.loading);
    expect(tryStatus(v('99999'), dict, false)).toBe(TRY_COPY.noneShort);
    expect(tryStatus(v('4663'), dict, false)).toEqual(['Home', 'Gone']);
    expect(tryStatus(v('406333092837'), dict, false)).toEqual(['waves']);
    expect(tryStatus(v('27'), dict, false)).toEqual([]);
  });

  it('R3-P8 the chips write "I" as the sentence does, in the example and in try it', () => {
    render(<KeypadDemo data={demo} />);
    const words = () => [...document.querySelectorAll('.site-demo__chips:not(.site-sizer__ghost) > li > .nl-chip .nl-chip__word')].map((w) => w.textContent);
    expect(words()).toEqual(['I', 'need', 'water']);
    const dict = miniDict();
    let st = EMPTY;
    for (const k of '406333') st = press(st, k as '4', dict);
    expect(view(st, dict).words.map((w) => w.label)).toEqual(['I', 'need']);
    expect(view(st, dict).words.map((w) => w.word)).toEqual(['i', 'need']);
  });

  it('MS-6.12 the engine is the app decoder: every listed sentence matches the keys; # steps through the readings it lists next', () => {
    const dict = miniDict();
    let st = EMPTY;
    for (const k of '4663') st = press(st, k as '4', dict);
    const v = view(st, dict);
    expect(v.codes).toEqual(['4663']);
    expect(v.matches).toEqual(['Good', 'Home', 'Gone']);
    expect(v.words).toEqual([{ word: 'good', label: 'Good', code: '4663', state: 'match' }]);
    expect(v.shownIndex).toBe(0);
    expect(v.next).toEqual(['Home', 'Gone']);
    const once = press(st, '#', dict);
    expect(view(once, dict).text).toBe(v.next[0]);
    expect(view(press(once, '#', dict), dict).text).toBe(v.next[1]);
    expect(view(once, dict).next).toEqual(['Gone', 'Good']);
    expect(view(clear(), dict).codes).toEqual([]);
    expect(view(clear(), dict).next).toEqual([]);
  });
});
