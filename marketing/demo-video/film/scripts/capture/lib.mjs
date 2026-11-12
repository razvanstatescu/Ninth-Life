// Shared helpers for the capture script (capture.mjs): browser, device contexts, waiting, typing,
// measuring element boxes in image pixels, and the screenshot itself.
// Plain .mjs (not TypeScript): functions handed to page.evaluate() must reach the browser as written.
import { chromium } from 'playwright-core';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FILM_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const APP_URL = `${BASE_URL}/app`;
export const OUT_DIR = path.join(FILM_ROOT, 'public', 'captures');

/** After each interaction: the app's highlight changes take 120 ms; wait well past that. */
export const SETTLE_MS = 300;
/** Between key presses, a person's pace (the app ignores same-key repeats under 150 ms on touch). */
export const KEY_GAP_MS = 170;

/** The Next.js development badge lives in <nextjs-portal>; it is not part of the app. */
const DEV_CSS = 'nextjs-portal { display: none !important; }';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Devices. `screen` is the full screen size: the app tells phones from tablets by the shorter screen
 * side (packages/web/lib/layout.ts), as the team's responsive e2e test does.
 */
export const PHONE = {
  name: 'phone',
  viewport: [390, 700],
  dpr: 3,
  options: { viewport: { width: 390, height: 700 }, screen: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
};
export const TABLET = {
  name: 'tablet',
  viewport: [1133, 658],
  dpr: 2,
  options: { viewport: { width: 1133, height: 658 }, screen: { width: 1133, height: 744 }, deviceScaleFactor: 2, hasTouch: true },
};
export const LAPTOP = {
  name: 'laptop',
  viewport: [1440, 900],
  dpr: 2,
  options: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
};

/** System Chrome first; otherwise the newest Chromium in the Playwright cache. */
export async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true });
  } catch (err) {
    const exe = cachedChromium();
    if (!exe) throw err;
    console.warn(`System Chrome did not start (${String(err).split('\n')[0]}); using ${exe}`);
    return chromium.launch({ executablePath: exe, headless: true });
  }
}

function cachedChromium() {
  const root = path.join(homedir(), 'Library', 'Caches', 'ms-playwright');
  if (!existsSync(root)) return null;
  const dirs = readdirSync(root)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
  const apps = [
    'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    'chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
  ];
  for (const d of dirs) for (const a of apps) if (existsSync(path.join(root, d, a))) return path.join(root, d, a);
  return null;
}

// ---- in-page functions (serialized by page.evaluate; keep them self-contained) -----------------

/** The sentence on show and its key line, as the person sees them. */
function readSentenceInPage() {
  const p = document.querySelector('[data-section="speak"] .nl-speakbar__text');
  let text = '';
  if (p) {
    const c = p.cloneNode(true);
    c.querySelectorAll('.nl-speakbar__digits, .nl-sr-only').forEach((e) => e.remove());
    text = (c.textContent ?? '').replace(/\s+/g, ' ').trim();
  }
  const digits = (document.querySelector('[data-section="speak"] .nl-speakbar__digits-end')?.textContent ?? '').replace(/\s+/g, ' ').trim();
  return { text, digits };
}

/** The status pills a person can see in the header (screen-reader text left out). */
function readPillsInPage() {
  return [...document.querySelectorAll('.app-header .pill')]
    .filter((p) => p.getClientRects().length > 0 && getComputedStyle(p).visibility !== 'hidden')
    .map((p) => {
      const c = p.cloneNode(true);
      c.querySelectorAll('.nl-sr-only').forEach((e) => e.remove());
      return (c.textContent ?? '').trim();
    });
}

/** Anything in the Next.js dev portal besides its static-route badge (an error toast or overlay). */
function devIssuesInPage() {
  const out = [];
  for (const portal of document.querySelectorAll('nextjs-portal')) {
    const root = portal.shadowRoot;
    if (!root) continue;
    const badge = root.querySelector('.nextjs-static-indicator-toast');
    for (const el of root.querySelectorAll('*')) {
      if (el.tagName === 'STYLE' || el.tagName === 'SCRIPT' || el.tagName === 'LINK') continue;
      if (badge && (badge === el || badge.contains(el) || el.contains(badge))) continue;
      const r = el.getBoundingClientRect();
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      const marked = el.matches('[data-nextjs-dialog], [data-nextjs-dialog-overlay], [data-nextjs-toast], [class*="error" i], [data-issues]');
      if ((r.width > 0 && r.height > 0 && text) || marked) out.push(`<${el.tagName.toLowerCase()} class="${el.getAttribute('class') ?? ''}"> ${text.slice(0, 160)}`);
    }
  }
  return [...new Set(out)].slice(0, 8);
}

