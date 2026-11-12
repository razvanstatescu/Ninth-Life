/**
 * The banner: the bar (brand, Main navigation, header "Open the app") and the hero with the keypad
 * demo (marketing-site design.md §0 and §1). Always Night (MS-6.1). The bar keeps its DOM order
 * brand, nav, CTA at every width and wraps in that order (R2, MS-13.2). Nothing here is marked for a
 * reveal, and the logo never moves (MS-8.3, MS-8.4).
 */
import { KeypadDemo } from './KeypadDemo';
import type { DemoData } from './site-data';

export function SiteHeader({ demo }: { demo: DemoData }) {
  return (
    <header id="top" className="site-top" data-theme="night">
      <div className="site-wrap site-bar">
        <a className="site-brand" href="#top">
          {/* Below 48px the favicon variant is used (brand book, Logo). */}
          <img src="/icons/favicon.svg" alt="" width={44} height={44} />
          <span>Ninth Life</span>
        </a>
        <nav aria-label="Main" className="site-nav">
          <a href="#how">How it works</a>
          <a href="#proof">Proof check</a>
          <a href="#access">Ways to type</a>
          <a href="#privacy">Privacy</a>
          <a href="#faq">Questions</a>
        </nav>
        <a className="nl-btn nl-btn--secondary" href="/app">
          Open the app
        </a>
      </div>

      <section className="site-wrap site-hero" aria-labelledby="hero-title">
        <div className="site-hero__copy">
          <img className="site-hero__icon" src="/icons/icon.svg" alt="" width={112} height={112} />
          <h1 id="hero-title" className="site-hero__name">
            Ninth Life
          </h1>
          <p className="site-hero__line">Press keys. Hear your sentence.</p>
          <p className="site-hero__lead">
            Ninth Life brings back 9-key predictive text as a way to talk. Press one key per letter on a phone, tablet or laptop, and it speaks the sentence you meant, after checking every word against the keys you pressed.
          </p>
          <div className="site-actions">
            {/* The ember fill of this viewport (MS-9.1). */}
            <a className="nl-btn nl-btn--primary nl-btn--xl" href="/app">
              Open the app
            </a>
            <a className="nl-btn nl-btn--secondary nl-btn--xl" href="#how">
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
