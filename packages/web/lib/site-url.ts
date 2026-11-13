/**
 * The site's public origin, for canonical links, og:url, the social card, the sitemap and JSON-LD
 * (marketing-site MS-3.6). There is no production URL yet, so it comes from the environment, read in
 * this order:
 *   1. SITE_URL: set it when a custom domain exists (server-only, never NEXT_PUBLIC_).
 *   2. VERCEL_PROJECT_PRODUCTION_URL: Vercel sets it on every deployment, previews included, to the
 *      production domain (no scheme), so previews point their canonical at production.
 *   3. Neither (a local or self-hosted build): null. Then the site emits no absolute URL at all: no
 *      canonical, no og:url, no og:image, no JSON-LD, no Sitemap line, and /sitemap.xml is a 404.
 *      A localhost canonical or sitemap would be worse than none.
 * The pages are static, so this is read at build time.
 */
export type SiteEnv = Readonly<Record<string, string | undefined>>;

function parseOrigin(raw: string | undefined, assumeHttps: boolean): URL | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(assumeHttps && !/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? `https://${value}` : value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!url.hostname) return null;
    return new URL(url.origin);
  } catch {
    return null;
  }
}

/** The origin (scheme, host and port, path "/") or null when none is configured or the value is invalid. */
export function siteOrigin(env: SiteEnv = process.env): URL | null {
  if (env.SITE_URL?.trim()) return parseOrigin(env.SITE_URL, false);
  return parseOrigin(env.VERCEL_PROJECT_PRODUCTION_URL, true);
}

/** `path` made absolute on the origin, or null when there is no origin. */
export function absoluteUrl(path: string, origin: URL | null = siteOrigin()): string | null {
  return origin ? new URL(path, origin).href : null;
}

/** The public pages, in the sitemap's order. */
export const SITE_PATHS = ['/', '/about', '/app'] as const;

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * /sitemap.xml for the origin, or null without one: a sitemap's <loc> must be absolute, and an empty or
 * localhost sitemap would be invalid or wrong, so app/sitemap.xml/route.ts answers 404 instead. No
 * lastmod, changefreq or priority: Google ignores the last two, and a build date would be false freshness.
 */
export function sitemapXml(origin: URL | null = siteOrigin()): string | null {
  if (!origin) return null;
  const urls = SITE_PATHS.map((p) => `  <url><loc>${escapeXml(new URL(p, origin).href)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
