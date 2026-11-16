// Finish the word (web-ui Req 31; spec r6 2-word-completion §5), end to end:
//   - at every phone and tablet size of responsive.mjs and a laptop: after "I need" and 9 2 the word row
//     ("Finish the word") offers 1-3 words that start with 92 and are longer; cells at least 56px, text at
//     least 16px, none cut; the keypad box is identical with and without the row; the page does not scroll;
//   - under 548px tall there is no row on the main screen; Menu has a "Finish the word" group with the words;
//   - one tap on a word puts it in and closes it; the key line shows every key, the filled-in ones marked;
//     the spoken sentence validates against the key line (the proof rule); nothing is spoken without Speak;
//   - Back once reopens the word at the keys pressed;
//   - keyboard: Alt+Shift+1 and Numpad + take word 1; plain digits type;
//   - one switch (Space) and two switches (Space, Enter): the word row is scan row 4 and a word is taken by
//     scanning; with the row hidden the row after the keypad is the sentences, as before;
//   - with Finish words off in Settings no row appears.
//   node packages/web/test/e2e/completion.mjs   (BASE_URL, default http://localhost:3202; SHOTS_DIR to save shots)
import { mkdirSync } from 'node:fs';
import { BASE_URL, check, closeShow, done, loadPlaywright, newContext, openApp, stubSpeech, waitFor, settingsGroup } from './lib.mjs';

