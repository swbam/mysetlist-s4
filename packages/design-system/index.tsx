import { AnalyticsProvider } from '@repo/analytics';
import { AuthProvider } from '@repo/auth/provider';
import type { ThemeProviderProps } from 'next-themes';
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';
import { ThemeProvider } from './providers/theme';

type DesignSystemProviderProperties = ThemeProviderProps & {
  privacyUrl?: string;
  termsUrl?: string;
  helpUrl?: string;
};

export const DesignSystemProvider = ({
  children,
  privacyUrl,
  termsUrl,
  helpUrl,
  ...properties
}: DesignSystemProviderProperties) => (
  <ThemeProvider {...properties}>
    <AuthProvider>
      <AnalyticsProvider>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </AnalyticsProvider>
    </AuthProvider>
  </ThemeProvider>
);

// Music-specific components
export { ArtistCard } from './components/ui/artist-card';
export { VenueCard } from './components/ui/venue-card';
export { SetlistSong } from './components/ui/setlist-song';

// Music design tokens
export { musicTokens, type MusicTokens } from './lib/design-tokens';
