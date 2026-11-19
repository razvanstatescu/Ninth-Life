// Devpost thumbnail (3:2): the live site's hero, restyled into a 1500x1000 frame (3000x2000 at 2x) with large text.
// Run from packages/web: node ../../docs/submission/assets/devpost-thumbnail.mjs <out-name>  (writes <out-name>.png;
// convert with: sips -s format jpeg -s formatOptions 90 <out-name>.png --out devpost-thumbnail.jpg)
import { loadPlaywright } from '../../../packages/web/test/e2e/lib.mjs';
const out = process.argv[2] ?? 'devpost-thumbnail';
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2, reducedMotion: 'reduce', colorScheme: 'dark' });
const page = await ctx.newPage();
await page.goto('https://night.statescu.net/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.addStyleTag({
  content: `
  .site-barline, .site-cta, .site-hero__note, .site-hero__lead, .site-demo__tools, .site-demo__status, main, footer, .nl-skip { display: none !important; }
  header#top { padding-top: 0 !important; min-height: 1000px; height: 1000px; overflow: hidden; display: flex; align-items: center; }
  .site-hero { width: 100%; max-width: none !important; padding: 0 110px !important; gap: 90px !important; flex-direction: row !important; align-items: center !important; }
  .site-hero__copy { flex: 1 1 0 !important; gap: 36px !important; }
  .site-hero__brand { display: inline-flex !important; font-size: 52px !important; line-height: 1 !important; gap: 24px !important; }
  .site-hero__icon { display: block !important; width: 120px !important; height: 120px !important; border-radius: 28px !important; }
  .site-hero__title { font-size: 104px !important; line-height: 1.04 !important; }
  .site-hero__title > span { display: block !important; }
  .site-hero__demo { flex: 0 0 auto !important; transform: scale(1.5); transform-origin: center; margin: 0 80px 0 40px; }
  `,
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}.png`, clip: { x: 0, y: 0, width: 1500, height: 1000 } });
await browser.close();
console.log('ok');
