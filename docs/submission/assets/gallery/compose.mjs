// Devpost gallery, step 2: frame the real screens from raw/ into 3:2 slides (1500x1000 CSS px, 3000x2000 at 2x).
// Run from packages/web after capture.mjs: node ../../docs/submission/assets/gallery/compose.mjs [slide ...]
// Writes NN-name.png next to this file; convert each to JPG with sips (see the README).
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadPlaywright } from '../../../../packages/web/test/e2e/lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const RAW = join(here, 'raw');
const TMP = join(here, '.html');
mkdirSync(TMP, { recursive: true });
const FONTS = resolve(here, '../../../../packages/web/public/fonts');
const ICON = resolve(here, '../../../../packages/web/public/icons/icon.svg');
const raw = (name) => pathToFileURL(join(RAW, `${name}.png`)).href;
const only = process.argv.slice(2);

// The Night tokens (packages/web/styles/tokens.css) and the site's night sky (.site-night).
const CSS = `
@font-face { font-family: 'Atkinson Next'; src: url('${pathToFileURL(join(FONTS, 'atkinson-hyperlegible-next-latin.woff2')).href}') format('woff2'); font-weight: 200 800; }
@font-face { font-family: 'Atkinson Mono'; src: url('${pathToFileURL(join(FONTS, 'atkinson-hyperlegible-mono-latin.woff2')).href}') format('woff2'); font-weight: 200 800; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1500px; height: 1000px; overflow: hidden; }
body {
  font-family: 'Atkinson Next', system-ui, sans-serif; color: #f3eeff; background: #140a2e;
  background: radial-gradient(70% 60% at 0% 100%, rgba(42,24,86,0.95), transparent 70%), radial-gradient(55% 50% at 85% 10%, rgba(238,232,255,0.08), transparent 70%), #140a2e;
  -webkit-font-smoothing: antialiased;
}
.slide { position: absolute; inset: 0; padding: 72px 88px; display: flex; flex-direction: column; gap: 40px; }
.brand { position: absolute; right: 88px; top: 64px; display: flex; align-items: center; gap: 14px; font-size: 26px; font-weight: 800; color: #eee8ff; }
.brand img { width: 44px; height: 44px; border-radius: 12px; }
.eyebrow { font-size: 26px; font-weight: 700; letter-spacing: 0.02em; color: #ffb13d; }
h1 { font-size: 72px; line-height: 1.04; font-weight: 800; letter-spacing: -0.015em; color: #eee8ff; }
p.lead { font-size: 30px; line-height: 1.4; color: #bdb3e0; max-width: 1080px; }
.frame { border-radius: 28px; overflow: hidden; border: 2px solid #3a2a6e; box-shadow: 0 24px 60px rgba(8,4,20,0.55); background: #140a2e; }
.frame img { display: block; width: 100%; height: 100%; object-fit: cover; }
.split { flex-direction: row; align-items: center; gap: 72px; padding-top: 150px; }
.split .copy { flex: 0 0 520px; display: flex; flex-direction: column; gap: 28px; }
.split .copy h1 { font-size: 68px; }
.split .copy p.lead { font-size: 28px; }
.center { align-items: center; justify-content: center; flex: 1; display: flex; min-height: 0; }
`;

