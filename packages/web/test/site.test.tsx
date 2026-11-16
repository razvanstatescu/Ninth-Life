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
import { KEY_DRAWING_SIZE, KEY_DRAWING_XL_SIZE, TOUCH_MIN_SIZE, TOUCH_XL_SIZE } from '@/components/site/KeypadPicture';
import { SITE_MOTION_BOOT } from '@/components/site/motion';
import { lastChangeMs } from '@/components/site/pictures/roles';
import { faqItems } from '@/components/site/sections/Faq';
import { LIMITS_LEAD, LIMIT_ROWS, TESTING } from '@/components/site/sections/Limits';
import { START_FACTS } from '@/components/site/sections/Start';
import { footerGroups } from '@/components/site/SiteFooter';
import {
  HISTORY_LINE,
  ISSUES_URL,
  METHOD_URL,
  NOTICE_URL,
  REPO_URL,
  PRIVACY_RULES_URL,
  RANKING_REQUEST_URL,
  RESULTS_URL,
  barShare,
  finishedKeys,
  finishedSentence,
  getDemoData,
  getProofExample,
  getResults,
  getSpellExample,
  proofCanLine,
  proofNeverLine,
} from '@/components/site/site-data';
import { mapKey } from '@/lib/keyboard';
import { RANKING_SENT, RANKING_SENT_ALSO, providerCopy, rankingSentText } from '@/lib/rankingProvider';

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

// Round 3 (2026-11-12): Results follows Proof (MS-3.1). Round 4 (2026-11-13): Free and open source
// (source) dissolved into the close, the footer and /about.
const SECTION_IDS = ['how', 'proof', 'results', 'conversation', 'access', 'privacy', 'limits', 'faq', 'start'];

beforeEach(() => {
  render(<HomePage />);
});
afterEach(cleanup);

