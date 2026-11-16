// Shared helpers for the e2e scripts. They run with plain node (not @playwright/test):
//   node packages/web/test/e2e/<script>.mjs        (BASE_URL defaults to http://localhost:3202)
// Playwright is not a project dependency: it comes from the dev image (global install) or, in
// CI, from `npm i -g playwright@<version>`. See docs/testing/README.md.
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

export function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    const root = execSync('npm root -g').toString().trim();
    return createRequire(resolve(root, 'noop.js'))('playwright');
  }
}

export const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3202').replace(/\/$/, '');

/** A new context with the theme set before first paint (the app mirrors it in localStorage). */
export async function newContext(browser, { theme = 'night', width = 1280, height = 900, reducedMotion = 'reduce', serviceWorkers = 'block' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion, serviceWorkers });
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem('nl-theme', t);
    } catch {
      /* storage off */
    }
  }, theme);
  return ctx;
}

/** Open the app (at /app since ADR-006) and wait until the offline dictionary is ready. */
export async function openApp(page, path = '/app') {
  await page.goto(BASE_URL + path, { waitUntil: 'load' });
  await page.locator('button[data-key="4"]').first().waitFor({ state: 'visible', timeout: 15000 });
  // The status text, visible or screen-reader only (the compact header shows a short pill).
  await page
    .waitForFunction(() => /offline dictionary ready/i.test(document.body?.textContent ?? ''), null, { timeout: 20000, polling: 50 })
    .catch(() => {
      throw new Error('The offline dictionary did not report ready within 20 s');
    });
}

/** Wait for a condition evaluated in the page; returns its value. */
export async function waitFor(page, fn, arg, { timeout = 10000, what = "condition", onTimeout } = {}) {
  try {
    const h = await page.waitForFunction(fn, arg, { timeout, polling: 50 });
    return await h.jsonValue();
  } catch {
    const extra = onTimeout ? ` (${JSON.stringify(await onTimeout().catch(() => null))})` : "";
    throw new Error(`Timed out waiting for ${what}${extra}`);
  }
}

let failures = 0;
export function check(ok, message) {
  if (ok) console.log(`  ok   ${message}`);
  else {
    failures += 1;
    console.log(`  FAIL ${message}`);
  }
}
export function done(name) {
  if (failures > 0) {
    console.log(`\n${name}: ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log(`\n${name}: all checks passed`);
}

/**
 * The Tab key. WebKit on macOS (as Safari with "Press Tab to highlight each item" off) skips buttons on
 * Tab; Option+Tab reaches every control, as a keyboard-only Safari user would set it up.
 */
export const TAB = (process.env.ENGINE ?? 'chromium') === 'webkit' ? 'Alt+Tab' : 'Tab';

/** Press Tab until the predicate holds for document.activeElement (keyboard-only navigation). */
export async function tabTo(page, predicate, { max = 80, what = 'element' } = {}) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(TAB);
    if (await page.evaluate(predicate)) return i + 1;
  }
  throw new Error(`Could not reach ${what} with Tab in ${max} presses`);
}

/**
 * Add a "they said" line the way a person would on this layout (web-ui Req 27): the empty header
 * button, the strip's They said, the panel's Type their line, or Menu > They said.
 */
export async function addTheirLine(page, text) {
  const visible = async (loc) => (await loc.count()) > 0 && (await loc.first().isVisible());
  const entries = [
    page.locator('.header-partner--empty'),
    page.locator('.thread-strip__actions button', { hasText: 'They said' }),
    page.locator('.thread-panel__actions button', { hasText: 'Type their line' }),
  ];
  let opened = false;
  for (const e of entries) {
    if (await visible(e)) {
      await e.first().click();
      opened = true;
      break;
    }
  }
  if (!opened) {
    await page.locator('.phone-actions button', { hasText: 'Menu' }).first().click();
    await page.locator('dialog[open] button', { hasText: 'They said' }).first().click();
  }
  const field = page.locator('dialog[open] input.input, .thread-panel input.input').first();
  await field.waitFor({ state: 'visible', timeout: 5000 });
  await field.fill(text);
  await page.locator('button[type="submit"]', { hasText: 'Done' }).first().click();
  await page.waitForFunction(() => !document.querySelector('dialog[data-overlay="partner"][open]') && !document.querySelector('.thread-panel input'), null, { timeout: 5000 });
}

/** Close big-text Show mode if Speak opened it (a browser with no voice). */
export async function closeShow(page) {
  const done = page.locator('dialog.show[open] button', { hasText: 'Done' });
  if (await done.count()) await done.first().click();
}

/** Record what is handed to speechSynthesis.speak in `window.__spoken` (call before the page loads). */
export async function recordSpeech(ctx) {
  await ctx.addInitScript(() => {
    window.__spoken = [];
    const proto = window.SpeechSynthesis?.prototype;
    if (!proto) return;
    const orig = proto.speak;
    proto.speak = function (u) {
      window.__spoken.push(u.text);
      return orig.call(this, u);
    };
  });
}

/**
 * Replace the browser's voice with a stub that records what it is asked to say in `window.__spoken` and
 * ends at once (headless browsers may have no voice, and then Speak shows big text instead). Call before
 * the page loads.
 */
export async function stubSpeech(ctx) {
  await ctx.addInitScript(() => {
    window.__spoken = [];
    const voice = { voiceURI: 'stub', name: 'Stub voice', lang: 'en-US', localService: true, default: true };
    class Utterance {
      constructor(text) {
        this.text = text;
        this.voice = null;
        this.lang = '';
        this.rate = 1;
        this.pitch = 1;
      }
    }
    const synth = {
      speaking: false,
      pending: false,
      paused: false,
      onvoiceschanged: null,
      getVoices: () => [voice],
      speak(u) {
        window.__spoken.push(u.text);
        setTimeout(() => {
          u.onstart?.();
          u.onend?.();
        }, 10);
      },
      cancel() {},
      pause() {},
      resume() {},
      addEventListener() {},
      removeEventListener() {},
    };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true, writable: true });
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true, writable: true });
  });
}

/**
 * Settings opens on its groups (web-ui Req 38): a list on phones, two panes on larger screens. Press the group whose
 * name is `title` ("Ways to type", "Typing", "Partner strip", "Model ranking"...), as a person would, before using one
 * of its settings. Call with Settings open.
 */
export async function settingsGroup(page, title) {
  const item = page.locator('dialog[data-overlay="settings"][open] .settings__item').filter({ has: page.locator('.menu-row__label', { hasText: new RegExp(`^${title}$`) }) });
  await item.first().waitFor({ state: 'visible', timeout: 5000 });
  await item.first().click();
}
