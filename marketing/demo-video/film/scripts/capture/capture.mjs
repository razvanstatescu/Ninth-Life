// Still frames of the real running app (http://localhost:3000/app) for the film, plus where the
// important elements are in each image (src/data/captures.json) and a manifest of what was shot
// (manifest/captures.json). Every capture group starts from a fresh browser context: no stored
// settings, night theme, English, the Next.js dev badge hidden.
//
//   node scripts/capture/capture.mjs                 every capture
//   node scripts/capture/capture.mjs scan show       only these groups (see GROUPS below)
//   BASE_URL=http://localhost:3000 node ...          another server
//
// Needs the app's dev (or production) server running; it never starts, stops or builds it.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CONVO_SPEC, FILM_ROOT, LAPTOP, LAPTOP4, OUT_DIR, PHONE, SETTINGS_SPEC, SETTLE_MS, SHELL_SPEC, SHOW_SPEC, Session, TABLET, WIDE_SPEC, launchBrowser, sleep } from './lib.mjs';

/** Sentences typed on the keypad: one press per letter, 0 is space. */
const SENTENCES = {
  water: { keys: '4 0 6333 0 92837', text: 'I need water', digits: '4 6333 92837' },
  hello: { keys: '43556 0 24246', text: 'Hello again', digits: '43556 24246' },
  back: { keys: '48 0 47 0 4663 0 86 0 23 0 2225', text: 'It is good to be back', digits: '48 47 4663 86 23 2225' },
};
const pressed = (keys) => keys.replace(/\s+/g, '').split('').join(' ');

const MENU_BTN = '.phone-actions > .nl-btn:first-child';
const SHOW_BTN = '.phone-actions > .nl-btn:last-child';
const MENU_SHEET = 'dialog[data-overlay="menu"][open]';
const SETTINGS_SHEET = 'dialog[data-overlay="settings"][open]';

const ROWS = ['row 1 (keys 1 .,?!, 2 ABC, 3 DEF)', 'row 2 (keys 4 GHI, 5 JKL, 6 MNO)', 'row 3 (keys 7 PQRS, 8 TUV, 9 WXYZ)', 'row 4 (keys * Back, 0 Space, # Next)'];
const KEY_NAMES = { 1: '1 .,?!', 2: '2 ABC', 3: '3 DEF', 4: '4 GHI', 5: '5 JKL', 6: '6 MNO', 7: '7 PQRS', 8: '8 TUV', 9: '9 WXYZ', '*': '* Back', 0: '0 Space', '#': '# Next' };

/** "2 I need waves" style list of the suggestion rows (phones and tablets) or sentences (laptop). */
function listed(texts) {
  return Object.entries(texts)
    .filter(([k]) => /^candidate-\d+$/.test(k))
    .map(([, v]) => `"${v}"`)
    .join(', ');
}

// ---- capture groups -----------------------------------------------------------------------------

/** Phone, portrait: nothing typed, or a sentence typed; optionally offline after the first load. */
async function phone(browser, id, sentence, { offline = false } = {}) {
  const s = await Session.open(browser, PHONE);
  try {
    await s.openApp();
    await s.expectLayout('stack');
    await s.expectPill('On device');
    if (offline) {
      await s.ctx.setOffline(true);
      await s.expectPill('Offline');
    }
    if (sentence) {
      await s.type(sentence.keys);
      await s.expectSentence(sentence.text, sentence.digits);
    }
    const state = (t) => {
      const parts = [];
      if (offline) parts.push('Loaded online once, then the browser context was set offline (context.setOffline(true)); the status pill changed from "On device" to "Offline".');
      if (sentence) parts.push(`Typed "${sentence.text}" with the keyboard (keys ${pressed(sentence.keys)}; 0 is space). The sentence card reads "${t['sentence-text']}" with its keys "${t['sentence-digits']}" under it.`);
      else parts.push(`Fresh app, nothing typed: the sentence card shows the hint "${t['sentence-text']}" and the suggestion row "${t['candidates-empty'] ?? ''}".`);
      if (sentence) parts.push(t['candidate-1'] ? `Suggestion row: ${listed(t)}${t.more ? ' and More' : ''}.` : 'No suggestion row content.');
      parts.push(`Status pill: "${t.status}". Speak is ${sentence ? 'the ember button' : 'disabled (outlined)'}.`);
      return parts.join(' ');
    };
    return [await s.shoot(id, state, SHELL_SPEC)];
  } finally {
    await s.close();
  }
}

