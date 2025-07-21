import './styles.css';
import { DesignSystemProvider } from '@repo/design-system';
import { Toaster } from '@repo/design-system/components/ui/toaster';
import { fonts } from '@repo/design-system/lib/fonts';
import { cn } from '@repo/design-system/lib/utils';
import React from 'react';
import { AnonymousUserProvider } from '~/components/anonymous-user-provider';
import { DisableServiceWorker } from '~/components/disable-sw';
import { PageTransitionProvider } from '~/components/page-transition-provider';
import { SkipLink } from '~/components/ui/accessibility-utils';
import { WebVitalsTracker } from '~/components/analytics/web-vitals-tracker';
import { LayoutProvider } from '../providers/layout-provider';
import { Footer } from './components/footer';
import { Header } from './components/header';
import { AuthProvider } from './providers/auth-provider';
import { RealtimeProvider } from './providers/realtime-provider';
import { ErrorBoundary } from './components/error-boundary';
import type { Metadata } from 'next';

// Production metadata configuration
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NODE_ENV === 'production' 
    ? 'https://mysetlist.vercel.app' 
    : 'http://localhost:3001'
  ),
  title: {
    default: 'MySetlist - Vote on Concert Setlists',
    template: '%s | MySetlist'
  },
  description: 'Vote on concert setlists, discover upcoming shows, and connect with music fans. Join the community predicting what artists will play live.',
  keywords: ['concerts', 'setlists', 'music', 'live shows', 'voting', 'artists', 'venues'],
  authors: [{ name: 'MySetlist Team' }],
  creator: 'MySetlist',
  publisher: 'MySetlist',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'MySetlist - Vote on Concert Setlists',
    description: 'Vote on concert setlists, discover upcoming shows, and connect with music fans.',
    siteName: 'MySetlist',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'MySetlist - Vote on Concert Setlists',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MySetlist - Vote on Concert Setlists',
    description: 'Vote on concert setlists, discover upcoming shows, and connect with music fans.',
    images: ['/opengraph-image.png'],
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

// Removed global force-dynamic to improve performance
// Only apply force-dynamic to specific pages that need real-time data

type RootLayoutProperties = {
  readonly children: React.ReactNode;
};

const RootLayout = async ({ children }: RootLayoutProperties) => {
  return (
    <html
      lang="en"
      className={cn(fonts, 'scroll-smooth')}
      suppressHydrationWarning
    >
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
      </head>
      <body>
        <ErrorBoundary>
          <DesignSystemProvider>
            <AuthProvider>
              <RealtimeProvider>
                <LayoutProvider>
                  <AnonymousUserProvider>
                    <PageTransitionProvider>
                      <DisableServiceWorker />
                      <WebVitalsTracker />
                      <SkipLink href="#main-content" />
                      <Header />
                      <main id="main-content" className="focus:outline-none">
                        {children}
                      </main>
                      <Footer />
                      <Toaster />
                    </PageTransitionProvider>
                  </AnonymousUserProvider>
                </LayoutProvider>
              </RealtimeProvider>
            </AuthProvider>
          </DesignSystemProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
};

export default RootLayout;
