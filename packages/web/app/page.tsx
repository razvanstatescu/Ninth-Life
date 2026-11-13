import type { Metadata } from 'next';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteMotion } from '@/components/site/SiteMotion';
import { SITE_MOTION_BOOT } from '@/components/site/motion';
import { Access } from '@/components/site/sections/Access';
import { Conversation } from '@/components/site/sections/Conversation';
import { Faq } from '@/components/site/sections/Faq';
import { How } from '@/components/site/sections/How';
import { Limits } from '@/components/site/sections/Limits';
import { Privacy } from '@/components/site/sections/Privacy';
import { Proof } from '@/components/site/sections/Proof';
import { Results } from '@/components/site/sections/Results';
import { Start } from '@/components/site/sections/Start';
import { finishedKeys, finishedSentence, getDemoData, getHowData, getProofExample, getResults, getSpellExample } from '@/components/site/site-data';
import { pageMetadata } from '@/components/site/seo';
import { siteJsonLd } from '@/components/site/structured-data';
import '@/components/site/site.css';

/**
 * The website at / (spec .kiro/specs/marketing-site, copy in content.md). The app is at /app
 * (ADR-006), the PWA start URL; /welcome redirects here. Statically rendered at build time: the demo,
 * the drawings' sentences, the proof example and the numbers are computed once, by site-data.ts.
 */
export const dynamic = 'force-static';

const TITLE = 'Ninth Life: type on 9 keys, hear your sentence';
const DESCRIPTION =
  'Free web app for typing to talk. Press one key per letter and hear the sentence you meant. Every spoken word matches your keys. Works offline.';
const SHARE_TITLE = 'Ninth Life: the old phone keypad, back as a way to talk';
const SHARE_DESCRIPTION =
  'Press one key per letter and hear the sentence you meant. Every spoken word matches the keys you pressed. Free, works offline, runs in your browser.';

// Canonical, og:url and the social card only when the origin is known (components/site/seo.ts).
export const metadata: Metadata = pageMetadata({ path: '/', title: TITLE, description: DESCRIPTION, shareTitle: SHARE_TITLE, shareDescription: SHARE_DESCRIPTION });

export default function HomePage() {
  const demo = getDemoData();
  const how = getHowData();
  const proof = getProofExample();
  const results = getResults();
  const jsonLd = siteJsonLd(); // WebSite, WebApplication, FAQPage (structured-data.ts); null without an origin

  return (
    <div className="site">
      {/* Runs before the hero is painted: motion starts from the first frame, or never (MS-8.1). */}
      <script dangerouslySetInnerHTML={{ __html: SITE_MOTION_BOOT }} />
      <a className="nl-skip" href="#main">
        Skip to content
      </a>
      <SiteHeader demo={demo} />
      <main id="main" tabIndex={-1}>
        <How how={how} />
        <Proof proof={proof} />
        <Results results={results} />
        <Conversation sentence={finishedSentence(demo)} keys={finishedKeys(demo)} spell={getSpellExample()} />
        <Access />
        <Privacy />
        <Limits />
        <Faq />
        <Start />
      </main>
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} /> : null}
      <SiteFooter />
      <SiteMotion />
    </div>
  );
}
