// axe-core (WCAG 2.0/2.1/2.2 A and AA rules) on every page and on the Settings sheet, in the Night
// and Day themes, at a desktop and a phone width.
//   node packages/web/test/e2e/axe.mjs     (needs `next start`; BASE_URL, default http://localhost:3202)
// Fails on any serious or critical violation (.kiro/steering/accessibility.md); moderate and minor
// ones are printed. AXE_STRICT=1 fails on every violation. The full JSON goes to
// packages/web/test-results/axe.json.
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_URL, check, done, loadPlaywright, newContext, openApp } from './lib.mjs';

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

const TARGETS = [
  { name: 'app /', path: '/', app: true },
  { name: 'welcome /welcome', path: '/welcome' },
  { name: 'about /about', path: '/about' },
  { name: 'settings sheet on /', path: '/', app: true, settings: true },
];
const VIEWPORTS = [
  { label: '1280', width: 1280, height: 900 },
  { label: '390', width: 390, height: 844 },
];

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const report = [];
console.log(`axe ${TAGS.join(', ')} on ${BASE_URL}`);
try {
  for (const theme of ['night', 'day']) {
    for (const vp of VIEWPORTS) {
      for (const t of TARGETS) {
        const ctx = await newContext(browser, { theme, width: vp.width, height: vp.height });
        const page = await ctx.newPage();
        if (t.app) await openApp(page, t.path);
        else await page.goto(BASE_URL + t.path, { waitUntil: 'load' });
        if (t.settings) await openSettings(page);
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
