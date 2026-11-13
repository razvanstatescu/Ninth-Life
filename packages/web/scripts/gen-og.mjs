#!/usr/bin/env node
// Builds public/social-card.png, the 1200x630 Open Graph / link-preview card (marketing-site MS-3.6,
// components/site/seo.ts), with Chromium (Playwright, installed globally in the dev image; not a project
// dependency). Run by hand when the card should change, then commit the PNG:
//   pnpm -F @ninth/web og
// The card is drawn from the design system itself: styles/tokens.css (Night), styles/components.css
// (keypad and keys), the self-hosted Atkinson fonts and the logo. A drawn keypad only: no phone body and
// no device brand (MS-4.3), no third-party trademark (tm-lint). Text: the promise from the hero.
import { execSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, '..');
const OUT = resolve(web, 'public/social-card.png');
const W = 1200;
const H = 630;

const require = createRequire(import.meta.url);
function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    const root = execSync('npm root -g').toString().trim();
    return createRequire(resolve(root, 'noop.js'))('playwright');
  }
}
const { chromium } = loadPlaywright();

const dataUri = (file, type) => `data:${type};base64,${readFileSync(file).toString('base64')}`;
const font = (family, file, weight) =>
  `@font-face{font-family:"${family}";font-weight:${weight};font-style:normal;src:url(${dataUri(resolve(web, 'public/fonts', file), 'font/woff2')}) format("woff2");}`;
const logo = dataUri(resolve(web, '../../design/system/assets/Logos/ninth-life-icon.svg'), 'image/svg+xml');

// The last key of "I need water" (4 0 6333 0 92837) is lit, as in the hero demo's finished frame.
const LIT = new Set(['7']);
const ROWS = [
  [['1', '.,?!'], ['2', 'ABC'], ['3', 'DEF']],
  [['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO']],
  [['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ']],
  [['*', 'Back'], ['0', 'Space'], ['#', 'Next']],
];
const label = (l) => (/^[A-Z]+$/.test(l) ? `nl-key__letters${l.length === 4 ? ' nl-key__letters--4' : ''}` : 'nl-key__word');
const key = ([d, l]) =>
  `<span class="nl-key${LIT.has(d) ? ' is-lit' : ''}"><span class="nl-key__digit">${d}</span><span class="${label(l)}">${l}</span></span>`;
const keypad = `<div class="nl-keypad">${ROWS.map((r) => `<div class="nl-keypad__row">${r.map(key).join('')}</div>`).join('')}</div>`;

const html = `<!doctype html><html lang="en" data-theme="night"><head><meta charset="utf-8"><style>
${font('Atkinson Hyperlegible Next', 'atkinson-hyperlegible-next-latin.woff2', '400 800')}
${font('Atkinson Hyperlegible Mono', 'atkinson-hyperlegible-mono-latin.woff2', '400 700')}
${readFileSync(resolve(web, 'styles/tokens.css'), 'utf8')}
${readFileSync(resolve(web, 'styles/components.css'), 'utf8')}
html,body{margin:0}
body{width:${W}px;height:${H}px;overflow:hidden;background:var(--night);color:var(--ink);font-family:var(--font-sans);}
.card{box-sizing:border-box;width:${W}px;height:${H}px;padding:64px 72px;display:flex;align-items:center;justify-content:space-between;gap:56px}
.copy{display:flex;flex-direction:column;gap:28px;max-width:560px}
.brand{display:flex;align-items:center;gap:20px;font-size:40px;line-height:44px;font-weight:700}
.brand img{width:84px;height:84px;border-radius:20px}
h1{margin:0;font-size:68px;line-height:74px;font-weight:800;letter-spacing:-0.01em}
.note{margin:0;font-size:28px;line-height:36px;color:var(--ink-muted)}
.right{display:flex;flex-direction:column;align-items:stretch;gap:20px;width:max-content}
.said{display:flex;flex-direction:column;gap:6px;padding:18px 24px;border-radius:var(--radius-panel);background:var(--surface);box-shadow:inset 0 0 0 2px var(--line)}
.said__text{font-size:34px;line-height:40px;font-weight:700}
.said__keys{font-family:var(--font-mono);font-size:20px;line-height:24px;color:var(--ink-muted)}
.nl-keypad{--nl-key:92px;padding:20px;gap:12px;display:flex}
.nl-keypad__row{gap:12px}
.nl-key{width:92px;height:92px}
.nl-key__word{font-size:18px}
.nl-key.is-lit{box-shadow:inset 0 0 0 3px var(--plum)}
</style></head><body><div class="card">
<div class="copy">
  <div class="brand"><img src="${logo}" alt="">Ninth Life</div>
  <h1>Type on 9 keys. Hear your sentence.</h1>
  <p class="note">Free web app. Works offline. No account.</p>
</div>
<div class="right">
  <div class="said"><span class="said__text">I need water</span><span class="said__keys">4 6333 92837</span></div>
  ${keypad}
</div>
</div></body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.images[0]?.complete);
  await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: W, height: H } });
  console.log(`gen-og: ${OUT} (${(statSync(OUT).size / 1024).toFixed(1)} KB)`);
} finally {
  await browser.close();
}
