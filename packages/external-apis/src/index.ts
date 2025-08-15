// Types - export first to avoid circular dependencies
export * from "./types";

// Base API Client and Error Classes
export {
  BaseAPIClient,
  APIError,
  AuthenticationError,
  ServerError,
  RateLimitError,
  TimeoutError,
  type APIClientConfig,
} from "./clients/base";

// External API Clients
export * from "./clients/spotify";
export * from "./clients/ticketmaster";
export * from "./clients/setlistfm";

// Utilities
export {
  CacheManager,
  cacheKeys,
  type CacheOptions,
} from "./utils/cache";

export {
  RateLimiter,
  createDistributedRateLimiter,
  type RateLimiterOptions,
} from "./utils/rate-limiter";

export * from "./utils/circuit-breaker";
export * from "./utils/error-handler";
export * from "./utils/intelligent-cache";

// Sync Services
export {
  ArtistSyncService,
  ShowSyncService,
  VenueSyncService,
  SetlistSyncService,
  SyncScheduler,
  ArtistImportOrchestrator,
} from "./services";

// Service index for convenience - avoid re-exporting conflicting types
export type {
  SyncOptions,
  SyncJob,
  JobStats,
  HealthStatus,
} from "./services/index";

// Create singleton instances for common use
import { SyncScheduler } from "./services/sync-scheduler";
import { SpotifyClient } from "./clients/spotify";
export const syncScheduler = new SyncScheduler();
export const spotify = new SpotifyClient({});

// Environment configuration
export * from "./env";
