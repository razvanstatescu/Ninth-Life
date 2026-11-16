// Search, sharing and answer-engine metadata (marketing-site MS-3.5 to MS-3.9, Round 3 2026-11-12):
// lib/site-url.ts, components/site/seo.ts, structured-data.ts, llms.ts, app/robots.ts, /sitemap.xml,
// /llms.txt, app/not-found.tsx, the /about and /app metadata and the app's h1.
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { metadata as aboutMetadata } from '@/app/about/page';
import { metadata as appMetadata } from '@/app/app/page';
import { metadata as layoutMetadata } from '@/app/layout';
import { GET as llmsGet } from '@/app/llms.txt/route';
import NotFound, { metadata as notFoundMetadata } from '@/app/not-found';
import HomePage from '@/app/page';
import robots from '@/app/robots';
import { GET as sitemapGet } from '@/app/sitemap.xml/route';
import { CommunicationScreen } from '@/components/CommunicationScreen';
import { NOT_A_MEDICAL_DEVICE } from '@/components/Footer';
import { llmsText } from '@/components/site/llms';
import { Faq, faqItems } from '@/components/site/sections/Faq';
import { LIMITS, LIMITS_LEAD } from '@/components/site/sections/Limits';
import { OG_LOCALE, SITE_DEFINITION, SOCIAL_CARD, pageMetadata, socialCardPath } from '@/components/site/seo';
import { HISTORY_LINE, METHOD_URL, RESULTS_URL, getResults } from '@/components/site/site-data';
import { FEATURE_LIST, siteGraph, siteJsonLd } from '@/components/site/structured-data';
import { RANKING_SENT } from '@/lib/rankingProvider';
import { SITE_PATHS, absoluteUrl, siteOrigin, sitemapXml } from '@/lib/site-url';
import { miniDict } from './fixtures';

const web = (rel: string) => resolve(__dirname, '..', rel);
const repo = (rel: string) => resolve(__dirname, '../../..', rel);
const read = (path: string) => readFileSync(path, 'utf8');
const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
const ORIGIN = new URL('https://ninth-life.example');

// The same banned-claims pattern as site.test.tsx MS-4.2, minus the intended-purpose sentence and the
// question that introduces it.
const BANNED =
  /\b(treat(s|ment)?|therap(y|ies|eutic)|rehabilitat\w*|recover\w*|restor\w* speech|clinically|evidence-based|approved|certified|medical device|replaces?|understands you|reads your mind|ALS|aphasia|autism|stroke|cerebral palsy|dementia)\b/i;
const withoutPurpose = (s: string) => s.split(NOT_A_MEDICAL_DEVICE).join(' ').split('Is it a medical device?').join(' ');
// tm-lint's words, assembled so this file never contains them (tm-lint scans tests too).
const TM = new RegExp(`\\b(${['T', '9'].join('')}|${['No', 'kia'].join('')}|${['Swift', 'Key'].join('')}|${['G', 'board'].join('')})\\b`, 'i');

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('site origin (lib/site-url.ts, MS-3.6)', () => {
  it('reads SITE_URL first, then VERCEL_PROJECT_PRODUCTION_URL, else null', () => {
    expect(siteOrigin({})).toBeNull();
    expect(siteOrigin({ SITE_URL: 'https://a.example', VERCEL_PROJECT_PRODUCTION_URL: 'b.example' })?.href).toBe('https://a.example/');
    expect(siteOrigin({ VERCEL_PROJECT_PRODUCTION_URL: 'b.example' })?.href).toBe('https://b.example/');
    expect(siteOrigin({ SITE_URL: '  ', VERCEL_PROJECT_PRODUCTION_URL: 'b.vercel.app' })?.href).toBe('https://b.vercel.app/');
  });

  it('keeps only the origin: trailing slash, path, query and port handling', () => {
    expect(siteOrigin({ SITE_URL: 'https://a.example/' })?.href).toBe('https://a.example/');
    expect(siteOrigin({ SITE_URL: 'https://a.example/some/path?q=1#x' })?.href).toBe('https://a.example/');
    expect(siteOrigin({ SITE_URL: 'http://localhost:3402' })?.href).toBe('http://localhost:3402/');
  });

  it('gives null for invalid values instead of guessing', () => {
    expect(siteOrigin({ SITE_URL: 'not a url' })).toBeNull();
    expect(siteOrigin({ SITE_URL: 'ftp://a.example' })).toBeNull();
    expect(siteOrigin({ SITE_URL: 'a.example' })).toBeNull(); // SITE_URL must carry its scheme
    expect(siteOrigin({ VERCEL_PROJECT_PRODUCTION_URL: 'https://' })).toBeNull();
  });

  it('absoluteUrl is null without an origin', () => {
    expect(absoluteUrl('/about', null)).toBeNull();
    expect(absoluteUrl('/about', ORIGIN)).toBe('https://ninth-life.example/about');
  });
});