/** Tablet in landscape (split layout: keypad on the right). */
async function tablet(browser, id, sentence) {
  const s = await Session.open(browser, TABLET);
  try {
    await s.openApp();
    await s.expectLayout('split');
    await s.expectPill('On device');
    await s.type(sentence.keys);
    await s.expectSentence(sentence.text, sentence.digits);
    const state = (t) =>
      `Tablet in landscape (split layout, keypad on the right). Typed "${sentence.text}" (keys ${pressed(sentence.keys)}). Sentence card "${t['sentence-text']}" over "${t['sentence-digits']}"; suggestion rows: ${listed(t) || 'none'}${t.more ? ' and More' : ''}. Status pill: "${t.status}". Action bar: Menu, Speak, Show.`;
    return [await s.shoot(id, state, SHELL_SPEC)];
  } finally {
    await s.close();
  }
}

/**
 * Laptop (wide layout). The window is scrolled, if needed, so the sentences and the proof both show.
 * full: also the whole page as one tall image (`${id}-full`), for a camera that pans down it.
 */
async function laptop(browser, id, sentence, { full = false } = {}) {
  const s = await Session.open(browser, LAPTOP);
  try {
    await s.openApp();
    await s.expectLayout('wide');
    await s.expectPill('Offline dictionary ready');
    await s.type(sentence.keys);
    await s.expectSentence(sentence.text, sentence.digits);
    await sleep(SETTLE_MS);
    const fit = await s.page.evaluate(() => {
      const c = document.querySelector('.cands').getBoundingClientRect();
      const p = document.querySelector('.proof').getBoundingClientRect();
      return { candsTop: c.top + window.scrollY, proofBottom: p.bottom + window.scrollY, vh: window.innerHeight, docH: document.documentElement.scrollHeight };
    });
    let scrollY = 0;
    if (fit.proofBottom > fit.vh - 16) {
      scrollY = Math.max(0, Math.min(Math.ceil(fit.proofBottom - fit.vh + 32), Math.floor(fit.candsTop - 16), fit.docH - fit.vh));
      await s.page.evaluate((y) => window.scrollTo(0, y), scrollY);
    }
    const state = (t) =>
      `Laptop window 1440x900 (wide layout). Typed "${sentence.text}" (keys ${pressed(sentence.keys)}) with the keyboard. Sentence bar "${t['sentence-text']}" over "${t['sentence-digits']}" with Speak; sentences for your keys: ${listed(t)}; proof chips: ${Object.entries(t)
        .filter(([k]) => k.startsWith('proof-chip-'))
        .map(([, v]) => `"${v}"`)
        .join(', ')}. Pills: "${t.status}", "${t['status-model']}".${scrollY ? ` The window is scrolled down ${scrollY}px so the sentences list and the proof panel are both in view (at the top of the page they do not both fit in 900px; the header and the keypad's top row are cut at the top edge).` : ''}`;
    const shots = [await s.shoot(id, state, WIDE_SPEC, scrollY ? { scrollY } : {})];
    if (full) {
      await s.page.evaluate(() => window.scrollTo(0, 0));
      shots.push(
        await s.shoot(
          `${id}-full`,
          (t) => `The same page as ${id}, as one tall image of the whole page (1440 CSS px wide, scrolled to the top): header with pills, They said, sentence bar "${t['sentence-text']}", the ${Object.keys(t).filter((k) => /^candidate-\d+$/.test(k)).length} sentences, the proof panel, the keypad, scan control, keyboard hint and footer. Boxes are in this image's pixels (document coordinates x 2).`,
          WIDE_SPEC,
          {},
          { fullPage: true },
        ),
      );
    }
    return shots;
  } finally {
    await s.close();
  }
}

/** Open Settings on the phone by touch: Menu, then Settings in the Menu sheet. */
async function openSettings(s) {
  await s.press(MENU_BTN);
  await s.until('the Menu sheet', (sel) => !!document.querySelector(sel), MENU_SHEET);
  await sleep(SETTLE_MS);
  await s.press(`${MENU_SHEET} button`, { hasText: /^Settings$/ });
  await s.until('the Settings sheet', (sel) => !!document.querySelector(sel), SETTINGS_SHEET);
  await sleep(SETTLE_MS);
}

/** Choose "One switch" under Ways to type; returns the scan speed in ms that the sheet shows. */
async function chooseOneSwitch(s) {
  await s.press(`${SETTINGS_SHEET} label.seg__opt:has(input[value="scan1"])`);
  await s.until('One switch to be chosen', (sel) => document.querySelector(`${sel} input[value="scan1"]`)?.checked === true, SETTINGS_SHEET);
  await sleep(SETTLE_MS);
  const shown = await s.page.evaluate((sel) => document.querySelector(`${sel} .field:has(> [data-scan-row="Scan speed"]) .field__value`)?.textContent ?? '', SETTINGS_SHEET);
  const m = /([\d.]+)\s*s a step/.exec(shown);
  if (!m) throw new Error(`Could not read the scan speed ("${shown}")`);
  return Math.round(Number(m[1]) * 1000);
}

/** Settings sheet scrolled to Ways to type: scan speed before and after making it slower. */
async function settings(browser) {
  const s = await Session.open(browser, PHONE);
  try {
    await s.openApp();
    await s.expectLayout('stack');
    await s.expectPill('On device');
    await openSettings(s);
    const before = await chooseOneSwitch(s);
    // Scroll the sheet (as a swipe would) so Ways to type sits at the top, under the sheet's title bar.
    await s.page.evaluate((sel) => {
      const body = document.querySelector(`${sel} .sheet__body`);
      const sec = body.querySelector('section[aria-labelledby="set-access"]');
      body.scrollTop += sec.getBoundingClientRect().top - body.getBoundingClientRect().top - 16;
    }, SETTINGS_SHEET);
    // The voice section (with any voice picker) must be out of view.
    const voiceInView = await s.page.evaluate((sel) => {
      const body = document.querySelector(`${sel} .sheet__body`).getBoundingClientRect();
      const v = document.querySelector(`${sel} section[aria-labelledby="set-voice"]`).getBoundingClientRect();
      const pick = document.querySelector(`${sel} select`);
      return { voiceBottom: v.bottom, bodyTop: body.top, picker: !!pick };
    }, SETTINGS_SHEET);
    if (voiceInView.voiceBottom > voiceInView.bodyTop) throw new Error(`The voice section is still in view: ${JSON.stringify(voiceInView)}`);
    const speedState = (label) => (t) =>
      `Settings sheet (phone), scrolled to Ways to type. Access: One switch chosen (tapped). ${label} Scan speed reads "${t['scan-speed-value']}"; help: "${t['scan-speed-help']}". The Voice section is scrolled out of view (no voice names on screen).`;
    // With One switch chosen, the page under the sheet is 1px wider than the screen (the "Scanning paused"
    // pill, an app bug) and the sheet sits 1px right; show the page's right edge so the sheet fills the frame.
    const a = await s.shoot('settings-speed-a', speedState(`Before: the default.`), SETTINGS_SPEC, { scanMs: before }, { alignRight: true });
    // Slower: four taps of 0.2 s each.
    const slower = `${SETTINGS_SHEET} [data-scan-row="Scan speed"] > .nl-btn:last-child`;
    for (let i = 0; i < 4; i++) {
      await s.press(slower);
      await sleep(250);
    }
    const target = before + 800;
    await s.until(
      'the slower scan speed',
      ({ sel, txt }) => (document.querySelector(`${sel} .field:has(> [data-scan-row="Scan speed"]) .field__value`)?.textContent ?? '').trim() === txt,
      { sel: SETTINGS_SHEET, txt: `${Number.isInteger(target / 1000) ? target / 1000 : (target / 1000).toFixed(1)} s a step` },
    );
    const b = await s.shoot('settings-speed-b', speedState(`After four taps on Slower (0.2 s each):`), SETTINGS_SPEC, { scanMs: target }, { alignRight: true });
    return [a, b];
  } finally {
    await s.close();
  }
}

/** Show mode with "It is good to be back", upright and after Flip. */
async function show(browser) {
  const s = await Session.open(browser, PHONE);
  const want = SENTENCES.back;
  try {
    await s.openApp();
    await s.expectLayout('stack');
    await s.expectPill('On device');
    await s.type(want.keys);
    await sleep(SETTLE_MS);
    const first = await s.sentence();
    let chose = '';
    if (first.text !== want.text) {
      // Another reading is on top: choose ours from the suggestion row (a tap), as a person would.
      const row = s.page.locator('.phone-sugg__item', { hasText: want.text }).first();
      if ((await row.count()) === 0) throw new Error(`The card reads "${first.text}" and no suggestion reads "${want.text}"`);
      await row.tap();
      chose = ` The card first read "${first.text}"; "${want.text}" was chosen from the suggestion row.`;
    }
    await s.expectSentence(want.text, want.digits);
    await sleep(SETTLE_MS);
    await s.press(SHOW_BTN);
    await s.until('show mode', (t) => document.querySelector('dialog.show[open] .show__text')?.textContent?.trim() === t, want.text);
    const typed = `Typed "${want.text}" (keys ${pressed(want.keys)}); the sentence card read "${want.text}".${chose}`;
    const a = await s.shoot('show-upright', (t) => `${typed} Show tapped: big text for the other person. Label "${t['show-label']}", text "${t['show-text']}", buttons Done and Flip.`, SHOW_SPEC);
    await s.press('dialog.show[open] [data-action="flip"]');
    await s.until('the flipped message', () => !!document.querySelector('dialog.show[open] .show__message.is-flipped'));
    const b = await s.shoot('show-flipped', (t) => `${typed} Show, then Flip tapped: the label and "${t['show-text']}" are turned 180 degrees for the person across the table; Done and Flip stay upright.`, SHOW_SPEC);
    return [a, b];
  } finally {
    await s.close();
  }
}

/**
 * Third cut (2026-11-19), the real-app reel (s12b): one conversation on a laptop, at 4x. The app's own speech is
 * replaced by the e2e test stub, and the browser's speech recognition by a fake that "hears" one line on request, so
 * Listen can be shown. A stub voice is not taken as a voice by this headless browser, so Speak and the quick replies
 * open the app's big-text fallback; it is closed with Done (the turn is in the conversation either way).
 */
async function convo(browser) {
  const s = await Session.open(browser, LAPTOP4);
  const p = s.page;
  await s.ctx.addInitScript(() => {
    class FakeRec {
      constructor() { this.lang = 'en-US'; this.continuous = false; this.interimResults = true; this._h = {}; }
      addEventListener(t, f) { (this._h[t] ||= []).push(f); }
      removeEventListener(t, f) { this._h[t] = (this._h[t] || []).filter((g) => g !== f); }
      _emit(t, e) { const ev = Object.assign({ type: t }, e || {}); if (this['on' + t]) this['on' + t](ev); for (const f of this._h[t] || []) f(ev); }
      start() { window.__rec = this; setTimeout(() => { this._emit('start'); this._emit('audiostart'); this._emit('speechstart'); }, 30); }
      hear(text) { const res = [{ transcript: text, confidence: 0.92 }]; res.isFinal = true; this._emit('result', { resultIndex: 0, results: [res] }); this._emit('speechend'); this._emit('end'); }
      stop() { this._emit('end'); }
      abort() { this._emit('end'); }
    }
    window.SpeechRecognition = FakeRec;
    window.webkitSpeechRecognition = FakeRec;
    const voice = { voiceURI: 'stub', name: 'Stub voice', lang: 'en-US', localService: true, default: true };
    class Utterance { constructor(text) { this.text = text; this.voice = null; this.lang = ''; this.rate = 1; this.pitch = 1; } }
    const synth = { speaking: false, pending: false, paused: false, onvoiceschanged: null, getVoices: () => [voice],
      speak(u) { setTimeout(() => u.onstart?.(), 10); setTimeout(() => u.onend?.(), 600); },
      cancel() {}, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {} };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true, writable: true });
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true, writable: true });
  });
  const blur = () => p.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  const closeShow = async () => {
    const done = p.locator('dialog.show[open] button', { hasText: 'Done' });
    if (await done.count()) await done.first().click();
    await s.until('the big text to close', () => !document.querySelector('dialog.show[open]'));
  };
  const out = [];
  try {
    await s.openApp();
    await s.expectLayout('wide');
    await p.locator('button', { hasText: 'Type their line' }).first().click();
    await p.locator('.thread-panel input.input').first().fill('What do you need?');
    await p.locator('button[type="submit"]', { hasText: 'Done' }).first().click();
    await s.until('their line', () => /What do you need\?/.test(document.querySelector('.thread-panel .thread-row')?.textContent ?? ''));
    await blur();
    await s.type(SENTENCES.water.keys);
    await s.expectSentence(SENTENCES.water.text, SENTENCES.water.digits);
    await s.press('.speak-group [data-action="speak"]');
    await sleep(400);
    await closeShow();
    await p.locator('.speak-group button[aria-label="Clear"]').first().click(); // the card's x (it becomes Undo)
    await s.until('the cleared card', () => /Press a key/.test(document.querySelector('.speak-group .nl-speakbar__text')?.textContent ?? ''));
    await blur();
    out.push(await s.shoot('convo-you', 'Laptop at 4x. They said "What do you need?"; "I need water" was typed and spoken (stub voice, big-text fallback closed), then cleared. The strip shows the last turn, "You: I need water", with Listen, Type their line and Whole conversation; quick replies under the empty card. Nothing is ember.', CONVO_SPEC));
    await p.locator('.thread-panel button', { hasText: /^Listen$/ }).first().click();
    const allow = p.locator('button', { hasText: 'Allow and listen' });
    if (await allow.count()) await allow.first().click();
    await s.until('listening', () => /Listening/.test(document.querySelector('.thread-panel')?.textContent ?? ''));
    await blur();
    out.push(await s.shoot('convo-listening', 'Listen pressed (voice to text allowed): the They said panel is open and listening, "Listening. Ask them to speak now.", with Stop, Done and Cancel. A fake speech recogniser stands in for the browser\'s.', CONVO_SPEC));
    await p.evaluate(() => window.__rec && window.__rec.hear('Do you want it cold?'));
    await s.until('the heard line', () => (document.querySelector('.thread-panel input.input')?.value ?? '') === 'Do you want it cold?');
    await blur();
    out.push(await s.shoot('convo-heard', 'The recogniser heard "Do you want it cold?": the line is in the They said field, with Listen, Done and Cancel.', CONVO_SPEC));
    await p.locator('.thread-panel button', { hasText: /^Done$/ }).first().click();
    await s.until('their new line', () => /Do you want it cold\?/.test(document.querySelector('.thread-panel .thread-row')?.textContent ?? ''));
    await blur();
    out.push(await s.shoot('convo-their', 'Done: the strip shows "They: Do you want it cold?"; quick replies and the reply types (Agree, Disagree, Ask) under the empty card. Nothing is ember.', CONVO_SPEC));
    await p.locator('.quick-reply', { hasText: /^Yes\.$/ }).first().click();
    await sleep(400);
    await closeShow();
    await s.until('the reply in the strip', () => /Yes\./.test(document.querySelector('.thread-panel .thread-row')?.textContent ?? ''));
    await blur();
    out.push(await s.shoot('convo-yes', 'The quick reply "Yes." pressed once (spoken by the stub voice; its big-text fallback closed): the strip shows "You: Yes."', CONVO_SPEC));
    await p.locator('.thread-panel button', { hasText: 'Whole conversation' }).first().click();
    await s.until('the conversation sheet', () => !!document.querySelector('dialog[open]'));
    await sleep(500);
    await blur();
    out.push(await s.shoot('convo-thread', 'Whole conversation open: newest first, "You said: Yes.", "They said: Do you want it cold?", "You said: I need water", "They said: What do you need?". Kept in memory only.', CONVO_SPEC));
    return out;
  } finally {
    await s.close();
  }
}

