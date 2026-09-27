import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bizpulse.pythonanywhere.com'),
  title: {
    default: 'BizPulse — Track Sales, Credit & Debtors, Offline-First',
    template: '%s | BizPulse',
  },
  description:
    'BizPulse turns the daily total you already calculate into a digital business record. Track sales, credit, and debtors — offline-first, for Nigerian traders and micro-businesses.',
  keywords: [
    'business tracker Nigeria',
    'daily tally app',
    'debtor tracking',
    'small business bookkeeping',
    'offline sales tracker',
    'Nigerian trader app',
    'micro-business finance',
  ],
  authors: [{ name: 'BizPulse' }],
  creator: 'BizPulse',
  applicationName: 'BizPulse',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BizPulse',
  },
  openGraph: {
    type: 'website',
    siteName: 'BizPulse',
    title: 'BizPulse — Track Sales, Credit & Debtors, Offline-First',
    description:
      'Your daily sales, debtor follow-ups, and true cash position at closing time. Zero complicated bookkeeping. Works offline.',
    locale: 'en_NG',
    images: [
      {
        url: '/icons/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BizPulse — Business performance dashboard for Nigerian traders',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BizPulse — Track Sales, Credit & Debtors, Offline-First',
    description:
      'Your daily sales, debtor follow-ups, and true cash position. Zero complicated bookkeeping. Works offline.',
    images: ['/icons/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#10b981',
};

import RouteGuard from '@/ui/RouteGuard';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Zero-flash theme init: runs before paint, sets data-theme on <html>.
            Priority: localStorage → prefers-color-scheme → 'light' (brand default). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('bizpulse-theme');var t=s||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        {/* Register service worker for PWA installability */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.warn('[BizPulse] SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body>
        <RouteGuard>{children}</RouteGuard>
      </body>
    </html>
  );
}


