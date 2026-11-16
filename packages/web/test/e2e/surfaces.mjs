// The container system for menus, sheets and popups (web-ui Req 36, ADR-011), end to end.
//
// Part 1, the walkthrough (one pass per device class): a phone's Menu, Fix a word and Phrases; a short phone; the
// tablet Menu rising from its button; the laptop's Fix popover, Phrases panel and Settings dialog; Back, backdrop,
// focus, Back to Menu, new-tab links and scanning.
//
// Part 2, the matrix: every surface on every device class (phone 390x844 and 375x667, short phone 375x549,
// tablet 820x1180 and 1180x820, laptop 1280x800), checked against the design's acceptance rules:
//   - the container: phones get a bottom sheet with its content's height (fit) or a full-height sheet with a
//     Done bar (panel, Settings); short phones (< 548px) get full height; large screens get a popover next to
//     its trigger (fit), a 440px side panel on the trigger's side (panel), or a centred dialog (Settings);
//   - Close is the first scan row (Back to Menu the second when the Menu opened it); Escape closes; focus moves
//     in and goes back to the trigger;
//   - browser Back closes the surface and stays on /app (one history entry, popped again by Close);
//   - a press on the backdrop closes it, except while scanning, with unsaved text, with a confirm showing,
//     and in its first 300 ms;
//   - website links open in a new tab; the main screen never scrolls (phones and tablets);
//   - every control is at least 56px, text at least 16px; every control is in a scan row and can be scrolled
//     into view inside the surface; surfaces open and close with two switches (Space moves, Enter chooses);
// plus the phone Menu (about 1.2 screens on 375x667, Phrases and Settings without scrolling), Settings
// (drill-in with Back on phones, two panes on large screens), Voice, More, the status button, They said above
// the on-screen keyboard, Phrases rows with a More action, the one confirm style, Save phrase feedback in place (no snackbar) and naming.
// Each matrix check is tagged with the build phase it belongs to ([P1] containers and closing, [P2] Menu, Voice,
// More, Status, [P3] Settings, [P4] They said, Phrases rows, confirms, Save phrase feedback, naming).
//
//   node packages/web/test/e2e/surfaces.mjs        (BASE_URL, default :3202; ENGINE=webkit)
//   Filters: DEVICES=p390,l1280  SURFACES=menu,fix  PHASE=1,2  THEME=day  SWITCH=0 (no two-switch runs)
//            WALK=0 (skip part 1)  MATRIX=0 (skip part 2)  SHOTS=<dir> (screenshots)  RESULTS=<file.jsonl>
import { appendFileSync, mkdirSync } from 'node:fs';
import { BASE_URL, check, done, loadPlaywright, newContext, openApp as libOpenApp, stubSpeech, waitFor, settingsGroup } from './lib.mjs';

const engine = process.env.ENGINE ?? 'chromium';
const THEME = process.env.THEME ?? 'night';
const SHOTS = process.env.SHOTS ?? process.env.SHOTS_DIR ?? null;
const RESULTS = process.env.RESULTS ?? null;
const PHASES = (process.env.PHASE ?? '1,2,3,4').split(',').map(Number);
const ONLY_SURFACES = process.env.SURFACES ? process.env.SURFACES.split(',') : null;
const RUN_SWITCH = process.env.SWITCH !== '0';
const RUN_WALK = process.env.WALK !== '0' && !process.env.DEVICES && !process.env.SURFACES;
const RUN_MATRIX = process.env.MATRIX !== '0';
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const browser = await loadPlaywright()[engine].launch();
console.log(`surfaces on ${BASE_URL} (${engine}, ${THEME})`);

