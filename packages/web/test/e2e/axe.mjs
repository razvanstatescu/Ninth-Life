// axe-core (WCAG 2.0/2.1/2.2 A and AA rules) on every page and on the Settings sheet, in the Night
// and Day themes, at a desktop and a phone width; the landing page also with motion on, after
// scrolling to the end (marketing-site MS-13.1).
//   node packages/web/test/e2e/axe.mjs     (needs `next start`; BASE_URL, default http://localhost:3202)
// Fails on any serious or critical violation (.kiro/steering/accessibility.md); moderate and minor
// ones are printed. AXE_STRICT=1 fails on every violation. The full JSON goes to
// packages/web/test-results/axe.json.
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_URL, addTheirLine, check, closeShow, done, loadPlaywright, newContext, openApp } from './lib.mjs';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const BLOCKING = new Set(process.env.AXE_STRICT ? ['minor', 'moderate', 'serious', 'critical'] : ['serious', 'critical']);
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../test-results/axe.json');

/** Open Settings the way a person would: the Settings button, or Menu then Settings on phones. */
async function openSettings(page) {
  const direct = page.getByRole('button', { name: /^settings$/i });
  if (await direct.first().isVisible().catch(() => false)) await direct.first().click();
  else {
    await page.getByRole('button', { name: /menu/i }).first().click();
    await page.getByRole('button', { name: /^settings$/i }).first().click();
  }
  await page.locator('dialog[open]').first().waitFor({ state: 'visible', timeout: 5000 });
}

/** With motion on: wait for the page to start its motion, scroll to the end in steps so every block
 *  is revealed, then wait 1 s and for every running animation to end: a drawing's played sequence
 *  runs up to 4 s (MS-8.11), and axe would measure a part mid-fade. */
