// Fix a word and Did you mean (web-ui Req 32, ADR-009; spec r6 3-fix-a-word AC 1, 4-10, 13), end to end:
//   - phone 390x844 touch, Night and Day: "can you calm my daughter": one tap on the sentence opens Fix a word;
//     calm > call puts in 2255 with the changed key boxed; nothing spoken; the spoken sentence encodes to the
//     keys on screen (the proof rule);
//   - Did you mean: 7532573 offers please in the word row; a tap gives 753273 with the extra 5 struck through;
//     Back restores 7532573;
//   - every control in the sheet is at least 56px, text at least 16px, names start with the visible text;
//   - under 548px tall: Menu > Fix a word, and a Did you mean group;
//   - the keypad does not move when the sheet opens and closes, at 6 sizes; no page scroll;
//   - keyboard: Tab to the sentence, Enter opens the sheet, Escape closes it and focus returns;
//   - two switches (Space moves, Enter picks) on a laptop: Fix a word in the action row, then a word, then a
//     word one key away, all by switch.
//   node packages/web/test/e2e/fix.mjs   (BASE_URL; SHOTS_DIR to save shots)
import { mkdirSync } from 'node:fs';
import { BASE_URL, TAB, check, closeShow, done, loadPlaywright, newContext, openApp, stubSpeech, waitFor } from './lib.mjs';

