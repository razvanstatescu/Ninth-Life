// Improvement plan Part 1, "Bugs" (web-ui Req 30), end to end in a real browser:
//   - model ranking (turned on in Settings; /api/decode answered by a stub here) is asked again after #
//     pins a word and after a chosen sentence, with each pinned word as a one-word slot;
//   - nothing is sent while the last word is open and keys keep coming; a closed word is ranked after the
//     short debounce; an open word left alone for about a second is ranked too;
//   - the 17th key of a word and the 21st word are refused and announced;
//   - a quick repeat tap on the same key (the accept delay) is not counted, the key is marked and the first
//     one is announced; nothing is ever spoken without a Speak press.
//   node packages/web/test/e2e/plan-bugs.mjs   (BASE_URL, default http://localhost:3202)
import { BASE_URL, check, done, loadPlaywright, newContext, openApp, stubSpeech, waitFor, settingsGroup } from './lib.mjs';

const browser = await loadPlaywright().chromium.launch();
console.log(`plan bugs on ${BASE_URL}`);

const announced = (page) => page.evaluate(() => document.querySelector('p.nl-sr-only[role="status"]')?.textContent ?? '');
const keyLine = (page) => page.evaluate(() => { const c = document.querySelector('.nl-speakbar__digits-end')?.cloneNode(true); c?.querySelectorAll('.nl-sr-only').forEach((n) => n.remove()); return c?.textContent ?? ''; });
const spoken = (page) => page.evaluate(() => window.__spoken ?? []);

/** Turn Model ranking on in Settings, as a person would (Settings, or Menu then Settings). */
async function modelRankingOn(page) {
  const settings = page.getByRole('button', { name: /^settings$/i }).first();
  if (await settings.isVisible().catch(() => false)) await settings.click();
  else {
    await page.locator('.phone-actions button', { hasText: 'Menu' }).first().click();
    await page.locator('dialog[open] button', { hasText: 'Settings' }).first().click();
  }
  await settingsGroup(page, 'Model ranking');
  const sw = page.getByRole('switch', { name: 'Model ranking' });
  await sw.waitFor({ timeout: 5000 });
  if (!(await sw.isChecked())) await sw.click();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'), null, { timeout: 5000 });
}

