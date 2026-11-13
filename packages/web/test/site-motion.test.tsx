// The website motion gate (marketing-site design.md "Gating", "Test plan" site-motion.test.tsx):
// the boot script, SiteMotion's reveals and arrival marker, and the pure helpers in motion.ts.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SiteMotion } from '@/components/site/SiteMotion';
import {
  ARRIVAL_FALLBACK_MS,
  MOTION_QUERY,
  SITE_MOTION_BOOT,
  autoplayDecision,
  msToken,
  shouldPlay,
  splitInitialPlay,
  splitInitialReveal,
} from '@/components/site/motion';

const tokens = JSON.parse(readFileSync(resolve(__dirname, '../../../design/system/tokens.json'), 'utf8'));
const tokenValue = (name: string): string => tokens.motion.tokens.find((t: { name: string }) => t.name === name).value;

const html = document.documentElement;

/** A matchMedia stand-in for the motion query whose answer the test can change. */
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
  observed = new Set<Element>();
  constructor(
    public callback: IntersectionObserverCallback,
    public options?: IntersectionObserverInit,
  ) {
    FakeObserver.all.push(this);
  }
  observe(el: Element) {
    this.observed.add(el);
  }
  unobserve(el: Element) {
    this.observed.delete(el);
  }
  disconnect() {
    this.observed.clear();
  }
  takeRecords() {
    return [];
  }
  enter(el: Element) {
    act(() => {
      this.callback([{ target: el, isIntersecting: true, intersectionRatio: 0.2 } as unknown as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    });
  }
}
const lastObserver = () => FakeObserver.all[FakeObserver.all.length - 1]!;

/** Blocks at given distances from the top of the viewport (jsdom has no layout). */
function Blocks() {
  return (
    <div>
      <div data-reveal="" id="above" data-top="-500" />
      <div data-reveal="" id="inview" data-top="100" />
      <div data-reveal="" id="below" data-top="2000">
        <a href="#x" id="below-link">
          a link
        </a>
      </div>
      <div data-reveal="" id="far" data-top="4000" />
      <SiteMotion />
    </div>
  );
}
const block = (id: string) => document.getElementById(id) as HTMLElement;

beforeEach(() => {
  FakeObserver.all = [];
  delete html.dataset.siteMotion;
  delete html.dataset.siteArrived;
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return { top: Number(this.dataset.top ?? 0) } as DOMRect;
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete html.dataset.siteMotion;
  delete html.dataset.siteArrived;
});

describe('the boot script (MS-8.1)', () => {
  const run = (matchMedia: ((q: string) => { matches: boolean }) | undefined) => {
    const root = document.createElement('html');
    const doc = { documentElement: root };
    new Function('window', 'matchMedia', 'document', SITE_MOTION_BOOT)({ matchMedia }, matchMedia, doc);
    return root;
  };

  it('MS-8.1 sets data-site-motion="pending" only with no reduced-motion preference', () => {
    const seen: string[] = [];
    const yes = run((q) => {
      seen.push(q);
      return { matches: true };
    });
    expect(seen).toEqual([MOTION_QUERY]);
    expect(yes.getAttribute('data-site-motion')).toBe('pending');
    expect(run(() => ({ matches: false })).hasAttribute('data-site-motion')).toBe(false);
  });

  it('MS-8.1 does nothing, and does not throw, when matchMedia is missing', () => {
    expect(run(undefined).hasAttribute('data-site-motion')).toBe(false);
  });
});

describe('SiteMotion (MS-8.4, MS-8.7, MS-8.8, MS-6.9)', () => {
  it('MS-8.4 marks blocks in view or above it instant before setting "on", then observes the rest', () => {
    mockMotion(true);
    const records = new MutationObserver(() => {});
    records.observe(document, { attributes: true, subtree: true, attributeFilter: ['data-revealed', 'data-site-motion'] });
    render(<Blocks />);
    const log = records.takeRecords().map((r) => `${r.attributeName}:${(r.target as HTMLElement).id || 'html'}`);
    records.disconnect();
    const on = log.indexOf('data-site-motion:html');
    expect(on).toBeGreaterThan(-1);
    expect(log.indexOf('data-revealed:above')).toBeLessThan(on);
    expect(log.indexOf('data-revealed:inview')).toBeLessThan(on);
    expect(html.dataset.siteMotion).toBe('on');
    expect(block('above').dataset.revealed).toBe('instant');
    expect(block('inview').dataset.revealed).toBe('instant');
    expect(block('below').hasAttribute('data-revealed')).toBe(false);
    const io = lastObserver();
    expect(io.options).toEqual({ rootMargin: '0px 0px -10% 0px', threshold: 0 });
    expect([...io.observed].map((e) => e.id)).toEqual(['below', 'far']);
  });

  it('MS-8.4 an observer entry reveals a block once and stops watching it', () => {
    mockMotion(true);
    render(<Blocks />);
    const io = lastObserver();
    io.enter(block('below'));
    expect(block('below').dataset.revealed).toBe('1');
    expect(io.observed.has(block('below'))).toBe(false);
    io.enter(block('below'));
    expect(block('below').dataset.revealed).toBe('1');
    expect(block('far').hasAttribute('data-revealed')).toBe(false);
  });

  it('MS-8.4 focus inside an unrevealed block marks it instant and stops watching it', () => {
    mockMotion(true);
    render(<Blocks />);
    const io = lastObserver();
    fireEvent.focusIn(document.getElementById('below-link')!);
    expect(block('below').dataset.revealed).toBe('instant');
    expect(io.observed.has(block('below'))).toBe(false);
    io.enter(block('below'));
    expect(block('below').dataset.revealed).toBe('instant');
  });

  it('MS-8.7 with reduced motion: no attribute and every block instant', () => {
    mockMotion(false);
    render(<Blocks />);
    expect(html.hasAttribute('data-site-motion')).toBe(false);
    for (const id of ['above', 'inview', 'below', 'far']) expect(block(id).dataset.revealed).toBe('instant');
    expect(FakeObserver.all).toHaveLength(0);
  });

  it('MS-8.7 with no IntersectionObserver or no matchMedia: still page, every block instant', () => {
    mockMotion(true);
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<Blocks />);
    expect(html.hasAttribute('data-site-motion')).toBe(false);
    for (const id of ['above', 'inview', 'below', 'far']) expect(block(id).dataset.revealed).toBe('instant');
    cleanup();
    vi.stubGlobal('matchMedia', undefined);
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    render(<Blocks />);
    expect(html.hasAttribute('data-site-motion')).toBe(false);
    expect(block('far').dataset.revealed).toBe('instant');
  });

  it('MS-8.8 a change to reduced motion removes the attribute and shows every block', () => {
    const motion = mockMotion(true);
    render(<Blocks />);
    expect(html.dataset.siteMotion).toBe('on');
    motion.set(false);
    expect(html.hasAttribute('data-site-motion')).toBe(false);
    for (const id of ['above', 'inview', 'below', 'far']) expect(block(id).dataset.revealed).toBe('instant');
    expect(lastObserver().observed.size).toBe(0);
  });

  it('MS-6.9 data-site-arrived is set ARRIVAL_MS after mount with motion on, never before', () => {
    vi.useFakeTimers();
    mockMotion(true);
    render(<Blocks />);
    expect(html.hasAttribute('data-site-arrived')).toBe(false);
    act(() => vi.advanceTimersByTime(ARRIVAL_FALLBACK_MS - 1));
    expect(html.hasAttribute('data-site-arrived')).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(html.hasAttribute('data-site-arrived')).toBe(true);
  });

  it('MS-6.9 with reduced motion at mount, data-site-arrived is set at once', () => {
    vi.useFakeTimers();
    mockMotion(false);
    render(<Blocks />);
    expect(html.hasAttribute('data-site-arrived')).toBe(true);
  });

  it('MS-6.9 a change to reduce sets data-site-arrived at once; back to no-preference, motion is on and the arrival stays done', () => {
    vi.useFakeTimers();
    const motion = mockMotion(true);
    render(<Blocks />);
    act(() => vi.advanceTimersByTime(100));
    expect(html.hasAttribute('data-site-arrived')).toBe(false);
    motion.set(false);
    expect(html.hasAttribute('data-site-arrived')).toBe(true);
    motion.set(true);
    expect(html.dataset.siteMotion).toBe('on');
    expect(html.hasAttribute('data-site-arrived')).toBe(true);
    act(() => vi.advanceTimersByTime(ARRIVAL_FALLBACK_MS * 2));
    expect(html.hasAttribute('data-site-arrived')).toBe(true);
  });

  it('MS-6.9 ARRIVAL_FALLBACK_MS equals motion-delay-arrival plus motion-fade-slow', () => {
    const sum = msToken(tokenValue('motion-delay-arrival'))! + msToken(tokenValue('motion-fade-slow'))!;
    expect(ARRIVAL_FALLBACK_MS).toBe(sum);
  });

  it('MS-8.4 cleanup disconnects the observer and removes the listeners', () => {
    mockMotion(true);
    render(<Blocks />);
    const io = lastObserver();
    cleanup();
    expect(io.observed.size).toBe(0);
  });
});

