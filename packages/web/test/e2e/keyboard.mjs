// Keyboard-only walkthrough of the communication screen (no mouse at any step):
//   type "i need water" with digits, choose a sentence, open Settings with Tab + Enter, close it
//   with Escape, and check focus is visible and comes back to the opener. Then the conversation (web-ui
//   Req 27): Enter speaks, Tab reaches the spoken turn on the screen, Enter opens the Conversation sheet
//   on it, and Enter on Say again speaks it again. Quick replies (web-ui Req 28): Tab reaches them after the
//   sentence card and before the keypad, Enter speaks one, and Alt+1 speaks nothing.
//   node packages/web/test/e2e/keyboard.mjs     (needs `next start`; BASE_URL, default :3202)
import { BASE_URL, TAB, addTheirLine, check, closeShow, done, loadPlaywright, newContext, openApp, recordSpeech, stubSpeech, tabTo, waitFor } from './lib.mjs';

const KEYS = '4 0 6 3 3 3 0 9 2 8 3 7'.split(' '); // i(4) space need(6333) space water(92837)
// The sentence line only (the digits line sits inside the same element).
const speakText = async (page) => (await page.locator('.nl-speakbar__text').first().innerText()).split('\n')[0];

// ENGINE=webkit runs it in Safari's engine.
const engine = process.env.ENGINE ?? 'chromium';
const browser = await loadPlaywright()[engine].launch();
console.log(`keyboard walkthrough on ${BASE_URL} (${engine})`);
try {
  for (const width of [1280, 390]) {
    console.log(`viewport ${width}`);
    const ctx = await newContext(browser, { width, height: width === 390 ? 844 : 900 });
    await recordSpeech(ctx);
    const page = await ctx.newPage();
    await openApp(page);

    for (const k of KEYS) await page.keyboard.press(k);
    await waitFor(page, () => /need water/i.test(document.querySelector('.nl-speakbar__text')?.textContent ?? ''), null, {
      what: '"I need water" in the speak bar',
    });
    check(/^I need water/.test((await speakText(page)).trim()), `typed 4 0 6333 0 92837 -> "${(await speakText(page)).trim()}"`);

    // Choose sentence 2 with Alt+2, then move back up with ArrowUp. The list marks the chosen sentence
    // pressed; the phone layout instead moves it into the sentence card (web-ui Req 24).
    const pressed = async () =>
      (await page.locator('[aria-pressed="true"]').count()) > 0 ? page.locator('[aria-pressed="true"]').first().innerText() : speakText(page);
    await page.keyboard.press('Alt+2');
    await waitFor(page, () => !!document.querySelector('[aria-pressed="true"]') || !/need water/i.test(document.querySelector('.nl-speakbar__text')?.textContent ?? ''), null, {
      what: 'a chosen sentence',
    });
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

    // Web-ui Req 27: Enter speaks the sentence, which becomes a "you said" turn on the screen.
    await page.locator('#keypad').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    await closeShow(page);
    const isTurn = () => /^You: I need water/.test(document.activeElement?.getAttribute('aria-label') ?? '');
    await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
    const turnSteps = await tabTo(page, isTurn, { what: 'the spoken turn on the screen' });
    check(true, `27.4 Tab reached "You: I need water" on the screen in ${turnSteps} Tab(s)`);
    await page.keyboard.press('Enter');
    await waitFor(page, () => !!document.querySelector('dialog[data-overlay="conversation"][open]'), null, { what: 'the Conversation sheet' });
    const first = await page.evaluate(() => (document.activeElement?.textContent ?? '').trim());
    check(first === 'Say again', `27.7 the sheet opened on that turn's first button ("${first}")`);
    const before = await page.evaluate(() => window.__spoken.length);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    const again = await page.evaluate((n) => ({ spoken: window.__spoken.slice(n), shown: document.querySelector('dialog.show[open]')?.textContent ?? '' }), before);
    check(again.spoken.join(' ').includes('I need water') || again.shown.includes('I need water'), `27.8 Enter on Say again spoke "${again.spoken.join(' ') || again.shown}"`);
    await closeShow(page);
    await page.keyboard.press('Escape');
    await waitFor(page, () => !document.querySelector('dialog[open]'), null, { what: 'the sheet to close' });
    await ctx.close();
  }

  // Web-ui Req 28: the quick replies by keyboard, before the first key.
  for (const width of [1280, 390]) {
    console.log(`quick replies, viewport ${width}`);
    const ctx = await newContext(browser, { width, height: width === 390 ? 844 : 900 });
    await stubSpeech(ctx);
    const page = await ctx.newPage();
    await openApp(page);
    const isReply = () => !!document.activeElement?.classList.contains('quick-reply');
    let keyFirst = false;
    for (let i = 0; i < 40 && !(await page.evaluate(isReply)); i++) {
      await page.keyboard.press(TAB);
      if (await page.evaluate(() => !!document.activeElement?.closest('[data-section="pad"]'))) keyFirst = true;
    }
    const first = await page.evaluate(() => document.activeElement?.textContent ?? '');
    const afterCard = await page.evaluate(() => {
      const card = document.querySelector('[data-section="speak"]');
      return !!card && !!(card.compareDocumentPosition(document.activeElement) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    check(first === 'Hold on.' && afterCard && (width === 1280 || !keyFirst), `28.1 Tab reached "${first}" after the sentence card${width === 1280 ? '' : ' and before the keypad'}`);
    await page.keyboard.press(TAB); // "Yes."
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    const said = await page.evaluate(() => window.__spoken.slice());
    check(said.length === 1 && said[0] === 'Yes.', `28.2 Enter on the focused "Yes." spoke it once (${JSON.stringify(said)})`);
    await page.locator('#keypad').focus();
    await page.keyboard.press('Alt+1');
    await page.waitForTimeout(100);
    const after = await page.evaluate(() => ({ spoken: window.__spoken.length, text: document.querySelector('.nl-speakbar__text')?.textContent ?? '' }));
    check(after.spoken === 1 && /press a key to start/i.test(after.text), 'Alt+1 speaks nothing and changes nothing while the replies show');
    await ctx.close();
  }

  // Web-ui Req 29: the reply types by keyboard, after their line: Tab reaches Ask, Enter presses it.
  for (const width of [1280, 390]) {
    console.log(`reply types, viewport ${width}`);
    const ctx = await newContext(browser, { width, height: width === 390 ? 844 : 900 });
    await stubSpeech(ctx);
    const page = await ctx.newPage();
    await openApp(page);
    await addTheirLine(page, 'Are you coming to the party tonight?');
    await page.locator('#keypad').focus();
    const steps = await tabTo(page, () => document.activeElement?.getAttribute('data-intent') === 'ask', { what: 'Ask' });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    const st = await page.evaluate(() => ({
      pressed: document.querySelector('main [data-intent="ask"]')?.getAttribute('aria-pressed'),
      group: document.activeElement?.closest('[role="group"]')?.getAttribute('aria-label') ?? document.activeElement?.closest('[role="group"]')?.textContent,
      spoken: window.__spoken.length,
    }));
    check(st.pressed === 'true' && st.spoken === 0, `29.1 Tab reached Ask in ${steps} steps and Enter pressed it, speaking nothing`);
    await page.keyboard.press('Enter'); // pressing the pressed one releases it
    await page.waitForTimeout(100);
    const released = await page.evaluate(() => document.querySelector('main [data-intent="ask"]')?.getAttribute('aria-pressed'));
    check(released === 'false', '29.1 Enter again released it');
    await page.keyboard.press('Enter');
    await page.locator('#keypad').focus();
    await page.keyboard.press('3');
    await page.waitForTimeout(100);
    const text = await page.evaluate(() => {
      const el = document.querySelector('.nl-speakbar__text')?.cloneNode(true);
      el?.querySelector('.nl-speakbar__digits')?.remove();
      return el?.textContent ?? '';
    });
    check(/\?$/.test(text.trim()), `29.3 with Ask the sentence ends with "?" ("${text}")`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
done('keyboard');