/** Things that would spoil a still: a focus ring, sideways overflow, a zoomed-out page, cut text. */
function screenChecksInPage() {
  const a = document.activeElement;
  let focusRing = null;
  if (a && a !== document.body && a !== document.documentElement && a.matches(':focus-visible')) {
    const cs = getComputedStyle(a);
    if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) focusRing = `${a.tagName.toLowerCase()}.${a.className} "${(a.textContent ?? '').trim().slice(0, 40)}"`;
  }
  const vv = window.visualViewport;
  return {
    focusRing,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scale: vv ? vv.scale : 1,
    layout: [...(document.querySelector('.app')?.classList ?? [])].find((c) => /^app--(wide|compact|split|stack|rotate)$/.test(c))?.replace('app--', '') ?? null,
    cutSuggestions: [...document.querySelectorAll('.phone-sugg__text.is-cut')].map((e) => (e.textContent ?? '').trim()),
    sentenceOverflows: (() => {
      const t = document.querySelector('[data-section="speak"] .nl-speakbar__text');
      return t ? t.scrollHeight > t.clientHeight + 1 : false;
    })(),
    dictReady: /offline dictionary ready/i.test(document.body?.textContent ?? ''),
    fonts: document.fonts.status,
    fontsLoaded: document.fonts.check('600 40px "Atkinson Hyperlegible Next"') && document.fonts.check('500 20px "Atkinson Hyperlegible Mono"'),
  };
}

/**
 * Boxes in IMAGE pixels ([x, y, w, h], CSS px x visual-viewport scale x device scale factor), clipped
 * to what is visible (scroll containers and the screen), plus the visible text of chosen elements.
 * spec entries: { name, sel, within?, all?, names?, tight?, exclude?, text?, textSel? }
 *   all     every match (shown ones), named name-1, name-2... or names[i]
 *   tight   the box of the element's visible text, not of the element
 *   exclude descendants left out of `tight` and `text`
 *   textSel record the text of this descendant instead of the whole element
 * An entry whose name is already measured is skipped (so a later entry can be a fallback).
 */
function measureInPage({ spec, dpr, imgW, imgH, fullPage = false }) {
  const vv = window.visualViewport;
  const doc = document.documentElement;
  // Full-page images: document coordinates. Otherwise: what the visual viewport shows.
  const s = fullPage || !vv ? 1 : vv.scale;
  const ox = fullPage ? -window.scrollX : vv ? vv.offsetLeft : 0;
  const oy = fullPage ? -window.scrollY : vv ? vv.offsetTop : 0;
  const vw = fullPage ? doc.scrollWidth : vv ? vv.width : window.innerWidth;
  const vh = fullPage ? doc.scrollHeight : vv ? vv.height : window.innerHeight;
  const shown = (el) => {
    if (!el || el.getClientRects().length === 0) return false;
    if (el.closest('[hidden], .nl-sr-only')) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && Number(cs.opacity) > 0;
  };
  const clip = (el, r) => {
    let { left, top, right, bottom } = r;
    for (let a = el.parentElement; a; a = a.parentElement) {
      const cs = getComputedStyle(a);
      const ax = cs.overflowX !== 'visible';
      const ay = cs.overflowY !== 'visible';
      if (ax || ay) {
        const b = a.getBoundingClientRect();
        if (ax) {
          left = Math.max(left, b.left + (parseFloat(cs.borderLeftWidth) || 0));
          right = Math.min(right, b.right - (parseFloat(cs.borderRightWidth) || 0));
        }
        if (ay) {
          top = Math.max(top, b.top + (parseFloat(cs.borderTopWidth) || 0));
          bottom = Math.min(bottom, b.bottom - (parseFloat(cs.borderBottomWidth) || 0));
        }
      }
      if (cs.position === 'fixed') break; // a fixed box (sheet, show mode) is not clipped by the page under it
    }
    left = Math.max(left, ox);
    top = Math.max(top, oy);
    right = Math.min(right, ox + vw);
    bottom = Math.min(bottom, oy + vh);
    return right - left > 0.5 && bottom - top > 0.5 ? { left, top, right, bottom } : null;
  };
  const textRect = (el, exclude) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let L = Infinity;
    let T = Infinity;
    let R = -Infinity;
    let B = -Infinity;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent || !n.textContent.trim()) continue;
      const p = n.parentElement;
      if (!p || p.closest('.nl-sr-only') || (exclude && p.closest(exclude)) || !shown(p)) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width <= 0 || r.height <= 0) continue;
        L = Math.min(L, r.left);
        T = Math.min(T, r.top);
        R = Math.max(R, r.right);
        B = Math.max(B, r.bottom);
      }
    }
    return L === Infinity ? null : { left: L, top: T, right: R, bottom: B };
  };
  const visibleText = (el, exclude) => {
    const c = el.cloneNode(true);
    c.querySelectorAll('.nl-sr-only').forEach((x) => x.remove());
    if (exclude) c.querySelectorAll(exclude).forEach((x) => x.remove());
    return (c.textContent ?? '').replace(/\s+/g, ' ').trim();
  };
  const toImage = (r) => {
    const x0 = Math.max(0, Math.min(imgW, Math.round((r.left - ox) * s * dpr)));
    const y0 = Math.max(0, Math.min(imgH, Math.round((r.top - oy) * s * dpr)));
    const x1 = Math.max(0, Math.min(imgW, Math.round((r.right - ox) * s * dpr)));
    const y1 = Math.max(0, Math.min(imgH, Math.round((r.bottom - oy) * s * dpr)));
    return [x0, y0, x1 - x0, y1 - y0];
  };
  const boxes = {};
  const texts = {};
  for (const e of spec) {
    const root = e.within ? document.querySelector(e.within) : document;
    if (!root) continue;
    const els = [...root.querySelectorAll(e.sel)].filter(shown);
    const list = e.all ? els : els.slice(0, 1);
    list.forEach((el, i) => {
      const name = e.all ? (e.names?.[i] ?? `${e.name}-${i + 1}`) : e.name;
      if (boxes[name]) return;
      const raw = e.tight ? textRect(el, e.exclude) : el.getBoundingClientRect();
      if (!raw) return;
      const r = clip(el, raw);
      if (!r) return;
      boxes[name] = toImage(r);
      if (e.text) {
        const t = e.textSel ? el.querySelector(e.textSel) : el;
        if (t) texts[name] = visibleText(t, e.exclude);
      }
    });
  }
  return { boxes, texts };
}

