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
//     (the Touch keys exactly 72 and 128px), no drawing larger than its stage, no overflow in the How picture or
//     the proof figure, equal stage heights per section (Access: per row), one ember fill per viewport,
//     finished drawings and a still page at the end; plus an XL key-size pass.
//   - Layout: "Press a key to start" on one line, 2 cards per row in Conversation and Privacy, the switch
//     card a normal card with a snug stage, no CSS order in the grids (MS-7.7, MS-10.9).
//   - Motion on (1280x900 and 390x844): the once-only autoplay, Stop, reveals, focus inside a hidden
//     block, nothing time-based left running, opacity/transform only, reduce at runtime, layout shift and LCP.
//   - Round 2 motion (A7, A8): How step sync down and up, every step played from the top on tall viewports,
//     step 1 with the whole picture in view, tall drawings, drawings entered from above and drawings a 150px
//     flick passes on short phones play in view,
//     a reload at #access shows finished drawings, every drawing finished 4.5 s after it played, no layout
//     shift while they play (MS-8.11-8.13, MS-11.2).
//   - No JavaScript, privacy (requests, storage, cookies, no dialog), routes, keyboard (skip link, bar
//     Tab order at 1280x900 and 820x1094, R2; focus rings; questions; demo buttons) and the offline runs.
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
const LABEL_FIRST = 'Play the example';
const LABEL_AGAIN = 'Play the example again';
const LABEL_STOP = 'Stop';
const SENTENCE = 'I need water';

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
const demoText = (page) => page.evaluate(() => document.querySelector('.site-demo__text')?.textContent ?? '');
const demoButton = (page) => page.locator('.site-demo__foot button').first();
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

/** No drawing larger than its stage, nothing outside the How picture or the proof figure, equal stages (MS-7.7). */
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
    for (const frame of document.querySelectorAll('.site-how__picture, figure.site-proof')) {
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
    for (const id of ['conversation', 'privacy']) {
      const hs = [...document.querySelectorAll(`#${id} .site-stage`)].filter(shown).map((s) => box(s).height);
      if (hs.length && Math.max(...hs) - Math.min(...hs) > 0.5) unequal.push(`${id} ${hs.map(Math.round).join('/')}`);
    }
    // Access: stages in one row are equal, the switch card's row included (review P2).
    const accessRows = new Map();
    for (const s of [...document.querySelectorAll('#access .site-stage')].filter(shown)) {
      const top = Math.round(box(s).top);
      accessRows.set(top, [...(accessRows.get(top) ?? []), box(s).height]);
    }
    for (const hs of accessRows.values()) if (Math.max(...hs) - Math.min(...hs) > 0.5) unequal.push(`access row ${hs.map(Math.round).join('/')}`);
    return { stages, over, unequal };
  });
function fitChecks(label, f) {
  check(f.stages > 0 && f.over.length === 0, `${label}: no drawing is larger than its stage (${f.stages} stages) and nothing overflows the How picture or the proof figure (MS-7.7)${f.over.length ? `: ${f.over.slice(0, 4).join('; ')}` : ''}`);
  check(f.unequal.length === 0, `${label}: MS-7.7 stages in a section have equal heights (Access: in a row)${f.unequal.length ? `: ${f.unequal.join('; ')}` : ''}`);
}

/** The How it works state: the step the attributes show and the one the step tops give (MS-8.12). */
const howState = (page) =>
  page.evaluate(() => {
    const how = document.querySelector('.site-how');
    const mid = innerHeight / 2;
    const tops = [...how.querySelectorAll('.site-how__step')].map((s) => s.getBoundingClientRect().top);
    const p = how.querySelector('.site-how__picture').getBoundingClientRect();
    return {
      step: how.dataset.howStep ?? null,
      play: how.dataset.howPlay ?? null,
      live: 'howLive' in how.dataset,
      want: String(tops.filter((t) => t <= mid).length),
      edge: tops.some((t) => Math.abs(t - mid) < 2),
      picture: { top: p.top, bottom: p.bottom },
      vh: innerHeight,
      // The placeholder rows of the desktop picture (review P1): their opacities and the rows'.
      ghosts: [...how.querySelectorAll('.site-how__picture .site-cand__ghost')].map((g) => Number(getComputedStyle(g).opacity)),
      rows: [...how.querySelectorAll('.site-how__picture .site-cand')].map((g) => Number(getComputedStyle(g).opacity)),
    };
  });