/** Third cut: Show and Flip on the phone with "I need water" (the reel's last shot). */
async function showWater(browser) {
  const s = await Session.open(browser, PHONE);
  const want = SENTENCES.water;
  try {
    await s.openApp();
    await s.expectLayout('stack');
    await s.type(want.keys);
    await s.expectSentence(want.text, want.digits);
    await sleep(SETTLE_MS);
    await s.press(SHOW_BTN);
    await s.until('show mode', (t) => document.querySelector('dialog.show[open] .show__text')?.textContent?.trim() === t, want.text);
    const a = await s.shoot('show-water-upright', (t) => `Typed "${want.text}"; Show tapped: label "${t['show-label']}", text "${t['show-text']}", buttons Done and Flip.`, SHOW_SPEC);
    await s.press('dialog.show[open] [data-action="flip"]');
    await s.until('the flipped message', () => !!document.querySelector('dialog.show[open] .show__message.is-flipped'));
    const b = await s.shoot('show-water-flipped', (t) => `Show, then Flip tapped: the label and "${t['show-text']}" are turned 180 degrees for the person across the table; Done and Flip stay upright.`, SHOW_SPEC);
    return [a, b];
  } finally {
    await s.close();
  }
}

/** Where the scan highlight is: the ringed keypad row (0-3, -1 none) and the lit key. */
function scanStateInPage() {
  const rows = [...document.querySelectorAll('.nl-keypad__row')];
  return {
    row: rows.findIndex((r) => r.classList.contains('is-scanning')),
    key: document.querySelector('.nl-key.is-lit')?.getAttribute('data-key') ?? null,
    other: [...document.querySelectorAll('.is-lit, .is-scanning')].filter((e) => !e.matches('.nl-key, .nl-keypad__row')).length,
  };
}

