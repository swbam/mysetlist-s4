// Base client
export * from "./src/clients/base";

// Spotify
export * from "./src/clients/spotify";
export { SpotifyClient } from "./src/clients/spotify";

// Ticketmaster
export * from "./src/clients/ticketmaster";
export { TicketmasterClient } from "./src/clients/ticketmaster";

// Setlist.fm
export * from "./src/clients/setlistfm";

// Re-export commonly used types
export type {
  SpotifyArtist,
  SpotifyTrack,
  SpotifySearchResult,
} from "./src/types/spotify";

export type {
  TicketmasterEvent,
  TicketmasterVenue,
} from "./src/types/ticketmaster";

export type { SetlistFmSetlist } from "./src/types/setlistfm";

import { SetlistFmClient } from "./src/clients/setlistfm";
// Export instantiated clients as lazy getters to avoid initialization errors
import { SpotifyClient } from "./src/clients/spotify";
import { TicketmasterClient } from "./src/clients/ticketmaster";

// Create singleton instances
let _spotify: SpotifyClient | null = null;
let _ticketmaster: TicketmasterClient | null = null;
let _setlistfm: SetlistFmClient | null = null;

// Export clients with direct method access
export const spotify = new Proxy({} as SpotifyClient, {
  get: (_target, prop) => {
    if (!_spotify) {
      _spotify = new SpotifyClient({});
    }
    return (_spotify as any)[prop];
  },
});

export const ticketmaster = new Proxy({} as TicketmasterClient, {
  get: (_target, prop) => {
    if (!_ticketmaster) {
      _ticketmaster = new TicketmasterClient({
        apiKey:
          process.env['TICKETMASTER_API_KEY'] ||
          "k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b",
      });
    }
    return (_ticketmaster as any)[prop];
  },
});

export const setlistfm = new Proxy({} as SetlistFmClient, {
  get: (_target, prop) => {
    if (!_setlistfm) {
      _setlistfm = new SetlistFmClient({});
    }
    return (_setlistfm as any)[prop];
  },
});

// Export sync services
export {
  initiateImport,
  runFullImport,
} from "./src/services/orchestrators/ArtistImportOrchestrator";

export { EnhancedShowVenueSync } from "./src/services/enhanced-show-venue-sync";

// Export progress utilities
export {
  onProgress,
  offProgress,
  report,
} from "./src/services/progress/ProgressBus";

// Export orchestrator class
export { ArtistImportOrchestrator } from "./src/services/artist-import-orchestrator";

// Export sync services
export {
  ArtistSyncService,
  ShowSyncService,
  SetlistSyncService,
  SyncScheduler,
  VenueSyncService,
} from "./src/services";
