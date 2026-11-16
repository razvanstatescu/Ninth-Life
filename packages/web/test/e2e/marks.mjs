// Punctuation where typed, and capitals (web-ui Req 34; spec r6 5-punctuation-capitals AC 1-6, 9-11), end to end
// on a phone (390x844 touch) and a laptop, with speech stubbed:
//   - "Not now, later please" and "Yes. I will be there soon." are typed and spoken with their marks;
//   - key 1 closes the open word (no 0 needed); Back removes the mark first, then the word; key 1 with nothing typed
//     does nothing; each press of 1 is announced in words;
//   - capitals from the table: Thursday, TV; "may" only at the start;
//   - Ask's "?" ends the sentence; 1 on the last word cycles on from "?";
//   - Fix a word > Mark after it changes only that word's mark, by touch and by two switches;
//   - the key line never shows a mark (the proof is unchanged), and only Speak speaks.
//   node packages/web/test/e2e/marks.mjs   (BASE_URL; SHOTS_DIR to save shots)
import { mkdirSync } from 'node:fs';
import { BASE_URL, addTheirLine, check, closeShow, done, loadPlaywright, newContext, openApp, stubSpeech, waitFor } from './lib.mjs';

const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png` });
const KEYS = { a: 2, b: 2, c: 2, d: 3, e: 3, f: 3, g: 4, h: 4, i: 4, j: 5, k: 5, l: 5, m: 6, n: 6, o: 6, p: 7, q: 7, r: 7, s: 7, t: 8, u: 8, v: 8, w: 9, x: 9, y: 9, z: 9 };
const enc = (w) => [...w.toLowerCase()].filter((c) => KEYS[c]).map((c) => KEYS[c]).join('');
const MARK_PRESSES = { '.': 1, '?': 2, '!': 3, ',': 4 };
const engine = process.env.ENGINE ?? 'chromium';
const browser = await loadPlaywright()[engine].launch();
console.log(`marks and capitals on ${BASE_URL} (${engine})`);

const card = (page) => page.evaluate(() => (document.querySelector('.nl-speakbar__text')?.innerText ?? '').split('\n')[0].trim());
const keyLine = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('.nl-speakbar__digits-end')?.cloneNode(true);
    c?.querySelectorAll('.nl-sr-only').forEach((n) => n.remove());
    return c?.textContent?.trim() ?? '';
  });
const announced = (page) => page.evaluate(() => document.querySelector('p.nl-sr-only[role="status"]')?.textContent ?? '');
const spoken = (page) => page.evaluate(() => window.__spoken ?? []);
/**
 * Type a sentence as written: letters as keys, 0 between words, and key 1 for a mark right after its word (no 0 before
 * the next word: 1 closed it). Returns the presses.
 */
async function typeSentence(page, text) {
  let presses = 0;
  const tokens = text.split(' ');
  for (let i = 0; i < tokens.length; i++) {
    const m = /^(.*?)([.,?!])?$/.exec(tokens[i]);
    const word = m[1];
    const mark = m[2];
    if (i && !/[.,?!]$/.test(tokens[i - 1])) {
      await page.keyboard.press('Space');
      presses++;
    }
    for (const d of enc(word)) {
      await page.keyboard.press(d);
      presses++;
    }
    for (let k = 0; k < (mark ? MARK_PRESSES[mark] : 0); k++) {
      await page.keyboard.press('1');
      presses++;
    }
  }
  return presses;
}
async function speakPhone(page) {
  await page.locator('.phone-actions button', { hasText: 'Speak' }).first().tap();
  await page.waitForTimeout(250);
  await closeShow(page);
}

try {
  for (const theme of ['night', 'day']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: engine === 'chromium', reducedMotion: 'reduce', serviceWorkers: 'block' });
    await ctx.addInitScript((t) => localStorage.setItem('nl-theme', t), theme);
    await stubSpeech(ctx);
    const page = await ctx.newPage();
    await openApp(page);
    await page.locator('#keypad').focus();

    // Key 1 with nothing typed does nothing.
    await page.keyboard.press('1');
    check((await keyLine(page)) === '' && !/[.,?!]/.test(await card(page)), `(${theme}) 34.1 key 1 with nothing typed does nothing ("${await card(page)}")`);

    // AC 1.
    for (const [text, want] of [
      ['Not now, later please', 'Not now, later please'],
      ['Yes. I will be there soon.', 'Yes. I will be there soon.'],
      ["I'm tired, can we go home?", "I'm tired, can we go home?"],
    ]) {
      await page.locator('#keypad').focus();
      await typeSentence(page, text);
      await page.waitForTimeout(150);
      const shown = await card(page);
      check(shown === want, `(${theme}) AC 1/2 "${text}" shows "${shown}"`);
      check(!/[.,?!]/.test(await keyLine(page)), `(${theme}) AC 9 the key line has no marks (${await keyLine(page)})`);
      await shot(page, `${theme}-${enc(text.split(' ')[0])}`);
      await speakPhone(page);
      const said = (await spoken(page)).at(-1);
      check(said === want, `(${theme}) the speech gets "${said}"`);
      const ws = said.toLowerCase().replace(/[.,?!]/g, '').split(' ');
      const codes = (await keyLine(page)).split(' ');
      check(ws.length === codes.length && ws.every((w, i) => enc(w) === codes[i]), `(${theme}) proof: "${said}" encodes to ${codes.join(' ')}`);
    }

    // AC 3, 4, 10: 1 closes the word; announcements; Back order.
    await page.locator('#keypad').focus();
    for (const d of '937') await page.keyboard.press(d);
    await page.keyboard.press('1');
    await waitFor(page, () => /full stop/i.test(document.querySelector('p.nl-sr-only[role="status"]')?.textContent ?? ''), null, { what: 'Full stop announced' }).catch(() => {});
    check(/^Full stop after yes\.?$/i.test(await announced(page)), `(${theme}) AC 10 "${await announced(page)}"`);
    await page.keyboard.press('4');
    check((await keyLine(page)) === '937 4', `(${theme}) AC 3 1 closed the word: the next key starts a new one (${await keyLine(page)})`);
    check(/^Yes\. [GHI]/.test(await card(page)), `(${theme}) 34.3 a capital after the full stop ("${await card(page)}")`);
    await page.keyboard.press('Backspace'); // the 4
    await page.keyboard.press('Backspace'); // the mark
    await waitFor(page, () => /mark removed/i.test(document.querySelector('p.nl-sr-only[role="status"]')?.textContent ?? ''), null, { what: 'Mark removed' }).catch(() => {});
    check((await card(page)) === 'Yes' && (await keyLine(page)) === '937', `(${theme}) AC 4 Back removes the "." first ("${await card(page)}", ${await keyLine(page)})`);
    check(/mark removed/i.test(await announced(page)), `(${theme}) AC 10 "${await announced(page)}"`);
    await page.keyboard.press('Backspace');
    check((await keyLine(page)) === '', `(${theme}) AC 4 then the word ("${await keyLine(page)}")`);
    // Cycle and its announcements.
    for (const d of '937') await page.keyboard.press(d);
    const heard = [];
    for (let k = 0; k < 5; k++) {
      await page.keyboard.press('1');
      await page.waitForTimeout(80);
      heard.push(await announced(page));
    }
    check(heard.map((h) => h.split(' ')[0]).join(',') === 'Full,Question,Exclamation,Comma,No', `(${theme}) 34.8 the cycle is announced: ${heard.join(' / ')}`);
    await page.getByRole('button', { name: /^Clear/ }).first().tap();

    // AC 6: capitals.
    await page.locator('#keypad').focus();
    for (const [text, want] of [
      ['see you on thursday', 'See you on Thursday'],
      ['watch tv', 'Watch TV'],
      ['may i', 'May I'],
    ]) {
      await typeSentence(page, text);
      await page.waitForTimeout(100);
      const shown = await card(page);
      // The first sentence may not be the one meant; then pick it from the rows (the capital is what is checked).
      const rows = await page.evaluate(() => [...document.querySelectorAll('button[data-rank] .nl-candidate__text')].map((e) => e.textContent.replace(/^Sentence \d+: /, '')));
      check(shown === want || rows.includes(want), `(${theme}) AC 6 "${text}" -> "${shown}"${shown === want ? '' : ` (rows: ${rows.join(' | ')})`}`);
      await page.getByRole('button', { name: /^Clear/ }).first().tap();
      await page.locator('#keypad').focus();
    }
    check((await spoken(page)).length === 3, `(${theme}) 12.5 only the 3 Speak presses spoke (${(await spoken(page)).length})`);
    await ctx.close();
  }

  // ---- Ask's "?", and Mark after it (laptop) -------------------------------------------------------
  {
    const ctx = await newContext(browser, { width: 1280, height: 800 });
    await stubSpeech(ctx);
    const page = await ctx.newPage();
    await openApp(page);
    await addTheirLine(page, 'Shall we go to the park later?');
    await page.getByRole('button', { name: /^Ask/ }).first().click();
    await page.locator('#keypad').focus();
    await typeSentence(page, 'are you coming');
    await page.waitForTimeout(100);
    check(/\?$/.test(await card(page)), `AC 5 Ask: the sentence ends with "?" ("${await card(page)}")`);
    await page.keyboard.press('1');
    check(/!$/.test(await card(page)), `AC 5 1 on the last word cycles on from "?" ("${await card(page)}")`);
    await page.getByRole('button', { name: /^Clear/ }).first().click();

    // Mark after it.
    await page.locator('#keypad').focus();
    await typeSentence(page, 'not now later please');
    await page.locator('button', { hasText: /^Fix a word$/ }).first().click();
    await page.locator('dialog[open] button', { hasText: /^now/i }).first().click();
    const legend = await page.evaluate(() => [...document.querySelectorAll('dialog[open] legend')].map((l) => l.textContent.trim()));
    check(legend.includes('Mark after it'), `AC 11 the sheet has "Mark after it" (${legend.join(', ')})`);
    const radios = await page.evaluate(() => [...document.querySelectorAll('dialog[open] input[type="radio"]')].map((r) => r.closest('label')?.textContent.trim()));
    check(radios.join(' | ') === 'None | Full stop . | Question mark ? | Exclamation mark ! | Comma ,', `AC 11 options: ${radios.join(' | ')}`);
    await page.getByRole('radio', { name: /^Comma/ }).check();
    await page.waitForTimeout(150);
    if (await page.locator('dialog[open]').count()) await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'), null, { timeout: 5000 });
    check((await card(page)) === 'Not now, later please', `AC 11 only that word's mark changed ("${await card(page)}")`);
    check((await spoken(page)).length === 0, '12.5 nothing spoken');
    await ctx.close();
  }

  // ---- two switches: Mark after it is one scan row ------------------------------------------------
  {
    const ctx = await newContext(browser, { width: 1280, height: 900 });
    await stubSpeech(ctx);
    const page = await ctx.newPage();
    await openApp(page);
    await page.locator('#keypad').focus();
    await typeSentence(page, 'yes i will');
    await page.getByRole('button', { name: /^settings$/i }).first().click();
    await page.getByRole('radio', { name: /two switches/i }).check();
    await page.keyboard.press('Escape');
    await waitFor(page, () => !document.querySelector('dialog[open]'), null, { what: 'Settings to close' });
    let last = 0;
    const press = async (k) => {
      const wait = last + 250 - Date.now();
      if (wait > 0) await page.waitForTimeout(wait);
      await page.keyboard.press(k);
      last = Date.now();
    };
    const stepTo = async (fn, what) => {
      for (let i = 0; i < 40 && !(await page.evaluate(fn)); i++) await press('Space');
      const ok = await page.evaluate(fn);
      check(ok, `switch: reached ${what}`);
      if (ok) await press('Enter');
      await page.waitForTimeout(120);
    };
    await stepTo(() => [...document.querySelectorAll('.is-scanning')].some((e) => e.querySelector('[data-action="fix-word"]')), 'the action row');
    await stepTo(() => !!document.querySelector('[data-action="fix-word"].is-lit'), 'Fix a word');
    await stepTo(() => [...document.querySelectorAll('dialog[open] [data-scan-state="row"]')].some((r) => /yes/i.test(r.textContent ?? '')), 'the word row');
    await stepTo(() => /^yes/i.test(document.querySelector('dialog[open] [data-scan-state="lit"]')?.textContent?.trim() ?? ''), 'Yes lit');
    await stepTo(() => document.querySelector('dialog[open] [data-scan-state="row"]')?.getAttribute('data-scan-row') === 'fix-mark', 'the Mark after it row');
    await stepTo(() => /^Full stop/.test(document.querySelector('dialog[open] [data-scan-state="lit"]')?.textContent?.trim() ?? ''), 'Full stop lit');
    await page.waitForTimeout(200);
    if (await page.locator('dialog[open]').count()) await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    check(/^Yes\. I will/.test(await card(page)), `AC 11 by switch: "${await card(page)}"`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
done('marks');
