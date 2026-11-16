export const NOT_A_MEDICAL_DEVICE =
  'Ninth Life is a general-purpose text entry and text-to-speech tool. It is not a medical device and is not intended to diagnose, treat or replace a clinical AAC assessment.';

import type { ReactNode } from 'react';

/**
 * A link from the app to the website (web-ui Req 36.7): it opens in a new tab, so the sentence on the keypad is
 * never lost, and its name says so. The visible words come first (label in name).
 */
export function WebsiteLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} className={className} target="_blank" rel="noopener">
      {children}
      <span className="nl-sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** App footer (keypad and /about). The / link works offline: next.config.mjs precaches it (ADR-006). */
export function Footer({ about = true }: { about?: boolean }) {
  return (
    <footer className="app-footer">
      <p>{NOT_A_MEDICAL_DEVICE}</p>
      <nav aria-label="Footer">
        {about ? <WebsiteLink href="/about">About Ninth Life</WebsiteLink> : <a href="/app">Back to the keypad</a>}
        {about ? <WebsiteLink href="/">How Ninth Life works</WebsiteLink> : <a href="/">How Ninth Life works</a>}
      </nav>
    </footer>
  );
}
