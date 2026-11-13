import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site-url';

/**
 * /robots.txt: every page may be crawled (marketing-site MS-3.5).
 *
 * AI crawlers: allowed, search and training alike (product owner, 2026-11-12, W5). The one `*` group
 * already covers GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot,
 * Google-Extended and Applebot-Extended; do not add per-bot groups, they would only be a way for the
 * rules to drift apart. The code is MIT, and answer engines that read the site describe it correctly.
 *
 * The Sitemap line needs an absolute URL, so it is there only when the origin is known (lib/site-url.ts).
 */
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const sitemap = absoluteUrl('/sitemap.xml');
  return { rules: { userAgent: '*', allow: '/' }, ...(sitemap ? { sitemap } : {}) };
}
