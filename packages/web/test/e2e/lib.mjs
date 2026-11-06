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
export async function newContext(browser, { theme = 'night', width = 1280, height = 900, reducedMotion = 'reduce' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion, serviceWorkers: 'block' });
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem('nl-theme', t);
    } catch {
      /* storage off */
    }
  }, theme);
  return ctx;
}

/** Open the app and wait until the offline dictionary is ready. */
export async function openApp(page, path = '/') {
  await page.goto(BASE_URL + path, { waitUntil: 'load' });
  await page.locator('button[data-key="4"]').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText(/dictionary ready/i).first().waitFor({ timeout: 20000 }).catch(() => {
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

/** Press Tab until the predicate holds for document.activeElement (keyboard-only navigation). */
export async function tabTo(page, predicate, { max = 80, what = 'element' } = {}) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(predicate)) return i + 1;
  }
  throw new Error(`Could not reach ${what} with Tab in ${max} presses`);
}
