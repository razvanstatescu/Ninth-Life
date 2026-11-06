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

/**
 * Every file in public/ (fonts, icons, manifest, and /data/** from copy-data.mjs) with a content
 * hash. Serwist skips its own public scan when additionalPrecacheEntries is set, so we do it here.
 */
function publicEntries(dir = 'public') {
  /** @type {{ url: string; revision: string }[]} */
  const out = [];
  const walk = (/** @type {string} */ d) => {
    for (const name of readdirSync(d)) {
      const file = join(d, name);
      if (statSync(file).isDirectory()) walk(file);
      else {
        const rel = relative(dir, file).split(sep).join('/');
        if (rel === 'sw.js' || rel === 'sw.js.map' || /^swe-worker-.*\.js$/.test(rel) || rel.endsWith('.txt')) continue;
        out.push({ url: `/${rel}`, revision: createHash('md5').update(readFileSync(file)).digest('hex') });
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

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  // The dev server rebuilds constantly; a service worker there only gets in the way.
  disable: process.env.NODE_ENV === 'development',
  cacheOnNavigation: true,
  reloadOnOnline: false, // never reload under someone mid-sentence
  additionalPrecacheEntries: [{ url: '/', revision: rev }, { url: '/about', revision: rev }, ...publicEntries()],
  // The lexicon is a few MB; precache it whole so ghost mode works offline from the first visit.
  maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