const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png` });
const KEYS = { a: 2, b: 2, c: 2, d: 3, e: 3, f: 3, g: 4, h: 4, i: 4, j: 5, k: 5, l: 5, m: 6, n: 6, o: 6, p: 7, q: 7, r: 7, s: 7, t: 8, u: 8, v: 8, w: 9, x: 9, y: 9, z: 9 };
const enc = (w) => [...w.toLowerCase()].filter((c) => KEYS[c]).map((c) => KEYS[c]).join('');
const engine = process.env.ENGINE ?? 'chromium';
const browser = await loadPlaywright()[engine].launch();
console.log(`fix a word on ${BASE_URL} (${engine})`);

/** The keys on screen: no screen-reader words, no struck (removed) key. */
const keys = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('.nl-speakbar__digits-end')?.cloneNode(true);
    c?.querySelectorAll('.nl-sr-only, .nl-keyfix-removed').forEach((n) => n.remove());
    return c?.textContent?.trim().replace(/\s+/g, ' ') ?? '';
  });
const sentence = (page) => page.evaluate(() => (document.querySelector('.nl-speakbar__text')?.innerText ?? '').split('\n')[0].trim());
const spoken = (page) => page.evaluate(() => window.__spoken ?? []);
const padBox = (page) => page.evaluate(() => JSON.stringify(document.querySelector('.nl-keypad').getBoundingClientRect()));
/** Type words with the keyboard, ignoring any word row (every key typed). */
async function typeWords(page, text) {
  const ws = text.split(' ');
  for (let i = 0; i < ws.length; i++) {
    if (i) await page.keyboard.press('Space');
    for (const d of enc(ws[i])) await page.keyboard.press(d);
  }
}
/** Sheet checks: targets, text, label in name. */
const sheetAudit = (page) =>
  page.evaluate(() => {
    const d = document.querySelector('dialog[open]');
    if (!d) return null;
    const vis = (e) => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
    const ctl = [...d.querySelectorAll('button, input, a[href]')].filter(vis);
    // A radio or checkbox is pressed through its label: measure the label.
    const target = (e) => ((e.type === 'radio' || e.type === 'checkbox') && e.closest('label') ? e.closest('label') : e);
    const small = ctl.filter((e) => target(e).getBoundingClientRect().height < 55.5 || target(e).getBoundingClientRect().width < 55.5).map((e) => target(e).textContent.trim() || e.outerHTML.slice(0, 60));
    const tiny = [...d.querySelectorAll('*')].filter((e) => vis(e) && !e.closest('.nl-sr-only') && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 15.5).map((e) => e.textContent.trim());
    const name = (e) => e.getAttribute('aria-label') ?? e.textContent.trim();
    const visText = (e) => {
      const c = e.cloneNode(true);
      c.querySelectorAll('[aria-hidden="true"], .nl-sr-only').forEach((n) => n.remove());
      return c.textContent.replace(/\s+/g, ' ').trim();
    };
    const badName = ctl.filter((e) => e.tagName === 'BUTTON' && visText(e) && !name(e).toLowerCase().startsWith(visText(e).toLowerCase().split(' ')[0])).map((e) => `${visText(e)} / ${name(e)}`);
    return { small, tiny, badName, title: d.querySelector('h2')?.textContent?.trim() ?? '' };
  });

try {
  // ---- phone, touch, Night and Day ------------------------------------------------------------------
  for (const theme of ['night', 'day']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: engine === 'chromium', reducedMotion: 'reduce', serviceWorkers: 'block' });
    await ctx.addInitScript((t) => localStorage.setItem('nl-theme', t), theme);
    await stubSpeech(ctx);
    const page = await ctx.newPage();
    await openApp(page);
    await page.locator('#keypad').focus();
    await typeWords(page, 'can you calm my daughter');
    await page.waitForTimeout(150);
    check(/calm my daughter/i.test(await sentence(page)), `(${theme}) the slip shows "${await sentence(page)}"`);
    const pad0 = await padBox(page);
    const btn = page.locator('button.nl-speakbar__fix').first();
    const bb = await btn.boundingBox();
    check(!!bb && bb.height >= 55.5, `(${theme}) 32.1 the sentence is a button at least 56px tall (${bb ? Math.round(bb.height) : 'none'})`);
    check(/\. Fix a word$/.test((await btn.getAttribute('aria-label')) ?? ''), `(${theme}) its name ends "Fix a word" (${await btn.getAttribute('aria-label')})`);
    await btn.tap();
    await page.locator('dialog[open]').waitFor({ timeout: 5000 });
    let a = await sheetAudit(page);
    check(a?.title === 'Fix a word', `(${theme}) the sheet "Fix a word" opens (${a?.title})`);
    check(a.small.length === 0 && a.tiny.length === 0 && a.badName.length === 0, `(${theme}) step 1: targets >= 56px (${a.small.join(', ') || 'ok'}), text >= 16px (${a.tiny.slice(0, 3).join(', ') || 'ok'}), label in name (${a.badName.join('; ') || 'ok'})`);
    await shot(page, `step1-${theme}`);
    await page.locator('dialog[open] button', { hasText: /^calm/i }).first().tap();
    await page.waitForTimeout(100);
    a = await sheetAudit(page);
    check(/Fix .calm./i.test(a?.title ?? ''), `(${theme}) step 2 "${a?.title}"`);
    check(a.small.length === 0 && a.tiny.length === 0 && a.badName.length === 0, `(${theme}) step 2: targets, text and names (${[...a.small, ...a.tiny, ...a.badName].slice(0, 4).join('; ') || 'ok'})`);
    const offers = await page.evaluate(() => {
      const h = [...document.querySelectorAll('dialog[open] h3')].find((e) => /one key away/i.test(e.textContent));
      const sec = h?.closest('section') ?? h?.parentElement;
      return sec ? [...sec.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') ?? b.textContent.trim()) : [];
    });
    check(offers.length >= 1 && offers.length <= 3 && offers.some((o) => /^call\b/i.test(o)), `(${theme}) 32.2 words one key away: ${offers.join(' | ')}`);
    await shot(page, `step2-${theme}`);
    await page.locator('dialog[open] button', { hasText: /^call/i }).first().tap();
    await page.waitForFunction(() => !document.querySelector('dialog[open]'), null, { timeout: 5000 });
    check(/^Can you call my daughter/.test(await sentence(page)), `(${theme}) AC 1 "${await sentence(page)}"`);
    check((await keys(page)) === '226 968 2255 69 32844837', `(${theme}) AC 1 keys ${await keys(page)}`);
    const box = await page.evaluate(() => {
      const e = document.querySelector('.nl-speakbar__digits .nl-keyfix');
      if (!e) return null;
      const cs = getComputedStyle(e);
      return { text: e.textContent, border: `${cs.borderTopStyle} ${cs.borderTopWidth}` };
    });
    check(!!box && box.text === '5' && /solid 2px/.test(box.border), `(${theme}) 32.5 the changed key is boxed (${JSON.stringify(box)})`);
    check(/key 4 changed from 6 to 5/.test(await page.evaluate(() => document.querySelector('.nl-speakbar__digits')?.textContent ?? '')), `(${theme}) 32.5 screen readers hear ", key 4 changed from 6 to 5"`);
    check((await padBox(page)) === pad0, `(${theme}) the keypad did not move`);
    check((await spoken(page)).length === 0, `(${theme}) 12.5 nothing spoken by the fix`);
    await shot(page, `fixed-${theme}`);
    await page.locator('.phone-actions button', { hasText: 'Speak' }).first().tap();
    await page.waitForTimeout(300);
    await closeShow(page);
    const said = (await spoken(page))[0] ?? '';
    const codes = (await keys(page)).split(' ');
    const ws = said.toLowerCase().replace(/[.,?!]/g, '').split(/\s+/);
    check(ws.length === codes.length && ws.every((w, i) => enc(w) === codes[i]), `(${theme}) AC 7 proof: "${said}" encodes to ${codes.join(' ')}`);

    // Did you mean.
    await page.locator('#keypad').focus();
    for (const d of '7532573') await page.keyboard.press(d); // "please" with an extra 5
    await page.waitForTimeout(200);
    const dym = await page.evaluate(() => {
      const h = [...document.querySelectorAll('h2, h3')].find((e) => e.textContent?.trim() === 'Did you mean' && !e.closest('dialog'));
      const sec = h?.closest('section');
      return sec ? [...sec.querySelectorAll('button')].map((b) => b.textContent.trim()) : null;
    });
    check(!!dym && dym.some((w) => /^please$/i.test(w)), `(${theme}) 32.4 Did you mean offers ${dym ? dym.join(', ') : 'nothing'}`);
    check((await keys(page)).endsWith('7532573'), `(${theme}) 32.4 nothing changes without a press (${await keys(page)})`);
    await shot(page, `dym-${theme}`);
    if (dym?.length) {
      await page.locator('section', { has: page.locator('h2, h3', { hasText: /^Did you mean$/ }) }).locator('button', { hasText: /^please$/i }).first().tap();
      await page.waitForTimeout(150);
      const struck = await page.evaluate(() => {
        const e = document.querySelector('.nl-speakbar__digits .nl-keyfix-removed');
        return e ? { text: e.textContent, deco: getComputedStyle(e).textDecorationLine } : null;
      });
      check((await keys(page)).endsWith('753273') && !!struck && struck.text === '5' && struck.deco.includes('line-through'), `(${theme}) AC 4 keys ${await keys(page)}, removed key ${JSON.stringify(struck)}`);
      await shot(page, `dym-taken-${theme}`);
      await page.locator('button[data-key="*"]').first().tap();
      await page.waitForTimeout(150);
      check((await keys(page)).endsWith('7532573'), `(${theme}) AC 6 Back restores the old keys (${await keys(page)})`);
    }
    check((await spoken(page)).length === 1, `(${theme}) 12.5 only the one Speak press spoke`);
    await ctx.close();
  }

  // ---- sizes: the sheet opens and closes, the keypad stays, short phones use Menu ---------------------
  for (const [w, h, sh] of [[375, 495, 667], [375, 549, 667], [390, 699, 844], [820, 1094, 1180], [1180, 734, 820], [1280, 800, 800]]) {
    const touch = w !== 1280;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, screen: { width: w, height: sh }, hasTouch: touch, isMobile: touch && engine === 'chromium', reducedMotion: 'reduce', serviceWorkers: 'block' });
    await stubSpeech(ctx);
    const page = await ctx.newPage();
    await openApp(page);
    await page.locator('#keypad').focus();
    await typeWords(page, 'can you calm my daughter');
    const pad0 = await padBox(page);
    const label = `${w}x${h}`;
    const fixBtn = page.locator('button.nl-speakbar__fix').first();
    const bb = (await fixBtn.count()) ? await fixBtn.boundingBox() : null;
    if (w === 1280) {
      const act = page.locator('[data-action="fix-word"], button', { hasText: /^Fix a word$/ }).first();
      check((await act.count()) > 0, `${label}: the laptop action row has Fix a word`);
      check(!bb || bb.height >= 55.5, `${label}: 32.1 the sentence button is at least 56px or absent (${bb ? Math.round(bb.height) : 'none'})`);
      await act.click();
    } else if (bb) {
      check(bb.height >= 55.5 && h >= 680, `${label}: 32.1 the sentence button is at least 56px (${Math.round(bb.height)}), shown from 680px tall`);
      await fixBtn.tap();
    } else {
      check(h < 680, `${label}: 32.1 under 680px the sentence is plain text (no button)`);
      await page.locator('.phone-actions button', { hasText: 'Menu' }).first().tap();
      const item = page.locator('dialog[open] button', { hasText: /^Fix a word$/ }).first();
      check((await item.count()) > 0, `${label}: AC 13 Menu > This sentence has Fix a word`);
      await item.tap();
    }
    await page.locator('dialog[open]').waitFor({ timeout: 5000 });
    const a = await sheetAudit(page);
    check(a?.title === 'Fix a word' && a.small.length === 0 && a.tiny.length === 0, `${label}: the sheet opens with full-size controls (${[...(a?.small ?? []), ...(a?.tiny ?? [])].join(', ') || 'ok'})`);
    await shot(page, `sheet-${label}`);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'), null, { timeout: 5000 });
    check((await padBox(page)) === pad0, `${label}: the keypad did not move`);
    if (touch) check((await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)) <= 1, `${label}: no page scroll`);
    if (h < 548) {
      await page.locator('#keypad').focus();
      await page.keyboard.press('Space');
      for (const d of '7532573') await page.keyboard.press(d);
      await page.locator('.phone-actions button', { hasText: 'Menu' }).first().tap();
      const g = await page.evaluate(() => {
        const h = [...document.querySelectorAll('dialog[open] h2, dialog[open] h3')].find((e) => e.textContent?.trim() === 'Did you mean');
        const sec = h?.closest('section') ?? h?.parentElement;
        return sec ? [...sec.querySelectorAll('button')].map((b) => b.textContent.trim()) : null;
      });
      check(!!g && g.length > 0, `${label}: AC 13 Menu has Did you mean (${g ? g.join(', ') : 'none'})`);
      await shot(page, `short-dym-${label}`);
    }
    await ctx.close();
  }

  // ---- keyboard ---------------------------------------------------------------------------------------
  {
    const ctx = await newContext(browser, { width: 1280, height: 800 });
    await stubSpeech(ctx);
    const page = await ctx.newPage();
    await openApp(page);
    await page.locator('#keypad').focus();
    await typeWords(page, 'can you calm my daughter');
    let n = 0;
    for (; n < 60; n++) {
      await page.keyboard.press(TAB);
      if (await page.evaluate(() => document.activeElement?.classList.contains('nl-speakbar__fix') || document.activeElement?.textContent?.trim() === 'Fix a word')) break;
    }
    check(n < 60, `keyboard: Tab reaches Fix a word (${n + 1} Tab presses)`);
    await page.keyboard.press('Enter');
    await page.locator('dialog[open]').waitFor({ timeout: 5000 });
    check(await page.evaluate(() => !!document.activeElement?.closest('dialog[open]')), 'keyboard: Enter opens the sheet with focus inside');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog[open]'), null, { timeout: 5000 });
    check(await page.evaluate(() => document.activeElement?.classList.contains('nl-speakbar__fix') || document.activeElement?.textContent?.trim() === 'Fix a word'), 'keyboard: Escape closes it and focus returns to the opener');
    await ctx.close();
  }

  // ---- two switches on a laptop: Fix a word, calm, call --------------------------------------------------
  {
    const ctx = await newContext(browser, { width: 1280, height: 900 });
    await stubSpeech(ctx);
    const page = await ctx.newPage();
    await openApp(page);
    await page.locator('#keypad').focus();
    await typeWords(page, 'can you calm my daughter');
    await page.getByRole('button', { name: /^settings$/i }).first().click();
    await page.getByRole('radio', { name: /two switches/i }).check();
    await page.keyboard.press('Escape');
    await waitFor(page, () => !document.querySelector('dialog[open]'), null, { what: 'Settings to close' });
    let last = 0;
    let presses = 0;
    const press = async (k) => {
      const wait = last + 250 - Date.now();
      if (wait > 0) await page.waitForTimeout(wait);
      await page.keyboard.press(k);
      last = Date.now();
      presses += 1;
    };
    /** Space until fn holds (at most 40), then Enter. */
    const stepTo = async (fn, what) => {
      for (let i = 0; i < 40 && !(await page.evaluate(fn)); i++) await press('Space');
      const ok = await page.evaluate(fn);
      check(ok, `switch: reached ${what}`);
      if (ok) await press('Enter');
      await page.waitForTimeout(120);
      return ok;
    };
    await stepTo(() => [...document.querySelectorAll('.is-scanning')].some((e) => e.querySelector('[data-action="fix-word"]') || /Fix a word/.test(e.textContent ?? '')), 'the action row with Fix a word');
    await stepTo(() => { const e = document.querySelector('.is-lit'); return !!e && (e.getAttribute('data-action') === 'fix' || /^Fix a word$/.test(e.textContent?.trim() ?? '')); }, 'Fix a word lit');
    await page.locator('dialog[open]').waitFor({ timeout: 5000 });
    await stepTo(() => [...document.querySelectorAll('dialog[open] [data-scan-state="row"]')].some((r) => /calm/i.test(r.textContent ?? '')), 'the row with calm');
    await stepTo(() => /^calm/i.test(document.querySelector('dialog[open] [data-scan-state="lit"]')?.textContent?.trim() ?? ''), 'calm lit');
    await stepTo(() => [...document.querySelectorAll('dialog[open] [data-scan-state="row"]')].some((r) => /call/i.test(r.textContent ?? '')), 'the row with call');
    await stepTo(() => /^call/i.test(document.querySelector('dialog[open] [data-scan-state="lit"]')?.textContent?.trim() ?? ''), 'call lit');
    await page.waitForTimeout(200);
    check((await keys(page)) === '226 968 2255 69 32844837', `AC 9 by two switches: ${await keys(page)} in ${presses} presses`);
    check((await spoken(page)).length === 0, 'switch: nothing spoken');
    await ctx.close();
  }
} finally {
  await browser.close();
}
done('fix');