/** Page offsets of the How section (from where it enters to where it leaves). */
const howRange = (page) =>
  page.evaluate(() => {
    const r = document.querySelector('.site-how').getBoundingClientRect();
    return { from: Math.max(0, Math.floor(r.top + scrollY - innerHeight)), to: Math.ceil(r.bottom + scrollY), max: document.documentElement.scrollHeight - innerHeight };
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
      const targets = [...document.querySelectorAll('.site :is(a.nl-btn, button, .site-brand, .site-nav a, .site-footer__nav a, .site-links a, summary)')].filter(
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
      const shown = (el) => el.getClientRects().length > 0;
      const hints = [...document.querySelectorAll('.site-well__hint')].filter((el) => shown(el) && el.textContent.trim() === 'Press a key to start');
      const lines = hints.map((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))).size;
      });
      const perRow = (id) => {
        const tops = [...document.querySelectorAll(`#${id} .site-grid--boxes > .site-card`)].map((c) => Math.round(c.getBoundingClientRect().top));
        const rows = new Map();
        for (const t of tops) rows.set(t, (rows.get(t) ?? 0) + 1);
        return [...rows.values()];
      };
      // The switch card is a normal card (review P2): its stage is at most 24px taller than its drawing.
      const stage = document.querySelector('#access .site-stage--switch');
      const scan = stage.querySelector('[data-play]').getBoundingClientRect();
      const spare = stage.getBoundingClientRect().height - scan.height;
      const accessCards = [...document.querySelectorAll('#access .site-grid--access > .site-card')].map((c) => c.getBoundingClientRect());
      const switchRow = accessCards.filter((r) => Math.abs(r.top - accessCards[2].top) < 1).length;
      const grids = [...document.querySelectorAll('.site-grid, .site-how, .site-how__steps')];
      const ordered = grids.flatMap((g) => [...g.children].filter((c) => getComputedStyle(c).order !== '0').map((c) => String(c.className).split(' ')[0]));
      const dense = grids.filter((g) => getComputedStyle(g).gridAutoFlow.includes('dense')).length;
      const cards = [...document.querySelectorAll('#access .site-grid--access > .site-card')].map((c) => c.querySelector('h3')?.textContent ?? '');
      return { lines, perRow: { conversation: perRow('conversation'), privacy: perRow('privacy') }, spare, switchRow, vw: innerWidth, ordered, dense, cards };
    });
    if (width === 320 || width === 1024) {
      check(l.lines.length > 0 && l.lines.every((n) => n === 1), `${label}: "Press a key to start" stays on one line (${l.lines.length} shown, lines ${l.lines.join(',')}, MS-7.7)`);
    }
    if (width >= 1280) {
      for (const [id, rows] of Object.entries(l.perRow)) check(rows.length === 2 && rows.every((n) => n === 2), `${label}: ${id} shows 2 cards per row (${rows.join(' + ')}, MS-10.9)`);
    }
    check(
      l.spare >= -0.5 && l.spare <= 24.5 && l.switchRow === (l.vw >= 648 ? 2 : 1),
      `${label}: the switch card is a normal card, its stage ${Math.round(l.spare)}px taller than its drawing (at most 24), ${l.switchRow} card(s) in its row (MS-10.9)`,
    );
    check(
      l.ordered.length === 0 && l.dense === 0 && l.cards.join('|') === 'Keyboard|Touch|One or two switches|Your view|Phones, tablets and laptops',
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
    /** Watch the label from now: it must read Stop within 2.5 s, stay Stop, then read "again" by the deadline. */
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
        check(a.ended && !a.brokeStop, `${label}: it reads Stop for the whole play and "Play the example again" within 12 s of load (MS-8.9)`);
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
        check(a.ended && !a.brokeStop, `${label}: it reads Stop while it plays and "Play the example again" within 10 s (MS-6.3, MS-8.9)`);
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
      check(a.sawStop && a.stopAt <= 2500 && a.ended, `${label}: scrolled into view, it plays once and ends on "Play the example again" (MS-6.3)`);
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

  // ---- round 2: How step sync (A8, MS-8.12) ---------------------------------------------------------
  for (const [width, height] of [
    [1280, 800],
    [1920, 1080],
    [1024, 768],
  ]) {
    const label = `MS-8.12 step sync ${width}x${height}`;
    console.log(label);
    const ctx = await newContext(browser, { width, height, reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    await openSite(page, { motion: true });
    const { from, to } = await howRange(page);
    for (const dir of ['down', 'up']) {
      const wrong = [];
      let seen = 0;
      const visit = async (y) => {
        const s = await howState(page);
        if (s.edge) return;
        seen++;
        if (s.step !== s.want) wrong.push(`${y}px: ${s.step} for ${s.want}`);
      };
      await (dir === 'down' ? stepScroll(page, from, to, visit) : stepScroll(page, to, from, visit));
      check(seen > 10 && wrong.length === 0, `${label}, scrolling ${dir}: data-how-step is the active step at each of ${seen} positions (MS-8.12)${wrong.length ? `: ${wrong.slice(0, 4).join(', ')}` : ''}`);
    }
    // The active card shows the outline; the others do not.
    await page.evaluate(() => {
      const s = document.querySelectorAll('.site-how__step')[1].getBoundingClientRect();
      window.scrollTo(0, scrollY + s.top - innerHeight / 2 + 40);
    });
    await frames(page);
    await pause(page, 400);
    const outline = await page.evaluate(() => [...document.querySelectorAll('.site-how__step')].map((s) => getComputedStyle(s, '::after').opacity).join(','));
    check(outline === '0,1,0', `${label}: with step 2 active only its card shows the outline (${outline}, MS-8.12)`);
    await ctx.close();
  }

  // Tall viewports: loaded at the top, every step plays, in order.
  for (const [width, height] of [
    [1024, 1366],
    [1920, 1200],
  ]) {
    const label = `${width}x${height}`;
    const ctx = await newContext(browser, { width, height, reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    await openSite(page, { motion: true });
    const { to } = await howRange(page);
    const plays = [];
    let live = false;
    await stepScroll(page, 0, to, async () => {
      const s = await howState(page);
      live ||= s.live;
      if (s.play && plays[plays.length - 1] !== s.play) plays.push(s.play);
    });
    check(live && plays.join(',') === '1,2,3', `${label}: MS-8.12 How plays every step from the top on tall viewports (played ${plays.join(',') || 'none'}, live ${live})`);
    await ctx.close();
  }

  // Step 1 plays only with the whole picture on screen.
  for (const [width, height] of [
    [1366, 650],
    [1024, 768],
    [1280, 800],
  ]) {
    const label = `${width}x${height}`;
    const ctx = await newContext(browser, { width, height, reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    await openSite(page, { motion: true });
    const { to } = await howRange(page);
    let at = null;
    let twoY = null;
    await stepScroll(page, 0, to, async (y) => {
      if (at && twoY !== null) return;
      const s = await howState(page);
      if (!at && s.play === '1') at = s;
      if (twoY === null && s.play === '2') twoY = y;
    });
    check(
      at !== null && at.picture.top >= -1 && at.picture.bottom <= at.vh + 1,
      `${label}: MS-8.12 step 1 plays with the whole How picture in view (picture ${at ? `${Math.round(at.picture.top)} to ${Math.round(at.picture.bottom)} of ${at.vh}` : 'step 1 never played'})`,
    );
    // P1: during step 1 the placeholder rows fill the rows' place; once step 2 has played the rows replace them.
    check(
      at !== null && at.ghosts.length === 3 && at.ghosts.every((o) => o === 1) && at.rows.every((o) => o === 0),
      `${label}: MS-8.12 at step 1 the placeholder rows show where the sentences will be (ghosts ${at?.ghosts.join(',')}, rows ${at?.rows.join(',')})`,
    );
    // Back at the scroll position where step 2 played: step 2 is active and finished.
    if (twoY !== null) {
      await page.evaluate((y) => window.scrollTo(0, y), twoY);
      await frames(page);
      await pause(page, 1500);
    }
    const after = await howState(page);
    check(
      twoY !== null && after.step === '2' && after.ghosts.every((o) => o === 0) && after.rows.every((o) => o === 1),
      `${label}: MS-8.12 with step 2 played the sentence rows replace the placeholders (step ${after.step}, ghosts ${after.ghosts.join(',')}, rows ${after.rows.join(',')})`,
    );
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
      for (const el of document.querySelectorAll('.site-how__stage [data-play], figure.site-proof[data-play]')) el.setAttribute('data-site-tall', '');
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
    await page.reload({ waitUntil: 'load' });
    await waitFor(page, () => document.documentElement.dataset.siteMotion === 'on', null, { timeout: 20000, what: 'data-site-motion="on"' });
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
    let howLast = 0;
    let howPlay = null;
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    await stepScroll(
      page,
      0,
      max,
      async () => {
        for (const d of await drawingState(page)) if (d.played === '1' && !playedAt.has(d.i)) playedAt.set(d.i, Date.now());
        const play = await page.evaluate(() => document.querySelector('.site-how').dataset.howPlay ?? null);
        if (play && play !== howPlay) howLast = Date.now();
        howPlay = play;
      },
      { stepMs: 0 },
    );
    const last = Math.max(howLast, ...playedAt.values());
    await pause(page, Math.max(0, last + 4500 - Date.now()));
    const ds = await drawingState(page);
    const shown = ds.filter((d) => d.box);
    const unplayed = shown.filter((d) => !d.played).map((d) => d.name);
    const running = shown.filter((d) => d.anims.length > 0).map((d) => `${d.name} ${d.anims.join('/')}`);
    const how = await page.evaluate(() =>
      document
        .querySelector('.site-how__picture')
        .getAnimations({ subtree: true })
        .filter((a) => !['site-reveal', 'site-fade-in'].includes(a.animationName)).length,
    );
    check(playedAt.size > 0 && unplayed.length === 0, `${label}: every shown drawing played or was finished (${playedAt.size} played, ${shown.length} shown, MS-8.11)${unplayed.length ? `: ${unplayed.slice(0, 4).join(', ')}` : ''}`);
    check(running.length === 0 && how === 0, `${label}: each drawing is finished with no animation 4.5 s after the play line (MS-8.11)${running.length ? `: ${running.slice(0, 4).join(', ')}` : ''}${how ? `; How picture ${how}` : ''}`);
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
      text: document.querySelector('.site-demo__text')?.textContent ?? '',
      animations: document.getAnimations().length,
    }));
    check(!n.attr, 'no JavaScript: no data-site-motion (MS-8.7)');
    check(n.blocks > 0 && n.hidden === 0, `no JavaScript: all ${n.blocks} blocks visible (MS-8.7)`);
    check(n.text === SENTENCE, `no JavaScript: the demo shows "${n.text}" (MS-6.2, MS-8.7)`);
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
    const bar = [];
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press(TAB);
      bar.push(await focus());
    }
    const names = bar.map((f) => f.text);
    const want = ['Ninth Life', 'How it works', 'Proof check', 'Ways to type', 'Privacy', 'Questions', 'Open the app'];
    check(names.join('|') === want.join('|'), `${label}: Tab order over the bar is brand, the 5 nav links, then the header CTA (${names.join(', ')}, MS-13.2)`);
    let visual = true;
    for (let i = 1; i < bar.length; i++) {
      const a = bar[i - 1];
      const b = bar[i];
      const sameRow = b.top < a.bottom - 1 && a.top < b.bottom - 1;
      if (!(sameRow ? b.left >= a.right - 1 : b.top >= a.bottom - 1)) visual = false;
    }
    const cta = bar[6];
    const lastNav = bar[5];
    check(visual && cta.bottom > lastNav.top, `${label}: the bar's Tab order follows its visual order and the CTA is not above the last nav link (R2, MS-13.2)`);

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
      await tabTo(page, () => !!document.activeElement?.closest('.site-demo__foot'), { max: 40, what: 'the demo button' });
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
    check(h1 === 'Ninth Life', `offline, / shows the landing page (h1 ${h1}, MS-2.6)`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
done('site');
