// The landing page at / (marketing-site spec; design.md "E2E ... test/e2e/site.mjs"; the app is at /app,
// ADR-006). Plain node + Playwright, like the other e2e scripts:
//   node packages/web/test/e2e/site.mjs          (BASE_URL, default http://localhost:3202)
//   ENGINE=webkit node ...                       (Safari's engine; LCP and layout shift are Chromium-only
//                                                 and skipped with a note)
//   OFFLINE=1 node ...                           (production only: the service worker precache runs)
//
// What it checks:
//   - 14 phone, tablet and desktop sizes with reduced motion (contexts built like responsive.mjs, R7):
//     no sideways scroll, no turn-upright notice, h1 and header CTA above the fold, targets (width,
//     height, 8px gaps inside link groups and between question summaries, R3), text sizes, key drawings 64-84px
//     (the Touch keys exactly 72 and 128px), no drawing larger than its stage, no overflow in the proof figure,
//     equal stage heights per section (Access: per row; How: in its row, hugging below 1024px), one ember fill per
//     viewport, finished drawings and a still page at the end; plus an XL key-size pass.
//   - Layout: How's three steps in one row from 1024px and one column below, each stage before its step (round 4);
//     the box grids: a lead card, then 3 cards a row (Conversation, Privacy) or 2 + 2 (Access), the switch card
//     leading Access with a snug stage, no CSS order in the grids (round 4; MS-7.7, MS-10.9).
//   - Motion on (1280x900 and 390x844): the once-only autoplay, Stop, reveals, focus inside a hidden
//     block, nothing time-based left running, opacity/transform only, reduce at runtime, layout shift and LCP.
//   - Round 2 motion (A7): tall drawings, drawings entered from above and drawings a 150px flick passes on short
//     phones play in view; round 4: How's row plays in story order with one ember ring at a time (the A8 step
//     sync is gone),
//     a reload at #access shows finished drawings, every drawing finished 4.5 s after it played, no layout
//     shift while they play (MS-8.11-8.13, MS-11.2).
//   - No JavaScript, privacy (requests, storage, cookies, no dialog), routes, keyboard (skip link, bar
//     Tab order at 1280x900 and 820x1094, R2; focus rings; questions; demo buttons) and the offline runs.
//   - Round 3 (2026-11-12): the bar is one row at every size (W1); the demo's sentence and chips on the
//     first phone screen at 390x844 and its sentence bar at least partly at 320x640; the try-it keypad (W4): nothing
//     under /data/ and no new script before the first press, then the decoder chunk and the dictionary; 4663 shows
//     good, home and gone; touch and keyboard (one Tab stop, arrows, digits, Backspace, Clear), a visible focus ring,
//     the keypad does not move while typing, the polite announcement, reduced motion, Play goes back to the example.
//   - R3-P1 (2026-11-13): at every size, key 1, Clear, 4663, #, Clear, "He need water" and an 8-word
//     sentence never move the keypad, Clear or Play; the empty text, the sentence and the keys are one line each; at
//     most 3 chips in one row; after # the line lists every match with the one on show marked.
//   - Round 4 (2026-11-13), the hero demo: the card's chips are the sentence and the live region carries
//     the result line; at 390x844 the card and the keypad's first three rows are on the first screen; the status line
//     names the readings # gives next; Tab goes keypad, Play, Hear it, Clear; digits typed on Clear press the keys;
//     the keypad and the toolbar never move, the card keeps one height, the status line is one line; with no
//     JavaScript the status line is empty.
//   - Round 4 (2026-11-13), the shared language: with motion on and off, the hover layer at --state-hover
//     on a key and the ember button, a secondary button's edge turning ink, no layer on drawn buttons, hover and press
//     never moving a key or a button, a .site-go arrow moving at most 4px only with motion on, and a question's answer
//     rising in only with motion on (MS-8.14, MS-8.15).
import { BASE_URL, check, done, loadPlaywright, newContext, openApp, waitFor } from './lib.mjs';

const engine = process.env.ENGINE ?? 'chromium';
const OFFLINE = process.env.OFFLINE === '1';
const isChromium = engine === 'chromium';
const ORIGIN = new URL(BASE_URL).origin;
// WebKit, like Safari by default, skips links on Tab; Option+Tab moves through every control.
const TAB = engine === 'webkit' ? 'Alt+Tab' : 'Tab';

/** Press Tab (Option+Tab in WebKit) until the predicate holds for document.activeElement. */
async function tabTo(page, predicate, { max = 80, what = 'element' } = {}) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(TAB);
    if (await page.evaluate(predicate)) return i + 1;
  }
  throw new Error(`Could not reach ${what} with Tab in ${max} presses`);
}

// [label, visible width, visible height, screen width, screen height, touch]
const SIZES = [
  ['phone 320x568', 320, 568, 320, 568, true],
  ['phone 360x668', 360, 668, 360, 800, true],
  ['phone 375x495', 375, 495, 375, 667, true],
  ['phone 390x699', 390, 699, 390, 844, true],
  ['phone 412x783', 412, 783, 412, 915, true],
  ['phone sideways 874x330', 874, 330, 874, 402, true],
  ['phone sideways 915x360', 915, 360, 915, 412, true],
  ['tablet 744x1047', 744, 1047, 744, 1133, true],
  ['tablet 1133x658', 1133, 658, 1133, 744, true],
  ['tablet 820x1094', 820, 1094, 820, 1180, true],
  ['tablet 1180x734', 1180, 734, 1180, 820, true],
  ['desktop 1280x900', 1280, 900, 1280, 900, false],
  ['desktop 1440x1000', 1440, 1000, 1440, 1000, false],
  ['desktop 1920x1080', 1920, 1080, 1920, 1080, false],
];
// Round 4 (2026-11-13): the Play button is named "Play the example" before and after a play.
const LABEL_FIRST = 'Play the example';
const LABEL_AGAIN = LABEL_FIRST;
const LABEL_STOP = 'Stop';
const SENTENCE = 'I need water';
/** The hero h1 since round 3 (2026-11-12): the promise, matching the <title>. */
const H1 = 'Type on 9 keys. Hear your sentence.';

const pw = loadPlaywright();
const browser = await pw[engine].launch();
console.log(`site check on ${BASE_URL} (${engine}${OFFLINE ? ', OFFLINE=1' : ''})`);

/** A size-pass context, built like responsive.mjs (R7), with the theme (and key size) set before first paint. */
async function sizeContext([, width, height, sw, sh, touch], { reducedMotion = 'reduce', serviceWorkers = 'block', theme = 'night', keysize = null } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    screen: { width: sw, height: sh },
    deviceScaleFactor: 2,
    hasTouch: touch,
    isMobile: touch && engine === 'chromium',
    reducedMotion,
    serviceWorkers,
  });
  await ctx.addInitScript(
    ({ t, k }) => {
      try {
        localStorage.setItem('nl-theme', t);
        if (k) localStorage.setItem('nl-keysize', k);
      } catch {
        /* storage off */
      }
    },
    { t: theme, k: keysize },
  );
  return ctx;
}

/** Layout shift and LCP entries, collected from the first paint (Chromium only). */
async function watchPaint(ctx) {
  await ctx.addInitScript(() => {
    window.__site = { cls: 0, lcp: [], shifted: [] };
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.hadRecentInput) continue;
          window.__site.cls += e.value;
          for (const s of e.sources ?? []) {
            const n = s.node;
            const name = n ? (n.nodeType === 1 ? `${n.tagName.toLowerCase()}.${String(n.className).split(' ')[0]}` : `#text "${(n.textContent ?? '').trim().slice(0, 20)}"`) : '?';
            window.__site.shifted.push(`${name} ${e.value.toFixed(4)}`);
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.__site.lcp.push(e.element ? e.element.tagName : null);
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      /* not supported */
    }
  });
}

/** Load / and wait until SiteMotion has run (motion on: the attribute is "on"; off: every block is instant). */
async function openSite(page, { motion = false } = {}) {
  await page.goto(BASE_URL + '/', { waitUntil: 'load' });
  await page.locator('h1').first().waitFor({ state: 'visible', timeout: 15000 });
  if (motion) {
    await waitFor(page, () => document.documentElement.dataset.siteMotion === 'on', null, { timeout: 20000, what: 'data-site-motion="on"' });
  } else {
    await waitFor(page, () => document.querySelectorAll('[data-reveal]').length > 0 && document.querySelectorAll('[data-reveal]:not([data-revealed])').length === 0, null, {
      timeout: 20000,
      what: 'every reveal block marked instant',
    });
  }
}

const demoLabel = (page) => page.evaluate(() => document.querySelector('.site-demo__label')?.textContent ?? '');
// Round 4: the card's proof chips are the sentence (each word over its keys); the result line is in the live region.
const demoText = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.site-demo__card .nl-chip')]
      .filter((c) => !c.closest('.site-sizer__ghost'))
      .map((c) => c.querySelector('.nl-chip__word')?.textContent ?? '')
      .join(' '),
  );
const demoKeys = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.site-demo__card .nl-chip')]
      .filter((c) => !c.closest('.site-sizer__ghost'))
      .map((c) => (c.querySelector('.nl-chip__code') ?? c.querySelector('.nl-chip__digits'))?.textContent ?? '')
      .join(' '),
  );
const demoLine = (page) => page.evaluate(() => document.querySelector('.site-demo [role="status"]')?.textContent ?? '');
const demoButton = (page) => page.locator('.site-demo__play');
const pause = (page, ms) => page.waitForTimeout(ms);

/** Scroll the whole page in half-viewport steps, so every observer has seen every block. */
async function scrollThrough(page, stepMs = 60) {
  const { max, step } = await page.evaluate(() => ({ max: document.documentElement.scrollHeight - innerHeight, step: Math.max(1, Math.floor(innerHeight / 2)) }));
  for (let y = 0; ; y = Math.min(max, y + step)) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await pause(page, stepMs);
    if (y >= max) break;
  }
}

const noDialog = (page) => page.evaluate(() => document.querySelectorAll('[role="dialog"], [role="alertdialog"], dialog[open]').length === 0);

/** Two animation frames, so observers and styles have caught up with a scroll. */
const frames = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

/** Drawn keys: every .nl-key but the Touch drawing's, and the Touch keys on their own (MS-10.8). */
const keyWidths = (page) =>
  page.evaluate(() => {
    const w = (sel) => [...document.querySelectorAll(sel)].map((k) => k.getBoundingClientRect().width).filter((x) => x > 0);
    return { keys: w('.site .nl-key:not(.site-key--touch)'), touch: w('.site .site-key--touch').sort((a, b) => a - b) };
  });
function keyChecks(label, k) {
  const min = k.keys.length ? Math.min(...k.keys) : 0;
  const max = k.keys.length ? Math.max(...k.keys) : 0;
  check(k.keys.length > 0 && min >= 63.5 && max <= 84.5, `${label}: every drawn key but Touch's is 64-84px wide (${Math.round(min)}-${Math.round(max)}, ${k.keys.length} keys, MS-10.8)`);
  const [a, b] = k.touch;
  check(k.touch.length === 2 && Math.abs(a - 72) <= 0.5 && Math.abs(b - 128) <= 0.5, `${label}: the Touch keys are exactly 72 and 128px wide (${k.touch.map((x) => x.toFixed(1)).join(', ')}, MS-10.8)`);
}

/** No drawing larger than its stage, nothing outside the proof figure, equal stages (MS-7.7). */
const stageFit = (page) =>
  page.evaluate(() => {
    const shown = (el) => el.getClientRects().length > 0;
    const box = (el) => el.getBoundingClientRect();
    const out = (a, b) => a.left < b.left - 0.5 || a.top < b.top - 0.5 || a.right > b.right + 0.5 || a.bottom > b.bottom + 0.5;
    const name = (el) => `${el.closest('section')?.id ?? '?'} ${String(el.className).split(' ').filter((c) => c !== 'site-drawing').slice(0, 2).join('.')}`;
    const over = [];
    let stages = 0;
    for (const stage of document.querySelectorAll('.site-stage')) {
      if (!shown(stage)) continue;
      stages++;
      const s = box(stage);
      if (stage.scrollWidth > stage.clientWidth + 1 || stage.scrollHeight > stage.clientHeight + 1) over.push(`${name(stage)} scrolls ${stage.scrollWidth}x${stage.scrollHeight} in ${stage.clientWidth}x${stage.clientHeight}`);
      for (const d of stage.querySelectorAll('[data-play]')) {
        const r = box(d);
        if (out(r, s)) over.push(`${name(d)} ${Math.round(r.width)}x${Math.round(r.height)} in ${Math.round(s.width)}x${Math.round(s.height)}`);
      }
    }
    for (const frame of document.querySelectorAll('figure.site-proof')) {
      if (!shown(frame)) continue;
      const f = box(frame);
      for (const el of frame.querySelectorAll('*')) {
        if (!shown(el)) continue;
        const r = box(el);
        if (r.width === 0 && r.height === 0) continue;
        if (out(r, f)) {
          over.push(`${name(frame)} > ${name(el)} (${Math.round(r.left - f.left)},${Math.round(r.top - f.top)} ${Math.round(r.width)}x${Math.round(r.height)} in ${Math.round(f.width)}x${Math.round(f.height)})`);
          break;
        }
      }
    }
    const unequal = [];
    // Round 4 (r4-boxes, MS-7.7): in the box sections the stages in one row are equal; each section's lead card has its
    // own row (and its own, taller stage), and on phones every card is its own row.
    for (const id of ['conversation', 'access', 'privacy']) {
      const rows = new Map();
      for (const s of [...document.querySelectorAll(`#${id} .site-bento > .site-card > .site-stage`)].filter(shown)) {
        const top = Math.round(box(s).top);
        rows.set(top, [...(rows.get(top) ?? []), box(s).height]);
      }
      for (const hs of rows.values()) if (Math.max(...hs) - Math.min(...hs) > 0.5) unequal.push(`${id} row ${hs.map(Math.round).join('/')}`);
    }
    // W1 (round 4: all three box sections): on phones a box stage is its drawing plus 12px above and below (space-3),
    // never a shared height.
    if (innerWidth < 600) {
      for (const s of [...document.querySelectorAll('.site-bento .site-stage')].filter(shown)) {
        const d = s.querySelector('[data-play]');
        if (!d) continue;
        const spare = box(s).height - box(d).height;
        if (spare < 23 || spare > 25) unequal.push(`${name(s)} hugs its drawing: ${Math.round(spare)}px spare (want 24)`);
      }
    }
    // Round 4 (2026-11-13): How's three stages are equal in the row from 1024px (one play line for the
    // row); below 1024px each hugs its scene, 12px above and below.
    const how = [...document.querySelectorAll('#how .site-how__stage')].filter(shown);
    if (innerWidth >= 1024) {
      const hs = how.map((s) => box(s).height);
      if (hs.length !== 3 || Math.max(...hs) - Math.min(...hs) > 0.5) unequal.push(`how row ${hs.map(Math.round).join('/')}`);
    } else {
      for (const s of how) {
        const spare = box(s).height - box(s.querySelector('[data-play]')).height;
        if (spare < 23 || spare > 25) unequal.push(`${name(s)} hugs its scene: ${Math.round(spare)}px spare (want 24)`);
      }
    }
    return { stages, over, unequal };
  });