/** Wait until the highlight is on keypad row `row` (0-3) with key `key` lit (or none). */
function expectScan(s, row, key) {
  return s.waitFor(`scan highlight on row ${row + 1}${key ? `, key ${key}` : ''}`, async () => {
    const st = await s.page.evaluate(scanStateInPage);
    return { ok: st.row === row && st.key === key && st.other === 0, ...st };
  });
}

/** Phone with "I need" typed and one-switch scanning turned on by touch; returns the scan step in ms. */
async function scanningReady(s) {
  await s.openApp();
  await s.expectLayout('stack');
  await s.expectPill('On device');
  await s.type('4 0 6333 0');
  await s.expectSentence('I need', '4 6333');
  // Menu > Settings > Ways to type > One switch, then Close: all by touch.
  await openSettings(s);
  const step = await chooseOneSwitch(s);
  await s.press(`${SETTINGS_SHEET} .sheet__head .nl-btn`);
  await s.until('Settings to close', () => !document.querySelector('dialog[open]'));
  await s.expectPill('Scanning paused', 1);
  return step;
}

/**
 * One-switch scanning on the phone, from "I need" (I need water minus its last word): the highlight
 * steps down the keypad rows, a press chooses row 3, the highlight steps along its keys, a press
 * chooses 9 (WXYZ) and "w" appears. Time is Playwright's clock, paused between steps and advanced by
 * exactly one scan step (the app's own setInterval fires), so every still is a settled highlight.
 */
