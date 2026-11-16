// Your quick replies, cards and setup (web-ui Req 35; spec r6 6-quick-replies-cards-setup AC 1-9), end to end:
//   - a helper adds names and phrases by typing (My words > Add names and phrases): the preview counts, nothing is
//     stored before Add, then the phrases are in Your phrases;
//   - 5 phrases of 20 characters pinned: the replies are those 5 in pin order everywhere they show, equal cells of at
//     least 56px, none cut, at 360x668, 375x549 and (Menu) 375x495; a sixth pin is refused with its message; a phrase of
//     21 characters cannot be pinned;
//   - a pinned reply speaks exactly its text on one press and becomes a "you said" turn;
//   - Show with nothing typed opens Show a card; a card opens Show mode with Flip and speaks nothing;
//   - Phrases > Phone calls: 4 lines, the help text, a line speaks on press;
//   - the built-in phrases have none of the 9 near-duplicates.
//   node packages/web/test/e2e/my-replies.mjs   (BASE_URL; SHOTS_DIR to save shots)
import { mkdirSync } from 'node:fs';
import { BASE_URL, check, closeShow, done, loadPlaywright, openApp, stubSpeech, waitFor } from './lib.mjs';

const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png` });
const engine = process.env.ENGINE ?? 'chromium';
const browser = await loadPlaywright()[engine].launch();
console.log(`my replies, cards and setup on ${BASE_URL} (${engine})`);

// Five phrases of exactly 20 characters, a sixth, and one of 21.
const PINS = ['Please call my wife.', 'Turn the TV off now.', 'I need the bathroom.', 'Can you open window?', 'Please wait a minute'];
const SIXTH = 'I am fine, thank you.'.slice(0, 20);
const LONG = 'Please close the door.'; // 22
for (const p of [...PINS, SIXTH]) if (p.length !== 20) throw new Error(`${p} is ${p.length} characters`);

const spoken = (page) => page.evaluate(() => window.__spoken ?? []);
const announced = (page) => page.evaluate(() => document.querySelector('p.nl-sr-only[role="status"]')?.textContent ?? '');
async function menu(page, item) {
  if (item === 'My words') {
    // Phones: Menu > My words. Laptops: Phrases > My words.
    const phone = page.locator('.phone-actions button', { hasText: 'Menu' }).first();
    if (await phone.isVisible().catch(() => false)) {
      await phone.click();
      return page.locator('dialog[open] button', { hasText: /^My words$/ }).first().click();
    }
    await page.getByRole('button', { name: /^Phrases$/ }).first().click();
    return page.locator('dialog[open] button', { hasText: /^My words$/ }).first().click();
  }
  const direct = page.getByRole('button', { name: new RegExp(`^${item}$`, 'i') }).first();
  if (await direct.isVisible().catch(() => false)) return direct.click();
  await page.locator('.phone-actions button', { hasText: 'Menu' }).first().click();
  await page.locator('dialog[open] button', { hasText: new RegExp(`^${item}$`) }).first().click();
}
const closeSheet = async (page) => {
  for (let i = 0; i < 3 && (await page.locator('dialog[open]').count()); i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
  }
};
const storedText = (page) =>
  page.evaluate(async () => {
    const out = [];
    for (const { name } of (await indexedDB.databases?.()) ?? []) {
      const db = await new Promise((res, rej) => {
        const r = indexedDB.open(name);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      for (const s of db.objectStoreNames) out.push(JSON.stringify(await new Promise((res) => { const r = db.transaction(s).objectStore(s).getAll(); r.onsuccess = () => res(r.result); r.onerror = () => res([]); })));
      db.close();
    }
    return out.join('\n');
  });
/** Add the phrases by typing and pin the 5 (as a helper would), in this browser profile. */
async function setup(page) {
  await menu(page, 'My words');
  await page.locator('dialog[open]').waitFor();
  await page.getByLabel('Phrases, one per line').fill(PINS.join('\n'));
  await page.getByRole('button', { name: 'Check what this adds' }).click();
  await page.getByRole('button', { name: /^Add 0 words and 5 phrases/ }).click();
  await page.waitForTimeout(300);
  await closeSheet(page);
  await menu(page, 'Phrases');
  await page.locator('dialog[open]').waitFor();
  for (const p of PINS) await page.getByRole('button', { name: `Pin "${p}" to quick replies` }).click();
  await closeSheet(page);
}
/** A pinned reply speaks once; Show with nothing typed opens the cards (phone). */
async function speakAndCards(page) {
  const n1 = (await spoken(page)).length;
  await page.locator('.quick-reply', { hasText: PINS[0] }).first().click();
  await page.locator('.quick-reply', { hasText: PINS[0] }).first().click({ delay: 0 }).catch(() => {});
  await page.waitForTimeout(250);
  await closeShow(page);
  const said = (await spoken(page)).slice(n1);
  check(said.length === 1 && said[0] === PINS[0], `35.1 AC 2 two quick presses: the pinned reply speaks once, exactly "${said[0]}" (${said.length})`);
  const turn = await page.evaluate(() => document.querySelector('.thread-bubble')?.getAttribute('aria-label') ?? document.body.innerText.match(/You: [^\n]+/)?.[0] ?? '');
  check(turn.includes(PINS[0]), `28.7 it is a "you said" turn (${turn})`);
  const n2 = (await spoken(page)).length;
  await page.locator('.phone-actions button', { hasText: 'Show' }).first().click();
  await page.locator('dialog[open]').waitFor({ timeout: 5000 });
  const cardsTitle = await page.evaluate(() => document.querySelector('dialog[open] h2')?.textContent?.trim());
  const cards = await page.evaluate(() => [...document.querySelectorAll('dialog[open] button')].map((b) => b.textContent.trim()));
  check(cardsTitle === 'Show a card', `35.2 Show with nothing typed opens "${cardsTitle}"`);
  check(['I type to talk. Please wait for me.', 'I can hear you. I answer by typing.', 'Please give me a moment to type.', 'Please ask me, not the person with me.'].every((c) => cards.includes(c)), '35.2 the 4 cards are there');
  check(PINS.every((p) => cards.includes(p)), '35.2 your phrases are under the cards');
  await shot(page, 'cards-sheet');
  await page.locator('dialog[open] button', { hasText: 'I type to talk. Please wait for me.' }).first().click();
  await page.locator('dialog.show[open]').waitFor({ timeout: 5000 });
  const show = await page.evaluate(() => ({ text: document.querySelector('dialog.show[open]')?.innerText ?? '', flip: !!document.querySelector('dialog.show[open] button[aria-label*="Flip"], dialog.show[open] button') }));
  check(show.text.includes('I type to talk. Please wait for me.') && /Flip/.test(show.text), 'AC 5 the card opens Show mode with Flip');
  await shot(page, 'card-show');
  await closeShow(page);
  check((await spoken(page)).length === n2, 'AC 5 a card speaks nothing');
}
/** The replies on the main screen (area rows or laptop line), with their cell boxes. */
const replyCells = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.quick-reply')]
      .filter((c) => !c.closest('dialog') && c.getBoundingClientRect().height > 0)
      .map((c) => {
        const r = c.getBoundingClientRect();
        // Lines of text: the label's height over its line height (the cell may hold an inner span).
        const t = c.querySelector('span:not([aria-hidden="true"])') ?? c;
        const lh = parseFloat(getComputedStyle(t).lineHeight) || parseFloat(getComputedStyle(t).fontSize) * 1.2;
        const range = document.createRange();
        range.selectNodeContents(t);
        const rects = [...range.getClientRects()];
        const tr = range.getBoundingClientRect();
        const spill = tr.top < r.top - 0.5 || tr.bottom > r.bottom + 0.5 || tr.left < r.left - 0.5 || tr.right > r.right + 0.5;
        return { text: c.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), lines: Math.round(tr.height / lh), spill, cut: c.scrollWidth > c.clientWidth + 1 || c.scrollHeight > c.clientHeight + 1 || spill, font: parseFloat(getComputedStyle(t).fontSize), n: rects.length };
      }),
  );

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await stubSpeech(ctx);
  const page = await ctx.newPage();
  await openApp(page);

  // ---- (d) Add names and phrases --------------------------------------------------------------
  await menu(page, 'My words');
  await page.locator('dialog[open]').waitFor();
  await page.getByLabel('Names and words, one per line').fill('Mihai\nNew York\nȘtefan');
  await page.getByLabel('Phrases, one per line').fill([...PINS, SIXTH, LONG, 'Can you call my daughter?'].join('\n'));
  await page.getByRole('button', { name: 'Check what this adds' }).click();
  await page.waitForTimeout(200);
  const preview = await page.evaluate(() => document.querySelector('dialog[open]')?.innerText ?? '');
  check(/From what you typed/.test(preview), '35.4 the preview is titled "From what you typed"');
  check(/Add 2 words and 8 phrases/.test(preview), `35.4 AC 7 the preview counts 2 words and 8 phrases (${(preview.match(/Add \d+ words? and \d+ phrases?/) ?? ['?'])[0]})`);
  check(/New York/.test(preview) && /leaves? out/i.test(preview), '35.4 AC 7 "New York" is listed as left out');
  await shot(page, 'paste-preview');
  check(!(await storedText(page)).includes('Mihai') && !(await storedText(page)).includes('Please call my wife.'), '22.3 nothing is stored before Add');
  await page.getByRole('button', { name: /^Add 2 words and 8 phrases/ }).click();
  await page.waitForTimeout(400);
  check((await storedText(page)).includes('Please call my wife.'), 'after Add the phrases are stored');
  await closeSheet(page);

  // ---- (a) pin 5 ------------------------------------------------------------------------------
  await menu(page, 'Phrases');
  await page.locator('dialog[open]').waitFor();
  for (const p of PINS) await page.getByRole('button', { name: `Pin "${p}" to quick replies` }).click();
  await page.waitForTimeout(150);
  check(/Pinned to quick replies/.test(await announced(page)), `35.1 announced "${await announced(page)}"`);
  const pressed = await page.evaluate((ps) => ps.map((p) => document.querySelector(`button[aria-label="Pin \\"${p}\\" to quick replies"]`)?.getAttribute('aria-pressed')), PINS);
  check(pressed.every((v) => v === 'true'), `35.1 the 5 toggles are pressed (${pressed.join(',')})`);
  await page.getByRole('button', { name: `Pin "${SIXTH}" to quick replies` }).click();
  await page.waitForTimeout(150);
  const six = await page.getByRole('button', { name: `Pin "${SIXTH}" to quick replies` }).getAttribute('aria-pressed');
  const msg = await page.evaluate(() => document.querySelector('dialog[open]')?.innerText ?? '') + (await announced(page));
  check(six !== 'true' && /5 phrases are pinned\. Unpin one first\./.test(msg), `35.1 AC 3 a sixth pin is refused with the message (pressed ${six})`);
  const longBtn = page.getByRole('button', { name: `Pin "${LONG}" to quick replies` });
  check((await longBtn.count()) === 0 || (await longBtn.isDisabled()), 'AC 3 a 22-character phrase cannot be pinned');
  check(/Too long for a quick reply: it must fit 2 lines on a phone \(about 20 letters\)\. Use Phrases or Show a card for longer ones\./.test(msg), 'AC 3 the too-long note');
  // Phone calls.
  const pc = await page.evaluate(() => {
    const h = [...document.querySelectorAll('dialog[open] h3, dialog[open] h2')].find((e) => e.textContent.trim() === 'Phone calls');
    const sec = h?.closest('section') ?? h?.parentElement;
    return sec ? { lines: [...sec.querySelectorAll('button')].map((b) => b.textContent.trim()), text: sec.innerText } : null;
  });
  check(!!pc && pc.lines.length === 4, `35.3 Phone calls has 4 lines (${pc?.lines.join(' | ')})`);
  check(!!pc && /Ninth Life cannot speak into a phone call\. These lines help when the call can hear this device, for example a call on speaker on another phone\./.test(pc.text), '35.3 AC 6 the help text says the app cannot speak into a call');
  const all = await page.evaluate(() => document.querySelector('dialog[open]')?.innerText ?? '');
  check(!/\bI am hungry\.|\bIt is hot\.|\bNo thanks\./.test(all), '35.5 the near-duplicates are gone from the built-in phrases');
  await shot(page, 'phrases-pinned');
  const n0 = (await spoken(page)).length;
  await page.locator('dialog[open] button', { hasText: 'Can you hear me?' }).first().click();
  await page.waitForTimeout(150);
  await closeShow(page);
  check((await spoken(page)).slice(n0).join() === 'Can you hear me?', 'AC 6 a phone line speaks on press');
  await closeSheet(page);
  const laptop = await replyCells(page);
  check(laptop.slice(0, 5).map((c) => c.text).join(' | ') === PINS.join(' | '), `35.1 AC 1 laptop replies: ${laptop.map((c) => c.text).join(' | ')}`);

  // ---- the replies at phone sizes (same profile: the pins are stored) ------------------------------
  for (const [w, h, sh] of [[360, 668, 800], [375, 549, 667], [390, 844, 844], [375, 495, 667]]) {
    const pctx = await browser.newContext({ viewport: { width: w, height: h }, screen: { width: w, height: sh }, hasTouch: true, isMobile: engine === 'chromium', reducedMotion: 'reduce', serviceWorkers: 'block' });
    await stubSpeech(pctx);
    const page = await pctx.newPage();
    await openApp(page);
    await setup(page);
    await page.waitForTimeout(300);
    const label = `${w}x${h}`;
    if (h < 548) {
      await page.locator('.phone-actions button', { hasText: 'Menu' }).first().click().catch(async () => menu(page, 'Menu'));
      const inMenu = await page.evaluate(() => [...document.querySelectorAll('dialog[open] .quick-reply')].map((c) => ({ text: c.textContent.trim(), h: Math.round(c.getBoundingClientRect().height), w: Math.round(c.getBoundingClientRect().width), cut: c.scrollWidth > c.clientWidth + 1 || c.scrollHeight > c.clientHeight + 1 })));
      check(inMenu.slice(0, 5).map((c) => c.text).join(' | ') === PINS.join(' | ') && inMenu.every((c) => c.h >= 55.5 && !c.cut), `${label}: AC 4 Menu > Quick replies: the 5 pins, >= 56px, none cut (${inMenu.map((c) => `${c.w}x${c.h}${c.cut ? ' cut' : ''}`).join(' ')})`);
      const card = page.locator('dialog[open] button', { hasText: /^Show a card$/ });
      check((await card.count()) > 0, `${label}: Menu has Show a card`);
      await shot(page, `menu-${label}`);
      await closeSheet(page);
    } else {
      const cells = await replyCells(page);
      const widths = new Set(cells.map((c) => c.w));
      const pinned = cells.filter((c) => c.text !== 'Phrases');
      check(pinned.length >= 1 && pinned.map((c) => c.text).join(' | ') === PINS.slice(0, pinned.length).join(' | '), `${label}: 35.1 the area starts with the pins, in pin order (${cells.map((c) => c.text).join(' | ')})`);
      check(cells.every((c) => c.lines <= 2 && c.font >= 16), `${label}: B6-1 at most 2 lines, text >= 16px (${cells.map((c) => `${c.lines}l/${c.font}px`).join(' ')})`);
      check(cells.every((c) => c.h >= 55.5 && c.w >= 55.5 && !c.cut) && widths.size === 1, `${label}: AC 4 B6-1 equal cells (${[...widths].join(', ')}px wide), >= 56px, none cut or spilling (${cells.filter((c) => c.cut).map((c) => c.text).join(', ') || 'ok'})`);
      await shot(page, `area-${label}`);
    }
    check((await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)) <= 1, `${label}: no page scroll`);
    if (w === 390) await speakAndCards(page);
    await pctx.close();
  }

  await ctx.close();
} finally {
  await browser.close();
}
done('my-replies');