/**
 * Drawings for the round-2 triggers (A7). jsdom's innerHeight is 768: the play line is at 537.6px. data-top and
 * data-bottom stand in for the layout; data-nobox gives an element no box (display: none). Round 4 (2026-11-13
 * ): the How step sync (A8, MS-8.12) is gone, so the fixture has no How picture or steps; the How steps'
 * number tiles (.site-step) sit in a [data-play-scope] beside a drawing, which SiteMotion treats like any other.
 */
function Plays({ scope = false }: { scope?: boolean }) {
  return (
    <div>
      <div data-play="" id="p-above" data-top="-500" data-bottom="-284" />
      <div data-play="" id="p-inview" data-top="100" data-bottom="316" />
      <div data-play="" id="p-below" data-top="2000" data-bottom="2216" />
      <div data-play="" id="p-hidden" data-nobox="" data-top="0" data-bottom="0" />
      {scope && (
        <ol className="site-how__steps" id="how-steps">
          <li className="site-how__step" data-play-scope="" id="s-scope" data-top="2400" data-bottom="2800">
            <div data-play="" id="p-step" data-top="2400" data-bottom="2688" />
            <div className="site-step" id="s-step" />
          </li>
        </ol>
      )}
      <div data-reveal="" id="r-below" data-top="3000" />
      <SiteMotion />
    </div>
  );
}

