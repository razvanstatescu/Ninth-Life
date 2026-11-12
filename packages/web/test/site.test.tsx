// The website at / (marketing-site requirements MS-1 to MS-13, design.md "Test plan" site.test.tsx).
// Renders app/page.tsx's default export and checks structure, copy, claims, drawings and reveal marks.
// The copy check reads content.md, so the page and its copy cannot drift.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import HomePage, { metadata } from '@/app/page';
import { NOT_A_MEDICAL_DEVICE } from '@/components/Footer';
import { Icon, type IconName } from '@/components/Icon';
import { HERO_KEY_SIZE, KEY_DRAWING_SIZE, KEY_DRAWING_XL_SIZE, TOUCH_MIN_SIZE, TOUCH_XL_SIZE } from '@/components/site/KeypadPicture';
import { SITE_MOTION_BOOT } from '@/components/site/motion';
import { lastChangeMs } from '@/components/site/pictures/roles';
import {
  METHOD_URL,
  RESULTS_URL,
  finishedKeys,
  finishedSentence,
  getDemoData,
  getProofExample,
  getResults,
  getSpellExample,
  proofSaidLine,
} from '@/components/site/site-data';
import { mapKey } from '@/lib/keyboard';
import { RANKING_SENT, providerCopy } from '@/lib/rankingProvider';

const web = (rel: string) => resolve(__dirname, '..', rel);
const repoRoot = resolve(__dirname, '../../..');
const read = (path: string) => readFileSync(path, 'utf8');
const CONTENT = read(resolve(repoRoot, '.kiro/specs/marketing-site/content.md'));

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();

