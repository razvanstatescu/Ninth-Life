// The conversation thread is memory only (web-ui Req 27.1, ADR-007): add a "they said" line and speak a
// sentence, check that nothing of it reached localStorage, sessionStorage, IndexedDB or cookies, then
// reload and check the thread is gone. A quick reply (web-ui Req 28.7) is a "you said" turn too.
//   node packages/web/test/e2e/conversation.mjs   (needs a running server; BASE_URL, default :3202)
//   ENGINE=webkit node ...
import { BASE_URL, addTheirLine, check, closeShow, done, loadPlaywright, newContext, openApp, waitFor } from './lib.mjs';

const THEM = 'Do you want tea or coffee with your lunch today?';
const engine = process.env.ENGINE ?? 'chromium';
const pw = loadPlaywright();
const browser = await pw[engine].launch();
console.log(`conversation check on ${BASE_URL} (${engine})`);

/** Every string the page could have stored: web storage, cookies and every IndexedDB record. */
const storedText = (page) =>
  page.evaluate(async () => {
    const out = [JSON.stringify({ ...localStorage }), JSON.stringify({ ...sessionStorage }), document.cookie];
    const dbs = indexedDB.databases ? await indexedDB.databases() : [];
    for (const { name } of dbs) {
      if (!name) continue;
      const db = await new Promise((res, rej) => {
        const r = indexedDB.open(name);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      for (const store of db.objectStoreNames) {
        const all = await new Promise((res) => {
          const r = db.transaction(store).objectStore(store).getAll();
          r.onsuccess = () => res(r.result);
          r.onerror = () => res([]);
        });
        out.push(JSON.stringify(all));
      }
      db.close();
    }
    return out.join('\n');
  });

try {
  for (const width of [1280, 390]) {
    console.log(`viewport ${width}`);
    const ctx = await newContext(browser, { width, height: width === 390 ? 844 : 900 });
    const page = await ctx.newPage();
    await openApp(page);
    await addTheirLine(page, THEM);
    for (const k of '406333092837') await page.keyboard.press(k);
    await waitFor(page, () => /need water/i.test(document.querySelector('.nl-speakbar__text')?.textContent ?? ''), null, { what: '"I need water"' });
    await page.locator('#keypad').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    await closeShow(page);
    const names = () => page.evaluate(() => [...document.querySelectorAll('[data-thread] [aria-label], .thread-bubble')].map((e) => e.getAttribute('aria-label')).filter(Boolean));
    // The newest turn: the first row of the strip or panel; behind the header bubble (which shows their
    // line, Req 27.4), the first turn of the Conversation sheet.
    const newest = async () => {
      if (!(await page.locator('.thread-bubble').count())) return (await names())[0] ?? '';
      await page.locator('.thread-bubble').first().click();
      await page.locator('dialog[data-overlay="conversation"][open]').waitFor({ timeout: 4000 });
      const t = await page.evaluate(() => {
        const li = document.querySelector('dialog[open] .thread-item');
        return li ? `${li.getAttribute('data-who') === 'me' ? 'You' : 'They'}: ${li.querySelector('.thread-item__text')?.textContent ?? ''}` : '';
      });
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'), null, { timeout: 4000 });
      return t;
    };
    const bubbleName = () => page.evaluate(() => document.querySelector('.thread-bubble')?.getAttribute('aria-label') ?? null);
    const top = await newest();
    check(/^You: I need water/.test(top), `the spoken sentence is the newest turn (${top})`);
    const b1 = await bubbleName();
    if (b1 !== null) check(b1 === `They: ${THEM}`, `27.4 the header bubble shows their line, not yours again (${b1})`);
    // After Speak the replies hold the area again; "Yes." becomes the newest turn.
    await page.locator('[data-section="cands"] .quick-reply', { hasText: 'Yes.' }).first().click();
    await page.waitForTimeout(150);
    await closeShow(page);
    const withReply = await newest();
    check(/^You: Yes\./.test(withReply), `28.7 a quick reply is the newest "you said" turn (${withReply})`);
    // Give the settings save (IndexedDB) time to run, so a stray write would be there to find.
    await page.waitForTimeout(500);
    const stored = await storedText(page);
    check(!stored.includes('tea or coffee') && !/need water/i.test(stored) && !stored.includes('Yes.'), '27.1 nothing of the conversation is in localStorage, sessionStorage, IndexedDB or cookies');
    await page.reload({ waitUntil: 'load' });
    await openApp(page);
    const after = await names();
    check(!after.some((n) => /^(You|They):/.test(n)), `27.1 a reload clears the conversation (${after.length ? after.join(', ') : 'no turns'})`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
done('conversation');
