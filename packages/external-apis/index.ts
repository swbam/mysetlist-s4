// Base client
export * from './src/clients/base';

// Spotify
export * from './src/clients/spotify';
export { SpotifyClient } from './src/clients/spotify';

// Ticketmaster
export * from './src/clients/ticketmaster';
export { TicketmasterClient } from './src/clients/ticketmaster';

// Setlist.fm
export * from './src/clients/setlistfm';

// Re-export commonly used types
export type {
  SpotifyArtist,
  SpotifyTrack,
  SpotifySearchResult,
} from './src/clients/spotify';

export type {
  TicketmasterEvent,
  TicketmasterVenue,
} from './src/clients/ticketmaster';

export type {
  SetlistFmSetlist,
  SetlistFmArtist,
  SetlistFmVenue,
  SetlistFmSong,
  SetlistFmSet,
} from './src/clients/setlistfm';

// Export instantiated clients
import { SpotifyClient } from './src/clients/spotify';
import { TicketmasterClient } from './src/clients/ticketmaster';

export const spotify = new SpotifyClient({});
export const ticketmaster = new TicketmasterClient({});