function fitChecks(label, f) {
  check(f.stages > 0 && f.over.length === 0, `${label}: no drawing is larger than its stage (${f.stages} stages) and nothing overflows the proof figure (MS-7.7)${f.over.length ? `: ${f.over.slice(0, 4).join('; ')}` : ''}`);
  check(f.unequal.length === 0, `${label}: MS-7.7 stages in one row have equal heights (box sections: per row, the lead card on its own; How: in its row, hugging below 1024px)${f.unequal.length ? `: ${f.unequal.join('; ')}` : ''}`);
}

/**
 * How it works (round 4): per step, the first and last change of its scene and its lit number, from the computed
 * animation delays and durations (ms after the trigger), and how many ember rings in How are more than half shown.
 */
const howRow = (page) =>
  page.evaluate(() => {
    const ms = (v) => v.split(',').map((s) => parseFloat(s) * (s.trim().endsWith('ms') ? 1 : 1000));
    const steps = [...document.querySelectorAll('#how .site-how__step')].map((li) => {
      let first = Infinity;
      let last = 0;
      for (const el of li.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        if (cs.animationName === 'none') continue;
        const durations = ms(cs.animationDuration);
        ms(cs.animationDelay).forEach((d, i) => {
          first = Math.min(first, d);
          last = Math.max(last, d + (durations[i] ?? 0));
        });
      }
      return { first: Math.round(first), last: Math.round(last), played: li.querySelector('[data-play]').dataset.played ?? null };
    });
    const rings = [...document.querySelectorAll('#how .site-key-ring, #how .site-press-ring')].filter((r) => Number(getComputedStyle(r).opacity) > 0.5).length;
    return { steps, rings };
  });

/** The data-play roots: their played mark, box and any animation on them or inside (reveal fades excepted). */
const drawingState = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-play]')].map((el, i) => {
      const r = el.getBoundingClientRect();
      const anims = el
        .getAnimations({ subtree: true })
        .filter((a) => !['site-reveal', 'site-fade-in'].includes(a.animationName))
        .map((a) => a.animationName ?? a.transitionProperty ?? 'animation');
      return {
        i,
        name: `${el.closest('section')?.id ?? '?'} ${String(el.className).split(' ').filter((c) => c !== 'site-drawing').slice(0, 1).join('')}`,
        played: el.dataset.played ?? null,
        box: el.getClientRects().length > 0,
        top: r.top,
        bottom: r.bottom,
        height: r.height,
        vh: innerHeight,
        anims,
      };
    }),
  );

/** Scroll from `from` to `to` in `by`px steps (40 by default, either way); after each step call visit(y). */
async function stepScroll(page, from, to, visit, { stepMs = 30, by = 40 } = {}) {
  const dir = to >= from ? 1 : -1;
  for (let y = from; ; y += dir * by) {
    const top = dir > 0 ? Math.min(y, to) : Math.max(y, to);
    await page.evaluate((t) => window.scrollTo(0, t), top);
    await frames(page);
    if (stepMs) await pause(page, stepMs);
    await visit(top);
    if (top === to) break;
  }
}

