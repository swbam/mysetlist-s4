// Base API Client exports
export {
  BaseAPIClient,
  APIError,
  AuthenticationError,
  ServerError,
  RateLimitError,
  TimeoutError,
  type APIClientConfig,
} from "./base";

// Specific API Client exports
export { SpotifyClient } from "./spotify";
export { TicketmasterClient } from "./ticketmaster";
export { SetlistFmClient } from "./setlistfm";

// Re-export types from specific clients for convenience
export type {
  SpotifyArtist,
  SpotifyAlbum,
  SpotifyTrack,
  SpotifyAudioFeatures,
  SpotifySearchResult,
  SpotifyAlbumsResponse,
  SpotifyTracksResponse,
} from "./spotify";

export type {
  TicketmasterEvent,
  TicketmasterVenue,
  TicketmasterAttraction,
} from "./ticketmaster";

export type {
  SetlistFmArtist,
  SetlistFmVenue,
  SetlistFmSetlist,
  SetlistFmSong,
  SetlistFmSet,
} from "./setlistfm";