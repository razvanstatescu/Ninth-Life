// Phones and tablets (web-ui Req 15.8-15.11, 24, 25; ADR-003). Touch devices are emulated with their
// screen size (the app tells phones from tablets by the shorter screen side) and the height a page
// really gets (docs/research/mobile-aac-evidence.md, one-screen-tablets.md). For every view:
//   - phones held sideways show only the turn-upright screen;
//   - otherwise the main screen does not scroll at all, and the keypad, Speak, Menu, Show, Clear and
//     the suggestions are all on screen (under 548px tall a phone has no suggestion row, Req 24.9);
//     nothing scrolls sideways; keys are at least 72px, other
//     targets at least 56px and app text at least 16px; the keypad does not move while a long
//     sentence is typed (keyguards, motor memory).
// Keys are tapped at a person's pace (the accept delay ignores same-key repeats < 150 ms).
//   node packages/web/test/e2e/responsive.mjs   (needs `next start`; BASE_URL, default :3202)
//   ENGINE=webkit node ...                      (Safari's engine; CI runs Chromium)
import { BASE_URL, check, done, loadPlaywright, openApp } from './lib.mjs';

// [name, visible width, visible height, screen width, screen height]
const DEVICES = [
  // Phones, portrait: Safari with its toolbar showing (iOS 26 Compact tab bar), Chrome, installed app.
  ['iPhone SE, Safari', 375, 549, 375, 667],
  ['iPhone SE, installed app', 375, 647, 375, 667],
  // Safari with the Bottom tab bar (measured, docs/research/mobile-aac-evidence.md §1): the floor.
  ['iPhone SE, Safari Bottom tab bar', 375, 495, 375, 667],
  ['iPhone 17 Pro, Safari Bottom tab bar', 402, 654, 402, 874],
  ['iPhone 16e, Safari', 390, 699, 390, 844],
  ['iPhone 17 Pro, Safari', 402, 714, 402, 874],
  ['iPhone 17 Pro Max, Safari', 440, 796, 440, 956],
  ['Android 360x800, Chrome', 360, 668, 360, 800],
  ['Android 412x915, Chrome', 412, 783, 412, 915],
  // Phones held sideways: portrait only (ADR-003).
  ['iPhone 17 Pro sideways', 874, 330, 874, 402],
  ['Android 412x915 sideways', 915, 360, 915, 412],
  // Tablets, both orientations: Safari on iPadOS 26 with its toolbar showing, measured in the
  // simulator (docs/research/one-screen-tablets.md); "2 tabs" adds Safari's tab bar (the floor).
  ['iPad mini', 744, 1047, 744, 1133],
  ['iPad mini, 2 tabs', 744, 1005, 744, 1133],
  ['iPad mini landscape', 1133, 658, 1133, 744],
  ['iPad mini landscape, 2 tabs', 1133, 616, 1133, 744],
  ['iPad / iPad Air 11"', 820, 1094, 820, 1180],
  ['iPad / iPad Air 11" landscape', 1180, 734, 1180, 820],
  ['iPad Pro 11"', 834, 1124, 834, 1210],
  ['iPad Pro 11" landscape', 1210, 748, 1210, 834],
  ['iPad Pro 13"', 1032, 1290, 1032, 1376],
  ['iPad Pro 13" landscape', 1376, 946, 1376, 1032],
  ['iPad Air 13", narrowest window (iPadOS 26)', 375, 840, 1024, 1366],
  // Android tablets: estimates (no emulator measured).
  ['Android tablet 10"', 800, 1200, 800, 1280],
  ['Android tablet 10" landscape', 1280, 720, 1280, 800],
];
const LONG = '4 6333 92837 75327 263 7663 27323'; // "i need water please and some bread"

const engine = process.env.ENGINE ?? 'chromium';
const pw = loadPlaywright();
const browser = await pw[engine].launch();
console.log(`responsive check on ${BASE_URL} (${engine})`);

