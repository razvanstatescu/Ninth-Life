#!/usr/bin/env node
// Device performance check for the communication screen, with Playwright + Chrome DevTools Protocol.
//
//   pnpm -F @ninth/web build && pnpm -F @ninth/web start -p 3202     (in another shell)
//   node scripts/perf-check.mjs                     # 3 runs, medians, Moto G-class + desktop
//   node scripts/perf-check.mjs --runs 5 --json out.json
//   BASE_URL=http://localhost:3202 node scripts/perf-check.mjs
//
// Profiles (docs/testing/performance.md):
//   mobile   412x915 @2.625x, touch, 4x CPU throttling (CDP Emulation.setCPUThrottlingRate) and
//            Slow 4G for the cold first load (562.5 ms RTT, 1.44 Mbit/s down, 675 kbit/s up: the
//            Lighthouse mobile preset), with the service worker blocked so every byte is seen by
//            the page. A second context installs the service worker, goes offline and reloads.
//   desktop  1280x900, no throttling, no network shaping.
//
// What it measures, per run:
//   firstLoadKB      bytes over the wire for the first visit (encodedDataLength, so compressed as
//                    served; `next start` sends gzip, Vercel sends brotli), split by type
//   precache         upper bound: every entry in sw.js as sent, as if none came from the HTTP cache
//   swInstallKB      what the service worker really downloads on install after a first visit
//                    (its own requests, through Playwright's service-worker network events), and
//                    which /data files it fetched from the network again (dataRefetched)
//   dictReadyMs      navigation start -> "Offline dictionary ready" on screen
//   keyMs            each key press of "kitchen" (5 4 8 2 4 3 6) -> speak bar updated and painted;
//                    5th press (54824, no whole word) is the first completion, so it builds the trie
//   then, in the same page, with @ninth/core loaded from source (TypeScript transpiled on the fly,
//   served to the page through page.route, so nothing is added to the app bundle):
//   jsonParseMs      JSON.parse of the lexicon text the app ships (en.v2.json, else en.v1.json)
//   lexiconMs        Lexicon.fromJSON (check + encode + file every word)
//   v1ParseMs        JSON.parse + Lexicon.fromJSON of en.v1.json with the same core, for comparison
//   bigramMs         bigramModel(...)
//   trieMs           first lexicon.completions() call with no warm-up (builds the completion index;
//                    the app builds it in idle time instead)
//   decodeFirstMs    first decodeGhost() of a 7-word sentence
//   decodeMs         median of 10 more decodes of the same sentence
//   heapAppMB        JS heap after the app is ready (after a forced GC)
//   heapDictMB       extra heap for one lexicon + bigrams + trie (our copy, after GC)
//   offlineReadyMs   offline reload -> dictionary ready (mobile only), offlineBytes on the wire
//
// No core code is changed by this script. Findings and proposals go in docs/testing/performance.md.
import { execSync } from 'node:child_process';
// Report the service worker's own requests too (Chromium), so the precache cost is measured, not guessed.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS ??= '1';
import http from 'node:http';
import https from 'node:https';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const RUNS = Number(opt('runs', process.env.PERF_RUNS ?? 3));
const JSON_OUT = opt('json', null);
const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3202').replace(/\/$/, '');
const CORE_DIR = resolve(process.env.CORE_DIR ?? join(root, 'packages/core/src'));
const SENTENCE = 'i need to go to the shop'; // 7 words
const KEYS = [...'5482436']; // "kitchen": 54824 has no whole word, so it needs the trie

const TARGETS = { firstLoadKB: 700, desktopParseMs: 100 };
const SLOW_4G = { offline: false, latency: 562.5, downloadThroughput: (1.6 * 1024 * 1024 * 0.9) / 8, uploadThroughput: (750 * 1024 * 0.9) / 8 };
const MOTO_G = {
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2.625,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Moto G Power) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
};

const require = createRequire(import.meta.url);
function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    const g = execSync('npm root -g').toString().trim();
    return createRequire(resolve(g, 'noop.js'))('playwright');
  }
}

