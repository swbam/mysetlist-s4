/**
 * External API Adapters & Clients
 * 
 * Comprehensive API client library implementing robust retry logic, rate limiting,
 * and circuit breaker patterns for external service integration:
 * 
 * - BaseApiClient: Foundation client with advanced error handling
 * - SpotifyApiClient: Enhanced Spotify Web API with OAuth token management
 * - TicketmasterApiClient: Ticketmaster Discovery API with pagination
 * - SetlistFmClient: Setlist.fm API for concert setlist data
 */

// Base API Client
export {
  BaseApiClient,
  type ApiClientConfig,
  type ApiResponse,
  type RateLimitInfo,
  type ApiHealthCheck,
} from './base-client';

// Enhanced Spotify Web API Client
export {
  SpotifyApiClient,
  type SpotifyTokenResponse,
  type SpotifyArtist,
  type SpotifyAlbum,
  type SpotifyTrack,
  type SpotifyAudioFeatures,
  type SpotifyPaginatedResponse,
} from './spotify-client';

// Enhanced Ticketmaster Discovery API Client
export {
  TicketmasterApiClient,
  type TicketmasterEvent,
  type TicketmasterVenue,
  type TicketmasterAttraction,
  type TicketmasterPage,
  type TicketmasterResponse,
  type TicketmasterEventsResponse,
  type TicketmasterAttractionsResponse,
  type TicketmasterVenuesResponse,
} from './ticketmaster-client';

// Setlist.fm API Client
export {
  SetlistFmClient,
  type SetlistFmArtist,
  type SetlistFmVenue,
  type SetlistFmSetlist,
  type SetlistFmSong,
  type SetlistFmSet,
  type SetlistFmSearchResult,
  type SetlistFmCity,
  type SetlistFmUser,
} from './setlistfm-client';

// Legacy Clients (for backward compatibility)
export {
  // Core functions
  iterateEventsByAttraction,
  searchAttractions,
  getVenue,
  getEvent,
  iterateEvents,
  testApiConnection as testTicketmasterConnection,
  
  // Types
  type TicketmasterError,
} from './TicketmasterClient';

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
  type SpotifyError,
} from './SpotifyClient';

// Test Suite
export {
  runApiTests,
  testServiceIntegrations,
  testSpotifyClient,
  testTicketmasterClient,
  testSetlistFmClient,
} from './test-api-connections';

// Re-export HTTP utilities for convenience
export {
  fetchJson,
  fetchWithRetry,
  fetchWithRateLimit,
  batchFetch,
  type FetchRetryOptions,
  type HttpError,
} from '../util/http';

// Re-export concurrency utilities for convenience
export {
  pLimit,
  processBatch,
  TaskQueue,
  parallelMap,
  parallelFilter,
  processInChunks,
  type PLimit,
} from '../util/concurrency';