const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png` });

const KEYS = { a: 2, b: 2, c: 2, d: 3, e: 3, f: 3, g: 4, h: 4, i: 4, j: 5, k: 5, l: 5, m: 6, n: 6, o: 6, p: 7, q: 7, r: 7, s: 7, t: 8, u: 8, v: 8, w: 9, x: 9, y: 9, z: 9 };
const enc = (w) => [...w.toLowerCase()].filter((c) => KEYS[c]).map((c) => KEYS[c]).join('');

// [name, visible width, visible height, screen width, screen height] (responsive.mjs, upright sizes only)
const DEVICES = [
  ['iPhone SE, Safari', 375, 549, 375, 667],
  ['iPhone SE, installed app', 375, 647, 375, 667],
  ['iPhone SE, Safari Bottom tab bar', 375, 495, 375, 667],
  ['iPhone 17 Pro, Safari Bottom tab bar', 402, 654, 402, 874],
  ['iPhone 16e, Safari', 390, 699, 390, 844],
  ['iPhone 17 Pro, Safari', 402, 714, 402, 874],
  ['iPhone 17 Pro Max, Safari', 440, 796, 440, 956],
  ['Android 360x800, Chrome', 360, 668, 360, 800],
  ['Android 412x915, Chrome', 412, 783, 412, 915],
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
  ['Android tablet 10"', 800, 1200, 800, 1280],
  ['Android tablet 10" landscape', 1280, 720, 1280, 800],
];

const engine = process.env.ENGINE ?? 'chromium';
const browser = await loadPlaywright()[engine].launch();
console.log(`finish the word on ${BASE_URL} (${engine})`);

/** The word row on the main screen (not in a sheet): the section headed "Finish the word". */
const rowInfo = (page) =>
  page.evaluate(() => {
    const h = [...document.querySelectorAll('h2, h3')].find((e) => e.textContent?.trim() === 'Finish the word' && !e.closest('dialog'));
    const sec = h?.closest('section');
    if (!sec) return null;
    const vh = innerHeight;
    const btns = [...sec.querySelectorAll('button')].filter((b) => b.getBoundingClientRect().height > 0);
    return {
      words: btns.map((b) => b.textContent.trim()),
      names: btns.map((b) => b.getAttribute('aria-label') ?? b.textContent.trim()),
      boxes: btns.map((b) => {
        const r = b.getBoundingClientRect();
        return { x: Math.round(r.x), w: r.width, h: r.height, top: r.top, bottom: r.bottom };
      }),
      font: Math.min(...btns.map((b) => parseFloat(getComputedStyle(b).fontSize))),
      cut: btns.filter((b) => b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1).length,
      onScreen: btns.every((b) => b.getBoundingClientRect().top >= -0.5 && b.getBoundingClientRect().bottom <= vh + 0.5),
      live: !!sec.closest('[aria-live]'),
    };
  });
const padBox = (page) => page.evaluate(() => JSON.stringify(document.querySelector('.nl-keypad').getBoundingClientRect()));
const pageScroll = (page) => page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const keyLine = (page) => page.evaluate(() => { const c = document.querySelector('.nl-speakbar__digits-end')?.cloneNode(true); c?.querySelectorAll('.nl-sr-only').forEach((n) => n.remove()); return c?.textContent?.trim() ?? ''; });
const keyLineAll = (page) => page.evaluate(() => document.querySelector('.nl-speakbar__digits')?.textContent ?? '');
const spoken = (page) => page.evaluate(() => window.__spoken ?? []);
const typeKeys = async (page, digits) => {
  for (const d of digits) await page.keyboard.press(d === ' ' ? 'Space' : d);
};

try {
  // ---- every size: the row, its cells, the keypad, a tap ------------------------------------------
  for (const [name, vw, vh, sw, sh] of [...DEVICES, ['laptop', 1280, 800, 1280, 800]]) {
    const touch = name !== 'laptop';
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, screen: { width: sw, height: sh }, deviceScaleFactor: 1, hasTouch: touch, isMobile: touch && engine === 'chromium', reducedMotion: 'reduce', serviceWorkers: 'block' });
    await stubSpeech(ctx);
    const page = await ctx.newPage();
    const label = `${name} ${vw}x${vh}`;
    await openApp(page);
    await page.locator('#keypad').focus();
    await typeKeys(page, '4 6333 ');
    await page.waitForTimeout(150);
    const pad0 = await padBox(page);
    check((await rowInfo(page)) === null, `${label}: no word row with no open word`);
    await typeKeys(page, '92');
    await page.waitForTimeout(150);
    const r = await rowInfo(page);
    const pad1 = await padBox(page);
    const short = vh < 548 && vw < vh;
    if (short) {
      check(r === null, `${label}: 31.5 under 548px tall there is no word row on the main screen`);
      // Menu > This sentence > Finish the word.
      await page.locator('.phone-actions button', { hasText: 'Menu' }).first().tap();
      const menuWords = await page.evaluate(() => {
        const h = [...document.querySelectorAll('dialog[open] h2, dialog[open] h3')].find((e) => e.textContent?.trim() === 'Finish the word');
        const sec = h?.closest('section') ?? h?.parentElement;
        return sec ? [...sec.querySelectorAll('button')].map((b) => b.textContent.trim()) : null;
      });
      check(!!menuWords && menuWords.length >= 1 && menuWords.length <= 3 && menuWords.every((w) => enc(w).startsWith('92') && enc(w).length > 2), `${label}: 31.5 Menu has "Finish the word" with ${menuWords ? menuWords.join(', ') : 'nothing'}`);
      await shot(page, `short-menu-${vw}x${vh}`);
      if (menuWords?.length) {
        await page.locator('dialog[open] button', { hasText: menuWords[0] }).first().tap();
        await page.waitForTimeout(150);
        check((await keyLine(page)).endsWith(enc(menuWords[0])), `${label}: a word from Menu puts in its keys (${await keyLine(page)})`);
      }
    } else {
      check(!!r && r.words.length >= 1 && r.words.length <= 3, `${label}: 31.1 the word row offers 1-3 words (${r ? r.words.join(', ') : 'none'})`);
      if (r) {
        check(r.words.every((w) => enc(w).startsWith('92') && enc(w).length > 2), `${label}: 31.1 every word starts with 92 and is longer`);
        check(r.boxes.every((b) => b.h >= 55.5 && b.w >= 55.5) && r.font >= 16 && r.cut === 0, `${label}: cells at least 56px (${r.boxes.map((b) => `${Math.round(b.w)}x${Math.round(b.h)}`).join(' ')}), text ${r.font}px, none cut`);
        check(r.onScreen && !r.live, `${label}: the row is on screen and not a live region`);
        check(r.names.every((n, i) => n === r.words[i]), `${label}: 9.x label in name: each button is named its word`);
      }
      check(pad0 === pad1, `${label}: 31.5 the keypad does not move when the row appears`);
      await shot(page, `row-${vw}x${vh}`);
      if (r?.words.length) {
        const btn = page.locator('section', { has: page.locator('h2, h3', { hasText: /^Finish the word$/ }) }).locator('button', { hasText: r.words[0] }).first();
        if (touch) await btn.tap();
        else await btn.click();
        await page.waitForTimeout(150);
        const line = await keyLine(page);
        check(line.endsWith(enc(r.words[0])), `${label}: 31.2 a tap puts in the word's keys (${line})`);
        check(/filled in/.test(await keyLineAll(page)), `${label}: 31.3 the key line says which keys were filled in`);
        check((await padBox(page)) === pad0, `${label}: the keypad has not moved after the tap`);
      }
    }
    check((await pageScroll(page)) <= 1 || !touch, `${label}: the page does not scroll (${await pageScroll(page)}px over)`);
    check((await spoken(page)).length === 0, `${label}: 12.5 nothing was spoken`);
    await ctx.close();
  }

  // ---- phone: dotted mark, proof, Back, Speak ------------------------------------------------------
  for (const theme of ['night', 'day']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: engine === 'chromium', reducedMotion: 'reduce', serviceWorkers: 'block' });
    await ctx.addInitScript((t) => localStorage.setItem('nl-theme', t), theme);
    await stubSpeech(ctx);
    const page = await ctx.newPage();
    await openApp(page);
    await page.locator('#keypad').focus();
    await typeKeys(page, '4 6333 92');
    await page.waitForTimeout(150);
    const r = await rowInfo(page);
    const water = r?.words.find((w) => w === 'water');
    check(!!water, `(${theme}) "I need wa" offers water (${r ? r.words.join(', ') : 'none'})`);
    if (water) {
      await page.locator('section', { has: page.locator('h2, h3', { hasText: /^Finish the word$/ }) }).locator('button', { hasText: 'water' }).first().tap();
      await page.waitForTimeout(150);
      const text = (await page.locator('.nl-speakbar__text').first().innerText()).split('\n')[0];
      check(/^I need water/.test(text), `(${theme}) 31.2 the card says "${text}"`);
      // The dotted line under the filled-in keys: some element in the key line with a dotted underline/border.
      const dotted = await page.evaluate(() =>
        [...document.querySelectorAll('.nl-speakbar__digits *')].some((e) => {
          const cs = getComputedStyle(e);
          return cs.textDecorationStyle === 'dotted' && cs.textDecorationLine.includes('underline') || cs.borderBottomStyle === 'dotted';
        }),
      );
      check(dotted, `(${theme}) 31.3 the keys not pressed have a dotted line`);
      await shot(page, `filled-${theme}`);
      // Back reopens at 92.
      await page.locator('button[data-key="*"]').first().tap();
      await page.waitForTimeout(150);
      check((await keyLine(page)) === '4 6333 92', `(${theme}) 31.4 Back reopens the word at the keys pressed (${await keyLine(page)})`);
      check(!!(await rowInfo(page)), `(${theme}) 31.4 the row shows again`);
      await page.locator('section', { has: page.locator('h2, h3', { hasText: /^Finish the word$/ }) }).locator('button', { hasText: 'water' }).first().tap();
      await page.waitForTimeout(200);
      check((await spoken(page)).length === 0, `(${theme}) 12.5 a word press speaks nothing`);
      // Speak; the proof rule against the key line.
      await page.locator('.phone-actions button', { hasText: 'Speak' }).first().tap();
      await page.waitForTimeout(300);
      await closeShow(page);
      const said = await spoken(page);
      const codes = (await keyLine(page)).split(/\s+/);
      const words = (said[0] ?? '').toLowerCase().replace(/[.,?!]/g, '').split(/\s+/);
      check(said.length === 1 && words.length === codes.length && words.every((w, i) => enc(w) === codes[i]), `(${theme}) proof rule: "${said[0]}" encodes to the keys on screen (${codes.join(' ')})`);
    }
    await ctx.close();
  }

  // ---- keyboard: Alt+Shift+1, Numpad +, plain digits ---------------------------------------------
  {
    const ctx = await newContext(browser, { width: 1280, height: 800 });
    await stubSpeech(ctx);
    const page = await ctx.newPage();
    await openApp(page);
    await page.locator('#keypad').focus();
    await typeKeys(page, '4 6333 92');
    await page.waitForTimeout(150);
    const r = await rowInfo(page);
    const first = r?.words[0];
    await page.keyboard.press('Alt+Shift+Digit1');
    await page.waitForTimeout(100);
    check(!!first && (await keyLine(page)).endsWith(enc(first)), `31.6 Alt+Shift+1 takes word 1 (${first} -> ${await keyLine(page)})`);
    await page.keyboard.press('Backspace');
    await page.keyboard.press('NumpadAdd');
    await page.waitForTimeout(100);
    check(!!first && (await keyLine(page)).endsWith(enc(first)), `31.6 Numpad + takes word 1 (${await keyLine(page)})`);
    await page.keyboard.press('2');
    await page.waitForTimeout(100);
    check((await keyLine(page)).endsWith(' 2'), `plain 2 types a key of the next word (${await keyLine(page)})`);
    // Row hidden: the keys do nothing.
    await page.keyboard.press('Space');
    const before = await keyLine(page);
    await page.keyboard.press('Alt+Shift+Digit1');
    await page.keyboard.press('NumpadAdd');
    await page.waitForTimeout(100);
    check((await keyLine(page)) === before, '31.6 with the row hidden, Alt+Shift+1 and Numpad + do nothing');
    // Settings: Finish words off -> no row.
    await page.getByRole('button', { name: /^settings$/i }).first().click();
    await settingsGroup(page, 'Typing');
    const sw = page.getByRole('switch', { name: 'Finish words' });
    check(await sw.isChecked().catch(() => false), '31.1 Finish words is on by default');
    await sw.click();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    await page.locator('#keypad').focus();
    await typeKeys(page, '92');
    await page.waitForTimeout(150);
    check((await rowInfo(page)) === null, 'with Finish words off, no row');
    check((await spoken(page)).length === 0, '12.5 nothing was spoken');
    await ctx.close();
  }

  // ---- switches: the word row is scan row 4 ------------------------------------------------------
  for (const mode of ['scan2', 'scan1']) {
    const ctx = await newContext(browser, { width: 1280, height: 900 });
    await stubSpeech(ctx);
    const page = await ctx.newPage();
    await openApp(page);
    await page.locator('#keypad').focus();
    await typeKeys(page, '4 6333 92');
    await page.getByRole('button', { name: /^settings$/i }).first().click();
    await settingsGroup(page, 'Ways to type');
    await page.getByRole('radio', { name: mode === 'scan1' ? /one switch/i : /two switches/i }).check();
    await page.keyboard.press('Escape');
    await waitFor(page, () => !document.querySelector('dialog[open]'), null, { what: 'Settings to close' });
    const r = await rowInfo(page);
    const want = r?.words[0];
    let last = 0;
    const press = async (key) => {
      const wait = last + 250 - Date.now();
      if (wait > 0) await page.waitForTimeout(wait);
      await page.keyboard.press(key);
      last = Date.now();
    };
    const litRowHasWord = () =>
      page.evaluate(() => {
        const h = [...document.querySelectorAll('h2, h3')].find((e) => e.textContent?.trim() === 'Finish the word' && !e.closest('dialog'));
        const sec = h?.closest('section');
        return !!sec && (sec.classList.contains('is-scanning') || !!sec.querySelector('.is-scanning') || !!sec.closest('.is-scanning'));
      });
    let rowSteps = 0;
    if (mode === 'scan2') {
      // Space advances; the 5th row (index 4) is the word row.
      for (let i = 0; i < 12 && !(await litRowHasWord()); i++) {
        await press('Space');
        rowSteps += 1;
      }
      check(await litRowHasWord(), `two switches: the word row is reached by stepping (${rowSteps} step(s))`);
      check(rowSteps <= 5, `31.6 the word row is scan row 4 (${rowSteps} Space presses from the start)`);
      await press('Enter'); // into the row
      await page.waitForTimeout(100);
      await press('Enter'); // the first word
    } else {
      await press('Space'); // start
      const t0 = Date.now();
      while (!(await litRowHasWord()) && Date.now() - t0 < 30000) await page.waitForTimeout(100);
      check(await litRowHasWord(), 'one switch: the scan reaches the word row');
      await press('Space'); // choose the row
      await waitFor(page, () => !!document.querySelector('section .is-lit, section button.is-lit'), null, { timeout: 15000, what: 'a lit word' }).catch(() => {});
      await press('Space'); // the lit (first) word
    }
    await page.waitForTimeout(200);
    check(!!want && (await keyLine(page)).endsWith(enc(want)), `${mode}: a word taken by switch (${want} -> ${await keyLine(page)})`);
    check((await spoken(page)).length === 0, `${mode}: 12.5 nothing was spoken`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
done('completion');