const PLAY_AREA = '0px 0px -30% 0px';
const TOP_LINE = '0px 0px -100% 0px';
const observerFor = (rootMargin: string) => FakeObserver.all.find((o) => o.options?.rootMargin === rootMargin);

/** Moves an element in the fake layout. */
const place = (id: string, top: number, bottom = top + 216) => {
  const el = block(id);
  el.dataset.top = String(top);
  el.dataset.bottom = String(bottom);
  delete el.dataset.nobox;
};

/** Calls an observer back with an entry for el, its rect taken from the fake layout. */
const fire = (io: FakeObserver, el: Element, isIntersecting = true) => {
  act(() => {
    io.callback(
      [{ target: el, isIntersecting, intersectionRatio: isIntersecting ? 1 : 0, boundingClientRect: el.getBoundingClientRect() } as unknown as IntersectionObserverEntry],
      io as unknown as IntersectionObserver,
    );
  });
};

describe('SiteMotion played drawings (MS-8.11, MS-8.13)', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const top = Number(this.dataset.top ?? 0);
      return { top, bottom: Number(this.dataset.bottom ?? top + 100) } as DOMRect;
    });
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) {
      return { length: 'nobox' in this.dataset ? 0 : 1 } as unknown as DOMRectList;
    });
  });

  it('MS-8.11 a drawing reaching the play line gets data-played=1 once', () => {
    mockMotion(true);
    render(<Plays />);
    const area = observerFor(PLAY_AREA)!;
    const top = observerFor(TOP_LINE)!;
    expect(area.options).toEqual({ rootMargin: PLAY_AREA, threshold: [0, 1] });
    expect(top.options).toEqual({ rootMargin: TOP_LINE, threshold: 0 });
    expect(area.observed.has(block('p-below'))).toBe(true);
    // Below the line: nothing yet.
    place('p-below', 500);
    fire(area, block('p-below'));
    expect(block('p-below').hasAttribute('data-played')).toBe(false);
    // The whole box above the line: it plays, and both observers stop watching it.
    place('p-below', 250);
    fire(area, block('p-below'));
    expect(block('p-below').dataset.played).toBe('1');
    expect(area.observed.has(block('p-below'))).toBe(false);
    expect(top.observed.has(block('p-below'))).toBe(false);
    // Never again.
    const records = new MutationObserver(() => {});
    records.observe(block('p-below'), { attributes: true });
    fire(area, block('p-below'));
    fire(top, block('p-below'));
    expect(records.takeRecords()).toHaveLength(0);
    records.disconnect();
    // The reveal observer is still the last one created.
    expect(lastObserver().options).toEqual({ rootMargin: '0px 0px -10% 0px', threshold: 0 });
  });

  it('MS-8.13 splitInitialPlay marks drawings in view or above at mount instant', () => {
    const at = (top: number, box = true) => ({ top, getBoundingClientRect: () => ({ top }), getClientRects: () => ({ length: box ? 1 : 0 }) });
    const els = [at(-900), at(-10), at(0), at(767), at(768), at(5000), at(100, false)];
    const { instant, later } = splitInitialPlay(els, 768);
    expect(instant.map((e) => e.top)).toEqual([-900, -10, 0, 767]);
    expect(later.map((e) => e.top)).toEqual([768, 5000, 100]);
  });

  it('MS-8.13 a hidden drawing at mount is not marked instant', () => {
    mockMotion(true);
    render(<Plays />);
    const hidden = block('p-hidden');
    expect(hidden.hasAttribute('data-played')).toBe(false);
    expect(observerFor(PLAY_AREA)!.observed.has(hidden)).toBe(true);
    expect(observerFor(TOP_LINE)!.observed.has(hidden)).toBe(true);
    // Shown later (a tablet turned upright) and inside the play area: it plays.
    place('p-hidden', 100);
    fire(observerFor(PLAY_AREA)!, hidden);
    expect(hidden.dataset.played).toBe('1');
  });

  it('MS-8.13 nothing in view changes when motion starts', () => {
    mockMotion(true);
    const records = new MutationObserver(() => {});
    records.observe(document, { attributes: true, subtree: true, attributeFilter: ['data-played', 'data-site-motion'] });
    render(<Plays />);
    const log = records.takeRecords().map((r) => `${r.attributeName}:${(r.target as HTMLElement).id || 'html'}`);
    records.disconnect();
    const on = log.indexOf('data-site-motion:html');
    expect(on).toBeGreaterThan(-1);
    expect(log.indexOf('data-played:p-above')).toBeGreaterThan(-1);
    expect(log.indexOf('data-played:p-above')).toBeLessThan(on);
    expect(log.indexOf('data-played:p-inview')).toBeGreaterThan(-1);
    expect(log.indexOf('data-played:p-inview')).toBeLessThan(on);
    expect(block('p-above').dataset.played).toBe('instant');
    expect(block('p-inview').dataset.played).toBe('instant');
    expect(block('p-below').hasAttribute('data-played')).toBe(false);
    expect([...observerFor(PLAY_AREA)!.observed].map((e) => e.id)).toEqual(['p-below', 'p-hidden']);
  });

  it('MS-8.13 reduce during a play marks every drawing instant and nothing replays after no-preference', () => {
    const motion = mockMotion(true);
    render(<Plays />);
    place('p-below', 250);
    fire(observerFor(PLAY_AREA)!, block('p-below'));
    expect(block('p-below').dataset.played).toBe('1');
    motion.set(false);
    for (const id of ['p-above', 'p-inview', 'p-below', 'p-hidden']) expect(block(id).dataset.played).toBe('instant');
    for (const io of FakeObserver.all) expect(io.observed.size).toBe(0);
    const before = FakeObserver.all.length;
    motion.set(true);
    expect(html.dataset.siteMotion).toBe('on');
    // No drawing is waiting, so no play observer is created and nothing plays again.
    const created = FakeObserver.all.slice(before);
    expect(created.some((o) => o.options?.rootMargin === PLAY_AREA)).toBe(false);
    for (const id of ['p-above', 'p-inview', 'p-below', 'p-hidden']) expect(block(id).dataset.played).toBe('instant');
  });

  it('MS-8.11 shouldPlay waits for the whole box above the play line', () => {
    const box = (top: number, height: number) => ({ top, bottom: top + height });
    // A 216px box at 667 (line 466.9).
    expect(shouldPlay(box(300, 216), 667)).toBe(false);
    expect(shouldPlay(box(250, 216), 667)).toBe(true);
    expect(shouldPlay(box(-200, 216), 667)).toBe(false); // entered from above, only its bottom edge on screen
    expect(shouldPlay(box(251.5, 216), 667)).toBe(true); // 1px rounding
    expect(shouldPlay(box(667, 216), 667)).toBe(false);
    // A 520px box at 568 (line 397.6): taller than the space above the line.
    expect(shouldPlay(box(10, 520), 568)).toBe(true);
    expect(shouldPlay(box(0, 520), 568)).toBe(true);
    expect(shouldPlay(box(20, 520), 568)).toBe(true);
    expect(shouldPlay(box(-40, 520), 568)).toBe(true);
    expect(shouldPlay(box(-300, 520), 568)).toBe(false);
    expect(shouldPlay(box(100, 520), 568)).toBe(false);
    // A 376px box at 549 (line 384.3, top band 164.7): its bottom-above-the-line window is 8px, so it
    // also plays with its whole box on screen and its top in the top band (a flick, MS-8.11).
    expect(shouldPlay(box(8, 376), 549)).toBe(true);
    expect(shouldPlay(box(150, 376), 549)).toBe(true);
    expect(shouldPlay(box(165, 376), 549)).toBe(true);
    expect(shouldPlay(box(167, 376), 549)).toBe(false);
    expect(shouldPlay(box(-20, 376), 549)).toBe(false); // partly above
    // Bottom at or above 0.
    expect(shouldPlay(box(-216, 216), 667)).toBe(false);
    expect(shouldPlay(box(-600, 520), 568)).toBe(false);
  });

  it('MS-8.11 a jump that lands mid-figure does not play a drawing taller than the viewport', () => {
    const box = (top: number, height: number) => ({ top, bottom: top + height });
    // The 680px proof figure at 320 x 568 (top band 170.4): at most one band of it above the viewport.
    expect(shouldPlay(box(0, 680), 568)).toBe(true);
    expect(shouldPlay(box(-40, 680), 568)).toBe(true);
    expect(shouldPlay(box(-170, 680), 568)).toBe(true);
    expect(shouldPlay(box(-173, 680), 568)).toBe(false);
    expect(shouldPlay(box(-283, 680), 568)).toBe(false); // an anchor or scroll restoration landing mid-figure
  });

  it('MS-8.11 both play observers use shouldPlay and unobserve once played', () => {
    mockMotion(true);
    render(<Plays />);
    const area = observerFor(PLAY_AREA)!;
    const top = observerFor(TOP_LINE)!;
    const el = block('p-below');
    // A tall drawing whose bottom edge only is on screen: no play from either observer.
    place('p-below', -500, 20);
    fire(top, el);
    fire(area, el);
    expect(el.hasAttribute('data-played')).toBe(false);
    // Its top at the top of the viewport, covering the play area: the top line plays it.
    place('p-below', -20, 600);
    fire(top, el);
    expect(el.dataset.played).toBe('1');
    expect(top.observed.has(el)).toBe(false);
    expect(area.observed.has(el)).toBe(false);
    // The hidden one plays from the play area and leaves both too.
    place('p-hidden', 50);
    fire(area, block('p-hidden'));
    expect(block('p-hidden').dataset.played).toBe('1');
    expect(top.observed.size).toBe(0);
    expect(area.observed.size).toBe(0);
  });

  it('MS-8.11 a drawing taller than the viewport entered from above plays as its top leaves the top line', () => {
    mockMotion(true);
    render(<Plays />);
    const top = observerFor(TOP_LINE)!;
    const el = block('p-below');
    // The first call, below the line and not on it before: the box as reported, no play.
    place('p-below', 1200, 2100);
    fire(top, el, false);
    expect(el.hasAttribute('data-played')).toBe(false);
    // Scrolling up: the 900px drawing covers the top line with only its lower part on screen.
    place('p-below', -400, 500);
    fire(top, el);
    expect(el.hasAttribute('data-played')).toBe(false);
    // Its top leaves the line downwards, reported a 30px step late: asked at the crossing, it plays.
    place('p-below', 30, 930);
    fire(top, el, false);
    expect(el.dataset.played).toBe('1');
    expect(top.observed.has(el)).toBe(false);
  });

  it('MS-8.11 a jump that carries a drawing from the top line below the fold does not play it', () => {
    mockMotion(true);
    render(<Plays />);
    const top = observerFor(TOP_LINE)!;
    const el = block('p-below');
    // On the line: the 900px drawing covers the top of the 768px viewport from 400px above it.
    place('p-below', -400, 500);
    fire(top, el);
    expect(el.hasAttribute('data-played')).toBe(false);
    // A header link jumps up: its top is now below the fold, not one scroll step under the line.
    place('p-below', 900, 1800);
    fire(top, el, false);
    expect(el.hasAttribute('data-played')).toBe(false);
    // Just past the top band (768 x 0.3 = 230.4): still not played.
    place('p-below', -400, 500);
    fire(top, el);
    place('p-below', 240, 1140);
    fire(top, el, false);
    expect(el.hasAttribute('data-played')).toBe(false);
    expect(top.observed.has(el)).toBe(true);
  });

  it('MS-8.11 the whole-viewport observer plays a drawing taller than the play area once it is whole in view', () => {
    mockMotion(true);
    render(<Plays />);
    const whole = observerFor('0px')!;
    expect(whole.options).toEqual({ rootMargin: '0px', threshold: [0.94, 0.95, 0.96, 0.97, 0.98, 0.99, 1] });
    expect(whole.observed.has(block('p-below'))).toBe(true);
    const el = block('p-below');
    // A 600px drawing at 768 (line 537.6): 40px of it still below the viewport, no play.
    place('p-below', 208, 808);
    fire(whole, el);
    expect(el.hasAttribute('data-played')).toBe(false);
    // Whole in view: it plays, and every play observer stops watching it.
    place('p-below', 160, 760);
    fire(whole, el);
    expect(el.dataset.played).toBe('1');
    for (const margin of [PLAY_AREA, TOP_LINE, '0px', '0px 0px -70% 0px']) expect(observerFor(margin)!.observed.has(el)).toBe(false);
  });

  it('MS-8.11 the top band plays a drawing a flick carried past its play-line window', () => {
    mockMotion(true);
    render(<Plays />);
    const band = observerFor('0px 0px -70% 0px')!;
    expect(band.options).toEqual({ rootMargin: '0px 0px -70% 0px', threshold: 0 });
    const el = block('p-below');
    // A 530px drawing at 768: its bottom is below the line (537.6) until its top is at 7.6px, and a flick
    // moved it from 400 to 200 in one frame. Its top entered the top band (230.4): it plays.
    place('p-below', 200, 730);
    fire(band, el);
    expect(el.dataset.played).toBe('1');
    expect(band.observed.has(el)).toBe(false);
    expect(observerFor(PLAY_AREA)!.observed.has(el)).toBe(false);
  });

  it('MS-8.12 (round 4, removed) How is no step sync: a step scope plays like any drawing, with no middle-line observer', () => {
    mockMotion(true);
    render(<Plays scope />);
    // The four play observers watch the How scene like any drawing below the fold; nothing observes the middle line.
    expect(FakeObserver.all.filter((o) => o.options?.rootMargin === '-50% 0px -50% 0px')).toHaveLength(0);
    expect(observerFor(PLAY_AREA)!.observed.has(block('p-step'))).toBe(true);
    expect(observerFor(PLAY_AREA)!.observed.has(block('s-scope'))).toBe(false);
    place('p-step', 200, 488);
    fire(observerFor(PLAY_AREA)!, block('p-step'));
    expect(block('p-step').dataset.played).toBe('1');
    // SiteMotion writes nothing on the scope or the step: their light comes from CSS (:has()).
    for (const id of ['how-steps', 's-scope', 's-step']) {
      expect(Object.keys(block(id).dataset).filter((k) => k.startsWith('how') || k === 'played'), id).toEqual([]);
    }
  });

  it('MS-8.11 cleanup disconnects the play observers', () => {
    mockMotion(true);
    render(<Plays />);
    const ios = [observerFor(PLAY_AREA)!, observerFor(TOP_LINE)!];
    cleanup();
    for (const io of ios) expect(io.observed.size).toBe(0);
  });
});