/** @ninth/core as browser ES modules: transpile each .ts file and add .js to relative imports. */
function coreModules() {
  const ts = createRequire(join(root, 'package.json'))('typescript');
  const out = new Map();
  for (const f of readdirSync(CORE_DIR).filter((n) => n.endsWith('.ts') && !n.endsWith('.d.ts'))) {
    const src = readFileSync(join(CORE_DIR, f), 'utf8');
    let js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    js = js.replace(/(from\s+['"])(\.\/[^'"]+?)(['"])/g, (_, a, p, b) => `${a}${p.endsWith('.js') ? p : p + '.js'}${b}`);
    out.set(f.replace(/\.ts$/, '.js'), js);
  }
  return out;
}
const CORE = coreModules();

const median = (xs) => {
  const v = xs.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};
const kind = (url, type) => {
  if (/\/data\//.test(url)) return 'data';
  if (type === 'Document') return 'document';
  if (type === 'Script' || /\.js(\?|$)/.test(url)) return 'js';
  if (type === 'Stylesheet') return 'css';
  if (type === 'Font') return 'font';
  return 'other';
};

/** Count bytes on the wire per resource type through CDP Network events. */
async function byteCounter(cdp) {
  const types = new Map();
  const totals = { document: 0, js: 0, css: 0, font: 0, data: 0, other: 0 };
  const sw = { count: 0 };
  await cdp.send('Network.enable');
  cdp.on('Network.responseReceived', (e) => {
    types.set(e.requestId, kind(e.response.url, e.type));
    if (e.response.fromServiceWorker) sw.count += 1;
  });
  cdp.on('Network.loadingFinished', (e) => {
    const k = types.get(e.requestId) ?? 'other';
    totals[k] += e.encodedDataLength;
  });
  return { totals, sw, sum: () => Object.values(totals).reduce((a, b) => a + b, 0) };
}

async function gcHeapMB(cdp) {
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.collectGarbage');
  await cdp.send('HeapProfiler.collectGarbage');
  const { usedSize } = await cdp.send('Runtime.getHeapUsage');
  return usedSize / (1024 * 1024);
}

async function waitDictReady(page, timeout = 60000) {
  // textContent: the compact header keeps this text for screen readers only.
  return page.waitForFunction(() => /offline dictionary ready/i.test(document.body?.textContent ?? ''), null, { timeout, polling: 20 });
}

/** Load core into the page and time the dictionary pipeline there. */
async function coreTimings(page, cdp) {
  const heapBefore = await gcHeapMB(cdp);
  const r = await page.evaluate(async (sentence) => {
    const core = await import('/__perf/core/index.js');
    const t = () => performance.now();
    const text = (u) => fetch(u).then((res) => (res.ok ? res.text() : null));
    const [v2Text, v1Text, bigText] = await Promise.all(['/data/lexicon/en.v2.json', '/data/lexicon/en.v1.json', '/data/lexicon/en.bigram.v1.json'].map(text));
    const lexText = v2Text ?? v1Text;
    let a = t();
    const file = JSON.parse(lexText);
    const jsonParseMs = t() - a;
    a = t();
    const lexicon = core.Lexicon.fromJSON(file);
    const lexiconMs = t() - a;
    let v1ParseMs = null;
    if (v2Text && v1Text) {
      a = t();
      core.Lexicon.fromJSON(JSON.parse(v1Text));
      v1ParseMs = t() - a;
    }
    a = t();
    const big = JSON.parse(bigText);
    const lm = core.bigramModel(big, lexicon);
    const bigramMs = t() - a;
    a = t();
    lexicon.completions('4', 1);
    const trieMs = t() - a;
    const codes = core.encodeSentence(sentence);
    a = t();
    const first = core.decodeGhost(codes, { lexicon, lm, k: 5 });
    const decodeFirstMs = t() - a;
    const runs = [];
    for (let i = 0; i < 10; i++) {
      a = t();
      core.decodeGhost(codes, { lexicon, lm, k: 5 });
      runs.push(t() - a);
    }
    runs.sort((x, y) => x - y);
    // Keep our copy alive for the heap measurement.
    window.__perfKeep = { lexicon, lm };
    return {
      lexiconFile: file.v === 2 ? 'en.v2.json' : 'en.v1.json',
      jsonParseMs,
      lexiconMs,
      v1ParseMs,
      bigramMs,
      trieMs,
      decodeFirstMs,
      decodeMs: (runs[4] + runs[5]) / 2,
      words: lexicon.size,
      codes: codes.join(' '),
      top: first[0]?.words.join(' ') ?? null,
    };
  }, SENTENCE);
  const heapAfter = await gcHeapMB(cdp);
  await page.evaluate(() => {
    delete window.__perfKeep;
  });
  return { ...r, heapAppMB: heapBefore, heapDictMB: heapAfter - heapBefore };
}

async function serveCore(context) {
  await context.route('**/__perf/core/*.js', (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    const body = CORE.get(name);
    return body ? route.fulfill({ status: 200, contentType: 'text/javascript', body }) : route.fulfill({ status: 404, body: '' });
  });
}

/** Click keys one by one and time each press until the speak bar's digits show it. */
async function keyLatencies(page, keys) {
  return page.evaluate(
    (ks) =>
      ks.reduce(
        (p, k) =>
          p.then(
            (acc) =>
              new Promise((done) => {
                const before = document.querySelector('.nl-speakbar__digits')?.textContent ?? '';
                const t0 = performance.now();
                const obs = new MutationObserver(() => {
                  if ((document.querySelector('.nl-speakbar__digits')?.textContent ?? '') !== before) {
                    obs.disconnect();
                    // One more frame, so the time includes layout and paint of the new sentence.
                    requestAnimationFrame(() => done([...acc, performance.now() - t0]));
                  }
                });
                obs.observe(document.body, { subtree: true, childList: true, characterData: true });
                document.querySelector(`button[data-key="${k}"]`).click();
                setTimeout(() => {
                  obs.disconnect();
                  done([...acc, null]);
                }, 5000);
              }),
          ),
        Promise.resolve([]),
      ),
    keys,
  );
}

/** Cold first visit on a Moto G-class phone: Slow 4G, 4x CPU, empty cache, no service worker yet. */
async function runMobile(browser) {
  const context = await browser.newContext({ ...MOTO_G, serviceWorkers: 'block' });
  await serveCore(context);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const bytes = await byteCounter(cdp);
  await cdp.send('Network.emulateNetworkConditions', SLOW_4G);

  await page.goto(BASE_URL + '/', { waitUntil: 'commit' });
  await waitDictReady(page);
  const dictReadyMs = await page.evaluate(() => performance.now());
  await page.waitForLoadState('networkidle').catch(() => undefined);
  const first = { ...bytes.totals };
  const firstLoadKB = bytes.sum() / 1024;

  // Type "kitchen" (5 4 8 2 4 3 6). 54824 is the first code with no whole word, so that press
  // asks for a completion and builds the digit trie inside the key press.
  const keys = await keyLatencies(page, KEYS);
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  const core = await coreTimings(page, cdp);
  await context.close();
  return {
    firstLoadKB,
    firstLoadBreakdownKB: Object.fromEntries(Object.entries(first).map(([k, v]) => [k, v / 1024])),
    dictReadyMs,
    keyMs: keys,
    keyMaxMs: Math.max(...keys.filter((x) => x !== null)),
    ...core,
  };
}

/** Second visit offline: install the service worker online, then reload with no network at 4x CPU. */
async function runOffline(browser) {
  const context = await browser.newContext({ ...MOTO_G, serviceWorkers: 'allow' });
  // The service worker's own requests: a positive body size came over the network, a negative one
  // (Chromium's convention) from the HTTP cache.
  const swReqs = [];
  context.on('requestfinished', (r) => {
    if (!r.serviceWorker()) return;
    swReqs.push(
      r.sizes().then(
        (z) => ({ url: new URL(r.url()).pathname, net: z.responseBodySize > 0 ? z.responseBodySize + z.responseHeadersSize : 0 }),
        () => ({ url: '', net: 0 }),
      ),
    );
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const bytes = await byteCounter(cdp);
  await page.goto(BASE_URL + '/', { waitUntil: 'load' });
  await waitDictReady(page);
  const swReady = await page
    .evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      await navigator.serviceWorker.ready;
      for (let i = 0; i < 300; i++) {
        for (const n of await caches.keys()) {
          const c = await caches.open(n);
          for (const lex of ['/data/lexicon/en.v2.json', '/data/lexicon/en.v1.json'])
            if (await c.match(lex, { ignoreSearch: true })) {
              // Installed once the service worker is active (the precache is complete by then).
              const reg = await navigator.serviceWorker.getRegistration();
              if (reg?.active) return true;
            }
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      return false;
    })
    .catch(() => false);
  const sw = await Promise.all(swReqs.splice(0));
  const swInstallKB = sw.reduce((n, r) => n + r.net, 0) / 1024;
  const dataRefetched = [...new Set(sw.filter((r) => r.net > 0 && r.url.startsWith('/data/')).map((r) => r.url))];
  let offlineReadyMs = null;
  let offlineKB = null;
  if (swReady) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await context.setOffline(true);
    const before = bytes.sum();
    await page.reload({ waitUntil: 'commit' });
    await waitDictReady(page);
    offlineReadyMs = await page.evaluate(() => performance.now());
    offlineKB = (bytes.sum() - before) / 1024;
  }
  await context.close();
  return { swReady, offlineReadyMs, offlineKB, swInstallKB, dataRefetched };
}

/** Raw bytes on the wire for one GET with gzip allowed (node's fetch would decode the body). */
function wireBytes(url) {
  const lib = url.startsWith('https:') ? https : http;
  return new Promise((resolveBytes) => {
    lib
      .get(url, { headers: { 'accept-encoding': 'gzip' } }, (res) => {
        let n = 0;
        res.on('data', (c) => (n += c.length));
        res.on('end', () => resolveBytes(n));
      })
      .on('error', () => resolveBytes(0));
  });
}

/** What the service worker downloads on install: every precache entry in sw.js, as sent. */
async function precacheKB() {
  try {
    const sw = await (await fetch(`${BASE_URL}/sw.js`)).text();
    const urls = [...new Set([...sw.matchAll(/['"]?url['"]?\s*:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]))];
    let total = 0;
    for (const u of urls) total += await wireBytes(new URL(u, BASE_URL).href);
    return { entries: urls.length, kb: total / 1024 };
  } catch {
    return null;
  }
}

async function runDesktop(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  await serveCore(context);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const bytes = await byteCounter(cdp);
  await page.goto(BASE_URL + '/', { waitUntil: 'commit' });
  await waitDictReady(page);
  const dictReadyMs = await page.evaluate(() => performance.now());
  await page.waitForLoadState('networkidle').catch(() => undefined);
  const firstLoadKB = bytes.sum() / 1024;
  const core = await coreTimings(page, cdp);
  await context.close();
  return { firstLoadKB, dictReadyMs, ...core };
}

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const results = { mobile: [], desktop: [], precache: await precacheKB() };
console.log(`perf-check on ${BASE_URL}, ${RUNS} run(s), core from ${CORE_DIR}`);
try {
  for (let i = 0; i < RUNS; i++) {
    const m = { ...(await runMobile(browser)), ...(await runOffline(browser)) };
    const d = await runDesktop(browser);
    results.mobile.push(m);
    results.desktop.push(d);
    console.log(
      `run ${i + 1}: mobile load ${m.firstLoadKB.toFixed(0)} KB, dict ${m.dictReadyMs.toFixed(0)} ms, keys ${m.keyMs.map((x) => x?.toFixed(0)).join('/')} ms, parse ${(m.jsonParseMs + m.lexiconMs).toFixed(0)} ms, trie ${m.trieMs.toFixed(0)} ms, offline ${m.offlineReadyMs?.toFixed(0) ?? 'n/a'} ms | desktop load ${d.firstLoadKB.toFixed(0)} KB, parse ${(d.jsonParseMs + d.lexiconMs).toFixed(0)} ms`,
    );
  }
} finally {
  await browser.close();
}

const ROWS = [
  ['First load, compressed (KB)', 'firstLoadKB', 0],
  ['  of which JS (KB)', (r) => r.firstLoadBreakdownKB?.js, 0],
  ['  of which dictionary data (KB)', (r) => r.firstLoadBreakdownKB?.data, 0],
  ['  of which fonts (KB)', (r) => r.firstLoadBreakdownKB?.font, 0],
  ['  of which document + CSS + other (KB)', (r) => r.firstLoadBreakdownKB && r.firstLoadBreakdownKB.document + r.firstLoadBreakdownKB.css + r.firstLoadBreakdownKB.other, 0],
  ['Navigation to dictionary ready (ms)', 'dictReadyMs', 0],
  ['Slowest key press, typing "kitchen" (ms)', 'keyMaxMs', 0],
  ['JSON.parse lexicon (ms)', 'jsonParseMs', 1],
  ['Lexicon.fromJSON (ms)', 'lexiconMs', 1],
  ['Lexicon parse total (ms)', (r) => r.jsonParseMs + r.lexiconMs, 1],
  ['  same core on en.v1.json, parse total (ms)', 'v1ParseMs', 1],
  ['bigramModel (ms)', 'bigramMs', 1],
  ['First completions() with no warm-up (ms)', 'trieMs', 1],
  ['decodeGhost 7 words, first call (ms)', 'decodeFirstMs', 2],
  ['decodeGhost 7 words, median of 10 (ms)', 'decodeMs', 2],
  ['JS heap, app ready (MB)', 'heapAppMB', 1],
  ['JS heap for lexicon + bigrams + trie (MB)', 'heapDictMB', 1],
  ['Offline reload to dictionary ready (ms)', 'offlineReadyMs', 0],
  ['Offline reload bytes from network (KB)', 'offlineKB', 1],
  ['Service worker install, really downloaded (KB)', 'swInstallKB', 0],
];
const get = (r, k) => (typeof k === 'function' ? k(r) : r[k]);
const fmt = (v, d) => (v === null || v === undefined ? 'n/a' : v.toFixed(d));
const lines = ['| Metric | Moto G-class (4x CPU, Slow 4G) | Desktop (no throttling) |', '|---|---|---|'];
for (const [label, k, d] of ROWS) {
  const m = median(results.mobile.map((r) => get(r, k)));
  const dk = median(results.desktop.map((r) => get(r, k)));
  lines.push(`| ${label} | ${fmt(m, d)} | ${fmt(dk, d)} |`);
}
console.log(`\nLexicon file timed: ${results.mobile[0]?.lexiconFile}. Medians of ${RUNS} run(s). Sentence: "${SENTENCE}" -> ${results.mobile[0]?.codes}, top: "${results.mobile[0]?.top}"`);
console.log(lines.join('\n'));
if (results.precache) console.log(`\nService worker precache: ${results.precache.entries} entries, at most ${results.precache.kb.toFixed(0)} KB if none came from the HTTP cache.`);
const refetched = [...new Set(results.mobile.flatMap((r) => r.dataRefetched ?? []))];
console.log(`Dictionary files the service worker downloaded a second time: ${refetched.length ? refetched.join(', ') : 'none'}.`);
console.log(`Key presses typing "kitchen" 5 4 8 2 4 3 6 (median per press, ms): ${KEYS.map((_, i) => i).map((i) => fmt(median(results.mobile.map((r) => r.keyMs?.[i])), 0)).join(', ')}`);
const load = median(results.mobile.map((r) => r.firstLoadKB));
const parse = median(results.desktop.map((r) => r.jsonParseMs + r.lexiconMs));
const verdict = [
  `first load ${load?.toFixed(0)} KB vs target < ${TARGETS.firstLoadKB} KB: ${load !== null && load < TARGETS.firstLoadKB ? 'within' : 'OVER'}`,
  `desktop parse ${parse?.toFixed(1)} ms vs target < ${TARGETS.desktopParseMs} ms: ${parse !== null && parse < TARGETS.desktopParseMs ? 'within' : 'OVER'}`,
  `offline reload worked in ${results.mobile.filter((r) => r.offlineReadyMs !== null).length}/${RUNS} run(s)`,
];
console.log('\n' + verdict.join('\n'));
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ baseUrl: BASE_URL, runs: RUNS, sentence: SENTENCE, targets: TARGETS, results }, null, 2));
// Report only: the targets are budgets to discuss, not a CI gate (set PERF_STRICT=1 to gate).
if (process.env.PERF_STRICT && !(load < TARGETS.firstLoadKB && parse < TARGETS.desktopParseMs)) process.exit(1);
