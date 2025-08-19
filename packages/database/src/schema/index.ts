// Core schema exports - Essential tables only for TheSet MVP
// Removed bloated analytics, data-pipeline, email-enhanced, admin, search, scalability
// These were over-engineered and not required per theset-docs specifications

export * from "./users";
export * from "./user-profiles";
export * from "./artists";
export * from "./venues";
export * from "./shows";
export * from "./setlists";
export * from "./email-preferences";
export * from "./relations";

// Essential system tables for API functionality
export * from "./api-keys";
export * from "./rate-limits";

// Essential admin/monitoring tables
export { 
  userActivityLog, 
  importStatus, 
  importLogs, 
  reports,
  contentModeration,
  moderationLogs,
  platformStats,
  type ImportStatus, 
  type ImportLog,
  type InsertImportLog 
} from "./admin";

// User bans table (referenced by admin pages)
export { userBans } from "./search";

// Re-export artistSongs from artists file to avoid circular dependency
export { artistSongs } from "./artists";

// User follows artists relationship (needed for artist pages)
export { userFollowsArtists } from "./user-follows-artists";

// Export sync jobs and progress
export * from "./sync-jobs";