try {
  // ---- model ranking: pins and timing (laptop, keyboard) --------------------------------------
  {
    const ctx = await newContext(browser, { width: 1280, height: 800 });
    await stubSpeech(ctx);
    const page = await ctx.newPage();
    const bodies = [];
    await page.route('**/api/decode', async (route) => {
      const body = JSON.parse(route.request().postData() ?? '{}');
      bodies.push({ ...body, at: Date.now() });
      // Echo the first beam (always valid) so the screen has a model answer to merge.
      const words = body.beams?.[0] ?? body.lattice.map((s) => s[0]);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ v: 1, candidates: [{ words }], rejected: 0 }) });
    });
    await openApp(page);
    await modelRankingOn(page);
    await page.locator('#keypad').focus();

    // Keys keep coming on an open word: nothing is sent.
    for (const k of '4063330928') {
      await page.keyboard.press(k);
      await page.waitForTimeout(250);
    }
    await page.keyboard.press('3');
    await page.waitForTimeout(600);
    check(bodies.length === 0, `30.2 nothing is sent while the last word is open and keys keep coming (${bodies.length} request(s))`);

    // Left alone, the open word is ranked after about a second.
    const t0 = Date.now();
    await page.keyboard.press('7');
    await page.waitForTimeout(1400);
    const idle = bodies.find((b) => b.codes.join(' ') === '4 6333 92837');
    check(!!idle && idle.at - t0 >= 850, `30.2 an open last word left alone is ranked after about 1,000 ms (${idle ? idle.at - t0 + ' ms' : 'no request'})`);

    // Space closes it; # pins the last word; a request with that word as a one-word slot follows.
    await page.keyboard.press('Space');
    await page.waitForTimeout(700);
    const n0 = bodies.length;
    await page.keyboard.press('#');
    await page.waitForTimeout(900);
    const pinned = bodies.slice(n0).at(-1);
    check(!!pinned && pinned.lattice.length === 3 && pinned.lattice[2].length === 1, `30.1 after #, ranking is asked again with the pinned word alone (${pinned ? JSON.stringify(pinned.lattice[2]) : 'no request'})`);
    const shownWord = await page.evaluate(() => document.querySelector('.nl-speakbar__text')?.textContent ?? '');
    check(!!pinned && shownWord.toLowerCase().includes(pinned.lattice[2][0]), `the pinned word stays on show ("${shownWord.split(/\d/)[0].trim()}")`);

    // A chosen sentence, then typing on: the chosen words go as one-word slots.
    await page.keyboard.press('Alt+2');
    await page.waitForTimeout(100);
    const chosen = await page.evaluate(() => (document.querySelector('.nl-speakbar__text')?.textContent ?? '').split(/\d/)[0].trim());
    const n1 = bodies.length;
    for (const k of '8664') await page.keyboard.press(k); // a 4th word ("town")
    await page.keyboard.press('Space');
    await page.waitForTimeout(900);
    const after = bodies.slice(n1).find((b) => b.codes.length === 4);
    check(!!after && after.lattice.slice(0, 3).every((s) => s.length === 1), `30.1 after a chosen sentence ("${chosen}") and a new word, the 3 chosen words go as one-word slots (${after ? JSON.stringify(after.lattice.slice(0, 3)) : 'no request'})`);
    check((await spoken(page)).length === 0, '12.5 nothing was spoken without a Speak press');
    await ctx.close();
  }

  // ---- limits (laptop, keyboard) --------------------------------------------------------------
  {
    const ctx = await newContext(browser, { width: 1280, height: 800 });
    await stubSpeech(ctx);
    const page = await ctx.newPage();
    await openApp(page);
    await page.locator('#keypad').focus();
    for (const k of '2323232323232323') await page.keyboard.press(k);
    await page.waitForTimeout(100);
    const a0 = await announced(page);
    await page.keyboard.press('4');
    await waitFor(page, (a) => ((t) => t !== '' && t !== a)(document.querySelector('p.nl-sr-only[role="status"]')?.textContent ?? ''), a0, { what: 'an announcement for the 17th key' }).catch(() => {});
    const a1 = await announced(page);
    check(/16/.test(a1), `30.3 the 17th key is refused and announced ("${a1}")`);
    check(!(await keyLine(page)).includes('23232323232323234'), 'the 17th key was not added');
    await page.keyboard.press('Space');
    for (let i = 0; i < 19; i++) {
      await page.keyboard.press('4');
      await page.keyboard.press('Space');
    }
    await page.waitForTimeout(100);
    const b0 = await announced(page);
    await page.keyboard.press('6');
    await waitFor(page, (a) => /20/.test(document.querySelector('p.nl-sr-only[role="status"]')?.textContent ?? ''), b0, { what: 'an announcement for the 21st word' }).catch(() => {});
    const b1 = await announced(page);
    check(/20/.test(b1), `30.3 the 21st word is refused and announced ("${b1}")`);
    const words = (await keyLine(page)).trim().split(/\s+/).filter(Boolean);
    check(words.length === 20 && !words.includes('6'), `no 21st word was added (${words.length} words on the key line)`);
    check((await spoken(page)).length === 0, '12.5 nothing was spoken');
    await ctx.close();
  }

  // ---- the ignored quick repeat (phone, touch) ------------------------------------------------
  for (const theme of ['night', 'day']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await ctx.addInitScript((t) => localStorage.setItem('nl-theme', t), theme);
    await stubSpeech(ctx);
    const page = await ctx.newPage();
    await openApp(page);
    const key = page.locator('button[data-key="4"]').first();
    const box = await key.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.touchscreen.tap(cx, cy);
    await page.touchscreen.tap(cx, cy); // well inside the 150 ms accept delay
    await page.waitForTimeout(60);
    const marked = await key.evaluate((el) => el.hasAttribute('data-ignored') || el.classList.contains('is-ignored'));
    const lineAfter = await keyLine(page);
    check(marked, `30.4 (${theme}) the key shows that the quick repeat was not counted`);
    check(!lineAfter.includes('44'), `7.2 (${theme}) the repeat was not typed (key line "${lineAfter.trim()}")`);
    if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/plan-bugs-ignored-${theme}.png` });
    // Visible: the mark draws something other than the plain key.
    const look = await key.evaluate((el) => {
      const cs = getComputedStyle(el);
      const before = getComputedStyle(el, '::before');
      const after = getComputedStyle(el, '::after');
      return [cs.outlineStyle, cs.boxShadow, cs.borderStyle, before.content, before.borderStyle, after.content, after.borderStyle].join('|');
    });
    const a = await announced(page);
    check(/not counted|too quickly/i.test(a), `30.4 (${theme}) the first ignored press is announced ("${a}")`);
    await page.waitForTimeout(900);
    const cleared = await key.evaluate((el) => !el.hasAttribute('data-ignored') && !el.classList.contains('is-ignored'));
    const look2 = await key.evaluate((el) => {
      const cs = getComputedStyle(el);
      const before = getComputedStyle(el, '::before');
      const after = getComputedStyle(el, '::after');
      return [cs.outlineStyle, cs.boxShadow, cs.borderStyle, before.content, before.borderStyle, after.content, after.borderStyle].join('|');
    });
    check(cleared && look !== look2, `30.4 (${theme}) the mark is drawn, then goes after a moment`);
    // A slow second tap is typed.
    await page.touchscreen.tap(cx, cy);
    await page.waitForTimeout(100);
    check((await keyLine(page)).includes('44'), `(${theme}) a repeat after the delay is typed`);
    check((await spoken(page)).length === 0, `12.5 (${theme}) nothing was spoken`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
done('plan-bugs');
