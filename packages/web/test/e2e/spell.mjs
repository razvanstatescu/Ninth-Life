// Spell mode and my words, end to end (web-ui Req 19-21). Types "hi" and 64424 (a name the
// dictionary does not have), spells "Mihai" by keyboard only, adds it to my words, reloads and checks
// that it ranks and keeps its capital. Then does the same spelling with a single switch (Space), in a
// fresh browser profile.
//   node packages/web/test/e2e/spell.mjs     (needs `next start`; BASE_URL, default http://localhost:3202)
// SHOTS_DIR=<dir> also saves screenshots of each step.
import { mkdirSync } from 'node:fs';
import { BASE_URL, check, done, loadPlaywright, newContext, openApp, tabTo, waitFor, settingsGroup } from './lib.mjs';

const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
};

const speakText = (page) => page.evaluate(() => (document.getElementById('utterance')?.childNodes[0] ? [...document.getElementById('utterance').childNodes].filter((n) => !n.classList?.contains('nl-speakbar__digits')).map((n) => n.textContent).join('').trim() : ''));
const chipStates = (page) => page.evaluate(() => [...document.querySelectorAll('.proof .nl-chip')].map((c) => c.getAttribute('data-state')));
const typeDigits = async (page, digits) => {
  for (const d of digits) await page.keyboard.press(d === ' ' ? 'Space' : d);
};

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
console.log(`spell mode and my words on ${BASE_URL}`);
try {
  // ---- keyboard only ----------------------------------------------------------------------
  {
    const ctx = await newContext(browser, { width: 1280, height: 900 });
    const page = await ctx.newPage();
    await openApp(page);
    await typeDigits(page, '44064424');
    await waitFor(page, () => [...document.querySelectorAll('.proof .nl-chip')].map((c) => c.getAttribute('data-state')).join() === 'match,unspelled', null, { what: 'the second word to show as not spelled yet' });
    check(/64424/.test(await speakText(page)), `unknown keys show their digits: "${await speakText(page)}"`);
    check(await page.locator('.proof .nl-chip__note').getByText('not spelled yet', { exact: true }).isVisible(), 'the proof chip says "not spelled yet"');
    check(await page.getByRole('button', { name: 'Speak' }).isDisabled(), 'Speak is off until the word is spelled');
    await shot(page, 'kbd-1-unspelled');

    const tabs = await tabTo(page, () => document.activeElement?.getAttribute('aria-label') === 'Spell this word', { what: 'Spell this word' });
    await page.keyboard.press('Enter');
    await waitFor(page, () => !!document.querySelector('dialog[data-overlay="spell"][open]'), null, { what: 'spell mode to open' });
    check(await page.evaluate(() => document.activeElement?.id === 'spell-pos-0'), `spell mode opened from the keyboard (${tabs} Tab presses) with focus on letter 1`);
    const rows = await page.evaluate(() => [...document.querySelectorAll('dialog[open] .spell__pos')].map((f) => [...f.querySelectorAll('input')].map((i) => i.value).join('')));
    check(rows.join(' ') === 'mno ghi ghi abc ghi', `one row per key with only its letters: ${rows.join(' ')}`);
    // m = 1st letter on 6, i = 3rd on 4, h = 2nd on 4, a = 1st on 2, i = 3rd on 4.
    for (const d of '13213') await page.keyboard.press(d);
    const word = await page.locator('dialog[open] .spell__word').innerText();
    check(word === 'Mihai', `digits picked the letters: "${word}"`);
    await shot(page, 'kbd-2-spell');
    check(await page.evaluate(() => document.activeElement?.id === 'spell-use'), 'after the last letter, focus is on Use this word');
    await page.keyboard.press('Enter');
    await waitFor(page, () => !document.querySelector('dialog[open]'), null, { what: 'spell mode to close' });
    const shown = await speakText(page);
    check(/Mihai/.test(shown) && (await chipStates(page)).join() === 'match,new', `the spelled word is in the sentence as a new word: "${shown}"`);
    check(await page.locator('.proof .proof__offer').getByText(/Not in your words yet. Add it\?/).isVisible(), 'the proof offers "Not in your words yet. Add it?"');
    check(!(await page.getByRole('button', { name: 'Speak' }).isDisabled()), 'Speak is on');
    await shot(page, 'kbd-3-used');

    await tabTo(page, () => document.activeElement?.textContent?.trim() === 'Add to my words', { what: 'Add to my words' });
    await page.keyboard.press('Enter');
    await waitFor(page, () => [...document.querySelectorAll('.proof .nl-chip')].map((c) => c.getAttribute('data-state')).join() === 'match,match', null, { what: 'the word to be in my words' });
    check(true, 'Add to my words: the chip now matches');
    await page.waitForTimeout(300); // IndexedDB write

    await page.reload({ waitUntil: 'load' });
    await openApp(page);
    await typeDigits(page, '44064424');
    await waitFor(page, () => /Mihai/.test(document.querySelector('.cands__list')?.textContent ?? ''), null, { what: '"Mihai" in the sentence list after a reload' });
    const first = await page.locator('.nl-candidate[data-rank="1"]').innerText();
    check(/Mihai/.test(first), `after a reload "Mihai" ranks, with its capital: sentence 1 is "${first.replace(/\s+/g, ' ').trim()}"`);
    check((await chipStates(page)).join() === 'match,match', 'and it matches (it is in my words)');
    await shot(page, 'kbd-4-reloaded');
    await ctx.close();
  }

  // ---- one switch (Space) ---------------------------------------------------------------
  {
    const ctx = await newContext(browser, { width: 1280, height: 900 });
    const page = await ctx.newPage();
    await openApp(page);
    // Setup (a helper would do this once): Settings -> One switch, scan speed 0.4 s.
    await page.getByRole('button', { name: /^settings$/i }).first().click();
    await settingsGroup(page, 'Ways to type');
    await page.getByRole('radio', { name: /one switch/i }).check();
    for (let i = 0; i < 4; i++) {
      const faster = page.getByRole('button', { name: /^Faster: Scan speed/ });
      if (await faster.isDisabled()) break;
      await faster.click();
    }
    await page.keyboard.press('Escape');
    await waitFor(page, () => !document.querySelector('dialog[open]'), null, { what: 'Settings to close' });
    await typeDigits(page, '44064424');
    await waitFor(page, () => [...document.querySelectorAll('.proof .nl-chip')].map((c) => c.getAttribute('data-state')).join() === 'match,unspelled', null, { what: 'the unspelled word' });

    let presses = 0;
    let last = 0;
    const sw = async () => {
      const wait = last + 250 - Date.now(); // never faster than the accept delay
      if (wait > 0) await page.waitForTimeout(wait);
      await page.keyboard.press('Space');
      last = Date.now();
      presses += 1;
    };
    const when = (fn, arg, what) => waitFor(page, fn, arg, { timeout: 30000, what });
    const t0 = Date.now();
    await sw(); // start scanning
    await when(() => !!document.querySelector('.speak-group.is-scanning'), null, 'the actions row');
    await sw();
    await when(() => !!document.querySelector('[data-action="spell"].is-lit'), null, 'Spell this word lit');
    await sw();
    await when(() => document.querySelector('[data-scan-state="row"]')?.getAttribute('data-scan-row') === 'close', null, 'spell mode to open on Close');
    await shot(page, 'switch-1-spell-open');
    const pick = async (pos, letter) => {
      await when((p) => document.querySelector('[data-scan-state="row"]')?.getAttribute('data-scan-row') === `pos-${p}`, pos, `letter ${pos + 1} row`);
      await sw();
      await when((l) => document.querySelector('[data-scan-state="lit"] input')?.value === l, letter, `letter "${letter}"`);
      await sw();
    };
    await pick(1, 'i');
    await pick(2, 'h');
    await pick(4, 'i'); // letters 1 (m) and 4 (a) are already the first on their keys
    const word = await page.locator('dialog[open] .spell__word').innerText();
    check(word === 'Mihai', `spelled by switch: "${word}"`);
    await when(() => document.querySelector('[data-scan-state="row"]')?.getAttribute('data-scan-row') === 'spell-done', null, 'the Use / Add row');
    await shot(page, 'switch-2-done-row');
    await sw();
    await when(() => document.querySelector('[data-scan-state="lit"]')?.textContent?.trim() === 'Add to my words', null, 'Add to my words lit');
    // One ember thing: while scanning, nothing else on screen is an ember fill.
    const embers = await page.evaluate(() => [...document.querySelectorAll('button, label')].filter((b) => b.offsetParent !== null && getComputedStyle(b).backgroundColor === 'rgb(255, 177, 61)').length);
    check(embers === 0, `only the scan highlight is ember (${embers} ember fills)`);
    await sw();
    await when(() => [...document.querySelectorAll('.proof .nl-chip')].map((c) => c.getAttribute('data-state')).join() === 'match,match', null, 'Mihai in my words');
    check(/Mihai/.test(await speakText(page)), `used and added by switch with ${presses} presses in ${((Date.now() - t0) / 1000).toFixed(1)} s: "${await speakText(page)}"`);
    await page.waitForTimeout(300);

    await page.reload({ waitUntil: 'load' });
    await openApp(page);
    await typeDigits(page, '44064424');
    await waitFor(page, () => /Mihai/.test(document.querySelector('.cands__list')?.textContent ?? ''), null, { what: '"Mihai" after a reload' });
    const first = await page.locator('.nl-candidate[data-rank="1"]').innerText();
    check(/Mihai/.test(first), `after a reload "Mihai" ranks: sentence 1 is "${first.replace(/\s+/g, ' ').trim()}"`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
done('spell');