// ============================================================================================== part 1: walkthrough
async function walkthrough() {
  const sshot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/walk-${name}.png` });
  const touchCtx = async (width, height) => {
    const ctx = await browser.newContext({ viewport: { width, height }, screen: { width, height }, hasTouch: true, isMobile: engine === 'chromium', reducedMotion: 'reduce', serviceWorkers: 'block' });
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem('nl-theme', 'night');
      } catch {
        /* storage off */
      }
    });
    await stubSpeech(ctx);
    return ctx;
  };
  const rect = (page, sel) => page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight, kind: el.getAttribute('data-kind'), side: el.getAttribute('data-side') };
  }, sel);
  const openDialog = (page) => rect(page, 'dialog[open]');
  const isOpenNamed = (page, name) => page.evaluate((n) => !!document.querySelector(`dialog[data-overlay="${n}"][open]`), name);
  const closed = (page) => waitFor(page, () => !document.querySelector('dialog[open]'), null, { what: 'no surface open', timeout: 4000 });
  const typeHi = async (page) => {
    await page.keyboard.press('4');
    await page.keyboard.press('4');
  };
  const clickIn = (page, name, text) => page.locator(`dialog[data-overlay="${name}"][open] button`, { hasText: text }).first().click();

  {
    // ---- phone 390x844 ------------------------------------------------------------------------------------------
    {
      console.log('phone 390x844');
      const ctx = await touchCtx(390, 844);
      const page = await ctx.newPage();
      await libOpenApp(page);
      await typeHi(page);
      await page.keyboard.press('0');
      await typeHi(page);
      await page.locator('.phone-actions button', { hasText: 'Menu' }).click();
      let r = await openDialog(page);
      check(r?.kind === 'fit' && r.y + r.h === r.vh && r.y >= 16 && r.w === r.vw, `36.2 Menu is a bottom sheet: bottom-anchored, full width, its top at least 16px down (${JSON.stringify(r)})`);
      await sshot(page, 'phone-menu');
      // Fix a word from the Menu: a bottom sheet with Back to Menu as the second scan row.
      await clickIn(page, 'menu', 'Fix a word');
      r = await openDialog(page);
      const rows = await page.evaluate(() => [...document.querySelectorAll('dialog[open] [data-scan-row]')].slice(0, 2).map((x) => x.getAttribute('data-scan-row')));
      check(r?.kind === 'fit' && r.y > 0 && r.y + r.h === r.vh, `36.2 Fix a word is a bottom sheet with the screen visible above (top ${r?.y})`);
      check(rows.join(',') === 'close,back', `36.6 Close then Back to Menu are the first scan rows (${rows})`);
      const focusFix = await page.evaluate(() => document.activeElement?.getAttribute('data-fix-index'));
      check(focusFix === '0', `36.9 focus is on the first word (${focusFix})`);
      await sshot(page, 'phone-fix');
      await clickIn(page, 'fix', 'Back to Menu');
      check(await isOpenNamed(page, 'menu'), '36.6 Back to Menu brings the Menu back');
      // Phrases: a full-height panel with Done at the bottom.
      await clickIn(page, 'menu', 'Phrases');
      r = await openDialog(page);
      const doneBox = await rect(page, 'dialog[open] [data-action="done"]');
      check(r?.kind === 'panel' && r.y === 0 && r.h === r.vh, `36.2 Phrases is full height on a phone (${JSON.stringify(r)})`);
      check(!!doneBox && doneBox.y + doneBox.h > r.vh - 120 && doneBox.h >= 56, `36.2 Done is at the bottom, 56px tall (${JSON.stringify(doneBox)})`);
      await sshot(page, 'phone-phrases');
      // Browser Back closes it and keeps the app (and the sentence).
      await page.goBack();
      await closed(page);
      const url = page.url();
      const digits = await page.evaluate(() => (document.querySelector('.nl-speakbar__digits')?.textContent ?? '').replace(/\D/g, ''));
      check(url.endsWith('/app') && digits === '4444', `36.3 Back closed the surface and kept the app and the sentence (${url}, ${digits})`);
      // Back again leaves the app as usual (nothing is trapped).
      // Backdrop: a press above the bottom sheet closes the Menu (after 300ms).
      await page.locator('.phone-actions button', { hasText: 'Menu' }).click();
      await page.waitForTimeout(350);
      await page.mouse.click(195, 20);
      await closed(page);
      check(true, '36.4 a press on the screen above the Menu closed it');
      const focusBack = await page.evaluate(() => document.activeElement?.textContent?.trim());
      check(focusBack === 'Menu', `36.5 focus returned to Menu (${focusBack})`);
      // They said with typed text: the backdrop keeps it.
      await page.locator('.phone-actions button', { hasText: 'Menu' }).click();
      await clickIn(page, 'menu', 'They said');
      await page.locator('dialog[open] input.input').fill('Are you hungry');
      await page.waitForTimeout(350);
      await page.mouse.click(195, 20);
      await page.waitForTimeout(150);
      check(await isOpenNamed(page, 'partner'), '36.4 a press on the backdrop keeps They said while it holds typed text');
      const cancel = await page.locator('dialog[open] button', { hasText: 'Cancel' }).count();
      check(cancel === 0, '36.8 They said has no Cancel (Close cancels)');
      await page.keyboard.press('Escape');
      await closed(page);
      // Website links open in a new tab.
      await page.locator('.phone-actions button', { hasText: 'Menu' }).click();
      const links = await page.evaluate(() => [...document.querySelectorAll('dialog[open] a[href]')].map((a) => [a.getAttribute('href'), a.target, a.textContent.trim()]));
      check(links.length >= 1 && links.every(([, t, n]) => t === '_blank' && /opens in a new tab/.test(n)), `36.7 links to the website open in a new tab (${JSON.stringify(links)})`);
      await ctx.close();
    }

    // ---- short phone 375x495: fit surfaces take the whole screen -------------------------------------------------
    {
      console.log('short phone 375x495');
      const ctx = await touchCtx(375, 495);
      const page = await ctx.newPage();
      await libOpenApp(page);
      await page.locator('.phone-actions button', { hasText: 'Menu' }).click();
      const r = await openDialog(page);
      check(r?.kind === 'fit' && r.y === 0 && r.h === r.vh, `36.2 a short phone gets a full-height Menu (${JSON.stringify(r)})`);
      await ctx.close();
    }

    // ---- tablet 820x1180 (portrait): the Menu rises from its button -----------------------------------------------
    {
      console.log('tablet 820x1180');
      const ctx = await touchCtx(820, 1180);
      const page = await ctx.newPage();
      await libOpenApp(page);
      await typeHi(page);
      const btn = await rect(page, '.phone-actions .nl-btn');
      await page.locator('.phone-actions button', { hasText: 'Menu' }).click();
      let r = await openDialog(page);
      check(r?.kind === 'fit' && r.y + r.h <= btn.y && Math.abs(r.x - btn.x) <= 2 && r.w <= 480, `36.2 Menu is a popover above its button, on its left (${JSON.stringify({ r, btn })})`);
      await sshot(page, 'tablet-menu');
      await clickIn(page, 'menu', 'Phrases');
      r = await openDialog(page);
      check(r?.kind === 'panel' && r.side === 'left' && r.x === 0 && r.w === 440, `36.2 Phrases from the Menu is a left side panel (${JSON.stringify(r)})`);
      await page.waitForTimeout(350);
      await page.mouse.click(700, 600);
      await closed(page);
      check(true, '36.4 a press beside the panel closed it');
      await ctx.close();
    }

    // ---- laptop 1280x800 ----------------------------------------------------------------------------------------
    {
      console.log('laptop 1280x800');
      const ctx = await newContext(browser, { width: 1280, height: 800 });
      await stubSpeech(ctx);
      const page = await ctx.newPage();
      await libOpenApp(page);
      await typeHi(page);
      const fixBtn = await rect(page, '[data-action="fix-word"]');
      await page.locator('[data-action="fix-word"]').click();
      let r = await openDialog(page);
      const inside = r && r.x >= 16 && r.y >= 16 && r.x + r.w <= r.vw - 16 && r.y + r.h <= r.vh - 16;
      const near = r && (Math.abs(r.y - (fixBtn.y + fixBtn.h + 8)) <= 2 || Math.abs(r.y + r.h - (fixBtn.y - 8)) <= 2);
      check(r?.kind === 'fit' && r.w <= 480 && r.w >= 360 && inside && near, `36.2 Fix a word is a popover by its button, inside the screen (${JSON.stringify({ r, fixBtn })})`);
      await sshot(page, 'laptop-fix');
      await page.keyboard.press('Escape');
      await closed(page);
      const f = await page.evaluate(() => document.activeElement?.getAttribute('data-action'));
      check(f === 'fix-word', `36.5 Escape closed it and focus went back to Fix a word (${f})`);
      // Phrases (header, right): a right side panel; the backdrop closes it.
      await page.getByRole('button', { name: /^phrases$/i }).first().click();
      r = await openDialog(page);
      check(r?.kind === 'panel' && r.side === 'right' && r.x + r.w === r.vw && r.w === 440, `36.2 Phrases is a 440px right side panel (${JSON.stringify(r)})`);
      await page.waitForTimeout(350);
      await page.mouse.click(200, 400);
      await closed(page);
      check(true, '36.4 a click beside the panel closed it');
      // Settings: a centred dialog.
      await page.getByRole('button', { name: /^settings$/i }).first().click();
      r = await openDialog(page);
      check(r?.kind === 'dialog' && Math.abs(r.x + r.w / 2 - r.vw / 2) <= 2 && r.w <= 880, `36.2 Settings is a centred dialog (${JSON.stringify(r)})`);
      await sshot(page, 'laptop-settings');
      await page.goBack();
      await closed(page);
      check(page.url().endsWith('/app'), `36.3 Back closed Settings and stayed at /app (${page.url()})`);
      // Backdrop never closes while scanning: a press there is the switch.
      await page.getByRole('button', { name: /^settings$/i }).first().click();
      await settingsGroup(page, 'Ways to type');
      await page.getByRole('radio', { name: /two switches/i }).check();
      await page.keyboard.press('Escape');
      await closed(page);
      await page.getByRole('button', { name: /^phrases$/i }).first().click();
      await page.waitForTimeout(400);
      const lit = await page.evaluate(() => document.querySelector('dialog[open] [data-scan-state]')?.getAttribute('data-scan-row'));
      check(lit === 'close', `16 36.6 scanning starts on Close (${lit})`);
      await page.mouse.click(200, 400);
      await page.waitForTimeout(300);
      check(await isOpenNamed(page, 'phrases'), '36.4 while scanning, a press on the backdrop is the switch and does not close the panel');
      await ctx.close();
    }
  }
}

// ============================================================================================== part 2: matrix
// [id] -> device. cls: phone (< 600px wide) or large. Touch devices are emulated with their screen size.
const ALL_DEVICES = {
  p390: { label: 'phone 390x844', vw: 390, vh: 844, sw: 390, sh: 844, touch: true, cls: 'phone' },
  p375: { label: 'phone 375x667', vw: 375, vh: 667, sw: 375, sh: 667, touch: true, cls: 'phone' },
  // 375x549 (iPhone SE in Safari) is the smallest phone with a suggestion row; under 548px a phone is short (ADR-005).
  s375: { label: 'phone 375x549 (SE, Safari)', vw: 375, vh: 549, sw: 375, sh: 667, touch: true, cls: 'phone' },
  s495: { label: 'short phone 375x495', vw: 375, vh: 495, sw: 375, sh: 667, touch: true, cls: 'phone', short: true },
  t820: { label: 'tablet 820x1180', vw: 820, vh: 1180, sw: 820, sh: 1180, touch: true, cls: 'large', tablet: true },
  t1180: { label: 'tablet 1180x820', vw: 1180, vh: 820, sw: 1180, sh: 820, touch: true, cls: 'large', tablet: true },
  l1280: { label: 'laptop 1280x800', vw: 1280, vh: 800, sw: 1280, sh: 800, touch: false, cls: 'large', laptop: true },
};
const DEVICES = (process.env.DEVICES ?? 'p390,p375,s375,s495,t820,t1180,l1280').split(',').map((id) => ({ id, ...ALL_DEVICES[id] }));

let failures = 0;
let passes = 0;
const failed = [];
function ck(phase, rule, dev, ok, message) {
  const tag = `[P${phase}] ${rule} ${dev}`;
  if (ok === null) console.log(`  n/a  ${tag}: ${message}`);
  else if (ok) {
    passes += 1;
    console.log(`  ok   ${tag}: ${message}`);
  } else {
    failures += 1;
    failed.push(`${tag}: ${message}`);
    console.log(`  FAIL ${tag}: ${message}`);
  }
  if (RESULTS) appendFileSync(RESULTS, JSON.stringify({ phase, rule, dev, ok, message, theme: THEME, engine }) + '\n');
}
const want = (phase) => PHASES.includes(phase);

async function newDevice(d, { keyboard = false } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: d.vw, height: d.vh },
    screen: { width: d.sw, height: d.sh },
    deviceScaleFactor: 1,
    hasTouch: d.touch,
    isMobile: d.touch && engine === 'chromium',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem('nl-theme', t);
    } catch {
      /* storage off */
    }
  }, THEME);
  await stubSpeech(ctx);
  // The Next.js dev indicator (dev server only) sits bottom-left over the phone Menu button: hide it.
  await ctx.addInitScript(() => {
    const st = document.createElement('style');
    st.textContent = 'nextjs-portal { display: none !important; }';
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(st));
  });
  // When a dialog opens, and when the last press landed: for the 300 ms backdrop rule.
  await ctx.addInitScript(() => {
    window.__openAt = 0;
    const mo = new MutationObserver((list) => {
      for (const m of list) if (m.target instanceof HTMLDialogElement && m.target.open && m.attributeName === 'open') window.__openAt = performance.now();
    });
    document.addEventListener('DOMContentLoaded', () => mo.observe(document.body, { attributes: true, attributeFilter: ['open'], subtree: true }));
    window.__pressAt = 0;
    addEventListener('pointerdown', () => (window.__pressAt = performance.now()), true);
  });
  if (keyboard) {
    // A stand-in for the on-screen keyboard: visualViewport shrinks while the layout viewport stays (iOS).
    await ctx.addInitScript(() => {
      const real = window.visualViewport;
      const listeners = { resize: new Set(), scroll: new Set() };
      window.__kb = 0;
      const fake = {
        get width() {
          return innerWidth;
        },
        get height() {
          return innerHeight - window.__kb;
        },
        get offsetTop() {
          return 0;
        },
        get offsetLeft() {
          return 0;
        },
        get pageTop() {
          return scrollY;
        },
        get pageLeft() {
          return scrollX;
        },
        get scale() {
          return real?.scale ?? 1;
        },
        addEventListener: (t, f) => listeners[t]?.add(f),
        removeEventListener: (t, f) => listeners[t]?.delete(f),
        dispatchEvent: () => true,
        onresize: null,
        onscroll: null,
      };
      Object.defineProperty(window, 'visualViewport', { value: fake, configurable: true });
      window.__setKeyboard = (px) => {
        window.__kb = px;
        for (const f of listeners.resize) f(new Event('resize'));
        fake.onresize?.(new Event('resize'));
      };
    });
  }
  const page = await ctx.newPage();
  page.__dev = d;
  return { ctx, page };
}

/** Open /app on a fresh history (about:blank first, so leaving the app is visible) and wait for the dictionary. */
async function freshApp(page) {
  await page.goto('about:blank');
  await page.goto(BASE_URL + '/app', { waitUntil: 'load' });
  await page.locator('button[data-key="4"]').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => /offline dictionary ready/i.test(document.body?.textContent ?? ''), null, { timeout: 20000, polling: 50 });
  await page.waitForTimeout(150);
}

const visible = async (loc) => (await loc.count()) > 0 && (await loc.first().isVisible().catch(() => false));

/** The first visible control named `name` (string: exact, RegExp), in the top dialog first, then the page. */
async function findControl(page, name, { inDialogOnly = false } = {}) {
  const dlg = page.locator('dialog[open]').last();
  const scopes = (await dlg.count()) ? (inDialogOnly ? [dlg] : [dlg, page]) : inDialogOnly ? [] : [page];
  for (const scope of scopes) {
    for (const role of ['button', 'link', 'menuitem', 'tab']) {
      const loc = typeof name === 'string' ? scope.getByRole(role, { name, exact: true }) : scope.getByRole(role, { name });
      const n = await loc.count();
      for (let i = 0; i < n; i++) if (await loc.nth(i).isVisible().catch(() => false)) return loc.nth(i);
    }
  }
  return null;
}

/** Press a control: a tap on touch devices, a click otherwise. */
async function pressLoc(page, loc) {
  if (page.__dev.touch) await loc.tap();
  else await loc.click();
}

/** Follow a path of steps; each step is a name or a list of alternative names. Marks the first control as the trigger. */
async function openPath(page, steps) {
  for (let i = 0; i < steps.length; i++) {
    const alts = Array.isArray(steps[i]) ? steps[i] : [steps[i]];
    let loc = null;
    for (const a of alts) if ((loc = await findControl(page, a))) break;
    if (!loc) return { ok: false, failedAt: String(alts.map(String)) };
    if (i === 0) {
      await page.evaluate(() => document.querySelectorAll('[data-test-trigger]').forEach((e) => e.removeAttribute('data-test-trigger')));
      await loc.evaluate((e) => e.setAttribute('data-test-trigger', ''));
    }
    await pressLoc(page, loc);
    await page.waitForTimeout(120);
  }
  return { ok: true };
}

async function closeAll(page) {
  for (let i = 0; i < 4 && (await page.locator('dialog[open]').count()); i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
  }
}

async function typeKeys(page, keys) {
  let last = '';
  for (const k of keys) {
    if (k === last) await page.waitForTimeout(170); // the accept delay ignores same-key repeats < 150 ms
    await page.locator(`button[data-key="${k}"]`).first().click();
    last = k;
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(250);
}
const SENTENCE = ['4', '0', '6', '3', '3', '3', '0', '9', '2', '8']; // "i need wat…": a word in progress

/** What is on screen: the top surface, measured. */
async function measure(page) {
  return page.evaluate(() => {
    const dlg = [...document.querySelectorAll('dialog[open]')].pop();
    const vw = innerWidth;
    const vh = innerHeight;
    const se = document.scrollingElement;
    const base = { vw, vh, pageScroll: Math.max(0, se.scrollHeight - vh), scrollY: Math.round(scrollY), url: location.pathname };
    if (!dlg) return { open: false, ...base };
    const rectOf = (e) => {
      const b = e.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), b: Math.round(b.bottom) };
    };
    // The visible panel: the dialog, or the child that draws the surface when the dialog fills the viewport.
    let panel = dlg;
    const dr = dlg.getBoundingClientRect();
    if (dr.width >= vw - 1 && dr.height >= vh - 1 && !dlg.classList.contains('show')) {
      const opaque = (e) => {
        const c = getComputedStyle(e).backgroundColor;
        return c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c);
      };
      if (!opaque(dlg)) {
        const inner = [...dlg.querySelectorAll('*')].find((e) => opaque(e) && e.getBoundingClientRect().width > 200);
        if (inner) panel = inner;
      }
    }
    const isVis = (e) => {
      const b = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    };
    const nameOf = (e) => (e.getAttribute('aria-label') || e.textContent || e.getAttribute('type') || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    const ctrls = [...dlg.querySelectorAll('button, a[href], input:not([type=file]):not([type=hidden]), select, textarea, [role=button], [role=tab]')].filter(isVis);
    const small = ctrls
      .map((e) => {
        const t = e.tagName === 'INPUT' && /radio|checkbox/.test(e.type) ? (e.closest('label') ?? e) : e;
        const b = t.getBoundingClientRect();
        return { n: nameOf(e), w: Math.round(b.width), h: Math.round(b.height) };
      })
      .filter((x) => x.h < 55.5 || x.w < 43.5);
    let minFont = 99;
    let minFontText = '';
    for (const e of dlg.querySelectorAll('*')) {
      if (!isVis(e)) continue;
      if (e.closest('[aria-hidden="true"]')) continue;
      const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own) continue;
      const f = parseFloat(getComputedStyle(e).fontSize);
      if (f < minFont) {
        minFont = f;
        minFontText = e.textContent.trim().slice(0, 30);
      }
    }
    const rows = [...dlg.querySelectorAll('[data-scan-row]')];
    // The scanner's cells (lib/useOverlayScan.ts SCAN_CELL_SELECTOR): buttons, links, radios, checkboxes.
    const CELL = 'button:not(:disabled), a[href], input[type="radio"]:not(:disabled), input[type="checkbox"]:not(:disabled)';
    const cellsOf = (row) => [...row.querySelectorAll(CELL)].filter((c) => c.closest('[data-scan-row]') === row && isVis(c));
    const visRows = rows.filter((r) => isVis(r));
    const firstRow = visRows[0];
    const secondRow = visRows[1];
    // Controls a switch cannot reach: enabled controls outside every scan row (text fields are typed, not scanned).
    // (A slider or the voice picker is not a cell: its row has buttons that do the same, so they are not listed.)
    const unscanned = [...dlg.querySelectorAll('button:not(:disabled), a[href], input[type="radio"]:not(:disabled), input[type="checkbox"]:not(:disabled)')]
      .filter(isVis)
      .filter((e) => !(e.closest('[data-scan-row]') && e.matches(CELL)))
      .filter((e) => !e.matches('[data-scan-skip]'))
      // The Done bar of a panel is not a scan row by design (Close is the first row and does the same).
      .filter((e) => !(e.closest('.sheet__foot') || /^done, close/i.test(e.getAttribute('aria-label') ?? '')))
      .map(nameOf);
    // A row whose buttons are disabled for now (Add with an empty field) is fine; a row with no button at all is not.
    const emptyRows = visRows.filter((r) => cellsOf(r).length === 0 && !r.querySelector('button:disabled')).map((r) => r.dataset.scanRow);
    const title = dlg.querySelector('.sheet__title, h2');
    const tb = title?.getBoundingClientRect();
    const lh = title ? parseFloat(getComputedStyle(title).lineHeight) || parseFloat(getComputedStyle(title).fontSize) * 1.2 : 0;
    const a = document.activeElement;
    const body = dlg.querySelector('.sheet__body');
    return {
      open: true,
      ...base,
      overlay: dlg.dataset.overlay ?? dlg.className,
      kind: dlg.dataset.kind ?? null,
      side: dlg.dataset.side ?? null,
      title: title?.textContent?.trim() ?? null,
      titleLines: title && lh ? Math.round(tb.height / lh) : null,
      groupTitles: [...dlg.querySelectorAll('h3, .group__title')].filter(isVis).map((h) => h.textContent.trim()),
      dialog: rectOf(dlg),
      panel: rectOf(panel),
      bodyScroll: body ? { sh: body.scrollHeight, ch: body.clientHeight } : null,
      small,
      minFont,
      minFontText,
      firstRow: firstRow ? { name: firstRow.dataset.scanRow, cells: cellsOf(firstRow).map(nameOf) } : null,
      secondRow: secondRow ? { name: secondRow.dataset.scanRow, cells: cellsOf(secondRow).map(nameOf) } : null,
      unscanned,
      emptyRows,
      focus: a ? { inside: dlg.contains(a) && a !== dlg, tag: a.tagName, name: nameOf(a), isBody: a === document.body } : null,
      links: [...dlg.querySelectorAll('a[href]')].filter(isVis).map((l) => ({ href: l.getAttribute('href'), target: l.getAttribute('target'), rel: l.getAttribute('rel') ?? '', name: nameOf(l) })),
    };
  });
}

/**
 * Every control can be brought into view inside the surface (a popover cut to the room by its button must scroll):
 * scroll each into view as the scan highlight does, then it must lie inside the surface and the screen.
 */
async function reachable(page) {
  return page.evaluate(() => {
    const dlg = [...document.querySelectorAll('dialog[open]')].pop();
    if (!dlg) return { bad: [], scrolls: false };
    const box = dlg.getBoundingClientRect();
    const isVis = (e) => {
      const b = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    };
    const ctrls = [...dlg.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea')].filter(isVis);
    const bad = [];
    const scrollers = [...dlg.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(e).overflowY));
    for (const c of ctrls) {
      const t = c.tagName === 'INPUT' && /radio|checkbox/.test(c.type) ? (c.closest('label') ?? c) : c;
      t.scrollIntoView({ block: 'nearest' });
      const r = t.getBoundingClientRect();
      const inBox = r.top >= box.top - 1 && r.bottom <= box.bottom + 1 && r.top >= -1 && r.bottom <= innerHeight + 1;
      if (!inBox) bad.push(`${(c.getAttribute('aria-label') || c.textContent || c.tagName).trim().slice(0, 30)} (${Math.round(r.top)}-${Math.round(r.bottom)} vs ${Math.round(box.top)}-${Math.round(box.bottom)})`);
    }
    for (const s of scrollers) s.scrollTop = 0;
    return { bad, scrolls: scrollers.length > 0, overflowHidden: dlg.scrollHeight > dlg.clientHeight + 2 && scrollers.length === 0 };
  });
}

/** Where the trigger is (the control that opened the surface from the main screen). */
const triggerRect = (page) =>
  page.evaluate(() => {
    const t = document.querySelector('[data-test-trigger]');
    if (!t) return null;
    const b = t.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), b: Math.round(b.bottom) };
  });

/** Gap in px between two rects (0 when they touch or overlap). */
function gap(a, b) {
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.r, b.r));
  const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.b, b.b));
  return Math.round(Math.hypot(dx, dy));
}
const overlaps = (a, b) => a.x < b.r && b.x < a.r && a.y < b.b && b.y < a.b;

/** The container check. kind: fit | panel | dialog | show. */
async function checkContainer(page, d, s, m, phase) {
  const p = m.panel;
  const { vw, vh } = m;
  const rect = `${p.w}x${p.h} at ${p.x},${p.y}`;
  const kind = s.kind(d);
  if (kind === 'show') {
    ck(phase, 'container', d.id, p.w >= vw - 1 && p.h >= vh - 1, `${s.id}: show mode fills the viewport (${rect})`);
    return;
  }
  if (d.cls === 'phone') {
    const fullHeight = p.h >= vh - 2 && p.y <= 1;
    if (kind === 'fit' && !d.short && s.id.startsWith('menu')) {
      // Lead decision: the phone Menu may grow to full height minus about 24px (and the safe area) so it does not
      // scroll when empty; its top stays at least 16px down, so it still reads as a sheet.
      const bottom = Math.abs(p.b - vh) <= 1 && p.x <= 1 && p.w >= vw - 2;
      ck(phase, 'container', d.id, bottom && p.y >= 16, `${s.id}: bottom sheet, top at least 16px down (${rect})`);
      if (s.id === 'menu' && vh >= 667) {
        const sc = m.bodyScroll ? m.bodyScroll.sh - m.bodyScroll.ch : 0;
        ck(phase, 'container', d.id, sc <= 1, `${s.id}: with nothing typed the Menu does not scroll (${sc}px over)`);
      }
    } else if (kind === 'fit' && !d.short) {
      const bottom = Math.abs(p.b - vh) <= 1 && p.x <= 1 && p.w >= vw - 2;
      const capped = p.h <= vh * 0.85 + 2;
      ck(phase, 'container', d.id, bottom && capped && p.y > 8, `${s.id}: bottom sheet with content height, max 85% (${rect}, ${Math.round((p.h / vh) * 100)}% of ${vh})`);
    } else {
      ck(phase, 'container', d.id, fullHeight && p.w >= vw - 2, `${s.id}: full-height sheet (${rect})`);
      if (kind === 'panel') {
        const done = await page.evaluate(() => {
          const dlg = [...document.querySelectorAll('dialog[open]')].pop();
          const b = [...dlg.querySelectorAll('button')].find((x) => /^done$/i.test(x.textContent.trim()) && x.getBoundingClientRect().height > 0);
          if (!b) return null;
          const r = b.getBoundingClientRect();
          return { h: Math.round(r.height), bottom: Math.round(r.bottom), inRow: !!b.closest('[data-scan-row]') };
        });
        ck(phase, 'done-bar', d.id, !!done && done.h >= 56 && done.bottom <= vh + 1 && done.bottom >= vh - 120 && !done.inRow, `${s.id}: a 56px Done bar at the bottom, not a scan row (${JSON.stringify(done)})`);
      }
    }
    return;
  }
  // Large screens.
  const t = await triggerRect(page);
  if (kind === 'fit') {
    const inside = p.x >= 0 && p.y >= 0 && p.r <= vw + 1 && p.b <= vh + 1;
    const g = t ? gap(p, t) : null;
    ck(
      phase,
      'container',
      d.id,
      p.w >= 360 && p.w <= 480 && p.h <= vh * 0.7 + 2 && inside && g !== null && g <= 48,
      `${s.id}: popover 360-480 wide, max 70vh, inside the viewport, next to its trigger (${rect}, ${g}px from the trigger)`,
    );
    if (t) ck(phase, 'container', d.id, !overlaps(p, t), `${s.id}: the popover does not cover its trigger`);
  } else if (kind === 'panel') {
    const left = p.x <= 1;
    const right = Math.abs(p.r - vw) <= 1;
    const side = left ? 'left' : right ? 'right' : 'neither';
    const tSide = t ? (t.x + t.w / 2 < vw / 2 ? 'left' : 'right') : null;
    ck(phase, 'container', d.id, p.h >= vh - 2 && p.w >= 420 && p.w <= 460 && side !== 'neither', `${s.id}: side panel 440 wide, full height (${rect}, ${side})`);
    ck(phase, 'panel-side', d.id, tSide === null || side === tSide, `${s.id}: the panel is on its trigger's side (panel ${side}, trigger ${tSide})`);
  } else if (kind === 'dialog') {
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    ck(
      phase,
      'container',
      d.id,
      Math.abs(cx - vw / 2) <= 2 && Math.abs(cy - vh / 2) <= 2 && p.w <= 882 && p.w >= Math.min(700, vw - 64) && p.h <= vh * 0.85 + 2,
      `${s.id}: centred dialog up to 880 wide, max 85vh (${rect})`,
    );
  }
}

