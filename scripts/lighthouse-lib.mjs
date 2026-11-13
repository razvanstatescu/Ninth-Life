// Pure helpers for scripts/lighthouse.mjs (marketing-site design.md "Lighthouse measurement", MS-11).
// No I/O here, so packages/web/test/lighthouse-lib.test.ts can test every rule. This file never runs
// or names a production build step (MS-11.5): docs/testing/performance.md holds those steps.

export const DEFAULT_URL = 'http://localhost:3202/';
export const DEFAULT_RUNS = 3;
export const PRESETS = ['mobile', 'desktop'];
export const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
export const CATEGORY_NAMES = { performance: 'Performance', accessibility: 'Accessibility', 'best-practices': 'Best Practices', seo: 'SEO' };

/**
 * Categories reported with no target (Round 3, 2026-11-12). Lighthouse 13.3+ "Agentic Browsing" scores a
 * fraction (0 to 1): the accessibility tree, layout shift and /llms.txt when it exists. A run that lacks a
 * category reports "n/a".
 */
export const REPORTED_CATEGORIES = ['agentic-browsing'];
export const REPORTED_NAMES = { 'agentic-browsing': 'Agentic Browsing' };

/**
 * The reported categories' scores of one run, as fractions, or null for a category the run lacks.
 * @param {{ categories?: Record<string, { score?: number | null } | undefined> }} lhr
 * @returns {Record<string, number | null>}
 */
export function reportedScores(lhr) {
  return Object.fromEntries(REPORTED_CATEGORIES.map((c) => [c, typeof lhr.categories?.[c]?.score === 'number' ? /** @type {number} */ (lhr.categories[c].score) : null]));
}

/** MS-11.1 (mobile): Performance 95 or more, every other category 100. */
export const TARGETS = { performance: 95, accessibility: 100, 'best-practices': 100, seo: 100 };

const KB = 1024;
/** MS-11.2: transferred bytes of the page's own requests, by Lighthouse resourceType, and in total. */
export const BUDGETS = { Script: 125 * KB, Stylesheet: 16 * KB, Document: 32 * KB, Font: 60 * KB, Image: 16 * KB };
export const TOTAL_BUDGET = 250 * KB;
export const CLS_BUDGET = 0.02;

export const USAGE = `Usage: node scripts/lighthouse.mjs [--url <http(s) url>] [--runs <1-9>] [--preset mobile|desktop|both] [--write]
  --url     a running production server (default ${DEFAULT_URL}); a development server is refused
  --runs    runs per preset (default ${DEFAULT_RUNS}); the medians are reported
  --preset  default both; the targets apply to mobile only
  --write   also write the report into docs/testing/performance.md
How to start the server: docs/testing/performance.md, "Landing page (Lighthouse)".`;

export class UsageError extends Error {}

/**
 * Parse the command line (without node and the script path).
 * @param {string[]} argv
 * @returns {{ url: string, runs: number, preset: 'mobile' | 'desktop' | 'both', write: boolean }}
 */
export function parseArgs(argv) {
  /** @type {{ url: string, runs: number, preset: 'mobile' | 'desktop' | 'both', write: boolean }} */
  const opts = { url: DEFAULT_URL, runs: DEFAULT_RUNS, preset: 'both', write: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) throw new UsageError(`${arg} needs a value`);
      i += 1;
      return v;
    };
    if (arg === '--write') opts.write = true;
    else if (arg === '--url') {
      const v = value();
      let u;
      try {
        u = new URL(v);
      } catch {
        throw new UsageError(`--url ${v} is not a URL`);
      }
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new UsageError(`--url must be http: or https: (${v})`);
      opts.url = u.href;
    } else if (arg === '--runs') {
      const v = value();
      const n = Number(v);
      if (!/^\d+$/.test(v) || n < 1 || n > 9) throw new UsageError(`--runs must be a whole number from 1 to 9 (${v})`);
      opts.runs = n;
    } else if (arg === '--preset') {
      const v = value();
      if (v !== 'mobile' && v !== 'desktop' && v !== 'both') throw new UsageError(`--preset must be mobile, desktop or both (${v})`);
      opts.preset = v;
    } else throw new UsageError(`unknown argument ${arg}`);
  }
  return opts;
}

/**
 * True for the HTML of a Next development server: its chunks have unhashed names
 * (`/_next/static/chunks/webpack.js?v=…`, `main-app.js`); production names carry a hash.
 * @param {string} html
 */
