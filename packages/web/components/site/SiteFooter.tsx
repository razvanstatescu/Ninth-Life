/**
 * The website footer (content.md §12, design.md §12): brand, Footer navigation, the licence line and
 * the intended-purpose statement verbatim from NOT_A_MEDICAL_DEVICE (MS-4.4). The licence line and the
 * statement use `caption`, the one place the 14px size is allowed (brand book, Type).
 */
import { NOT_A_MEDICAL_DEVICE } from '@/components/Footer';
import { REPO_URL } from './site-data';

export function SiteFooter() {
  return (
    <footer className="site-wrap site-footer">
      <div className="site-footer__row">
        <div className="site-footer__brand">
          <img src="/icons/favicon.svg" alt="" width={32} height={32} />
          <span className="site-footer__name">Ninth Life</span>
        </div>
        <nav aria-label="Footer" className="site-footer__nav">
          <a href="/app">Open the app</a>
          <a href="/about">About</a>
          <a href="#privacy">Privacy</a>
          <a href="#access">Accessibility</a>
          <a href={REPO_URL}>Source code</a>
        </nav>
      </div>
      <p className="site-footer__caption">Code MIT. Data CC BY-SA 4.0. Fonts SIL Open Font License.</p>
      <p className="site-footer__caption site-footer__statement">{NOT_A_MEDICAL_DEVICE}</p>
    </footer>
  );
}