/** A point on the backdrop (outside the panel and its trigger), or null when the panel fills the screen. */
function backdropPoint(m) {
  const p = m.panel;
  const pts = [
    [Math.round(m.vw / 2), Math.max(4, Math.round(p.y / 2))],
    [8, 8],
    [m.vw - 8, 8],
    [8, m.vh - 8],
    [m.vw - 8, m.vh - 8],
    [Math.max(4, Math.round(p.x / 2)), Math.round(m.vh / 2)],
    [Math.min(m.vw - 4, Math.round((p.r + m.vw) / 2)), Math.round(m.vh / 2)],
  ];
  return pts.find(([x, y]) => (x < p.x - 2 || x > p.r + 2 || y < p.y - 2 || y > p.b + 2) && x >= 0 && y >= 0 && x <= m.vw && y <= m.vh) ?? null;
}
async function pressAt(page, [x, y]) {
  if (page.__dev.touch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}
const isOpen = (page) => page.evaluate(() => !!document.querySelector('dialog[open]'));
const openOverlay = (page) => page.evaluate(() => [...document.querySelectorAll('dialog[open]')].pop()?.dataset.overlay ?? null);

async function shot(page, d, name) {
  if (!SHOTS) return;
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${SHOTS}/${d.id}-${THEME}-${name}.png` });
}

// The surfaces. open(d): the path from the main screen; needs: the state first (empty | typed | turn);
// kind(d): the container; phaseKind: the phase in which the container check applies when it differs.
const MENU = 'Menu';
const SURFACES = [
  { id: 'menu', phase: 1, needs: 'empty', kind: () => 'fit', when: (d) => d.cls === 'phone' || d.tablet, open: () => [MENU] },
  { id: 'menu-typing', phase: 1, needs: 'typed', kind: () => 'fit', when: (d) => d.cls === 'phone' || d.tablet, open: () => [MENU] },
  { id: 'fix', phase: 1, needs: 'typed', kind: () => 'fit', open: (d) => (d.laptop ? ['Fix a word'] : [MENU, 'Fix a word']) },
  { id: 'proof', phase: 1, needs: 'typed', kind: () => 'fit', when: (d) => !d.laptop, open: () => [MENU, 'Check the words'] },
  { id: 'proof-more', phase: 2, needs: 'typed', kind: () => 'fit', when: (d) => d.laptop, open: () => ['More', 'Check the words'] },
  { id: 'partner', phase: 1, needs: 'empty', kind: () => 'fit', when: (d) => !d.laptop, open: (d) => (d.vh < 640 ? [MENU, 'They said'] : ['They said']) },
  { id: 'cards', phase: 1, needs: 'empty', kind: () => 'fit', open: () => ['Show'] },
  { id: 'sentences', phase: 1, needs: 'typed', kind: () => 'fit', when: (d) => d.id === 's375' || !!d.short, open: () => [MENU, 'Sentences'] },
  { id: 'spell', phase: 1, needs: 'typed', kind: () => 'panel', open: (d) => (d.laptop ? ['Spell this word'] : [MENU, [/^spell (this|a) word$/i]]) },
  { id: 'phrases', phase: 1, needs: 'empty', kind: () => 'panel', open: (d) => (d.laptop ? ['Phrases'] : [MENU, 'Phrases']) },
  { id: 'words', phase: 1, needs: 'empty', kind: () => 'panel', open: (d) => (d.laptop ? [['More', 'Phrases'], 'My words'] : [MENU, 'My words']) },
  { id: 'conversation', phase: 1, needs: 'turn', kind: () => 'panel', open: (d) => (d.cls === 'phone' ? [MENU, 'Conversation'] : [[/^whole conversation$/i, 'All of the conversation']]) },
  { id: 'settings', phase: 1, needs: 'empty', kind: () => 'dialog', open: (d) => (d.laptop ? ['Settings'] : [MENU, 'Settings']) },
  { id: 'voice', phase: 2, needs: 'empty', kind: () => 'fit', open: (d) => (d.laptop ? ['Voice'] : [MENU, 'Voice']) },
  { id: 'more', phase: 2, needs: 'empty', kind: () => 'fit', when: (d) => d.laptop, open: () => ['More'] },
  // The header (and its status button) shows from 640px tall; below that Status is in the Menu.
  { id: 'status', phase: 2, needs: 'empty', kind: () => 'fit', open: (d) => (d.vh < 640 ? [MENU, /^status/i] : [/^status/i]) },
  { id: 'show', phase: 1, needs: 'typed', kind: () => 'show', open: () => ['Show'] },
];

/** Get the page into the state a surface needs. Reloads when the state differs. */
async function prepare(page, needs) {
  await closeAll(page);
  const ok = await page.evaluate(() => location.pathname === '/app').catch(() => false);
  if (!ok || page.__state !== needs) {
    await freshApp(page);
    if (needs === 'typed') await typeKeys(page, SENTENCE);
    if (needs === 'turn') {
      await typeKeys(page, ['4', '0', '6', '3', '3', '3']);
      const speak = await findControl(page, 'Speak');
      if (speak) await pressLoc(page, speak);
      await page.waitForTimeout(500);
      await closeAll(page);
    }
    page.__state = needs;
  }
}

async function testSurface(page, d, s) {
  const phase = s.phase;
  const label = s.id;
  await prepare(page, s.needs);
  const path = s.open(d);
  const r = await openPath(page, path);
  if (!r.ok || !(await isOpen(page))) {
    ck(phase, 'reach', d.id, false, `${label}: could not open by ${JSON.stringify(path.map((x) => String(x)))} (stopped at ${r.failedAt ?? 'no dialog'})`);
    return;
  }
  await page.waitForTimeout(250);
  const m = await measure(page);
  ck(phase, 'reach', d.id, true, `${label}: opened by ${path.map(String).join(' > ')} (${m.overlay}, kind ${m.kind}, "${m.title}")`);
  await shot(page, d, label);
  await checkContainer(page, d, s, m, phase);
  // Close is the first scan row (Done in Show mode); Back to Menu the second when the Menu opened it.
  if (s.kind(d) !== 'show') {
    ck(phase, 'close-first', d.id, !!m.firstRow && m.firstRow.cells.length >= 1 && /^close$/i.test(m.firstRow.cells[0]), `${label}: Close is the first scan row (${JSON.stringify(m.firstRow)})`);
  } else {
    ck(phase, 'close-first', d.id, !!m.firstRow && /done/i.test(m.firstRow.cells.join(' ')), `${label}: Done is the first scan row (${JSON.stringify(m.firstRow)})`);
  }
  if (path.length > 1 && path[0] === MENU) {
    ck(phase, 'back-row', d.id, !!m.secondRow && m.secondRow.cells.some((c) => /^back/i.test(c)), `${label}: opened from Menu, Back is the second scan row (${JSON.stringify(m.secondRow)})`);
  }
  ck(phase, 'focus-in', d.id, !!m.focus?.inside, `${label}: focus moved into the surface (${JSON.stringify(m.focus)})`);
  ck(phase, 'targets', d.id, m.small.length === 0, `${label}: every control at least 56px (${JSON.stringify(m.small.slice(0, 4))})`);
  ck(phase, 'text', d.id, m.minFont >= 16, `${label}: text at least 16px (smallest ${m.minFont}px "${m.minFontText}")`);
  ck(phase, 'scan-cells', d.id, m.unscanned.length === 0, `${label}: every control is in a scan row (outside: ${JSON.stringify(m.unscanned.slice(0, 5))})`);
  const reach = await reachable(page);
  ck(phase, 'reachable', d.id, reach.bad.length === 0 && !reach.overflowHidden, `${label}: every control scrolls into view inside it (${reach.scrolls ? 'scrolls' : 'no scroll'}; out of reach: ${JSON.stringify(reach.bad.slice(0, 3))})`);
  if (d.touch) ck(phase, 'no-scroll', d.id, m.pageScroll <= 1 && m.scrollY === 0, `${label}: the main screen does not scroll with it open (${m.pageScroll}px, scrollY ${m.scrollY})`);
  for (const l of m.links.filter((x) => x.href && !x.href.startsWith('#') && !x.href.startsWith('/app'))) {
    ck(1, 'new-tab', d.id, l.target === '_blank' && /noopener/.test(l.rel) && /new tab/i.test(l.name), `${label}: "${l.name}" (${l.href}) opens in a new tab (target ${l.target}, rel "${l.rel}")`);
  }

  // Escape closes; focus returns to the trigger.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const afterEsc = await page.evaluate(() => ({
    open: [...document.querySelectorAll('dialog[open]')].map((x) => x.dataset.overlay),
    trigger: document.activeElement?.hasAttribute('data-test-trigger') ?? false,
    focus: (document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent || document.activeElement?.tagName || '').trim().slice(0, 30),
  }));
  ck(phase, 'escape', d.id, afterEsc.open.length === 0, `${label}: Escape closes it (open after: ${JSON.stringify(afterEsc.open)})`);
  ck(phase, 'focus-return', d.id, afterEsc.trigger, `${label}: focus returns to the trigger (on "${afterEsc.focus}")`);
  await closeAll(page);

  // Browser Back closes it and stays on /app.
  const len0 = await page.evaluate(() => history.length);
  await openPath(page, path);
  await page.waitForTimeout(150);
  const len1 = await page.evaluate(() => history.length);
  await page.goBack({ waitUntil: 'commit', timeout: 3000 }).catch(() => null);
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({ url: location.pathname, open: [...document.querySelectorAll('dialog[open]')].map((x) => x.dataset.overlay) })).catch(() => ({ url: '?', open: [] }));
  ck(phase, 'back', d.id, after.url === '/app' && after.open.length === 0, `${label}: browser Back closes it and stays on /app (now ${after.url}, open ${JSON.stringify(after.open)}, history ${len0}->${len1})`);
  if (after.url !== '/app') {
    page.__state = null;
    await prepare(page, s.needs);
  } else if (s.needs !== 'empty') {
    const still = await page.evaluate(() => (document.querySelector('.nl-speakbar__digits')?.textContent ?? '').replace(/\D/g, '').length > 0);
    ck(phase, 'back', d.id, still, `${label}: the sentence is still there after Back`);
  }
  // Open and Close: the entry is popped, so one Back leaves the app as it would with nothing open.
  await closeAll(page);
  await openPath(page, path);
  await page.waitForTimeout(150);
  await closeAll(page);
  await page.waitForTimeout(250);
  await page.goBack({ waitUntil: 'commit', timeout: 3000 }).catch(() => null);
  await page.waitForTimeout(400);
  const url = await page.evaluate(() => location.href).catch(() => '?');
  ck(phase, 'back-popped', d.id, url === 'about:blank', `${label}: after Close, one Back leaves the app (went to ${url})`);
  page.__state = null;
  await prepare(page, s.needs);

  // Backdrop: closes after 300 ms; not within 300 ms.
  if (s.kind(d) !== 'show') {
    await openPath(page, path);
    await page.waitForTimeout(400);
    const m2 = await measure(page);
    const pt = m2.open ? backdropPoint(m2) : null;
    if (!pt) ck(phase, 'backdrop', d.id, null, `${label}: no backdrop to press (full screen)`);
    else {
      await pressAt(page, pt);
      await page.waitForTimeout(250);
      const still = await isOpen(page);
      ck(phase, 'backdrop', d.id, !still, `${label}: a press on the backdrop at ${pt} closes it`);
      await closeAll(page);
      // Within 300 ms.
      const steps = s.open(d);
      for (let i = 0; i < steps.length - 1; i++) await openPath(page, [steps[i]]);
      const alts = Array.isArray(steps.at(-1)) ? steps.at(-1) : [steps.at(-1)];
      let loc = null;
      for (const a of alts) if ((loc = await findControl(page, a))) break;
      if (loc) {
        await pressLoc(page, loc);
        await page.waitForFunction((ov) => [...document.querySelectorAll('dialog[open]')].pop()?.dataset.overlay === ov, m2.overlay, { timeout: 2000, polling: 10 }).catch(() => null);
        await pressAt(page, pt);
        const dt = await page.evaluate(() => Math.round(window.__pressAt - window.__openAt));
        await page.waitForTimeout(150);
        const stays = await isOpen(page);
        if (dt >= 0 && dt < 300) ck(phase, 'backdrop-300', d.id, stays, `${label}: a backdrop press ${dt} ms after opening is ignored`);
        else ck(phase, 'backdrop-300', d.id, null, `${label}: could not press within 300 ms (${dt} ms)`);
      }
      await closeAll(page);
    }
  }
  const end = await measure(page);
  if (d.touch) ck(phase, 'no-scroll', d.id, end.pageScroll <= 1 && end.scrollY === 0, `${label}: the main screen does not scroll after it closes (${end.pageScroll}px)`);
}

/** Save the typed sentence as a phrase (the laptop's Save phrase, or Menu > Save phrase). */
async function savePhrase(page, d) {
  await prepare(page, 'typed');
  const r = d.laptop ? await openPath(page, ['Save phrase']) : await openPath(page, [MENU, 'Save phrase']);
  await page.waitForTimeout(300);
  await closeAll(page);
  page.__state = null;
  return r.ok;
}

async function backdropExceptions(page, d) {
  // A confirm: Delete phrase (Phrases > Delete, or the phrase's More > Delete).
  if (await savePhrase(page, d)) {
    await prepare(page, 'empty');
    if ((await openPath(page, d.laptop ? ['Phrases'] : [MENU, 'Phrases'])).ok) {
      await page.waitForTimeout(300);
      let del = await findControl(page, /^delete "/i, { inDialogOnly: true });
      if (!del) {
        const more = await findControl(page, /^more for /i, { inDialogOnly: true });
        if (more) await pressLoc(page, more);
        await page.waitForTimeout(250);
        del = await findControl(page, /^delete/i, { inDialogOnly: true });
      }
      if (del) {
        await pressLoc(page, del);
        await page.waitForTimeout(400);
        const pt = backdropPoint(await measure(page));
        if (pt) {
          await pressAt(page, pt);
          await page.waitForTimeout(250);
          ck(1, 'backdrop-confirm', d.id, await isOpen(page), 'Phrases with the Delete phrase confirm showing stays open on a backdrop press');
        } else ck(1, 'backdrop-confirm', d.id, null, 'Phrases fills the screen (no backdrop)');
        // Delete it, so later checks start with no saved phrase.
        const yes = await findControl(page, /^delete phrase$/i, { inDialogOnly: true });
        if (yes) await pressLoc(page, yes);
        await page.waitForTimeout(250);
      } else ck(1, 'backdrop-confirm', d.id, false, 'a saved phrase has a Delete');
      await closeAll(page);
    }
  }
  // Unsaved text: They said (phones and tablets), My words; a confirm: Clear conversation.
  if (!d.laptop) {
    await prepare(page, 'empty');
    const path = d.vh < 640 ? [MENU, 'They said'] : ['They said'];
    if ((await openPath(page, path)).ok && (await isOpen(page))) {
      await page.waitForTimeout(400);
      await page.locator('dialog[open] input').first().fill('Tea or coffee?');
      const pt = backdropPoint(await measure(page));
      if (pt) {
        await pressAt(page, pt);
        await page.waitForTimeout(250);
        ck(1, 'backdrop-text', d.id, await isOpen(page), 'They said with unsaved text stays open on a backdrop press');
      } else ck(1, 'backdrop-text', d.id, null, 'They said fills the screen (no backdrop)');
      await closeAll(page);
    }
  }
  {
    await prepare(page, 'empty');
    const path = d.laptop ? [['More', 'Phrases'], 'My words'] : [MENU, 'My words'];
    if ((await openPath(page, path)).ok && (await isOpen(page))) {
      await page.waitForTimeout(400);
      const field = page.locator('dialog[open] input[type="text"], dialog[open] input:not([type]), dialog[open] textarea').first();
      if (await field.count()) {
        await field.fill('Bramble');
        const pt = backdropPoint(await measure(page));
        if (pt) {
          await pressAt(page, pt);
          await page.waitForTimeout(250);
          ck(1, 'backdrop-text', d.id, await isOpen(page), 'My words with unsaved text stays open on a backdrop press');
        } else ck(1, 'backdrop-text', d.id, null, 'My words fills the screen (no backdrop)');
      }
      await closeAll(page);
    }
  }
  {
    await prepare(page, 'turn');
    const path = d.cls === 'phone' ? [MENU, 'Conversation'] : [[/^whole conversation$/i, 'All of the conversation']];
    if ((await openPath(page, path)).ok && (await isOpen(page))) {
      const clear = await findControl(page, 'Clear conversation', { inDialogOnly: true });
      if (clear) {
        await pressLoc(page, clear);
        await page.waitForTimeout(400);
        const pt = backdropPoint(await measure(page));
        if (pt) {
          await pressAt(page, pt);
          await page.waitForTimeout(250);
          ck(1, 'backdrop-confirm', d.id, await isOpen(page), 'Conversation with the Clear confirm showing stays open on a backdrop press');
        } else ck(1, 'backdrop-confirm', d.id, null, 'Conversation fills the screen (no backdrop)');
      }
      await closeAll(page);
      page.__state = null;
    }
  }
}

/** Open Settings and choose an access mode (works with the long sheet and with the drill-in). */
async function setAccess(page, d, re) {
  await closeAll(page);
  await openPath(page, d.laptop ? ['Settings'] : [MENU, 'Settings']);
  let radio = page.locator('dialog[open]').getByRole('radio', { name: re });
  if (!(await visible(radio))) {
    const nav = await findControl(page, /ways to type|access/i, { inDialogOnly: true });
    if (nav) await pressLoc(page, nav);
    await page.waitForTimeout(150);
    radio = page.locator('dialog[open]').getByRole('radio', { name: re });
  }
  await radio.first().check();
  await page.waitForTimeout(150);
  await closeAll(page);
}

async function backdropWhileScanning(page, d) {
  await prepare(page, 'empty');
  await setAccess(page, d, /two switches/i);
  const path = d.laptop ? ['Phrases'] : [MENU];
  if ((await openPath(page, path)).ok && (await isOpen(page))) {
    await page.waitForTimeout(400);
    const pt = backdropPoint(await measure(page));
    if (pt) {
      await pressAt(page, pt);
      await page.waitForTimeout(250);
      ck(1, 'backdrop-scan', d.id, await isOpen(page), `${path.at(-1)} stays open on a backdrop press while scanning`);
    } else ck(1, 'backdrop-scan', d.id, null, `${path.at(-1)} fills the screen (no backdrop)`);
  }
  await closeAll(page);
  page.__state = null;
}

/** Two switches: Space moves, Enter chooses. Reach the control whose name matches `re` and choose it. */
async function switchTo(page, re, { max = 80 } = {}) {
  let last = 0;
  const press = async (key) => {
    const w = last + 260 - Date.now();
    if (w > 0) await page.waitForTimeout(w);
    await page.keyboard.press(key);
    last = Date.now();
  };
  for (let i = 0; i < max; i++) {
    const st = await page.evaluate((src) => {
      const re = new RegExp(src, 'i');
      const nameOf = (e) => (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim();
      const dlg = [...document.querySelectorAll('dialog[open]')].pop();
      const root = dlg ?? document;
      const lit = root.querySelector('[data-scan-state="lit"], .is-lit');
      if (lit && re.test(nameOf(lit))) return 'cell';
      // A row can be drawn on several elements (the wide header: the status button and the actions).
      const rows = [...root.querySelectorAll('[data-scan-state="row"], .is-scanning')];
      const row = rows[0];
      if (row && !lit) {
        const cells = rows.flatMap((r) => [...r.querySelectorAll('button, a[href], input[type=radio], input[type=checkbox]')]).map((c) => (c.tagName === 'INPUT' ? c.closest('label') ?? c : c));
        if (cells.some((c) => c.getBoundingClientRect().height > 0 && re.test(nameOf(c)))) return 'row';
      }
      return lit ? 'other-cell' : row ? 'other-row' : 'none';
    }, re.source);
    if (st === 'cell' || st === 'row') {
      await press('Enter');
      if (st === 'cell') return true;
    } else await press('Space');
  }
  return false;
}

async function switchRuns(d) {
  const { ctx, page } = await newDevice(d);
  try {
    await freshApp(page);
    page.__state = 'empty';
    await setAccess(page, d, /two switches/i);
    await page.keyboard.press('Space'); // start scanning
    const plan = d.laptop
      ? [['phrases', [/^phrases$/]], ['settings', [/^settings$/]], ['voice', [/^voice$/]], ['more', [/^more$/]], ['cards', [/^show$/]]]
      : [['menu', [/^menu$/]], ['phrases', [/^menu$/, /^phrases$/]], ['settings', [/^menu$/, /^settings$/]], ['voice', [/^menu$/, /^voice$/]], ['words', [/^menu$/, /^my words$/]], ['cards', [/^show$/]]];
    for (const [id, steps] of plan) {
      const phase = id === 'voice' || id === 'more' ? 2 : 1;
      if (!want(phase)) continue;
      let ok = true;
      for (const re of steps) {
        ok = await switchTo(page, re);
        if (!ok) break;
        await page.waitForTimeout(250);
      }
      const ov = await openOverlay(page);
      ck(phase, 'switch-open', d.id, ok && !!ov, `${id}: opened with two switches (${ov})`);
      if (!ov) {
        await closeAll(page);
        continue;
      }
      if (id === 'settings' && want(3)) {
        const look = await switchTo(page, /^look/);
        await page.waitForTimeout(300);
        const day = await page.locator('dialog[open]').getByRole('radio', { name: /day/i }).count();
        ck(3, 'switch-settings', d.id, look && day > 0, `Settings > Look with two switches shows the theme choices`);
        if (d.cls === 'phone') {
          const all = await switchTo(page, /^all settings/);
          await page.waitForTimeout(300);
          ck(3, 'switch-settings', d.id, all && !!(await findControl(page, /^look/i, { inDialogOnly: true })), 'All settings with two switches returns to the list');
        }
      }
      if (steps.length > 1) {
        const backOk = await switchTo(page, /^back/);
        await page.waitForTimeout(300);
        ck(1, 'switch-back', d.id, backOk && (await openOverlay(page)) === 'menu', `${id}: Back to Menu with two switches (${await openOverlay(page)})`);
      }
      const closed = (await switchTo(page, /^close$/)) && (await page.waitForTimeout(300), !(await isOpen(page)));
      ck(phase, 'switch-close', d.id, closed, `${id}: closed with two switches (Close)`);
      await closeAll(page);
    }
  } catch (e) {
    ck(1, 'switch-open', d.id, false, `switch run stopped: ${e.message.split('\n')[0]}`);
  } finally {
    await ctx.close();
  }
}

/** Phase 2: the phone Menu fits, Phrases and Settings show without scrolling; tiles; About in a new tab. */
async function phoneMenu(page, d) {
  for (const needs of ['empty', 'typed']) {
    await prepare(page, needs);
    if (!(await openPath(page, [MENU])).ok) continue;
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => {
      const dlg = [...document.querySelectorAll('dialog[open]')].pop();
      const b = dlg.querySelector('.sheet__body');
      const contentH = b ? dlg.getBoundingClientRect().height - b.clientHeight + b.scrollHeight : dlg.scrollHeight;
      const seen = (re) => {
        const el = [...dlg.querySelectorAll('button, a')].find((x) => re.test((x.getAttribute('aria-label') || x.textContent).trim()));
        if (!el) return 'missing';
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= innerHeight + 0.5 ? 'visible' : `below (${Math.round(r.top)})`;
      };
      const box = dlg.getBoundingClientRect();
      const crossing = [...dlg.querySelectorAll('button, a[href]')].find((x) => {
        const q = x.getBoundingClientRect();
        return q.height > 0 && q.top < box.bottom - 8 && q.bottom > box.bottom + 8;
      });
      return {
        contentH: Math.round(contentH),
        sheetH: Math.round(box.height),
        vh: innerHeight,
        phrases: seen(/^phrases$/i),
        settings: seen(/^settings$/i),
        cut: !!crossing,
        cutAt: crossing ? { n: (crossing.getAttribute('aria-label') || crossing.textContent).trim().slice(0, 30), top: Math.round(crossing.getBoundingClientRect().top), bottom: Math.round(box.bottom) } : null,
      };
    });
    const screens = r.contentH / r.vh;
    // Lead decision (phase 2): with nothing typed the Menu fits about one screen and Phrases and Settings show
    // without scrolling; while typing it may run to about 1.3 screens, provided a row is visibly cut at the
    // bottom edge (so it reads as scrollable), and Phrases still shows.
    if (needs === 'empty') {
      if (d.id === 'p375') ck(2, 'menu-fit', d.id, screens <= 1.1, `Menu (nothing typed) is ${screens.toFixed(2)} screens tall at 375x667 (about one)`);
      // (From 667px tall; below that the Menu may scroll, Phrases still shows.)
      ck(2, 'menu-fit', d.id, r.phrases === 'visible' && (r.settings === 'visible' || r.vh < 667), `Menu (nothing typed): Phrases ${r.phrases}, Settings ${r.settings} without scrolling`);
    } else {
      if (d.id === 'p375') ck(2, 'menu-fit', d.id, screens <= 1.35, `Menu (typing) is ${screens.toFixed(2)} screens tall at 375x667 (up to about 1.3)`);
      ck(2, 'menu-fit', d.id, r.phrases === 'visible', `Menu (typing): Phrases ${r.phrases} without scrolling (Settings ${r.settings})`);
      if (r.contentH > r.sheetH + 2) ck(2, 'menu-fit', d.id, r.cut, `Menu (typing) scrolls, and a row is visibly cut at the bottom edge (${JSON.stringify(r.cutAt)})`);
    }
    const hs = await page.evaluate(() => {
      const dlg = [...document.querySelectorAll('dialog[open]')].pop();
      const pick = (re) => [...dlg.querySelectorAll('button')].find((x) => re.test((x.getAttribute('aria-label') || x.textContent).trim()));
      const h = (re) => Math.round(pick(re)?.getBoundingClientRect().height ?? 0);
      return { phrases: h(/^phrases$/i), cards: h(/^show a card$/i), conv: h(/^conversation$/i), said: h(/^they said$/i), words: h(/^my words$/i), voice: h(/^voice$/i), settings: h(/^settings$/i) };
    });
    ck(2, 'menu-tiles', d.id, hs.phrases >= 72 && hs.cards >= 72 && hs.conv >= 72 && hs.said >= 72, `Menu (${needs}): the 4 tiles are at least 72px tall (${JSON.stringify(hs)})`);
    ck(2, 'menu-rows', d.id, hs.words >= 56 && hs.voice >= 56 && hs.settings >= 56, `Menu (${needs}): My words, Voice, Settings rows (${hs.words}/${hs.voice}/${hs.settings}px)`);
    await shot(page, d, `menu-${needs}-fit`);
    await closeAll(page);
  }
}

/** Phase 1: Menu > About opens a new tab and keeps the sentence; Back to Menu; browser Back from a Menu child. */
async function menuChildren(page, d) {
  await prepare(page, 'typed');
  await openPath(page, [MENU]);
  const about = await findControl(page, /about ninth life/i, { inDialogOnly: true });
  if (!about) ck(1, 'new-tab', d.id, false, 'Menu has an About Ninth Life item');
  else {
    const popup = page.context().waitForEvent('page', { timeout: 3000 }).catch(() => null);
    await pressLoc(page, about);
    const np = await popup;
    await page.waitForTimeout(300);
    const here = await page.evaluate(() => ({ url: location.pathname, digits: (document.querySelector('.nl-speakbar__digits')?.textContent ?? '').replace(/\D/g, '') }));
    ck(1, 'new-tab', d.id, !!np && here.url === '/app' && here.digits.length > 0, `Menu > About opens a new tab (${np ? np.url() : 'no new tab'}) and the app keeps the sentence (${here.url}, ${here.digits})`);
    if (np) await np.close();
  }
  await closeAll(page);
  await prepare(page, 'empty');
  await openPath(page, [MENU, 'Phrases']);
  const back = await findControl(page, /^back/i, { inDialogOnly: true });
  if (!back) ck(1, 'back-to-menu', d.id, false, 'Phrases opened from Menu has a Back button');
  else {
    await pressLoc(page, back);
    await page.waitForTimeout(200);
    const ov = await openOverlay(page);
    ck(1, 'back-to-menu', d.id, ov === 'menu', `Back in Phrases returns to the Menu (${ov})`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const f = await page.evaluate(() => document.activeElement?.hasAttribute('data-test-trigger'));
    ck(1, 'focus-return', d.id, f, 'Menu > Phrases > Back to Menu > Escape: focus is on the Menu button');
  }
  await closeAll(page);
  // Browser Back from a Menu child goes to the main screen (one entry, not two), and the next Back leaves.
  await prepare(page, 'empty');
  await openPath(page, [MENU, 'Settings']);
  await page.goBack({ waitUntil: 'commit', timeout: 3000 }).catch(() => null);
  await page.waitForTimeout(400);
  const st = await page.evaluate(() => ({ url: location.pathname, open: [...document.querySelectorAll('dialog[open]')].map((x) => x.dataset.overlay) })).catch(() => ({ url: '?', open: [] }));
  ck(1, 'back', d.id, st.url === '/app' && st.open.length === 0, `Menu > Settings, then browser Back: the main screen (${st.url}, open ${JSON.stringify(st.open)})`);
  await page.goBack({ waitUntil: 'commit', timeout: 3000 }).catch(() => null);
  await page.waitForTimeout(400);
  const u2 = await page.evaluate(() => location.href).catch(() => '?');
  ck(1, 'back', d.id, u2 === 'about:blank', `a second Back leaves the app (no stacked entry; went to ${u2})`);
  page.__state = null;
}

/** Phase 2: More on the laptop; the header. */
async function largeExtras(page, d) {
  if (!d.laptop) return;
  await prepare(page, 'empty');
  if ((await openPath(page, ['More'])).ok && (await isOpen(page))) {
    const names = await page.evaluate(() => [...[...document.querySelectorAll('dialog[open]')].pop().querySelectorAll('button, a')].map((b) => (b.getAttribute('aria-label') || b.textContent).trim()));
    for (const w of [/^my words$/i, /^show a card$/i, /conversation/i, /^check the words$/i, /status|dictionary/i, /about/i]) {
      ck(2, 'more-items', d.id, names.some((n) => w.test(n)), `More holds ${w} (${names.join(', ')})`);
    }
    await closeAll(page);
  } else ck(2, 'more-items', d.id, false, 'the header has a More button that opens a popover');
  const header = await page.evaluate(() => [...document.querySelectorAll('.app-header button')].filter((b) => b.offsetParent).map((b) => (b.getAttribute('aria-label') || b.textContent).trim()));
  ck(2, 'header', d.id, ['Phrases', 'Voice', 'Settings', 'More'].every((n) => header.includes(n)), `the header has Phrases, Voice, Settings, More (${header.join(', ')})`);
}
async function statusButton(page, d) {
  await prepare(page, 'empty');
  if (d.vh < 640) await openPath(page, [MENU]);
  const btn = await findControl(page, /^status/i);
  ck(2, 'status', d.id, !!btn, d.vh < 640 ? 'Menu has a Status item (no header under 640px)' : 'the header status is a button');
  if (!btn) return;
  await pressLoc(page, btn);
  await page.waitForTimeout(250);
  const t = await page.evaluate(() => [...document.querySelectorAll('dialog[open]')].pop()?.innerText ?? '');
  ck(2, 'status', d.id, /offline dictionary ready/i.test(t), `the status button opens Status with the dictionary state ("${t.replace(/\s+/g, ' ').slice(0, 80)}")`);
  await closeAll(page);
}
async function voiceSurface(page, d) {
  await prepare(page, 'empty');
  if (!(await openPath(page, d.laptop ? ['Voice'] : [MENU, 'Voice'])).ok) return ck(2, 'voice', d.id, false, 'Voice opens');
  await page.waitForTimeout(200);
  const v = await page.evaluate(() => {
    const dlg = [...document.querySelectorAll('dialog[open]')].pop();
    const names = [...dlg.querySelectorAll('button, select, input, label')].map((b) => (b.getAttribute('aria-label') || b.textContent || b.id).trim());
    const steppers = [...dlg.querySelectorAll('button')].filter((b) => /^[−\-+]$|slower|faster|lower|higher|decrease|increase/i.test((b.getAttribute('aria-label') || b.textContent).trim()));
    return {
      title: dlg.querySelector('.sheet__title, h2')?.textContent?.trim(),
      select: !!dlg.querySelector('select'),
      speed: names.some((n) => /speed|rate/i.test(n)),
      pitch: names.some((n) => /pitch/i.test(n)),
      test: names.some((n) => /test voice/i.test(n)),
      steppers: steppers.map((b) => Math.round(b.getBoundingClientRect().height)),
    };
  });
  ck(2, 'voice', d.id, v.title === 'Voice' && v.select && v.speed && v.pitch && v.test, `Voice is its own surface with the picker, Speed, Pitch, Test voice (${JSON.stringify(v)})`);
  ck(2, 'voice', d.id, v.steppers.length >= 4 && v.steppers.every((h) => h >= 56), `Voice has 56px steppers alongside the sliders (${JSON.stringify(v.steppers)})`);
  await closeAll(page);
}

/** Phase 3: Settings drill-in on phones, two panes on large. */
async function settingsShape(page, d) {
  await prepare(page, 'empty');
  await openPath(page, d.laptop ? ['Settings'] : [MENU, 'Settings']);
  await page.waitForTimeout(250);
  const groups = ['Voice', 'Look', 'Ways to type', 'Typing', 'Quick replies', 'Partner strip', 'Model ranking', 'Voice to text', 'About'];
  const s = await page.evaluate((gs) => {
    const dlg = [...document.querySelectorAll('dialog[open]')].pop();
    const ctrls = [...dlg.querySelectorAll('button, [role=tab], a')].filter((b) => b.getBoundingClientRect().height > 0);
    const labelOf = (b) => (b.querySelector('.menu-row__label')?.textContent ?? b.getAttribute('aria-label') ?? b.textContent).trim();
    const find = (g) => ctrls.find((b) => labelOf(b).toLowerCase() === g.toLowerCase()) ?? ctrls.find((b) => new RegExp('^' + g + '(?![a-z])').test(labelOf(b)));
    return {
      rows: gs.map((g) => {
        const b = find(g);
        if (!b) return { g, missing: true };
        const r = b.getBoundingClientRect();
        return { g, h: Math.round(r.height), x: Math.round(r.x), current: b.getAttribute('aria-current') ?? b.getAttribute('aria-selected') };
      }),
      radios: [...dlg.querySelectorAll('input[type=radio]')].filter((r) => (r.closest('label') ?? r).getBoundingClientRect().height > 0).length,
      // Controls in the right half of the dialog (the section pane on large screens).
      right: [...dlg.querySelectorAll('button, select, input, a[href]')].filter((c) => {
        const q = (c.closest('label') ?? c).getBoundingClientRect();
        const box = dlg.getBoundingClientRect();
        return q.height > 0 && q.left > box.left + box.width * 0.35 && !/^close$/i.test(c.textContent.trim());
      }).length,
    };
  }, groups);
  const missing = s.rows.filter((r) => r.missing).map((r) => r.g);
  ck(3, 'settings-groups', d.id, missing.length === 0, `Settings lists the groups (missing ${JSON.stringify(missing)})`);
  if (d.cls === 'phone') {
    ck(3, 'settings-groups', d.id, s.rows.filter((r) => !r.missing).every((r) => r.h >= 64), `the group rows are at least 64px (${s.rows.map((r) => r.h).join(',')})`);
    ck(3, 'settings-drill', d.id, s.radios === 0, `Settings opens on the group list, not the controls (${s.radios} radios showing)`);
    const look = await findControl(page, /^look/i, { inDialogOnly: true });
    if (look) {
      await pressLoc(page, look);
      await page.waitForTimeout(200);
      const m = await measure(page);
      const theme = await page.locator('dialog[open]').getByRole('radio', { name: /day/i }).count();
      ck(3, 'settings-drill', d.id, theme > 0, 'Look drills in to the theme choices');
      ck(3, 'settings-drill', d.id, !!m.secondRow && m.secondRow.cells.some((c) => /^(back|all settings)/i.test(c)) && /^close$/i.test(m.firstRow?.cells[0] ?? ''), `in a section Close is the first scan row and Back (All settings) the second (${JSON.stringify([m.firstRow, m.secondRow])})`);
      ck(3, 'settings-drill', d.id, !!m.focus?.inside && !/^close$/i.test(m.focus.name), `in a section focus is on its first control (${JSON.stringify(m.focus)})`);
      await shot(page, d, 'settings-look');
      const back = await findControl(page, /^(back|all settings)/i, { inDialogOnly: true });
      if (back) {
        await pressLoc(page, back);
        await page.waitForTimeout(200);
        const f = await page.evaluate(() => (document.activeElement?.textContent ?? '').trim().slice(0, 30));
        ck(3, 'settings-drill', d.id, !!(await findControl(page, /^look/i, { inDialogOnly: true })) && /^look/i.test(f), `All settings returns to the group list with focus on Look (${f})`);
        // Escape from inside a section closes Settings.
        await pressLoc(page, (await findControl(page, /^look/i, { inDialogOnly: true })));
        await page.waitForTimeout(150);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        ck(3, 'settings-drill', d.id, !(await isOpen(page)), 'Escape inside a section closes Settings');
        // Browser Back inside a section closes Settings and stays on /app.
        await openPath(page, [MENU, 'Settings']);
        await page.waitForTimeout(200);
        const lk = await findControl(page, /^look/i, { inDialogOnly: true });
        if (lk) await pressLoc(page, lk);
        await page.waitForTimeout(150);
        await page.goBack({ waitUntil: 'commit', timeout: 3000 }).catch(() => null);
        await page.waitForTimeout(400);
        const st = await page.evaluate(() => ({ url: location.pathname, open: !!document.querySelector('dialog[open]') })).catch(() => ({ url: '?', open: false }));
        ck(3, 'settings-drill', d.id, st.url === '/app' && !st.open, `browser Back inside a section closes Settings and stays on /app (${JSON.stringify(st)})`);
        if (st.url !== '/app') page.__state = null;
      }
    }
  } else {
    const m = await measure(page);
    const left = s.rows.filter((r) => !r.missing);
    ck(3, 'settings-panes', d.id, left.length > 0 && left.every((r) => r.x < m.panel.x + m.panel.w * 0.4) && s.right > 0, `two panes: the group list on the left, a section on the right (${s.right} controls in the right pane)`);
    ck(3, 'settings-panes', d.id, left.some((r) => r.current && r.current !== 'false'), `the selected group is marked (${JSON.stringify(left.map((r) => r.current))})`);
    ck(3, 'settings-panes', d.id, m.small.length === 0 && m.minFont >= 16, `two panes: 56px targets, 16px text (${JSON.stringify(m.small.slice(0, 3))}, ${m.minFont}px)`);
    const typing = await findControl(page, /^typing/i, { inDialogOnly: true });
    if (typing) {
      await pressLoc(page, typing);
      await page.waitForTimeout(200);
      await closeAll(page);
      await openPath(page, d.laptop ? ['Settings'] : [MENU, 'Settings']);
      await page.waitForTimeout(250);
      const cur = await page.evaluate(() => [...[...document.querySelectorAll('dialog[open]')].pop().querySelectorAll('[aria-current]:not([aria-current="false"])')].map((e) => e.textContent.trim().slice(0, 20)));
      ck(3, 'settings-panes', d.id, cur.some((c) => /^typing/i.test(c)), `Settings opens again on the last group used, Typing (${JSON.stringify(cur)})`);
      const r2 = await reachable(page);
      ck(3, 'settings-panes', d.id, r2.bad.length === 0, `every control in the two panes scrolls into view (${JSON.stringify(r2.bad.slice(0, 3))})`);
    }
  }
  await closeAll(page);
}

/** Phase 4: They said keeps Done above the on-screen keyboard; Enter submits. */
async function theySaidKeyboard(d) {
  const { ctx, page } = await newDevice(d, { keyboard: true });
  try {
    await freshApp(page);
    page.__state = 'empty';
    const path = d.vh < 640 ? [MENU, 'They said'] : ['They said'];
    if (!(await openPath(page, path)).ok || !(await isOpen(page))) return ck(4, 'they-said', d.id, false, 'They said opens');
    await page.waitForTimeout(300);
    const order = await page.evaluate(() => {
      const dlg = [...document.querySelectorAll('dialog[open]')].pop();
      const y = (e) => (e ? Math.round(e.getBoundingClientRect().top) : null);
      const field = dlg.querySelector('input');
      const done = [...dlg.querySelectorAll('button')].find((b) => /^done$/i.test(b.textContent.trim()));
      const listen = [...dlg.querySelectorAll('button')].find((b) => /^listen$/i.test(b.textContent.trim()));
      const lead = dlg.querySelector('.sheet__lead');
      return { field: y(field), done: y(done), listen: y(listen), lead: y(lead), focus: document.activeElement === field };
    });
    ck(4, 'they-said', d.id, order.field !== null && order.done > order.field && (order.listen === null || order.listen === order.done) && (order.lead === null || order.lead > order.done), `field first, then Done and Listen in one row, the lead text under them (${JSON.stringify(order)})`);
    const kb = Math.round(d.vh * 0.45);
    await page.evaluate((px) => window.__setKeyboard(px), kb);
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const dlg = [...document.querySelectorAll('dialog[open]')].pop();
      const done = [...dlg.querySelectorAll('button')].find((b) => /^done$/i.test(b.textContent.trim()));
      const field = dlg.querySelector('input');
      return { doneBottom: Math.round(done?.getBoundingClientRect().bottom ?? 9999), fieldTop: Math.round(field?.getBoundingClientRect().top ?? -1), vv: Math.round(visualViewport.height) };
    });
    ck(4, 'they-said-kb', d.id, r.doneBottom <= r.vv && r.fieldTop >= 0, `with a ${kb}px keyboard Done stays above it (Done bottom ${r.doneBottom}, visible height ${r.vv}, field top ${r.fieldTop})`);
    await shot(page, d, 'theysaid-keyboard');
    await page.locator('dialog[open] input').first().fill('Tea or coffee?');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    ck(4, 'they-said', d.id, !(await isOpen(page)), 'Enter adds the line and closes They said');
  } finally {
    await ctx.close();
  }
}

/** Phase 4: Save phrase feedback in place, Phrases rows (one row speaks, a More action), the confirm style. */
async function phrasesAndFeedback(page, d) {
  await prepare(page, 'typed');
  const keypad0 = await page.evaluate(() => JSON.stringify(document.querySelector('.nl-keypad')?.getBoundingClientRect()));
  const saved = d.laptop ? await openPath(page, ['Save phrase']) : await openPath(page, [MENU, 'Save phrase']);
  await page.waitForTimeout(300);
  // Lead decision (phase 4 follow-up): no snackbar. Save phrase gives its feedback in place: "Saved to Phrases"
  // with Undo where the press was (the Menu stays open on phones and tablets; the laptop's action row).
  const feedback = () =>
    page.evaluate(() => {
      const vis = (e) => {
        const b = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
      };
      const dlg = [...document.querySelectorAll('dialog[open]')].pop();
      const root = dlg ?? document.body;
      const big = (e) => vis(e) && e.getBoundingClientRect().width > 4 && e.getBoundingClientRect().height > 4; // not the sr-only live text
      const undo = [...root.querySelectorAll('button')].find((b) => big(b) && /\bundo\b/i.test(`${b.getAttribute('aria-label') ?? ''} ${b.textContent}`));
      const said = [...root.querySelectorAll('*')].find((e) => big(e) && /^saved to phrases/i.test(e.textContent.trim()) && e.children.length <= 3) ?? (undo && /saved to phrases/i.test(`${undo.getAttribute('aria-label')} ${undo.textContent}`) ? undo : null);
      if (!said && !undo) return null;
      const scanRow = undo ? (undo.closest('[data-scan-row]')?.getAttribute('data-scan-row') ?? (undo.closest('.nl-scanrow, [data-section]') ? 'main-row' : null)) : null;
      const live = said ? (said.closest('[aria-live], [role=status]') ? 'live' : null) : null;
      return {
        inDialog: !!dlg,
        overlay: dlg?.dataset.overlay ?? null,
        text: said?.textContent.trim().slice(0, 40) ?? null,
        undo: undo ? { h: Math.round(undo.getBoundingClientRect().height), row: scanRow } : null,
        snackbar: !!document.querySelector('[data-snackbar]'),
        live,
      };
    });
  const f1 = await feedback();
  ck(4, 'feedback', d.id, saved.ok && !!f1?.text && !!f1?.undo && f1.undo.h >= 56, `Save phrase says "Saved to Phrases" in place, with a 56px Undo (${JSON.stringify(f1)})`);
  if (f1) {
    if (!d.laptop) ck(4, 'feedback', d.id, f1.overlay === 'menu', `the Menu stays open after Save phrase (${f1.overlay})`);
    ck(4, 'feedback', d.id, !f1.snackbar, 'no snackbar over the screen');
    ck(4, 'feedback', d.id, !!f1.undo?.row, `Undo is reachable by switch (scan row ${f1.undo?.row})`);
    const keypad1 = await page.evaluate(() => JSON.stringify(document.querySelector('.nl-keypad')?.getBoundingClientRect()));
    if (!f1.inDialog) ck(4, 'feedback', d.id, keypad0 === keypad1, 'the feedback does not move the keypad');
    await shot(page, d, 'saved-feedback');
    await page.waitForTimeout(6000);
    ck(4, 'feedback', d.id, !!(await feedback())?.text, 'the feedback is still there after 6 s (it never times out)');
    if (f1.undo) {
      const undo = (f1.inDialog ? page.locator('dialog[open]').last() : page).getByRole('button', { name: /\bundo\b/i }).first();
      await pressLoc(page, undo);
      await page.waitForTimeout(300);
      await closeAll(page);
      await openPath(page, d.laptop ? ['Phrases'] : [MENU, 'Phrases']);
      await page.waitForTimeout(250);
      const has = await page.evaluate(() => /i need/i.test([...document.querySelectorAll('dialog[open]')].pop()?.innerText ?? ''));
      ck(4, 'feedback', d.id, !has, 'Undo removed the saved phrase');
      await closeAll(page);
    }
  }
  page.__state = null;
  await savePhrase(page, d); // Undo took the first one away
  await prepare(page, 'empty');
  await openPath(page, d.laptop ? ['Phrases'] : [MENU, 'Phrases']);
  await page.waitForTimeout(250);
  const rows = await page.evaluate(() => {
    const dlg = [...document.querySelectorAll('dialog[open]')].pop();
    const more = [...dlg.querySelectorAll('button')].filter((b) => /^more for /i.test(b.getAttribute('aria-label') ?? ''));
    return more.map((b) => {
      const row = b.closest('[data-scan-row]');
      const cells = row ? [...row.querySelectorAll('button')].map((x) => (x.getAttribute('aria-label') || x.textContent).trim()) : [];
      return { label: b.getAttribute('aria-label'), h: Math.round(b.getBoundingClientRect().height), cells };
    });
  });
  ck(4, 'phrase-rows', d.id, rows.length >= 1 && rows.every((r) => r.h >= 56 && r.cells.length === 2), `each phrase is a row with one More action, both in its scan row (${JSON.stringify(rows.slice(0, 2))})`);
  if (rows.length) {
    await pressLoc(page, page.getByRole('button', { name: rows[0].label, exact: true }).first());
    await page.waitForTimeout(250);
    const acts = await page.evaluate(() => [...[...document.querySelectorAll('dialog[open]')].pop().querySelectorAll('button')].map((b) => b.textContent.trim()));
    ck(4, 'phrase-rows', d.id, acts.some((a) => /pin|unpin/i.test(a)) && acts.includes('Show') && acts.some((a) => /^delete/i.test(a)), `More opens Pin, Show, Delete (${acts.join(', ')})`);
    await shot(page, d, 'phrase-more');
    const del = await findControl(page, /^delete/i, { inDialogOnly: true });
    if (del) {
      await pressLoc(page, del);
      await page.waitForTimeout(250);
      await confirmStyle(page, d, 'Delete phrase');
    }
  }
  await closeAll(page);
  await prepare(page, 'turn');
  await openPath(page, d.cls === 'phone' ? [MENU, 'Conversation'] : [[/^whole conversation$/i, 'All of the conversation']]);
  const clear = await findControl(page, 'Clear conversation', { inDialogOnly: true });
  if (clear) {
    await pressLoc(page, clear);
    await page.waitForTimeout(250);
    await confirmStyle(page, d, 'Clear conversation');
    await shot(page, d, 'confirm-clear');
  }
  await closeAll(page);
  page.__state = null;
}

async function confirmStyle(page, d, what) {
  const c = await page.evaluate(() => {
    const dlg = [...document.querySelectorAll('dialog[open]')].pop();
    const btns = [...dlg.querySelectorAll('button')].filter((b) => b.getBoundingClientRect().height > 0);
    const safe = btns.find((b) => /^(keep|cancel)$/i.test(b.textContent.trim()));
    if (!safe) return null;
    const pair = [...safe.parentElement.querySelectorAll('button')];
    const act = pair.find((b) => b !== safe);
    const q = safe.closest('[data-confirm], [role=group], [role=alertdialog], li, section')?.querySelector('p, strong, b, h3, h4');
    const sb = safe.getBoundingClientRect();
    const ab = act?.getBoundingClientRect();
    return {
      safeFirst: pair.indexOf(safe) === 0,
      focused: document.activeElement === safe,
      sideBySide: ab ? Math.abs(sb.top - ab.top) < 2 : null,
      q: q ? { text: q.textContent.trim().slice(0, 50), weight: Number(getComputedStyle(q).fontWeight) } : null,
      act: act?.textContent.trim(),
    };
  });
  if (!c) return ck(4, 'confirm', d.id, false, `${what}: a Keep / Cancel button`);
  // Side by side from 600px wide, stacked below. The design does not say whether the screen or the surface is meant:
  // either reading passes (a 440px side panel on a tablet may go either way).
  const surfaceW = await page.evaluate(() => [...document.querySelectorAll('dialog[open]')].pop()?.getBoundingClientRect().width ?? innerWidth);
  ck(4, 'confirm', d.id, c.safeFirst && c.focused, `${what}: the safe choice comes first and has focus (${JSON.stringify(c)})`);
  const okLayout = c.sideBySide ? d.vw >= 600 : d.vw < 600 || surfaceW < 600;
  ck(4, 'confirm', d.id, okLayout, `${what}: ${c.sideBySide ? 'side by side' : 'stacked'} (screen ${d.vw}px, surface ${Math.round(surfaceW)}px)`);
  ck(4, 'confirm', d.id, !!c.q && c.q.weight >= 600, `${what}: the question is bold (${JSON.stringify(c.q)})`);
}

async function naming(page, d) {
  for (const s of SURFACES.filter((x) => (x.when ? x.when(d) : true) && x.kind(d) !== 'show' && x.needs !== 'turn' && x.phase <= 2)) {
    await prepare(page, s.needs);
    if (!(await openPath(page, s.open(d))).ok || !(await isOpen(page))) continue;
    const m = await measure(page);
    ck(4, 'naming', d.id, !m.groupTitles.some((g) => g.toLowerCase() === (m.title ?? '').toLowerCase()), `${s.id}: no group label repeats the title "${m.title}" (${m.groupTitles.join(' | ')})`);
    if (d.vw < 400) ck(4, 'naming', d.id, (m.titleLines ?? 1) <= 1, `${s.id}: the title "${m.title}" is on one line (${m.titleLines})`);
    if (s.id.startsWith('proof')) ck(4, 'naming', d.id, !/\bproof\b/i.test(m.groupTitles.join(' ') + ' ' + m.title), `Check the words has no "Proof" heading (${m.groupTitles.join(' | ')})`);
    if (s.id === 'phrases') {
      const lead = await page.evaluate(() => [...[...document.querySelectorAll('dialog[open]')].pop().querySelectorAll('.sheet__body button')].map((b) => b.textContent.trim())[0]);
      ck(4, 'naming', d.id, lead !== 'My words', `Phrases does not start with a My words button (first: ${lead})`);
    }
    await closeAll(page);
  }
  if (d.laptop) {
    await prepare(page, 'typed');
    const heads = await page.evaluate(() => [...document.querySelectorAll('h1, h2, h3, h4, [role=region]')].filter((h) => h.getBoundingClientRect().height > 0).map((h) => (h.getAttribute('aria-label') || h.textContent).trim().slice(0, 30)));
    ck(4, 'naming', d.id, !heads.some((h) => /^proof\b/i.test(h)) && heads.some((h) => /^check the words/i.test(h)), `the laptop's on-screen panel is headed "Check the words", not "Proof" (${JSON.stringify(heads)})`);
    await prepare(page, 'turn');
    ck(4, 'naming', d.id, !!(await findControl(page, /whole conversation/i)), 'the laptop conversation button says "Whole conversation"');
  }
}