// ---- session ------------------------------------------------------------------------------------

/** One fresh browser context (no stored settings) and page on one device. */
export class Session {
  constructor(ctx, page, device) {
    this.ctx = ctx;
    this.page = page;
    this.device = device;
    this.warnings = [];
    this.clockPaused = false;
  }

  /** opts.clock: install Playwright's clock before loading, so time can be paused later (scanning). */
  static async open(browser, device, opts = {}) {
    const ctx = await browser.newContext({
      ...device.options,
      colorScheme: 'dark',
      locale: 'en-US',
      reducedMotion: 'no-preference',
      serviceWorkers: 'block',
    });
    if (opts.clock) await ctx.clock.install();
    const page = await ctx.newPage();
    const s = new Session(ctx, page, device);
    page.on('pageerror', (e) => s.warn(`page error: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') s.warn(`console error: ${m.text().slice(0, 240)}`);
    });
    return s;
  }

  warn(msg) {
    if (!this.warnings.includes(msg)) this.warnings.push(msg);
    console.warn(`  ! ${msg}`);
  }

  async close() {
    await this.ctx.close();
  }

  /**
   * Poll from Node until check() returns { ok: true, ... } (works while the page's clock is paused,
   * unlike page.waitForFunction). On timeout the last details are in the error.
   */
  async waitFor(what, check, timeout = 20000) {
    const end = Date.now() + timeout;
    for (;;) {
      const last = await check();
      if (last.ok) return last;
      if (Date.now() > end) throw new Error(`Timed out waiting for ${what}: ${JSON.stringify(last)}`);
      await sleep(50);
    }
  }

  /** waitFor() with a predicate evaluated in the page. */
  until(what, fn, arg, timeout = 20000) {
    return this.waitFor(what, async () => ({ ok: (await this.page.evaluate(fn, arg)) === true }), timeout);
  }

  /** Open /app and wait for the keypad, the offline dictionary and the fonts; hide the dev badge. */
  async openApp() {
    const { page } = this;
    await page.goto(APP_URL, { waitUntil: 'load' });
    await page.locator('button[data-key="4"]').first().waitFor({ state: 'visible', timeout: 30000 });
    await this.until('the offline dictionary to load', () => /offline dictionary ready/i.test(document.body?.textContent ?? ''));
    await page.addStyleTag({ content: DEV_CSS });
    await this.fontsReady();
    // A marker that a reload (Next.js dev reconnecting, for example) would wipe.
    await page.evaluate(() => {
      window.__captureLoaded = true;
    });
  }

  async fontsReady() {
    await this.page.evaluate(() => document.fonts.ready.then(() => document.fonts.status));
  }

  /** Press keys on the physical keyboard: digits 0-9 (0 is space). Spaces in `keys` are ignored. */
  async type(keys) {
    for (const ch of keys.replace(/\s+/g, '')) {
      await this.page.keyboard.press(ch);
      await sleep(KEY_GAP_MS);
    }
  }

  sentence() {
    return this.page.evaluate(readSentenceInPage);
  }

  pills() {
    return this.page.evaluate(readPillsInPage);
  }

  /** Wait until the sentence card reads `text` (and, if given, its key line reads `digits`). */
  async expectSentence(text, digits = null) {
    await this.waitFor(
      `the sentence card to read "${text}"`,
      async () => {
        const read = await this.sentence();
        return { ok: read.text === text && (digits === null || read.digits === digits), ...read };
      },
      8000,
    );
  }

  /** Wait until the visible status pill at `index` (0: the first) reads `text`. */
  async expectPill(text, index = 0) {
    await this.waitFor(
      `status pill ${index + 1} to read "${text}"`,
      async () => {
        const pills = await this.pills();
        return { ok: pills[index] === text, pills };
      },
      10000,
    );
  }

  async expectLayout(layout) {
    const got = await this.page.evaluate(() => document.querySelector('.app')?.className ?? '');
    if (!got.split(' ').includes(`app--${layout}`)) throw new Error(`Expected the ${layout} layout, got "${got}"`);
  }

  /** Tap (touch devices) or click (laptop) the first visible match. */
  async press(selector, opts = {}) {
    const loc = this.page.locator(selector, opts).first();
    if (this.device.options.hasTouch) await loc.tap();
    else await loc.click();
  }

  /** A screenshot for review only (an app problem worth showing), in _takes/captures/, not in the data. */
  async evidence(name) {
    const dir = path.join(FILM_ROOT, '_takes', 'captures');
    await mkdir(dir, { recursive: true });
    await sleep(SETTLE_MS);
    await this.page.screenshot({ path: path.join(dir, `${name}.png`), type: 'png', caret: 'hide', scale: 'css' });
  }

  /** Freeze the page's timers (needs Session.open(..., { clock: true })). */
  async pauseClock() {
    const now = await this.page.evaluate(() => Date.now());
    await this.page.clock.pauseAt(now + 100);
    this.clockPaused = true;
  }

  /** Advance the paused clock, firing the timers due in that time (one scan step = scanMs). */
  async advance(ms) {
    await this.page.clock.runFor(ms);
  }

  /**
   * Settle, check and screenshot. Returns the record for captures.json and the manifest.
   * state: a description, or a function of the measured texts that returns one.
   * extra: fields merged into the captures.json entry (step, scrollY...).
   * opts.fullPage: the whole page (document coordinates), not just the window.
   * opts.alignRight: when the page is wider than the screen, show its right edge (see settings()).
   */
  async shoot(id, stateOrFn, spec, extra = {}, opts = {}) {
    const { page, device } = this;
    // Pan the visual viewport (window.scrollTo cannot: the layout viewport already spans the page) so the
    // right edge of the open sheet, or of the page, is on screen.
    if (opts.alignRight) await page.evaluate(() => (document.querySelector('dialog[open]') ?? document.body).scrollIntoView({ block: 'nearest', inline: 'end' }));
    await sleep(SETTLE_MS);
    await this.fontsReady();
    const issues = await page.evaluate(devIssuesInPage);
    if (issues.length) throw new Error(`The Next.js dev overlay shows something on "${id}" (not hidden, reported): ${issues.join(' | ')}`);
    const checks = await page.evaluate(screenChecksInPage);
    if (!checks.dictReady) throw new Error(`"${id}": the dictionary is not ready`);
    if (checks.fonts !== 'loaded' || !checks.fontsLoaded) this.warn(`"${id}": fonts not fully loaded (${checks.fonts})`);
    if (checks.focusRing) this.warn(`"${id}": a focus ring is visible on ${checks.focusRing}`);
    if (checks.scrollWidth > device.viewport[0] || Math.abs(checks.scale - 1) > 0.001) this.warn(`"${id}": the page is ${checks.scrollWidth}px wide in a ${device.viewport[0]}px viewport (page scale ${checks.scale.toFixed(4)})`);
    const loaded = await page.evaluate(() => window.__captureLoaded === true);
    if (!loaded) throw new Error(`"${id}": the page reloaded during the capture`);

    await mkdir(OUT_DIR, { recursive: true });
    const file = path.join(OUT_DIR, `${id}.png`);
    await page.screenshot({ path: file, type: 'png', caret: 'hide', scale: 'device', fullPage: !!opts.fullPage });
    const buf = await readFile(file);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const expected = [device.viewport[0] * device.dpr, device.viewport[1] * device.dpr];
    if (width !== expected[0] || (!opts.fullPage && height !== expected[1])) this.warn(`"${id}": image is ${width}x${height}, expected ${expected.join('x')}`);
    const { boxes, texts } = await page.evaluate(measureInPage, { spec, dpr: device.dpr, imgW: width, imgH: height, fullPage: !!opts.fullPage });
    const state = typeof stateOrFn === 'function' ? stateOrFn(texts) : stateOrFn;
    const date = new Date().toISOString();
    const sha256 = createHash('sha256').update(buf).digest('hex');
    console.log(`  shot ${id}.png ${width}x${height} (${checks.layout ?? 'overlay'}) ${Object.keys(boxes).length} boxes`);
    const fresh = this.warnings.slice(this.reported ?? 0);
    this.reported = this.warnings.length;
    return {
      id,
      warnings: fresh,
      data: {
        file: `captures/${id}.png`,
        width,
        height,
        dpr: device.dpr,
        viewport: device.viewport,
        ...(opts.fullPage ? { fullPage: true } : {}),
        device: device.name,
        layout: checks.layout,
        state,
        ...extra,
        boxes,
        texts,
      },
      manifest: {
        id,
        path: `public/captures/${id}.png`,
        url: APP_URL,
        viewport: device.viewport,
        dpr: device.dpr,
        state,
        date,
        sha256,
      },
    };
  }
}

// ---- box specs ----------------------------------------------------------------------------------

/** The 12 keys by their data-key attribute (components/Key.tsx). */
const KEY_BOXES = [
  ['1', 'key-1'],
  ['2', 'key-2'],
  ['3', 'key-3'],
  ['4', 'key-4'],
  ['5', 'key-5'],
  ['6', 'key-6'],
  ['7', 'key-7'],
  ['8', 'key-8'],
  ['9', 'key-9'],
  ['*', 'key-star'],
  ['0', 'key-0'],
  ['#', 'key-hash'],
].map(([k, name]) => ({ name, sel: `button.nl-key[data-key="${k}"]` }));

const SCAN_BOXES = [
  // The scan highlight: the lit key (or other lit cell) when choosing along a row, else the ringed row.
  { name: 'scan', sel: '.nl-key.is-lit' },
  { name: 'scan', sel: '.is-lit' },
  { name: 'scan', sel: '.nl-keypad__row.is-scanning, .nl-scanrow.is-scanning' },
  { name: 'scan-row', sel: '.nl-keypad__row.is-scanning, .nl-scanrow.is-scanning' },
];

/** Phones and tablets (the one-screen shell: stack and split layouts). */
export const SHELL_SPEC = [
  { name: 'keypad', sel: '.nl-keypad' },
  ...KEY_BOXES,
  { name: 'sentence', sel: '[data-section="speak"] .nl-speakbar' },
  { name: 'sentence-text', sel: '[data-section="speak"] .nl-speakbar__text', tight: true, text: true, exclude: '.nl-speakbar__digits' },
  { name: 'sentence-digits', sel: '[data-section="speak"] .nl-speakbar__digits-end', tight: true, text: true },
  { name: 'clear', sel: '.phone-card__clear, .phone-card__undo' },
  { name: 'speak', sel: '.phone-actions [data-action="speak"]', text: true },
  { name: 'status', sel: '.app-header--compact .pill', all: true, names: ['status', 'scan-pill'], text: true },
  { name: 'menu', sel: '.phone-actions > .nl-btn:first-child', text: true },
  { name: 'show', sel: '.phone-actions > .nl-btn:last-child', text: true },
  { name: 'action-bar', sel: '.phone-actions' },
  { name: 'candidates', sel: '.phone-sugg' },
  { name: 'candidate', sel: '.phone-sugg__item', all: true, text: true, textSel: '.phone-sugg__end' },
  { name: 'more', sel: '.phone-sugg__more', text: true },
  { name: 'candidates-empty', sel: '.phone-sugg__empty', tight: true, text: true },
  { name: 'they-said', sel: '.header-partner' },
  { name: 'brand', sel: '.app-header .brand' },
  { name: 'header', sel: '.app-header' },
  ...SCAN_BOXES,
];

/** Laptops and desktops (the wide layout, >= 960px with a fine pointer). */
export const WIDE_SPEC = [
  { name: 'keypad', sel: '.nl-keypad' },
  ...KEY_BOXES,
  { name: 'sentence', sel: '.speak-group .nl-speakbar' },
  { name: 'sentence-text', sel: '.speak-group .nl-speakbar__text', tight: true, text: true, exclude: '.nl-speakbar__digits' },
  { name: 'sentence-digits', sel: '.speak-group .nl-speakbar__digits-end', tight: true, text: true },
  { name: 'speak', sel: '.speak-group [data-action="speak"]', text: true },
  { name: 'sentence-actions', sel: '.speak-actions' },
  { name: 'action', sel: '.speak-actions > .nl-btn', all: true, names: ['clear', 'save', 'show', 'spell'], text: true },
  { name: 'status', sel: '.app-header--wide .pill', all: true, names: ['status', 'status-model'], text: true },
  { name: 'header-button', sel: '.app-header__actions.app-header--wide .nl-btn', all: true, names: ['phrases', 'voice', 'settings'], text: true },
  { name: 'they-said', sel: '.partner' },
  { name: 'candidates', sel: '.cands' },
  { name: 'candidates-title', sel: '#cands-title', tight: true, text: true },
  { name: 'candidate', sel: '.cands .nl-candidate', all: true, text: true, textSel: '.nl-candidate__text' },
  { name: 'proof', sel: '.proof' },
  { name: 'proof-chip', sel: '.proof__chips .nl-chip', all: true, text: true, textSel: '.nl-chip__word' },
  { name: 'scanbar', sel: '.scanbar' },
  { name: 'hint', sel: '.hint' },
  { name: 'brand', sel: '.app-header .brand' },
  { name: 'header', sel: '.app-header' },
  ...SCAN_BOXES,
];

const SHOW = 'dialog.show[open]';
export const SHOW_SPEC = [
  { name: 'show-screen', sel: SHOW },
  { name: 'show-message', sel: '.show__message', within: SHOW },
  { name: 'show-label', sel: '.show__label', within: SHOW, tight: true, text: true },
  { name: 'show-text', sel: '.show__text', within: SHOW, tight: true, text: true },
  { name: 'show-done', sel: '.show__actions > .nl-btn:first-child', within: SHOW, text: true },
  { name: 'show-flip', sel: '[data-action="flip"]', within: SHOW, text: true },
];

const SETTINGS = 'dialog[data-overlay="settings"][open]';
const SPEED = '[data-scan-row="Scan speed"]';
export const SETTINGS_SPEC = [
  { name: 'sheet', sel: SETTINGS },
  { name: 'sheet-title', sel: '.sheet__title', within: SETTINGS, tight: true, text: true },
  { name: 'close', sel: '.sheet__head .nl-btn', within: SETTINGS, text: true },
  { name: 'ways-to-type', sel: 'section[aria-labelledby="set-access"]', within: SETTINGS },
  { name: 'ways-to-type-title', sel: '#set-access', within: SETTINGS, tight: true, text: true },
  { name: 'access', sel: 'fieldset:has([data-scan-row="access"])', within: SETTINGS },
  { name: 'one-switch', sel: 'label.seg__opt:has(input[value="scan1"])', within: SETTINGS, text: true },
  { name: 'scan-speed', sel: `.field:has(> ${SPEED})`, within: SETTINGS },
  { name: 'scan-speed-label', sel: `.field:has(> ${SPEED}) .field__label`, within: SETTINGS, tight: true, text: true },
  { name: 'scan-speed-value', sel: `.field:has(> ${SPEED}) .field__value`, within: SETTINGS, tight: true, text: true },
  { name: 'scan-speed-help', sel: `.field:has(> ${SPEED}) .field__help`, within: SETTINGS, text: true },
  { name: 'scan-speed-slider', sel: `${SPEED} input.range`, within: SETTINGS },
  { name: 'scan-speed-faster', sel: `${SPEED} > .nl-btn:first-child`, within: SETTINGS, text: true },
  { name: 'scan-speed-slower', sel: `${SPEED} > .nl-btn:last-child`, within: SETTINGS, text: true },
];
