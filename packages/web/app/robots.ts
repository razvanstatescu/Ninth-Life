import type { MetadataRoute } from 'next';

/** /robots.txt: every page may be crawled (marketing-site MS-3.5). */
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/' } };
}