try {
  for (const [name, vw, vh, sw, sh] of DEVICES) {
    const label = `${name} ${vw}x${vh}`;
    const ctx = await browser.newContext({
      viewport: { width: vw, height: vh },
      screen: { width: sw, height: sh },
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: engine === 'chromium',
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    });
    const page = await ctx.newPage();
    console.log(label);
    if (vw > vh && Math.min(sw, sh) < 600) {
      await page.goto(BASE_URL + '/', { waitUntil: 'load' });
      await page.locator('.rotate').waitFor({ state: 'visible', timeout: 15000 });
      const r = await page.evaluate(() => ({
        text: document.querySelector('.rotate')?.textContent ?? '',
        keys: document.querySelectorAll('button[data-key]').length,
        scroll: document.documentElement.scrollHeight - innerHeight,
      }));
      check(/turn your phone upright/i.test(r.text) && r.keys === 0, 'a phone held sideways shows only the turn-upright screen');
      check(r.scroll <= 1, `the turn-upright screen fits (${r.scroll}px over)`);
      await ctx.close();
      continue;
    }
    await openApp(page);
    // Let the keypad area's first measurement land (ResizeObserver) before taking the baseline.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const padTop = () => page.evaluate(() => document.querySelector('.nl-keypad').getBoundingClientRect().top + window.scrollY);
    const before = await padTop();
    for (const ch of LONG) {
      await page.locator(`button[data-key="${ch === ' ' ? '0' : ch}"]`).first().tap();
      await page.waitForTimeout(170);
    }
    const after = await padTop();
    await page.evaluate(() => window.scrollTo(0, 0));
    const m = await page.evaluate(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const onScreen = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.top >= -0.5 && r.bottom <= vh + 0.5 && r.left >= -0.5 && r.right <= vw + 0.5;
      };
      const keys = [...document.querySelectorAll('button[data-key]')].map((k) => k.getBoundingClientRect());
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      };
      const small = [...document.querySelectorAll('.app button, .app a[href], .app input, .app select')]
        .filter((el) => visible(el) && !el.closest('.nl-skip') && !el.closest('dialog'))
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.height < 55.5 || r.width < 55.5;
        })
        .map((el) => (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 20));
      const tiny = [...document.querySelectorAll('.app *')]
        .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && visible(el) && !el.closest('dialog'))
        .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
        .map((el) => el.className || el.tagName);
      return {
        layout: [...document.querySelector('.app').classList].join(' '),
        pageScroll: document.documentElement.scrollHeight - vh,
        hScroll: document.documentElement.scrollWidth > vw + 1,
        shown: {
          keypad: onScreen('.nl-keypad'),
          Speak: onScreen('[data-action="speak"]'),
          Menu: onScreen('.phone-actions .nl-btn'),
          Show: onScreen('.phone-actions .nl-btn:last-child'),
          sentence: onScreen('.phone-card'),
          Clear: onScreen('.phone-card__clear, .phone-card__undo'),
          suggestions: onScreen('.phone-sugg'),
        },
        hasSugg: document.querySelector('.phone-sugg') !== null,
        minKey: Math.round(Math.min(...keys.map((k) => Math.min(k.width, k.height)))),
        small,
        tiny,
      };
    });
    // A short phone has no suggestion row (web-ui Req 24.9): STACK_SHORT_QUERY is '(max-height: 547px)'.
    const short = vh < 548 && /app--stack/.test(m.layout);
    if (short) {
      check(!m.hasSugg, 'a short phone drops the suggestion row (Sentences is in Menu)');
      delete m.shown.suggestions;
    }
    const missing = Object.entries(m.shown).filter(([, ok]) => !ok).map(([k]) => k);
    check(/app--shell/.test(m.layout), `the one-screen shell is used (${m.layout.replace('app ', '')})`);
    check(m.pageScroll <= 1, `the main screen does not scroll (${m.pageScroll}px over)`);
    check(!m.hScroll, 'no sideways scrolling');
    check(missing.length === 0, `keypad, Speak, Menu, Show, sentence${short ? ' and Clear' : ', Clear and suggestions'} all on screen${missing.length ? `; missing: ${missing.join(', ')}` : ''}`);
    check(m.minKey >= 72, `keys are at least 72px (${m.minKey})`);
    check(m.small.length === 0, `every target is at least 56px${m.small.length ? `: ${m.small.join(', ')}` : ''}`);
    check(m.tiny.length === 0, `no app text under 16px${m.tiny.length ? `: ${m.tiny.slice(0, 3).join(', ')}` : ''}`);
    check(Math.abs(after - before) < 0.5, `the keypad did not move while typing a long sentence (${Math.round(after - before)}px)`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
done('responsive');