describe('robots.txt and sitemap (MS-3.5, MS-3.6)', () => {
  it('robots allows every agent (W5) and adds the Sitemap line only with an origin', () => {
    vi.stubEnv('SITE_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', '');
    expect(robots()).toEqual({ rules: { userAgent: '*', allow: '/' } });
    vi.stubEnv('SITE_URL', 'https://ninth-life.example');
    expect(robots()).toEqual({ rules: { userAgent: '*', allow: '/' }, sitemap: 'https://ninth-life.example/sitemap.xml' });
  });

  it('the sitemap lists /, /about and /app as absolute URLs, with no dates or priorities', () => {
    const xml = sitemapXml(ORIGIN)!;
    expect([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])).toEqual(SITE_PATHS.map((p) => `https://ninth-life.example${p}`));
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
    expect(xml).not.toMatch(/lastmod|changefreq|priority/);
  });

  it('/sitemap.xml is XML with an origin and a 404 without one', async () => {
    vi.stubEnv('SITE_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', '');
    expect(sitemapXml()).toBeNull();
    expect(sitemapGet().status).toBe(404);
    vi.stubEnv('SITE_URL', 'https://ninth-life.example');
    const res = sitemapGet();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/xml; charset=utf-8');
    expect((await res.text()).match(/<loc>/g)).toHaveLength(3);
  });
});

