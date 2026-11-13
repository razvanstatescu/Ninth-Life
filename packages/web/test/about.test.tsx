// /about in the website's look (W3, ADR-006 amendment 2026-11-12; landing review round 3).
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import AboutPage from '@/app/about/page';
import { NOT_A_MEDICAL_DEVICE } from '@/components/Footer';
import { HISTORY_LINE } from '@/components/site/site-data';
import { providerCopy, rankingSentText } from '@/lib/rankingProvider';

const text = () => (document.body.textContent ?? '').replace(/\s+/g, ' ');
const q = (sel: string) => document.querySelector(sel);
const qa = (sel: string) => [...document.querySelectorAll(sel)];

beforeEach(() => {
  render(<AboutPage />);
});
afterEach(cleanup);

describe('/about (W3)', () => {
  it('uses the site chrome: skip link, a Night header with the bar, one h1, main, the site footer', () => {
    expect(qa('a[href]')[0]!.textContent).toBe('Skip to content');
    const header = q('header.site-top')!;
    expect(header.getAttribute('data-theme')).toBe('night');
    expect(header.classList.contains('site-night')).toBe(true);
    expect(header.querySelector('.site-bar a.nl-brand')!.getAttribute('href')).toBe('/');
    expect(qa('h1').map((h) => h.textContent)).toEqual(['About Ninth Life']);
    expect(q('main#main')).not.toBeNull();
    expect(q('footer.site-footer')).not.toBeNull();
  });

  it('keeps a clear "Open the app" and points the bar and footer anchors at the landing page', () => {
    const open = qa('a').filter((a) => a.textContent === 'Open the app').map((a) => a.getAttribute('href'));
    expect(open.length).toBeGreaterThanOrEqual(1);
    expect(new Set(open)).toEqual(new Set(['/app']));
    const nav = qa('nav[aria-label="Main"] a').map((a) => a.getAttribute('href'));
    expect(nav).toEqual(['/#how', '/#proof', '/#access', '/#privacy', '/#faq']);
    const footer = qa('nav[aria-label="Footer"] a').map((a) => a.getAttribute('href'));
    expect(footer).toContain('/#privacy');
    expect(footer).toContain('/#access');
  });

  it('says "sent to <service>" with a space, and lists the same four things ranking sends as the landing page', () => {
    const p = providerCopy();
    expect(text()).toContain(`${rankingSentText()} are sent to ${p.service},`);
    expect(text()).not.toMatch(/to[A-Z]/);
    expect(text()).toContain("Ninth Life's own best guesses");
  });

  it('carries the provider region and the server-log line, from providerCopy()', () => {
    const p = providerCopy();
    expect(text()).toContain(`${p.region} ${p.retention} Our server logs timings and counts, never your words.`);
  });

  it('shows the intended-purpose sentence once, as a note card, and the footer leaves it out', () => {
    expect(text().split(NOT_A_MEDICAL_DEVICE)).toHaveLength(2);
    expect(q('.site-card--note')!.textContent).toBe(NOT_A_MEDICAL_DEVICE);
    expect(q('.site-footer__statement')).toBeNull();
  });

  // Round 4 (2026-11-13): the landing page's Free and open source section dissolved (MS-3.1, MS-14.5).
  it('carries the old Source lead, "Why it is free" and the credits word for word, before the statement', () => {
    const sections = qa('main section').map((s) => s.querySelector('h2')!.textContent);
    expect(sections).toEqual(['What it does', 'Every word is checked against your keys', 'Privacy', 'Free and open source', 'Credits', 'What Ninth Life is not']);
    expect(text()).toContain(
      'Ninth Life is free, with no paid tier, and its code is MIT licensed. The dictionary is built from open word lists and public text, credited in the repository.',
    );
    expect(text()).toContain(
      "After one visit, typing, the dictionary and the proof check run on your device, and speech uses your browser's voices. Model ranking costs a little per sentence. We can switch it off at any time, and the app then keeps working with the offline dictionary.",
    );
    expect(qa('#credits li').map((li) => li.textContent)).toEqual([
      'Word frequencies: wordfreq by Robyn Speer.',
      'Sentence and word-pair data: AACText by Keith Vertanen and Per Ola Kristensson, and the Turk dialogues by Keith Vertanen.',
      'Type: Atkinson Hyperlegible Next and Mono by the Braille Institute, SIL Open Font License.',
      `Model ranking: ${providerCopy().company}.`,
    ]);
    expect(text()).not.toMatch(/\bmaintainer\b|\bmade by\b/i); // W6: the maker is not named
  });

  it('uses the round-4 footer: the history line, the groups with /# anchors, and Back to top to the header (#top)', () => {
    expect(q('.site-footer__history')!.textContent).toBe(HISTORY_LINE);
    const links = qa('nav[aria-label="Footer"] a').map((a) => a.getAttribute('href'));
    expect(links).toEqual(expect.arrayContaining(['/#how', '/#limits', '/#accessibility', '/about', '/about#credits']));
    expect(q('.site-footer__end a')!.getAttribute('href')).toBe('#top');
    expect(q('header#top.site-top')).not.toBeNull();
  });
});
