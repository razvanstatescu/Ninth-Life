// Devpost gallery, step 1: real app screens from the live site (Night theme, ranking off, which is the default).
// Run from packages/web: node ../../docs/submission/assets/gallery/capture.mjs
// Writes raw/*.png next to this file. compose.mjs then frames them into 3:2 slides.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addTheirLine, loadPlaywright, newContext, openApp, settingsGroup, stubSpeech, waitFor } from '../../../../packages/web/test/e2e/lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const RAW = join(here, 'raw');
mkdirSync(RAW, { recursive: true });
const SITE = process.env.SITE ?? 'https://night.statescu.net';
process.env.BASE_URL = SITE;
const only = process.argv.slice(2);
const want = (name) => only.length === 0 || only.includes(name);

const { chromium } = loadPlaywright();
const browser = await chromium.launch();

/** Type a key string: digits are keys, a space is the 0 key (next word). */
async function type(page, keys) {
  for (const k of keys) {
    await page.keyboard.press(k === ' ' ? 'Space' : k);
    await page.waitForTimeout(70);
  }
  await page.waitForTimeout(900);
}

async function open({ width, height, scale = 2 }) {
  const ctx = await newContext(browser, { width, height });
  await ctx.close();
  const c = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await c.addInitScript(() => {
    try {
      localStorage.setItem('nl-theme', 'night');
    } catch {}
  });
  await stubSpeech(c);
  const page = await c.newPage();
  await openApp(page, '/app');
  await page.waitForTimeout(500);
  return { c, page };
}
const shot = (page, name) => page.screenshot({ path: join(RAW, `${name}.png`) });

const NEED_WATER = '4 6333 92837';
/** Focus returns to "Type their line" after Done; Space (the 0 key) would press it, so move focus off. */
const blur = (page) => page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));

if (want('laptop-typing')) {
  const { c, page } = await open({ width: 1500, height: 1000 });
  await type(page, NEED_WATER);
  await shot(page, 'laptop-typing');
  await c.close();
}

if (want('laptop-convo')) {
  const { c, page } = await open({ width: 1500, height: 1000 });
  await addTheirLine(page, 'What do you need?');
  await page.waitForTimeout(400);
  await blur(page);
  await type(page, NEED_WATER);
  await shot(page, 'laptop-convo');
  await c.close();
}

if (want('laptop-show')) {
  const { c, page } = await open({ width: 1500, height: 1000 });
  await type(page, NEED_WATER);
  await page.locator('button', { hasText: /^Show$/ }).first().click();
  await page.locator('dialog.show[open]').waitFor({ state: 'visible' });
  await page.waitForTimeout(600);
  await shot(page, 'laptop-show');
  await c.close();
}

if (want('laptop-scan')) {
  const { c, page } = await open({ width: 1500, height: 1000 });
  await page.getByRole('button', { name: /^settings$/i }).first().click();
  await settingsGroup(page, 'Ways to type');
  await page.getByRole('radio', { name: /one switch/i }).check();
  await page.keyboard.press('Escape');
  await waitFor(page, () => !document.querySelector('dialog[open]'), null, { what: 'Settings to close' });
  await blur(page);
  await type(page, '406333092837'); // with the switch on, Space is the switch, so the 0 key types the spaces
  await blur(page);
  await page.keyboard.press('Space'); // the switch: start scanning
  await waitFor(page, () => document.querySelectorAll('.nl-keypad__row')[1]?.classList.contains('is-scanning'), null, { timeout: 40000, what: 'keypad row 2 scanning' });
  await page.waitForTimeout(150);
  await shot(page, 'laptop-scan');
  await c.close();
}

if (want('laptop-spell')) {
  const { c, page } = await open({ width: 1500, height: 1000 });
  await type(page, '64424');
  await page.locator('[data-action="spell"]').first().click();
  await page.locator('dialog[open]').first().waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  for (const [i, pick] of ['1', '3', '2', '1', '3'].entries()) {
    void i; // picking a letter moves to the next one by itself
    await page.keyboard.press(pick);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(500);
  // The picks move focus down the sheet; scroll it back so the word card ("Mihai 64424") shows.
  await page.evaluate(() => document.querySelectorAll('dialog[open], dialog[open] *').forEach((e) => (e.scrollTop = 0)));
  await page.waitForTimeout(200);
  console.log('spell card:', (await page.locator('dialog[open]').first().innerText()).split('\n').slice(0, 4).join(' | '));
  await shot(page, 'laptop-spell');
  await c.close();
}

for (const [name, width, height, scale] of [
  ['phone', 390, 844, 3],
  ['tablet', 820, 1180, 2],
  ['laptop', 1440, 900, 2],
]) {
  if (!want(name)) continue;
  const { c, page } = await open({ width, height, scale });
  await addTheirLine(page, 'What do you need?');
  await page.waitForTimeout(300);
  await blur(page);
  await type(page, NEED_WATER);
  await shot(page, name);
  await c.close();
}

// Website figures (the proof check, privacy map, results), from the live home page.
if (want('site')) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, reducedMotion: 'reduce', colorScheme: 'dark' });
  const page = await c.newPage();
  await page.goto(`${SITE}/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: '.site-barline{display:none!important}' });
  await page.waitForTimeout(800);
  for (const [name, sel] of [
    ['site-proof', '#proof .site-proof-layout'],
    ['site-proof-figure', 'figure.site-proof'],
    ['site-privacy-map', '#privacy .site-card--lead'],
    ['site-results', '#results .site-results__chart'],
    ['site-results-effort', '#results .site-results__grid'],
  ]) {
    const el = page.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await el.screenshot({ path: join(RAW, `${name}.png`) });
  }
  await c.close();
}

await browser.close();
console.log('captured', only.length ? only.join(', ') : 'all');
