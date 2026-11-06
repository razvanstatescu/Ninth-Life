/// <reference lib="webworker" />
/**
 * Service worker (Serwist). Precaches the app shell, fonts, icons and /data/** (the offline
 * dictionary) from the build manifest. Decode requests are network-only: model ranking never
 * comes from a cache, and offline the app stays in ghost mode.
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
