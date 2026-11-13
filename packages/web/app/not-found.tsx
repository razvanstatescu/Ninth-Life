import type { Metadata } from 'next';
import { SiteBar } from '@/components/site/SiteBar';
import { SiteFooter } from '@/components/site/SiteFooter';
// The website's look (round 3, R3-P5, 2026-11-13): the site stylesheet, as on / and /about.
import '@/components/site/site.css';

/**
 * The 404 page (marketing-site MS-3.9): one title, a way back to the website and the app. Next keeps the 404 status
 * and adds `noindex`.
 *
 * Round 3 (R3-P5, 2026-11-13): the last page outside the site look now uses it. The whole page is Night
 * in both themes (like the banner, the #start close and the footer): the site bar, the site type (.site-h2,
 * .site-lead), a .site-cta row with the website's 64px buttons (the ember primary on Night, as in the hero) and the
 * site footer with the intended-purpose statement. Its own title in the site's "Ninth Life: …" pattern and its own
 * description (it used to inherit the definition).
 */
export const metadata: Metadata = {
  title: 'Ninth Life: page not found',
  description: 'There is no page at this address. Open the Ninth Life app, or go to the home page.',
};

export default function NotFound() {
  return (
    <div className="site site-night" data-theme="night">
      <a className="nl-skip" href="#main">
        Skip to content
      </a>
      {/* #top: the target of the site footer's "Back to top" (round 4, 2026-11-13). */}
      <header id="top">
        <SiteBar home="/" />
      </header>
      <main id="main" tabIndex={-1} className="site-wrap site-about__head site-stack">
        <div className="site-head">
          <h1 className="site-h2">Page not found</h1>
          <p className="site-lead">There is no page at this address. It may have moved, or the link may be mistyped.</p>
        </div>
        <div className="site-cta">
          <a className="nl-btn nl-btn--primary nl-btn--xl" href="/app">
            Open the app
          </a>
          <a className="nl-btn nl-btn--secondary nl-btn--xl" href="/">
            Go to the home page
          </a>
        </div>
      </main>
      <SiteFooter home="/" />
    </div>
  );
}
