// Partner strip (web-ui Req 33; spec r6 4-partner-strip AC 1-11, 14), end to end. Goes to
// packages/web/test/e2e/partner.mjs when item 4 is built.
//   - default: no band at any size;
//   - "Turned": "Typing…" turned 180° from the first key; no letter, digit or candidate word in the band at any
//     keystroke of 5 sentences before Speak; after Speak the spoken text; the next key "Typing…" again;
//   - a quick reply and Show put their text in the band; a They said line and Clear conversation empty it;
//   - the band is not focusable, not a live region, holds no button;
//   - at the 24 responsive sizes: band none/compact/full per the spec table, no scroll, keys >= 72px, targets >= 56px,
//     text >= 16px, the keypad does not move while typing; from 640 to 691px "They said" is in Menu;
//   - Upright: same content, not rotated; Night and Day: band text contrast >= 4.5:1, turned text readable;
//   - nothing spoken without Speak; only the setting is stored.
//   node packages/web/test/e2e/partner.mjs   (BASE_URL; SHOTS_DIR to save shots)
import { mkdirSync } from 'node:fs';
import { BASE_URL, addTheirLine, check, closeShow, done, loadPlaywright, openApp, stubSpeech, waitFor, settingsGroup } from './lib.mjs';

const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png` });
const KEYS = { a: 2, b: 2, c: 2, d: 3, e: 3, f: 3, g: 4, h: 4, i: 4, j: 5, k: 5, l: 5, m: 6, n: 6, o: 6, p: 7, q: 7, r: 7, s: 7, t: 8, u: 8, v: 8, w: 9, x: 9, y: 9, z: 9 };
const enc = (w) => [...w.toLowerCase()].filter((c) => KEYS[c]).map((c) => KEYS[c]).join('');

// [name, vw, vh, sw, sh, band]
const DEVICES = [
  ['iPhone SE, Safari', 375, 549, 375, 667, 'none'],
  ['iPhone SE, installed app', 375, 647, 375, 667, 'compact'],
  ['iPhone SE, Safari Bottom tab bar', 375, 495, 375, 667, 'none'],
  ['iPhone 17 Pro, Safari Bottom tab bar', 402, 654, 402, 874, 'compact'],
  ['iPhone 16e, Safari', 390, 699, 390, 844, 'compact'],
  ['iPhone 17 Pro, Safari', 402, 714, 402, 874, 'compact'],
  ['iPhone 17 Pro Max, Safari', 440, 796, 440, 956, 'full'],
  ['Android 360x800, Chrome', 360, 668, 360, 800, 'compact'],
  ['Android 412x915, Chrome', 412, 783, 412, 915, 'full'],
  ['iPhone 17 Pro sideways', 874, 330, 874, 402, 'none'],
  ['Android 412x915 sideways', 915, 360, 915, 412, 'none'],
  ['iPad mini', 744, 1047, 744, 1133, 'full'],
  ['iPad mini, 2 tabs', 744, 1005, 744, 1133, 'full'],
  ['iPad mini landscape', 1133, 658, 1133, 744, 'none'],
  ['iPad mini landscape, 2 tabs', 1133, 616, 1133, 744, 'none'],
  ['iPad / iPad Air 11"', 820, 1094, 820, 1180, 'full'],
  ['iPad / iPad Air 11" landscape', 1180, 734, 1180, 820, 'compact'],
  ['iPad Pro 11"', 834, 1124, 834, 1210, 'full'],
  ['iPad Pro 11" landscape', 1210, 748, 1210, 834, 'compact'],
  ['iPad Pro 13"', 1032, 1290, 1032, 1376, 'full'],
  ['iPad Pro 13" landscape', 1376, 946, 1376, 1032, 'full'],
  ['iPad Air 13", narrowest window (iPadOS 26)', 375, 840, 1024, 1366, 'full'],
  ['Android tablet 10"', 800, 1200, 800, 1280, 'full'],
  ['Android tablet 10" landscape', 1280, 720, 1280, 800, 'compact'],
  // The 620-639px band where the header used to overflow by 7px (impl-6), and the compact edge.
  ['390x620', 390, 620, 390, 844, 'none'],
  ['390x627', 390, 627, 390, 844, 'none'],
  ['360x630', 360, 630, 360, 800, 'none'],
  ['390x639', 390, 639, 390, 844, 'none'],
  ['375x640', 375, 640, 375, 667, 'compact'],
  ['390x711', 390, 711, 390, 844, 'compact'],
  ['390x712', 390, 712, 390, 844, 'compact'],
];
const SENTENCES = ['I need water', 'Can you call my daughter', 'What time is the appointment', 'Thank you so much', 'No the other one'];

const engine = process.env.ENGINE ?? 'chromium';
const browser = await loadPlaywright()[engine].launch();
console.log(`partner strip on ${BASE_URL} (${engine})`);

/** Turn the strip on in Settings (Settings, or Menu then Settings), by its radio. */
async function chooseStrip(page, label) {
  const direct = page.getByRole('button', { name: /^settings$/i }).first();
  if (await direct.isVisible().catch(() => false)) await direct.click();
  else {
    await page.locator('.phone-actions button', { hasText: 'Menu' }).first().click();
    await page.locator('dialog[open] button', { hasText: 'Settings' }).first().click();
  }
  await settingsGroup(page, 'Partner strip');
  await page.getByRole('radio', { name: label }).check();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'), null, { timeout: 5000 });
  // Focus is back on the opener; type on the keypad (Space on a focused button would press it).
  await page.locator('#keypad').focus();
}
const band = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('section[aria-label="Partner strip"]');
    if (!el || el.getBoundingClientRect().height === 0) return null;
    const r = el.getBoundingClientRect();
    const msg = el.querySelector('[data-flipped], p, span') ?? el;
    const cs = getComputedStyle(msg);
    return {
      text: el.textContent.trim(),
      h: Math.round(r.height),
      top: Math.round(r.top),
      flipped: !!el.querySelector('[data-flipped="true"], .is-flipped') || el.hasAttribute('data-flipped') && el.getAttribute('data-flipped') !== 'false',
      transform: cs.transform,
      focusable: el.querySelectorAll('button, a[href], input, select, textarea, [tabindex]').length,
      live: !!el.closest('[aria-live]') || el.hasAttribute('aria-live') || !!el.querySelector('[aria-live]'),
      color: cs.color,
      bg: getComputedStyle(el).backgroundColor,
      fontSize: parseFloat(cs.fontSize),
    };
  });
const spoken = (page) => page.evaluate(() => window.__spoken ?? []);
const candidateWords = (page) =>
  page.evaluate(() => {
    const t = [...document.querySelectorAll('.nl-speakbar__text, [data-rank], .nl-candidate__text, section button')].map((e) => e.textContent ?? '').join(' ');
    return [...new Set(t.toLowerCase().match(/[a-z']{2,}/g) ?? [])];
  });

function luminance(rgb) {
  const [r, g, b] = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

try {
  // ---- AC 2, 3, 6, 7, 10: content, never words before Speak (phone 440x796, full band) -----------------
  for (const theme of ['night', 'day']) {
    const ctx = await browser.newContext({ viewport: { width: 440, height: 796 }, screen: { width: 440, height: 956 }, hasTouch: true, isMobile: engine === 'chromium', reducedMotion: 'reduce', serviceWorkers: 'block' });
    await ctx.addInitScript((t) => localStorage.setItem('nl-theme', t), theme);
    await stubSpeech(ctx);
    const page = await ctx.newPage();
    await openApp(page);
    check((await band(page)) === null, `(${theme}) AC 1 no band by default`);
    await chooseStrip(page, 'Turned to face the person opposite');
    const b0 = await band(page);
    check(!!b0 && b0.text === '', `(${theme}) the band is empty before anything is typed or said ("${b0?.text}")`);
    let leaks = [];
    for (const s of SENTENCES) {
      const ws = s.split(' ');
      for (let i = 0; i < ws.length; i++) {
        if (i) await page.keyboard.press('Space');
        for (const d of enc(ws[i])) {
          await page.keyboard.press(d);
          const b = await band(page);
          const words = await candidateWords(page);
          // Exactly "Typing…": nothing of the sentence, its keys or a candidate (words on screen, for the record).
          if (!b || b.text !== 'Typing…') leaks.push(`${s}@${d}: "${b?.text}" (on screen: ${words.slice(0, 5).join(' ')})`);
        }
      }
      const b1 = await band(page);
      check(!!b1 && b1.flipped, `(${theme}) 33.2 "Typing…" is turned 180° (${b1?.transform})`);
      await page.locator('.phone-actions button', { hasText: 'Speak' }).first().tap();
      await page.waitForTimeout(250);
      await closeShow(page);
      const said = (await spoken(page)).at(-1) ?? '';
      const b2 = await band(page);
      check(!!b2 && b2.text === said && said.length > 0, `(${theme}) AC 3 after Speak the band shows exactly what was said ("${b2?.text}" / "${said}")`);
      await page.locator('#keypad').focus();
      await page.keyboard.press('2');
      check((await band(page))?.text === 'Typing…', `(${theme}) AC 3 the next key shows "Typing…"`);
      await page.keyboard.press('Backspace');
    }
    check(leaks.length === 0, `(${theme}) AC 2 the band said only "Typing…" at every keystroke of 5 sentences (${leaks.slice(0, 3).join('; ') || 'no leak'})`);
    const b = await band(page);
    check(!!b && b.focusable === 0 && !b.live, `(${theme}) AC 6, 7 the band has nothing focusable and is not a live region`);
    check(!!b && contrast(b.color, b.bg) >= 4.5, `(${theme}) AC 13 band text contrast ${b ? contrast(b.color, b.bg).toFixed(2) : '?'}:1`);
    await shot(page, `turned-${theme}`);
    check((await spoken(page)).length === SENTENCES.length, `(${theme}) 12.5 only the ${SENTENCES.length} Speak presses spoke (${(await spoken(page)).length})`);
    // AC 5: their line empties it.
    await addTheirLine(page, 'Do you want tea?');
    check((await band(page))?.text === '', `(${theme}) AC 5 a They said line empties the band`);
    await ctx.close();
  }

  // ---- AC 8: the 24 sizes ---------------------------------------------------------------------------
  for (const [name, vw, vh, sw, sh, want] of DEVICES) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, screen: { width: sw, height: sh }, hasTouch: true, isMobile: engine === 'chromium', reducedMotion: 'reduce', serviceWorkers: 'block' });
    await stubSpeech(ctx);
    const page = await ctx.newPage();
    const label = `${name} ${vw}x${vh}`;
    if (vw > vh && Math.min(sw, sh) < 600) {
      await page.goto(BASE_URL + '/app');
      await page.locator('.rotate').waitFor({ timeout: 15000 });
      check((await band(page)) === null, `${label}: sideways, no band`);
      await ctx.close();
      continue;
    }
    await openApp(page);
    await chooseStrip(page, 'Turned to face the person opposite');
    await page.locator('#keypad').focus();
    // Let the layout settle after Settings closes (the keypad area is measured by a ResizeObserver).
    await page.waitForTimeout(300);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const pad0 = await page.evaluate(() => JSON.stringify(document.querySelector('.nl-keypad').getBoundingClientRect()));
    for (const d of '4 6333 92837 75327 263 7663 27323') await page.keyboard.press(d === ' ' ? 'Space' : d);
    await page.waitForTimeout(150);
    const b = await band(page);
    const got = !b ? 'none' : b.h <= 80 ? 'compact' : 'full';
    check(got === want, `${label}: 33.5 band ${got} (want ${want}${b ? `, ${b.h}px` : ''})`);
    const m = await page.evaluate(() => {
      const vh = innerHeight;
      const keys = [...document.querySelectorAll('button[data-key]')].map((k) => k.getBoundingClientRect());
      const visible = (el) => el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden';
      const small = [...document.querySelectorAll('.app button, .app a[href], .app input')].filter((el) => visible(el) && !el.closest('dialog') && !el.closest('.nl-skip')).filter((el) => el.getBoundingClientRect().height < 55.5 || el.getBoundingClientRect().width < 55.5).length;
      const tiny = [...document.querySelectorAll('.app *')].filter((el) => el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && visible(el) && !el.closest('.nl-sr-only') && parseFloat(getComputedStyle(el).fontSize) < 15.5).length;
      return { minKey: Math.min(...keys.map((k) => Math.min(k.width, k.height))), small, tiny, scroll: document.documentElement.scrollHeight - vh, theySaid: !!document.querySelector('.header-partner--empty, .thread-strip__actions') };
    });
    const pad1 = await page.evaluate(() => JSON.stringify(document.querySelector('.nl-keypad').getBoundingClientRect()));
    check(m.minKey >= 71.5, `${label}: keys at least 72px (${Math.round(m.minKey)})`);
    check(m.small === 0 && m.tiny === 0, `${label}: targets >= 56px (${m.small} small), text >= 16px (${m.tiny} small)`);
    check(m.scroll <= 1, `${label}: no page scroll (${m.scroll}px)`);
    check(pad0 === pad1, `${label}: the keypad did not move while typing`);
    if (want === 'compact' && vh <= 711 && vw < vh) check(!m.theySaid, `${label}: compact band up to 711px: the header (They said) is in Menu`);
    await shot(page, `size-${vw}x${vh}`);
    await ctx.close();
  }

  // ---- Upright, laptop, quick reply, Show --------------------------------------------------------------
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await stubSpeech(ctx);
    const page = await ctx.newPage();
    await openApp(page);
    const before = await page.evaluate(() => Object.keys(localStorage).sort().join());
    await chooseStrip(page, 'Upright, for someone beside you');
    await page.keyboard.press('4');
    const b = await band(page);
    check(!!b && b.text === 'Typing…' && !b.flipped, `AC 9 Upright: "Typing…" not rotated (${b?.transform})`);
    await page.keyboard.press('Backspace');
    await page.locator('.quick-reply', { hasText: 'Yes.' }).first().click();
    await page.waitForTimeout(200);
    await closeShow(page);
    check((await band(page))?.text === 'Yes.', `AC 4 a quick reply shows on the band ("${(await band(page))?.text}")`);
    await shot(page, 'laptop-upright');
    const after = await page.evaluate(() => Object.keys(localStorage).sort().join());
    check(before === after, `AC 11 no new localStorage keys (${after})`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
done('partner');