describe('structure and landmarks (MS-3, MS-1.6)', () => {
  it('MS-3.1 one h1, the promise (round 3), and the nine sections in order (round 4), each labelled by its h2', () => {
    const h1s = $$('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0]!.textContent).toBe('Type on 9 keys. Hear your sentence.');
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
    expect(items).toHaveLength(faqItems().length);
    expect(items).toHaveLength(11);
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
    expect(og).toMatchObject({ type: 'website', siteName: 'Ninth Life', locale: 'en_US' });
    const tw = metadata.twitter as Record<string, unknown>;
    // Tests run with no SITE_URL, so no social card and a summary card (seo.test.tsx covers the origin case).
    expect(tw).toMatchObject({ card: 'summary', title: cell('og:title'), description: cell('og:description') });
    expect('keywords' in metadata).toBe(false);
    expect('robots' in metadata).toBe(false);
  });

  it('MS-1.6 every "Open the app" is a plain link to /app, and exactly two are primary', () => {
    const open = $$('a').filter((a) => collapse(a.textContent ?? '') === 'Open the app');
    // Bar, hero, proof, the mid-page rows after Results, Access (R3-P10) and Privacy (round 3), the close and the footer.
    expect(open.length).toBe(8);
    for (const a of open) {
      expect(a.tagName).toBe('A');
      expect(a.getAttribute('href')).toBe('/app');
    }
    expect(open.filter((a) => a.classList.contains('nl-btn--primary'))).toHaveLength(2);
    expect($$('.nl-btn--primary')).toHaveLength(2);
    expect($('header#top .site-bar .nl-btn')!.classList.contains('nl-btn--secondary')).toBe(true);
    expect($('#proof a.nl-btn')!.classList.contains('nl-btn--secondary')).toBe(true);
    // Round 3: the Results section ends on a secondary xl "Open the app" in a .site-cta row (review P1-3).
    // Privacy ends the same way (verifier, 2026-11-13: on a 390px phone the Results row and the close were ~14
    // screens apart).
    // R3-P10 (2026-11-13): Access too (Results to Privacy was still 9.4 screens at 390 and 13.7 at 320).
    for (const id of ['results', 'access', 'privacy']) {
      const mid = $$(`#${id} a.nl-btn`);
      expect(mid, id).toHaveLength(1);
      expect(mid[0]!.className).toBe('nl-btn nl-btn--secondary nl-btn--xl');
      expect(mid[0]!.parentElement!.className).toBe('site-cta');
      expect(mid[0]!.parentElement!.nextElementSibling, id).toBeNull();
      expect(mid[0]!.parentElement!.parentElement!.className).toBe('site-wrap site-stack');
    }
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
      'Stop',
      'Hear it',
      // Round 4 (2026-11-13): the hero's status line, shown once the keys work, and its try-it states.
      'Press the keys to try it.',
      'Next: {readings}',
      'No sentence matches yet.',
      'The dictionary did not load.',
      'The eval results are not available in this build.',
      'Typed {codes}. Ninth Life shows: {sentence}.',
      // Try it (W4): only after the visitor's first key press.
      'Keys {codes} match: {sentences}.',
      'Press a key to start.',
      'Loading the offline dictionary.',
      'No sentence matches these keys yet. Keep typing, or press Back.',
      'The dictionary did not load, so only the keys show. The app has the whole keypad.',
      // R3-P8: after a 1, 0 or # before any letter.
      'Key 1 adds punctuation at the end of the sentence. Now type a word with keys 2 to 9.',
      'Keys 2 to 9 type the letters. Start with those.',
    ]);
    const text = pageText();
    let checked = 0;
    for (const raw of strings) {
      const s = collapse(raw);
      if (notInFirstRender.has(s)) continue;
      // Round 4: the model-ranking status rows replace the model line on the page; they show only with model runs.
      if (/^(Measured with|Not measured yet:)/.test(s) && !results?.modelRuns) continue;
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

  it('MS-4.4 the footer shows the intended-purpose sentence in body type (round 3, R3-P8), and the FAQ answer is "No. " + it', () => {
    const statement = $('.site-footer__statement')!;
    expect(statement.textContent).toBe(NOT_A_MEDICAL_DEVICE);
    expect(statement.classList.contains('site-footer__caption')).toBe(false);
    expect(read(web('components/site/site.css'))).toMatch(/\.site-footer__statement \{[^}]*font-size: var\(--type-body-size\)/);
    const item = $$('#faq details').find((d) => d.querySelector('summary')!.textContent === 'Is it a medical device?')!;
    expect(item.querySelector('p')!.textContent).toBe(`No. ${NOT_A_MEDICAL_DEVICE}`);
  });

  it('MS-4.5 Good to know lists every limit of content.md §8 and comes before the questions and the close', () => {
    const limits = $('#limits')!;
    expect(follows(limits, $('#faq')!)).toBe(true);
    expect(follows(limits, $('#start')!)).toBe(true);
    // Round 4 (2026-11-13): the not-a-replacement limit is the lead; then two cards. "Before you start":
    // a key and the approved sentence per row; "Testing so far": each check and its state in words. content.md §8
    // lists both as "  - **key**: **value**" lines, in page order.
    const section8 = contentSections().get(8)!;
    expect($('#limits .site-lead')!.textContent).toBe(LIMITS_LEAD);
    expect(section8).toContain(`**${LIMITS_LEAD}**`);
    const expected = [...section8.matchAll(/^ {2}- \*\*(.+?)\*\*: \*\*(.+)\*\*$/gm)].map((m) => [m[1], m[2]]);
    expect(expected).toHaveLength(7);
    const rows = $$('.site-limits__rows > li', limits).map((li) => [li.querySelector('.site-limits__key')!.textContent, li.querySelector('.site-limits__text')!.textContent]);
    const checks = $$('.site-limits__status > li', limits).map((li) => [li.querySelector('.site-limits__check')!.textContent, li.querySelector('.site-limits__state')!.textContent]);
    expect([...rows, ...checks]).toEqual(expected);
    expect(rows).toEqual(LIMIT_ROWS.map((r) => [r.key, r.text]));
    expect(checks).toEqual(TESTING.map((t) => [t.check, t.done ? 'Done' : 'Not yet']));
    expect($$('.site-limits__card > h3', limits).map((h) => h.textContent)).toEqual(['Before you start', 'Testing so far']);
    // The ranking row is rankingSentText() (MS-4.6).
    expect(textOf(limits)).toContain(`With model ranking on, ${rankingSentText()} leave your device`);
    // Never colour alone: Done has a check icon and a solid edge, Not yet a dashed edge (the --not class); each state
    // follows a visually hidden colon, so a screen reader hears "Checked on real phones and tablets: Not yet".
    for (const li of $$('.site-limits__status > li', limits)) {
      const st = li.querySelector('.site-limits__state')!;
      expect(li.querySelector('.nl-sr-only')!.textContent).toBe(': ');
      expect(st.classList.contains('site-limits__state--not')).toBe(st.textContent === 'Not yet');
      expect(st.querySelector('svg.nl-icon') !== null).toBe(st.textContent === 'Done');
    }
    // Every row's icon sits in a tile and is decorative.
    for (const li of $$('.site-limits__rows > li', limits)) expect(li.querySelector('.site-tile > svg[aria-hidden="true"]')).not.toBeNull();
    const help = $$('.site-limits__help a', limits);
    expect(help.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([['Open an issue on GitHub', ISSUES_URL]]);
    expect(help[0]!.closest('.site-limits__card')!.querySelector('h3')!.textContent).toBe('Testing so far');
  });

  it('MS-4.5a each limit is also said beside the claim it qualifies, in a .site-caveat (info icon, ink)', () => {
    const caveat = (id: string) => $$(`#${id} .site-caveat`);
    for (const c of $$('.site-caveat')) expect(c.firstElementChild!.matches('svg.nl-icon[aria-hidden="true"]')).toBe(true);
    // How: under its row, the spelling and language limits (approved sentences, content.md §8).
    expect(caveat('how').map((c) => collapse(c.textContent ?? ''))).toEqual(['You need to be able to spell. Ninth Life types words, not symbols. English only for now.']);
    // Results: in its caveat note, the limit on testing with people.
    expect(caveat('results').some((c) => /not yet been tested with people who use AAC\./.test(c.textContent ?? ''))).toBe(true);
    // Access: in the card that makes the device claim, the simulator limit word for word.
    const devices = caveat('access').filter((c) => c.closest('.site-card')!.querySelector('h3')!.textContent === 'Phones, tablets and laptops');
    expect(devices.map((c) => c.textContent)).toEqual(['It has been checked in phone and tablet simulators, not yet on real phones and tablets.']);
    // Never fainter than its claim: ink, also inside a card whose own text is ink-muted.
    expect(read(web('components/site/site.css'))).toMatch(/\.site \.site-caveat \{[^}]*color: var\(--ink\);/);
  });

  it('MS-4.6 provider names, region and retention come from providerCopy()', () => {
    const p = providerCopy();
    const privacy = textOf($('#privacy')!);
    expect(privacy).toContain(p.service);
    // Round 3: region, retention and the log line are a list under the grid, not in the Model ranking card. Round 4
    // (r4-boxes): fact rows (.site-fact) in a note card.
    const more = $$('#privacy .site-privacy-facts .site-fact').map((li) => li.textContent);
    expect(more).toEqual([p.region, p.retention, 'Our server logs timings and counts, never your words.']);
    const ranking = $$('#privacy h3').find((h) => h.textContent === 'Model ranking, if you turn it on')!.closest('.site-card')!;
    // Round 4 (decisions §2 "Boxes"): what ranking sends is real text in the card, one sentence from rankingSentText()
    // (MS-4.6), after the h3 in the DOM (MS-7.2 exception); the card's line no longer repeats the list.
    const sent = ranking.querySelector(':scope > p.site-sent')!;
    expect(sent.textContent).toBe(`Sent to rank: ${rankingSentText()}. ${RANKING_SENT_ALSO}`);
    expect(follows(ranking.querySelector('h3')!, sent)).toBe(true);
    expect(textOf(ranking.querySelector(':scope > p:last-child')!)).toBe(`It is off until you turn it on in Settings. Then Ninth Life sends these to ${p.service} to rank the sentences.`);
    expect(textOf(ranking)).not.toContain(p.retention);
    expect($$('#privacy .site-privacy-facts .site-links a').map((a) => a.getAttribute('href'))).toEqual([PRIVACY_RULES_URL, RANKING_REQUEST_URL]);
    expect(textOf($('#faq')!)).toContain(p.service);
    // Round 4: the credits ("Model ranking: {company}.") moved to /about#credits (about.test.tsx).
    expect($('#source')).toBeNull();
  });

  it('MS-4.7 the history line is there; "Built with Kiro" and "not been measured yet" are not', () => {
    const text = pageText();
    expect(text).toContain('Made for Kiroween 2026.');
    // Round 4: one constant, shown in the site footer (so on every page) and in /llms.txt (seo.test.tsx).
    expect($('footer .site-footer__history')!.textContent).toBe(HISTORY_LINE);
    expect(text.split(HISTORY_LINE)).toHaveLength(2);
    expect(text).not.toMatch(/built with kiro/i);
    // D15 dropped "Model ranking has not been measured yet" (false: RESULTS.md has model runs). R3-P7 (2026-11-13) may
    // say that one named provider, the one this build uses, has not been measured; never ranking as a whole.
    expect(text).not.toMatch(/model ranking has not been measured yet/i);
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
    // Round 3: the per-source split (RESULTS.md "By source", B1 right sentence first) also comes from getResults().
    // Round 4: word frequency's right word first too (RESULTS.md B0 "Word acc"), so every measure has its pair.
    expect(r.bySource).not.toBeNull();
    const allowed = new Set([r.ghost.top1, r.ghost.top5, r.ghost.wordAcc, r.ghost.ksr, r.dict.top1, r.dict.top5, r.dict.wordAcc, r.bySource!.aac.top1, r.bySource!.turk.top1, ...(r.finish ? [r.finish.ksr] : [])]);
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
  it('MS-6.1 the banner is Night, with the brand line and icon, the promise h1, the lead and the hero actions', () => {
    const top = $('header#top')!;
    expect(top.getAttribute('data-theme')).toBe('night');
    const brand = top.querySelector('.site-hero__brand')!;
    const icon = brand.querySelector('img')!;
    expect(icon.getAttribute('src')).toBe('/icons/icon.svg');
    expect(Number(icon.getAttribute('width'))).toBe(64);
    expect(brand.textContent).toBe('Ninth Life');
    // The brand line comes right before the h1, the lead right after it.
    const h1 = top.querySelector('h1')!;
    expect(h1.classList.contains('site-hero__title')).toBe(true);
    expect(brand.nextElementSibling).toBe(h1);
    expect(h1.nextElementSibling!.textContent!.startsWith('A free web app for typing to talk.')).toBe(true);
    const actions = $$('.site-hero .site-cta a');
    expect(actions.map((a) => [a.textContent, a.getAttribute('href'), a.classList.contains('nl-btn--primary')])).toEqual([
      ['Open the app', '/app', true],
      ['See how it works', '#how', false],
    ]);
    // "Free. Works offline. No account." directly under the actions.
    expect($('.site-hero .site-cta')!.nextElementSibling!.textContent).toBe('Free. Works offline. No account.');
  });

  it('MS-6.2 the demo shows the finished frame first: "I need water" as a match chip per word, each over its keys', () => {
    const live = $$('.site-demo__slot > [data-state="match"]');
    expect(live.map((c) => c.querySelector('.nl-chip__word')!.textContent)).toEqual(['I', 'need', 'water']);
    expect(live.map((c) => c.querySelector('.nl-chip__code')!.textContent)).toEqual(['4', '6333', '92837']);
    // Round 4 (2026-11-13): top to bottom the card (the chips), the status line, the keypad, the toolbar;
    // no caption, no check label (the proof check section explains the check).
    const demo = $('.site-demo')!;
    expect([...demo.children].map((c) => c.className.split(' ')[0]).slice(0, 4)).toEqual(['site-demo__card', 'site-demo__status', 'nl-keypad', 'site-demo__tools']);
    expect($('.site-demo__card ul.site-demo__chips[aria-label="Proof check"]')).not.toBeNull();
    expect($('.site-demo__caption, .site-demo__check, .site-demo__foot, .site-demo a')).toBeNull();
    // The example's words are the keypad's description, the digits read one by one.
    expect($('#site-demo-desc')!.classList.contains('nl-sr-only')).toBe(true);
    expect($('#site-demo-desc')!.textContent).toContain('One press per letter: 4, 0, 6 3 3 3, 0, 9 2 8 3 7 types “I need water”.');
    // The toolbar: icon buttons named by their tooltip text (no speech engine in jsdom, so no Hear it).
    expect($$('.site-demo__tools > button').map((b) => [b.className.split(' ').pop(), collapse(b.textContent ?? '')])).toEqual([
      ['site-demo__play', 'Play the example'],
      ['site-demo__clear', 'Clear'],
    ]);
    for (const b of $$('.site-demo__tools > button')) expect(b.classList.contains('site-icon-btn')).toBe(true);
  });

  it('MS-6.11 W4: the hero keys are 12 real buttons in a labelled group, one Tab stop, named like the app keys', () => {
    const pad = $('.site-demo [role="group"]')!;
    expect(pad.getAttribute('aria-label')).toBe('Keypad, try it');
    expect(pad.getAttribute('aria-hidden')).toBeNull();
    const keys = $$('button[data-try-key]', pad) as HTMLButtonElement[];
    expect(keys.map((k) => k.dataset.tryKey)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']);
    expect(keys.filter((k) => k.tabIndex === 0).map((k) => k.dataset.tryKey)).toEqual(['1']);
    expect(keys.find((k) => k.dataset.tryKey === '4')!.getAttribute('aria-label')).toBe('4 GHI, G H I');
    // Key 9 keeps the ninth key's ember ring; nothing is pressed before a press.
    expect($$('.site-demo .site-key--ninth').map((k) => (k as HTMLElement).dataset.tryKey)).toEqual(['9']);
    expect($$('.site-demo .is-pressed')).toHaveLength(0);
  });
});

describe('drawings (MS-7, MS-9.3, MS-10.5, MS-10.8)', () => {
  it('MS-7.1 the only images are the four logos; no video, picture or canvas', () => {
    expect($$('img').map((i) => i.getAttribute('src'))).toEqual(['/icons/favicon.svg', '/icons/icon.svg', '/icons/icon.svg', '/icons/favicon.svg']);
    expect($$('video, picture, canvas')).toHaveLength(0);
  });

  it('MS-13.3 logo images have alt="" beside the visible name', () => {
    for (const img of $$('img')) expect(img.getAttribute('alt')).toBe('');
    expect($('.site-bar .nl-brand')!.textContent).toBe('Ninth Life');
    expect($('.site-footer__brand')!.textContent).toBe('Ninth Life');
  });

  it('MS-7.4 the round-2 drawings are present', () => {
    // One drawing per box card, in card order, plus the three How scenes and the proof check.
    const boxes = (id: string) =>
      $$(`#${id} .site-bento > .site-card > .site-stage > [data-play]`).map((d) => [...d.classList].find((c) => c !== 'site-drawing' && !c.startsWith('site-play--')));
    // Round 4 (2026-11-13, r4-boxes): each section starts with its lead card (They said; One or two
    // switches; On your device), then its other cards in their round-3 order.
    expect(boxes('conversation')).toEqual(['site-turn', 'site-table', 'site-save', 'site-spell']);
    expect(boxes('access')).toEqual(['site-scan', 'site-keylegend', 'site-touch', 'site-themes', 'site-layouts']);
    expect(boxes('privacy')).toEqual(['site-map', 'site-door-ranking', 'site-door-voices', 'site-door-listen']);
    // Round 4 (2026-11-13): How is three scenes, one in each step's stage: Press, Pick, Speak.
    expect(
      $$('#how .site-how__step > .site-how__stage > .site-how__scene[data-play]').map((d) => [...d.classList].find((c) => /^site-how__(press|pick|speak)$/.test(c))),
    ).toEqual(['site-how__press', 'site-how__pick', 'site-how__speak']);
    // Round 4 (r4-proof, lead ruling 1.2): the proof's one play root is its layout, which holds the figure.
    expect($$('#proof .site-proof-layout[data-play] > figure.site-proof')).toHaveLength(1);
    expect($$('#proof [data-play]')).toHaveLength(1);
    const kids = (el: Element) => [...el.children].map((c) => [c.textContent, c.className]);

    // Conversation (round 4: one scale; a still arrow from each cause to its result; cause leads, effect follows; at
    // most three changes at one instant).
    const demo = getDemoData();
    const sentence = finishedSentence(demo);
    expect(sentence).toBe('I need water');
    expect(finishedKeys(demo)).toBe('4 6333 92837');
    const arrows = (root: Element) => $$('.site-arrow', root).map((a) => [a.textContent, a.className]);
    const said = $('#conversation .site-turn')!;
    expect(said.querySelector('.site-strip__label')!.textContent).toBe('They said');
    expect(kids(said.querySelector('.site-strip__line')!)).toEqual([
      ['Nothing yet.', 'site-strip__empty site-out site-u2'],
      ['Listening. Ask them to speak now.', 'site-strip__status site-during site-k2 site-u3'],
      ['What do you need?', 'site-in site-k3'],
    ]);
    expect($$('.site-listen__label', said).map((l) => [l.textContent, l.className])).toEqual([
      ['Listen', 'site-listen__label site-out site-u1'],
      ['Stop', 'site-listen__label site-during site-k1 site-u4'],
      ['Listen', 'site-listen__label site-in site-k4'],
    ]);
    expect($$('.site-press-ring', said).map((r) => r.className)).toEqual(['site-press-ring site-ring site-k1 site-u2']);
    expect(arrows(said)).toEqual([['', 'site-arrow site-in site-k4']]);
    expect(said.querySelector('.site-well__hint')!.className).toBe('site-well__hint site-out site-u5');
    expect(said.querySelector('.site-well__body')!.className).toBe('site-well__body site-rise site-k5');
    expect(said.querySelector('.site-well__text')!.textContent).toBe(sentence);
    expect(said.querySelector('.site-well__keys')!.textContent).toBe(finishedKeys(demo));
    const show = $('#conversation .site-table')!;
    // Round 4 (amends W1 for this drawing): the table's two edges say who faces the turned message, in place of the
    // small upright card; Done and Flip stay upright for you, as in the app's Show mode.
    expect($$('.site-edge', show).map((e) => e.textContent)).toEqual(['The person opposite', 'You']);
    const msgs = $$('.site-show__msg', show);
    expect(msgs.map((m) => m.className)).toEqual(['site-show__msg site-out site-u2', 'site-show__msg site-show__msg--flipped site-in site-k2']);
    for (const m of msgs) expect(kids(m).map(([t]) => t)).toEqual(['Show this to the other person', sentence]);
    expect($$('.site-drawn-btn', show).map((b) => b.textContent)).toEqual(['Done', 'Flip']);
    expect($$('.site-press-ring', show).map((r) => r.className)).toEqual(['site-press-ring site-ring site-k1 site-u2']);
    const phrases = $('#conversation .site-save')!;
    expect(phrases.querySelector('.site-drawn-btn')!.textContent).toBe('Save phrase');
    expect($$('.site-press-ring', phrases).map((r) => r.className)).toEqual(['site-press-ring site-ring site-k1 site-u2']);
    expect(arrows(phrases)).toEqual([['', 'site-arrow site-in site-k2']]);
    expect(phrases.querySelector('.site-sheet')!.className).toBe('site-sheet site-in site-k2');
    expect(phrases.querySelector('.site-sheet__title')!.textContent).toBe('Your phrases');
    expect(kids(phrases.querySelector('.site-sheet__rows')!)).toEqual([
      [sentence, 'site-sheet__new site-rise site-k3'],
      ['Thank you', ''],
    ]);
    const spell = getSpellExample();
    const words = $('#conversation .site-spell')!;
    expect($$('.nl-chip[data-state]', words).map((c) => [c.getAttribute('data-state'), c.querySelector('.nl-chip__word')!.textContent, c.querySelector('.nl-chip__code')!.textContent])).toEqual([
      ['new', spell.word, spell.code],
      ['match', spell.word, spell.code],
    ]);
    expect([spell.word, spell.code]).toEqual(['Mihai', '64424']);
    const rows = $$('.site-spell__row', words);
    expect(rows.map((s) => s.className)).toEqual(['site-spell__row', 'site-spell__row site-rise site-k2']);
    expect(rows.map((s) => s.querySelector('.site-spell__line')!.textContent)).toEqual(['Not in your words yet.', 'In my words.']);
    expect(words.querySelector('.site-drawn-btn')!.textContent).toBe('Add to my words');
    expect($$('.site-press-ring', words).map((r) => r.className)).toEqual(['site-press-ring site-ring site-k1 site-u2']);
    expect(arrows(words)).toEqual([['', 'site-arrow site-in site-k2']]);

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
    // Round 4: what each key does appears as its ring goes (cause leads, effect follows).
    expect($$('.site-keylegend__what', legend).map((e) => [e.textContent, e.className])).toEqual([
      ['types g h i', 'site-keylegend__what site-in site-k1'],
      ['speaks', 'site-keylegend__what site-in site-k2'],
      ['goes back', 'site-keylegend__what site-in site-k3'],
      ['pick a sentence', 'site-keylegend__what site-in site-k4'],
    ]);
    // Touch (round 4): both keys on one key panel, never on a stage; each size shows after its tap.
    const touch = $('#access .site-touch')!;
    expect($$(':scope > .site-key-panel > .site-key-picture', touch)).toHaveLength(2);
    expect(kids(touch.querySelector('.site-touch__sizes')!)).toEqual([
      ['72', 'site-in site-k1'],
      ['128', 'site-in site-k2'],
    ]);
    expect($$('.site-key-ring', touch).map((r) => r.className)).toEqual(['site-key-ring site-ring site-k0 site-u1', 'site-key-ring site-ring site-k1 site-u2']);
    const scan = $('#access .site-scan')!;
    expect(scan.classList.contains('site-play--quick')).toBe(true);
    expect($$('.site-scan__rings > *', scan).map((r) => r.className)).toEqual([
      'site-scan__ring site-scan__ring--row1 site-ring site-k0 site-u1',
      'site-scan__ring site-scan__ring--row2 site-ring site-k1 site-u3',
      'site-scan__ring site-scan__ring--key4 site-mark site-k3',
    ]);
    expect($$('.site-scan__press', scan).map((r) => r.className)).toEqual(['site-scan__press site-ring site-k2 site-u3', 'site-scan__press site-ring site-k4 site-u5']);
    expect(scan.querySelector('.site-scan__label')!.textContent).toBe('Switch');
    expect(scan.querySelector('.site-speed')!.textContent).toBe('0.4 s5 s');
    // MS-7.8 (round 4): the switch types the demo's first press, key 4, and its word as the demo's chip writes it.
    expect([demo.steps[0]!.key, demo.steps[0]!.labels[0]]).toEqual(['4', 'I']);
    const typed = scan.querySelector('.site-scan__typed')!;
    expect([typed.className, ...[...typed.children].map((c) => c.textContent)]).toEqual(['site-scan__typed site-in site-k5', 'I', '4']);
    const halves = $$('#access .site-themes__half');
    expect(halves.map((h) => [h.getAttribute('data-theme'), h.querySelector('.site-themes__label')!.textContent, h.querySelector('.site-themes__hi')!.textContent])).toEqual([
      ['night', 'Night', 'Hi'],
      ['day', 'Day', 'Hi'],
    ]);
    expect(halves.map((h) => h.className)).toEqual(['site-themes__half', 'site-themes__half site-in site-k1']);
    for (const h of halves) expect(textOf(h)).toContain('4 GHI');
    // Round 4: each half's key sits on its panel; the size changes (2), then the Night key (3), then the Day key (4).
    expect(halves.map((h) => h.querySelector('.site-themes__key')!.classList.contains('site-key-panel'))).toEqual([true, true]);
    expect(halves.map((h) => $$('.site-themes__key > span', h).map((s) => s.className))).toEqual([
      ['site-out site-u3', 'site-in site-k3'],
      ['site-out site-u4', 'site-in site-k4'],
    ]);
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

    // Offline unless you choose (round 4): the map, then the three ways out (the ranking and voice drawings: MS-7.10).
    const map = $('#privacy .site-map')!;
    expect(map.querySelector('.site-bound__label')!.textContent).toBe('This device');
    expect($$('.site-door__name', map).map((d) => d.textContent)).toEqual(['Model ranking', 'Online voices', 'Listen']);
    expect(map.querySelector('.site-bound__ways')!.className).toBe('site-bound__ways site-in site-k5');
    expect(map.querySelector('.site-well')!.className).toBe('site-well site-rise site-k0');
    expect(kids(map.querySelector('.site-bound__kept')!)).toEqual([
      ['The dictionary', 'site-rise site-k1'],
      ['Saved phrases', 'site-rise site-k2'],
      ['My words', 'site-rise site-k3'],
    ]);
    const pill = map.querySelector('.site-bound__pill')!;
    expect([pill.textContent, pill.className]).toEqual(['Offline. Using your dictionary.', 'site-bound__pill site-rise site-k4']);
    const listen = $('#privacy .site-door-listen')!;
    expect(kids(listen.querySelector('.site-strip__line')!)).toEqual([
      ['Nothing yet.', 'site-strip__empty site-out site-u2'],
      ['Listening. Ask them to speak now.', 'site-strip__status site-during site-k2 site-u4'],
      ['What do you need?', 'site-in site-k4'],
    ]);
    expect($$('.site-listen__label', listen).map((l) => [l.textContent, l.className])).toEqual([
      ['Listen', 'site-listen__label site-out site-u1'],
      ['Stop', 'site-listen__label site-during site-k1 site-u5'],
      ['Listen', 'site-listen__label site-in site-k5'],
    ]);
    expect($$('.site-listen__label', listen).every((l) => l.parentElement!.classList.contains('site-cell'))).toBe(true);
    expect(listen.querySelector('.site-press-ring')!.className).toBe('site-press-ring site-ring site-k1 site-u2');
    expect(arrows(listen)).toEqual([
      ['Their voice', 'site-arrow site-in site-k3'],
      ['Text', 'site-arrow site-in site-k3'],
    ]);
    expect(listen.querySelector('.site-dest')!.textContent).toBe('The browser maker');
  });

  it('MS-7.7 every box card starts with a stage holding one data-play drawing', () => {
    const cards = $$('#conversation .site-bento > .site-card, #access .site-bento > .site-card, #privacy .site-bento > .site-card');
    expect(cards).toHaveLength(13);
    // Round 4 (r4-boxes): each section's first card is its lead, with the lead stage (at least stage-l from 600px).
    for (const id of ['conversation', 'access', 'privacy']) {
      const first = $(`#${id} .site-bento > .site-card`)!;
      expect(first.classList.contains('site-card--lead'), id).toBe(true);
      expect(first.firstElementChild!.className, id).toBe('site-stage site-stage--lead');
      expect($$(`#${id} .site-card--lead`), id).toHaveLength(1);
    }
    // What model ranking sends is real text after the card's h3 (MS-7.2 exception, round 4); the stage keeps only an
    // aria-hidden, invisible copy of it, so the drawing keeps the text's room.
    const ranking = $('#privacy .site-card--sent')!;
    expect(ranking.querySelector('.site-stage .site-sent--room')!.textContent).toBe(ranking.querySelector(':scope > .site-sent')!.textContent);
    expect(ranking.querySelector(':scope > .site-sent')!.closest('[aria-hidden]')).toBeNull();
    for (const card of cards) {
      const stage = card.firstElementChild!;
      const name = card.querySelector('h3')!.textContent ?? '';
      expect(stage.classList.contains('site-stage'), name).toBe(true);
      expect(stage.getAttribute('aria-hidden'), name).toBe('true');
      expect(stage.hasAttribute('data-reveal'), name).toBe(false);
      // Conversation (round 3): the h3 sits in an hgroup with the feature name as a small label above it.
      const next = stage.nextElementSibling!;
      if (next.tagName === 'HGROUP') {
        expect(card.closest('#conversation'), name).not.toBeNull();
        expect([...next.children].map((c) => [c.tagName, c.className]), name).toEqual([
          ['P', 'site-card__feature'],
          ['H3', 'site-h3'],
        ]);
      } else expect(next.tagName, name).toBe('H3');
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
    const LEAD = 300; // motion-play-lead, column 0 (the proof figure; How step 1)
    /** The How row's story order from 1024px (round 4, MS-8.11): step 2 waits 4 quick steps, step 3 also 5 sweeps. */
    const HOW_AFTER = [0, 4 * STEP_MS.quick!, 4 * STEP_MS.quick! + 5 * STEP_MS.sweep!];
    const parts = (root: ParentNode) => $$(['in', 'rise', 'out', 'during', 'ring', 'mark'].map((r) => `.site-${r}`).join(', '), root);
    const stepOf = (root: Element) => {
      const cls = [...root.classList].filter((c) => c.startsWith('site-play--'));
      expect(cls, root.className).toHaveLength(1);
      return STEP_MS[cls[0]!.slice('site-play--'.length)]!;
    };
    /**
     * The largest lead at any width (site.css V28, N7; round 4, r4-boxes): + motion-frame per column before the card
     * in its row. The lead card (i 0) is alone in its row. Conversation and Privacy show cards 1-3 in one row from
     * 1024px (columns 0-2, MS-8.11 "at most 2"); Access shows two a row, Touch (i 2) waiting 4 quick steps instead.
     */
    const leadOf = (root: Element) => {
      const how = root.closest('.site-how__step');
      if (how) return LEAD + HOW_AFTER[[...how.parentElement!.children].indexOf(how)]!;
      const card = root.closest('.site-bento > .site-card');
      if (!card) return LEAD;
      const i = [...card.parentElement!.children].indexOf(card);
      const four = card.parentElement!.classList.contains('site-bento--4');
      const col = i === 0 ? 0 : four ? (i === 2 ? 0 : (i - 1) % 2) : i - 1;
      return LEAD + col * STEP_MS.frame! + (four && i === 2 ? 4 * STEP_MS.quick! : 0);
    };
    // The Results bars and marks have their own test (round 4, PO-1: bars grow, last change by 1,600 ms).
    const roots = $$('[data-play]').filter((r) => !r.closest('#results'));
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
    // Round 4: the rows after each lead card (Conversation and Privacy: one row of three; Access: two rows of two).
    const rows: [string, number[][]][] = [
      ['#conversation .site-bento', [[1, 2, 3]]],
      ['#privacy .site-bento', [[1, 2, 3]]],
      ['#access .site-bento', [[1, 2], [3, 4]]],
    ];
    for (const [sel, groups] of rows) {
      const cards = [...$(sel)!.children];
      for (const g of groups) {
        for (let x = 0; x < g.length; x += 1) {
          for (let y = x + 1; y < g.length; y += 1) {
            const [a, b] = [g[x]!, g[y]!];
            for (const [s1, e1] of rings(cards[a]!)) for (const [s2, e2] of rings(cards[b]!)) {
              expect(s1 < e2 && s2 < e1, `${sel} cards ${a} and ${b}: rings ${s1}-${e1} and ${s2}-${e2}`).toBe(false);
            }
          }
        }
      }
    }
  });

  it('MS-8.11 (round 4) the How row plays in story order: one ember ring at a time, its last change at 3,780 ms', () => {
    // The steps' play classes (quick 400, sweep 240) and the row's leads from 1024px: step 2 waits step 1's four
    // presses, step 3 also step 2's five sweeps (site.css --play-after). The lit numbers keep their scene's clock.
    const STEP_MS: Record<string, number> = { quick: 400, sweep: 240 };
    const AFTER = [0, 4 * STEP_MS.quick!, 4 * STEP_MS.quick! + 5 * STEP_MS.sweep!];
    const steps = $$('#how .site-how__step');
    expect(steps).toHaveLength(3);
    const stepOf = (el: Element) => STEP_MS[[...el.classList].find((c) => c.startsWith('site-play--'))!.slice('site-play--'.length)]!;
    const leadOf = (i: number) => 300 + AFTER[i]!;
    const n = (el: Element, p: 'k' | 'u') => Number([...el.classList].find((c) => new RegExp(`^site-${p}\\d+$`).test(c))!.slice(6));
    const rings = steps.map((li, i) =>
      $$('.site-key-ring, .site-press-ring', li).map((r) => [leadOf(i) + n(r, 'k') * stepOf(li), leadOf(i) + n(r, 'u') * stepOf(li)] as const),
    );
    expect(rings.map((r) => r.length)).toEqual([4, 0, 1]);
    for (const [a, b] of [[0, 1], [0, 2], [1, 2]] as const) {
      for (const [s1, e1] of rings[a]!) for (const [s2, e2] of rings[b]!) {
        expect(s1 < e2 && s2 < e1, `How steps ${a + 1} and ${b + 1}: rings ${s1}-${e1} and ${s2}-${e2}`).toBe(false);
      }
    }
    const parts = (root: ParentNode) => $$(['in', 'rise', 'out', 'during', 'ring', 'mark'].map((r) => `.site-${r}`).join(', '), root);
    const last = steps.map((li, i) => Math.max(...parts(li).map((p) => lastChangeMs(p.className, stepOf(li), leadOf(i)))));
    // Step 2's number goes out as step 3's comes in (3,100 ms): one lit number at a time.
    expect(last).toEqual([2100, 3300, 3780]);
  });

  it('MS-8.11 every step class used on the page has a CSS rule', () => {
    const css = read(web('components/site/site.css'));
    const used = new Set($$('[class]').flatMap((e) => [...e.classList]).filter((c) => /^site-[ku]\d+$/.test(c)));
    expect(used.size).toBeGreaterThan(15);
    for (const c of used) expect(css, c).toContain(`[data-site-motion="on"] .${c} { --${c[5]}: ${c.slice(6)}; }`);
  });

  it('MS-7.3 no ember fill and at most one ember ring per step', () => {
    const scopes = $$('[data-play]');
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
    // Round 4: Keyboard 4 + Touch 2 + the switch's 3 scan highlights (row 1, row 2, key 4).
    expect($$(EMBER, $('#access')!).length).toBeGreaterThanOrEqual(9);
  });

  it('MS-7.10 what ranking sends is RANKING_SENT as real text (no count, no provider); the voice lines match the Voices card', () => {
    // Round 4 (decisions §2 "Boxes"): the list is real text in the card, from rankingSentText() (MS-4.6), drawn at the
    // top of the stage (MS-7.2 exception); the drawing keeps the switch, its default in words and the arrow out.
    const p = providerCopy();
    const sent = $('#privacy .site-card--sent > .site-sent')!;
    expect(sent.textContent).toBe(`Sent to rank: ${rankingSentText(RANKING_SENT)}. ${RANKING_SENT_ALSO}`);
    for (const item of RANKING_SENT) expect(sent.textContent!.toLowerCase()).toContain(item.toLowerCase());
    // No count in the list itself; the conditional sentence after it (RANKING_SENT_ALSO, ADR-007) names "the last 3 things".
    expect(sent.textContent!.replace(RANKING_SENT_ALSO, '')).not.toMatch(/\d/);
    expect(sent.textContent).not.toContain(p.service);
    expect(sent.textContent).not.toContain(p.company);
    const ranking = $('#privacy .site-door-ranking')!;
    expect(ranking.classList.contains('site-play--quick')).toBe(true);
    expect($$('.site-door__row', ranking).map((r) => [r.textContent, r.className])).toEqual([
      ['Model rankingOff', 'site-door__row site-out site-u1'],
      ['Model rankingOn', 'site-door__row site-in site-k1'],
    ]);
    expect(ranking.querySelector('.site-bound__note')!.textContent).toBe('Off until you turn it on');
    expect($$('.site-outline', ranking).map((o) => o.className)).toEqual(['site-outline site-ring site-k0 site-u1']);
    expect($$('.site-arrow', ranking).map((a) => a.className)).toEqual(['site-arrow site-in site-k2']);
    // The drawing's own words (its invisible copy of the sent line aside) name no provider and hold no count.
    const own = ranking.cloneNode(true) as Element;
    own.querySelector('.site-sent--room')!.remove();
    expect(textOf(own)).not.toMatch(/\d/);
    expect(textOf(own)).not.toContain(p.service);
    expect(textOf(own)).not.toContain(p.company);
    const voices = $('#privacy .site-door-voices')!;
    expect($$('.site-voice__name', voices).map((n) => n.textContent)).toEqual(['Voice (en, online)', 'Voice (en, on this device)']);
    expect($$('.site-voice__name .site-voice__check', voices).map((c) => c.className)).toEqual(['site-voice__check site-mark site-k1']);
    expect($$('.site-voice__line', voices).map((l) => [l.textContent, l.className])).toEqual([
      ['Sends the text to the browser maker', 'site-voice__line site-in site-k2'],
      ['Keeps your words on the device', 'site-voice__line site-in site-k1'],
    ]);
    expect($$('.site-arrow', voices).map((a) => [a.textContent, a.className])).toEqual([['The text', 'site-arrow site-in site-k2']]);
    const card = $$('#privacy h3').find((h) => h.textContent === 'Voices')!.closest('.site-card')!;
    const said = card.querySelector(':scope > p')!.textContent!;
    expect(said).toContain('keep your words on the device');
    expect(said).toContain('send the text to the browser maker');
    expect(textOf(voices)).not.toMatch(/\b(Google|Apple|Chrome|Safari)\b/);
  });

  it('MS-10.9 the box grids: a lead card, then two or three cards a row; the switch card leads Access; no CSS order', () => {
    // Round 4 (r4-boxes): .site-bento--3 (Conversation, Privacy: a lead, then three cards in one row from 1024px) and
    // .site-bento--4 (Access: a lead, then four cards two by two). No tall tile; the reading order is the DOM order.
    for (const [id, cls, n] of [
      ['conversation', 'site-grid site-bento site-bento--3', 4],
      ['access', 'site-grid site-bento site-bento--4', 5],
      ['privacy', 'site-grid site-bento site-bento--3', 4],
    ] as const) {
      const grid = $(`#${id} .site-bento`)!;
      expect(grid.className, id).toBe(cls);
      const kids = [...grid.children].map((c) => c.className.replace(' site-card--sent', ''));
      expect(kids, id).toEqual([`site-card site-card--lead${id === 'access' ? ' site-card--end' : ''}`, ...Array<string>(n - 1).fill('site-card')]);
    }
    expect($$('.site-grid--2, .site-grid--boxes, .site-grid--access, .site-card--tall')).toHaveLength(0);
    expect(read(web('components/site/site.css'))).not.toMatch(/\.site-grid--(2|boxes|access|start|hug)\b/);
    expect($$('#access .site-bento > .site-card h3').map((h) => h.textContent)).toEqual(['One or two switches', 'Keyboard', 'Touch', 'Your view', 'Phones, tablets and laptops']);
    const rowStages = $$('#conversation .site-bento > .site-card:not(.site-card--lead) > .site-stage, #privacy .site-bento > .site-card:not(.site-card--lead) > .site-stage');
    expect(rowStages).toHaveLength(6);
    for (const stage of rowStages) expect(stage.className).toBe('site-stage site-stage--m');
    for (const stage of $$('#access .site-bento > .site-card:not(.site-card--lead) > .site-stage')) expect(stage.className).toBe('site-stage');
  });

  it('MS-7.2 drawings and stages are aria-hidden; the proof figure exposes only its caption, chips and closing lines; nothing focusable', () => {
    // The hero's keypad is not a drawing since W4 (real buttons, MS-6.11); every other keypad is.
    for (const el of $$('.site-drawing, .site-pad:not(.site-demo__keypad), .site-stage')) {
      expect(el.closest('[aria-hidden="true"]'), el.className).not.toBeNull();
    }
    const figure = $('figure.site-proof')!;
    const exposed = $$('*', figure).filter((el) => !el.closest('[aria-hidden="true"]'));
    const allowed = (el: Element) =>
      el.matches('figcaption, figcaption > .nl-sr-only, ul.site-proof__rows, li.site-proof__row, .site-proof__chip, div.site-proof__closing, p.site-proof__said, p.site-proof__said > span') ||
      el.closest('.nl-chip[data-state]') !== null ||
      el.querySelector(':scope > .nl-chip[data-state]') !== null;
    for (const el of exposed) expect(allowed(el), el.outerHTML.slice(0, 120)).toBe(true);
    expect($$('.nl-chip[data-state]', figure).filter((c) => !c.closest('[aria-hidden="true"]'))).toHaveLength(3);
    for (const el of $$('.site-drawing, .site-pad:not(.site-demo__keypad), .site-stage, figure.site-proof')) expect($$(FOCUSABLE, el)).toHaveLength(0);
    for (const btn of $$('.site-drawn-btn')) expect(btn.tagName).toBe('DIV');
  });

  it('MS-9.3 the closing lines lead with the check and x icons; wafer is a struck-through reject chip; its letter that is not on its key is boxed with an x', () => {
    // Round 4 (2026-11-13): the closing lines, each led by its chip's icon, replace round 3's legend.
    const proof = getProofExample();
    const said = $$('figure.site-proof p.site-proof__said');
    expect(said).toHaveLength(2);
    (['check', 'x'] as const).forEach((name, i) => {
      expect(said[i]!.firstElementChild!.isEqualNode(iconNode(name))).toBe(true);
    });
    expect($$('.site-legend')).toHaveLength(0);
    const chip = $('figure.site-proof [data-state="reject"]')!;
    expect(chip.classList.contains('nl-chip--reject')).toBe(true);
    expect(chip.querySelector('.nl-chip__word')!.textContent).toBe(proof.reject.word);
    expect(read(web('styles/components.css'))).toMatch(/\.nl-chip--reject \.nl-chip__word \{ text-decoration: line-through/);
    const boxed = $$('figure.site-proof .site-letter__box');
    expect(boxed).toHaveLength(1);
    const letter = boxed[0]!.parentElement!;
    const line = letter.parentElement!;
    expect($$('.site-letter', line).indexOf(letter)).toBe(proof.reject.diffAt);
    expect(boxed[0]!.getAttribute('data-l')).toBe(proof.reject.word[proof.reject.diffAt]);
    expect($$('.site-letter', line).map((l) => l.firstChild!.textContent).join('')).toBe(proof.reject.word);
    expect(line.querySelector('.site-proof__x')!.firstElementChild!.isEqualNode(iconNode('x'))).toBe(true);
    // The figure says the letter is not on the key pressed there: that key's drawn letters do not hold it.
    const keyLetters = $$('figure.site-proof .site-keycap__letters').map((k) => k.textContent ?? '');
    expect(keyLetters).toEqual(proof.keyLetters);
    expect(keyLetters[proof.reject.diffAt]!.toLowerCase()).not.toContain(proof.reject.word[proof.reject.diffAt]);
  });

  it('MS-7.9 the proof figure keeps its accessible text, splits the closing lines by state and has no frame labels', () => {
    const proof = getProofExample();
    const figure = $('figure.site-proof')!;
    // Round 4 (lead ruling 1.2): the whole proof layout is the one data-play root; the figure is a reveal block in it.
    expect(figure.parentElement!.matches('.site-proof-layout.site-play--sweep[data-play]')).toBe(true);
    expect(figure.hasAttribute('data-play')).toBe(false);
    const caption = figure.querySelector('figcaption')!;
    expect(caption.querySelector(':scope > .nl-sr-only')!.textContent).toBe('Your keys: 92837');
    expect(proof.keys).toBe('92837');
    const visible = caption.querySelector(':scope > [aria-hidden="true"]')!;
    expect(visible.querySelector('.site-proof__label')!.textContent).toBe('Your keys');
    expect($$('.site-keycap', visible).map((k) => k.textContent)).toEqual(['9WXYZ', '2ABC', '8TUV', '3DEF', '7PQRS']);
    const [can, never] = $$('p.site-proof__said', figure);
    expect(can!.textContent).toBe(proofCanLine(proof));
    expect(proofCanLine(proof)).toBe('Can be spoken: water, waves.');
    expect(collapse(never!.textContent ?? '')).toBe(proofNeverLine(proof));
    expect(proofNeverLine(proof)).toBe('Never spoken: wafer. "wafer" is 92337. Your keys are 92837.');
    expect(textOf(figure).match(/[Nn]ever spoken/g)).toHaveLength(1);
    const closing = figure.querySelector('.site-proof__closing')!;
    expect(closing.closest('[aria-hidden="true"]')).toBeNull();
    expect(closing.className).toBe('site-proof__closing site-in site-k12');
    const chips = $$('.nl-chip[data-state]', figure).filter((c) => !c.closest('[aria-hidden="true"]'));
    expect(chips.map((c) => [c.querySelector('.nl-chip__word')!.textContent, c.getAttribute('data-state')])).toEqual([
      ['water', 'match'],
      ['waves', 'match'],
      ['wafer', 'reject'],
    ]);
    // Suggestions arrive as typing chips one step apart; the verdicts follow the sweep, the dropped word last.
    expect(chips.map((c) => c.parentElement!.className)).toEqual(['site-in site-k10', 'site-in site-k10', 'site-in site-k11']);
    expect($$('.site-proof__chip > [aria-hidden="true"]', figure).map((t) => t.className)).toEqual([
      'site-during site-k2 site-u10',
      'site-during site-k3 site-u10',
      'site-during site-k4 site-u11',
    ]);
    expect($$('.site-frame__label, .site-frames, .site-frame', figure)).toHaveLength(0);
    for (const label of ['Suggested', 'Checked', 'Dropped']) expect(textOf(figure)).not.toContain(label);
  });

  it('MS-7.9 every line holds 5 column boxes, the letters land under their keys with the box, and no box sits in a chip', () => {
    const figure = $('figure.site-proof')!;
    const lines = $$('.site-proof__line', figure);
    expect(lines).toHaveLength(4);
    const sweep = [5, 6, 7, 8, 9].map((k) => `site-proof__box site-ring site-k${k} site-u${k + 1}`);
    for (const line of lines) {
      expect(line.closest('[aria-hidden="true"]')).not.toBeNull();
      expect([...line.children].filter((c) => c.classList.contains('site-proof__box')).map((b) => b.className)).toEqual(sweep);
    }
    // The keys are there from the start, outlined while step 1 is lit; each word's letters land with their column's box.
    expect($$('.site-keycap', lines[0]!)).toHaveLength(5);
    expect(lines[0]!.querySelector('.site-proof__spot')!.className).toBe('site-proof__spot site-ring site-k0 site-u2');
    for (const line of lines.slice(1)) {
      expect($$('.site-letter', line).map((l) => l.className)).toEqual([5, 6, 7, 8, 9].map((k) => `site-letter site-rise site-k${k}`));
    }
    const k = 5 + getProofExample().reject.diffAt;
    expect($('.site-letter__box')!.className).toBe(`site-letter__box site-mark site-k${k}`);
    expect($('.site-proof__x')!.className).toBe(`site-proof__x site-mark site-k${k}`);
    const boxes = $$('.site-proof__box');
    expect(boxes).toHaveLength(20);
    for (const box of boxes) {
      expect(box.parentElement!.classList.contains('site-proof__line')).toBe(true);
      expect(box.closest('.site-proof__chip')).toBeNull();
    }
  });

  it('MS-10.9 MS-8.11 the proof is its head, then one play root holding the figure, the four steps and the note; the step numbers light on its clock', () => {
    // Round 4 (2026-11-13; lead ruling 1.2): text outside the figure takes only marks (the numbers light)
    // and never waits for the play.
    const wrap = $('#proof > .site-wrap')!;
    expect([...wrap.children].map((c) => c.className)).toEqual(['site-head', 'site-proof-layout site-play--sweep']);
    const root = wrap.children[1]!;
    expect(root.hasAttribute('data-play')).toBe(true);
    expect([...root.children].map((c) => `${c.tagName}.${c.classList[0]}`)).toEqual(['FIGURE.site-proof', 'OL.site-proof-steps', 'DIV.site-proof__more']);
    const list = root.querySelector('ol.site-proof-steps')!;
    expect(list.getAttribute('role')).toBe('list');
    const steps = $$(':scope > li', list);
    expect(steps.map((s) => s.className)).toEqual(['site-step', 'site-step', 'site-step', 'site-step']);
    expect(steps.map((s) => collapse(s.querySelector('.site-step__title')!.textContent ?? ''))).toEqual([
      'You press keys.',
      'Words are suggested for them.',
      'Each word is turned back into keys.',
      'A word that does not match is dropped, never spoken.',
    ]);
    expect($$('h3, h4, .site-step__line', list)).toHaveLength(0);
    steps.forEach((s, i) => {
      const num = s.querySelector('.site-step__num')!;
      expect(num.getAttribute('aria-hidden')).toBe('true');
      expect(num.textContent).toBe(`${i + 1}${i + 1}`);
    });
    expect(steps.map((s) => s.querySelector('.site-step__lit')!.className)).toEqual([
      'site-step__lit site-during site-k0 site-u2',
      'site-step__lit site-during site-k2 site-u5',
      'site-step__lit site-during site-k5 site-u10',
      'site-step__lit site-during site-k10 site-u13',
    ]);
    const ROLE = /^site-(in|rise|out|during|ring|mark)$/;
    const outside = $$('*', root).filter((el) => !el.closest('figure') && [...el.classList].some((c) => ROLE.test(c)));
    expect(outside).toHaveLength(4);
    expect(outside.every((el) => el.classList.contains('site-step__lit'))).toBe(true);
    expect(root.querySelector('.site-proof__more a.nl-btn--secondary.nl-btn--xl')!.getAttribute('href')).toBe('/app');
  });

  it('MS-8.12 (round 4) How is three steps, each a stage with its scene and a .site-step, and no sticky picture', () => {
    expect($('.site-how__picture')).toBeNull();
    expect($('#how ol.site-how__steps')!.getAttribute('role')).toBe('list');
    const steps = $$('#how ol.site-how__steps > li.site-how__step');
    expect(steps).toHaveLength(3);
    const playOf = (el: Element) => [...el.classList].filter((c) => c.startsWith('site-play--'));
    expect(steps.map(playOf)).toEqual([['site-play--quick'], ['site-play--sweep'], ['site-play--sweep']]);
    expect(steps.map((li) => li.querySelector('.site-how__stage > .site-how__scene')!.className.split(' ')[2])).toEqual([
      'site-how__press',
      'site-how__pick',
      'site-how__speak',
    ]);
    steps.forEach((li, i) => {
      // The step is the scope beside its scene (the data-play root) and carries the scene's play class.
      expect(li.hasAttribute('data-play-scope') && !li.hasAttribute('data-play')).toBe(true);
      expect([...li.children].map((c) => c.className)).toEqual(['site-stage site-how__stage', 'site-step']);
      const stage = li.firstElementChild!;
      expect(stage.getAttribute('aria-hidden')).toBe('true');
      expect($$('[data-play]', stage)).toHaveLength(1);
      expect(playOf(stage.firstElementChild!)).toEqual(playOf(li));
      // .site-step: the aria-hidden number with its lit layer, the h3 title and the line.
      const num = li.querySelector('.site-step > .site-step__num')!;
      expect(num.className).toBe('site-step__num site-cell');
      expect(num.getAttribute('aria-hidden')).toBe('true');
      expect([...num.children].map((c) => c.textContent)).toEqual([String(i + 1), String(i + 1)]);
      expect(num.lastElementChild!.className).toMatch(/^site-step__lit site-during site-k\d+ site-u\d+$/);
      expect(li.querySelector('.site-step > h3.site-step__title')).not.toBeNull();
      expect(li.querySelector('.site-step > p.site-step__line')).not.toBeNull();
    });
    // Drawn buttons are secondary, never primary (MS-1.6). The limits follow the row as one caveat, icon first.
    const btns = $$('#how .site-drawn-btn');
    expect(btns.map((b) => b.textContent)).toEqual(['SpeakSpeaking', 'Show']);
    for (const btn of btns) expect(btn.classList.contains('nl-btn--secondary') && !btn.classList.contains('nl-btn--primary')).toBe(true);
    const caveat = $('#how .site-stack > p.site-caveat')!;
    expect(caveat.textContent).toBe('You need to be able to spell. Ninth Life types words, not symbols. English only for now.');
    expect(caveat.firstElementChild!.tagName.toLowerCase()).toBe('svg');
    expect(caveat.firstElementChild!.getAttribute('aria-hidden')).toBe('true');
  });

  it('MS-7.3 a repeated key press is two rings, the second late', () => {
    const ringsOn = (root: Element, digit: string) => {
      const key = $$('.nl-key', root).find((k) => k.querySelector('.nl-key__digit')!.textContent === digit)!;
      return $$('.site-key-ring', key).map((r) => r.className);
    };
    // Round 4: How's one keypad is a crop, rows 1 and 2 (keys 1 to 6).
    const pads = [$('#how .site-how__press .nl-keypad')!];
    expect($$('#how .nl-keypad')).toHaveLength(1);
    expect($$('.nl-key__digit', pads[0]!).map((d) => d.textContent)).toEqual(['1', '2', '3', '4', '5', '6']);
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
    const pads = $$('.nl-keypad.site-pad') as HTMLElement[];
    // The hero, How step 1's keypad crop and the scan drawing (round 4: the How picture and its stage copy are gone).
    expect(pads).toHaveLength(3);
    // The hero's keys are real buttons sized like the drawings (round 4: HERO_KEY_SIZE retired, the demo uses KEY_DRAWING_SIZE).
    for (const pad of pads) expect(pad.style.getPropertyValue('--nl-key').trim()).toBe(KEY_DRAWING_SIZE);
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
    expect(marked('#proof')).toBe(4); // round 4: head, figure, steps, note (the layout is the play root, not a reveal)
    expect(marked('#conversation')).toBe(5);
    expect(marked('#access')).toBe(7);
    expect(marked('#privacy')).toBe(5);
    expect(marked('#results')).toBe(4);
    expect(marked('#limits')).toBe(3);
    expect(marked('#faq')).toBe(2);
    for (const id of SECTION_IDS.slice(0, -1)) expect($(`#${id} .site-head`)!.hasAttribute('data-reveal')).toBe(true);
    for (const sel of ['#how .site-how__step', '#how .site-caveat', '.site-proof__more', 'figure.site-proof', '.site-proof-steps', '.site-note', '.site-limits__card', '.site-faq-list']) {
      expect($(sel)!.hasAttribute('data-reveal'), sel).toBe(true);
    }
    for (const sel of ['.site-proof-layout', '.site-limits','.site-how__steps', '.site-stats', '#faq details']) {
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
    // Round 4 (r4-boxes): the stagger restarts in each row: the lead card alone, then the row's cards 0, 1 (, 2).
    expect(steps('#conversation .site-bento')).toEqual(['0', '0', '1', '2']);
    expect(steps('#access .site-bento')).toEqual(['0', '0', '1', '0', '1']);
    expect(steps('#privacy .site-bento')).toEqual(['0', '0', '1', '2']);
    expect(steps('.site-results__grid')).toEqual(['0', '1', '2']); // round 4: the chart card, by source, presses
    expect(steps('.site-limits')).toEqual(['0', '1']); // round 4: the two Good to know cards
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

describe('shared primitives and the Night close (round 3, 2026-11-12)', () => {
  it('W2 #start is a Night band with the night sky; its primary sits in a .site-cta like the hero', () => {
    const start = $('#start')!;
    expect(start.getAttribute('data-theme')).toBe('night');
    expect(start.classList.contains('site-night')).toBe(true);
    expect($('header#top')!.classList.contains('site-night')).toBe(true);
    const primaries = $$('.nl-btn--primary');
    expect(primaries).toHaveLength(2);
    for (const p of primaries) expect(p.closest('.site-cta'), p.textContent ?? '').not.toBeNull();
    expect(primaries.every((p) => p.classList.contains('nl-btn--xl'))).toBe(true);
  });

  it('round 4: the close states the four facts as a typographic row (no badges, no icons) instead of the one-line lead', () => {
    const facts = $$('#start .site-start__facts > li');
    expect(facts.map((li) => [li.querySelector('.site-start__fact')!.textContent, li.querySelector('.site-start__fact-line')!.textContent])).toEqual(
      START_FACTS.map(([t, l]) => [t, l]),
    );
    expect(START_FACTS.map(([t]) => t)).toEqual(['Free', 'Works offline', 'No account', 'Open source']);
    for (const li of facts) expect(li.querySelector('.nl-sr-only')!.textContent).toBe(': ');
    expect($$('#start svg, #start .site-start__facts img')).toHaveLength(0);
    expect(textOf($('#start')!)).not.toContain('Free. Works offline. No account.');
    // The row comes before the button, the button before the input-methods note.
    const primary = $('#start .nl-btn--primary')!;
    expect(follows($('#start .site-start__facts')!, primary)).toBe(true);
    expect(follows(primary, $('#start .site-start__note')!)).toBe(true);
  });

  it('round 4: the footer is a brand column, the Footer navigation in three labelled groups, then the legal block', () => {
    const footer = $('footer.site-footer')!;
    // The brand, its promise and a secondary "Open the app" (never an ember fill, MS-9.1).
    expect($('.site-footer__promise')!.textContent).toBe('A free web app for typing to talk.');
    const open = $$('a', footer).filter((a) => a.textContent === 'Open the app');
    expect(open).toHaveLength(1);
    expect(open[0]!.className).toBe('nl-btn nl-btn--secondary');
    expect(open[0]!.getAttribute('href')).toBe('/app');
    expect(open[0]!.closest('nav')).toBeNull();
    // Three groups, an h2 and a list each, the links in the order footerGroups() gives (in-page anchors on /).
    const nav = $('footer nav[aria-label="Footer"]')!;
    const groups = $$('.site-footer__group', nav).map((g) => [g.querySelector('h2')!.textContent, $$('li > a', g).map((a) => [a.textContent, a.getAttribute('href')])]);
    expect(groups).toEqual(footerGroups('').map((g) => [g.title, g.links.map((l) => [l.label, l.href])]));
    expect(groups.map(([t]) => t)).toEqual(['Product', 'Trust', 'Project']);
    const links = $$('a', nav).map((a) => [a.textContent, a.getAttribute('href')]);
    expect(links).toContainEqual(['Report a problem', ISSUES_URL]);
    expect(links).toContainEqual(['How we measured', METHOD_URL]);
    expect(links).toContainEqual(['Source code', REPO_URL]);
    expect(links).toContainEqual(['Data sources and licenses', NOTICE_URL]);
    expect(links).toContainEqual(['Credits', '/about#credits']);
    expect(links).toContainEqual(['Privacy', '#privacy']);
    expect(links).toContainEqual(['Good to know', '#limits']);
    expect(links).toContainEqual(['Accessibility', '#accessibility']);
    // In-page anchors exist on the page; links that leave the site carry the decorative external icon.
    for (const [, href] of links) if (href!.startsWith('#')) expect(document.getElementById(href!.slice(1)), href!).not.toBeNull();
    for (const a of $$('a', nav)) expect(a.querySelector('svg[aria-hidden="true"]') !== null).toBe(a.getAttribute('href')!.startsWith('https://'));
    // The legal block: statement, history line, licence line, then Back to top (to #top, the banner).
    expect($('.site-footer__legal .site-footer__statement')!.textContent).toBe(NOT_A_MEDICAL_DEVICE);
    expect($('.site-footer__legal .site-footer__history')!.textContent).toBe(HISTORY_LINE);
    expect($('.site-footer__caption')!.textContent).toBe('Code MIT. Data CC BY-SA 4.0. Fonts SIL Open Font License.');
    const top = $$('.site-footer__end .site-links a').map((a) => [collapse(a.textContent ?? ''), a.getAttribute('href')]);
    expect(top).toEqual([['Back to top', '#top']]);
    expect($('header#top')).not.toBeNull();
  });

  it('the footer links report a problem and the method, and its in-page links stay anchors', () => {
    const nav = $('footer nav[aria-label="Footer"]')!;
    const links = $$('a', nav).map((a) => [a.textContent, a.getAttribute('href')]);
    expect(links).toContainEqual(['Report a problem', ISSUES_URL]);
    expect(links).toContainEqual(['How we measured', METHOD_URL]);
    expect(links).toContainEqual(['Privacy', '#privacy']);
    expect(links.every(([, href]) => !href!.startsWith('/#'))).toBe(true);
    expect($('footer.site-footer > .site-wrap')).not.toBeNull();
    // Round 3 (R3-P6, lead decision extending W2): the footer is Night in both themes, like the #start close above it.
    expect($('footer.site-footer')!.getAttribute('data-theme')).toBe('night');
  });

  it('one card look: feature cards are .site-card, note cards add --note, and site-card--line is gone', () => {
    expect($$('.site-card--line')).toHaveLength(0);
    expect(read(web('components/site/site.css'))).not.toContain('site-card--line');
    // Round 4: the Good to know cards are feature cards (fill and edge), and the Source section with Credits is gone.
    // Round 4: the Results caveat is a .site-caveat (first, before the numbers), not a note card.
    // Round 4 (r4-boxes): Privacy's region, retention and log facts are a note card too.
    expect($$('.site-card--note').map((c) => c.closest('section')!.id)).toEqual(['access', 'privacy']);
    expect($$('#privacy .site-bento > .site-card').map((c) => c.className)).toEqual(['site-card site-card--lead', 'site-card site-card--sent', 'site-card', 'site-card']);
  });

  it('one brand lockup (.nl-brand) in the bar and the footer', () => {
    expect($$('.nl-brand').map((b) => b.textContent)).toEqual(['Ninth Life', 'Ninth Life']);
    expect($('.site-bar a.nl-brand')!.getAttribute('href')).toBe('#top');
    expect($('.site-footer .nl-brand')!.classList.contains('nl-brand--small')).toBe(true);
  });
});

describe('lower sections (round 3, 2026-11-12)', () => {
  it('MS-3.1 bands still alternate ground and surface with Results after Proof; #start is the Night close', () => {
    const bands = $$('main > section').map((s) => (s.classList.contains('site-night') ? 'night' : s.classList.contains('site-band--surface') ? 'surface' : 'ground'));
    const want = SECTION_IDS.map((_, i) => (i === SECTION_IDS.length - 1 ? 'night' : i % 2 === 0 ? 'ground' : 'surface'));
    // Conversation became a surface band in the same round (lead, 2026-11-12).
    expect(bands).toEqual(want);
    expect($('#conversation')!.className).toBe('site-band site-band--surface');
  });

  it('Results (round 4): the caveat first, then the chart, the two cards, the model status rows and the links', () => {
    const r = getResults()!;
    const stack = $('#results .site-stack')!;
    const kids = [...stack.children].map((c) => c.className || c.tagName.toLowerCase());
    expect(kids).toEqual(['site-head', 'site-caveat site-results__caveat', 'site-results__grid', 'site-results__models', 'site-links', 'site-cta']);
    const caveat = $('#results .site-results__caveat')!;
    expect(caveat.firstElementChild!.matches('svg.nl-icon[aria-hidden="true"]')).toBe(true);
    expect(caveat.querySelector('strong')!.textContent).toBe('These figures come from a simulated typist, not from studies with people.');
    expect(textOf(caveat)).toContain('The app has not yet been tested with people who use AAC.');
    // Each measure: Ninth Life offline, then word frequency alone, then what it counts (RESULTS.md summary rows).
    const groups = $$('#results .site-stats__group').map((g) => [...g.children].map((c) => collapse(c.textContent ?? '')));
    const items = r.items.toLocaleString('en-US');
    expect(groups).toEqual([
      ['Right sentence first', `${r.ghost.top1} Ninth Life, offline`, `${r.dict.top1} Word frequency alone`, `of ${items} sentences, with no correction`],
      ['Right sentence in the top 5', `${r.ghost.top5} Ninth Life, offline`, `${r.dict.top5} Word frequency alone`, `of ${items} sentences`],
      ['Right word first', `${r.ghost.wordAcc} Ninth Life, offline`, `${r.dict.wordAcc} Word frequency alone`, `of ${r.words!.toLocaleString('en-US')} words, before any correction`],
    ]);
    const cards = $$('#results .site-results__card').map((c) => collapse(c.textContent ?? ''));
    expect(cards[0]).toContain(`${r.bySource!.aac.top1} of ${r.bySource!.aac.items} AAC sentences`);
    expect(cards[0]).toContain(`${r.bySource!.turk.top1} of ${r.bySource!.turk.items} dialogue replies`);
    expect(cards[1]).toContain(`${r.ghost.pressesPerChar} key presses per character`);
    // Finish the word (B1c), measured in RESULTS.md, with the caveat (web-ui Req 31; the section's simulated-typist line).
    expect(r.finish).not.toBeNull();
    expect(cards[1]).toContain(`Typing every letter. With Finish the word, ${r.finish!.pressesPerChar}: ${r.finish!.ksr} fewer. Real people save less.`);
    expect(cards[1]).not.toContain('saves no key presses');
    expect(cards[1]).toContain(`${r.ghost.scanStepsPerChar} scan steps per character, with one switch`);
    // Model ranking: an icon and a status word per row (never colour alone), the measured models by name.
    const rows = $$('#results .site-status li');
    expect(rows.map((li) => li.querySelector('strong')!.textContent)).toEqual(['Measured', 'Not measured yet:']);
    for (const li of rows) expect(li.firstElementChild!.matches('svg.nl-icon[aria-hidden="true"]')).toBe(true);
    expect(collapse(rows[0]!.textContent ?? '')).toContain('with 2 MiniMax models (MiniMax-M3 and MiniMax-M3.1-Flash), on samples of 200 sentences');
    expect(collapse(rows[1]!.textContent ?? '')).toBe(`Not measured yet: ${providerCopy().service}, which the app's model ranking uses.`);
    // The links go to the full results and the method, as links that leave the site.
    const links = $$('#results .site-links a');
    expect(links.map((a) => [a.getAttribute('href'), a.className, collapse(a.textContent ?? '')])).toEqual([
      [RESULTS_URL, 'site-go site-go--out', 'Full results'],
      [METHOD_URL, 'site-go site-go--out', 'How we measured'],
    ]);
  });

  it('Results (round 4, PO-1): every bar is its printed value on a full track, and grows once; the numbers never animate', () => {
    // A bar's length is the number printed beside it (barShare), so a bar can never disagree with its label.
    const fills = $$('#results .site-meter__fill') as HTMLElement[];
    expect(fills).toHaveLength(3 * 2 + 2);
    for (const fill of fills) {
      const row = fill.closest('dd, li')!;
      const value = row.querySelector('.site-stats__value')!.textContent!;
      expect(Number(fill.style.getPropertyValue('--v'))).toBe(barShare(value));
      expect(fill.parentElement!.getAttribute('aria-hidden')).toBe('true');
    }
    // Ours first (k0), the comparison second (k1); the play roots are the 3 measures, the by-source rows and the
    // scan marks. Each part's last change: lead 300 + k x the root's step + its change (grow 600, mark 120) <= 1,600.
    const roots = $$('#results [data-play]');
    expect(roots).toHaveLength(3 + 1 + 1);
    const STEP_MS: Record<string, number> = { sweep: 240 };
    for (const root of roots) {
      const step = STEP_MS[[...root.classList].find((c) => c.startsWith('site-play--'))!.slice('site-play--'.length)]!;
      const parts = $$('.site-grow, .site-mark', root);
      expect(parts.length, root.className).toBeGreaterThan(0);
      for (const p of parts) {
        const k = Number([...p.classList].find((c) => /^site-k\d+$/.test(c))!.slice(6));
        const last = 300 + k * step + (p.classList.contains('site-grow') ? 600 : 120);
        expect(last, p.className).toBeLessThanOrEqual(1600);
      }
    }
    expect($$('.site-stats__group').map((g) => $$('.site-grow', g).map((p) => p.classList.contains('site-k0')))).toEqual([
      [true, false],
      [true, false],
      [true, false],
    ]);
    // The numbers are static text: no role class on a value or anything around it inside the chart.
    for (const v of $$('#results .site-stats__value')) expect(v.closest('.site-in, .site-rise, .site-out, .site-during, .site-mark, .site-grow')).toBeNull();
    // The grow rule: transform only, motion-grow, filling backwards, under data-site-motion (site.css).
    const css = read(web('components/site/site.css'));
    expect(css).toContain('[data-site-motion="on"] [data-play][data-played="1"] .site-grow {\n    animation: site-grow var(--motion-grow) var(--motion-ease-out) calc(var(--play-lead) + var(--k) * var(--play-step)) backwards;');
    expect(css).toMatch(/@keyframes site-grow \{ from \{ transform: scaleX\(0\); \} to \{ transform: none; \} \}/);
  });

  it('FAQ: the questions are faqItems(), and the list ends with "Something else? Ask on GitHub"', () => {
    const shown = $$('#faq details').map((d) => [d.querySelector('summary')!.textContent, d.querySelector('p')!.textContent]);
    expect(shown).toEqual(faqItems().map(([q, a]) => [q, a]));
    const ranking = faqItems().find(([q]) => q === 'What does model ranking send, and to whom?')!;
    expect(ranking[1].toLowerCase()).toContain(rankingSentText().toLowerCase());
    const more = $('#faq .site-faq-list > p.site-faq__more')!;
    expect(collapse(more.textContent ?? '')).toBe('Something else? Ask on GitHub');
    expect(more.querySelector('a')!.getAttribute('href')).toBe(ISSUES_URL);
  });

  it('Access has a one-line lead; the box stages hug their drawings on phones (W1; round 4: all three sections)', () => {
    expect($('#access .site-lead')!.textContent).toBe('Keyboard, touch or one or two switches, on the screen you have.');
    expect($$('.site-bento').map((g) => g.closest('section')!.id)).toEqual(['conversation', 'access', 'privacy']);
    const css = read(web('components/site/site.css'));
    expect(css).toMatch(/@media \(max-width: 599px\) \{\s*\.site-bento \.site-stage \{ min-block-size: 0; padding-block: var\(--space-3\); \}/);
  });

  it('round 4: the Source section is gone and its facts live in the close and the footer; the maker is not named (W6)', () => {
    expect($('#source')).toBeNull();
    expect($$('.site-source__block, .site-credits')).toHaveLength(0);
    for (const sel of ['#start', 'footer']) expect(textOf($(sel)!)).not.toMatch(/\bmaintainer\b|\bmade by\b/i);
  });
});
