import './styles.css';
import { DesignSystemProvider } from '@repo/design-system';
import { fonts } from '@repo/design-system/lib/fonts';
import { cn } from '@repo/design-system/lib/utils';
import { Toaster } from '@repo/design-system/components/ui/toaster';
import type { ReactNode } from 'react';
import { Footer } from './components/footer';
import { Header } from './components/header';
import { AuthProvider } from './providers/auth-provider';
import { RealtimeProvider } from './providers/realtime-provider';
import { PWAProvider } from '@/components/pwa-provider';
import { InstallPrompt } from '@/components/install-prompt';
import { OfflineIndicator } from '@/components/offline-indicator';
import { PageTransitionProvider } from '@/components/page-transition-provider';
import { AnalyticsSetupProvider } from '@/components/analytics-provider';

// Force dynamic rendering for the entire app
export const dynamic = 'force-dynamic';

type RootLayoutProperties = {
  readonly children: ReactNode;
};

const RootLayout = async ({ children }: RootLayoutProperties) => {
  return (
    <html
      lang="en"
      className={cn(fonts, 'scroll-smooth')}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MySetlist" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.svg" />
      </head>
      <body>
        <DesignSystemProvider>
          <AuthProvider>
            <AnalyticsSetupProvider />
            <RealtimeProvider>
              <PWAProvider>
                <PageTransitionProvider>
                  <OfflineIndicator />
                  <Header />
                  {children}
                  <Footer />
                  <InstallPrompt />
                  <Toaster />
                </PageTransitionProvider>
              </PWAProvider>
            </RealtimeProvider>
          </AuthProvider>
        </DesignSystemProvider>
      </body>
    </html>
  );
};

export default RootLayout;