describe('page metadata (MS-3.5)', () => {
  it('without an origin: no canonical, no og:url, no image, a summary card', () => {
    const m = pageMetadata({ path: '/about', title: 'T', description: 'D' }, null);
    expect('alternates' in m).toBe(false);
    expect(m.openGraph).toEqual({ title: 'T', description: 'D', type: 'website', siteName: 'Ninth Life', locale: OG_LOCALE });
    expect(m.twitter).toEqual({ card: 'summary', title: 'T', description: 'D' });
  });

  it('with an origin: canonical and og:url per page, the social card and a large card', () => {
    const m = pageMetadata({ path: '/about', title: 'T', description: 'D', shareTitle: 'S', shareDescription: 'SD' }, ORIGIN);
    expect(m.alternates).toEqual({ canonical: `${ORIGIN.origin}/about` });
    const og = m.openGraph as Record<string, unknown>;
    expect(og).toMatchObject({ title: 'S', description: 'SD', url: `${ORIGIN.origin}/about`, locale: 'en_US' });
    expect(og.images).toEqual([{ url: `${ORIGIN.origin}${socialCardPath()}`, width: 1200, height: 630, type: 'image/png', alt: SOCIAL_CARD.alt }]);
    expect(m.twitter).toMatchObject({ card: 'summary_large_image', title: 'S', description: 'SD' });
  });

  it('R3-P9 the canonical and og:url of / are `${origin}/` with the trailing slash, as Next renders them, like the sitemap and the JSON-LD', async () => {
    const m = pageMetadata({ path: '/', title: 'T', description: 'D' }, ORIGIN);
    const home = `${ORIGIN.origin}/`;
    expect(m.alternates).toEqual({ canonical: home });
    expect((m.openGraph as Record<string, unknown>).url).toBe(home);
    // Next's own resolver keeps an absolute URL as written when there is no metadataBase, and turns "/" into the bare
    // origin when there is one: hence no metadataBase in the layout, in any build.
    const { resolveAbsoluteUrlWithPathname } = (await import('next/dist/lib/metadata/resolvers/resolve-url.js')) as unknown as {
      resolveAbsoluteUrlWithPathname: (url: string, base: URL | null, ctx: { trailingSlash: boolean; pathname: string }) => string;
    };
    const ctx = { trailingSlash: false, pathname: '/' };
    expect(resolveAbsoluteUrlWithPathname(home, null, ctx)).toBe(home);
    expect(resolveAbsoluteUrlWithPathname('/', ORIGIN, ctx)).toBe(ORIGIN.origin);
    expect(read(web('app/layout.tsx'))).not.toMatch(/metadataBase:/);
    expect(sitemapXml(ORIGIN)).toContain(`<loc>${home}</loc>`);
  });

  it('the layout has no canonical or Open Graph of its own (children would inherit them) and no metadataBase', () => {
    expect('alternates' in layoutMetadata).toBe(false);
    expect('openGraph' in layoutMetadata).toBe(false);
    expect('metadataBase' in layoutMetadata).toBe(false);
    expect(layoutMetadata.title).toBe('Ninth Life');
  });

  it('/about and /app have their own title, description and Open Graph', () => {
    expect(aboutMetadata.title).toBe('About Ninth Life');
    expect(aboutMetadata.description).toBe('How Ninth Life checks every spoken word against your keys, what model ranking sends and to whom, and what Ninth Life is not.');
    expect(appMetadata.title).toBe('Ninth Life app: type on 9 keys');
    expect(appMetadata.description).toBe('The Ninth Life keypad: press one key per letter on keys 2 to 9 and hear the sentence you meant. Free, no account, works offline after the first visit.');
    for (const m of [aboutMetadata, appMetadata]) {
      expect(m.openGraph).toMatchObject({ title: m.title, description: m.description, siteName: 'Ninth Life', locale: 'en_US' });
      expect(BANNED.test(`${m.title} ${m.description}`)).toBe(false);
    }
  });

  it('MS-3.9 the 404 page has one title and links back to the website and the app', () => {
    // Round 3 (R3-P5): its own title in the site's "Ninth Life: …" pattern and its own description.
    expect(notFoundMetadata.title).toBe('Ninth Life: page not found');
    expect(notFoundMetadata.description).toBe('There is no page at this address. Open the Ninth Life app, or go to the home page.');
    expect(notFoundMetadata.description).not.toBe(layoutMetadata.description);
    expect('robots' in notFoundMetadata).toBe(false); // Next adds noindex to the 404 itself
    const { container } = render(<NotFound />);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const main = container.querySelector('main')!;
    expect([...main.querySelectorAll('a')].map((a) => a.getAttribute('href')).sort()).toEqual(['/', '/app']);
  });

  it('R3-P5 the 404 page uses the site look: Night, the site bar, the site type, a .site-cta row and the site footer', () => {
    const { container } = render(<NotFound />);
    const site = container.querySelector('.site')!;
    expect(site.classList.contains('site-night')).toBe(true);
    expect(site.getAttribute('data-theme')).toBe('night');
    expect(site.querySelector('header .site-bar a.nl-brand')!.getAttribute('href')).toBe('/');
    expect(site.querySelector('h1')!.className).toBe('site-h2');
    expect(site.querySelector('.site-lead')).not.toBeNull();
    const buttons = [...site.querySelectorAll('main .site-cta > a')].map((a) => a.className);
    expect(buttons).toEqual(['nl-btn nl-btn--primary nl-btn--xl', 'nl-btn nl-btn--secondary nl-btn--xl']);
    expect(site.querySelector('footer.site-footer .site-footer__statement')).not.toBeNull();
    // Round 4: the footer's "Back to top" lands on the 404's header.
    expect(site.querySelector('.site-footer__end a')!.getAttribute('href')).toBe('#top');
    expect(site.querySelector('header#top')).not.toBeNull();
    expect(read(web('app/not-found.tsx'))).toContain("import '@/components/site/site.css'");
  });

  it('/app has exactly one h1, visually hidden', () => {
    const { container } = render(<CommunicationScreen initialDict={miniDict()} />);
    const h1 = container.querySelectorAll('h1');
    expect(h1).toHaveLength(1);
    expect(h1[0]!.textContent).toBe('Ninth Life');
    expect(h1[0]!.className).toBe('nl-sr-only');
    expect(h1[0]!.closest('main')).not.toBeNull();
  });
});

