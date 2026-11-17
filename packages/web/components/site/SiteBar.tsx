/**
 * The website bar: brand, Main navigation, header "Open the app" (marketing-site design.md §0). Shared by the
 * landing page's banner (SiteHeader) and /about (W3, 2026-11-12), always inside a Night band. It keeps its DOM
 * order brand, nav, CTA at every width (R2, MS-13.2). W1 (2026-11-12): the nav shows from 900px only, so the bar is
 * one row at every width and "Open the app" never sits alone on a row; under 352px the brand shows its icon only
 * (the name stays in the accessible name, visually hidden) (MS-3.3, site.css "banner").
 *
 * `home` is "" on the landing page (links are in-page anchors and the brand goes to #top) and "/" elsewhere
 * (the anchors become /#how and so on, and the brand goes to /).
 */
export function SiteBar({ home = '' }: { home?: '' | '/' }) {
  return (
    // Round 5 (2026-11-17): the bar stays at the top of the window (.site-barline, fixed, Night in both themes), so
    // "Open the app" is one press away on every screen and the sections no longer end on their own button rows.
    <div className="site-barline" data-theme="night">
      <div className="site-wrap site-bar">
        <a className="nl-brand" href={home ? '/' : '#top'}>
          {/* Below 48px the favicon variant is used (brand book, Logo). */}
          <img src="/icons/favicon.svg" alt="" width={44} height={44} />
          <span className="nl-brand__name">Ninth Life</span>
        </a>
        <nav aria-label="Main" className="site-nav">
          <a href={`${home}#how`}>How it works</a>
          <a href={`${home}#proof`}>Proof check</a>
          <a href={`${home}#access`}>Ways to type</a>
          <a href={`${home}#privacy`}>Privacy</a>
          <a href={`${home}#faq`}>Questions</a>
        </nav>
        <a className="nl-btn nl-btn--secondary" href="/app">
          Open the app
        </a>
      </div>
    </div>
  );
}
