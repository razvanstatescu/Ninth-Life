import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  TOTAL_BUDGET,
  UsageError,
  checkTargets,
  isDevServerHtml,
  lcpElementTag,
  median,
  pageBudgets,
  parseArgs,
  renderReport,
  reportedScores,
  writeBlock,
} from '../../../scripts/lighthouse-lib.mjs';

const fixture = (name: string) => readFileSync(resolve(__dirname, 'fixtures/lighthouse', name), 'utf8');
const requests = JSON.parse(fixture('network-requests.json')) as {
  pageUrl: string;
  items: { url: string; resourceType?: string; transferSize?: number; sessionTargetType?: string }[];
};

describe('scripts/lighthouse-lib.mjs', () => {
  it('MS-11.2 lcpElementTag reads the Lighthouse 13 lcp-breakdown-insight and the older audit', () => {
    const node = (snippet: string) => ({ items: [{ type: 'table' }, { type: 'node', snippet }] });
    expect(lcpElementTag({ audits: { 'lcp-breakdown-insight': { details: node('<p class="site-hero__lead">') } } })).toBe('p');
    expect(lcpElementTag({ audits: { 'largest-contentful-paint-element': { details: node('<IMG src="x">') } } })).toBe('img');
    expect(lcpElementTag({ audits: {} })).toBeNull();
  });

  it('MS-11.4 isDevServerHtml is true for the dev server HTML and false for a production page', () => {
    expect(isDevServerHtml(fixture('dev.html'))).toBe(true);
    expect(isDevServerHtml(fixture('prod.html'))).toBe(false);
  });

  it('MS-11.4 parseArgs has the defaults of the design', () => {
    expect(parseArgs([])).toEqual({ url: 'http://localhost:3202/', runs: 3, preset: 'both', write: false });
    expect(parseArgs(['--url', 'http://localhost:4000/', '--runs', '5', '--preset', 'mobile', '--write'])).toEqual({
      url: 'http://localhost:4000/',
      runs: 5,
      preset: 'mobile',
      write: true,
    });
  });

  it('MS-11.4 parseArgs rejects bad runs, URLs, presets and unknown flags', () => {
    for (const argv of [['--runs', '0'], ['--runs', '10'], ['--runs', '2.5'], ['--url', 'ftp://x'], ['--url', 'not a url'], ['--preset', 'tablet'], ['--fast'], ['--url']]) {
      expect(() => parseArgs(argv), argv.join(' ')).toThrow(UsageError);
    }
  });

  it('MS-11.1 median of 3 values (and of an even count)', () => {
    expect(median([97, 92, 95])).toBe(95);
    expect(median([1, 3, 2, 4])).toBe(2.5);
  });

  it('MS-11.2 pageBudgets counts page items by type, the worker on its own line, an item with no sessionTargetType as page', () => {
    const b = pageBudgets(requests.items, requests.pageUrl);
    const bytes = Object.fromEntries(b.lines.map((l) => [l.type, l.bytes]));
    expect(bytes.Document).toBe(20480);
    expect(bytes.Stylesheet).toBe(8192);
    expect(bytes.Script).toBe(2048 + 40960);
    expect(bytes.Font).toBe(25600);
    // The icon has no sessionTargetType: counted as a page request (the stricter reading).
    expect(bytes.Image).toBe(2048);
    expect(b.noTarget).toBe(1);
    expect(b.total.bytes).toBe(20480 + 8192 + 2048 + 40960 + 25600 + 2048);
    expect(b.total.budget).toBe(TOTAL_BUDGET);
    expect(b.worker).toEqual({ count: 2, bytes: 15360 + 10240 });
    expect(b.ok).toBe(true);
  });

  it('MS-11.2 pageBudgets does not flag data: or blob: items and flags another origin, from the page or the worker', () => {
    expect(pageBudgets(requests.items, requests.pageUrl).otherOrigins).toEqual([]);
    const extra = [
      ...requests.items,
      { url: 'https://cdn.example.com/a.js', resourceType: 'Script', transferSize: 100, sessionTargetType: 'page' },
      { url: 'https://stats.example.com/b', resourceType: 'Fetch', transferSize: 100, sessionTargetType: 'worker' },
    ];
    const b = pageBudgets(extra, requests.pageUrl);
    expect(b.otherOrigins).toEqual(['https://cdn.example.com/a.js', 'https://stats.example.com/b']);
    expect(b.ok).toBe(false);
  });

  it('MS-11.2 pageBudgets fails a type over its budget', () => {
    const b = pageBudgets([{ url: 'http://localhost:3202/big.js', resourceType: 'Script', transferSize: 126 * 1024, sessionTargetType: 'page' }], requests.pageUrl);
    expect(b.lines.find((l) => l.type === 'Script')?.ok).toBe(false);
    expect(b.ok).toBe(false);
  });

  it('MS-11.1 checkTargets: Performance 95 or more, every other category 100', () => {
    expect(checkTargets({ performance: 94, accessibility: 100, 'best-practices': 100, seo: 100 })).toHaveLength(1);
    expect(checkTargets({ performance: 94, accessibility: 100, 'best-practices': 100, seo: 100 })[0]).toMatch(/^Performance 94/);
    for (const cat of ['accessibility', 'best-practices', 'seo']) {
      const misses = checkTargets({ performance: 95, accessibility: 100, 'best-practices': 100, seo: 100, [cat]: 99 });
      expect(misses, cat).toHaveLength(1);
    }
    expect(checkTargets({ performance: 95, accessibility: 100, 'best-practices': 100, seo: 100 })).toEqual([]);
  });

  it('MS-11.4 renderReport and writeBlock put the report between the markers', () => {
    const budgets = pageBudgets(requests.items, requests.pageUrl);
    const block = renderReport({
      lighthouseVersion: '13.6.0',
      chromiumVersion: 'Chromium 140',
      url: 'http://localhost:3202/',
      date: '2026-11-10',
      commit: 'abc1234',
      presets: [
        {
          preset: 'mobile',
          runs: [
            { performance: 97, accessibility: 100, 'best-practices': 100, seo: 100 },
            { performance: 96, accessibility: 100, 'best-practices': 100, seo: 100 },
            { performance: 98, accessibility: 100, 'best-practices': 100, seo: 100 },
          ],
          medians: { performance: 97, accessibility: 100, 'best-practices': 100, seo: 100 },
          metrics: { fcp: 1200, lcp: 1800, tbt: 40, cls: 0.001, si: 1500 },
          lcpElement: 'h1',
          budgets,
        },
      ],
      misses: [],
    });
    for (const s of ['Lighthouse 13.6.0', 'http://localhost:3202/', '2026-11-10', 'abc1234', '| Run 3 |', '**97**', 'Service worker: 2 requests', 'every mobile target and budget met']) {
      expect(block).toContain(s);
    }
    const first = writeBlock('# Device performance\n\nText.\n', block);
    expect(first).toContain('## Landing page (Lighthouse)\n\n<!-- lighthouse:start -->\n');
    const again = writeBlock(first, 'NEW');
    expect(again).toContain('<!-- lighthouse:start -->\nNEW\n<!-- lighthouse:end -->');
    expect(again).not.toContain('abc1234');
    expect(again.match(/## Landing page \(Lighthouse\)/g)).toHaveLength(1);
  });

  it('Round 3 Agentic Browsing is reported as a fraction with no target, and skipped when a run lacks it', () => {
    expect(reportedScores({ categories: { 'agentic-browsing': { score: 0.52 } } })).toEqual({ 'agentic-browsing': 0.52 });
    expect(reportedScores({ categories: {} })).toEqual({ 'agentic-browsing': null });
    const budgets = pageBudgets(requests.items, requests.pageUrl);
    const preset = {
      preset: 'mobile',
      runs: [{ performance: 100, accessibility: 100, 'best-practices': 100, seo: 100 }],
      medians: { performance: 100, accessibility: 100, 'best-practices': 100, seo: 100 },
      metrics: { fcp: 900, lcp: 900, tbt: 0, cls: 0, si: 900 },
      lcpElement: 'p',
      budgets,
    };
    const base = { lighthouseVersion: '13.6.0', chromiumVersion: 'Chromium 153', url: 'http://localhost:3402/', date: '2026-11-12', commit: 'abc1234', misses: [] };
    const block = renderReport({ ...base, presets: [{ ...preset, reported: [{ 'agentic-browsing': 1 }] }] });
    expect(block).toContain('Agentic Browsing (reported, no target): median 1.00 (runs 1.00).');
    expect(block).toContain('every mobile target and budget met');
    expect(renderReport({ ...base, presets: [{ ...preset, reported: [{ 'agentic-browsing': null }] }] })).not.toContain('Agentic Browsing');
    expect(renderReport({ ...base, presets: [preset] })).not.toContain('Agentic Browsing');
  });

  it('MS-11.5 neither script spells or spawns a build command', () => {
    for (const file of ['scripts/lighthouse.mjs', 'scripts/lighthouse-lib.mjs']) {
      const src = readFileSync(resolve(__dirname, '../../..', file), 'utf8');
      expect(src, file).not.toMatch(/next\s+build|pnpm\s+(-F\s+\S+\s+)?build|['"]build['"]/);
    }
  });
});
