/**
 * The website footer (content.md §12, design.md §12), Night in both themes on every page (R3-P6, MS-14.2): the page
 * ends the way it opens. Shared by /, /about and the 404, so "Report a problem" sits in the same place on every page
 * (WCAG 2.2 SC 3.2.6).
 *
 * Round 4 (2026-11-13), research in the round-4 proposal (NN/g footers, GOV.UK footer):
 * - The brand, a one-line promise (the hero lead's first sentence) and a secondary "Open the app" (56px, as in the
 *   bar; never an ember fill, MS-9.1).
 * - One Footer navigation with three labelled groups, an h2 and a list each: Product (the page's sections), Trust
 *   (privacy, limits, accessibility, the method) and Project (about, code, data, credits, a problem). Under 960px
 *   the bar shows no navigation, so on phones these groups are the page's map. Links that leave the site carry the
 *   external icon beside their word; nav links keep the nav look (ink, label weight, 56px targets).
 * - The legal block: the intended-purpose statement verbatim from NOT_A_MEDICAL_DEVICE in body type (MS-4.4), the
 *   history line (HISTORY_LINE, MS-4.7; moved here from the dissolved Source section, so every page states it),
 *   the licence line in caption (the one 14px text, MS-10.5) and "Back to top" (to #top: the page is about 23
 *   phone screens long).
 *
 * `home` is "" on the landing page (in-page anchors) and "/" elsewhere (/#privacy and so on). `statement={false}` on
 * /about, which shows the statement once in its own "What Ninth Life is not" card (W3).
 */
import { NOT_A_MEDICAL_DEVICE } from '@/components/Footer';
import { SiteIcon, arrow, external } from './icons';
import { HISTORY_LINE, ISSUES_URL, METHOD_URL, NOTICE_URL, REPO_URL } from './site-data';

interface FooterLink {
  label: string;
  href: string;
  /** Leaves the site (GitHub). */
  away?: boolean;
}

/** The three groups, in reading order. Exported for the tests. */
export function footerGroups(home: '' | '/' = ''): readonly { title: string; links: readonly FooterLink[] }[] {
  return [
    {
      title: 'Product',
      links: [
        { label: 'How it works', href: `${home}#how` },
        { label: 'Proof check', href: `${home}#proof` },
        { label: 'Ways to type', href: `${home}#access` },
        { label: 'Questions', href: `${home}#faq` },
      ],
    },
    {
      title: 'Trust',
      links: [
        { label: 'Privacy', href: `${home}#privacy` },
        { label: 'Good to know', href: `${home}#limits` },
        { label: 'Accessibility', href: `${home}#accessibility` },
        { label: 'How we measured', href: METHOD_URL, away: true },
      ],
    },
    {
      title: 'Project',
      links: [
        { label: 'About', href: '/about' },
        { label: 'Source code', href: REPO_URL, away: true },
        { label: 'Data sources and licenses', href: NOTICE_URL, away: true },
        { label: 'Credits', href: '/about#credits' },
        { label: 'Report a problem', href: ISSUES_URL, away: true },
      ],
    },
  ];
}

/**
 * A label that leaves the site: the external icon glued to the last word (no wrap between them), so a label that
 * wraps on a phone keeps its icon right after its words instead of at the column's edge.
 */
function AwayLabel({ label }: { label: string }) {
  const cut = label.lastIndexOf(' ') + 1;
  return (
    <span>
      {label.slice(0, cut)}
      <span className="site-footer__tail">
        {label.slice(cut)}
        <SiteIcon d={external} />
      </span>
    </span>
  );
}

export function SiteFooter({ home = '', statement = true }: { home?: '' | '/'; statement?: boolean }) {
  const groups = footerGroups(home);
  return (
    <footer className="site-footer" data-theme="night">
      <div className="site-wrap site-footer__inner">
        <div className="site-footer__top">
          <div className="site-footer__lead">
            <div className="nl-brand nl-brand--small site-footer__brand">
              <img src="/icons/favicon.svg" alt="" width={32} height={32} />
              <span className="nl-brand__name">Ninth Life</span>
            </div>
            <p className="site-footer__promise">A free web app for typing to talk.</p>
            <a className="nl-btn nl-btn--secondary" href="/app">
              Open the app
            </a>
          </div>
          <nav aria-label="Footer" className="site-footer__nav">
            {groups.map((g, i) => (
              <div key={g.title} className={i === groups.length - 1 ? 'site-footer__group site-footer__group--wide' : 'site-footer__group'}>
                <h2 className="site-footer__title">{g.title}</h2>
                <ul>
                  {g.links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href}>{l.away ? <AwayLabel label={l.label} /> : l.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="site-footer__legal">
          {statement ? <p className="site-footer__statement">{NOT_A_MEDICAL_DEVICE}</p> : null}
          <p className="site-footer__history">{HISTORY_LINE}</p>
        </div>
        <div className="site-footer__end">
          <p className="site-footer__caption">Code MIT. Data CC BY-SA 4.0. Fonts SIL Open Font License.</p>
          <p className="site-links">
            {/* .site-go: the words, then the arrow that points the way (up); it moves --motion-hint on hover/focus. */}
            <a className="site-go" href="#top">
              Back to top
              <SiteIcon d={arrow} turn="up" />
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
