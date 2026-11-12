#!/usr/bin/env node
// Lighthouse on the landing page (marketing-site MS-11, design.md "Lighthouse measurement").
//   node scripts/lighthouse.mjs [--url http://localhost:3202/] [--runs 3] [--preset both] [--write]
// Needs a running production server (`next start`); it refuses a development server, and it never
// builds anything itself (MS-11.5, tech.md rule 1). How to get the server: docs/testing/performance.md.
//
// For each preset (mobile: Lighthouse's default, simulated Slow 4G and 4x CPU; desktop: its desktop
// config) and each run it launches a fresh Chromium from Playwright on a debugging port, so every run
// is a first visit. Reports go to packages/web/test-results/lighthouse/ (git-ignored). It prints the
// medians, the metrics of the run with the median Performance score and the byte budgets (page
// requests by type, the service worker on its own line); --write puts the same block into
// docs/testing/performance.md. Exit 0: targets met; 1: a mobile target or budget missed, or a run
// failed twice; 2: bad arguments, no server or a development server.
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CATEGORIES,
  CLS_BUDGET,
  USAGE,
  UsageError,
  checkTargets,
  isDevServerHtml,
  lcpElementTag,
  median,
  pageBudgets,
  parseArgs,
  renderReport,
  writeBlock,
} from './lighthouse-lib.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'packages/web/test-results/lighthouse');
const DOC = resolve(ROOT, 'docs/testing/performance.md');

let opts;
try {
  opts = parseArgs(process.argv.slice(2));
} catch (e) {
  if (!(e instanceof UsageError)) throw e;
  console.error(`${e.message}\n\n${USAGE}`);
  process.exit(2);
}

let html = '';
try {
  const res = await fetch(opts.url, { signal: AbortSignal.timeout(15000) });
  html = await res.text();
} catch {
  console.error(`No server at ${opts.url}. Build and start it first (see docs/testing/performance.md).`);
  process.exit(2);
}
if (isDevServerHtml(html)) {
  console.error('This is a development server; Lighthouse needs `next start`.');
  process.exit(2);
}

const { default: lighthouse } = await import('lighthouse');
const { default: desktopConfig } = await import('lighthouse/core/config/desktop-config.js');
const { loadPlaywright } = await import('../packages/web/test/e2e/lib.mjs');
const { chromium } = loadPlaywright();

function freePort() {
  return new Promise((ok, fail) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', fail);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = /** @type {import('node:net').AddressInfo} */ (srv.address());
      srv.close(() => ok(port));
    });
  });
}

let chromiumVersion = 'Chromium';
async function runOnce(preset) {
  const port = await freePort();
  const browser = await chromium.launch({ channel: 'chromium', args: [`--remote-debugging-port=${port}`] });
  try {
    chromiumVersion = `Chromium ${browser.version()}`;
    const result = await lighthouse(
      opts.url,
      { port, output: 'json', logLevel: 'error', onlyCategories: CATEGORIES },
      preset === 'desktop' ? desktopConfig : undefined,
    );
    if (!result?.lhr) throw new Error('Lighthouse returned no report');
    return result.lhr;
  } finally {
    await browser.close();
  }
}

const presets = opts.preset === 'both' ? ['mobile', 'desktop'] : [opts.preset];
mkdirSync(OUT_DIR, { recursive: true });
const measured = [];
const misses = [];
let lighthouseVersion = '';

for (const preset of presets) {
  const reports = [];
  for (let run = 1; run <= opts.runs; run++) {
    let lhr;
    try {
      lhr = await runOnce(preset);
    } catch (e) {
      console.error(`${preset} run ${run} failed (${e instanceof Error ? e.message : e}); trying once more`);
      try {
        lhr = await runOnce(preset);
      } catch (e2) {
        console.error(`${preset} run ${run} failed again: ${e2 instanceof Error ? e2.message : e2}`);
        process.exit(1);
      }
    }
    lighthouseVersion = lhr.lighthouseVersion;
    writeFileSync(resolve(OUT_DIR, `${preset}-${run}.json`), JSON.stringify(lhr));
    const scores = Object.fromEntries(CATEGORIES.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)]));
    console.log(`${preset} run ${run}: ${CATEGORIES.map((c) => `${c} ${scores[c]}`).join(', ')}`);
    reports.push({ lhr, scores });
  }
  const medians = Object.fromEntries(CATEGORIES.map((c) => [c, median(reports.map((r) => r.scores[c]))]));
  // The run with the median Performance score supplies the metrics and the requests.
  const sorted = [...reports].sort((a, b) => a.scores.performance - b.scores.performance);
  const mid = sorted[Math.floor((sorted.length - 1) / 2)];
  const audit = (id) => mid.lhr.audits[id]?.numericValue;
  const metrics = {
    fcp: audit('first-contentful-paint'),
    lcp: audit('largest-contentful-paint'),
    tbt: audit('total-blocking-time'),
    cls: audit('cumulative-layout-shift'),
    si: audit('speed-index'),
  };
  const lcpElement = lcpElementTag(mid.lhr);
  const budgets = pageBudgets(mid.lhr.audits['network-requests']?.details?.items ?? [], opts.url);
  if (preset === 'mobile') {
    misses.push(...checkTargets(medians).map((m) => `mobile ${m}`));
    for (const l of [...budgets.lines, budgets.total]) if (!l.ok) misses.push(`${l.type} bytes over budget`);
    if (budgets.otherOrigins.length) misses.push(`${budgets.otherOrigins.length} request(s) to another origin`);
    if (!(typeof metrics.cls === 'number' && metrics.cls <= CLS_BUDGET)) misses.push(`CLS ${metrics.cls} (budget ${CLS_BUDGET})`);
    if (lcpElement === null || lcpElement === 'img') misses.push(`LCP element ${lcpElement ?? 'unknown'} (should be text)`);
  }
  measured.push({ preset, runs: reports.map((r) => r.scores), medians, metrics, lcpElement, budgets });
}

let commit = 'unknown';
try {
  // "-dirty" marks numbers measured on uncommitted changes, so the record never claims a commit
  // that does not hold the measured code.
  commit = execSync('git describe --always --dirty', { cwd: ROOT }).toString().trim();
} catch {
  /* not a git checkout */
}
const block = renderReport({
  lighthouseVersion,
  chromiumVersion,
  url: opts.url,
  date: new Date().toISOString().slice(0, 10),
  commit,
  presets: measured,
  misses,
});
console.log(`\n${block}`);
if (opts.write) {
  writeFileSync(DOC, writeBlock(readFileSync(DOC, 'utf8'), block));
  console.log(`\nWritten to ${DOC}`);
}
process.exit(misses.length ? 1 : 0);
