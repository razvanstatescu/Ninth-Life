// @ts-check
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import withSerwistInit from '@serwist/next';

/** One revision per build for the precached HTML pages. */
function revision() {
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() + '-' + Date.now();
  } catch {
    return String(Date.now());
  }
}
const rev = revision();

const md5 = (/** @type {string} */ file) => createHash('md5').update(readFileSync(file)).digest('hex');

/**
 * Public files that are NOT precached (plan F9, docs/testing/performance.md "precache"):
 * - the 192 and 512 px PNG icons and the Apple touch icon: only an install prompt or a home-screen add
 *   reads them, online, and the runtime image cache keeps them after that;
 * - latin-ext font subsets: CSS loads them only for text that needs them (unicode-range);
 * - the data licence and notice (attribution pages, not needed to talk offline);
 * - en.v1.json: the eval's lexicon. The app ships the compact en.v2.json (ADR-data-003).
 */
const NOT_PRECACHED = [
  /^icons\/icon(-maskable)?-(192|512)\.png$/,
  /^icons\/apple-touch-icon\.png$/,
  /^fonts\/.*-latin-ext\.woff2$/,
  /^data\/(LICENSE|NOTICE\.md)$/,
  /^data\/lexicon\/en\.v1\.json$/,
];

/**
 * Every file in public/ that the app needs offline. Files under data/ are precached at their
 * content-hashed URL (`?v=`, the same URL lib/data.ts fetches) with `revision: null`, so the
 * service worker may take them from the HTTP cache the page just filled instead of downloading
 * them a second time. Everything else carries a content hash as its revision.
 * Serwist skips its own public scan when additionalPrecacheEntries is set, so we do it here.
 */
function publicEntries(dir = 'public') {
  /** @type {{ url: string; revision: string | null }[]} */
  const out = [];
  const walk = (/** @type {string} */ d) => {
    for (const name of readdirSync(d)) {
      const file = join(d, name);
      if (statSync(file).isDirectory()) walk(file);
      else {
        const rel = relative(dir, file).split(sep).join('/');
        if (rel === 'sw.js' || rel === 'sw.js.map' || /^swe-worker-.*\.js$/.test(rel) || rel.endsWith('.txt')) continue;
        if (NOT_PRECACHED.some((re) => re.test(rel))) continue;
        if (rel.startsWith('data/')) out.push({ url: `/${rel}?v=${dataRev[`/${rel}`]}`, revision: null });
        else out.push({ url: `/${rel}`, revision: md5(file) });
      }
    }
  };
  try {
    walk(dir);
  } catch {
    /* no public dir */
  }
  return out;
}

/** '/data/...' -> first 12 hex digits of its MD5, for every JSON file the app may fetch from /data. */
function dataRevisions(dir = 'public') {
  /** @type {Record<string, string>} */
  const out = {};
  const walk = (/** @type {string} */ d) => {
    for (const name of readdirSync(d)) {
      const file = join(d, name);
      if (statSync(file).isDirectory()) walk(file);
      else if (name.endsWith('.json')) out[`/${relative(dir, file).split(sep).join('/')}`] = md5(file).slice(0, 12);
    }
  };
  try {
    walk(join(dir, 'data'));
  } catch {
    /* no data copied */
  }
  return out;
}
const dataRev = dataRevisions();

/**
 * Build-output chunks the app never loads: the legacy pages-router runtime (framework, main,
 * pages/_app, pages/_error; the app router uses main-app) and the polyfills chunk, which only
 * browsers without ES modules fetch. About 130 KB the service worker would otherwise download.
 */
const UNUSED_CHUNK = /\/_next\/static\/chunks\/(polyfills-|framework-|main-(?!app)|pages\/)[^/]*\.js$/;

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  // The dev server rebuilds constantly; a service worker there only gets in the way.
  disable: process.env.NODE_ENV === 'development',
  cacheOnNavigation: true,
  reloadOnOnline: false, // never reload under someone mid-sentence
  additionalPrecacheEntries: [{ url: '/', revision: rev }, { url: '/about', revision: rev }, ...publicEntries()],
  manifestTransforms: [async (entries) => ({ manifest: entries.filter((e) => !UNUSED_CHUNK.test(e.url)), warnings: [] })],
  // The lexicon is about 0.5 MB; precache it whole so ghost mode works offline from the first visit.
  maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Content hashes of /data files for lib/data.ts (dataUrl), so page and precache use one URL.
  env: { NEXT_PUBLIC_DATA_REV: JSON.stringify(dataRev) },
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@ninth/core', '@ninth/decoder'],
  webpack(config) {
    // @ninth/decoder imports './x.js' for files that are './x.ts'.
    config.resolve.extensionAlias = { ...(config.resolve.extensionAlias ?? {}), '.js': ['.ts', '.tsx', '.js'] };
    return config;
  },
  async headers() {
    return [
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
      { source: '/data/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }] },
    ];
  },
};

export default withSerwist(nextConfig);