describe('one definition everywhere (P2-3)', () => {
  it('layout description, manifest, README, JSON-LD and llms.txt use SITE_DEFINITION word for word', () => {
    expect(layoutMetadata.description).toBe(SITE_DEFINITION);
    expect(JSON.parse(read(web('public/manifest.webmanifest'))).description).toBe(SITE_DEFINITION);
    const readme = collapse(read(repo('README.md')).split('\n\n').slice(0, 4).join(' '));
    expect(readme).toContain(SITE_DEFINITION);
    const graph = siteGraph(ORIGIN)!['@graph'] as Record<string, unknown>[];
    expect(graph.find((n) => n['@type'] === 'WebSite')!.description).toBe(SITE_DEFINITION);
    expect(graph.find((n) => n['@type'] === 'WebApplication')!.description).toBe(SITE_DEFINITION);
    expect(llmsText({ origin: ORIGIN })).toContain(`> ${SITE_DEFINITION}`);
  });

  it('the definition has no banned claim and no trademark', () => {
    expect(BANNED.test(SITE_DEFINITION)).toBe(false);
    expect(TM.test(SITE_DEFINITION)).toBe(false);
  });
});

describe('social card (MS-3.6)', () => {
  it('is a 1200x630 PNG under 100 KB, left out of the precache, with a clean alt text', () => {
    const file = web(`public/${SOCIAL_CARD.file}`);
    const png = readFileSync(file);
    expect(png.subarray(1, 4).toString('latin1')).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(SOCIAL_CARD.width);
    expect(png.readUInt32BE(20)).toBe(SOCIAL_CARD.height);
    expect(statSync(file).size).toBeLessThan(100 * 1024);
    expect(read(web('next.config.mjs'))).toContain('/^social-card\\.png$/,');
    expect(TM.test(SOCIAL_CARD.alt)).toBe(false);
    expect(socialCardPath()).toMatch(/^\/social-card\.png\?v=[0-9a-f]{12}$/);
  });
});