const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}
<div class="brand"><img src="${pathToFileURL(ICON).href}" alt="">Ninth Life</div></body></html>`;

/** A crop of a raw shot: the region (in CSS px of the raw page, at 2x) scaled into a frame of the given size. */
const crop = (name, { x, y, w, h, scale }, fw, fh) =>
  `<div class="frame" style="width:${fw}px;height:${fh}px"><img src="${raw(name)}" style="width:${(scale ?? 1) * 100}%;height:auto;object-fit:none;transform-origin:0 0;margin-left:${-x}px;margin-top:${-y}px;width:${w}px;height:${h}px;object-fit:cover;object-position:0 0"></div>`;

const SLIDES = {
  '02-every-device': page(`<div class="slide">
    <div><p class="eyebrow">Phone, tablet and laptop</p></div>
    <h1>One screen, nothing to scroll</h1>
    <p class="lead">The keypad, your sentence and the other person's last line always fit on the screen you have.</p>
    <div class="center" style="align-items:flex-end;gap:36px;padding-bottom:40px">
      <div class="frame" style="width:196px;height:424px"><img src="${raw('phone')}"></div>
      <div class="frame" style="width:300px;height:432px"><img src="${raw('tablet')}"></div>
      <div class="frame" style="width:720px;height:450px"><img src="${raw('laptop')}"></div>
    </div></div>`),
  '03-proof-check': page(`<div class="slide">
    <p class="eyebrow">The proof check</p>
    <h1>Every spoken word matches your keys</h1>
    <p class="lead">A language model can suggest sentences. It cannot put words in your mouth: a word that does not spell your keys is dropped, never spoken.</p>
    <div class="center" style="padding-bottom:8px"><div class="frame" style="border:none;box-shadow:none;background:transparent"><img src="${raw('site-proof-figure')}" style="height:520px;width:auto"></div></div>
  </div>`),
  '05-show-and-flip': page(`<div class="slide split">
    <div class="copy"><p class="eyebrow">Show and Flip</p><h1>No voice? Show it in big text.</h1>
      <p class="lead">Show fills the screen with your sentence. Flip turns it around for the person sitting opposite.</p></div>
    <div class="frame" style="width:760px;height:520px;position:relative">
      <img src="${raw('laptop-show')}" style="position:absolute;left:-20px;top:-200px;width:1500px;height:1000px;object-fit:fill">
    </div></div>`),
  '07-spell-a-name': page(`<div class="slide split">
    <div class="copy"><p class="eyebrow">Spell this word</p><h1>Spell a name once</h1>
      <p class="lead">Pick the letter for each key you pressed, then Add to my words. Next time, the same keys bring it back.</p></div>
    <div class="frame" style="width:700px;height:740px;position:relative">
      <img src="${raw('laptop-spell')}" style="position:absolute;left:0;top:0;width:1500px;height:1000px;object-fit:fill;transform:scale(1.18);transform-origin:0 0">
    </div></div>`),
  '08-offline-privacy': page(`<div class="slide">
    <p class="eyebrow">Privacy</p>
    <h1>Offline unless you choose</h1>
    <p class="lead">Typing, the dictionary and the proof check run in your browser. No account, no cookies, no analytics. Model ranking, online voices and Listen are the only ways out, each off until you use it.</p>
    <div class="center" style="padding-bottom:8px"><div class="frame"><img src="${raw('site-privacy-map')}" style="width:1080px;height:auto"></div></div>
  </div>`),
  '09-measured': page(`<div class="slide">
    <p class="eyebrow">Measured, not promised</p>
    <h1>85.6% right sentence first, offline</h1>
    <p class="lead">From a simulated typist on 866 test sentences, not from studies with people. Word frequency alone gets 62.4%.</p>
    <div class="center" style="padding-bottom:8px"><div class="frame" style="border:none;box-shadow:none;background:transparent"><img src="${raw('site-results-effort')}" style="width:1000px;height:auto"></div></div>
  </div>`),
};

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
const tab = await ctx.newPage();
for (const [name, html] of Object.entries(SLIDES)) {
  if (only.length && !only.includes(name)) continue;
  const file = join(TMP, `${name}.html`);
  writeFileSync(file, html);
  await tab.goto(pathToFileURL(file).href, { waitUntil: 'load' });
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(200);
  await tab.screenshot({ path: join(here, `${name}.png`) });
  console.log('slide', name);
}
// The product shots are already 3:2 app screens: used as they are.
if (!only.length) {
  copyFileSync(join(RAW, 'laptop-convo.png'), join(here, '04-conversation.png'));
  copyFileSync(join(RAW, 'laptop-scan.png'), join(here, '06-switch-scanning.png'));
}
await browser.close();
void crop;
