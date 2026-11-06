/// <reference lib="webworker" />
/**
 * Service worker (Serwist). Precaches the app shell, the latin fonts, the small icons and the
 * offline dictionary from the build manifest (next.config.mjs decides what is in it).
 *
 * The dictionary files are listed at their content-hashed URL (`/data/...json?v=<hash>`, the URL
 * lib/data.ts fetches) with no revision, so Serwist fetches them with the normal HTTP cache and
 * reuses the copy the page has just downloaded: no second download on the first visit (plan F9).
 * Large icons, latin-ext fonts and unused build chunks are left to the runtime caches.
 *
 * Decode requests are network-only: model ranking never comes from a cache, and offline the app
 * stays in ghost mode.
 */
import { defaultCache } from '@serwist/next/worker';
import { NetworkOnly, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const isDecode = ({ url }: { url: URL }) => url.pathname === '/api/decode' || url.pathname.endsWith('/v1/decode');

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    { matcher: isDecode, handler: new NetworkOnly(), method: 'POST' },
    { matcher: isDecode, handler: new NetworkOnly() },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: '/', matcher: ({ request }) => request.destination === 'document' }],
  },
});

serwist.addEventListeners();
