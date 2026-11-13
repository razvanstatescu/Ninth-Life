/**
 * The banner: the bar (SiteBar: brand, Main navigation, header "Open the app") and the hero with the keypad
 * demo (marketing-site design.md §0 and §1). Always Night (MS-6.1). The bar keeps its DOM order
 * brand, nav, CTA at every width (R2, MS-13.2). Nothing here is marked for a reveal, and the logo never
 * moves (MS-8.3, MS-8.4).
 *
 * Round 3 (2026-11-12): the h1 is the promise and matches the <title>; "Ninth Life" is the bar's
 * brand and the small line with the icon above the h1. "See how it works" is a link beside the primary, so
 * the demo reaches the first phone screen.
 */
import { KeypadDemo } from './KeypadDemo';
import { SiteBar } from './SiteBar';
import type { DemoData } from './site-data';

export function SiteHeader({ demo }: { demo: DemoData }) {
  return (
    <header id="top" className="site-top site-night" data-theme="night">
      <SiteBar />

      <section className="site-wrap site-hero" aria-labelledby="hero-title">
        <div className="site-hero__copy">
          <p className="site-hero__brand">
            <img className="site-hero__icon" src="/icons/icon.svg" alt="" width={64} height={64} />
            <span>Ninth Life</span>
          </p>
          {/* One sentence per line on every width wide enough for it; the text is still one string. */}
          <h1 id="hero-title" className="site-hero__title">
            <span>Type on 9 keys.</span> <span>Hear your sentence.</span>
          </h1>
          <p className="site-hero__lead">A free web app for typing to talk. Press one key per letter and hear the sentence you meant.</p>
          <div className="site-cta">
            {/* The ember fill of this viewport (MS-9.1). */}
            <a className="nl-btn nl-btn--primary nl-btn--xl" href="/app">
              Open the app
            </a>
            <a className="site-hero__how" href="#how">
              See how it works
            </a>
          </div>
          <p className="site-hero__note">Free. Works offline. No account.</p>
        </div>
        <div className="site-hero__demo">
          <KeypadDemo data={demo} />
        </div>
      </section>
    </header>
  );
}
