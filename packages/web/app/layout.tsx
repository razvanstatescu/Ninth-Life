import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { SITE_DEFINITION, SITE_NAME } from '@/components/site/seo';
import { THEME_BOOT_SCRIPT } from '@/lib/settings';
import '../styles/tokens.css';
import '../styles/globals.css';
import '../styles/components.css';
// styles/app.css is imported by the app pages (app/app/page.tsx, app/about/page.tsx), not here (ADR-006).

// No metadataBase (round 3, R3-P9, 2026-11-13): with one, Next writes the canonical and og:url of "/" as the bare
// origin with no trailing slash, while the sitemap and the JSON-LD say `${origin}/`. The pages build their absolute
// URLs themselves from the origin (lib/site-url.ts, components/site/seo.ts pageMetadata), and Next keeps an absolute
// URL as written when there is no metadataBase. Without an origin, no absolute URL is emitted anywhere.
export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DEFINITION,
  applicationName: SITE_NAME,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: { capable: true, title: 'Ninth Life', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Zoom stays available (WCAG 1.4.4): no maximumScale.
  // The page may run under the notch, rounded corners and home indicator; styles/app.css (imported by the
  // app pages) pads by env(safe-area-inset-*) so nothing interactive sits there.
  viewportFit: 'cover',
  themeColor: '#140a2e',
  colorScheme: 'dark light',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="night" data-keysize="l" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <link rel="preload" href="/fonts/atkinson-hyperlegible-next-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/atkinson-hyperlegible-mono-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="nl-root">{children}</body>
    </html>
  );
}
