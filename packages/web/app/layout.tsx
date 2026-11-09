import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { THEME_BOOT_SCRIPT } from '@/lib/settings';
import '../styles/tokens.css';
import '../styles/globals.css';
import '../styles/components.css';
import '../styles/app.css';

export const metadata: Metadata = {
  title: 'Ninth Life',
  description: 'Press keys 2 to 9, one press per letter, and hear the sentence you meant. 9-key predictive text as a way to talk. Free, works offline.',
  applicationName: 'Ninth Life',
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
  // The page may run under the notch, rounded corners and home indicator; styles/app.css pads by
  // env(safe-area-inset-*) so nothing interactive sits there.
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
