// Phones and tablets, portrait and landscape (docs/research/mobile-layout.md). For every viewport:
// the whole keypad and Speak are on screen without scrolling, nothing scrolls sideways, keys are at
// least key-min (72px) and other targets at least target-min (56px), app text is at least 16px, and
// the keys do not move while a long sentence is typed (keyguards, motor memory).
// Keys are tapped with touch at a person's pace (the accept delay ignores same-key repeats < 150 ms).
//   node packages/web/test/e2e/responsive.mjs   (needs `next start`; BASE_URL, default :3202)
//   ENGINE=webkit node ...                      (Safari's engine; CI runs Chromium)
import { BASE_URL, check, done, loadPlaywright, openApp } from './lib.mjs';

// Phones in portrait at the height a page really gets: Safari with its toolbar showing (iOS 26
// Compact tab bar), Chrome on Android, and the installed home-screen app, as measured in
// docs/research/mobile-aac-evidence.md (simulator; Android rows are estimates). Not tested: Safari's
// optional Bottom tab bar on an iPhone SE (495px), where the action bar needs a scroll.
const PHONES = [
  ['iPhone SE, Safari', 375, 549],
  ['iPhone SE, installed app', 375, 647],
  ['iPhone 16e, Safari', 390, 699],
  ['iPhone 17 Pro, Safari', 402, 714],
  ['iPhone 17 Pro Max, Safari', 440, 796],
  ['Android 360x800, Chrome', 360, 668],
  ['Android 412x915, Chrome', 412, 783],
  ['foldable cover screen', 344, 750],
];
// Landscape phones (full screen sizes; the split layout keeps the keypad to the right) and tablets
// in both orientations.
const TURNED = [
  ['small Android landscape', 740, 360],
  ['iPhone SE landscape', 667, 375],
  ['iPhone 15 landscape', 852, 393],
  ['iPhone 16 Pro Max landscape', 956, 440],
  ['foldable cover screen landscape', 882, 344],
  ['iPad mini', 744, 1133],
  ['iPad mini landscape', 1133, 744],
  ['iPad Air', 820, 1180],
  ['iPad Air landscape', 1180, 820],
  ['Android tablet', 800, 1280],
  ['Android tablet landscape', 1280, 800],
];
const LONG = '4 6333 92837 75327 263 7663 27323'; // "i need water please and some bread"

const engine = process.env.ENGINE ?? 'chromium';
const pw = loadPlaywright();
const browser = await pw[engine].launch();
console.log(`responsive check on ${BASE_URL} (${engine})`);

try {
  for (const [name, vw, vh] of [...PHONES, ...TURNED]) {
    {
      const label = `${name} ${vw}x${vh}`;
      const ctx = await browser.newContext({
        viewport: { width: vw, height: vh },
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: engine === 'chromium',
        reducedMotion: 'reduce',
        serviceWorkers: 'block',
      });
      const page = await ctx.newPage();
      await openApp(page);
      const padTop = () => page.evaluate(() => document.querySelector('.nl-keypad').getBoundingClientRect().top + window.scrollY);
      const before = await padTop();
      for (const ch of LONG) {
        await page.locator(`button[data-key="${ch === ' ' ? '0' : ch}"]`).first().tap();
        await page.waitForTimeout(170);
      }
      const after = await padTop();
      await page.evaluate(() => window.scrollTo(0, 0));
      const m = await page.evaluate(() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const pad = document.querySelector('.nl-keypad').getBoundingClientRect();
        const speak = document.querySelector('[data-action="speak"]').getBoundingClientRect();
        const keys = [...document.querySelectorAll('button[data-key]')].map((k) => k.getBoundingClientRect());
        const visible = (el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
        };
        const small = [...document.querySelectorAll('.app button, .app a[href], .app input, .app select')]
          .filter((el) => visible(el) && !el.closest('.nl-skip'))
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.height < 55.5 || r.width < 55.5;
          })
          .map((el) => (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 20));
        const tiny = [...document.querySelectorAll('.app *')]
          .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && visible(el) && !el.closest('nextjs-portal'))
          .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
          .map((el) => el.className || el.tagName);
        return {
          hScroll: document.documentElement.scrollWidth > vw + 1,
          padOnScreen: pad.top >= 0 && pad.bottom <= vh + 0.5,
          padBottom: Math.round(pad.bottom),
          speakOnScreen: speak.top >= 0 && speak.bottom <= vh + 0.5,
          minKey: Math.round(Math.min(...keys.map((k) => Math.min(k.width, k.height)))),
          small,
          tiny,
        };
      });
      console.log(label);
      check(!m.hScroll, 'no sideways scrolling');
      check(m.padOnScreen, `the whole keypad is on screen (bottom ${m.padBottom} of ${vh})`);
      check(m.speakOnScreen, 'Speak is on screen');
      check(m.minKey >= 72, `keys are at least 72px (${m.minKey})`);
      check(m.small.length === 0, `every target is at least 56px${m.small.length ? `: ${m.small.join(', ')}` : ''}`);
      check(m.tiny.length === 0, `no app text under 16px${m.tiny.length ? `: ${m.tiny.slice(0, 3).join(', ')}` : ''}`);
      check(Math.abs(after - before) < 0.5, `the keypad did not move while typing a long sentence (${Math.round(after - before)}px)`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
done('responsive');