async function scan(browser) {
  const s = await Session.open(browser, PHONE, { clock: true });
  const shots = [];
  try {
    const step = await scanningReady(s);
    await s.pauseClock();
    let n = 0;
    const still = async (desc, stepInfo) => {
      n += 1;
      const id = `scan-${String(n).padStart(2, '0')}`;
      shots.push(await s.shoot(id, (t) => `${desc} Sentence card: "${t['sentence-text']}" (keys "${t['sentence-digits']}"). Pills: "${t.status}", "${t['scan-pill']}".`, SHELL_SPEC, { step: { n, scanMs: step, ...stepInfo } }));
    };

    await expectScan(s, -1, null);
    // The waiting state is not one of the stills: its "Scanning paused" pill makes the header 1px wider
    // than a 390px screen, so the They said button is cut at the right edge (an app bug). Kept for review.
    await s.evidence('review-scan-waiting-header-overflow');

    // Press 1 starts scanning: a tap on the sentence card's text (a press anywhere outside a control is the switch).
    // A tap, not Space: focus is still on Menu (returned there when Settings closed), and a key press would
    // draw a focus ring on it next to the scan highlight (an app bug, see the review notes).
    await s.press('[data-section="speak"] .nl-speakbar__text');
    await expectScan(s, 0, null);
    await s.expectPill('Scanning', 1);
    await still(`One-switch scanning is on and "I need" is typed. The switch was pressed once (scanning starts): the highlight is on ${ROWS[0]}, ringed in ember. Speak turns quiet so the highlight is the one ember thing.`, {
      phase: 'rows',
      highlight: ROWS[0],
      pressedBefore: 'switch press 1 (starts scanning)',
    });
    for (const r of [1, 2]) {
      await s.advance(step);
      await expectScan(s, r, null);
      await still(`One scan step later (${step / 1000} s): the highlight moves down to ${ROWS[r]}.`, { phase: 'rows', highlight: ROWS[r], pressedBefore: 'nothing (the highlight steps on its own)' });
    }
    // Press 2 chooses row 3; its first key lights.
    await s.page.keyboard.press('Space');
    await expectScan(s, 2, '7');
    await still(`Switch pressed while ${ROWS[2]} was highlighted: the row is chosen and the highlight moves along its keys, starting with key ${KEY_NAMES[7]} (lit ember; the row keeps its ring).`, {
      phase: 'keys',
      highlight: `key ${KEY_NAMES[7]}`,
      pressedBefore: 'switch press 2 (chooses row 3)',
    });
    for (const k of ['8', '9']) {
      await s.advance(step);
      await expectScan(s, 2, k);
      await still(`One scan step later: key ${KEY_NAMES[k]} is lit.`, { phase: 'keys', highlight: `key ${KEY_NAMES[k]}`, pressedBefore: 'nothing (the highlight steps on its own)' });
    }
    // Press 3 chooses key 9: a letter appears and scanning starts again from row 1.
    await s.page.keyboard.press('Space');
    await s.expectSentence('I need w', '4 6333 9');
    await expectScan(s, 0, null);
    await still(`Switch pressed while key ${KEY_NAMES[9]} was lit: key 9 is typed, so "w" appears in the sentence card ("I need w", keys "4 6333 9"), the suggestion row changes, and the highlight starts again on ${ROWS[0]} for the next letter.`, {
      phase: 'chosen',
      highlight: ROWS[0],
      pressedBefore: 'switch press 3 (chooses key 9 WXYZ)',
      typed: '9',
    });
    await s.advance(step);
    await expectScan(s, 1, null);
    await still(`One scan step later: the highlight moves on to ${ROWS[1]}, ready for the next letter.`, { phase: 'rows', highlight: ROWS[1], pressedBefore: 'nothing (the highlight steps on its own)' });
    return shots;
  } finally {
    await s.close();
  }
}