/** The rendered text: body text plus every aria-label value, whitespace collapsed. */
function textOf(root: Element): string {
  const labels = [...root.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label') ?? '');
  return collapse([root.textContent ?? '', ...labels].join(' '));
}
const pageText = () => textOf(document.body);

/** content.md sections "## 0." to "## 12.", keyed by number. */
function contentSections(): Map<number, string> {
  const start = CONTENT.indexOf('\n## 0.');
  const s12 = CONTENT.indexOf('\n## 12.');
  const end = CONTENT.indexOf('\n## ', s12 + 1);
  const out = new Map<number, string>();
  for (const sec of CONTENT.slice(start, end === -1 ? undefined : end).split(/\n(?=## )/)) {
    const n = sec.match(/^\n?## (\d+)\./)?.[1];
    if (n !== undefined) out.set(Number(n), sec);
  }
  return out;
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

const iconNode = (name: IconName) => {
  const holder = document.createElement('div');
  holder.innerHTML = renderToStaticMarkup(<Icon name={name} />);
  return holder.firstElementChild!;
};

const $ = (sel: string) => document.querySelector(sel);
const $$ = (sel: string, root: ParentNode = document) => [...root.querySelectorAll(sel)];
const follows = (a: Node, b: Node) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]';

const SECTION_IDS = ['how', 'proof', 'conversation', 'access', 'privacy', 'results', 'limits', 'faq', 'source', 'start'];

beforeEach(() => {
  render(<HomePage />);
});
afterEach(cleanup);

describe('structure and landmarks (MS-3, MS-1.6)', () => {
  it('MS-3.1 one h1 "Ninth Life" and the ten sections in order, each labelled by its h2', () => {
    const h1s = $$('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0]!.textContent).toBe('Ninth Life');
    const sections = $$('main > section');
    expect(sections.map((s) => s.id)).toEqual(SECTION_IDS);
    for (const s of sections) {
      const h2 = s.querySelector('h2');
      expect(h2).not.toBeNull();
      expect(s.getAttribute('aria-labelledby')).toBe(h2!.id);
    }
  });

  it('MS-3.2 the skip link comes first and targets main; the banner holds the bar and the hero; the footer follows main', () => {
    const links = $$('.site a[href]');
    expect(links[0]!.textContent).toBe('Skip to content');
    expect(links[0]!.getAttribute('href')).toBe('#main');
    const main = $('main#main')!;
    expect(main).not.toBeNull();
    expect(main.getAttribute('tabindex')).toBe('-1');
    const top = $('header#top')!;
    expect(top.querySelector('nav[aria-label="Main"]')).not.toBeNull();
    expect(top.querySelector('.site-hero h1')).not.toBeNull();
    expect(top.querySelector('a.nl-btn[href="/app"]')).not.toBeNull();
    const footer = $('.site > footer')!;
    expect(follows(main, footer)).toBe(true);
    // Nothing outside the landmarks but the skip link.
    const site = $('.site')!;
    const children = [...site.children].map((c) => c.tagName.toLowerCase()).filter((t) => t !== 'script');
    expect(children).toEqual(['a', 'header', 'main', 'footer']);
  });

  it('MS-3.3 the Main navigation links to how, proof, access, privacy and faq, and each target exists', () => {
    const hrefs = $$('nav[aria-label="Main"] a').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['#how', '#proof', '#access', '#privacy', '#faq']);
    for (const h of hrefs) expect(document.getElementById(h!.slice(1))).not.toBeNull();
  });

  it('MS-3.4 every question is a closed native details with the question as its summary', () => {
    const items = $$('#faq details');
    expect(items).toHaveLength(9);
    for (const d of items) {
      expect(d.hasAttribute('open')).toBe(false);
      expect(d.firstElementChild!.tagName).toBe('SUMMARY');
    }
  });

  it('MS-3.5 metadata: title, description, Open Graph and twitter card from content.md, no keywords or noindex', () => {
    const cell = (field: string) => CONTENT.match(new RegExp(`^\\| \`${field}\` \\| (.+?) \\|$`, 'm'))?.[1];
    expect(metadata.title).toBe(cell('<title>'));
    expect(metadata.description).toBe(cell('description'));
    const og = metadata.openGraph as Record<string, unknown>;
    expect(og.title).toBe(cell('og:title'));
    expect(og.description).toBe(cell('og:description'));
    expect(og).toMatchObject({ type: 'website', siteName: 'Ninth Life', locale: 'en' });
    const tw = metadata.twitter as Record<string, unknown>;
    expect(tw).toMatchObject({ card: 'summary', title: cell('og:title'), description: cell('og:description') });
    expect('keywords' in metadata).toBe(false);
    expect('robots' in metadata).toBe(false);
  });

  it('MS-1.6 every "Open the app" is a plain link to /app, and exactly two are primary', () => {
    const open = $$('a').filter((a) => collapse(a.textContent ?? '') === 'Open the app');
    expect(open.length).toBe(5);
    for (const a of open) {
      expect(a.tagName).toBe('A');
      expect(a.getAttribute('href')).toBe('/app');
    }
    expect(open.filter((a) => a.classList.contains('nl-btn--primary'))).toHaveLength(2);
    expect($$('.nl-btn--primary')).toHaveLength(2);
    expect($('header#top .site-bar .nl-btn')!.classList.contains('nl-btn--secondary')).toBe(true);
    expect($('#proof a.nl-btn')!.classList.contains('nl-btn--secondary')).toBe(true);
  });
});

describe('copy and claims (MS-4, MS-5)', () => {
  it('MS-4.1 the page shows the copy of content.md (bold strings, the §9 answers, literal fragments of {value} strings)', () => {
    const results = getResults();
    const sections = contentSections();
    expect([...sections.keys()]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const strings: string[] = [];
    for (const [n, sec] of sections) {
      for (const m of sec.matchAll(/\*\*([^*]+)\*\*/g)) strings.push(m[1]!);
      if (n === 9) for (const m of sec.matchAll(/^- \*\*[^*]+\*\* (.+)$/gm)) strings.push(m[1]!);
    }
    // Not in the first render by design: later demo states, no speech engine in jsdom, the live region
    // (filled only after a play the person started) and the null-results line (results exist in the repo).
    const notInFirstRender = new Set([
      'Play the example again',
      'Stop',
      'Hear it',
      'The eval results are not available in this build.',
      'Typed {codes}. Ninth Life shows: {sentence}.',
    ]);
    const text = pageText();
    let checked = 0;
    for (const raw of strings) {
      const s = collapse(raw);
      if (notInFirstRender.has(s)) continue;
      if (s.startsWith('Model ranking has also been measured') && !results?.modelRuns) continue;
      if (s.includes('{')) {
        for (const fragment of s.split(/\{[^}]+\}/).map((f) => f.trim()).filter((f) => f.length >= 8)) {
          expect(text, `fragment of "${s}"`).toContain(fragment);
          checked += 1;
        }
      } else {
        expect(text).toContain(s);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('MS-4.1 no exclamation marks in the page copy', () => {
    // The 1 key's drawn punctuation ".,?!" is the keypad layout, not copy.
    const text = pageText().split('.,?!').join('');
    expect(text).not.toContain('!');
  });

  it('MS-4.2 no banned claim and no condition named as who it is for', () => {
    let text = pageText().split(NOT_A_MEDICAL_DEVICE).join(' ');
    text = text.split('Is it a medical device?').join(' ');
    text = text.split('It is not a replacement for an AAC device, a speech-language assessment or professional advice.').join(' ');
    expect(text).not.toMatch(
      /\b(treat(s|ment)?|therap(y|ies|eutic)|rehabilitat\w*|recover\w*|restor\w* speech|clinically|evidence-based|approved|certified|medical device|replaces?|understands you|reads your mind|ALS|aphasia|autism|stroke|cerebral palsy|dementia)\b/i,
    );
  });

  it('MS-4.3 tm-lint is clean on the page files and content.md', () => {
    const files = [
      ...filesUnder(web('components/site')),
      web('app/page.tsx'),
      resolve(repoRoot, '.kiro/specs/marketing-site/content.md'),
    ].map((f) => relative(repoRoot, f));
    const r = spawnSync(process.execPath, ['scripts/tm-lint.mjs', ...files], { cwd: repoRoot, encoding: 'utf8' });
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });

  it("MS-4.3 none of tm-lint's words in the text, labels or file names; no device brand names; no drawn phone body", () => {
    const list = read(resolve(repoRoot, 'scripts/tm-lint.mjs')).match(/const BANNED = \[([^\]]*)\]/)?.[1] ?? '';
    const words = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
    expect(words.length).toBeGreaterThan(0);
    const banned = new RegExp(`\\b(${words.join('|')})\\b`, 'i');
    expect(pageText()).not.toMatch(banned);
    for (const el of $$('[alt], [aria-label], [title]')) {
      for (const attr of ['alt', 'aria-label', 'title']) expect(el.getAttribute(attr) ?? '').not.toMatch(banned);
    }
    for (const f of filesUnder(web('components/site'))) expect(relative(web('components/site'), f)).not.toMatch(banned);
    expect(pageText()).not.toMatch(/\b(iPhone|iPad|Pixel|Galaxy|Samsung|Android|iOS|Huawei|Xiaomi|Motorola)\b/i);
    for (const el of $$('.site [class]')) expect(el.getAttribute('class')).not.toMatch(/phone|handset|device/i);
  });

  it('MS-4.4 the footer shows the intended-purpose sentence in caption, and the FAQ answer is "No. " + it', () => {
    const statement = $('.site-footer__statement')!;
    expect(statement.textContent).toBe(NOT_A_MEDICAL_DEVICE);
    expect(statement.classList.contains('site-footer__caption')).toBe(true);
    const item = $$('#faq details').find((d) => d.querySelector('summary')!.textContent === 'Is it a medical device?')!;
    expect(item.querySelector('p')!.textContent).toBe(`No. ${NOT_A_MEDICAL_DEVICE}`);
  });

  it('MS-4.5 Good to know lists every limit of content.md §8 and comes before the questions and the close', () => {
    const limits = $('#limits')!;
    expect(follows(limits, $('#faq')!)).toBe(true);
    expect(follows(limits, $('#start')!)).toBe(true);
    const expected = [...contentSections().get(8)!.matchAll(/^ {2}- \*\*(.+)\*\*$/gm)].map((m) => m[1]);
    expect(expected).toHaveLength(7);
    expect($$('li', limits).map((li) => li.textContent)).toEqual(expected);
  });

  it('MS-4.6 provider names, region and retention come from providerCopy()', () => {
    const p = providerCopy();
    const privacy = textOf($('#privacy')!);
    expect(privacy).toContain(p.service);
    expect(privacy).toContain(`${p.region} ${p.retention}`);
    expect(textOf($('#faq')!)).toContain(p.service);
    expect(textOf($('#source')!)).toContain(`Model ranking: ${p.company}.`);
  });

  it('MS-4.7 the history line is there; "Built with Kiro" and "not been measured yet" are not', () => {
    const text = pageText();
    expect(text).toContain('Made for Kiroween 2026. The first version was written with Claude Code by Anthropic; the work continued in Kiro.');
    expect(text).not.toMatch(/built with kiro/i);
    expect(text).not.toMatch(/not been measured yet/i);
  });

  it('MS-4.8 Google, Apple, Chrome and Safari appear only in the Listen privacy card', () => {
    const listen = $$('#privacy h3').find((h) => h.textContent === 'Listen')!.closest('.site-card')!;
    expect(textOf(listen)).toMatch(/Google in Chrome, Apple in Safari/);
    const clone = document.body.cloneNode(true) as HTMLElement;
    const cards = [...clone.querySelectorAll('#privacy .site-card')];
    cards.find((c) => c.querySelector('h3')?.textContent === 'Listen')!.remove();
    expect(textOf(clone)).not.toMatch(/\b(Google|Apple|Chrome|Safari)\b/);
  });

  it('MS-5.1 every percentage on the page comes from getResults(), with both links in #results', () => {
    const r = getResults()!;
    const allowed = new Set([r.ghost.top1, r.ghost.top5, r.ghost.wordAcc, r.ghost.ksr, r.dict.top1, r.dict.top5]);
    // Per text node, so a heading ending in a digit ("top 5") never runs into the value after it.
    const found: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) found.push(...(n.textContent ?? '').match(/-?\d+(\.\d+)?%/g) ?? []);
    expect(found.length).toBeGreaterThanOrEqual(6);
    for (const p of found) expect(allowed.has(p)).toBe(true);
    const links = $$('#results a').map((a) => a.getAttribute('href'));
    expect(links).toContain(RESULTS_URL);
    expect(links).toContain(METHOD_URL);
  });

  it('MS-5.4 the simulated-typist sentence sits with the numbers', () => {
    expect(textOf($('#results')!)).toContain('These figures come from a simulated typist, not from studies with people.');
  });
});

describe('hero and demo (MS-6)', () => {
  it('MS-6.1 the banner is Night, with the icon, the display-xl name and the hero buttons', () => {
    const top = $('header#top')!;
    expect(top.getAttribute('data-theme')).toBe('night');
    const icon = top.querySelector('.site-hero img')!;
    expect(icon.getAttribute('src')).toBe('/icons/icon.svg');
    expect(Number(icon.getAttribute('width'))).toBeGreaterThanOrEqual(48);
    expect(top.querySelector('h1')!.classList.contains('site-hero__name')).toBe(true);
    const actions = $$('.site-hero .site-actions a');
    expect(actions.map((a) => [a.textContent, a.getAttribute('href'), a.classList.contains('nl-btn--primary')])).toEqual([
      ['Open the app', '/app', true],
      ['See how it works', '#how', false],
    ]);
  });

  it('MS-6.2 the demo shows the finished frame first: "I need water" and a match chip per word', () => {
    expect($('.site-demo__text')!.textContent).toBe('I need water');
    expect($$('.site-demo__slot > [data-state="match"]')).toHaveLength(3);
    expect($('.site-demo .site-pad')!.getAttribute('aria-hidden')).toBe('true');
    const caption = $$('.site-demo p.nl-sr-only').map((p) => p.textContent);
    expect(caption).toContain('Example: the keys 4, 0, 6 3 3 3, 0, 9 2 8 3 7 type "i need water". 0 is space.');
  });
});

describe('drawings (MS-7, MS-9.3, MS-10.5, MS-10.8)', () => {
  it('MS-7.1 the only images are the four logos; no video, picture or canvas', () => {
    expect($$('img').map((i) => i.getAttribute('src'))).toEqual(['/icons/favicon.svg', '/icons/icon.svg', '/icons/icon.svg', '/icons/favicon.svg']);
    expect($$('video, picture, canvas')).toHaveLength(0);
  });

  it('MS-13.3 logo images have alt="" beside the visible name', () => {
    for (const img of $$('img')) expect(img.getAttribute('alt')).toBe('');
    expect($('.site-brand')!.textContent).toBe('Ninth Life');
    expect($('.site-footer__brand')!.textContent).toBe('Ninth Life');
  });

  it('MS-7.4 the round-2 drawings are present', () => {
    // One drawing per box card, in card order, plus the How screen and the proof check.
    const boxes = (id: string) =>
      $$(`#${id} .site-grid > .site-card > .site-stage > [data-play]`).map((d) => [...d.classList].find((c) => c !== 'site-drawing' && !c.startsWith('site-play--')));
    expect(boxes('conversation')).toEqual(['site-theysaid', 'site-showflip', 'site-phrases', 'site-wordadd']);
    expect(boxes('access')).toEqual(['site-keylegend', 'site-touch', 'site-scan', 'site-themes', 'site-layouts']);
    expect(boxes('privacy')).toEqual(['site-boundary', 'site-ranking', 'site-voices', 'site-listen']);
    expect($$('.site-how__picture > .site-how-screen')).toHaveLength(1);
    expect($$('#how .site-how__stage > .site-how-screen[data-play]')).toHaveLength(3);
    expect($$('#proof figure.site-proof[data-play]')).toHaveLength(1);
    const kids = (el: Element) => [...el.children].map((c) => [c.textContent, c.className]);

    // Conversation.
    const demo = getDemoData();
    const sentence = finishedSentence(demo);
    expect(sentence).toBe('I need water');
    expect(finishedKeys(demo)).toBe('4 6333 92837');
    const said = $('#conversation .site-theysaid')!;
    expect(said.querySelector('.site-strip__label')!.textContent).toBe('They said');
    expect(kids(said.querySelector('.site-strip__line')!)).toEqual([
      ['Nothing yet.', 'site-strip__empty site-out site-u1'],
      ['What do you need?', 'site-in site-k1'],
    ]);
    expect(said.querySelector('.site-well')!.className).toBe('site-well site-rise site-k2');
    expect(said.querySelector('.site-well__text')!.textContent).toBe(sentence);
    expect(said.querySelector('.site-well__keys')!.textContent).toBe(finishedKeys(demo));
    const show = $('#conversation .site-showflip')!;
    const msgs = $$('.site-show__msg', show);
    expect(msgs.map((m) => m.className)).toEqual(['site-show__msg site-out site-u2', 'site-show__msg site-show__msg--flipped site-in site-k2']);
    for (const m of msgs) expect(kids(m).map(([t]) => t)).toEqual(['Show', sentence]);
    expect($$('.site-drawn-btn', show).map((b) => b.textContent)).toEqual(['Done', 'Flip']);
    expect($$('.site-press-ring', show).map((r) => r.className)).toEqual(['site-press-ring site-ring site-k1 site-u2']);
    const phrases = $('#conversation .site-phrases')!;
    expect(phrases.querySelector('.site-drawn-btn')!.textContent).toBe('Save phrase');
    expect(phrases.querySelector('.site-phrases__well')!.className).toBe('site-well site-phrases__well site-out site-u2');
    expect(phrases.querySelector('.site-phrases__list')!.className).toBe('site-phrases__list site-in site-k2');
    expect(phrases.querySelector('.site-phrases__head')!.textContent).toBe('Your phrases');
    expect(kids(phrases.querySelector('.site-phrases__rows')!)).toEqual([
      [sentence, 'site-rise site-k3'],
      ['Thank you', ''],
      ['Yes, please', ''],
    ]);
    const spell = getSpellExample();
    const words = $('#conversation .site-wordadd')!;
    expect($$('.nl-chip[data-state]', words).map((c) => [c.getAttribute('data-state'), c.querySelector('.nl-chip__word')!.textContent, c.querySelector('.nl-chip__code')!.textContent])).toEqual([
      ['new', spell.word, spell.code],
      ['match', spell.word, spell.code],
    ]);
    expect([spell.word, spell.code]).toEqual(['Mihai', '64424']);
    const steps = $$('.site-wordadd__step', words);
    expect(steps.map((s) => s.className)).toEqual(['site-wordadd__step site-out site-u2', 'site-wordadd__step site-in site-k2']);
    expect(steps.map((s) => s.querySelector('.site-wordadd__line')!.textContent)).toEqual(['Not in your words yet.', 'In my words.']);
    expect(steps[0]!.querySelector('.site-drawn-btn')!.textContent).toBe('Add to my words');

    // Works the way you type.
    const legend = $('#access .site-keylegend')!;
    expect($$(':scope > .site-kbd', legend).map((k) => [k.textContent, k.querySelector('.site-press-ring')!.className])).toEqual([
      ['4', 'site-press-ring site-ring site-k0 site-u1'],
      ['Enter', 'site-press-ring site-ring site-k1 site-u2'],
      ['Backspace', 'site-press-ring site-ring site-k2 site-u3'],
    ]);
    const pair = legend.querySelector('.site-kbd-pair')!;
    // The pair is Up then Down: the only arrow keys lib/keyboard.ts maps to picking a sentence (B1).
    expect($$(':scope > .site-kbd', pair).map((k) => k.className)).toEqual(['site-kbd site-kbd--up', 'site-kbd site-kbd--down']);
    expect([mapKey({ key: 'ArrowUp' }, 'keyboard', 'pad'), mapKey({ key: 'ArrowDown' }, 'keyboard', 'pad')]).toEqual([
      { type: 'move', delta: -1 },
      { type: 'move', delta: 1 },
    ]);
    expect([mapKey({ key: 'ArrowLeft' }, 'keyboard', 'pad'), mapKey({ key: 'ArrowRight' }, 'keyboard', 'pad')]).toEqual([null, null]);
    expect($$('.site-press-ring', pair).map((r) => r.className)).toEqual(['site-press-ring site-ring site-k3 site-u4']);
    expect($$('.site-keylegend__what', legend).map((e) => e.textContent)).toEqual(['types g h i', 'speaks', 'goes back', 'pick a sentence']);
    expect($$('#access .site-touch__px').map((e) => e.textContent)).toEqual(['72', '128']);
    expect($$('#access .site-touch .site-key-ring').map((r) => r.className)).toEqual([
      'site-key-ring site-ring site-k0 site-u1',
      'site-key-ring site-ring site-k1 site-u2',
    ]);
    const scan = $('#access .site-scan')!;
    expect(scan.classList.contains('site-play--quick')).toBe(true);
    expect($$('.site-scan__rings > *', scan).map((r) => r.className)).toEqual([
      'site-scan__ring site-scan__ring--row1 site-ring site-k0 site-u1',
      'site-scan__ring site-scan__ring--row2 site-ring site-k1 site-u2',
      'site-scan__ring site-scan__ring--row3 site-ring site-k2 site-u4',
      'site-scan__ring site-scan__ring--key7 site-ring site-k4 site-u5',
      'site-scan__ring site-scan__ring--key8 site-ring site-k5 site-u6',
      'site-scan__ring site-scan__ring--key9 site-mark site-k6',
    ]);
    expect($$('.site-scan__press', scan).map((r) => r.className)).toEqual(['site-scan__press site-ring site-k3 site-u4', 'site-scan__press site-ring site-k6 site-u7']);
    expect(scan.querySelector('.site-scan__label')!.textContent).toBe('Switch');
    const halves = $$('#access .site-themes__half');
    expect(halves.map((h) => [h.getAttribute('data-theme'), h.querySelector('.site-themes__label')!.textContent, h.querySelector('.site-themes__hi')!.textContent])).toEqual([
      ['night', 'Night', 'Hi'],
      ['day', 'Day', 'Hi'],
    ]);
    expect(halves.map((h) => h.className)).toEqual(['site-themes__half', 'site-themes__half site-in site-k1']);
    for (const h of halves) expect(textOf(h)).toContain('4 GHI');
    expect(kids($('#access .site-themes__size')!)).toEqual([
      ['Large', 'site-out site-u2'],
      ['Extra large', 'site-in site-k2'],
    ]);
    expect($$('#access .site-layouts__col').map((c) => [c.querySelector('.site-layouts__label')!.textContent, c.className])).toEqual([
      ['Phone', 'site-layouts__col site-rise site-k0'],
      ['Tablet', 'site-layouts__col site-rise site-k1'],
      ['Laptop', 'site-layouts__col site-rise site-k2'],
    ]);
    expect($$('#access .site-layouts__box').map((b) => b.className.split(' ')[1])).toEqual([
      'site-layouts__box--upright',
      'site-layouts__box--landscape',
      'site-layouts__box--wide',
    ]);

    // Offline unless you choose (the ranking and voice drawings: MS-7.10).
    const boundary = $('#privacy .site-boundary')!;
    expect(boundary.querySelector('.site-boundary__label')!.textContent).toBe('This device');
    expect(kids(boundary.querySelector('.site-boundary__rows')!)).toEqual([
      ['What you type', 'site-rise site-k0'],
      ['The dictionary', 'site-rise site-k1'],
      ['Saved phrases', 'site-rise site-k2'],
      ['My words', 'site-rise site-k3'],
    ]);
    const pill = boundary.querySelector('.site-boundary__pill')!;
    expect([pill.textContent, pill.className]).toEqual(['Offline. Using your dictionary.', 'site-boundary__pill site-rise site-k4']);
    const listen = $('#privacy .site-listen')!;
    expect(kids(listen.querySelector('.site-strip__line')!)).toEqual([
      ['Nothing yet.', 'site-strip__empty site-out site-u3'],
      ['What do you need?', 'site-in site-k3'],
    ]);
    expect($$('.site-listen__label', listen).map((l) => [l.textContent, l.className])).toEqual([
      ['Listen', 'site-listen__label site-out site-u2'],
      ['Stop', 'site-listen__label site-during site-k2 site-u3'],
      ['Listen', 'site-listen__label site-in site-k3'],
    ]);
    expect($$('.site-listen__label', listen).every((l) => l.parentElement!.classList.contains('site-cell'))).toBe(true);
    expect(listen.querySelector('.site-press-ring')!.className).toBe('site-press-ring site-ring site-k1 site-u2');
    const status = listen.querySelector('.site-listen__status')!;
    expect([status.textContent, status.className]).toEqual(['Listening. Ask them to speak now.', 'site-listen__status site-during site-k2 site-u3']);
  });

  it('MS-7.7 every box card starts with a stage holding one data-play drawing', () => {
    const cards = $$('#conversation .site-grid > .site-card, #access .site-grid > .site-card, #privacy .site-grid > .site-card');
    expect(cards).toHaveLength(13);
    for (const card of cards) {
      const stage = card.firstElementChild!;
      const name = card.querySelector('h3')!.textContent ?? '';
      expect(stage.classList.contains('site-stage'), name).toBe(true);
      expect(stage.getAttribute('aria-hidden'), name).toBe('true');
      expect(stage.hasAttribute('data-reveal'), name).toBe(false);
      expect(stage.nextElementSibling!.tagName, name).toBe('H3');
      const plays = $$('[data-play]', stage);
      expect(plays, name).toHaveLength(1);
      expect(stage.children, name).toHaveLength(1);
      const root = plays[0]!;
      expect(stage.firstElementChild).toBe(root);
      expect(root.classList.contains('site-drawing'), name).toBe(true);
      expect(root.getAttribute('aria-hidden'), name).toBe('true');
      expect([...root.classList].filter((c) => c.startsWith('site-play--')), name).toHaveLength(1);
    }
    // The accessibility note is not a box card and has no stage.
    expect($('#access .site-note .site-stage')).toBeNull();
  });

  it("MS-8.11 every drawing's last change is at most 4000 ms", () => {
    // The step lengths of the motion tokens (tokens.test checks the values): frame, quick, sweep, type.
    const STEP_MS: Record<string, number> = { frame: 600, quick: 400, sweep: 240, type: 520 };
    const HOW_STEP_MS: Record<string, number> = { '1': 520, '2': 240, '3': 600 };
    const LEAD = 300; // motion-play-lead, column 0 (the How picture, the How stages, the proof figure)
    const parts = (root: ParentNode) => $$(['in', 'rise', 'out', 'during', 'ring', 'mark'].map((r) => `.site-${r}`).join(', '), root);
    const stepOf = (root: Element) => {
      const cls = [...root.classList].filter((c) => c.startsWith('site-play--'));
      expect(cls, root.className).toHaveLength(1);
      return STEP_MS[cls[0]!.slice('site-play--'.length)]!;
    };
    /** The lead from 648px, the largest (site.css V28, N7): + motion-frame for column 1, + 4 quick steps for Touch. */
    const leadOf = (root: Element) => {
      const card = root.closest('.site-grid > .site-card');
      if (!card) return LEAD;
      const i = [...card.parentElement!.children].indexOf(card);
      const access = card.parentElement!.classList.contains('site-grid--access');
      const col = access ? (i === 3 ? 1 : 0) : i % 2;
      return LEAD + col * STEP_MS.frame! + (access && i === 1 ? 4 * STEP_MS.quick! : 0);
    };
    const roots = $$('[data-play]');
    expect(roots).toHaveLength(13 + 3 + 1);
    for (const root of roots) {
      const step = stepOf(root);
      expect(step, root.className).toBeGreaterThan(0);
      const animated = parts(root);
      expect(animated.length, root.className).toBeGreaterThan(0);
      for (const p of animated) expect(lastChangeMs(p.className, step, leadOf(root)), `${root.className}: ${p.className}`).toBeLessThanOrEqual(4000);
    }
    // MS-7.3, review N7: in a row of two cards the ember rings never show together (a handover at the same
    // moment counts as one ring, V29). Rings are [lead + k x step, lead + u x step); the outlines are not ember.
    const rings = (card: Element) => {
      const root = card.querySelector('[data-play]')!;
      const step = stepOf(root);
      return $$('.site-ring:not(.site-outline):not(.site-scan__press):not(.site-proof__box)', root).map((r) => {
        const n = (p: string) => Number([...r.classList].find((c) => new RegExp(`^site-${p}\\d+$`).test(c))!.slice(6));
        return [leadOf(root) + n('k') * step, leadOf(root) + n('u') * step] as const;
      });
    };
    for (const sel of ['#conversation .site-grid', '#privacy .site-grid', '#access .site-grid--access']) {
      const cards = [...$(sel)!.children];
      for (const [a, b] of [[0, 1], [2, 3]] as const) {
        for (const [s1, e1] of rings(cards[a]!)) for (const [s2, e2] of rings(cards[b]!)) {
          expect(s1 < e2 && s2 < e1, `${sel} cards ${a} and ${b}: rings ${s1}-${e1} and ${s2}-${e2}`).toBe(false);
        }
      }
    }
    const how = parts($('.site-how__picture')!);
    expect(how.length).toBeGreaterThan(15);
    for (const p of how) {
      const step = HOW_STEP_MS[p.getAttribute('data-s') ?? '']!;
      expect(step, p.className).toBeGreaterThan(0);
      expect(lastChangeMs(p.className, step, LEAD), p.className).toBeLessThanOrEqual(4000);
    }
  });

  it('MS-8.11 every step class used on the page has a CSS rule', () => {
    const css = read(web('components/site/site.css'));
    const used = new Set($$('[class]').flatMap((e) => [...e.classList]).filter((c) => /^site-[ku]\d+$/.test(c)));
    expect(used.size).toBeGreaterThan(15);
    for (const c of used) expect(css, c).toContain(`[data-site-motion="on"] .${c} { --${c[5]}: ${c.slice(6)}; }`);
  });

  it('MS-7.3 no ember fill and at most one ember ring per step', () => {
    const picture = $('.site-how__picture')!;
    const scopes = [...$$('[data-play]'), picture];
    for (const scope of scopes) expect($$('.is-lit, .is-pressed, .site-key--ninth, .nl-btn--primary', scope), scope.className).toHaveLength(0);
    // The ember rings: pressed rings on drawn keys and buttons, and the scan ring.
    const EMBER = '.site-key-ring, .site-press-ring, .site-scan__ring';
    const step = (el: Element, p: 'k' | 'u') => {
      const hit = [...el.classList].find((c) => new RegExp(`^site-${p}\\d+$`).test(c));
      return hit === undefined ? null : Number(hit.slice(6));
    };
    // A ring shows over [k, u); a mark from k on. A handover at step n (one goes, the next comes) counts as one.
    const shown = (el: Element, n: number) => {
      const k = step(el, 'k');
      const u = step(el, 'u');
      if (k === null) return false;
      if (el.classList.contains('site-mark')) return k <= n;
      return el.classList.contains('site-ring') && u !== null && k <= n && n < u;
    };
    const check = (rings: Element[], label: string) => {
      for (const r of rings) expect(r.className, label).toMatch(/\bsite-(ring|mark)\b/);
      for (let n = 0; n <= 13; n += 1) expect(rings.filter((r) => shown(r, n)).length, `${label}, step ${n}`).toBeLessThanOrEqual(1);
    };
    for (const root of $$('[data-play]')) check($$(EMBER, root), root.className);
    for (const s of ['1', '2', '3']) check($$(EMBER, picture).filter((r) => r.getAttribute('data-s') === s), `How step ${s}`);
    expect($$(EMBER, $('#access')!).length).toBeGreaterThanOrEqual(12);
  });

  it('MS-7.10 the ranking drawing lists RANKING_SENT with no count and the voice lines match the Voices card', () => {
    const ranking = $('#privacy .site-ranking')!;
    expect(ranking.classList.contains('site-play--quick')).toBe(true);
    const items = $$('.site-ranking__sent li', ranking);
    expect(items.map((li) => li.textContent)).toEqual([...RANKING_SENT]);
    expect(items.map((li) => li.className)).toEqual(['site-rise site-k2', 'site-rise site-k3', 'site-rise site-k4', 'site-rise site-k5']);
    expect($$('.site-ranking__row', ranking).map((r) => r.textContent)).toEqual(['Off, the default', 'On. Sent to rank:']);
    expect(ranking.querySelector('.site-ranking__note')!.textContent).toBe('Ranked on this device');
    expect($$('.site-outline', ranking).map((o) => o.className)).toEqual(['site-outline site-ring site-k0 site-u1', 'site-outline site-ring site-k1 site-u6']);
    const text = textOf(ranking);
    expect(text).not.toMatch(/\d/);
    const p = providerCopy();
    expect(text).not.toContain(p.service);
    expect(text).not.toContain(p.company);
    const voices = $('#privacy .site-voices')!;
    expect($$('.site-voices__name', voices).map((n) => n.textContent)).toEqual(['Voice (en, on this device)', 'Voice (en, online)']);
    expect($$('.site-voices__name .site-voices__check', voices).map((c) => c.className)).toEqual(['site-voices__check site-mark site-k1']);
    expect($$('.site-voices__line', voices).map((l) => [l.textContent, l.className])).toEqual([
      ['Keeps your words on the device', 'site-voices__line site-in site-k1'],
      ['Sends the text to the browser maker', 'site-voices__line site-in site-k2'],
    ]);
    const card = $$('#privacy h3').find((h) => h.textContent === 'Voices')!.closest('.site-card')!;
    const said = card.querySelector(':scope > p')!.textContent!;
    expect(said).toContain('keep your words on the device');
    expect(said).toContain('send the text to the browser maker');
    expect(textOf(voices)).not.toMatch(/\b(Google|Apple|Chrome|Safari)\b/);
  });

  it('MS-10.9 Conversation and Privacy use site-grid--boxes and the switch card is a normal card', () => {
    // Privacy's cards keep their own height (align-items: start, review N6).
    for (const [id, cls] of [
      ['conversation', 'site-grid site-grid--boxes'],
      ['privacy', 'site-grid site-grid--boxes site-grid--start'],
    ] as const) {
      const grid = $(`#${id} .site-grid`)!;
      expect(grid.className).toBe(cls);
      expect(grid.children).toHaveLength(4);
    }
    expect($$('.site-grid--2')).toHaveLength(0);
    expect(read(web('components/site/site.css'))).not.toContain('.site-grid--2');
    // The switch card is a normal card at every width (review P2): no tall tile.
    const grid = $('#access .site-grid--access')!;
    expect($$('.site-card--tall')).toHaveLength(0);
    const cards = [...grid.children];
    expect(cards.map((c) => c.className)).toEqual(Array(5).fill('site-card'));
    expect(cards[2]!.querySelector('h3')!.textContent).toBe('One or two switches');
    expect(cards[2]!.firstElementChild!.className).toBe('site-stage site-stage--switch');
    for (const stage of $$('#privacy .site-stage')) expect(stage.className).toBe('site-stage site-stage--privacy');
    for (const stage of $$('#conversation .site-stage')) expect(stage.className).toBe('site-stage');
    for (const card of cards.filter((_, i) => i !== 2)) expect(card.firstElementChild!.className).toBe('site-stage');
  });

  it('MS-7.2 drawings, stages and the How picture are aria-hidden; the proof figure exposes only its caption, chips and closing lines; nothing focusable', () => {
    for (const el of $$('.site-drawing, .site-pad, .site-stage, .site-how__picture > *')) {
      expect(el.closest('[aria-hidden="true"]'), el.className).not.toBeNull();
    }
    const figure = $('figure.site-proof')!;
    const exposed = $$('*', figure).filter((el) => !el.closest('[aria-hidden="true"]'));
    const allowed = (el: Element) =>
      el.matches('figcaption, figcaption > .nl-sr-only, ul.site-proof__rows, li.site-proof__row, .site-proof__chip, p.site-proof__said, p.site-proof__example') ||
      el.closest('.nl-chip[data-state]') !== null ||
      el.querySelector(':scope > .nl-chip[data-state]') !== null;
    for (const el of exposed) expect(allowed(el), el.outerHTML.slice(0, 120)).toBe(true);
    expect($$('.nl-chip[data-state]', figure).filter((c) => !c.closest('[aria-hidden="true"]'))).toHaveLength(3);
    for (const el of $$('.site-drawing, .site-pad, .site-stage, .site-how__picture, figure.site-proof')) expect($$(FOCUSABLE, el)).toHaveLength(0);
    for (const btn of $$('.site-drawn-btn')) expect(btn.tagName).toBe('DIV');
  });

  it('MS-9.3 the legend leads with the check, plus and x icons; wafer is a struck-through reject chip; the differing digit is boxed with an x', () => {
    const items = $$('.site-proof__more .site-legend li');
    expect(items).toHaveLength(3);
    (['check', 'plus', 'x'] as const).forEach((name, i) => {
      expect(items[i]!.firstElementChild!.isEqualNode(iconNode(name))).toBe(true);
    });
    const proof = getProofExample();
    const chip = $('figure.site-proof [data-state="reject"]')!;
    expect(chip.classList.contains('nl-chip--reject')).toBe(true);
    expect(chip.querySelector('.nl-chip__word')!.textContent).toBe(proof.reject.word);
    expect(read(web('styles/components.css'))).toMatch(/\.nl-chip--reject \.nl-chip__word \{ text-decoration: line-through/);
    const diff = $$('figure.site-proof .site-digit--diff');
    expect(diff).toHaveLength(1);
    const line = diff[0]!.parentElement!;
    expect($$('.site-digit', line).indexOf(diff[0]!)).toBe(proof.reject.diffAt);
    expect(diff[0]!.querySelector('.site-digit__box')).not.toBeNull();
    expect(line.querySelector('.site-digit__x')!.firstElementChild!.isEqualNode(iconNode('x'))).toBe(true);
    expect(diff[0]!.closest('li')!.querySelector('.site-proof__letters')!.textContent).toBe(proof.reject.word);
  });

  it('MS-7.9 the proof figure keeps its accessible text, adds the closing line and has no frame labels', () => {
    const proof = getProofExample();
    const figure = $('figure.site-proof')!;
    expect(figure.hasAttribute('data-play')).toBe(true);
    expect(figure.classList.contains('site-play--sweep')).toBe(true);
    const caption = figure.querySelector('figcaption')!;
    expect(caption.querySelector(':scope > .nl-sr-only')!.textContent).toBe('Your keys: 92837');
    expect(proof.keys).toBe('92837');
    const visible = caption.querySelector(':scope > [aria-hidden="true"]')!;
    expect(visible.querySelector('.site-proof__label')!.textContent).toBe('Your keys:');
    expect(visible.querySelector('.site-proof__digits')).not.toBeNull();
    const said = figure.querySelector('p.site-proof__said')!;
    expect(said.textContent).toBe(proofSaidLine(proof));
    expect(proofSaidLine(proof)).toBe('Can be spoken: water, waves. Never spoken: wafer.');
    const example = figure.querySelector('p.site-proof__example')!;
    expect(collapse(example.textContent ?? '')).toBe(
      `For example, if a model suggested "${proof.reject.word}", the check would drop it: ${proof.reject.word} is ${proof.reject.code}, and your keys are ${proof.keys}.`,
    );
    for (const p of [said, example]) {
      expect(p.closest('[aria-hidden="true"]')).toBeNull();
      expect([...p.classList]).toEqual(expect.arrayContaining(['site-in', 'site-k12']));
    }
    const chips = $$('.nl-chip[data-state]', figure).filter((c) => !c.closest('[aria-hidden="true"]'));
    expect(chips.map((c) => [c.querySelector('.nl-chip__word')!.textContent, c.getAttribute('data-state')])).toEqual([
      ['water', 'match'],
      ['waves', 'match'],
      ['wafer', 'reject'],
    ]);
    expect(chips.map((c) => c.parentElement!.className)).toEqual(['site-in site-k9', 'site-in site-k10', 'site-in site-k11']);
    expect($$('.site-frame__label, .site-frames, .site-frame', figure)).toHaveLength(0);
    for (const label of ['Suggested', 'Checked', 'Dropped']) expect(textOf(figure)).not.toContain(label);
  });

  it('MS-7.9 every digit line holds 5 sweep boxes and no box sits outside a digit line', () => {
    const figure = $('figure.site-proof')!;
    const lines = $$('.site-proof__digits', figure);
    expect(lines).toHaveLength(4);
    const sweep = [4, 5, 6, 7, 8].map((k) => `site-proof__box site-ring site-k${k} site-u${k + 1}`);
    for (const line of lines) {
      expect(line.closest('[aria-hidden="true"]')).not.toBeNull();
      expect($$('.site-digit', line)).toHaveLength(5);
      expect([...line.children].filter((c) => c.classList.contains('site-proof__box')).map((b) => b.className)).toEqual(sweep);
    }
    // The word rows' digit lines rise one step apart; the caption's line is there from the start.
    expect(lines.map((l) => l.className)).toEqual([
      'site-proof__digits',
      'site-proof__digits site-rise site-k1',
      'site-proof__digits site-rise site-k2',
      'site-proof__digits site-rise site-k3',
    ]);
    const boxes = $$('.site-proof__box');
    expect(boxes).toHaveLength(20);
    for (const box of boxes) {
      expect(box.parentElement!.classList.contains('site-proof__digits')).toBe(true);
      expect(box.closest('.site-proof__chip')).toBeNull();
    }
  });

  it('MS-8.12 the desktop How picture has no data-play and the per-step stages each have one', () => {
    const picture = $('.site-how__picture')!;
    expect(picture.hasAttribute('data-play')).toBe(false);
    expect(picture.querySelector('[data-play]')).toBeNull();
    expect(picture.hasAttribute('data-reveal')).toBe(true);
    const stages = $$('#how .site-how__step > .site-stage.site-how__stage');
    expect(stages).toHaveLength(3);
    for (const stage of stages) {
      expect(stage.getAttribute('aria-hidden')).toBe('true');
      expect(stage.hasAttribute('data-reveal')).toBe(false);
      expect($$('[data-play]', stage)).toHaveLength(1);
    }
    expect(stages.map((s) => [...s.querySelector('[data-play]')!.classList].filter((c) => c.startsWith('site-play--')))).toEqual([
      ['site-play--type'],
      ['site-play--sweep'],
      ['site-play--frame'],
    ]);
    // Every animated part of the picture names its step.
    const parts = $$(['in', 'rise', 'out', 'during', 'ring', 'mark'].map((r) => `.site-how__picture .site-${r}`).join(', '));
    expect(parts.length).toBeGreaterThan(15);
    for (const part of parts) expect(['1', '2', '3'], part.className).toContain(part.getAttribute('data-s'));
    // The well's hint, the drawn Speak (secondary, never primary) and the step label's two layers.
    expect(picture.querySelector('.site-well__hint')!.textContent).toBe('Press a key to start');
    for (const btn of $$('#how .site-drawn-btn')) {
      expect(btn.classList.contains('nl-btn--secondary')).toBe(true);
      expect(btn.classList.contains('nl-btn--primary')).toBe(false);
    }
    for (const label of $$('#how .site-step')) {
      expect(label.classList.contains('site-cell')).toBe(true);
      expect([...label.children].map((c) => c.className)).toEqual(['', 'site-step__key']);
    }
  });

  it('MS-7.3 a repeated key press is two rings, the second late', () => {
    const ringsOn = (root: Element, digit: string) => {
      const key = $$('.nl-key', root).find((k) => k.querySelector('.nl-key__digit')!.textContent === digit)!;
      return $$('.site-key-ring', key).map((r) => r.className);
    };
    const pads = [$('.site-how__picture .nl-keypad')!, $('#how .site-how__step:nth-child(1) .nl-keypad')!];
    for (const pad of pads) {
      expect(ringsOn(pad, '4')).toEqual(['site-key-ring site-ring site-k0 site-u1']);
      expect(ringsOn(pad, '6')).toEqual(['site-key-ring site-ring site-k1 site-u2', 'site-key-ring site-ring site-k2 site-u3 site-late']);
      expect(ringsOn(pad, '3')).toEqual(['site-key-ring site-ring site-k3 site-u4']);
      expect($$('.site-key-ring', pad)).toHaveLength(4);
    }
    // Ember appears only as these rings: no resting pressed key and no ninth-key ring in How.
    expect($$('#how .is-pressed, #how .site-key--ninth')).toHaveLength(0);
  });

  it('MS-10.8 MS-10.5 every key drawing sets its size inline from the KeypadPicture constants', () => {
    expect(KEY_DRAWING_SIZE).toBe('64px');
    expect(HERO_KEY_SIZE).toMatch(/^clamp\(64px, .+, 84px\)$/);
    const pads = $$('.nl-keypad.site-pad') as HTMLElement[];
    // The hero, the How picture, the How step 1 stage and the scan drawing.
    expect(pads).toHaveLength(4);
    for (const pad of pads) expect([KEY_DRAWING_SIZE, HERO_KEY_SIZE]).toContain(pad.style.getPropertyValue('--nl-key').trim());
  });

  it('MS-10.8 the Touch keys use TOUCH_MIN_SIZE and TOUCH_XL_SIZE', () => {
    expect(TOUCH_MIN_SIZE).toBe('var(--key-min)');
    expect(TOUCH_XL_SIZE).toBe('var(--key-xl)');
    expect(KEY_DRAWING_XL_SIZE).toBe('84px');
    const size = (w: HTMLElement) => w.style.getPropertyValue('--nl-key').trim();
    // Single keys sit on their own wrapper, outside .nl-keypad, so the app's key-size setting cannot reach them.
    const wrappers = $$('.site-key-picture') as HTMLElement[];
    for (const w of wrappers) expect(w.closest('.nl-keypad')).toBeNull();
    const touch = wrappers.filter((w) => w.querySelector(':scope > .site-key--touch') !== null);
    expect(touch.map(size)).toEqual([TOUCH_MIN_SIZE, TOUCH_XL_SIZE]);
    for (const w of touch) expect(w.closest('#access .site-touch')).not.toBeNull();
    // Every other single key is a 64 or 84px drawing: the Your view keys, large then extra large in each half.
    const others = wrappers.filter((w) => !touch.includes(w));
    expect(others.map(size)).toEqual([KEY_DRAWING_SIZE, KEY_DRAWING_XL_SIZE, KEY_DRAWING_SIZE, KEY_DRAWING_XL_SIZE]);
    for (const w of others) expect(w.closest('#access .site-themes')).not.toBeNull();
  });
});

describe('reveal marks (MS-8.4)', () => {
  const marked = (sel: string) => $$(`${sel} [data-reveal]`).length;

  it('MS-8.4 exactly the blocks of design A4 carry data-reveal', () => {
    expect(marked('#how')).toBe(5);
    expect(marked('#proof')).toBe(3);
    expect(marked('#conversation')).toBe(5);
    expect(marked('#access')).toBe(7);
    expect(marked('#privacy')).toBe(5);
    expect(marked('#results')).toBe(4);
    expect(marked('#limits')).toBe(2);
    expect(marked('#faq')).toBe(2);
    expect(marked('#source')).toBe(3);
    for (const id of SECTION_IDS.slice(0, -1)) expect($(`#${id} .site-head`)!.hasAttribute('data-reveal')).toBe(true);
    for (const sel of ['.site-how__picture', '.site-proof__more', 'figure.site-proof', '.site-note', '.site-limits', '.site-faq-list', '.site-source__more', '.site-credits']) {
      expect($(sel)!.hasAttribute('data-reveal'), sel).toBe(true);
    }
    for (const sel of ['.site-proof__copy', '.site-source__copy', '.site-how__steps', '.site-stats', '#faq details']) {
      expect($(sel)!.hasAttribute('data-reveal'), sel).toBe(false);
    }
    for (const dd of $$('.site-stats dd')) expect(dd.hasAttribute('data-reveal')).toBe(false);
  });

  it('MS-8.4 no marked block sits inside another', () => {
    expect(document.querySelectorAll('[data-reveal] [data-reveal]')).toHaveLength(0);
  });

  it('MS-8.4 sibling cards carry --reveal-i 0, 1, 2, then 2; heading groups carry none', () => {
    const steps = (sel: string) => ($$(`${sel} > [data-reveal]`) as HTMLElement[]).map((e) => e.style.getPropertyValue('--reveal-i'));
    expect(steps('.site-how__steps')).toEqual(['0', '1', '2']);
    expect(steps('#conversation .site-grid')).toEqual(['0', '1', '2', '2']);
    expect(steps('#access .site-grid')).toEqual(['0', '1', '2', '2', '2']);
    expect(steps('#privacy .site-grid')).toEqual(['0', '1', '2', '2']);
    expect(steps('.site-stats')).toEqual(['0', '1', '2']);
    for (const head of $$('.site-head')) expect(head.hasAttribute('style')).toBe(false);
  });

  it('MS-8.4 the hero, the closing section, the footer and logo ancestors are never marked', () => {
    expect($$('header#top [data-reveal], header#top[data-reveal]')).toHaveLength(0);
    expect($$('#start [data-reveal], #start[data-reveal]')).toHaveLength(0);
    expect($$('footer [data-reveal], footer[data-reveal]')).toHaveLength(0);
    for (const img of $$('img')) expect(img.closest('[data-reveal]')).toBeNull();
    expect($('h1')!.closest('[data-reveal]')).toBeNull();
  });
});

describe('motion gate (MS-8.1)', () => {
  it('MS-8.1 the server HTML holds the raw motion boot script as the first child of .site, and SiteMotion is rendered', () => {
    const markup = renderToStaticMarkup(<HomePage />);
    expect(markup).toContain(`<div class="site"><script>${SITE_MOTION_BOOT}</script>`);
    expect(read(web('app/page.tsx'))).toMatch(/<SiteMotion \/>\s*<\/div>/);
  });
});

describe('client islands and imports (MS-11.3)', () => {
  it('MS-11.3 only KeypadDemo and SiteMotion are client components; app/page.tsx imports only the site files', () => {
    const client = filesUnder(web('components/site'))
      .filter((f) => /^\s*['"]use client['"]/.test(read(f)))
      .map((f) => relative(web('components/site'), f))
      .sort();
    expect(client).toEqual(['KeypadDemo.tsx', 'SiteMotion.tsx']);
    const page = read(web('app/page.tsx'));
    const imports = [...page.matchAll(/^import\s+(type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm)];
    expect(imports.length).toBeGreaterThan(0);
    const allowed = ['@/components/Footer', '@/components/Icon', '@/components/ProofChip', '@/lib/rankingProvider'];
    for (const m of imports) {
      const [, typeOnly, spec] = m;
      if (typeOnly && spec === 'next') continue;
      expect(spec!.startsWith('@/components/site/') || allowed.includes(spec!), spec).toBe(true);
    }
    expect(page).not.toMatch(/styles\/app\.css/);
  });

  // Measured 2026-11-11 before any round-2 drawing landed (V24): 7,149 bytes gzip (the round-1 page).
  // With the How screen and the proof check (tasks 35-36): 7,705 bytes gzip.
  // With all 13 box drawings (tasks 37-39): 9,165 bytes gzip.
  it('MS-11.6 the page markup is at most 15 KB gzip', () => {
    const bytes = gzipSync(renderToStaticMarkup(<HomePage />)).length;
    expect(bytes).toBeLessThanOrEqual(15 * 1024);
  });
});