export function isDevServerHtml(html) {
  return /\/_next\/static\/chunks\/(webpack|main-app)\.js(\?|")/.test(html);
}

/** @param {number[]} numbers */
export function median(numbers) {
  if (numbers.length === 0) return NaN;
  const s = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * @typedef {{ url: string, transferSize?: number, resourceType?: string, sessionTargetType?: string }} NetworkItem
 * @typedef {{ type: string, bytes: number, budget: number | null, ok: boolean }} BudgetLine
 * @typedef {{ lines: BudgetLine[], total: BudgetLine, worker: { count: number, bytes: number }, otherOrigins: string[], noTarget: number, ok: boolean }} Budgets
 */

/**
 * MS-11.2 budgets from the `network-requests` audit items. Items from the page (sessionTargetType
 * "page", or no sessionTargetType: the stricter reading) are summed by resourceType and in total;
 * items from any other target (the service worker) go on their own line with no budget. Every item
 * whose URL is not `data:` or `blob:` must have the page's origin.
 * @param {NetworkItem[]} items
 * @param {string} pageUrl
 * @returns {Budgets}
 */
export function pageBudgets(items, pageUrl) {
  const origin = new URL(pageUrl).origin;
  /** @type {Record<string, number>} */
  const byType = {};
  let total = 0;
  let noTarget = 0;
  const worker = { count: 0, bytes: 0 };
  /** @type {string[]} */
  const otherOrigins = [];
  for (const item of items) {
    const bytes = Number(item.transferSize) || 0;
    const url = String(item.url ?? '');
    if (!url.startsWith('data:') && !url.startsWith('blob:')) {
      let o = '';
      try {
        o = new URL(url).origin;
      } catch {
        /* not a URL: counted as another origin below */
      }
      if (o !== origin) otherOrigins.push(url);
    }
    if (item.sessionTargetType === undefined) noTarget += 1;
    if (item.sessionTargetType === undefined || item.sessionTargetType === 'page') {
      const type = item.resourceType ?? 'Other';
      byType[type] = (byType[type] ?? 0) + bytes;
      total += bytes;
    } else {
      worker.count += 1;
      worker.bytes += bytes;
    }
  }
  /** @type {BudgetLine[]} */
  const lines = Object.entries(BUDGETS).map(([type, budget]) => {
    const b = byType[type] ?? 0;
    return { type, bytes: b, budget, ok: b <= budget };
  });
  for (const [type, b] of Object.entries(byType)) {
    if (!(type in BUDGETS)) lines.push({ type, bytes: b, budget: null, ok: true });
  }
  const totalLine = { type: 'Total', bytes: total, budget: TOTAL_BUDGET, ok: total <= TOTAL_BUDGET };
  return {
    lines,
    total: totalLine,
    worker,
    otherOrigins,
    noTarget,
    ok: lines.every((l) => l.ok) && totalLine.ok && otherOrigins.length === 0,
  };
}

/**
 * MS-11.1: the categories that miss their mobile target. Scores are 0-100.
 * @param {Record<string, number>} medians
 * @returns {string[]}
 */
export function checkTargets(medians) {
  /** @type {string[]} */
  const misses = [];
  for (const [cat, target] of Object.entries(TARGETS)) {
    const score = medians[cat];
    if (typeof score !== 'number' || Number.isNaN(score) || score < target) {
      misses.push(`${CATEGORY_NAMES[/** @type {keyof typeof CATEGORY_NAMES} */ (cat)]} ${score ?? 'missing'} (target ${target})`);
    }
  }
  return misses;
}

/**
 * The tag name of the LCP element. Lighthouse 13 reports it in the `lcp-breakdown-insight` audit;
 * older versions had a `largest-contentful-paint-element` audit, still read as a fallback.
 */
export function lcpElementTag(lhr) {
  const walk = (d) => {
    if (!d || typeof d !== 'object') return null;
    if (d.type === 'node' && typeof d.snippet === 'string') return d.snippet;
    for (const v of Array.isArray(d) ? d : Object.values(d)) {
      const s = walk(v);
      if (s) return s;
    }
    return null;
  };
  const audits = lhr?.audits ?? {};
  const snippet =
    walk(audits['lcp-breakdown-insight']?.details) ?? walk(audits['largest-contentful-paint-element']?.details);
  const m = snippet ? /^<([a-zA-Z0-9-]+)/.exec(snippet) : null;
  return m ? m[1].toLowerCase() : null;
}

const kb = (bytes) => `${(bytes / KB).toFixed(1)} KB`;
const ms = (v) => (typeof v === 'number' ? `${Math.round(v).toLocaleString('en-US')} ms` : 'n/a');

/**
 * The Markdown block for docs/testing/performance.md.
 * @param {{
 *   lighthouseVersion: string, chromiumVersion: string, url: string, date: string, commit: string,
 *   presets: { preset: string, runs: Record<string, number>[], medians: Record<string, number>,
 *     reported?: Record<string, number | null>[],
 *     metrics: { fcp?: number, lcp?: number, tbt?: number, cls?: number, si?: number }, lcpElement: string | null,
 *     budgets: Budgets }[],
 *   misses: string[],
 * }} result
 */
export function renderReport(result) {
  const out = [];
  out.push(
    `Measured ${result.date} on ${result.url}, commit \`${result.commit}\`, Lighthouse ${result.lighthouseVersion}, ${result.chromiumVersion}. ` +
      `Median of ${result.presets[0]?.runs.length ?? 0} runs per preset, a fresh browser profile for each run.`,
  );
  for (const p of result.presets) {
    const mobile = p.preset === 'mobile';
    out.push('');
    out.push(mobile ? '### Mobile (simulated throttling: Slow 4G, 4x CPU)' : '### Desktop (no target)');
    out.push('');
    out.push(`| | ${CATEGORIES.map((c) => CATEGORY_NAMES[/** @type {keyof typeof CATEGORY_NAMES} */ (c)]).join(' | ')} |`);
    out.push(`|---|${CATEGORIES.map(() => '---').join('|')}|`);
    p.runs.forEach((r, i) => out.push(`| Run ${i + 1} | ${CATEGORIES.map((c) => r[c] ?? 'n/a').join(' | ')} |`));
    out.push(`| **Median** | ${CATEGORIES.map((c) => `**${p.medians[c] ?? 'n/a'}**`).join(' | ')} |`);
    if (mobile) out.push(`| Target | ${CATEGORIES.map((c) => (c === 'performance' ? '95 or more' : '100')).join(' | ')} |`);
    for (const c of REPORTED_CATEGORIES) {
      const runs = (p.reported ?? []).map((r) => r[c]).filter((v) => typeof v === 'number');
      if (!runs.length) continue;
      const name = REPORTED_NAMES[/** @type {keyof typeof REPORTED_NAMES} */ (c)];
      out.push('');
      out.push(`${name} (reported, no target): median ${median(runs).toFixed(2)} (runs ${runs.map((v) => v.toFixed(2)).join(', ')}).`);
    }
    out.push('');
    const m = p.metrics;
    out.push(
      `Run with the median Performance score: FCP ${ms(m.fcp)}, LCP ${ms(m.lcp)} (element: \`${p.lcpElement ?? 'unknown'}\`), ` +
        `TBT ${ms(m.tbt)}, CLS ${typeof m.cls === 'number' ? m.cls.toFixed(3) : 'n/a'}, Speed Index ${ms(m.si)}.`,
    );
    out.push('');
    out.push('| Page requests, transferred | Bytes | Budget | Result |');
    out.push('|---|---|---|---|');
    for (const l of [...p.budgets.lines, p.budgets.total]) {
      const budget = l.budget === null ? 'none' : kb(l.budget);
      const res = !mobile || l.budget === null ? '' : l.ok ? 'pass' : '**fail**';
      out.push(`| ${l.type} | ${kb(l.bytes)} | ${mobile ? budget : 'none'} | ${res} |`);
    }
    out.push('');
    out.push(`Service worker: ${p.budgets.worker.count} requests, ${kb(p.budgets.worker.bytes)} (reported, no budget).`);
    out.push(`Other origins: ${p.budgets.otherOrigins.length ? p.budgets.otherOrigins.join(', ') : 'none'}.`);
    if (p.budgets.noTarget > 0) out.push(`Items with no sessionTargetType, counted as page requests: ${p.budgets.noTarget}.`);
  }
  out.push('');
  out.push(result.misses.length ? `Result: missed ${result.misses.join('; ')}.` : 'Result: every mobile target and budget met.');
  return out.join('\n');
}

/**
 * Replace the block between the markers, or add the section with the markers at the end.
 * @param {string} doc
 * @param {string} block
 */
export function writeBlock(doc, block) {
  const start = '<!-- lighthouse:start -->';
  const end = '<!-- lighthouse:end -->';
  const a = doc.indexOf(start);
  const b = doc.indexOf(end);
  if (a !== -1 && b > a) return `${doc.slice(0, a + start.length)}\n${block}\n${doc.slice(b)}`;
  return `${doc.replace(/\s*$/, '')}\n\n## Landing page (Lighthouse)\n\n${start}\n${block}\n${end}\n`;
}
