'use client';
/**
 * Decides, in the browser, whether the website moves (marketing-site design.md "Gating" 2, MS-8).
 * Renders nothing. With no reduced-motion preference and an IntersectionObserver it shows the blocks
 * already in view or above it at once, sets data-site-motion="on" and reveals each block below the
 * fold once, when it comes into view (A4). Otherwise every block is shown at once and nothing moves.
 * data-site-arrived ends the hero's arrival fades (A1, A2) after they ran once, so they never replay
 * during the page view (MS-6.9).
 *
 * Round 2 (A7, A8; MS-8.11-8.13): each data-play drawing below the fold plays once, by setting
 * data-played="1", when shouldPlay holds (four observers: the play area, the top line, the whole
 * viewport and the top band); drawings in view or above at mount get data-played="instant" before "on" is set. The How steps write
 * data-how-step, data-how-play and data-how-live on .site-how as the middle line moves.
 */
import { useEffect } from 'react';
import {
  ARRIVAL_FALLBACK_MS,
  MOTION_QUERY,
  PLAY_LINE,
  activeStep,
  howStart,
  msToken,
  shouldPlay,
  splitInitialPlay,
  splitInitialReveal,
} from './motion';

export function SiteMotion(): null {
  useEffect(() => {
    const root = document.documentElement;
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia(MOTION_QUERY) : null;
    const blocks = () => [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
    const drawings = () => [...document.querySelectorAll<HTMLElement>('[data-play]')];
    let observer: IntersectionObserver | null = null;
    let playObservers: IntersectionObserver[] = [];
    let stepObserver: IntersectionObserver | null = null;
    let arrival: ReturnType<typeof setTimeout> | undefined;
    // How it works: the highest step played in this page view, the step last written, whether the
    // story waits for step 1 (deferred), and whether howStart was asked (only on the first move()).
    let seen = 3;
    let current = -1;
    let deferred = false;
    let howAsked = false;

    const arrive = () => {
      root.dataset.siteArrived = '';
    };

    const disconnectAll = () => {
      observer?.disconnect();
      observer = null;
      for (const io of playObservers) io.disconnect();
      playObservers = [];
      stepObserver?.disconnect();
      stepObserver = null;
    };

    const still = () => {
      disconnectAll();
      clearTimeout(arrival);
      delete root.dataset.siteMotion;
      arrive();
      for (const el of blocks()) el.dataset.revealed = 'instant';
      // Also drawings playing now, so nothing replays if the preference changes back (MS-8.13).
      for (const el of drawings()) el.dataset.played = 'instant';
      const how = document.querySelector<HTMLElement>('.site-how');
      if (how) {
        delete how.dataset.howStep;
        delete how.dataset.howPlay;
        delete how.dataset.howLive;
      }
      deferred = false;
      seen = 3;
      current = -1;
    };

    const move = () => {
      disconnectAll();
      const { instant, later } = splitInitialReveal(
        blocks().filter((el) => !el.dataset.revealed),
        window.innerHeight,
      );
      // Mark what is already visible before "on" hides anything, so nothing in view blinks.
      for (const el of instant) el.dataset.revealed = 'instant';
      const plays = splitInitialPlay(
        drawings().filter((el) => !el.dataset.played),
        window.innerHeight,
      );
      for (const el of plays.instant) el.dataset.played = 'instant';

      const how = document.querySelector<HTMLElement>('.site-how');
      const steps = how ? [...how.querySelectorAll<HTMLElement>('.site-how__step')] : [];
      const stepNow = () => activeStep(steps.map((s) => s.getBoundingClientRect().top), window.innerHeight / 2);
      if (how && !howAsked) {
        howAsked = true;
        const step = stepNow();
        const picture = how.querySelector<HTMLElement>('.site-how__picture');
        const start = picture ? howStart(picture, window.innerHeight, step) : 'finished';
        if (start === 'live') {
          how.dataset.howLive = '';
          seen = 0;
        } else if (start === 'deferred') {
          seen = 0;
          deferred = true;
        } else seen = 3;
        current = start === 'finished' ? step : 0;
        how.dataset.howStep = String(current);
      }
      root.dataset.siteMotion = 'on';

      // The play observers and the step observer come before the reveal observer.
      if (plays.later.length > 0) {
        const tryPlay = (el: HTMLElement, r: { top: number; bottom: number }) => {
          if (el.dataset.played || !shouldPlay(r, window.innerHeight)) return;
          el.dataset.played = '1';
          for (const io of playObservers) io.unobserve(el);
        };
        const onPlay = (entries: IntersectionObserverEntry[]) => {
          for (const e of entries) tryPlay(e.target as HTMLElement, e.boundingClientRect);
        };
        // The top line reports a crossing one scroll step late. When a drawing that was on the line
        // leaves it downwards by at most the top band (its top now between the top of the viewport and
        // 30% down), shouldPlay is asked about the box at the crossing, its top at 0; otherwise about
        // the box as reported, so a jump that carries it below the fold does not play it.
        const onLine = new WeakMap<Element, boolean>();
        const onTopLine = (entries: IntersectionObserverEntry[]) => {
          for (const e of entries) {
            const r = e.boundingClientRect;
            const band = window.innerHeight * (1 - PLAY_LINE);
            const left = onLine.get(e.target) === true && !e.isIntersecting && r.top > 0 && r.top <= band;
            onLine.set(e.target, e.isIntersecting);
            tryPlay(e.target as HTMLElement, left ? { top: 0, bottom: r.bottom - r.top } : r);
          }
        };
        // The play area, the top line, and the whole viewport from 94% to 100% visible: the last calls
        // back while a drawing taller than the play area but not than the viewport comes (nearly) whole
        // into view, from either side, where no other observer crosses a threshold. shouldPlay still
        // decides, so a drawing entered from above plays with at most 6% of it above the viewport.
        // A drawing taller than the viewport entered from above gets its only call while its top is at
        // the top from the top line, as its top leaves the line downwards (onTopLine). The top band
        // (the top 30%) calls back as a drawing's top enters it, so a flick past the narrow window of a
        // drawing almost as tall as the play area still plays it.
        playObservers = [
          new IntersectionObserver(onPlay, { rootMargin: '0px 0px -30% 0px', threshold: [0, 1] }),
          new IntersectionObserver(onTopLine, { rootMargin: '0px 0px -100% 0px', threshold: 0 }),
          new IntersectionObserver(onPlay, { rootMargin: '0px', threshold: [0.94, 0.95, 0.96, 0.97, 0.98, 0.99, 1] }),
          new IntersectionObserver(onPlay, { rootMargin: '0px 0px -70% 0px', threshold: 0 }),
        ];
        for (const io of playObservers) for (const el of plays.later) io.observe(el);
      }
      if (how && steps.length > 0) {
        const onStep = () => {
          const step = stepNow();
          if (step === current) return;
          current = step;
          // All writes in one callback, so the browser paints them together.
          if (deferred && step >= 1) {
            how.dataset.howLive = '';
            deferred = false;
          }
          how.dataset.howStep = String(step);
          if (step > seen) {
            how.dataset.howPlay = String(step);
            seen = step;
          } else delete how.dataset.howPlay;
        };
        stepObserver = new IntersectionObserver(onStep, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
        for (const s of steps) stepObserver.observe(s);
      }

      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            const el = e.target as HTMLElement;
            if (!el.dataset.revealed) el.dataset.revealed = '1';
            io.unobserve(el);
          }
        },
        { rootMargin: '0px 0px -10% 0px', threshold: 0 },
      );
      observer = io;
      for (const el of later) io.observe(el);
      if (!('siteArrived' in root.dataset)) {
        const style = getComputedStyle(root);
        const delay = msToken(style.getPropertyValue('--motion-delay-arrival'));
        const fade = msToken(style.getPropertyValue('--motion-fade-slow'));
        clearTimeout(arrival);
        arrival = setTimeout(arrive, delay !== null && fade !== null ? delay + fade : ARRIVAL_FALLBACK_MS);
      }
    };

    const canMove = () => !!mq && mq.matches && typeof IntersectionObserver === 'function';

    // A block that gets focus before its reveal stays visible, with no animation later (MS-8.4).
    const onFocus = (e: FocusEvent) => {
      const block = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-reveal]') : null;
      if (!block || block.dataset.revealed) return;
      block.dataset.revealed = 'instant';
      observer?.unobserve(block);
    };

    const onChange = () => (canMove() ? move() : still());

    if (canMove()) move();
    else still();
    document.addEventListener('focusin', onFocus);
    mq?.addEventListener?.('change', onChange);

    return () => {
      disconnectAll();
      clearTimeout(arrival);
      document.removeEventListener('focusin', onFocus);
      mq?.removeEventListener?.('change', onChange);
    };
  }, []);
  return null;
}
