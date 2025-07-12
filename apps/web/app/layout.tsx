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
