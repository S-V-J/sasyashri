import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Devanagari } from 'next/font/google';
import './styles/globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  variable: '--font-noto-sans-devanagari',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: {
    default: 'सस्यश्री (Sasyashri) — Agricultural Wholesale Platform',
    template: '%s | Sasyashri',
  },
  description: 'India\'s unified digital platform for wholesale agricultural trade. Connect with farmers, sellers, buyers, transporters, and financiers.',
  keywords: [
    'agriculture',
    'wholesale',
    'mandi',
    'farmer',
    'seller',
    'buyer',
    'crop',
    'grain',
    'spices',
    'Bihar',
    'Uttar Pradesh',
    'Jharkhand',
  ],
  authors: [{ name: 'Sasyashri' }],
  creator: 'Sasyashri',
  publisher: 'Sasyashri',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://sasyashri.duckdns.org',
    siteName: 'Sasyashri',
    title: 'सस्यश्री — Agricultural Wholesale Platform',
    description: 'India\'s unified digital platform for wholesale agricultural trade.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Sasyashri Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sasyashri — Agricultural Wholesale Platform',
    description: 'India\'s unified digital platform for wholesale agricultural trade.',
    images: ['/og-image.png'],
  },
  verification: {
    google: 'google-site-verification-code',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1a0f' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${notoSansDevanagari.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icons/icon-192.png" sizes="192x192" type="image/png" />
        <link rel="icon" href="/icons/icon-512.png" sizes="512x512" type="image/png" />
        <meta name="theme-color" content="#1a5c1a" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0f1a0f" media="(prefers-color-scheme: dark)" />
      </head>
      <body className="font-sans antialiased min-h-screen">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}