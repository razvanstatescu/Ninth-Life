// Laptops (web-ui Req 40, ADR-012): one screen, by context. For every window size, with a mouse:
//   - wide (960px or wider): the main screen never scrolls, idle, while typing a long sentence, with a "they said"
//     line and its reply types, and with switch scanning on; nothing scrolls sideways;
//   - idle: no sentence actions, no Sentences heading, no empty box, no footer, no keyboard paragraph, one status pill,
//     Keyboard shortcuts under the keypad;
//   - typing: Fix a word, Spell this word, Save phrase and Check the words in one row (56px, none cut); every sentence
//     row shown is whole and on screen, then More sentences when some are not shown; ArrowDown to the last sentence
//     keeps the chosen one on screen; keys are at least 72px, targets at least 56px;
//   - narrower windows get the stack shell and do not scroll either.
//   node packages/web/test/e2e/laptop.mjs   (BASE_URL, default :3202)
import { BASE_URL, addTheirLine, check, done, loadPlaywright, newContext, openApp } from './lib.mjs';

const WIDE = [
  [1024, 640],
  [1024, 768],
  [1280, 720],
  [1280, 800],
  [1366, 768],
  [1440, 900],
  [1536, 864],
  [1920, 1080],
  [2560, 1440],
];
const NARROW = [
  [720, 800],
  [800, 600],
  [900, 700],
];
const LONG = '4 6333 92837 75327 263 7663 27323'; // "i need water please and some bread"

async function type(page, digits) {
  for (const d of digits) {
    await page.keyboard.press(d === ' ' ? 'Space' : d);
    await page.waitForTimeout(170); // a person's pace (the accept delay ignores repeats under 150 ms)
  }
  await page.waitForTimeout(500);
}

