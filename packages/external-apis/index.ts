// Base client
export * from "./src/clients/base"

// Spotify
export * from "./src/clients/spotify"
export { SpotifyClient } from "./src/clients/spotify"

// Ticketmaster
export * from "./src/clients/ticketmaster"
export { TicketmasterClient } from "./src/clients/ticketmaster"

// Setlist.fm
export * from "./src/clients/setlistfm"

// Re-export commonly used types
export type {
  SpotifyArtist,
  SpotifyTrack,
  SpotifySearchResult,
} from "./src/clients/spotify"

export type {
  TicketmasterEvent,
  TicketmasterVenue,
} from "./src/clients/ticketmaster"

export type {
  SetlistFmSetlist,
  SetlistFmArtist,
  SetlistFmVenue,
  SetlistFmSong,
  SetlistFmSet,
} from "./src/clients/setlistfm"

import { SetlistFmClient } from "./src/clients/setlistfm"
// Export instantiated clients
import { SpotifyClient } from "./src/clients/spotify"
import { TicketmasterClient } from "./src/clients/ticketmaster"

export const spotify = new SpotifyClient({})
export const ticketmaster = new TicketmasterClient({})
export const setlistfm = new SetlistFmClient({})

// Export sync services
export { ArtistSyncService } from "./src/services/artist-sync"
export { VenueSyncService } from "./src/services/venue-sync"
export { ShowSyncService } from "./src/services/show-sync"
export { SetlistSyncService } from "./src/services/setlist-sync"
export { SyncScheduler } from "./src/services/sync-scheduler"

// Export commonly used types from sync services
export type { SyncOptions } from "./src/services/sync-scheduler"
