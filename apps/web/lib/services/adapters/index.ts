/**
 * External API Adapters & Clients
 *
 * Barrel exports for all external API clients implementing GROK.md specifications:
 * - TicketmasterClient: Paginated event fetching with async generators
 * - SpotifyClient: OAuth token management and batch API operations
 */

// Ticketmaster API Client
export {
  // Core functions
  iterateEventsByAttraction,
  searchAttractions,
  getVenue,
  getEvent,
  iterateEvents,
  testApiConnection as testTicketmasterConnection,
  // Types
  type TicketmasterEvent,
  type TicketmasterVenue,
  type TicketmasterPage,
  type TicketmasterResponse,
  type TicketmasterError,
} from "./TicketmasterClient";

// Spotify Web API Client
export {
  // Core functions
  getAccessToken,
  listAllAlbums,
  listAlbumTracks,
  getTracksDetails,
  getAudioFeatures,
  // Artist operations
  searchArtists,
  getArtist,
  getArtists,
  getArtistTopTracks,
  // Utility functions
  testApiConnection as testSpotifyConnection,
  clearTokenCache,
  getTokenCacheStatus,
  // Types
  type SpotifyTokenResponse,
  type SpotifyArtist,
  type SpotifyAlbum,
  type SpotifyTrack,
  type SpotifyAudioFeatures,
  type SpotifyPaginatedResponse,
  type SpotifyError,
} from "./SpotifyClient";

// Re-export HTTP utilities for convenience
export {
  fetchJson,
  fetchWithRetry,
  fetchWithRateLimit,
  batchFetch,
  type FetchRetryOptions,
  type HttpError,
} from "../util/http";

// Re-export concurrency utilities for convenience
export {
  pLimit,
  processBatch,
  TaskQueue,
  parallelMap,
  parallelFilter,
  processInChunks,
  type PLimit,
} from "../util/concurrency";
