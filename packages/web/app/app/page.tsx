import type { Metadata } from 'next';
import { CommunicationScreen } from '@/components/CommunicationScreen';
import { pageMetadata } from '@/components/site/seo';
import '@/styles/app.css';

// Copy: marketing-site content.md "Page metadata". Canonical and og:url only with a known origin.
export const metadata: Metadata = pageMetadata({
  path: '/app',
  title: 'Ninth Life app: type on 9 keys',
  description: 'The Ninth Life keypad: press one key per letter on keys 2 to 9 and hear the sentence you meant. Free, no account, works offline after the first visit.',
});

/** The communication screen, at /app (ADR-006). Everything runs in the browser; the dictionary loads from /data. */
export default function Page() {
  return <CommunicationScreen />;
}
