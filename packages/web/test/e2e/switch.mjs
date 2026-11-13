// Single-switch walkthrough: Space is the switch. Turn on one-switch scanning in Settings, then
// type "hi" (4 4) by row/column scanning only: wait for the keypad row, press, wait for the key,
// press. No other key and no pointer is used once scanning is on. Then the conversation (web-ui Req 27.10):
// Speak "hi" by scanning, reach the thread row, open the newest turn, and choose its Say again. Then quick
// replies (web-ui Req 28.6): on a phone, scan to "Yes." with one switch and with two, and it is spoken once;
// on a short phone the row is skipped and Menu > Quick replies works by switch. Then reply types (web-ui
// Req 29.7): after their line, Ask is a cell of the same row, after the replies, and two switches press it.
//   node packages/web/test/e2e/switch.mjs     (needs `next start`; BASE_URL, default :3202)
import { BASE_URL, addTheirLine, check, done, loadPlaywright, newContext, openApp, recordSpeech, stubSpeech, waitFor } from './lib.mjs';

const TARGET = { row: 1, key: '4' }; // key 4 (G H I) is row 1, cell 0 of the keypad

// ENGINE=webkit runs it in Safari's engine.
const engine = process.env.ENGINE ?? 'chromium';
const browser = await loadPlaywright()[engine].launch();
console.log(`single-switch walkthrough on ${BASE_URL} (${engine})`);
try {
  const ctx = await newContext(browser, { width: 1280, height: 900 });
  await recordSpeech(ctx);
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

  // Web-ui Req 27.10: Speak by scanning (a "you said" turn), then the thread row after the header.
  const lit = (sel) => waitFor(page, (s) => !!document.querySelector(s), sel, { timeout: 30000, what: sel });
  await lit('.speak-group.is-scanning');
  await sw();
  await lit('[data-action="speak"].is-lit');
  await sw();
  await waitFor(page, () => /^You: Hi/i.test(document.querySelector('.thread-row')?.getAttribute('aria-label') ?? ''), null, { what: 'the spoken turn in the panel' });
  await lit('.thread-panel.is-scanning');
  check(true, '27.10 the scan reached the thread row');
  await sw();
  await lit('.thread-row.is-lit');
  await sw();
  await lit('dialog[data-overlay="conversation"][open]');
  await lit('[data-scan-row^="turn-"][data-scan-state="row"]');
  await sw();
  await waitFor(page, () => document.querySelector('[data-scan-state="lit"]')?.textContent?.trim() === 'Say again', null, { timeout: 30000, what: 'Say again lit' });
  const before = await page.evaluate(() => window.__spoken.length);
  await sw();
  await page.waitForTimeout(200);
  const again = await page.evaluate((n) => ({ spoken: window.__spoken.slice(n).join(' '), shown: document.querySelector('dialog.show[open]')?.textContent ?? '' }), before);
  check(/hi/i.test(again.spoken) || /hi/i.test(again.shown), `27.10 one switch chose the turn's Say again ("${again.spoken || again.shown}")`);
  await ctx.close();

  // Web-ui Req 28.6: the quick replies are scan row 4 on phones.
  for (const [label, width, height, access] of [
    ['phone, one switch', 390, 844, 'one switch'],
    ['phone, two switches', 390, 844, 'two switches'],
    ['short phone, one switch', 375, 495, 'one switch'],
  ]) {
    console.log(label);
    const c = await newContext(browser, { width, height });
    await stubSpeech(c);
    const p = await c.newPage();
    await openApp(p);
    await p.getByRole('button', { name: /^menu$/i }).first().click();
    await p.getByRole('button', { name: /^settings$/i }).first().click();
    await p.getByRole('radio', { name: new RegExp(access, 'i') }).check();
    await p.keyboard.press('Escape');
    await waitFor(p, () => !document.querySelector('dialog[open]'), null, { what: 'Settings to close' });
    const two = access === 'two switches';
    let lastAt = 0;
    const press = async (key) => {
      const wait = lastAt + ACCEPT_GAP_MS - Date.now();
      if (wait > 0) await p.waitForTimeout(wait);
      await p.keyboard.press(key);
      lastAt = Date.now();
    };
    const pick = () => press('Enter'); // selects with one switch and with two
    /** One switch: wait for the highlight. Two switches: Space moves it there. */
    const reach = async (fn, arg, what) => {
      for (let i = 0; i < 30 && two && !(await p.evaluate(fn, arg)); i++) await press('Space');
      await waitFor(p, fn, arg, { timeout: 30000, what });
    };
    const spoken = () => p.evaluate(() => window.__spoken.slice());
    if (height >= 548) {
      await press(two ? 'Space' : 'Enter'); // start
      await reach(() => !!document.querySelector('.quick-replies.is-scanning'), null, 'the quick replies row');
      const before = await p.evaluate(() => [...document.querySelectorAll('.nl-keypad__row')].some((r) => r.classList.contains('is-scanning')));
      check(!before, '28.6 the replies are their own scan row, after the keypad rows');
      await pick();
      await reach(() => document.querySelector('.quick-reply.is-lit')?.textContent === 'Yes.', null, '"Yes." lit');
      await pick();
      await p.waitForTimeout(300);
      const said = await spoken();
      check(said.length === 1 && said[0] === 'Yes.', `28.2 ${access} chose "Yes." and it was spoken once (${JSON.stringify(said)})`);
    } else {
      check((await p.locator('.quick-replies--area').count()) === 0, '28.4 a short phone has no replies row to scan');
      await press('Enter'); // start
      await waitFor(p, () => document.querySelectorAll('.nl-keypad__row')[3]?.classList.contains('is-scanning'), null, { timeout: 30000, what: 'keypad row 3' });
      await waitFor(p, () => !document.querySelectorAll('.nl-keypad__row')[3]?.classList.contains('is-scanning'), null, { timeout: 30000, what: 'the next row' });
      const next = await p.evaluate(() => document.querySelector('.is-scanning')?.getAttribute('data-section') ?? document.querySelector('.is-scanning')?.className);
      check(next === 'actions', `24.9 28.6 after the keypad rows the scan went straight to the action bar (${next})`);
      await pick();
      await waitFor(p, () => document.querySelector('[data-section="actions"] .nl-btn.is-lit')?.textContent?.trim() === 'Menu', null, { timeout: 30000, what: 'Menu lit' });
      await pick();
      await waitFor(p, () => document.querySelector('[data-scan-row="quick-replies"][data-scan-state="row"]'), null, { timeout: 30000, what: 'Menu > Quick replies row' });
      await pick();
      await waitFor(p, () => document.querySelector('[data-scan-state="lit"]')?.textContent?.trim() === 'Yes.', null, { timeout: 30000, what: '"Yes." lit in Menu' });
      await pick();
      await p.waitForTimeout(300);
      const said = await spoken();
      const menuOpen = await p.evaluate(() => !!document.querySelector('dialog[data-overlay="menu"][open]'));
      check(said.length === 1 && said[0] === 'Yes.' && !menuOpen, `28.4 Menu > Quick replies > "Yes." by switch spoke once and closed the Menu (${JSON.stringify(said)})`);
    }
    await c.close();
  }

  // Web-ui Req 29.7: on a 2-row phone the reply types are cells 4-6 of the area's scan row.
  {
    console.log('phone, two switches, reply type');
    const c = await newContext(browser, { width: 390, height: 844 });
    await stubSpeech(c);
    const p = await c.newPage();
    await openApp(p);
    await addTheirLine(p, 'Are you coming to the party tonight?');
    await p.getByRole('button', { name: /^menu$/i }).first().click();
    await p.getByRole('button', { name: /^settings$/i }).first().click();
    await p.getByRole('radio', { name: /two switches/i }).check();
    await p.keyboard.press('Escape');
    await waitFor(p, () => !document.querySelector('dialog[open]'), null, { what: 'Settings to close' });
    let lastAt = 0;
    let n = 0;
    const press = async (key) => {
      const wait = lastAt + ACCEPT_GAP_MS - Date.now();
      if (wait > 0) await p.waitForTimeout(wait);
      await p.keyboard.press(key);
      lastAt = Date.now();
      n += 1;
    };
    for (let i = 0; i < 30 && !(await p.evaluate(() => !!document.querySelector('.quick-replies.is-scanning'))); i++) await press('Space');
    await press('Enter');
    for (let i = 0; i < 10 && !(await p.evaluate(() => document.querySelector('.reply-type.is-lit')?.textContent === 'Ask')); i++) await press('Space');
    const order = await p.evaluate(() => [...document.querySelectorAll('[data-section="cands"] .quick-reply, [data-section="cands"] .reply-type')].map((b) => b.textContent));
    await press('Enter');
    await p.waitForTimeout(150);
    const ask = await p.evaluate(() => document.querySelector('[data-section="cands"] [data-intent="ask"]')?.getAttribute('aria-pressed'));
    const said = await p.evaluate(() => window.__spoken.slice());
    check(order.join(' ') === 'Hold on. Yes. No. Agree Disagree Ask', `29.7 the reply types follow the replies in the scan row (${order.join(', ')})`);
    check(ask === 'true' && said.length === 0, `29.7 two switches pressed Ask in ${n} presses, and nothing was spoken`);
    check(n <= 5 + 1 + 5 + 1, `29.7 Ask is reached within the bound (${n} <= 12: 5 rows, 1 select, 5 cells, 1 select)`);
    await c.close();
  }
} finally {
  await browser.close();
}
done('switch');