/** Fix a word: focus on the first word, then on the first choice. */
async function fixFocus(page, d) {
  await prepare(page, 'typed');
  if (!(await openPath(page, d.laptop ? ['Fix a word'] : [MENU, 'Fix a word'])).ok) return;
  await page.waitForTimeout(250);
  const f1 = await page.evaluate(() => {
    const dlg = [...document.querySelectorAll('dialog[open]')].pop();
    const a = document.activeElement;
    const first = [...dlg.querySelectorAll('.sheet__body button')][0];
    return { onFirst: a === first, focus: (a?.textContent || a?.tagName || '').trim().slice(0, 30), first: first?.textContent.trim() };
  });
  ck(1, 'fix-focus', d.id, f1.onFirst, `Fix a word: focus on the first word (${f1.focus}; first ${f1.first})`);
  const first = page.locator('dialog[open] .sheet__body button').first();
  if (await first.count()) {
    await pressLoc(page, first);
    await page.waitForTimeout(250);
    const f2 = await page.evaluate(() => ({ body: document.activeElement === document.body, inside: [...document.querySelectorAll('dialog[open]')].pop()?.contains(document.activeElement), focus: (document.activeElement?.textContent || document.activeElement?.tagName || '').trim().slice(0, 30) }));
    ck(1, 'fix-focus', d.id, !f2.body && f2.inside, `Fix a word: after picking a word, focus is on a choice (${f2.focus})`);
    const reach = await reachable(page);
    ck(1, 'reachable', d.id, reach.bad.length === 0 && !reach.overflowHidden, `Fix "word" choices: every control scrolls into view (${reach.scrolls ? 'scrolls' : 'no scroll'}; out of reach ${JSON.stringify(reach.bad.slice(0, 3))})`);
    await shot(page, d, 'fix-word');
  }
  await closeAll(page);
}

