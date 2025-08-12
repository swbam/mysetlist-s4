// Core schema exports - Essential tables only for MySetlist MVP
// Removed bloated analytics, data-pipeline, email-enhanced, admin, search, scalability
// These were over-engineered and not required per mysetlist-docs specifications

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
export { userActivityLog } from "./admin";

// Venue reviews (referenced by some routes)
export { venueReviews } from "./venue-reviews";

// Re-export artistSongs from artists file to avoid circular dependency
export { artistSongs } from "./artists";

// User follows artists relationship (needed for artist pages)
export { userFollowsArtists } from "./user-follows-artists";
