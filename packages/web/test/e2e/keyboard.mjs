// Keyboard-only walkthrough of the communication screen (no mouse at any step):
//   type "i need water" with digits, choose a sentence, open Settings with Tab + Enter, close it
//   with Escape, and check focus is visible and comes back to the opener.
//   node packages/web/test/e2e/keyboard.mjs     (needs `next start`; BASE_URL, default :3202)
import { BASE_URL, check, done, loadPlaywright, newContext, openApp, tabTo, waitFor } from './lib.mjs';

const KEYS = '4 0 6 3 3 3 0 9 2 8 3 7'.split(' '); // i(4) space need(6333) space water(92837)
// The sentence line only (the digits line sits inside the same element).
const speakText = async (page) => (await page.locator('.nl-speakbar__text').first().innerText()).split('\n')[0];

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
console.log(`keyboard walkthrough on ${BASE_URL}`);
try {
  for (const width of [1280, 390]) {
    console.log(`viewport ${width}`);
    const ctx = await newContext(browser, { width, height: width === 390 ? 844 : 900 });
    const page = await ctx.newPage();
    await openApp(page);

    for (const k of KEYS) await page.keyboard.press(k);
    await waitFor(page, () => /need water/i.test(document.querySelector('.nl-speakbar__text')?.textContent ?? ''), null, {
      what: '"I need water" in the speak bar',
    });
    check(/^I need water/.test((await speakText(page)).trim()), `typed 4 0 6333 0 92837 -> "${(await speakText(page)).trim()}"`);

    // Choose sentence 2 with Alt+2, then move back up with ArrowUp.
    const pressed = () => page.locator('[aria-pressed="true"]').first().innerText().catch(() => '');
    await page.keyboard.press('Alt+2');
    await waitFor(page, () => !!document.querySelector('[aria-pressed="true"]'), null, { what: 'a chosen sentence' });
    const second = (await pressed()).replace(/\s+/g, ' ').trim();
    const shown2 = (await speakText(page)).trim();
    check(second.length > 0 && !/need water/i.test(shown2), `Alt+2 chose a sentence ("${second}"), speak bar now "${shown2}"`);
    await page.keyboard.press('ArrowUp');
    await waitFor(page, () => /need water/i.test(document.querySelector('.nl-speakbar__text')?.textContent ?? ''), null, {
      what: 'ArrowUp back to "I need water"',
    });
    check(/need water/i.test(await pressed()), 'ArrowUp moved the choice back to "I need water"');

    // Settings with the keyboard only. On narrow layouts Settings may sit behind a Menu button.
    const isSettings = () => /^settings$/i.test((document.activeElement?.textContent ?? '').trim()) && document.activeElement?.tagName === 'BUTTON';
    const isMenu = () => /menu/i.test(document.activeElement?.textContent ?? '') && document.activeElement?.tagName === 'BUTTON';
    const settingsVisible = await page.getByRole('button', { name: /^settings$/i }).first().isVisible().catch(() => false);
    const steps = await tabTo(page, settingsVisible ? isSettings : isMenu, { what: settingsVisible ? 'Settings' : 'Menu' });
    const ring = await page.evaluate(() => {
      const cs = getComputedStyle(document.activeElement);
      return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), offset: parseFloat(cs.outlineOffset) };
    });
    check(ring.style !== 'none' && ring.width >= 3, `focus ring on the opener after ${steps} Tab(s): ${ring.style} ${ring.width}px, offset ${ring.offset}px`);
    await page.keyboard.press('Enter');
    if (!settingsVisible) {
      await page.locator('dialog[open]').first().waitFor({ timeout: 5000 });
      await tabTo(page, isSettings, { what: 'Settings inside the menu' });
      await page.keyboard.press('Enter');
    }
    await waitFor(page, () => [...document.querySelectorAll('dialog[open]')].some((d) => /settings/i.test(d.textContent ?? '')), null, {
      what: 'the Settings sheet',
    });
    const inside = await page.evaluate(() => !!document.activeElement?.closest('dialog[open]'));
    check(inside, 'Settings opened with Enter and focus moved into the sheet');
    const theme0 = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.keyboard.press('Escape');
    await waitFor(page, () => !document.querySelector('dialog[open]'), null, { what: 'the sheet to close' });
    const back = await page.evaluate(() => (document.activeElement?.textContent ?? '').trim());
    check(true, 'Escape closed the sheet');
    check(/settings|menu/i.test(back), `focus returned to the opener ("${back}")`);
    check((await speakText(page)).includes('need water'), 'the sentence survived opening and closing Settings');
    check((await page.evaluate(() => document.documentElement.dataset.theme)) === theme0, 'theme unchanged');
    await ctx.close();
  }
} finally {
  await browser.close();
}
done('keyboard');