/**
 * Not stills for the film: two switch-scanning problems in the app, reproduced for review. A
 * screenshot goes to _takes/captures/ and the measurements to the console; nothing is added to the data.
 * 1. Focus: after One switch is turned on by touch and Settings closed, focus is back on Menu, and the
 *    first switch press with Space draws a focus ring on Menu next to the scan highlight.
 * 2. Timing: choosing a row does not restart the scan timer, so the row's first key stays lit only for
 *    what is left of the step (here the row is chosen 100 ms before the step ends).
 */
async function review(browser) {
  const s = await Session.open(browser, PHONE, { clock: true });
  try {
    const step = await scanningReady(s);
    await s.pauseClock();
    await s.page.keyboard.press('Space'); // switch press 1, with focus still on Menu
    await expectScan(s, 0, null);
    const ring = await s.page.evaluate(() => {
      const a = document.activeElement;
      return a && a !== document.body && a.matches(':focus-visible') ? (a.textContent ?? '').trim() : null;
    });
    await s.evidence('review-scan-menu-focus-ring');
    console.log(`  focus: after the first Space switch press, a focus ring is ${ring ? `on "${ring}"` : 'not visible'}`);
    await s.advance(step); // row 2 lit
    await expectScan(s, 1, null);
    await s.advance(step - 100); // 100 ms before the next step
    await s.page.keyboard.press('Space'); // choose row 2: key 4 lights
    await expectScan(s, 1, '4');
    await s.advance(100);
    const after = await s.page.evaluate(scanStateInPage);
    console.log(`  timing: row chosen ${step - 100} ms into a ${step} ms step; 100 ms later the lit key is ${after.key} (${after.key === '4' ? 'timer restarted' : 'key 4 was lit for 100 ms'})`);
    return [];
  } finally {
    await s.close();
  }
}

