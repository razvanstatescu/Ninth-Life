#!/usr/bin/env node
// Builds public/icons from design/system/assets/Logos with Chromium (Playwright, installed
// globally in the dev image; not a project dependency). Run by hand when the logo changes:
//   pnpm -F @ninth/web icons
// Rules (Logos/README.md): the full icon at 48px and above, the favicon variant below 48px.
// Both SVGs are full-bleed on night, so the same art serves as a maskable icon.
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const LOGOS = resolve(here, '../../../design/system/assets/Logos');
const OUT = resolve(here, '../public/icons');
mkdirSync(OUT, { recursive: true });

copyFileSync(resolve(LOGOS, 'ninth-life-icon.svg'), resolve(OUT, 'icon.svg'));
copyFileSync(resolve(LOGOS, 'ninth-life-favicon.svg'), resolve(OUT, 'favicon.svg'));

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

const jobs = [
  { svg: 'ninth-life-icon.svg', size: 512, out: 'icon-512.png' },
  { svg: 'ninth-life-icon.svg', size: 512, out: 'icon-maskable-512.png' },
  { svg: 'ninth-life-icon.svg', size: 192, out: 'icon-192.png' },
  { svg: 'ninth-life-icon.svg', size: 180, out: 'apple-touch-icon.png' },
  { svg: 'ninth-life-favicon.svg', size: 32, out: 'favicon-32.png' },
];

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const j of jobs) {
    const svg = readFileSync(resolve(LOGOS, j.svg), 'utf8');
    await page.setViewportSize({ width: j.size, height: j.size });
    await page.setContent(
      `<!doctype html><html><body style="margin:0;background:#140a2e"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${j.size}" height="${j.size}" style="display:block"></body></html>`,
    );
    await page.waitForFunction(() => document.images[0]?.complete);
    await page.screenshot({ path: resolve(OUT, j.out), clip: { x: 0, y: 0, width: j.size, height: j.size } });
    console.log(`gen-icons: ${j.out}`);
  }
} finally {
  await browser.close();
}