async function matrix() {
  for (const d of DEVICES) {
    console.log(`\n${d.label}`);
    const { ctx, page } = await newDevice(d);
    try {
      await freshApp(page);
      page.__state = 'empty';
      await shot(page, d, 'main');
      for (const s of SURFACES) {
        if (!want(s.phase)) continue;
        if (s.when && !s.when(d)) continue;
        if (ONLY_SURFACES && !ONLY_SURFACES.includes(s.id)) continue;
        try {
          await testSurface(page, d, s);
        } catch (e) {
          ck(s.phase, 'error', d.id, false, `${s.id}: ${e.message.split('\n')[0]}`);
          page.__state = null;
          await shot(page, d, `${s.id}-error`).catch(() => {});
        }
      }
      if (!ONLY_SURFACES) {
        const extra = [
          [1, 'fix focus', () => fixFocus(page, d)],
          [1, 'menu children', () => (d.laptop ? null : menuChildren(page, d))],
          [1, 'backdrop exceptions', () => backdropExceptions(page, d)],
          [2, 'phone menu', () => (d.cls === 'phone' ? phoneMenu(page, d) : null)],
          [2, 'more', () => largeExtras(page, d)],
          [2, 'status', () => statusButton(page, d)],
          [2, 'voice', () => voiceSurface(page, d)],
          [3, 'settings', () => settingsShape(page, d)],
          [4, 'phrases, confirms, feedback', () => phrasesAndFeedback(page, d)],
          [4, 'naming', () => naming(page, d)],
        ];
        for (const [phase, name, fn] of extra) {
          if (!want(phase)) continue;
          try {
            await fn();
          } catch (e) {
            ck(phase, 'error', d.id, false, `${name}: ${e.message.split('\n')[0]}`);
            page.__state = null;
          }
        }
        // Last: it turns scanning on in this context.
        if (want(1)) {
          try {
            await backdropWhileScanning(page, d);
          } catch (e) {
            ck(1, 'error', d.id, false, `backdrop while scanning: ${e.message.split('\n')[0]}`);
          }
        }
      }
    } finally {
      await ctx.close();
    }
    if (!ONLY_SURFACES && want(4) && d.cls === 'phone') {
      try {
        await theySaidKeyboard(d);
      } catch (e) {
        ck(4, 'error', d.id, false, `they said keyboard: ${e.message.split('\n')[0]}`);
      }
    }
    if (RUN_SWITCH && !ONLY_SURFACES && ['p390', 's375', 't820', 'l1280'].includes(d.id)) await switchRuns(d);
  }
}

// ============================================================================================== run
try {
  if (RUN_WALK) {
    console.log('part 1: walkthrough');
    try {
      await walkthrough();
    } catch (e) {
      check(false, `the walkthrough stopped: ${e.message.split('\n')[0]}`);
    }
  }
  if (RUN_MATRIX) {
    console.log('\npart 2: matrix');
    await matrix();
  }
} finally {
  await browser.close();
}
if (RUN_MATRIX) {
  console.log(`\nmatrix: ${passes} passed, ${failures} failed`);
  if (failures) console.log(failed.map((f) => `  - ${f}`).join('\n'));
}
if (RUN_MATRIX) check(failures === 0, `the matrix: ${passes} passed, ${failures} failed`);
done('surfaces');