try {
  // ---- sizes, reduced motion, worker blocked -------------------------------------------------------
  for (const size of SIZES) {
    const [label, width, height] = size;
    console.log(label);
    const ctx = await sizeContext(size);
    const page = await ctx.newPage();
    await openSite(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    const m = await page.evaluate(() => {
      const vw = innerWidth;
      const vh = innerHeight;
      const rect = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
      };
      const inside = (r) => !!r && r.top >= -0.5 && r.left >= -0.5 && r.bottom <= vh + 0.5 && r.right <= vw + 0.5;
      const h1 = rect(document.querySelector('h1'));
      const cta = rect(document.querySelector('.site-bar .nl-btn'));
      const hero = rect(document.querySelector('.site-hero .nl-btn--primary'));
      const bar = rect(document.querySelector('.site-bar'));
      return {
        hScroll: document.documentElement.scrollWidth > vw + 1,
        scrolls: document.documentElement.scrollHeight > vh + 1,
        rotate: document.querySelector('.rotate') !== null,
        h1,
        hero,
        bar,
        h1In: inside(h1),
        ctaIn: inside(cta),
        heroIn: inside(hero),
      };
    });
    check(!m.hScroll, `${label}: no sideways scroll (MS-10.2)`);
    check(!m.rotate && m.scrolls, `${label}: no turn-upright notice and the page scrolls (MS-10.3)`);
    check(m.h1In && m.ctaIn, `${label}: the h1 and the header "Open the app" are on screen at scroll 0 (MS-10.7)`);
    if (height > width && height >= 640) check(m.heroIn, `${label}: the hero "Open the app" is on screen at scroll 0 (MS-10.7; bottom ${Math.round(m.hero?.bottom ?? -1)})`);
    if ((width === 360 && height === 668) || (width === 874 && height === 330)) {
      console.log(`    h1 bottom ${Math.round(m.h1?.bottom ?? -1)}px, hero CTA bottom ${Math.round(m.hero?.bottom ?? -1)}px (design §1)`);
    }
    if ((width === 320 && height === 568) || (width === 360 && height === 668)) {
      console.log(`    bar height ${Math.round(m.bar?.height ?? -1)}px (design §0)`);
    }
    if (width === 360 && height === 668) check((m.bar?.height ?? 999) <= 80.5, `${label}: the bar is at most 80px tall (${Math.round(m.bar?.height ?? -1)}px, MS-10.7)`);
    keyChecks(label, await keyWidths(page));
    fitChecks(label, await stageFit(page));
    // The typing chip and the real chip share a cell and cross-fade: their words start at the same x (review R3-B1).
    const chipEdges = await page.evaluate(() =>
      [...document.querySelectorAll('#proof .site-proof__chip')].map((cell) => [...cell.querySelectorAll('.nl-chip__word')].map((w) => w.getBoundingClientRect().left)),
    );
    const offEdges = chipEdges.filter((ws) => ws.length !== 2 || Math.abs(ws[0] - ws[1]) > 1);
    check(chipEdges.length === 3 && offEdges.length === 0, `${label}: MS-7.9 in each proof row the typing chip's word and the real chip's word start within 1px (${chipEdges.map((ws) => ws.map(Math.round).join('/')).join(', ')})`);

    const t = await page.evaluate(() => {
      const shown = (el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      };
      const name = (el) => (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 24);
      const targets = [...document.querySelectorAll('.site :is(a.nl-btn, button, a.nl-brand, .site-nav a, .site-footer__nav a, .site-links a, summary)')].filter(
        (el) => !el.closest('.nl-skip') && !el.closest('[aria-hidden="true"]') && shown(el),
      );
      const small = targets
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width < 55.5 || r.height < 55.5;
        })
        .map((el) => {
          const r = el.getBoundingClientRect();
          return `${name(el)} ${Math.round(r.width)}x${Math.round(r.height)}`;
        });
      const close = [];
      // Question summaries count as a group too: closed, they stack with only a rule between them.
      for (const group of document.querySelectorAll('.site :is(.site-nav, .site-footer__nav, .site-links, .site-faq-list)')) {
        const links = [...group.querySelectorAll(group.matches('.site-faq-list') ? 'summary' : 'a')].filter(shown).map((el) => [name(el), el.getBoundingClientRect()]);
        for (let i = 0; i < links.length; i++) {
          for (let j = i + 1; j < links.length; j++) {
            const [na, a] = links[i];
            const [nb, b] = links[j];
            const gap = Math.max(b.left - a.right, a.left - b.right, b.top - a.bottom, a.top - b.bottom);
            if (gap < 7.5) close.push(`${na} / ${nb} ${Math.round(gap)}px`);
          }
        }
      }
      const tiny = [];
      for (const el of document.querySelectorAll('.site *')) {
        if (/^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName)) continue;
        if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        if (el.getClientRects().length === 0) continue;
        const px = parseFloat(getComputedStyle(el).fontSize);
        // Drawings use label (16px) or larger too (review R3-P2); caption (14px) is for the footer only.
        const min = el.closest('.site-footer__caption') ? 14 : 16;
        if (px < min - 0.01) tiny.push(`${el.className || el.tagName} ${px}px`);
      }
      return { count: targets.length, small, close, tiny };
    });
    check(t.small.length === 0, `${label}: ${t.count} targets are all at least 56px tall and wide (MS-10.4)${t.small.length ? `: ${t.small.slice(0, 4).join(', ')}` : ''}`);
    check(t.close.length === 0, `${label}: 8px or more between the targets of each link group and between question summaries (MS-10.4)${t.close.length ? `: ${t.close.slice(0, 4).join(', ')}` : ''}`);
    check(t.tiny.length === 0, `${label}: text is 16px or more, inside drawings too (14px only in the footer caption, MS-10.5)${t.tiny.length ? `: ${t.tiny.slice(0, 4).join(', ')}` : ''}`);

    const e = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.background = 'var(--ember)';
      document.querySelector('.site').append(probe);
      const ember = getComputedStyle(probe).backgroundColor;
      probe.remove();
      const fills = [...document.querySelectorAll('.site *')].filter((el) => getComputedStyle(el).backgroundColor === ember);
      const max = document.documentElement.scrollHeight - innerHeight;
      let worst = 0;
      let at = 0;
      for (let y = 0; ; y = Math.min(max, y + Math.max(1, Math.floor(innerHeight / 2)))) {
        window.scrollTo(0, y);
        const n = fills.filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && getComputedStyle(el).visibility !== 'hidden';
        }).length;
        if (n > worst) {
          worst = n;
          at = y;
        }
        if (y >= max) break;
      }
      return { fills: fills.length, worst, at };
    });
    check(e.worst <= 1, `${label}: at most one ember fill on screen at any scroll position (${e.fills} on the page, at most ${e.worst} at once${e.worst > 1 ? ` at ${e.at}px` : ''}, MS-9.1)`);

    // At the end of the page: move the mouse off every control, let any 120 ms hover change end (MS-8.1).
    await page.mouse.move(1, 1);
    await pause(page, 200);
    const still = await page.evaluate(() => ({
      hidden: [...document.querySelectorAll('[data-reveal]')].filter((el) => getComputedStyle(el).opacity !== '1').length,
      animations: document.getAnimations().length,
      attr: document.documentElement.hasAttribute('data-site-motion'),
    }));
    check(!still.attr && still.hidden === 0 && still.animations === 0, `${label}: reduced motion: every block visible and no animation at the end (${still.hidden} hidden, ${still.animations} animations, MS-8.7)`);
    const ds = await drawingState(page);
    const unfinished = ds.filter((d) => d.played !== 'instant');
    check(ds.length > 0 && unfinished.length === 0, `${label}: reduced motion: all ${ds.length} drawings show their finished state (data-played="instant", MS-8.7)${unfinished.length ? `: ${unfinished.slice(0, 4).map((d) => `${d.name} ${d.played}`).join(', ')}` : ''}`);
    await ctx.close();
  }

  // ---- XL key size from the app's setting (MS-10.8, MS-10.2, MS-10.5) -----------------------------
  for (const size of SIZES) {
    const label = `${size[0]}, XL keys`;
    const ctx = await sizeContext(size, { keysize: 'xl' });
    const page = await ctx.newPage();
    await openSite(page);
    const x = await page.evaluate(() => ({
      keysize: document.documentElement.dataset.keysize,
      hScroll: document.documentElement.scrollWidth > innerWidth + 1,
    }));
    check(x.keysize === 'xl', `${label}: <html data-keysize="xl"> (${x.keysize})`);
    check(!x.hScroll, `${label}: no sideways scroll (MS-10.2)`);
    keyChecks(label, await keyWidths(page));
    fitChecks(label, await stageFit(page));
    await ctx.close();
  }

  // ---- 320px with a classic scrollbar (review R3-N1, MS-7.7) ----------------------------------------
  // The phone sizes above have overlay scrollbars. A desktop browser at 320px keeps a 15px scrollbar, so the
  // page is 305px wide. Headless browsers may hide scrollbars; then the 305px layout width is set directly.
  {
    const label = 'classic scrollbar 320x568';
    console.log(label);
    let ctx = await sizeContext([label, 320, 568, 320, 568, false]);
    await ctx.addInitScript(() => {
      const css = 'html { overflow-y: scroll } ::-webkit-scrollbar { width: 15px } ::-webkit-scrollbar-thumb { background: gray }';
      document.addEventListener('DOMContentLoaded', () => document.head.append(Object.assign(document.createElement('style'), { textContent: css })));
    });
    let page = await ctx.newPage();
    await openSite(page);
    let cw = await page.evaluate(() => document.documentElement.clientWidth);
    if (cw > 306) {
      await ctx.close();
      ctx = await sizeContext([label, 305, 568, 320, 568, false]);
      page = await ctx.newPage();
      await openSite(page);
      cw = await page.evaluate(() => document.documentElement.clientWidth);
      console.log(`    scrollbars hidden by the headless browser: layout width set to ${cw}px`);
    }
    const hScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    check(cw <= 306 && !hScroll, `${label}: the page is ${cw}px wide and has no sideways scroll (MS-10.2)`);
    fitChecks(label, await stageFit(page));
    await ctx.close();
  }

  // ---- layout: the well hint, the box grids and the switch card (MS-7.7, MS-10.9) -----------------
  for (const size of [
    ['layout 320x568', 320, 568, 320, 568, true],
    ['layout 1024x768', 1024, 768, 1024, 768, false],
    ['layout 768x1024', 768, 1024, 768, 1024, true],
    ['layout 1280x800', 1280, 800, 1280, 800, false],
    ['layout 1920x1080', 1920, 1080, 1920, 1080, false],
  ]) {
    const [label, width, height] = size;
    console.log(label);
    const ctx = await sizeContext(size);
    const page = await ctx.newPage();
    await openSite(page);
    const l = await page.evaluate(() => {
      // Round 4 (r4-boxes): cards per row in each box grid, a lead card first.
      const perRow = (id) => {
        const tops = [...document.querySelectorAll(`#${id} .site-bento > .site-card`)].map((c) => Math.round(c.getBoundingClientRect().top));
        const rows = new Map();
        for (const t of tops) rows.set(t, (rows.get(t) ?? 0) + 1);
        return [...rows.values()];
      };
      // The switch card leads Access (round 4): alone in its row, its stage at most its space-4 padding above and
      // below (32px; space-3 on phones, 24px) taller than its drawing, so it is never a tall, empty tile (review P2).
      const stage = document.querySelector('#access .site-card--lead > .site-stage');
      const scan = stage.querySelector('[data-play]').getBoundingClientRect();
      const spare = stage.getBoundingClientRect().height - scan.height;
      const accessCards = [...document.querySelectorAll('#access .site-bento > .site-card')].map((c) => c.getBoundingClientRect());
      const switchRow = accessCards.filter((r) => Math.abs(r.top - accessCards[0].top) < 1).length;
      const grids = [...document.querySelectorAll('.site-grid, .site-how, .site-how__steps, .site-proof-layout')];
      const ordered = grids.flatMap((g) => [...g.children].filter((c) => getComputedStyle(c).order !== '0').map((c) => String(c.className).split(' ')[0]));
      const dense = grids.filter((g) => getComputedStyle(g).gridAutoFlow.includes('dense')).length;
      const cards = [...document.querySelectorAll('#access .site-bento > .site-card')].map((c) => c.querySelector('h3')?.textContent ?? '');
      // Round 4 (2026-11-13): How's three steps sit in one row from 1024px and in one column below, each
      // stage before its step (DOM order and on screen), nothing sticky. Proof: see the r4-proof lines below.
      const howSteps = [...document.querySelectorAll('#how .site-how__step')];
      const how = {
        count: howSteps.length,
        tops: howSteps.map((li) => Math.round(li.getBoundingClientRect().top)),
        stageFirst: howSteps.every((li) => {
          const [stage, step] = [li.querySelector('.site-how__stage'), li.querySelector('.site-step')];
          const s = stage.getBoundingClientRect();
          const t = step.getBoundingClientRect();
          return li.firstElementChild === stage && (s.bottom <= t.top + 0.5 || s.right <= t.left + 0.5);
        }),
        sticky: [...document.querySelectorAll('#how *')].filter((el) => getComputedStyle(el).position === 'sticky').length,
      };
      const rect = (sel) => document.querySelector(sel).getBoundingClientRect();
      // Round 4 (r4-proof): the head, then the layout (the one play root): figure, steps, note. From 1024px the steps and
      // the note sit left of the figure, its top level with the steps'; below 1024px figure, steps and note stack.
      const [head, fig, steps, more] = ['#proof .site-head', 'figure.site-proof', '#proof .site-proof-steps', '.site-proof__more'].map(rect);
      const proof = {
        underHead: [fig, steps, more].every((r) => r.top >= head.bottom - 0.5),
        beside: fig.left >= steps.right && fig.left >= more.right && Math.abs(fig.top - steps.top) < 1 && more.top > steps.top,
        stacked: steps.top >= fig.bottom && more.top >= steps.bottom,
      };
      // Round 5 (2026-11-17): no mid-page "Open the app" rows; the bar stays at the top of the window instead, with its
      // secondary button in view at every scroll position.
      const mids = [...document.querySelectorAll('main a.nl-btn')].filter((a) => !a.closest('header, #start')).length;
      const bar = document.querySelector('.site-barline');
      const barBtn = bar.querySelector('a.nl-btn[href="/app"]');
      scrollTo(0, document.documentElement.scrollHeight);
      const fixedAtBottom = Math.round(bar.getBoundingClientRect().top) === 0 && barBtn.getBoundingClientRect().bottom <= innerHeight;
      scrollTo(0, 0);
      // Privacy (round 5): the map card, then one card of rows (three ways out), no grid.
      const privacy = [...document.querySelectorAll('#privacy .site-stack > .site-card')].map((c) => c.className);
      const ways = document.querySelectorAll('#privacy .site-rows > li').length;
      return { perRow: { conversation: perRow('conversation'), access: perRow('access') }, spare, switchRow, vw: innerWidth, ordered, dense, cards, how, proof, mids, fixedAtBottom, privacy, ways };
    });
    {
      const row = new Set(l.how.tops).size === 1;
      const column = l.how.tops.every((t, i) => i === 0 || t > l.how.tops[i - 1]);
      check(
        l.how.count === 3 && (width >= 1024 ? row : column) && l.how.stageFirst && l.how.sticky === 0,
        `${label}: How shows its 3 steps ${width >= 1024 ? 'in one row' : 'in one column'}, each stage before its step, nothing sticky (tops ${l.how.tops.join('/')}; round 4)`,
      );
    }
    check(
      l.proof.underHead && (width >= 1024 ? l.proof.beside : l.proof.stacked),
      `${label}: Proof shows its head, then ${width >= 1024 ? 'the steps and the note beside the figure' : 'the figure, the steps and the note in one column'} (round 4, MS-10.9)`,
    );
    check(
      l.mids === 0 && l.fixedAtBottom,
      `${label}: no mid-page "Open the app" rows (${l.mids}); the bar and its button stay in view at the end of the page (round 5, MS-1.6)`,
    );
    check(
      l.privacy.join('|') === 'site-card site-card--lead|site-card site-rows-card' && l.ways === 3,
      `${label}: Privacy shows its map card, then one card with the 3 ways out as rows (${l.privacy.join(' + ')}; round 5)`,
    );
    {
      // Round 4 (MS-10.9): the lead card alone, then 3 cards a row (Conversation, Privacy) from 1024px or 2 + 1 below,
      // and Access 2 + 2; one card a row under 648px.
      const want = l.vw >= 1024 ? { conversation: '1 3', access: '1 2 2' } : l.vw >= 648 ? { conversation: '1 2 1', access: '1 2 2' } : null;
      for (const [id, rows] of Object.entries(l.perRow)) {
        const ok = want ? rows.join(' ') === want[id] : rows.every((n) => n === 1);
        check(ok, `${label}: ${id} shows its lead card, then ${want ? want[id].slice(2) : 'one card a row'} (${rows.join(' + ')}, MS-10.9)`);
      }
    }
    check(
      l.spare >= -0.5 && l.spare <= (l.vw < 600 ? 24.5 : 32.5) && l.switchRow === 1,
      `${label}: the switch card leads Access alone in its row, its stage ${Math.round(l.spare)}px taller than its drawing (at most ${l.vw < 600 ? 24 : 32}; MS-10.9)`,
    );
    check(
      l.ordered.length === 0 && l.dense === 0 && l.cards.join('|') === 'One or two switches|Keyboard|Touch|Your view|Phones, tablets and laptops',
      `${label}: the grids use no CSS order or dense packing, so the Access grid's Tab and reading order is the DOM order (${l.cards.length} Access cards, MS-10.9)${l.ordered.length ? `: ${l.ordered.join(', ')}` : ''}`,
    );
    await ctx.close();
  }

  // ---- motion on ------------------------------------------------------------------------------------
  for (const [width, height] of [
    [1280, 900],
    [390, 844],
  ]) {
    const label = `motion ${width}x${height}`;
    console.log(label);
    const ctx = await newContext(browser, { width, height, reducedMotion: 'no-preference' });
    if (isChromium) await watchPaint(ctx);

    const demoFits = async (page) => {
      const h = await page.evaluate(() => document.querySelector('.site-demo').getBoundingClientRect().height);
      return { h, fits: h <= height / 0.6 };
    };
    /** Watch the label from now: it must read Stop within 2.5 s, stay Stop, then read "Play the example" again by the deadline. */
    const watchAutoplay = async (page, deadlineMs) => {
      const start = Date.now();
      let sawStop = false;
      let brokeStop = false;
      let stopAt = -1;
      for (;;) {
        const l = await demoLabel(page);
        if (l === LABEL_STOP) {
          if (!sawStop) stopAt = Date.now() - start;
          sawStop = true;
        } else if (sawStop && l !== LABEL_AGAIN) brokeStop = true;
        if (sawStop && l === LABEL_AGAIN) return { sawStop, brokeStop, stopAt, endAt: Date.now() - start, ended: true };
        if (!sawStop && Date.now() - start > 2500) return { sawStop, brokeStop, stopAt, endAt: -1, ended: false };
        if (Date.now() - start > deadlineMs) return { sawStop, brokeStop, stopAt, endAt: -1, ended: false };
        await pause(page, 50);
      }
    };
    const noRerun = async (page) => {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await pause(page, 500);
      await page.evaluate(() => document.querySelector('.site-demo').scrollIntoView({ block: 'center' }));
      await pause(page, 2600);
      return (await demoLabel(page)) !== LABEL_STOP;
    };
    const paintChecks = async (page, what) => {
      if (!isChromium) return;
      const p = await page.evaluate(() => window.__site);
      check(p.cls < 0.02, `${label}: layout shift ${p.cls.toFixed(4)} under 0.02 ${what} (MS-6.10, MS-11.2)${p.cls >= 0.02 ? `: ${[...new Set(p.shifted)].slice(0, 6).join(', ')}` : ''}`);
      const last = p.lcp[p.lcp.length - 1] ?? null;
      check(last !== null && last !== 'IMG', `${label}: the largest contentful paint is not an image (${last}, MS-11.2)`);
    };

    // A: motion attribute, the autoplay (at 1280x900 without scrolling: the demo is already in view), MS-8.9.
    {
      const page = await ctx.newPage();
      const t0 = Date.now();
      await openSite(page, { motion: true });
      check(await page.evaluate(() => document.documentElement.hasAttribute('data-site-motion')), `${label}: data-site-motion is set (MS-8.1)`);
      const { h, fits } = await demoFits(page);
      if (!fits) console.log(`    note: the demo (${Math.round(h)}px) can never be 60% in view at ${height}px; autoplay steps skipped`);
      else if (width === 1280) {
        const a = await watchAutoplay(page, 12000 - (Date.now() - t0));
        check(a.sawStop && a.stopAt <= 2500, `${label}: with no scrolling the demo plays on its own, button "Stop" (${a.stopAt} ms, MS-6.3)`);
        check(a.ended && !a.brokeStop, `${label}: it reads Stop for the whole play and "Play the example" within 12 s of load (MS-8.9)`);
        // The last pressed key's ring fades out over motion-jump (120 ms, A3) as the play ends; let it finish.
        await pause(page, 200);
        const running = await page.evaluate(() =>
          document
            .getAnimations()
            .filter((x) => x.timeline === document.timeline && x.playState === 'running')
            .map((x) => {
              const t = x.effect?.target;
              const what = x.animationName ?? x.transitionProperty ?? x.constructor.name;
              return `${what} on ${t ? `${t.tagName.toLowerCase()}.${String(t.className).split(' ')[0]}` : '?'}${x.effect?.pseudoElement ?? ''}`;
            }),
        );
        check(running.length === 0, `${label}: after the autoplay no time-based animation is running (${running.length}${running.length ? `: ${running.slice(0, 4).join(', ')}` : ''}, MS-8.9)`);
        await paintChecks(page, 'with motion on');
        check(await noRerun(page), `${label}: it does not play again after scrolling away and back (MS-6.3)`);
      } else {
        await page.evaluate(() => document.querySelector('.site-demo').scrollIntoView({ block: 'center' }));
        const a = await watchAutoplay(page, 10000);
        check(a.sawStop && a.stopAt <= 2500, `${label}: scrolled into view, the demo plays on its own (${a.stopAt} ms, MS-6.3)`);
        check(a.ended && !a.brokeStop, `${label}: it reads Stop while it plays and "Play the example" within 10 s (MS-6.3, MS-8.9)`);
        await paintChecks(page, 'with motion on');
        check(await noRerun(page), `${label}: it does not play again after scrolling away and back (MS-6.3)`);
      }
      await page.close();
    }
    // A': at 1280x900 the same with scrollIntoView first.
    if (width === 1280) {
      const page = await ctx.newPage();
      await openSite(page, { motion: true });
      await page.evaluate(() => document.querySelector('.site-demo').scrollIntoView({ block: 'center' }));
      const a = await watchAutoplay(page, 10000);
      check(a.sawStop && a.stopAt <= 2500 && a.ended, `${label}: scrolled into view, it plays once and ends on "Play the example" (MS-6.3)`);
      check(await noRerun(page), `${label}: and does not play again after scrolling away and back (MS-6.3)`);
      await page.close();
    }
    // C: Stop during the autoplay shows the finished sentence (MS-6.4).
    {
      const page = await ctx.newPage();
      await openSite(page, { motion: true });
      if ((await demoFits(page)).fits) {
        await page.evaluate(() => document.querySelector('.site-demo').scrollIntoView({ block: 'center' }));
        const sawStop = await waitFor(page, (stop) => document.querySelector('.site-demo__label')?.textContent === stop, LABEL_STOP, { timeout: 2500, what: 'Stop' }).catch(() => false);
        await pause(page, 600);
        const mid = await demoText(page);
        if (sawStop) await demoButton(page).click();
        await pause(page, 100);
        const [text, l] = [await demoText(page), await demoLabel(page)];
        check(sawStop === true && mid !== SENTENCE && text === SENTENCE && l === LABEL_AGAIN, `${label}: Stop during the autoplay ("${mid}") shows "${text}" (MS-6.4)`);
      }
      await page.close();
    }
    // D: a below-the-fold block reveals once it is scrolled to (MS-8.4).
    {
      const page = await ctx.newPage();
      await openSite(page, { motion: true });
      const before = await page.evaluate(() => {
        const el = [...document.querySelectorAll('[data-reveal]:not([data-revealed])')].find((b) => b.getBoundingClientRect().top > innerHeight * 1.5);
        if (!el) return null;
        el.setAttribute('data-site-test', 'reveal');
        return { opacity: Number(getComputedStyle(el).opacity), cls: el.className };
      });
      check(before !== null && before.opacity < 1, `${label}: a below-the-fold block is hidden before it is scrolled to (${before?.cls}, opacity ${before?.opacity}, MS-8.4)`);
      await page.evaluate(() => document.querySelector('[data-site-test="reveal"]')?.scrollIntoView({ block: 'center' }));
      await pause(page, 1100);
      const after = await page.evaluate(() => {
        const el = document.querySelector('[data-site-test="reveal"]');
        return el ? { opacity: getComputedStyle(el).opacity, revealed: el.getAttribute('data-revealed') } : null;
      });
      check(after?.opacity === '1' && after?.revealed === '1', `${label}: a second after, it is fully visible (opacity ${after?.opacity}, data-revealed ${after?.revealed}, MS-8.4)`);
      await page.close();
    }
    // E: Tab into a hidden block before scrolling: it shows at once and never animates (MS-8.4).
    {
      const page = await ctx.newPage();
      await openSite(page, { motion: true });
      const hiddenBefore = await page.evaluate(() => {
        const a = [...document.querySelectorAll('#access a')].find((x) => x.textContent.trim() === 'Open an issue on GitHub');
        const b = a?.closest('[data-reveal]');
        return b ? !b.hasAttribute('data-revealed') : null;
      });
      check(hiddenBefore === true, `${label}: the access note is not revealed yet (MS-8.4)`);
      await tabTo(page, () => document.activeElement?.textContent?.trim() === 'Open an issue on GitHub', { max: 80, what: 'the "Open an issue on GitHub" link' });
      const now = await page.evaluate(() => {
        const b = document.activeElement.closest('[data-reveal]');
        return { opacity: getComputedStyle(b).opacity, revealed: b.getAttribute('data-revealed') };
      });
      check(now.opacity === '1' && now.revealed === 'instant', `${label}: with focus inside, the block is visible and marked instant (opacity ${now.opacity}, ${now.revealed}, MS-8.4)`);
      await pause(page, 1000);
      const later = await page.evaluate(() => {
        const b = document.activeElement.closest('[data-reveal]');
        return { opacity: getComputedStyle(b).opacity, running: b.getAnimations().filter((x) => x.playState === 'running').length };
      });
      check(later.opacity === '1' && later.running === 0, `${label}: a second later it is still visible with no running animation (MS-8.4)`);
      await page.close();
    }
    // F: opacity and transform only, reduce at runtime.
    {
      const page = await ctx.newPage();
      await openSite(page, { motion: true });
      const props = new Set();
      const { max, step } = await page.evaluate(() => ({ max: document.documentElement.scrollHeight - innerHeight, step: Math.floor(innerHeight / 2) }));
      for (let y = 0; ; y = Math.min(max, y + step)) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await pause(page, 80);
        const found = await page.evaluate(() =>
          document
            .getAnimations()
            .flatMap((a) => (a.effect?.getKeyframes?.() ?? []).flatMap((k) => Object.keys(k)))
            .filter((k) => !['offset', 'computedOffset', 'easing', 'composite'].includes(k)),
        );
        for (const p of found) props.add(p);
        if (y >= max) break;
      }
      const other = [...props].filter((p) => p !== 'opacity' && p !== 'transform');
      check(other.length === 0, `${label}: animations change only opacity and transform (${[...props].join(', ') || 'none seen'}, MS-8.10)`);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await pause(page, 300);
      const r = await page.evaluate(() => ({ attr: document.documentElement.hasAttribute('data-site-motion'), animations: document.getAnimations().length }));
      check(!r.attr && r.animations === 0, `${label}: turning on reduced motion removes the attribute and every animation (${r.animations}, MS-8.8)`);
      const notDone = (await drawingState(page)).filter((d) => d.played !== 'instant');
      check(notDone.length === 0, `${label}: and marks every drawing finished, so none plays if motion comes back (MS-8.13)${notDone.length ? `: ${notDone.slice(0, 4).map((d) => d.name).join(', ')}` : ''}`);
      await page.close();
    }
    // Layout shift with motion off.
    if (isChromium) {
      const off = await newContext(browser, { width, height });
      await watchPaint(off);
      const page = await off.newPage();
      await openSite(page);
      await pause(page, 2000);
      await paintChecks(page, 'with motion off');
      await off.close();
    }
    await ctx.close();
  }
  if (!isChromium) console.log('note: layout shift and LCP are checked in Chromium only');

  // ---- round 4: How it works plays in story order along its row (MS-8.11; the A8 step sync is gone) ----------
  // From 1024px the row's three scenes reach the play line together and play in order (step 2 waits step 1's four
  // presses, step 3 also step 2's pick), the last change 3,780 ms after the trigger, one ember ring at a time. Below
  // 1024px each scene plays on its own, from the lead. Nothing writes data-how-* and nothing is sticky.
  for (const [width, height, row] of [
    [1280, 800, true],
    [1024, 768, true],
    [768, 1024, false],
  ]) {
    const label = `MS-8.11 How ${row ? 'story row' : 'column'} ${width}x${height}`;
    console.log(label);
    const ctx = await newContext(browser, { width, height, reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    await openSite(page, { motion: true });
    const target = await page.evaluate(() => {
      const r = document.querySelector('#how .site-how__steps').getBoundingClientRect();
      return Math.max(0, Math.round(r.top + scrollY - innerHeight * 0.15));
    });
    let most = 0;
    await stepScroll(page, 0, target, async () => {});
    const start = Date.now();
    while (Date.now() - start < 4200) {
      most = Math.max(most, (await howRow(page)).rings);
      await pause(page, 60);
    }
    const r = await howRow(page);
    const attrs = await page.evaluate(() => document.querySelectorAll('[data-how-step], [data-how-play], [data-how-live]').length);
    const firsts = r.steps.map((s) => s.first);
    const lasts = r.steps.map((s) => s.last);
    const played = r.steps.map((s) => s.played).join(',');
    if (row) {
      check(
        played === '1,1,1' && firsts.join(',') === '300,2140,3100' && lasts.join(',') === '2100,3300,3780' && attrs === 0,
        `${label}: the three scenes play in story order (first changes ${firsts.join('/')}, last ${lasts.join('/')} ms; played ${played})`,
      );
    } else {
      // No step waits for another: each one that played starts at its own lead (step 1 at 300, step 2's first row at
      // 540, step 3 at 300). A step already in view at load is finished and never plays (MS-8.13).
      const own = [300, 540, 300];
      const ran = r.steps.map((s, i) => [s, i]).filter(([s]) => s.played === '1');
      check(
        ran.length > 0 && ran.every(([s, i]) => s.first === own[i]) && attrs === 0,
        `${label}: below 1024px each scene plays on its own from the lead (first changes ${firsts.join('/')} ms; played ${played})`,
      );
    }
    check(most <= 1, `${label}: at most one ember ring at a time across How (saw ${most}, MS-7.3)`);
    await ctx.close();
  }

  // ---- round 2: played sequences (A7, MS-8.11, MS-8.13) ---------------------------------------------
  // Phones: the How stages and the proof figure play in view, scrolling down in 40px steps. A drawing
  // taller than the viewport plays with its top at the top (shouldPlay), so only its top is checked.
  for (const [width, height] of [
    [320, 568],
    [375, 667],
  ]) {
    const label = `${width}x${height}`;
    const ctx = await newContext(browser, { width, height, reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    await openSite(page, { motion: true });
    await page.evaluate(() => {
      // Round 4 (r4-proof): the proof's play root is its whole layout (figure, steps, note).
      for (const el of document.querySelectorAll('.site-how__stage [data-play], #proof [data-play]')) el.setAttribute('data-site-tall', '');
    });
    const to = await page.evaluate(() => {
      const r = document.querySelector('#proof').getBoundingClientRect();
      return Math.min(document.documentElement.scrollHeight - innerHeight, Math.ceil(r.bottom + scrollY));
    });
    const at = new Map();
    await stepScroll(page, 0, to, async () => {
      for (const d of await drawingState(page)) if (d.played === '1' && !at.has(d.i)) at.set(d.i, d);
    });
    const tall = await page.evaluate(() => [...document.querySelectorAll('[data-play]')].flatMap((el, i) => (el.hasAttribute('data-site-tall') ? [i] : [])));
    const names = (await drawingState(page)).map((d) => d.name);
    const bad = tall.flatMap((i) => {
      const d = at.get(i);
      if (!d) return [`${names[i]} never played`];
      const ok = d.top >= -40 && (d.height > d.vh || d.bottom <= d.vh + 1);
      return ok ? [] : [`${d.name} ${Math.round(d.top)} to ${Math.round(d.bottom)}`];
    });
    check(tall.length === 4 && bad.length === 0, `${label}: MS-8.11 tall drawings play in view (${tall.length} How stages and proof)${bad.length ? `: ${bad.join(', ')}` : ''}`);
    await ctx.close();
  }

  // Round 4 (r4-proof, MS-8.11, lead ruling 1.2): the proof's step numbers light on the figure's clock. Scroll the proof
  // root to the play line, then pause its animations and seek: at 640, 1120, 2080, 2320 and 3040 ms (mid-beat, after
  // each 200 ms fade) exactly one number is lit (1, 2, 3, 3, then 4), at 2320 the differing letter's box is in (its mark
  // jumps in at 1,980 to 2,100 ms), at 3700 nothing is lit and no play animation is left. With reduced motion no number
  // is ever lit and nothing animates.
  for (const [width, height, reducedMotion] of [
    [1280, 800, 'no-preference'],
    [390, 844, 'no-preference'],
    [1280, 800, 'reduce'],
  ]) {
    const label = `${width}x${height} ${reducedMotion}`;
    const ctx = await newContext(browser, { width, height, reducedMotion });
    const page = await ctx.newPage();
    await openSite(page, { motion: reducedMotion === 'no-preference' });
    const to = await page.evaluate(() => Math.ceil(document.querySelector('#proof [data-play]').getBoundingClientRect().top + scrollY));
    let played = null;
    // To 40px past the root's top: on phones the root is taller than the viewport and plays as its top crosses the top.
    await stepScroll(page, Math.max(0, to - height), to + 40, async () => {
      played = await page.evaluate(() => document.querySelector('#proof [data-play]').dataset.played ?? null);
    });
    const lit = () => page.evaluate(() => [...document.querySelectorAll('#proof .site-step__lit')].map((el) => Number(getComputedStyle(el).opacity)));
    if (reducedMotion === 'reduce') {
      const now = await lit();
      const anims = await page.evaluate(() => {
        const sec = document.querySelector('#proof');
        return document.getAnimations().filter((a) => a.effect?.target && sec.contains(a.effect.target)).length;
      });
      check(now.length === 4 && now.every((o) => o === 0) && anims === 0, `${label}: MS-8.7 the proof's step numbers are never lit and nothing animates (${now.join('/')}, ${anims} animations)`);
      await ctx.close();
      continue;
    }
    await page.evaluate(() => {
      const sec = document.querySelector('#proof');
      for (const a of document.getAnimations()) if (a.effect?.target && sec.contains(a.effect.target)) a.pause();
    });
    const seen = [];
    let markIn = false;
    for (const [t, want] of [
      [640, 0],
      [1120, 1],
      [2080, 2],
      [2320, 2],
      [3040, 3],
      [3700, -1],
    ]) {
      await page.evaluate((tt) => {
        const sec = document.querySelector('#proof');
        for (const a of document.getAnimations()) if (a.effect?.target && sec.contains(a.effect.target)) a.currentTime = tt;
      }, t);
      await frames(page);
      const o = await lit();
      seen.push(`${t}:${o.map((x) => Math.round(x * 100) / 100).join('/')}`);
      const ok = o.every((x, i) => (i === want ? x > 0.95 : x < 0.05));
      check(ok, `${label}: MS-8.11 at ${t} ms ${want < 0 ? 'no proof step number is lit' : `only step ${want + 1}'s number is lit`} (${o.map((x) => x.toFixed(2)).join('/')})`);
      if (t === 2320) markIn = await page.evaluate(() => Number(getComputedStyle(document.querySelector('#proof .site-letter__box')).opacity) > 0.95);
    }
    check(played === '1' && markIn, `${label}: MS-7.9 the proof played once at the play line (${played}) and the differing letter is boxed by 2320 ms (${markIn})`);
    await page.evaluate(() => {
      const sec = document.querySelector('#proof');
      for (const a of document.getAnimations()) if (a.effect?.target && sec.contains(a.effect.target)) a.play();
    });
    await pause(page, 1000);
    const left = await page.evaluate(() => {
      const root = document.querySelector('#proof [data-play]');
      return document.getAnimations().filter((a) => a.effect?.target && root.contains(a.effect.target) && a.animationName !== 'site-reveal').length;
    });
    check(left === 0, `${label}: MS-8.11 no play animation is left on the proof after its last change (${left})`);
    await ctx.close();
  }

  // Entered from above: load at the top, go to #faq, scroll up in 40px steps.
  // At 320x568 the proof figure is taller than the viewport, so only its top is checked (shouldPlay).
  for (const [width, height] of [
    [320, 568],
    [375, 667],
    [1280, 800],
  ]) {
    const label = `${width}x${height}`;
    const ctx = await newContext(browser, { width, height, reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    await openSite(page, { motion: true });
    await page.evaluate(() => {
      location.hash = '#faq';
    });
    await frames(page);
    await pause(page, 300);
    const start = await page.evaluate(() => Math.round(scrollY));
    const waiting = new Set((await drawingState(page)).filter((d) => d.played === null && d.box && d.bottom <= 0).map((d) => d.i));
    const at = new Map();
    await stepScroll(page, start, 0, async () => {
      for (const d of await drawingState(page)) if (d.played === '1' && !at.has(d.i)) at.set(d.i, d);
    });
    const bad = [...at.values()].filter((d) => !(d.top >= -40 && (d.height > d.vh || d.bottom <= d.vh + 40))).map((d) => `${d.name} ${Math.round(d.top)} to ${Math.round(d.bottom)}`);
    const names = (await drawingState(page)).map((d) => d.name);
    const never = [...waiting].filter((i) => !at.has(i)).map((i) => names[i]);
    check(
      waiting.size > 0 && bad.length === 0 && never.length === 0,
      `${label}: MS-8.11 drawings entered from above play in view (${at.size} played of ${waiting.size} above #faq)${bad.length ? `: ${bad.slice(0, 4).join(', ')}` : ''}${never.length ? `; never played: ${never.join(', ')}` : ''}`,
    );
    await ctx.close();
  }

  // Flicks on short phones (review N1): scroll down to #faq in 150px steps, wider than the 8-23px window the
  // 376px switch drawing had above the play line. Every drawing whose top went above the viewport has played,
  // and each played in view: whole box on screen, or for one taller than the viewport its top at most 30% of
  // the viewport above the top (shouldPlay).
  for (const [width, height] of [
    [375, 549],
    [320, 568],
  ]) {
    const label = `flick ${width}x${height}`;
    const ctx = await newContext(browser, { width, height, reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    await openSite(page, { motion: true });
    const to = await page.evaluate(() => Math.min(document.documentElement.scrollHeight - innerHeight, Math.round(document.querySelector('#faq').getBoundingClientRect().top + scrollY)));
    const at = new Map();
    await stepScroll(
      page,
      0,
      to,
      async () => {
        for (const d of await drawingState(page)) if (d.played === '1' && !at.has(d.i)) at.set(d.i, d);
      },
      { by: 150 },
    );
    const bad = [...at.values()]
      .filter((d) => {
        const inView = d.top >= -1 && d.bottom <= d.vh + 1;
        const covers = d.height > d.vh * 0.7 && d.top <= 1 && d.top >= -d.vh * 0.3 - 1;
        return !(inView || covers);
      })
      .map((d) => `${d.name} ${Math.round(d.top)} to ${Math.round(d.bottom)}`);
    const never = (await drawingState(page)).filter((d) => d.box && d.played === null && d.top < -1).map((d) => d.name);
    const scan = (await drawingState(page)).find((d) => d.name === 'access site-scan');
    check(
      at.size > 0 && bad.length === 0 && never.length === 0 && scan?.played === '1',
      `${label}: MS-8.11 drawings a 150px flick passes play, in view (${at.size} played; switch ${scan?.played ?? 'missing'})${bad.length ? `: ${bad.slice(0, 4).join(', ')}` : ''}${never.length ? `; never played: ${never.join(', ')}` : ''}`,
    );
    await ctx.close();
  }

  // A reload at #access: the drawings in view are finished at once and never animate (MS-8.13).
  {
    const label = 'reload at #access 1280x800';
    const ctx = await newContext(browser, { width: 1280, height: 800, reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    await page.goto(BASE_URL + '/#access', { waitUntil: 'load' });
    await waitFor(page, () => document.documentElement.dataset.siteMotion === 'on', null, { timeout: 20000, what: 'data-site-motion="on"' });
    // WebKit (Playwright, 2026-11-13) comes back to the top of the page after a reload at any anchor (#how, #access,
    // #privacy, #faq alike), so no drawing is in view to check there; it checks this first load at #access instead,
    // the same case: drawings already in view when motion starts (MS-8.13). Chromium checks the reload.
    if (isChromium) {
      await page.reload({ waitUntil: 'load' });
      await waitFor(page, () => document.documentElement.dataset.siteMotion === 'on', null, { timeout: 20000, what: 'data-site-motion="on"' });
    }
    const inView = async () => (await drawingState(page)).filter((d) => d.box && d.top < d.vh && d.bottom > 0);
    const now = await inView();
    await pause(page, 1000);
    const later = await inView();
    const bad = [...now, ...later].filter((d) => d.played !== 'instant' || d.anims.length > 0).map((d) => `${d.name} ${d.played} ${d.anims.join('/')}`);
    check(now.length > 0 && bad.length === 0, `${label}: the ${now.length} drawings in view show their finished state with no animation (MS-8.13)${bad.length ? `: ${bad.slice(0, 4).join(', ')}` : ''}`);
    await ctx.close();
  }

  // Every drawing ends finished 4.5 s after it played, and nothing shifts while they play.
  for (const [width, height] of [
    [1280, 800],
    [375, 667],
  ]) {
    const label = `played sequences ${width}x${height}`;
    console.log(label);
    const ctx = await newContext(browser, { width, height, reducedMotion: 'no-preference' });
    if (isChromium) await watchPaint(ctx);
    const page = await ctx.newPage();
    await openSite(page, { motion: true });
    const cls0 = isChromium ? (await page.evaluate(() => window.__site)).cls : 0;
    const playedAt = new Map();
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    await stepScroll(
      page,
      0,
      max,
      async () => {
        for (const d of await drawingState(page)) if (d.played === '1' && !playedAt.has(d.i)) playedAt.set(d.i, Date.now());
      },
      { stepMs: 0 },
    );
    const last = Math.max(...playedAt.values());
    await pause(page, Math.max(0, last + 4500 - Date.now()));
    const ds = await drawingState(page);
    const shown = ds.filter((d) => d.box);
    const unplayed = shown.filter((d) => !d.played).map((d) => d.name);
    const running = shown.filter((d) => d.anims.length > 0).map((d) => `${d.name} ${d.anims.join('/')}`);
    // Round 4: How's step numbers sit beside their scenes (.site-step, lit by :has()), so they are checked here too.
    const how = await page.evaluate(() =>
      [...document.querySelectorAll('#how .site-step')].flatMap((s) => s.getAnimations({ subtree: true })).filter((a) => !['site-reveal', 'site-fade-in'].includes(a.animationName)).length,
    );
    check(playedAt.size > 0 && unplayed.length === 0, `${label}: every shown drawing played or was finished (${playedAt.size} played, ${shown.length} shown, MS-8.11)${unplayed.length ? `: ${unplayed.slice(0, 4).join(', ')}` : ''}`);
    check(running.length === 0 && how === 0, `${label}: each drawing is finished with no animation 4.5 s after the play line (MS-8.11)${running.length ? `: ${running.slice(0, 4).join(', ')}` : ''}${how ? `; How step numbers ${how}` : ''}`);
    if (isChromium) {
      const p = await page.evaluate(() => window.__site);
      check(p.cls - cls0 === 0, `${label}: no layout shift while the drawings play (${(p.cls - cls0).toFixed(4)}, MS-11.2)${p.cls - cls0 ? `: ${[...new Set(p.shifted)].slice(-6).join(', ')}` : ''}`);
    }
    await ctx.close();
  }
  if (!isChromium) console.log('note: layout shift while drawings play is checked in Chromium only');

  // ---- no JavaScript (MS-8.7) -----------------------------------------------------------------------
  {
    console.log('no JavaScript');
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false, reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    await page.goto(BASE_URL + '/', { waitUntil: 'load' });
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 15000 });
    await scrollThrough(page);
    const n = await page.evaluate(() => ({
      attr: document.documentElement.hasAttribute('data-site-motion'),
      hidden: [...document.querySelectorAll('[data-reveal]')].filter((el) => getComputedStyle(el).opacity !== '1').length,
      blocks: document.querySelectorAll('[data-reveal]').length,
      text: [...document.querySelectorAll('.site-demo__card .nl-chip')]
        .filter((c) => !c.closest('.site-sizer__ghost'))
        .map((c) => c.querySelector('.nl-chip__word')?.textContent ?? '')
        .join(' '),
      invite: document.querySelector('.site-demo__status')?.textContent ?? null,
      animations: document.getAnimations().length,
    }));
    check(!n.attr, 'no JavaScript: no data-site-motion (MS-8.7)');
    check(n.blocks > 0 && n.hidden === 0, `no JavaScript: all ${n.blocks} blocks visible (MS-8.7)`);
    check(n.text === SENTENCE, `no JavaScript: the demo shows "${n.text}" (MS-6.2, MS-8.7)`);
    // Round 4: the invitation line shows only once the keys work, so a page without JavaScript promises nothing.
    check(n.invite === '', `no JavaScript: the demo's status line is empty ("${n.invite}", MS-6.2)`);
    check(n.animations === 0, `no JavaScript: no animation after scrolling to the end (${n.animations}, MS-8.7)`);
    await ctx.close();
  }

  // ---- privacy --------------------------------------------------------------------------------------
  {
    console.log('privacy, worker blocked');
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    const urls = [];
    page.on('request', (r) => urls.push(r.url()));
    await openSite(page);
    await scrollThrough(page);
    for (const s of await page.locator('.site-faq summary').all()) await s.click();
    await pause(page, 300);
    const data = urls.filter((u) => u.startsWith(ORIGIN) && new URL(u).pathname.startsWith('/data/'));
    check(data.length === 0, `the page requests nothing under /data/ (${urls.length} requests, MS-2.5)${data.length ? `: ${data.slice(0, 3).join(', ')}` : ''}`);
    const cookies = await ctx.cookies();
    const s = await page.evaluate(async () => ({
      cookie: document.cookie,
      local: Object.keys(localStorage).sort(),
      session: Object.keys(sessionStorage),
      idb: typeof indexedDB.databases === 'function' ? (await indexedDB.databases()).map((d) => d.name) : [],
    }));
    check(cookies.length === 0 && s.cookie === '', `no cookies (${cookies.length}, MS-12.1)`);
    check(s.local.join(',') === 'nl-theme' && s.session.length === 0, `storage holds only what the test set (localStorage ${s.local.join(',')}; sessionStorage ${s.session.join(',') || 'empty'}, MS-12.1)`);
    check(s.idb.length === 0, `no IndexedDB database (${s.idb.join(',') || 'none'}, MS-12.1)`);
    await ctx.close();
  }
  {
    console.log('privacy, worker allowed');
    const ctx = await newContext(browser, { serviceWorkers: 'allow', reducedMotion: 'no-preference' });
    const urls = [];
    // context.on('request') also reports the worker's requests in Chromium (MS-12.2).
    ctx.on('request', (r) => urls.push(r.url()));
    const page = await ctx.newPage();
    await openSite(page, { motion: true });
    check(await noDialog(page), 'no dialog or consent banner after load (MS-12.3)');
    await pause(page, 5000);
    check(await noDialog(page), 'no dialog or consent banner after 5 s (MS-12.3)');
    await scrollThrough(page);
    await page.evaluate(() => document.querySelector('.site-demo').scrollIntoView({ block: 'center' }));
    // Round 4: the button reads "Play the example" before and after a play, so wait for Stop first, then for its end.
    await waitFor(page, (stop) => document.querySelector('.site-demo__label')?.textContent === stop, LABEL_STOP, { timeout: 5000, what: 'the autoplay to start' }).catch((e) => console.log(`    note: ${e.message}`));
    await waitFor(page, (again) => document.querySelector('.site-demo__label')?.textContent === again, LABEL_AGAIN, { timeout: 15000, what: 'the autoplay to end' }).catch((e) => console.log(`    note: ${e.message}`));
    for (const s of await page.locator('.site-faq summary').all()) await s.click();
    await pause(page, 500);
    const other = urls.filter((u) => !u.startsWith('data:') && !u.startsWith('blob:') && new URL(u).origin !== ORIGIN);
    check(other.length === 0, `every request, page or worker, goes to ${ORIGIN} (${urls.length} requests, MS-12.2, MS-12.3)${other.length ? `: ${other.slice(0, 3).join(', ')}` : ''}`);
    await ctx.close();
  }

  // ---- routes ---------------------------------------------------------------------------------------
  {
    console.log('routes');
    const res = await fetch(BASE_URL + '/welcome', { redirect: 'manual' });
    const loc = res.headers.get('location') ?? '';
    check(res.status === 308 && new URL(loc, BASE_URL + '/').pathname === '/', `/welcome answers ${res.status} to ${loc} (MS-1.3)`);
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    let ok = true;
    await openApp(page).catch((e) => {
      ok = false;
      console.log(`    ${e.message}`);
    });
    check(ok, '/app opens the keypad and reaches "Offline dictionary ready" (MS-1.2)');
    await ctx.close();
  }

  // ---- keyboard -------------------------------------------------------------------------------------
  for (const [width, height] of [
    [1280, 900],
    [820, 1094],
  ]) {
    const label = `keyboard ${width}x${height}`;
    console.log(label);
    const ctx = await newContext(browser, { width, height });
    const page = await ctx.newPage();
    await openSite(page);
    const focus = () =>
      page.evaluate(() => {
        const el = document.activeElement;
        const r = el.getBoundingClientRect();
        return { text: (el.textContent ?? '').trim().replace(/\s+/g, ' '), id: el.id, tag: el.tagName, top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      });
    await page.keyboard.press(TAB);
    const first = await focus();
    check(first.text === 'Skip to content', `${label}: the first Tab focuses "Skip to content" (${first.text}, MS-3.2)`);
    // The nav shows from 960px only (W1, 2026-11-12): under that the bar is brand, then the header CTA, in one row.
    const withNav = width >= 960;
    const want = withNav ? ['Ninth Life', 'How it works', 'Proof check', 'Ways to type', 'Privacy', 'Questions', 'Open the app'] : ['Ninth Life', 'Open the app'];
    const bar = [];
    for (let i = 0; i < want.length; i++) {
      await page.keyboard.press(TAB);
      bar.push(await focus());
    }
    const names = bar.map((f) => f.text);
    check(names.join('|') === want.join('|'), `${label}: Tab order over the bar is brand, ${withNav ? 'the 5 nav links, ' : ''}then the header CTA (${names.join(', ')}, MS-13.2)`);
    let visual = true;
    for (let i = 1; i < bar.length; i++) {
      const a = bar[i - 1];
      const b = bar[i];
      const sameRow = b.top < a.bottom - 1 && a.top < b.bottom - 1;
      if (!(sameRow ? b.left >= a.right - 1 : b.top >= a.bottom - 1)) visual = false;
    }
    const oneRow = bar.every((f) => f.top < bar[0].bottom - 1 && bar[0].top < f.bottom - 1);
    check(visual && oneRow, `${label}: the bar's Tab order follows its visual order, all on one row (R2, MS-13.2, W1)`);

    if (width === 1280) {
      // Skip link: Enter moves focus to main.
      await page.reload({ waitUntil: 'load' });
      await openSite(page);
      await page.keyboard.press(TAB);
      await page.keyboard.press('Enter');
      await pause(page, 200);
      const f = await focus();
      check(f.id === 'main', `${label}: Enter on the skip link moves focus to main (${f.tag}#${f.id}, MS-3.2)`);

      // Every focusable element shows a 4px ring and is not covered (MS-9.4).
      await page.reload({ waitUntil: 'load' });
      await openSite(page);
      const noRing = [];
      const covered = [];
      let steps = 0;
      for (; steps < 150; steps++) {
        await page.keyboard.press(TAB);
        const r = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body || !el.closest('.site')) return { end: true };
          const s = getComputedStyle(el);
          const b = el.getBoundingClientRect();
          const cx = Math.min(innerWidth - 1, Math.max(0, b.left + b.width / 2));
          const cy = Math.min(innerHeight - 1, Math.max(0, b.top + b.height / 2));
          const hit = document.elementFromPoint(cx, cy);
          return {
            end: false,
            first: el.classList.contains('nl-skip'),
            name: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 24),
            ring: parseFloat(s.outlineWidth) >= 3.5 && s.outlineStyle !== 'none',
            shown: !!hit && (el === hit || el.contains(hit)),
          };
        });
        if (r.end || (steps > 0 && r.first)) break;
        if (!r.ring) noRing.push(r.name);
        if (!r.shown) covered.push(r.name);
      }
      check(steps > 20 && noRing.length === 0, `${label}: ${steps} focus stops, each with a 4px outline (MS-9.4)${noRing.length ? `: ${noRing.slice(0, 4).join(', ')}` : ''}`);
      check(covered.length === 0, `${label}: no focused element is covered by another (MS-9.4)${covered.length ? `: ${covered.slice(0, 4).join(', ')}` : ''}`);

      // Questions: Enter and Space open them (MS-3.4, MS-13.2).
      await page.reload({ waitUntil: 'load' });
      await openSite(page);
      await tabTo(page, () => document.activeElement?.tagName === 'SUMMARY', { max: 120, what: 'the first question' });
      await page.keyboard.press('Enter');
      const enter = await page.evaluate(() => document.activeElement.closest('details').open);
      await page.keyboard.press(TAB);
      await page.keyboard.press('Space');
      const space = await page.evaluate(() => document.activeElement.tagName === 'SUMMARY' && document.activeElement.closest('details').open);
      check(enter && space, `${label}: Enter and Space open a question (Enter ${enter}, Space ${space}, MS-3.4)`);

      // Demo buttons: Enter plays (reduced motion still replays it), Space stops (MS-6.8, MS-13.2).
      await page.reload({ waitUntil: 'load' });
      await openSite(page);
      await tabTo(page, () => !!document.activeElement?.closest('.site-demo__play'), { max: 40, what: 'the demo button' });
      await page.keyboard.press('Enter');
      await pause(page, 300);
      const playing = await demoLabel(page);
      await page.keyboard.press('Space');
      await pause(page, 200);
      const [stopped, text] = [await demoLabel(page), await demoText(page)];
      check(playing === LABEL_STOP && stopped === LABEL_AGAIN && text === SENTENCE, `${label}: Enter plays the demo (${playing}) and Space stops it on "${text}" (MS-13.2)`);
    }
    await ctx.close();
  }

  // ---- try it: the hero keypad (W4, MS-6.11 to MS-6.14) and the first phone screen (W1) ---------------
  for (const [width, height, reducedMotion] of [
    [390, 844, 'no-preference'],
    [1280, 900, 'reduce'],
    [320, 640, 'reduce'],
  ]) {
    const label = `try it ${width}x${height}${reducedMotion === 'reduce' ? ', reduced motion' : ''}`;
    console.log(label);
    const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion, hasTouch: width < 600, isMobile: width < 600 && isChromium, serviceWorkers: 'block' });
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem('nl-theme', 'night');
      } catch {
        /* storage off */
      }
    });
    const page = await ctx.newPage();
    const urls = [];
    page.on('request', (r) => urls.push(r.url()));
    await openSite(page, { motion: reducedMotion !== 'reduce' });
    await pause(page, 1500);

    // The first phone screen shows the demo (W1): at 390x844 the sentence card with its chips and, since round 4, the
    // keypad's first three rows; at 320x640 at least the top of the card. The bar is one row (W1).
    const fold = await page.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      return { bar: r('.site-bar').height, card: r('.site-demo__card'), row3: r('[data-try-key="9"]'), pad: r('.site-demo__keypad'), vh: innerHeight };
    });
    check(fold.bar <= 80.5, `${label}: the bar is one row (${Math.round(fold.bar)}px, W1)`);
    if (width === 390) {
      check(fold.card.bottom <= fold.vh && fold.row3.bottom <= fold.vh, `${label}: the sentence card and the keypad's first three rows are on the first screen (bottoms ${Math.round(fold.card.bottom)}, ${Math.round(fold.row3.bottom)} of ${fold.vh}; keypad top ${Math.round(fold.pad.top)}, MS-6.2a)`);
    }
    if (width === 320) check(fold.card.top < fold.vh, `${label}: the sentence card starts on the first screen (top ${Math.round(fold.card.top)} of ${fold.vh}, MS-6.2a)`);
    if (width === 320) {
      await ctx.close();
      continue;
    }

    // Before any press: the finished example, nothing under /data/ and no try-it script (MS-6.11, MS-2.5).
    if (reducedMotion === 'reduce') check((await demoText(page)) === SENTENCE, `${label}: before any press the demo shows "${SENTENCE}" (MS-6.2)`);
    const before = new Set(urls);
    const dataBefore = urls.filter((u) => u.startsWith(ORIGIN) && new URL(u).pathname.startsWith('/data/'));
    check(dataBefore.length === 0, `${label}: nothing under /data/ before the first press (${urls.length} requests, MS-6.11)`);
    check(!urls.some((u) => /try-engine/.test(u)), `${label}: the try-it engine is not loaded before the first press (MS-6.11)`);

    // Touch or mouse: 4 6 6 3.
    const padTop0 = await page.evaluate(() => document.querySelector('.site-demo__keypad').getBoundingClientRect().top + scrollY);
    for (const k of '4663') await page.locator(`[data-try-key="${k}"]`).click();
    // Round 4: the result line is the polite live region's (MS-6.13); the card shows the chips, the status line "Next:".
    const ok = await waitFor(page, () => /^Keys 4663 match: /.test(document.querySelector('.site-demo [role="status"]')?.textContent ?? ''), null, {
      timeout: 20000,
      what: 'the 4663 result',
    }).catch((e) => (console.log(`    ${e.message}`), false));
    const r = await page.evaluate(() => ({
      text: [...document.querySelectorAll('.site-demo__card .nl-chip')].map((c) => c.querySelector('.nl-chip__word')?.textContent ?? '').join(' '),
      caption: document.querySelector('.site-demo [role="status"]').textContent,
      next: document.querySelector('.site-demo__status').textContent,
      chips: [...document.querySelectorAll('.site-demo__chips:not(.site-sizer__ghost) .nl-chip')].map((c) => c.dataset.state),
      padTop: document.querySelector('.site-demo__keypad').getBoundingClientRect().top + scrollY,
      playing: document.querySelector('.site-demo').classList.contains('is-playing'),
    }));
    const listed = [...r.caption.matchAll(/“([^”]+)”/g)].map((m) => m[1]);
    check(ok && ['Good', 'Home', 'Gone'].every((w) => listed.includes(w)) && r.text === listed[0], `${label}: 4663 shows the decoder's matches (${r.text}; ${r.caption}, MS-6.12)`);
    check(r.chips.length === 1 && r.chips[0] === 'match' && !r.playing, `${label}: one match chip, the example stopped (${r.chips.join(',')}, MS-6.12, MS-6.14)`);
    check(r.next === 'Next: Home, Gone', `${label}: the status line names the readings # gives next ("${r.next}", MS-6.12)`);
    check(Math.abs(r.padTop - padTop0) < 0.5, `${label}: the keypad does not move while typing (${Math.round(padTop0)} -> ${Math.round(r.padTop)}, MS-6.10)`);
    const after = urls.filter((u) => !before.has(u));
    const newScripts = after.filter((u) => /\.js(\?|$)/.test(u));
    const data = after.filter((u) => new URL(u).pathname.startsWith('/data/')).map((u) => new URL(u).pathname).sort();
    check(newScripts.length >= 1 && data.join(',') === '/data/lexicon/en.bigram.v1.json,/data/lexicon/en.v2.json,/data/packs/core-en.json', `${label}: the first press loads the engine script and the app's dictionary, once (${newScripts.length} new script(s); ${data.join(', ')}, MS-6.11)`);
    check(after.every((u) => u.startsWith('data:') || new URL(u).origin === ORIGIN), `${label}: every try-it request goes to ${ORIGIN} (MS-12.2)`);
    const live = await page.evaluate(() => document.querySelector('.site-demo [role="status"]').getAttribute('aria-live'));
    check(live === 'polite' && /^Keys 4663 match: /.test(r.caption), `${label}: the polite live region reads the result line ("${r.caption}", MS-6.13)`);
    if (reducedMotion === 'reduce') {
      await pause(page, 300);
      check((await page.evaluate(() => document.getAnimations().length)) === 0, `${label}: reduced motion: no animation after typing (MS-8.7)`);
    }

    if (width === 1280) {
      // Keyboard only: one Tab stop for the keypad, a focus ring, arrows, digits, Backspace (MS-6.13, MS-9.4).
      await page.reload({ waitUntil: 'load' });
      await openSite(page);
      await tabTo(page, () => !!document.activeElement?.dataset?.tryKey, { max: 40, what: 'the keypad' });
      const k = await page.evaluate(() => {
        const el = document.activeElement;
        const s = getComputedStyle(el);
        return { key: el.dataset.tryKey, ring: parseFloat(s.outlineWidth) >= 3.5 && s.outlineStyle !== 'none', stops: document.querySelectorAll('[data-try-key][tabindex="0"]').length };
      });
      check(k.key === '1' && k.ring && k.stops === 1, `${label}: Tab reaches the keypad once, on key ${k.key}, with a 4px focus ring (${k.stops} Tab stop, MS-6.13, MS-9.4)`);
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowDown');
      const moved = await page.evaluate(() => document.activeElement?.dataset?.tryKey);
      await page.keyboard.type('4663');
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Enter');
      await waitFor(page, () => /^Keys 4665 match/.test(document.querySelector('.site-demo [role="status"]')?.textContent ?? ''), null, { timeout: 20000, what: 'the typed keys' }).catch(() => {});
      const typed = await demoKeys(page);
      check(moved === '5' && typed === '4665', `${label}: arrows move focus (to ${moved}), digits type, Backspace goes back, Enter presses the focused key (${typed}, MS-6.13)`);
      // Round 4: the toolbar follows the keypad in the Tab order: Play the example, Hear it, Clear (MS-6.15).
      await tabTo(page, () => !!document.activeElement?.closest('.site-demo__clear'), { max: 5, what: 'Clear' });
      await page.keyboard.press('Enter');
      await waitFor(page, () => document.querySelector('.site-demo [role="status"]')?.textContent === 'Press a key to start.', null, { timeout: 3000, what: 'the cleared line' }).catch(() => {});
      const cleared = await page.evaluate(() => ({
        chips: document.querySelectorAll('.site-demo__card .nl-chip').length,
        hint: document.querySelector('.site-demo__hint')?.textContent ?? '',
        line: document.querySelector('.site-demo [role="status"]').textContent,
        off: document.querySelector('.site-demo__clear').getAttribute('aria-disabled'),
      }));
      check(cleared.chips === 0 && cleared.hint.startsWith('Press a key to start.') && cleared.line === 'Press a key to start.' && cleared.off === 'true', `${label}: Clear empties the keys (${cleared.chips} chips, "${cleared.hint}", Clear unavailable: ${cleared.off}, MS-6.12, MS-6.15)`);
      // Digits typed while Clear has focus still press the keys (MS-6.16).
      await page.keyboard.type('43');
      await waitFor(page, () => /^Keys 43 match/.test(document.querySelector('.site-demo [role="status"]')?.textContent ?? ''), null, { timeout: 3000, what: 'keys typed on Clear' }).catch(() => {});
      check((await demoKeys(page)) === '43', `${label}: digits typed while a toolbar button has focus press the keys (${await demoKeys(page)}, MS-6.16)`);
      // Back to Play, which comes first in the toolbar.
      for (let i = 0; i < 3 && !(await page.evaluate(() => !!document.activeElement?.closest('.site-demo__play'))); i++) await page.keyboard.press(`Shift+${TAB}`);
      await page.keyboard.press('Enter');
      await pause(page, 300);
      const back = await page.evaluate(() => ({ trying: document.querySelector('.site-demo').classList.contains('is-trying'), label: document.querySelector('.site-demo__label').textContent }));
      check(!back.trying && back.label === LABEL_STOP, `${label}: Play the example goes back to the example and plays it (${back.label}, MS-6.14)`);
    }
    await ctx.close();
  }

  // ---- try it: the keypad never moves (round 3, R3-P1, 2026-11-13; MS-6.10; round 4, 2026-11-13) -----------
  // At every size: key 1 first, Clear, 4663, # (the line lists every match and marks the one on show), Clear again,
  // "He need water" (43 0 6333 0 92837) and then a much longer sentence. Through all of it the keypad and the toolbar
  // (Play, Hear it, Clear) stay where they were, the card keeps one height, the status line is one line and at most
  // three chips show, all in one row. The result line is read in the polite live region (round 4: no caption).
  const LIVE = '.site-demo [role="status"]';
  for (const size of SIZES) {
    const [name, width, height] = size;
    const label = `try it steady ${name}`;
    console.log(label);
    const ctx = await sizeContext(size);
    const page = await ctx.newPage();
    await openSite(page);
    const touch = size[5];
    const geo = () =>
      page.evaluate((live) => {
        const top = (s) => document.querySelector(s).getBoundingClientRect().top + scrollY;
        const status = document.querySelector('.site-demo__status');
        const chips = [...document.querySelectorAll('.site-demo__chips:not(.site-sizer__ghost) > li')];
        const rows = new Set(chips.map((c) => Math.round(c.getBoundingClientRect().top))).size;
        const shown = [...document.querySelectorAll('.site-demo__card .nl-chip')].filter((c) => !c.closest('.site-sizer__ghost'));
        return {
          pad: top('.site-demo__keypad'),
          foot: top('.site-demo__tools'),
          end: document.querySelector('.site-demo').getBoundingClientRect().bottom + scrollY,
          card: document.querySelector('.site-demo__card').getBoundingClientRect().height,
          statusLines: Math.round((status.getBoundingClientRect().height - parseFloat(getComputedStyle(status).paddingTop) * 2) / parseFloat(getComputedStyle(status).lineHeight)),
          chips: chips.length,
          rows,
          caption: document.querySelector(live).textContent,
          hint: document.querySelector('.site-demo__hint')?.textContent ?? '',
          sentence: shown.map((c) => c.querySelector('.nl-chip__word')?.textContent ?? '').join(' '),
          keys: shown.map((c) => (c.querySelector('.nl-chip__code') ?? c.querySelector('.nl-chip__digits'))?.textContent ?? '').join(' '),
          sideways: document.documentElement.scrollWidth - innerWidth,
        };
      }, LIVE);
    const press = async (keys) => {
      for (const k of keys) {
        const key = page.locator(`[data-try-key="${k}"]`);
        if (touch) await key.tap();
        else await key.click();
      }
    };
    const base = await geo();
    const seen = [];
    const step = async (what) => {
      const g = await geo();
      seen.push([what, g]);
      return g;
    };
    const lineIs = (re, what, timeout = 5000) =>
      waitFor(page, ([live, src]) => new RegExp(src).test(document.querySelector(live)?.textContent ?? ''), [LIVE, re.source], { timeout, what }).catch(() => {});
    await press('1');
    await lineIs(/^Key 1 adds punctuation/, 'the key 1 line', 20000);
    const one = await step('1');
    await page.locator('.site-demo__clear').click();
    await lineIs(/^Press a key to start\.$/, 'the cleared line');
    const cleared = await step('Clear');
    await press('4663');
    await lineIs(/^Keys 4663 match: /, 'the 4663 result', 20000);
    await step('4663');
    await press('#');
    await lineIs(/\(shown\)/, 'the # line');
    const hash = await step('#');
    await page.locator('.site-demo__clear').click();
    await lineIs(/^Press a key to start\.$/, 'the cleared line');
    await step('Clear again');
    await press('4306333092837');
    await lineIs(/^Keys 43 6333 92837 match: /, 'He need water');
    const water = await step('43 0 6333 0 92837');
    await press('0843074460333084307446');
    await lineIs(/^Keys .*7446 match/, 'the long sentence');
    const long = await step('8 words');
    const moved = seen.filter(([, g]) => Math.abs(g.pad - base.pad) >= 0.5 || Math.abs(g.foot - base.foot) >= 0.5 || Math.abs(g.end - base.end) >= 0.5);
    check(
      moved.length === 0,
      `${label}: the keypad and the toolbar never move (keypad top ${Math.round(base.pad)}, toolbar ${Math.round(base.foot)}; ${moved.map(([w, g]) => `${w}: ${Math.round(g.pad)}/${Math.round(g.foot)}`).join(', ') || 'steady'} through ${seen.length} steps, MS-6.10, R3-P1)`,
    );
    check(
      one.hint === 'Key 1 adds punctuation at the end of the sentence. Now type a word with keys 2 to 9.' && cleared.hint.startsWith('Press a key to start.') && cleared.caption === 'Press a key to start.',
      `${label}: key 1 answers in the card and on the line, and after Clear the card says "Press a key to start." ("${cleared.hint}", R3-P8)`,
    );
    check(/^Keys 4663 match: “Good”, “Home” \(shown\), “Gone”/.test(hash.caption) && hash.sentence === 'Home', `${label}: after # the line lists every match and marks the one on show (${hash.caption}, R3-P4)`);
    check(water.sentence === 'He need water' && water.chips === 3, `${label}: 43 0 6333 0 92837 shows "${water.sentence}" with ${water.chips} chips (MS-6.12)`);
    check(
      seen.every(([, g]) => Math.abs(g.card - base.card) < 0.5 && g.statusLines <= 1 && g.chips <= 3 && g.rows <= 1 && g.sideways <= 0),
      `${label}: the card keeps its height (${Math.round(base.card)}px), the status line is one line, at most 3 chips in one row, no sideways scroll (8 words: "${long.sentence}", ${long.chips} chips, R3-P1)`,
    );
    await ctx.close();
  }

  // ---- round 4: the shared language's control feedback (A9, A10; MS-8.14, MS-8.15; r4-language) -------
  // A pointer device at 1280x900. Hover lays the control's own colour over it at --state-hover; hover and press never
  // move a key or a button; a .site-go arrow points at most --motion-hint further, only with motion on; drawn buttons
  // get no layer; a question's answer rises in as it opens only with motion on.
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const motion = reducedMotion === 'no-preference';
    const label = `round 4 control feedback, motion ${motion ? 'on' : 'off'}`;
    console.log(label);
    const ctx = await newContext(browser, { width: 1280, height: 900, reducedMotion });
    const page = await ctx.newPage();
    await openSite(page, { motion });
    const pseudo = (loc, which) => loc.evaluate((el, w) => getComputedStyle(el, w).opacity, which);
    const box = async (loc) => {
      const b = await loc.boundingBox();
      return b ? [b.x, b.y, b.width, b.height].map((v) => Math.round(v * 2) / 2).join(',') : null;
    };
    const settle = () => pause(page, motion ? 300 : 50);

    // A try-it key: the layer on hover, and neither hover nor press moves it.
    const key = page.locator('.site-key--try').nth(4);
    await key.scrollIntoViewIfNeeded();
    const keyBefore = await box(key);
    await key.hover();
    await settle();
    check(Number(await pseudo(key, '::before')) === 0.08, `${label}: a hovered key shows its own colour at --state-hover (MS-8.14)`);
    check((await box(key)) === keyBefore, `${label}: hovering a key never moves it (MS-8.14, MS-6.10)`);
    await page.mouse.down();
    await pause(page, 60);
    check((await box(key)) === keyBefore, `${label}: pressing a key never moves it (MS-8.14, MS-6.10)`);
    await page.mouse.up();

    // The hero's ember button: the layer, no movement.
    const primary = page.locator('.site-hero .nl-btn--primary').first();
    await primary.scrollIntoViewIfNeeded();
    const primaryBefore = await box(primary);
    await primary.hover();
    await settle();
    check(Number(await pseudo(primary, '::after')) === 0.08, `${label}: the hovered ember button takes the hover layer, not an ember background (MS-8.14, MS-9.1)`);
    const [primaryLabel, onEmber] = await primary.evaluate((el) => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--on-ember)';
      el.parentElement.append(probe);
      const out = [getComputedStyle(el).color, getComputedStyle(probe).color];
      probe.remove();
      return out;
    });
    check(primaryLabel === onEmber, `${label}: a hovered ember link keeps its on-ember label (${primaryLabel}; MS-9.2)`);
    check((await box(primary)) === primaryBefore, `${label}: hovering a button never moves it (MS-8.14)`);

    // A mid-page secondary button: the edge goes ink.
    const secondary = page.locator('.site-cta .nl-btn--secondary').first();
    if (await secondary.count()) {
      await secondary.scrollIntoViewIfNeeded();
      await secondary.hover();
      await settle();
      const [edge, ink] = await secondary.evaluate((el) => {
        const probe = document.createElement('span');
        probe.style.color = 'var(--ink)';
        el.parentElement.append(probe);
        const out = [getComputedStyle(el).borderTopColor, getComputedStyle(probe).color];
        probe.remove();
        return out;
      });
      check(edge === ink, `${label}: a hovered secondary button's edge turns ink (${edge}, MS-8.14)`);
    }

    // Drawn buttons are pictures: no layer at all.
    const drawn = page.locator('.site-drawn-btn').first();
    if (await drawn.count()) {
      check((await drawn.evaluate((el) => getComputedStyle(el, '::after').content)) === 'none', `${label}: a drawn button gets no hover layer (MS-8.14)`);
    }

    // A link that goes somewhere: its icon moves at most 4px its way with motion on, not at all with motion off.
    const go = page.locator('.site-go:has(> svg.nl-icon)').first();
    if (await go.count()) {
      await go.scrollIntoViewIfNeeded();
      await go.hover();
      await settle();
      const [tx, ty] = await go.evaluate((el) => {
        const m = new DOMMatrixReadOnly(getComputedStyle(el.querySelector(':scope > svg.nl-icon')).transform);
        return [m.m41, m.m42];
      });
      const moved = Math.hypot(tx, ty);
      if (motion) check(moved > 0 && Math.abs(tx) <= 4.01 && Math.abs(ty) <= 4.01, `${label}: a .site-go arrow points at most 4px its way on hover (${tx}, ${ty}; MS-8.14)`);
      else check(moved === 0, `${label}: with motion off a .site-go arrow stays put (MS-8.14)`);
    } else console.log(`    note: no .site-go link on the page yet, the arrow check skipped`);

    // A question's answer: it rises in as it opens with motion on, appears at once with motion off (A10).
    const summary = page.locator('.site-faq summary').first();
    await summary.scrollIntoViewIfNeeded();
    await summary.click();
    const rising = await page.evaluate(() =>
      document.getAnimations().some((a) => a.animationName === 'site-rise' && a.effect?.target?.closest?.('.site-faq[open]')),
    );
    if (motion) check(rising, `${label}: an opened answer rises in (site-rise, MS-8.15)`);
    else check(!rising, `${label}: with motion off an opened answer appears at once (MS-8.15)`);
    if (!motion) {
      await pause(page, 100);
      check((await page.evaluate(() => document.getAnimations().length)) === 0, `${label}: with motion off nothing animates after hover, press and an opened answer (MS-8.7)`);
    }
    await ctx.close();
  }

  // ---- round 4: the end of the page (r4-close; MS-4.4, MS-4.5, MS-4.7, MS-9.1, MS-14.2, MS-14.5) ---------------
  // The footer on /, /about and the 404 (Day theme: it stays Night), Good to know's two cards and the close's facts
  // row, at two phone and two desktop sizes.
  for (const size of [SIZES[0], SIZES[3], SIZES[11], SIZES[12]]) {
    const [label, width] = size;
    const ctx = await sizeContext(size, { theme: 'day' });
    const page = await ctx.newPage();
    for (const path of ['/', '/about', '/no-such-page']) {
      await page.goto(BASE_URL + path, { waitUntil: 'load' });
      const f = await page.evaluate(() => {
        const footer = document.querySelector('footer.site-footer');
        const nav = footer.querySelector('nav[aria-label="Footer"]');
        const links = [...nav.querySelectorAll('a')];
        const top = footer.querySelector('.site-footer__end a');
        // A link that leaves the site keeps its icon right after its last word, on that word's line.
        const loose = [...footer.querySelectorAll('.site-footer__tail')].filter((t) => {
          const range = document.createRange();
          range.selectNodeContents(t.firstChild);
          const word = [...range.getClientRects()].pop();
          const icon = t.querySelector('svg').getBoundingClientRect();
          return !word || icon.left < word.right - 1 || icon.left - word.right > 12 || Math.abs((icon.top + icon.bottom) / 2 - (word.top + word.bottom) / 2) > 8;
        });
        return {
          groups: [...nav.querySelectorAll('.site-footer__group > h2')].map((h) => h.textContent).join(', '),
          links: links.length,
          small: links.filter((a) => a.getBoundingClientRect().width < 55.5 || a.getBoundingClientRect().height < 55.5).map((a) => a.textContent),
          missing: links.map((a) => a.getAttribute('href')).filter((h) => h.startsWith('#') && !document.getElementById(h.slice(1))),
          topHref: top?.getAttribute('href'),
          topTarget: !!document.getElementById((top?.getAttribute('href') ?? '#').slice(1)),
          ground: getComputedStyle(footer).backgroundColor,
          history: footer.querySelector('.site-footer__history')?.textContent ?? '',
          statement: !!footer.querySelector('.site-footer__statement'),
          loose: loose.map((t) => t.textContent),
          hScroll: document.documentElement.scrollWidth > innerWidth + 1,
        };
      });
      const where = `${label} ${path}`;
      check(f.groups === 'Product, Trust, Project' && f.links === 13, `${where}: the footer has the Product, Trust and Project groups, 13 links (${f.groups}; ${f.links}, MS-4.4)`);
      check(f.small.length === 0, `${where}: every footer link is a 56px target (MS-10.4)${f.small.length ? `: ${f.small.join(', ')}` : ''}`);
      check(f.missing.length === 0 && f.topHref === '#top' && f.topTarget, `${where}: every footer anchor and Back to top (#top) has its target (MS-4.4)${f.missing.length ? `: ${f.missing.join(', ')}` : ''}`);
      check(f.ground === 'rgb(20, 10, 46)', `${where}: in the Day theme the footer is Night (${f.ground}, MS-14.2)`);
      check(f.history.startsWith('Made for Kiroween 2026.') && f.statement === (path !== '/about'), `${where}: the history line is there, the statement everywhere but /about (MS-4.4, MS-4.7)`);
      check(f.loose.length === 0, `${where}: each external icon sits right after its link's last word${f.loose.length ? `: ${f.loose.join(', ')}` : ''}`);
      check(!f.hScroll, `${where}: no sideways scroll (MS-10.2)`);
    }
    // Back to top goes to the top (no smooth scrolling, MS-8.5).
    await page.goto(BASE_URL + '/', { waitUntil: 'load' });
    await page.locator('.site-footer__end a').scrollIntoViewIfNeeded();
    await page.locator('.site-footer__end a').click();
    await pause(page, 150);
    check((await page.evaluate(() => scrollY)) < 2, `${label}: Back to top scrolls the page to its top`);
    // Good to know: two cards, side by side from 1024px; each state stays right of its check, on its line.
    const g = await page.evaluate(() => {
      const r = (el) => el.getBoundingClientRect();
      const cards = [...document.querySelectorAll('#limits .site-limits__card')].map(r);
      const states = [...document.querySelectorAll('#limits .site-limits__status > li')].map((li) => {
        const c = r(li.querySelector('.site-limits__check'));
        const s = r(li.querySelector('.site-limits__state'));
        return s.left >= c.right && s.top < c.bottom && s.bottom > c.top;
      });
      const tiles = [...document.querySelectorAll('#limits .site-tile')].map((t) => `${Math.round(r(t).width)}x${Math.round(r(t).height)}`);
      const facts = [...document.querySelectorAll('#start .site-start__facts > li')].map(r);
      return {
        cards: cards.length,
        beside: cards.length === 2 && Math.abs(cards[0].top - cards[1].top) < 1 && cards[1].left > cards[0].right,
        states: states.every(Boolean) && states.length === 3,
        tiles: [...new Set(tiles)].join(', '),
        tops: new Set(facts.map((b) => Math.round(b.top))).size,
        facts: facts.length,
      };
    });
    check(g.cards === 2 && g.beside === width >= 1024, `${label}: Good to know shows two cards, ${width >= 1024 ? 'side by side' : 'one above the other'} (MS-4.5)`);
    check(g.states, `${label}: each Testing so far state sits right of its check, on its line (MS-4.5)`);
    check(g.tiles === '48x48', `${label}: every Before you start icon sits on a 48px tile (${g.tiles})`);
    check(g.facts === 4 && g.tops === (width >= 768 ? 1 : 2), `${label}: the close's facts row is ${width >= 768 ? 'one row of four' : '2 x 2'} (${g.tops} rows)`);
    await ctx.close();
  }

  // ---- round 4: Measured, not promised (r4-results; MS-5.1, MS-5.4, MS-5.5, MS-8.11 PO-1) ----------------------
  // Still (reduced motion): every bar is as long as the value printed beside it, on its track; the caveat comes right
  // after the title, before any number; at 390px the section keeps the round's phone budget. Motion on (1440px): each
  // bar grows once from its start edge, ends full, and the numbers never move.
  for (const size of [SIZES[0], SIZES[3], SIZES[11], SIZES[12]]) {
    const [label] = size;
    const ctx = await sizeContext(size);
    const page = await ctx.newPage();
    await openSite(page);
    const r = await page.evaluate(() => {
      const s = document.querySelector('#results');
      const bars = [...s.querySelectorAll('.site-meter')].map((m) => {
        const value = parseFloat(m.closest('dd, li').querySelector('.site-stats__value').textContent) / 100;
        return Math.abs(m.querySelector('.site-meter__fill').getBoundingClientRect().width - value * m.getBoundingClientRect().width);
      });
      const kids = [...s.querySelector('.site-stack').children];
      return {
        bars,
        caveatAt: kids.findIndex((k) => k.classList.contains('site-caveat')),
        firstNumber: kids.findIndex((k) => /\d%/.test(k.textContent)),
        height: s.getBoundingClientRect().height,
        hScroll: document.documentElement.scrollWidth > innerWidth + 1,
      };
    });
    check(r.bars.length === 8 && r.bars.every((d) => d <= 1), `${label}: every Results bar is as long as its printed value, within 1px (${r.bars.length} bars, MS-5.1)`);
    check(r.caveatAt === 1 && r.firstNumber > r.caveatAt, `${label}: the simulated-typist caveat comes right after the title, before any number (MS-5.4)`);
    check(!r.hScroll, `${label}: Results, no sideways scroll (MS-10.2)`);
    if (size === SIZES[3]) check(r.height <= 1961 + 150, `${label}: the Results section is at most 150px taller than in round 3 (${Math.round(r.height)}px of 2,111)`);
    await ctx.close();
  }
  {
    const ctx = await sizeContext(SIZES[12], { reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    await openSite(page, { motion: true });
    const state = () =>
      page.evaluate(() => ({
        full: [...document.querySelectorAll('.site-stats .site-meter__fill')].map((f) => new DOMMatrix(getComputedStyle(f).transform).a),
        x: [...document.querySelectorAll('.site-stats .site-stats__value')].map((v) => Math.round(v.getBoundingClientRect().left)).join(','),
        running: document.querySelector('#results .site-stats').getAnimations({ subtree: true }).filter((a) => a.animationName === 'site-grow').length,
      }));
    await page.evaluate(() => {
      const chart = document.querySelector('.site-results__chart');
      window.scrollTo(0, chart.getBoundingClientRect().top + scrollY - 200);
    });
    await pause(page, 150);
    const early = await state();
    await pause(page, 2000);
    const late = await state();
    check(early.full.some((a) => a < 1), `desktop 1440x1000: motion on, the Results bars start short and grow (scaleX ${early.full.map((a) => a.toFixed(2)).join(' ')}; PO-1, MS-8.11)`);
    check(late.full.every((a) => a === 1) && late.running === 0, `desktop 1440x1000: each Results bar ends full with no animation left, within 1,600 ms of its play (MS-8.11)`);
    check(early.x === late.x, `desktop 1440x1000: the Results numbers never move while their bars grow (${early.x} / ${late.x}; MS-5.5)`);
    await ctx.close();
  }

  // ---- offline (production only) --------------------------------------------------------------------
  if (!OFFLINE) console.log('note: OFFLINE=1 runs skipped (they need a production build with the service worker)');
  else {
    console.log('offline');
    const ctx = await newContext(browser, { serviceWorkers: 'allow' });
    const page = await ctx.newPage();
    await openSite(page);
    const cached = await waitFor(
      page,
      async () => {
        for (const name of await caches.keys()) {
          const cache = await caches.open(name);
          if ((await cache.keys()).some((r) => new URL(r.url).pathname === '/app')) return true;
        }
        return false;
      },
      null,
      { timeout: 60000, what: 'the precache to hold /app' },
    ).catch((e) => {
      console.log(`    ${e.message}`);
      return false;
    });
    check(cached === true, 'after one visit to / the cache holds /app (MS-2.4)');
    // /app lands in the cache during install; offline navigation needs the worker active and in control.
    const controlled = await waitFor(page, () => !!navigator.serviceWorker.controller, null, {
      timeout: 60000,
      what: 'the service worker to control the page',
    }).catch((e) => {
      console.log(`    ${e.message}`);
      return false;
    });
    check(controlled === true, 'the service worker controls the page before going offline (MS-2.4)');
    await ctx.setOffline(true);
    let ok = true;
    await openApp(page).catch((e) => {
      ok = false;
      console.log(`    ${e.message}`);
    });
    check(ok, 'offline, /app reaches "Offline dictionary ready" (MS-2.4)');
    await page.goto(BASE_URL + '/', { waitUntil: 'load' }).catch(() => {});
    const h1 = await page.locator('h1').first().textContent({ timeout: 10000 }).catch(() => null);
    check(h1 === H1, `offline, / shows the landing page (h1 ${h1}, MS-2.6)`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
done('site');