describe('motion.ts helpers', () => {
  it('MS-8.2 msToken parses millisecond tokens and rejects anything else', () => {
    expect(msToken('520ms')).toBe(520);
    expect(msToken(' 1200ms')).toBe(1200);
    expect(msToken('')).toBeNull();
    expect(msToken('fast')).toBeNull();
    expect(msToken('1.2s')).toBeNull();
    expect(msToken(undefined)).toBeNull();
  });

  it('MS-8.4 splitInitialReveal: in view or above it is instant, below the fold is later', () => {
    const at = (top: number) => ({ top, getBoundingClientRect: () => ({ top }) });
    const els = [at(-10), at(0), at(799), at(800), at(5000)];
    const { instant, later } = splitInitialReveal(els, 800);
    expect(instant.map((e) => e.top)).toEqual([-10, 0, 799]);
    expect(later.map((e) => e.top)).toEqual([800, 5000]);
  });

  it('MS-6.3 autoplayDecision is true only with motion, an observer, no earlier play or press, a visible page and 60% in view', () => {
    const ok = { reduced: false, hasObserver: true, autoplayed: false, acted: false, hidden: false, ratio: 0.6 };
    expect(autoplayDecision(ok)).toBe(true);
    expect(autoplayDecision({ ...ok, ratio: 1 })).toBe(true);
    expect(autoplayDecision({ ...ok, reduced: true })).toBe(false);
    expect(autoplayDecision({ ...ok, hasObserver: false })).toBe(false);
    expect(autoplayDecision({ ...ok, autoplayed: true })).toBe(false);
    expect(autoplayDecision({ ...ok, acted: true })).toBe(false);
    expect(autoplayDecision({ ...ok, hidden: true })).toBe(false);
    expect(autoplayDecision({ ...ok, ratio: 0.59 })).toBe(false);
  });
});
