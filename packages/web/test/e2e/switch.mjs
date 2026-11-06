// Single-switch walkthrough: Space is the switch. Turn on one-switch scanning in Settings, then
// type "hi" (4 4) by row/column scanning only: wait for the keypad row, press, wait for the key,
// press. No other key and no pointer is used once scanning is on.
//   node packages/web/test/e2e/switch.mjs     (needs `next start`; BASE_URL, default :3202)
import { BASE_URL, check, done, loadPlaywright, newContext, openApp, waitFor } from './lib.mjs';

const TARGET = { row: 1, key: '4' }; // key 4 (G H I) is row 1, cell 0 of the keypad

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
console.log(`single-switch walkthrough on ${BASE_URL}`);
try {
  const ctx = await newContext(browser, { width: 1280, height: 900 });
  const page = await ctx.newPage();
  await openApp(page);

  // Setup (a helper would do this once): Settings -> Access -> One switch.
  const direct = page.getByRole('button', { name: /^settings$/i }).first();
  if (await direct.isVisible().catch(() => false)) await direct.click();
  else {
    await page.getByRole('button', { name: /menu/i }).first().click();
    await page.getByRole('button', { name: /^settings$/i }).first().click();
  }
  await page.getByRole('radio', { name: /one switch/i }).check();
  await page.keyboard.press('Escape');
  await waitFor(page, () => !document.querySelector('dialog[open]'), null, { what: 'Settings to close' });
  const scanMs = await page.evaluate(() => {
    const m = /([\d.]+)\s*s a step/.exec(document.body.innerText);
    return m ? Math.round(Number(m[1]) * 1000) : null;
  });
  check(scanMs !== null, `one-switch scanning is on (${scanMs} ms a step)`);

  const t0 = Date.now();
  let presses = 0;
  // A second press inside the accept delay (default 150 ms) is treated as a tremor and ignored,
  // so the script, like a person, never presses twice faster than that.
  const ACCEPT_GAP_MS = 250;
  let last = 0;
  const sw = async () => {
    const wait = last + ACCEPT_GAP_MS - Date.now();
    if (wait > 0) await page.waitForTimeout(wait);
    await page.keyboard.press('Space');
    last = Date.now();
    presses += 1;
  };

  await sw(); // start scanning
  for (let letter = 0; letter < 2; letter++) {
    await waitFor(page, (r) => [...document.querySelectorAll('.nl-keypad__row')].findIndex((x) => x.classList.contains('is-scanning')) === r, TARGET.row, {
      timeout: 30000,
      what: `keypad row ${TARGET.row} highlighted`,
    });
    await sw(); // choose the row
    await waitFor(page, (k) => document.querySelector(`button[data-key="${k}"]`)?.classList.contains('is-lit'), TARGET.key, {
      timeout: 30000,
      what: `key ${TARGET.key} lit`,
    });
    // One ember thing: while a key is lit, Speak must not be an ember fill.
    const speakEmber = await page.evaluate(() =>
      [...document.querySelectorAll('.nl-btn--primary')].some((b) => b.offsetParent !== null && getComputedStyle(b).backgroundColor === 'rgb(255, 177, 61)'),
    );
    check(!speakEmber, `letter ${letter + 1}: key ${TARGET.key} lit and no other ember fill on screen`);
    await sw(); // choose the key
    await waitFor(page, (n) => (document.querySelector('.nl-speakbar__digits')?.textContent ?? '').replace(/[^0-9]/g, '') === '4'.repeat(n), letter + 1, {
      what: `${letter + 1} press(es) of key 4 registered`,
      onTimeout: () => page.evaluate(() => document.querySelector(".nl-speakbar")?.textContent),
    });
  }
  const shown = (await page.locator('.nl-speakbar__text').first().innerText()).split('\n')[0].trim();
  check(/^hi\b/i.test(shown), `typed by scanning: "${shown}" with ${presses} switch presses in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  check(presses === 5, 'exactly 1 start + 2 presses per letter');
  await ctx.close();
} finally {
  await browser.close();
}
done('switch');