const measure = (page) =>
  page.evaluate(() => {
    const vh = innerHeight;
    const vw = innerWidth;
    const on = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.top >= -1 && r.bottom <= vh + 1 && r.left >= -1 && r.right <= vw + 1;
    };
    const area = document.querySelector('[data-section="cands"]')?.getBoundingClientRect();
    const rows = [...document.querySelectorAll('[data-section="cands"] .cands__list .nl-candidate')];
    const actions = [...document.querySelectorAll('.speak-actions .nl-btn')];
    const targets = [...document.querySelectorAll('main button, header button')].filter((b) => b.getBoundingClientRect().height > 0);
    const keys = [...document.querySelectorAll('.nl-key')].map((k) => k.getBoundingClientRect());
    return {
      layout: document.querySelector('.app')?.className.match(/app--(\w+)/)?.[1],
      scroll: document.documentElement.scrollHeight - vh,
      hScroll: document.documentElement.scrollWidth > vw + 1,
      actions: actions.length,
      actionsOk: actions.every((b) => on(b) && b.getBoundingClientRect().height >= 55.5 && b.scrollWidth <= b.clientWidth + 1),
      title: !!document.getElementById('cands-title'),
      emptyBox: !!document.querySelector('.cands__empty'),
      footer: !!document.querySelector('.app-footer'),
      hint: !!document.querySelector('.hint'),
      pills: [...document.querySelectorAll('.app-header .status-btn.app-header--wide .pill')].filter((p) => p.getBoundingClientRect().width > 0).length,
      shortcuts: on([...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Keyboard shortcuts')),
      speak: on([...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Speak')),
      rows: rows.length,
      rowsWhole: rows.every((r) => {
        const b = r.getBoundingClientRect();
        return on(r) && area && b.top >= area.top - 1 && b.bottom <= area.bottom + 1;
      }),
      more: on([...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'More sentences')),
      selectedOn: on(document.querySelector('[data-section="cands"] .nl-candidate.is-selected')),
      small: targets.filter((b) => b.getBoundingClientRect().height < 55.5).map((b) => b.getAttribute('aria-label') || b.textContent?.trim()),
      keyMin: Math.min(...keys.map((k) => Math.min(k.width, k.height))),
      keysOn: [...document.querySelectorAll('.nl-key')].every(on),
      scanOn: on(document.querySelector('.scan-status')),
    };
  });

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
console.log(`laptop: ${BASE_URL}`);

for (const [width, height] of WIDE) {
  console.log(`\n${width}x${height}`);
  const ctx = await newContext(browser, { width, height });
  const page = await ctx.newPage();
  await openApp(page);
  let m = await measure(page);
  check(m.layout === 'wide', `40.1 wide layout (${m.layout})`);
  check(m.scroll <= 1 && !m.hScroll, `40.1 idle: nothing scrolls (${m.scroll}px over)`);
  check(m.actions === 0 && !m.title && !m.emptyBox, '40.4 idle: no sentence actions, no Sentences heading, no empty box');
  check(!m.footer && !m.hint, '40.7 40.8 idle: no footer and no keyboard paragraph');
  check(m.pills === 1, `40.2 one status pill (${m.pills})`);
  check(m.shortcuts && m.speak && m.keysOn, '40.7 Keyboard shortcuts, Speak and every key on screen');
  check(m.keyMin >= 71.5, `40.9 keys at least 72px (${Math.round(m.keyMin)})`);

  await type(page, LONG);
  m = await measure(page);
  check(m.scroll <= 1 && !m.hScroll, `40.1 typing: nothing scrolls (${m.scroll}px over)`);
  check(m.actions === 4 && m.actionsOk, `40.4 typing: 4 sentence actions on screen, 56px, none cut (${m.actions})`);
  check(m.rowsWhole, `40.5 ${m.rows} sentence row(s), each whole and on screen`);
  check(m.rows >= 5 || m.more, `40.5 More sentences is on screen when not every sentence is (${m.rows} shown)`);
  check(height < 720 || m.rows >= 2, `40.5 at least 2 sentence rows from 720px tall (${m.rows})`);
  check(m.small.length === 0, `targets at least 56px (${m.small.slice(0, 4).join(', ')})`);
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(200);
  m = await measure(page);
  check(m.selectedOn && m.scroll <= 1, '40.5 the chosen 5th sentence is on screen, and the page still does not scroll');

  // A "they said" line: the conversation row and the reply types.
  await page.keyboard.press('Escape');
  await page.locator('[data-action="clear"]').first().click();
  await addTheirLine(page, 'Would you like some tea with milk and sugar, or coffee?');
  await page.evaluate(() => document.activeElement?.blur());
  await type(page, '43556 469 273');
  // With a line from them the sentences are ranked with it in view; wait for them.
  await page.waitForFunction(() => document.querySelector('[data-section="cands"] .cands__list li, .cands__more'), null, { timeout: 8000 }).catch(() => undefined);
  m = await measure(page);
  check(m.scroll <= 1 && !m.hScroll, `40.2 with a they said line and reply types: nothing scrolls (${m.scroll}px over)`);
  check(m.rowsWhole && (m.rows >= 5 || m.more), `40.5 with them: ${m.rows} whole row(s), More when needed`);

  // Switch scanning on: its controls fit under the keypad.
  await page.locator('button', { hasText: 'Turn on' }).first().click();
  await page.waitForTimeout(200);
  m = await measure(page);
  check(m.scroll <= 1 && m.scanOn && m.keysOn && m.keyMin >= 71.5, `40.9 scanning on: keys (${Math.round(m.keyMin)}px) and the scan status on screen, nothing scrolls (${m.scroll}px over)`);
  await ctx.close();
}

for (const [width, height] of NARROW) {
  console.log(`\n${width}x${height} (narrow window)`);
  const ctx = await newContext(browser, { width, height });
  const page = await ctx.newPage();
  await openApp(page);
  await type(page, LONG);
  const m = await measure(page);
  check(m.layout === 'stack' || m.layout === 'split', `40.1 a one-screen shell (${m.layout})`);
  check(m.scroll <= 1 && !m.hScroll, `40.1 typing: nothing scrolls (${m.scroll}px over)`);
  await ctx.close();
}

await browser.close();
done('laptop');