// ---- run ----------------------------------------------------------------------------------------

const GROUPS = {
  empty: (b) => phone(b, 'phone-empty', null),
  water: (b) => phone(b, 'phone-water', SENTENCES.water),
  hello: (b) => phone(b, 'phone-hello', SENTENCES.hello),
  offline: (b) => phone(b, 'phone-offline', SENTENCES.water, { offline: true }),
  tablet: (b) => tablet(b, 'tablet-water', SENTENCES.water),
  laptop: (b) => laptop(b, 'laptop-water', SENTENCES.water, { full: true }),
  'laptop-hello': (b) => laptop(b, 'laptop-hello', SENTENCES.hello),
  scan: (b) => scan(b),
  settings: (b) => settings(b),
  show: (b) => show(b),
  review: (b) => review(b),
  convo: (b) => convo(b),
  'show-water': (b) => showWater(b),
};
/** Ids a group owns when their number can change: older ones it did not shoot again are removed. */
const OWNED = { scan: /^scan-\d+$/ };
/** Order of the entries in the JSON files. */
const ORDER = ['phone-empty', 'phone-water', 'phone-hello', 'phone-offline', 'tablet-water', 'laptop-water', 'laptop-water-full', 'laptop-hello', 'scan-', 'settings-speed-', 'show-upright', 'show-flipped', 'show-water-', 'convo-'];
const rank = (id) => {
  const i = ORDER.findIndex((o) => (o.endsWith('-') ? id.startsWith(o) : id === o));
  return i < 0 ? ORDER.length : i;
};
const byOrder = (a, b) => rank(a) - rank(b) || a.localeCompare(b);

