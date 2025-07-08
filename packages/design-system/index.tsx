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
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster />
    </AuthProvider>
  </ThemeProvider>
);

// Music-specific components
export { ArtistCard } from './components/ui/artist-card';
export { VenueCard } from './components/ui/venue-card';
export { SetlistSong } from './components/ui/setlist-song';
export { VoteButton } from './components/ui/vote-button';

// Additional UI components
export { ScrollArea, ScrollBar } from './components/ui/scroll-area';
export { Alert, AlertDescription, AlertTitle } from './components/ui/alert';
export { Button } from './components/ui/button';
export { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
export { Badge } from './components/ui/badge';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
export { Avatar, AvatarImage, AvatarFallback } from './components/ui/avatar';

// Music design tokens
export { musicTokens, type MusicTokens } from './lib/design-tokens';

// Utilities
export { cn, capitalize, handleError } from './lib/utils';
