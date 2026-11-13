import { sitemapXml } from '@/lib/site-url';

/**
 * /sitemap.xml: /, /about and /app on the site's origin (marketing-site MS-3.6). With no known origin
 * (a local or self-hosted build, lib/site-url.ts) there is no valid sitemap to give, so it is a 404 and
 * robots.txt has no Sitemap line. Static: built once, like the pages.
 */
export const dynamic = 'force-static';

export function GET(): Response {
  const xml = sitemapXml();
  if (!xml) return new Response('Not found\n', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