/** JSON with 2-space indents, but number arrays (boxes, viewports) kept on one line. */
function toJson(value) {
  return `${JSON.stringify(value, null, 2).replace(/\[\s*(-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?)*)\s*\]/g, (_, inner) => `[${inner.split(/\s*,\s*/).join(', ')}]`)}\n`;
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function main() {
  const wanted = process.argv.slice(2);
  const unknown = wanted.filter((g) => !GROUPS[g]);
  if (unknown.length) throw new Error(`Unknown group(s): ${unknown.join(', ')}. Groups: ${Object.keys(GROUPS).join(', ')}`);
  const groups = wanted.length ? wanted : Object.keys(GROUPS);
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await launchBrowser();
  console.log(`Chrome ${browser.version()}`);
  const records = [];
  const failures = [];
  const done = [];
  try {
    for (const g of groups) {
      console.log(`[${g}]`);
      try {
        records.push(...(await GROUPS[g](browser)));
        done.push(g);
      } catch (err) {
        failures.push(`${g}: ${err instanceof Error ? err.message : String(err)}`);
        console.error(`  FAILED ${g}: ${err instanceof Error ? err.stack : String(err)}`);
      }
    }
  } finally {
    await browser.close();
  }

  // Merge into the JSON files, so a run of a few groups keeps the others.
  const dataFile = path.join(FILM_ROOT, 'src', 'data', 'captures.json');
  const manFile = path.join(FILM_ROOT, 'manifest', 'captures.json');
  const data = await readJson(dataFile, {});
  let man = await readJson(manFile, []);
  const shot = new Set(records.map((r) => r.id));
  for (const g of done) {
    const owned = OWNED[g];
    if (!owned) continue;
    for (const id of Object.keys(data).filter((k) => owned.test(k) && !shot.has(k))) {
      delete data[id];
      for (const dir of [OUT_DIR, path.join(FILM_ROOT, '_takes', 'captures')]) await rm(path.join(dir, `${id}.png`), { force: true });
      console.log(`  removed stale ${id}`);
    }
    man = man.filter((m) => !owned.test(m.id) || shot.has(m.id));
  }
  for (const r of records) {
    data[r.id] = r.data;
    const i = man.findIndex((m) => m.id === r.id);
    if (i >= 0) man[i] = r.manifest;
    else man.push(r.manifest);
  }
  const sortedData = Object.fromEntries(Object.keys(data).sort(byOrder).map((k) => [k, data[k]]));
  man.sort((a, b) => byOrder(a.id, b.id));
  await mkdir(path.dirname(dataFile), { recursive: true });
  await mkdir(path.dirname(manFile), { recursive: true });
  await writeFile(dataFile, toJson(sortedData));
  await writeFile(manFile, toJson(man));

  // Downscaled copies for looking at the stills (macOS sips).
  const takes = path.join(FILM_ROOT, '_takes', 'captures');
  await mkdir(takes, { recursive: true });
  for (const r of records) {
    try {
      execFileSync('sips', ['-Z', '1400', path.join(OUT_DIR, `${r.id}.png`), '--out', path.join(takes, `${r.id}.png`)], { stdio: 'ignore' });
    } catch {
      /* sips is optional */
    }
  }

  const warned = records.filter((r) => r.warnings.length);
  for (const r of warned) console.log(`warnings for ${r.id}:\n  ${r.warnings.join('\n  ')}`);
  console.log(`\n${records.length} still(s) written to ${path.relative(FILM_ROOT, OUT_DIR)}/; data in src/data/captures.json, manifest in manifest/captures.json`);
  if (failures.length) {
    console.error(`\nFailed groups:\n  ${failures.join('\n  ')}`);
    process.exitCode = 1;
  }
}

await main();
