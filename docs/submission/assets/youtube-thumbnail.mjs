// YouTube thumbnail (16:9): the live site's hero, restyled into a 1280x720 frame (2560x1440 at 2x), text large enough
// to read at the size YouTube shows thumbnails in lists. Run from packages/web:
//   node ../../docs/submission/assets/youtube-thumbnail.mjs
// then: sips -s format jpeg -s formatOptions 88 youtube-thumbnail.png --out ../../docs/submission/assets/youtube-thumbnail.jpg
import { loadPlaywright } from '../../../packages/web/test/e2e/lib.mjs';

const out = process.argv[2] ?? 'youtube-thumbnail';
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2, reducedMotion: 'reduce', colorScheme: 'dark' });
const page = await ctx.newPage();
await page.goto('https://night.statescu.net/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.addStyleTag({
  content: `
  .site-barline, .site-cta, .site-hero__note, .site-hero__lead, .site-demo__tools, .site-demo__status, main, footer, .nl-skip { display: none !important; }
  header#top { padding-top: 0 !important; height: 720px; overflow: hidden; display: flex; align-items: center; }
  .site-hero { width: 100%; max-width: none !important; padding: 0 72px !important; gap: 40px !important; flex-direction: row !important; align-items: center !important; }
  .site-hero__copy { flex: 1 1 0 !important; gap: 24px !important; }
  .site-hero__brand { display: inline-flex !important; font-size: 44px !important; line-height: 1 !important; gap: 20px !important; }
  .site-hero__icon { display: block !important; width: 96px !important; height: 96px !important; border-radius: 22px !important; }
  .site-hero__title { font-size: 116px !important; line-height: 0.98 !important; letter-spacing: -0.02em !important; }
  .site-hero__title > span { display: block !important; }
  .site-hero__demo { flex: 0 0 auto !important; transform: scale(1.32); transform-origin: center; margin: 0 56px 0 24px; }
  `,
});
// The site's own words, broken into four even lines for the thumbnail.
await page.evaluate(() => {
  const h = document.querySelector('.site-hero__title');
  if (h) h.innerHTML = '<span>Type on</span><span>9 keys.</span><span>Hear your</span><span>sentence.</span>';
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}.png`, clip: { x: 0, y: 0, width: 1280, height: 720 } });
await browser.close();
console.log('ok');
