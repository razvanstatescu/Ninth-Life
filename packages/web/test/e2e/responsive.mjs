// Phones and tablets (web-ui Req 15.8-15.11, 24, 25; ADR-003). Touch devices are emulated with their
// screen size (the app tells phones from tablets by the shorter screen side) and the height a page
// really gets (docs/research/mobile-aac-evidence.md, one-screen-tablets.md). For every view:
//   - phones held sideways show only the turn-upright screen;
//   - otherwise the main screen does not scroll at all, and the keypad, Speak, Menu, Show, Clear and
//     the suggestions are all on screen (under 548px tall a phone has no suggestion row, Req 24.9);
//     nothing scrolls sideways; keys are at least 72px, other
//     targets at least 56px and app text at least 16px; the keypad does not move while a long
//     sentence is typed (keyguards, motor memory);
//   - before the first key the area holds the quick replies (web-ui Req 28): equal cells at least 56px,
//     none cut, and the keypad stays where it is when the first key swaps them for the sentences;
//   - after a new "they said" line the reply types (web-ui Req 29) take the area's last row (by the keys)
//     where it has 2 or more rows: cells at least 56px, none cut, nothing scrolls, and the keypad box is identical with and
//     without them; Ask then shows as a word in the key line where that line is shown.
// Keys are tapped at a person's pace (the accept delay ignores same-key repeats < 150 ms).
//   node packages/web/test/e2e/responsive.mjs   (needs `next start`; BASE_URL, default :3202)
//   ENGINE=webkit node ...                      (Safari's engine; CI runs Chromium)
import { BASE_URL, addTheirLine, check, closeShow, done, loadPlaywright, openApp } from './lib.mjs';

// [name, visible width, visible height, screen width, screen height]
const DEVICES = [
  // Phones, portrait: Safari with its toolbar showing (iOS 26 Compact tab bar), Chrome, installed app.
  ['iPhone SE, Safari', 375, 549, 375, 667],
  ['iPhone SE, installed app', 375, 647, 375, 667],
  // Safari with the Bottom tab bar (measured, docs/research/mobile-aac-evidence.md §1): the floor.
  ['iPhone SE, Safari Bottom tab bar', 375, 495, 375, 667],
  ['iPhone 17 Pro, Safari Bottom tab bar', 402, 654, 402, 874],
  ['iPhone 16e, Safari', 390, 699, 390, 844],
  ['iPhone 17 Pro, Safari', 402, 714, 402, 874],
  ['iPhone 17 Pro Max, Safari', 440, 796, 440, 956],
  ['Android 360x800, Chrome', 360, 668, 360, 800],
  ['Android 412x915, Chrome', 412, 783, 412, 915],
  // Phones held sideways: portrait only (ADR-003).
  ['iPhone 17 Pro sideways', 874, 330, 874, 402],
  ['Android 412x915 sideways', 915, 360, 915, 412],
  // Tablets, both orientations: Safari on iPadOS 26 with its toolbar showing, measured in the
  // simulator (docs/research/one-screen-tablets.md); "2 tabs" adds Safari's tab bar (the floor).
  ['iPad mini', 744, 1047, 744, 1133],
  ['iPad mini, 2 tabs', 744, 1005, 744, 1133],
  ['iPad mini landscape', 1133, 658, 1133, 744],
  ['iPad mini landscape, 2 tabs', 1133, 616, 1133, 744],
  ['iPad / iPad Air 11"', 820, 1094, 820, 1180],
  ['iPad / iPad Air 11" landscape', 1180, 734, 1180, 820],
  ['iPad Pro 11"', 834, 1124, 834, 1210],
  ['iPad Pro 11" landscape', 1210, 748, 1210, 834],
  ['iPad Pro 13"', 1032, 1290, 1032, 1376],
  ['iPad Pro 13" landscape', 1376, 946, 1376, 1032],
  ['iPad Air 13", narrowest window (iPadOS 26)', 375, 840, 1024, 1366],
  // Android tablets: estimates (no emulator measured).
  ['Android tablet 10"', 800, 1200, 800, 1280],
  ['Android tablet 10" landscape', 1280, 720, 1280, 800],
  // 620-639px tall: the header used to overflow by 7px here (2026-11-16); it now hides under 640px.
  ['Phone 390x620', 390, 620, 390, 844],
  ['Phone 390x627', 390, 627, 390, 844],
  ['Phone 360x630', 360, 630, 360, 800],
  ['Phone 390x639', 390, 639, 390, 844],
  ['iPhone SE, 375x640', 375, 640, 375, 667],
];
const LONG = '4 6333 92837 75327 263 7663 27323'; // "i need water please and some bread"
// Web-ui Req 27: a long "they said" line for the thread (header button, strip or Menu).
const THEM_LONG = 'Would you like some tea or coffee with your lunch today, or just a glass of cold water from the kitchen?';

