/**
 * Main services index - Core utilities and services for TheSet
 * Implements GROK.md specifications for production-ready import system
 */

// Core utilities
export * from "./util";

// Progress tracking system
export * from "./progress";

// Import orchestration
export * from "./orchestrators";

// Legacy exports for backward compatibility
export { default as CacheManager } from "./cache-manager";

// Service layer utilities for external integrations
export * as Utils from "./util";
export * as Progress from "./progress";
export * as Orchestrators from "./orchestrators";

/**
 * Quick access to commonly used services
 */
export const Services = {
  // Import orchestration
  ArtistImport: () => import("./orchestrators/ArtistImportOrchestrator"),

  // Progress tracking
  Progress: () => import("./progress/ProgressBus"),

  // Utilities
  Http: () => import("./util/http"),
  Concurrency: () => import("./util/concurrency"),
  Strings: () => import("./util/strings"),
} as const;

/**
 * Service configuration
 */
export interface ServiceConfig {
  // API Keys
  ticketmasterApiKey?: string;
  spotifyClientId?: string;
  spotifyClientSecret?: string;

  // Performance settings
  defaultConcurrency?: number;
  defaultRetries?: number;
  defaultTimeout?: number;

  // Feature flags
  enableProgressTracking?: boolean;
  enableDetailedLogging?: boolean;
}

/**
 * Initialize services with configuration
 */
export function initializeServices(config: ServiceConfig = {}) {
  const defaults: Required<ServiceConfig> = {
    ticketmasterApiKey: process.env.TICKETMASTER_API_KEY || "",
    spotifyClientId: process.env.SPOTIFY_CLIENT_ID || "",
    spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
    defaultConcurrency: 5,
    defaultRetries: 3,
    defaultTimeout: 30000,
    enableProgressTracking: true,
    enableDetailedLogging: process.env.NODE_ENV === "development",
  };

  const finalConfig = { ...defaults, ...config };

  // Log initialization in development
  if (finalConfig.enableDetailedLogging) {
    console.log("[Services] Initialized with config:", {
      hasTicketmasterKey: !!finalConfig.ticketmasterApiKey,
      hasSpotifyCredentials: !!(
        finalConfig.spotifyClientId && finalConfig.spotifyClientSecret
      ),
      concurrency: finalConfig.defaultConcurrency,
      retries: finalConfig.defaultRetries,
      timeout: finalConfig.defaultTimeout,
    });
  }

  return finalConfig;
}
