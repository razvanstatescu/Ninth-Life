/**
 * Search and sharing metadata for /, /about and /app (marketing-site MS-3.5, MS-3.6; content.md "Page
 * metadata"). Server only; the pages are static, so this runs at build time.
 *
 * - SITE_DEFINITION is the one sentence pair that says what Ninth Life is. The layout description,
 *   public/manifest.webmanifest, the JSON-LD, /llms.txt and the README's first paragraph use it word
 *   for word (test/seo.test.ts checks every copy), so search and answer engines read one description.
 * - Absolute URLs (canonical, og:url, og:image) exist only when lib/site-url.ts knows the origin; with
 *   none, the pages emit no absolute URL at all (Next would otherwise fall back to localhost).
 * - They are written out in full here (round 3, R3-P9): the layout sets no metadataBase, because with one Next turns
 *   the canonical of "/" into the bare origin. Without it Next keeps an absolute URL as written, so "/" is
 *   `${origin}/`, the URL the sitemap and the JSON-LD use.
 * - Canonical is set per page, never in the layout: Next inherits `alternates` into child routes, so a
 *   layout canonical would point /about and /app at the home page.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Metadata } from 'next';
import { siteOrigin } from '@/lib/site-url';

export const SITE_NAME = 'Ninth Life';

export const SITE_DEFINITION =
  'Ninth Life brings back 9-key predictive text as a free web app for typing to talk. Press one key per letter on keys 2 to 9 and hear the sentence you meant: every spoken word matches the keys on screen, and nothing gets there without your press.';

/** Open Graph locale, in its `language_TERRITORY` form. */
export const OG_LOCALE = 'en_US';

/**
 * The social card: a static 1200x630 PNG made by scripts/gen-og.mjs (`pnpm -F @ninth/web og`) and
 * committed. It lives in public/ but is left out of the service-worker precache (next.config.mjs
 * NOT_PRECACHED), and no page loads it, so it costs visitors nothing.
 */
export const SOCIAL_CARD = {
  file: 'social-card.png',
  width: 1200,
  height: 630,
  alt: 'Ninth Life: a 9-key keypad and the sentence I need water',
} as const;

/** The card's path with a short content hash, so a new card gets a new URL in link-preview caches. */
export function socialCardPath(read: (file: string) => Buffer = (f) => readFileSync(join(process.cwd(), 'public', f))): string {
  try {
    return `/${SOCIAL_CARD.file}?v=${createHash('md5').update(read(SOCIAL_CARD.file)).digest('hex').slice(0, 12)}`;
  } catch {
    return `/${SOCIAL_CARD.file}`;
  }
}

export interface PageCopy {
  /** Path on the site, e.g. "/about". */
  path: string;
  title: string;
  description: string;
  /** Title and description for link previews; default the page's own. */
  shareTitle?: string;
  shareDescription?: string;
}

/**
 * One page's metadata. The Open Graph base (site name, type, locale) is repeated here because Next
 * replaces a parent's `openGraph` object wholesale.
 */
export function pageMetadata(page: PageCopy, origin: URL | null = siteOrigin()): Metadata {
  const shareTitle = page.shareTitle ?? page.title;
  const shareDescription = page.shareDescription ?? page.description;
  const abs = (path: string) => (origin ? new URL(path, origin).href : path);
  const image = origin ? { url: abs(socialCardPath()), width: SOCIAL_CARD.width, height: SOCIAL_CARD.height, type: 'image/png', alt: SOCIAL_CARD.alt } : null;
  return {
    title: page.title,
    description: page.description,
    ...(origin ? { alternates: { canonical: abs(page.path) } } : {}),
    openGraph: {
      title: shareTitle,
      description: shareDescription,
      type: 'website',
      siteName: SITE_NAME,
      locale: OG_LOCALE,
      ...(origin ? { url: abs(page.path) } : {}),
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: shareTitle,
      description: shareDescription,
      ...(image ? { images: [{ url: image.url, alt: image.alt }] } : {}),
    },
  };
}