describe('JSON-LD (MS-3.7)', () => {
  const graphOf = () => siteGraph(ORIGIN)!['@graph'] as Record<string, unknown>[];

  it('is not emitted without an origin', () => {
    expect(siteGraph(null)).toBeNull();
    expect(siteJsonLd(null)).toBeNull();
    vi.stubEnv('SITE_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', '');
    const { container } = render(<HomePage />);
    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it('WebSite, WebApplication and FAQPage, with the facts the page shows', () => {
    const graph = graphOf();
    expect(graph.map((n) => n['@type'])).toEqual(['WebSite', 'WebApplication', 'FAQPage']);
    const app = graph[1]!;
    expect(app).toMatchObject({
      url: 'https://ninth-life.example/app',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      disambiguatingDescription: NOT_A_MEDICAL_DEVICE,
      featureList: [...FEATURE_LIST],
      image: `https://ninth-life.example${socialCardPath()}`,
    });
    const json = JSON.stringify(siteGraph(ORIGIN));
    expect(json).not.toMatch(/"author"|"Person"|"Organization"|"aggregateRating"/); // W6: the maker is not named
    expect(json).not.toContain('localhost');
  });

  it('the FAQPage equals the questions the page renders, word for word', () => {
    const { container } = render(<Faq />);
    const shown = [...container.querySelectorAll('details')].map((d) => [collapse(d.querySelector('summary')!.textContent ?? ''), collapse(d.querySelector('p')!.textContent ?? '')]);
    const faq = graphOf()[2]!.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
    expect(faq.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(shown);
    expect(faqItems().map(([q, a]) => [q, a])).toEqual(shown);
  });

  it('no banned claim or trademark, and "<" is escaped in the script text', () => {
    const json = siteJsonLd(siteGraph(ORIGIN))!;
    expect(BANNED.test(withoutPurpose(JSON.stringify(siteGraph(ORIGIN))))).toBe(false);
    expect(TM.test(json)).toBe(false);
    expect(siteJsonLd({ x: '</script><b>' })).toBe('{"x":"\\u003c/script>\\u003cb>"}');
  });

  it('the home page renders it in one ld+json script when the origin is known', () => {
    vi.stubEnv('SITE_URL', 'https://ninth-life.example');
    const { container } = render(<HomePage />);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);
    expect(JSON.parse(scripts[0]!.textContent ?? '')).toEqual(siteGraph(ORIGIN));
  });
});

describe('/llms.txt (MS-3.8)', () => {
  it('passes Lighthouse llms-txt: an H1, a [text](url) link, 50+ characters', async () => {
    const res = llmsGet();
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    const text = await res.text();
    expect(text.startsWith('# Ninth Life\n')).toBe(true);
    expect(text).toMatch(/\[[^\]]+\]\([^)]+\)/);
    expect(text.length).toBeGreaterThan(50);
  });

  // Round 4 (2026-11-13; MS-3.8, MS-4.7): the limits of Good to know and the history line, from the
  // values the page uses (LIMITS in Limits.tsx, HISTORY_LINE in site-data.ts), so the machine copy cannot drift.
  it('lists every limit of Good to know, in page order, and states the history line', () => {
    const text = llmsText({ origin: ORIGIN });
    const block = text.slice(text.indexOf('## Good to know\n'), text.indexOf('## Questions\n'));
    expect(block.split('\n').filter((l) => l.startsWith('- '))).toEqual(LIMITS.map((l) => `- ${l}`));
    expect(LIMITS[0]).toBe(LIMITS_LEAD);
    expect(LIMITS).toContain('Tested with people who use AAC: not yet.');
    expect(text.slice(text.indexOf('## Source\n'))).toContain(HISTORY_LINE);
    // RESULTS.md's own key-press figure, as the page shows it (round 4, r4-results), never a "-0.0%" savings figure.
    const res = getResults();
    const presses = res?.ghost.pressesPerChar;
    if (presses) {
      expect(text).toContain(`${presses} key presses per character with letters only.`);
      expect(text).not.toContain('keystroke savings');
      expect(text).not.toContain('saves no key presses');
    }
    // B1c (Finish the word), measured: both figures from RESULTS.json.
    if (res?.finish) expect(text).toContain(`With Finish the word, ${res.finish.pressesPerChar} key presses per character, ${res.finish.ksr} fewer.`);
    expect(text).toContain('- [Full results](');
  });

  it('has the intended-purpose sentence verbatim, the exact ranking list and every FAQ', () => {
    const text = llmsText({ origin: ORIGIN });
    expect(text).toContain(NOT_A_MEDICAL_DEVICE);
    for (const item of RANKING_SENT) expect(text).toContain(`- ${item}\n`);
    for (const [q, a] of faqItems()) expect(text).toContain(`### ${q}\n\n${a}\n`);
  });

  it('every number is one getResults() measured, with the results and the method linked', () => {
    const text = llmsText({ origin: ORIGIN });
    const r = getResults()!;
    // B1c's saving (Finish the word, RESULTS.md) is a getResults() number too.
    const allowed = new Set([r.ghost.top1, r.ghost.top5, r.ghost.wordAcc, r.ghost.ksr, r.dict.top1, r.dict.top5, ...(r.finish ? [r.finish.ksr] : [])]);
    for (const m of text.matchAll(/-?\d+(\.\d+)?%/g)) expect(allowed.has(m[0]), m[0]).toBe(true);
    expect(text).toContain(`[Full results](${RESULTS_URL})`);
    expect(text).toContain(`[How we measured](${METHOD_URL})`);
  });

  it('links are absolute with an origin and site-relative without one (never localhost)', () => {
    expect(llmsText({ origin: ORIGIN })).toContain('[Open the app](https://ninth-life.example/app)');
    const local = llmsText({ origin: null });
    expect(local).toContain('[Open the app](/app)');
    expect(local).not.toContain('localhost');
  });

  it('no banned claim and no trademark', () => {
    const text = llmsText({ origin: ORIGIN });
    expect(BANNED.test(withoutPurpose(text))).toBe(false);
    expect(TM.test(text)).toBe(false);
  });
});

describe('tm-lint on the new files', () => {
  it('is clean', () => {
    const files = [
      'packages/web/lib/site-url.ts',
      'packages/web/components/site/seo.ts',
      'packages/web/components/site/structured-data.ts',
      'packages/web/components/site/llms.ts',
      'packages/web/app/llms.txt/route.ts',
      'packages/web/app/sitemap.xml/route.ts',
      'packages/web/app/not-found.tsx',
      'packages/web/scripts/gen-og.mjs',
    ].map(repo);
    const r = spawnSync(process.execPath, [repo('scripts/tm-lint.mjs'), ...files], { encoding: 'utf8' });
    expect(r.status, r.stdout + r.stderr).toBe(0);
  });
});
