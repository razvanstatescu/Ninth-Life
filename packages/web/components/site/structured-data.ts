/**
 * JSON-LD for / (marketing-site MS-3.7): one @graph with WebSite, WebApplication and FAQPage. Pure
 * builder; app/page.tsx renders the result in a `<script type="application/ld+json">`.
 *
 * - Everything in it is copy the page already shows: SITE_DEFINITION, the intended-purpose sentence
 *   (NOT_A_MEDICAL_DEVICE), the approved feature lines and the FAQ from faqItems(), the same list
 *   Faq.tsx renders, so the markup cannot drift from the visible text.
 * - Emitted only when the origin is known (lib/site-url.ts): every node needs an absolute URL.
 * - No author or Person (product owner, 2026-11-12, W6), no Organization (none exists), no rating
 *   (we have none). No third-party trademark (tm-lint) and no banned claim (test/seo.test.ts).
 */
import { NOT_A_MEDICAL_DEVICE } from '@/components/Footer';
import { siteOrigin } from '@/lib/site-url';
import { faqItems, type FaqItem } from './sections/Faq';
import { SITE_DEFINITION, SITE_NAME, socialCardPath } from './seo';
import { REPO_URL } from './site-data';

/** What the app does, in the approved copy's words (content.md §1-§5). */
export const FEATURE_LIST = [
  'One press per letter on keys 2 to 9',
  'Every spoken word matches the keys on screen',
  'Works offline after the first visit',
  'Type with a keyboard, by touch, or with one or two switches',
] as const;

export function siteGraph(origin: URL | null = siteOrigin(), faq: readonly FaqItem[] = faqItems()): Record<string, unknown> | null {
  if (!origin) return null;
  const url = (path: string) => new URL(path, origin).href;
  const website = url('/');
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${website}#website`,
        name: SITE_NAME,
        url: website,
        inLanguage: 'en',
        description: SITE_DEFINITION,
      },
      {
        '@type': 'WebApplication',
        '@id': `${url('/app')}#app`,
        name: SITE_NAME,
        url: url('/app'),
        description: SITE_DEFINITION,
        disambiguatingDescription: NOT_A_MEDICAL_DEVICE,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any (runs in a web browser)',
        browserRequirements: 'A current browser with JavaScript',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        inLanguage: 'en',
        license: 'https://opensource.org/licenses/MIT',
        featureList: [...FEATURE_LIST],
        image: url(socialCardPath()),
        sameAs: [REPO_URL],
        isPartOf: { '@id': `${website}#website` },
      },
      {
        '@type': 'FAQPage',
        '@id': `${website}#faq`,
        url: website,
        inLanguage: 'en',
        isPartOf: { '@id': `${website}#website` },
        mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
    ],
  };
}

/** The graph as script text, `<` escaped so no string in it can close the script element. */
export function siteJsonLd(graph: Record<string, unknown> | null = siteGraph()): string | null {
  return graph ? JSON.stringify(graph).replace(/</g, '\\u003c') : null;
}