async function scrollToEnd(page) {
  await page
    .waitForFunction(() => document.documentElement.dataset.siteMotion === 'on', null, { timeout: 20000, polling: 50 })
    .catch(() => {
      throw new Error('data-site-motion="on" was not set within 20 s');
    });
  await page.evaluate(async () => {
    const step = Math.max(1, Math.floor(innerHeight / 2));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await page.waitForTimeout(1000);
  await page.evaluate(() =>
    Promise.race([
      Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
      new Promise((r) => setTimeout(r, 6000)),
    ]),
  );
}

const TARGETS = [
  { name: 'landing /', path: '/' },
  // Motion on, after every block has been revealed (MS-13.1).
  { name: 'landing / (motion)', path: '/', motion: true },
  // The hero keypad after 4 6 6 3 (try it, W4, MS-6.11 to MS-6.13).
  { name: 'landing / (try it: 4663)', path: '/', tryIt: '4663' },
  { name: 'app /app', path: '/app', app: true },
  { name: 'about /about', path: '/about' },
  { name: 'settings sheet on /app', path: '/app', app: true, settings: true },
  // Web-ui Req 27: the thread on the main screen (header button or panel) and the Conversation sheet.
  { name: 'conversation on /app', path: '/app', app: true, thread: 'screen' },
  { name: 'conversation sheet on /app', path: '/app', app: true, thread: 'sheet' },
  // Web-ui Req 28: the quick replies on the empty screen are in 'app /'; here Menu (Phrases on wide) with its group.
  { name: 'quick replies in Menu or Phrases on /app', path: '/app', app: true, replies: true },
  // Web-ui Req 29: the reply types after their line, Ask pressed (area or laptop list), and in the Conversation sheet.
  { name: 'reply types on /app', path: '/app', app: true, replyTypes: 'screen' },
  { name: 'reply types in the Conversation sheet on /app', path: '/app', app: true, replyTypes: 'sheet' },
];

/** Their line, then Ask: on the screen when it is there, else in the Conversation sheet (left open for 'sheet'; on laptops the sheet has no group). */
async function pressAsk(page, where) {
  await addTheirLine(page, 'Are you coming to the party tonight?');
  const onScreen = page.locator('main [data-intent="ask"]');
  if (where === 'screen' && (await onScreen.first().isVisible().catch(() => false))) {
    await onScreen.first().click();
    await page.keyboard.press('3');
    return;
  }
  const all = page.locator('.thread-panel__actions button', { hasText: 'All' });
  if (await all.first().isVisible().catch(() => false)) await all.first().click();
  else await page.locator('.thread-bubble').click();
  await page.locator('dialog[data-overlay="conversation"][open]').waitFor({ state: 'visible', timeout: 5000 });
  // The shells have the group at the top of the sheet; laptops keep it on the screen.
  const inSheet = page.locator('dialog[data-overlay="conversation"][open] [data-intent="ask"]');
  if (await inSheet.count()) await inSheet.click();
}

/** Menu on phones, Phrases on wide: both start with the Quick replies group. */
async function openRepliesSheet(page) {
  const menu = page.locator('.phone-actions button', { hasText: 'Menu' });
  if (await menu.first().isVisible().catch(() => false)) await menu.first().click();
  else await page.getByRole('button', { name: /^phrases$/i }).first().click();
  await page.locator('dialog[open] [data-scan-row="quick-replies"]').first().waitFor({ state: 'visible', timeout: 5000 });
}

/** Two turns: a "they said" line, then "I need water" spoken with Enter. Optionally open the sheet. */
async function makeConversation(page, openSheet) {
  await addTheirLine(page, 'Do you want tea or coffee with your lunch today?');
  for (const k of '406333092837') await page.keyboard.press(k);
  await page.waitForFunction(() => /need water/i.test(document.querySelector('.nl-speakbar__text')?.textContent ?? ''));
  await page.locator('#keypad').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  await closeShow(page);
  if (!openSheet) return;
  const all = page.locator('.thread-panel__actions button', { hasText: 'All' });
  if (await all.first().isVisible().catch(() => false)) await all.first().click();
  else await page.locator('.thread-bubble').click();
  await page.locator('dialog[data-overlay="conversation"][open]').waitFor({ state: 'visible', timeout: 5000 });
}
const VIEWPORTS = [
  { label: '1280', width: 1280, height: 900 },
  { label: '390', width: 390, height: 844 },
];

// ENGINE=webkit runs it in Safari's engine.
const engine = process.env.ENGINE ?? 'chromium';
const browser = await loadPlaywright()[engine].launch();
const report = [];
console.log(`axe ${TAGS.join(', ')} on ${BASE_URL} (${engine})`);
try {
  for (const theme of ['night', 'day']) {
    for (const vp of VIEWPORTS) {
      for (const t of TARGETS) {
        const ctx = await newContext(browser, { theme, width: vp.width, height: vp.height, reducedMotion: t.motion ? 'no-preference' : 'reduce' });
        const page = await ctx.newPage();
        if (t.app) await openApp(page, t.path);
        else await page.goto(BASE_URL + t.path, { waitUntil: 'load' });
        if (t.settings) await openSettings(page);
        if (t.thread) await makeConversation(page, t.thread === 'sheet');
        if (t.replies) await openRepliesSheet(page);
        if (t.replyTypes) await pressAsk(page, t.replyTypes);
        if (t.tryIt) {
          for (const k of t.tryIt) await page.locator(`[data-try-key="${k}"]`).click();
          // Round 4 (2026-11-13, Claude Code): the result line is in the demo's polite live region (there is no caption).
          await page.waitForFunction((code) => (document.querySelector('.site-demo [role="status"]')?.textContent ?? '').startsWith(`Keys ${code} match:`), t.tryIt, {
            timeout: 20000,
            polling: 50,
          });
        }
        if (t.motion) await scrollToEnd(page);
        const actual = await page.evaluate(() => document.documentElement.dataset.theme);
        const res = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        const label = `${t.name} [${theme}, ${vp.label}]`;
        const blocking = res.violations.filter((v) => BLOCKING.has(v.impact ?? ''));
        for (const v of res.violations) {
          console.log(`    ${v.impact} ${v.id}: ${v.help} (${v.nodes.length} node(s))`);
          for (const n of v.nodes.slice(0, 3)) console.log(`      ${n.target.join(' ')}`);
        }
        check(actual === theme, `${label}: theme applied (${actual})`);
        check(blocking.length === 0, `${label}: ${res.violations.length} violation(s), ${blocking.length} blocking, ${res.passes.length} rules passed`);
        report.push({
          target: t.name,
          theme,
          viewport: vp.label,
          violations: res.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => n.target.join(' ')) })),
          incomplete: res.incomplete.map((v) => ({ id: v.id, nodes: v.nodes.length })),
        });
        await ctx.close();
      }
    }
  }
} finally {
  await browser.close();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ baseUrl: BASE_URL, tags: TAGS, report }, null, 2));
}
done('axe');
