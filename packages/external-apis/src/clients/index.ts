// Base API Client exports
export {
  BaseAPIClient,
  APIError,
  RateLimitError,
  type APIClientConfig,
} from "./base";

// Specific API Client exports
export { SpotifyClient } from "./spotify";
export { TicketmasterClient } from "./ticketmaster";
export { SetlistFmClient } from "./setlistfm";

// Re-export types from specific clients for convenience
export type {
  SpotifyArtist,
  SpotifyTrack,
  SpotifySearchResult,
} from "../types/spotify";

export type {
  TicketmasterEvent,
  TicketmasterVenue,
} from "../types/ticketmaster";

export type { SetlistFmSetlist } from "../types/setlistfm";