const engine = process.env.ENGINE ?? 'chromium';
const pw = loadPlaywright();
const browser = await pw[engine].launch();
console.log(`responsive check on ${BASE_URL} (${engine})`);

try {
  for (const [name, vw, vh, sw, sh] of DEVICES) {
    const label = `${name} ${vw}x${vh}`;
    const ctx = await browser.newContext({
      viewport: { width: vw, height: vh },
      screen: { width: sw, height: sh },
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: engine === 'chromium',
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    });
    const page = await ctx.newPage();
    console.log(label);
    if (vw > vh && Math.min(sw, sh) < 600) {
      await page.goto(BASE_URL + '/app', { waitUntil: 'load' });
      await page.locator('.rotate').waitFor({ state: 'visible', timeout: 15000 });
      const r = await page.evaluate(() => ({
        text: document.querySelector('.rotate')?.textContent ?? '',
        keys: document.querySelectorAll('button[data-key]').length,
        scroll: document.documentElement.scrollHeight - innerHeight,
      }));
      check(/turn your phone upright/i.test(r.text) && r.keys === 0, 'a phone held sideways shows only the turn-upright screen');
      check(r.scroll <= 1, `the turn-upright screen fits (${r.scroll}px over)`);
      await ctx.close();
      continue;
    }
    await openApp(page);
    // Let the keypad area's first measurement land (ResizeObserver) before taking the baseline.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const padTop = () => page.evaluate(() => document.querySelector('.nl-keypad').getBoundingClientRect().top + window.scrollY);
    const before = await padTop();
    // Web-ui Req 28.1, 28.6: the quick replies hold the area before the first key.
    const qr = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('.quick-replies--area .quick-reply')];
      const area = document.querySelector('.quick-replies--area');
      const vh = window.innerHeight;
      return {
        texts: cells.map((c) => c.textContent),
        small: cells.filter((c) => c.getBoundingClientRect().height < 55.5 || c.getBoundingClientRect().width < 55.5).length,
        cut: cells.filter((c) => c.scrollWidth > c.clientWidth + 1 || c.scrollHeight > c.clientHeight + 1).length,
        widths: [...new Set(cells.map((c) => Math.round(c.getBoundingClientRect().width)))],
        inside: !area || (area.getBoundingClientRect().top >= -0.5 && area.getBoundingClientRect().bottom <= vh + 0.5),
        live: area ? area.querySelectorAll('[aria-live], [role="status"]').length : 0,
        pageScroll: document.documentElement.scrollHeight - vh,
      };
    });
    const qrShort = vh < 548 && vw < vh;
    if (qrShort) check(qr.texts.length === 0, '28.4 a short phone has no replies on screen (Menu > Quick replies)');
    else {
      check(qr.texts.slice(0, 3).join(' ') === 'Hold on. Yes. No.', `28.1 the quick replies hold the area (${qr.texts.join(' ')})`);
      check(qr.small === 0 && qr.cut === 0 && qr.widths.length === 1, `28.1 equal cells (${qr.widths.join(', ')}px wide), at least 56px, none cut`);
      check(qr.inside && qr.live === 0 && qr.pageScroll <= 1, `28.6 the replies are on screen, not a live region, and nothing scrolls (${qr.pageScroll}px over)`);
    }
    // Web-ui Req 32.1, accessibility rule 1: with a one-word sentence the sentence button (Fix a word) is at least 56px
    // tall, or not there at all (a card of one 48px line; Menu > Fix a word instead).
    await page.locator('button[data-key="4"]').first().tap();
    await page.waitForTimeout(170);
    const fixH = await page.evaluate(() => {
      const e = document.querySelector('.nl-speakbar__fix');
      return e ? Math.round(e.getBoundingClientRect().height) : null;
    });
    check(fixH === null || fixH >= 56, `32.1 the sentence button is at least 56px tall or absent (${fixH === null ? 'absent' : `${fixH}px`})`);
    await page.locator('button[data-key="*"]').first().tap();
    await page.waitForTimeout(170);
    for (const ch of LONG) {
      await page.locator(`button[data-key="${ch === ' ' ? '0' : ch}"]`).first().tap();
      await page.waitForTimeout(170);
    }
    const after = await padTop();
    await page.evaluate(() => window.scrollTo(0, 0));
    const m = await page.evaluate(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const onScreen = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.top >= -0.5 && r.bottom <= vh + 0.5 && r.left >= -0.5 && r.right <= vw + 0.5;
      };
      const keys = [...document.querySelectorAll('button[data-key]')].map((k) => k.getBoundingClientRect());
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      };
      const small = [...document.querySelectorAll('.app button, .app a[href], .app input, .app select')]
        .filter((el) => visible(el) && !el.closest('.nl-skip') && !el.closest('dialog'))
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.height < 55.5 || r.width < 55.5;
        })
        .map((el) => (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 20));
      const tiny = [...document.querySelectorAll('.app *')]
        .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && visible(el) && !el.closest('dialog'))
        .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
        .map((el) => el.className || el.tagName);
      return {
        layout: [...document.querySelector('.app').classList].join(' '),
        pageScroll: document.documentElement.scrollHeight - vh,
        hScroll: document.documentElement.scrollWidth > vw + 1,
        shown: {
          keypad: onScreen('.nl-keypad'),
          Speak: onScreen('[data-action="speak"]'),
          Menu: onScreen('.phone-actions .nl-btn'),
          Show: onScreen('.phone-actions .nl-btn:last-child'),
          sentence: onScreen('.phone-card'),
          Clear: onScreen('.phone-card__clear, .phone-card__undo'),
          suggestions: onScreen('.phone-sugg'),
        },
        hasSugg: document.querySelector('.phone-sugg') !== null,
        minKey: Math.round(Math.min(...keys.map((k) => Math.min(k.width, k.height)))),
        small,
        tiny,
      };
    });
    // A short phone has no suggestion row (web-ui Req 24.9): STACK_SHORT_QUERY is '(max-height: 547px)'.
    const short = vh < 548 && /app--stack/.test(m.layout);
    if (short) {
      check(!m.hasSugg, 'a short phone drops the suggestion row (Sentences is in Menu)');
      delete m.shown.suggestions;
    }
    const missing = Object.entries(m.shown).filter(([, ok]) => !ok).map(([k]) => k);
    check(/app--shell/.test(m.layout), `the one-screen shell is used (${m.layout.replace('app ', '')})`);
    check(m.pageScroll <= 1, `the main screen does not scroll (${m.pageScroll}px over)`);
    check(!m.hScroll, 'no sideways scrolling');
    check(missing.length === 0, `keypad, Speak, Menu, Show, sentence${short ? ' and Clear' : ', Clear and suggestions'} all on screen${missing.length ? `; missing: ${missing.join(', ')}` : ''}`);
    check(m.minKey >= 72, `keys are at least 72px (${m.minKey})`);
    check(m.small.length === 0, `every target is at least 56px${m.small.length ? `: ${m.small.join(', ')}` : ''}`);
    check(m.tiny.length === 0, `no app text under 16px${m.tiny.length ? `: ${m.tiny.slice(0, 3).join(', ')}` : ''}`);
    check(Math.abs(after - before) < 0.5, `the keypad did not move while typing a long sentence (${Math.round(after - before)}px)`);

    // Web-ui Req 27.4-27.6: a conversation of 2 turns (a long "they said", then the sentence spoken).
    // The keys keep their size and place, nothing scrolls, and the thread shows where it should.
    const keyBox = () =>
      page.evaluate(() => {
        const r = document.querySelector('button[data-key="5"]').getBoundingClientRect();
        return { top: r.top + window.scrollY, w: r.width, h: r.height };
      });
    const k0 = await keyBox();
    await addTheirLine(page, THEM_LONG);
    await page.locator('[data-action="speak"]').first().tap();
    await page.waitForTimeout(150);
    await closeShow(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    const k1 = await keyBox();
    const th = await page.evaluate(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const shown = (el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.top >= -0.5 && r.bottom <= vh + 0.5 && r.left >= -0.5 && r.right <= vw + 0.5;
      };
      const strip = document.querySelector('.thread-strip');
      const bubble = document.querySelector('.thread-bubble');
      const btns = [...document.querySelectorAll('[data-thread] button, .thread-bubble')].filter((b) => b.getBoundingClientRect().width > 0);
      return {
        pageScroll: document.documentElement.scrollHeight - vh,
        strip: shown(strip),
        stripRows: strip ? strip.querySelectorAll('.thread-row').length : 0,
        stripH: strip ? Math.round(strip.getBoundingClientRect().height) : 0,
        bubble: shown(bubble),
        bubbleName: bubble?.getAttribute('aria-label') ?? '',
        small: btns.filter((b) => b.getBoundingClientRect().height < 55.5 || b.getBoundingClientRect().width < 55.5).length,
        tiny: [...document.querySelectorAll('[data-thread] *, .thread-bubble *')].filter((e) => e.textContent.trim() && e.getBoundingClientRect().width > 0 && parseFloat(getComputedStyle(e).fontSize) < 16).length,
      };
    });
    const expect = /app--split/.test(m.layout) || (vh >= 1150 && /app--stack/.test(m.layout)) ? 'strip' : vh >= 640 ? 'bubble' : 'menu';
    check(th.pageScroll <= 1, `27.6 with a conversation the main screen still does not scroll (${th.pageScroll}px over)`);
    check(Math.abs(k1.top - k0.top) < 0.5 && Math.abs(k1.w - k0.w) < 0.5 && Math.abs(k1.h - k0.h) < 0.5, `27.6 the conversation did not move or resize the keys (${Math.round(k1.top - k0.top)}px, ${Math.round(k0.h)} -> ${Math.round(k1.h)}px tall)`);
    if (expect === 'strip') check(th.strip && th.stripRows === 2 && !th.bubble && th.stripH === 132, `27.5 the strip shows the newest 2 turns at a fixed height, 2 x 56 + 8px and 12px of scan-ring room (${th.stripRows} rows, ${th.stripH}px)`);
    else if (expect === 'bubble') check(th.bubble && !th.strip && th.bubbleName === `They: ${THEM_LONG}`, `27.4 the header button shows their newest line, not yours again ("${th.bubbleName.slice(0, 30)}")`);
    else check(!th.bubble && !th.strip, '27.6 under 640px the thread is not on the screen (Menu > Conversation)');
    check(th.small === 0 && th.tiny === 0, `the thread's targets are at least 56px and its text at least 16px (${th.small} small, ${th.tiny} tiny)`);

    // Web-ui Req 29.5: their new line brings the reply types; the keypad box stays exactly the same.
    const padBox = () =>
      page.evaluate(() => {
        const r = document.querySelector('.nl-keypad').getBoundingClientRect();
        return [r.top + window.scrollY, r.left, r.width, r.height].map((n) => Math.round(n * 10) / 10);
      });
    const p0 = await padBox();
    await addTheirLine(page, 'Are you coming to the party tonight?');
    await page.evaluate(() => window.scrollTo(0, 0));
    const p1 = await padBox();
    const rt = await page.evaluate(() => {
      const vh = window.innerHeight;
      const cells = [...document.querySelectorAll('[data-section="cands"] .reply-type')];
      return {
        texts: cells.map((c) => c.textContent),
        small: cells.filter((c) => c.getBoundingClientRect().height < 55.5 || c.getBoundingClientRect().width < 55.5).length,
        cut: cells.filter((c) => c.scrollWidth > c.clientWidth + 1 || c.scrollHeight > c.clientHeight + 1).length,
        tiny: cells.filter((c) => parseFloat(getComputedStyle(c).fontSize) < 16).length,
        inside: cells.every((c) => c.getBoundingClientRect().bottom <= vh + 0.5 && c.getBoundingClientRect().top >= -0.5),
        pageScroll: document.documentElement.scrollHeight - vh,
        rows: document.querySelectorAll('.quick-replies--area .quick-replies__row').length,
        group: (() => {
          const g = document.querySelector('[data-section="cands"] [role="group"]');
          return g ? (g.getAttribute('aria-label') ?? document.getElementById(g.getAttribute('aria-labelledby') ?? '')?.textContent ?? null) : null;
        })(),
        last: !!document.querySelector('.quick-replies--area .quick-replies__row:last-of-type .reply-types'),
      };
    });
    const twoRows = rt.rows >= 2;
    if (twoRows) {
      check(rt.texts.join(' ') === 'Agree Disagree Ask' && rt.group === 'Reply type' && rt.last, `29.1 the reply types take the area's last row, by the keys (${rt.texts.join(' ') || 'none'})`);
      check(rt.small === 0 && rt.cut === 0 && rt.tiny === 0 && rt.inside, '29.5 reply types at least 56px, 16px text or larger, none cut, on screen');
    } else check(rt.texts.length === 0, `29.5 with ${rt.rows} row(s) the reply types are in the sheets, not the area`);
    check(rt.pageScroll <= 1, `29.5 with the reply types nothing scrolls (${rt.pageScroll}px over)`);
    check(p0.join() === p1.join(), `29.5 the keypad box is identical with and without the reply types (${p0.join(',')} / ${p1.join(',')})`);
    if (twoRows) {
      await page.locator('[data-section="cands"] [data-intent="ask"]').first().tap();
      const pressedOk = await page.evaluate(() => document.querySelector('[data-section="cands"] [data-intent="ask"]')?.getAttribute('aria-pressed') === 'true');
      const ring = await page.evaluate(() => getComputedStyle(document.querySelector('[data-section="cands"] [data-intent="ask"]')).boxShadow);
      check(pressedOk && /inset/.test(ring) && !/255, 177, 61/.test(ring), `29.5 Ask pressed shows an inner ring, never ember (${ring.slice(0, 40)})`);
      await page.locator('button[data-key="3"]').first().tap();
      await page.waitForTimeout(170);
      const kl = await page.evaluate(() => {
        const d = document.querySelector('.nl-speakbar__digits');
        const t = document.querySelector('.nl-speakbar__tag');
        const shown = d && getComputedStyle(d).display !== 'none' && d.getBoundingClientRect().height > 0;
        return { shown, tag: t ? t.getBoundingClientRect().width > 0 && t.textContent : null, utter: document.getElementById('utterance')?.textContent ?? '' };
      });
      const p2 = await padBox();
      if (kl.shown) check(/Ask/.test(kl.tag || ''), `29.6 the key line starts with the reply type ("${kl.tag}")`);
      check(/\?$/.test(kl.utter.trim()), `29.3 Ask adds "?" (${kl.utter})`);
      check(p0.join() === p2.join(), '29.5 the keypad did not move on the first key after Ask');
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
done('responsive');
