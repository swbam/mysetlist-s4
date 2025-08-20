/**
 * Core utilities index - Export all utility functions
 * Provides easy imports for the service layer
 */

// HTTP utilities
export {
  fetchJson,
  fetchWithRetry,
  fetchWithRateLimit,
  batchFetch,
  HttpError,
  type FetchRetryOptions,
} from "./http";

// Concurrency utilities
export {
  pLimit,
  processBatch,
  parallelMap,
  parallelFilter,
  processInChunks,
  TaskQueue,
  type PLimit,
} from "./concurrency";

// String utilities
export {
  createSlug,
  normalizeText,
  cleanSongTitle,
  isLikelyLiveTitle,
  isLikelyLiveAlbum,
  isRemixTitle,
  parseGenres,
  getArtistNameVariations,
  generateMatchingKey,
  calculateSimilarity,
  truncateText,
  titleCase,
  cleanVenueName,
  parseDuration,
  formatDuration,
  cleanUrl,
  extractNumbers,
  isValidJson,
} from "./strings";

// Re-export types for external use
export type {
  ImportConfig,
  ImportResult,
} from "../orchestrators/ArtistImportOrchestrator";
export type { ProgressEvent, ImportStage } from "../progress/ProgressBus";
