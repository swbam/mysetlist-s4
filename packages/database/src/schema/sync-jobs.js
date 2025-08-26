"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncProgress = exports.syncJobs = void 0;
const cuid2_1 = require("@paralleldrive/cuid2");
const pg_core_1 = require("drizzle-orm/pg-core");
exports.syncJobs = (0, pg_core_1.pgTable)("sync_jobs", {
    id: (0, pg_core_1.text)("id")
        .primaryKey()
        .$defaultFn(() => (0, cuid2_1.createId)()),
    entityType: (0, pg_core_1.text)("entity_type").notNull(), // 'artist', 'venue', 'show'
    entityId: (0, pg_core_1.text)("entity_id").notNull(),
    spotifyId: (0, pg_core_1.text)("spotify_id"),
    tmAttractionId: (0, pg_core_1.text)("tm_attraction_id"),
    setlistfmId: (0, pg_core_1.text)("setlistfm_id"),
    // Status tracking
    status: (0, pg_core_1.text)("status").notNull().default("pending"), // pending, in_progress, completed, failed, partial
    priority: (0, pg_core_1.integer)("priority").notNull().default(1), // 1=high, 2=normal, 3=low
    // Progress tracking
    totalSteps: (0, pg_core_1.integer)("total_steps").default(0),
    completedSteps: (0, pg_core_1.integer)("completed_steps").default(0),
    currentStep: (0, pg_core_1.text)("current_step"),
    // Job details
    jobType: (0, pg_core_1.text)("job_type").notNull(), // 'full_sync', 'shows_only', 'catalog_only', 'update'
    metadata: (0, pg_core_1.jsonb)("metadata"), // Additional job-specific data
    error: (0, pg_core_1.text)("error"),
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    startedAt: (0, pg_core_1.timestamp)("started_at"),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    // Feature flags
    autoRetry: (0, pg_core_1.boolean)("auto_retry").default(true),
    maxRetries: (0, pg_core_1.integer)("max_retries").default(3),
    retryCount: (0, pg_core_1.integer)("retry_count").default(0),
});
exports.syncProgress = (0, pg_core_1.pgTable)("sync_progress", {
    id: (0, pg_core_1.text)("id")
        .primaryKey()
        .$defaultFn(() => (0, cuid2_1.createId)()),
    jobId: (0, pg_core_1.text)("job_id")
        .notNull()
        .references(() => exports.syncJobs.id, { onDelete: "cascade" }),
    // Progress details
    step: (0, pg_core_1.text)("step").notNull(), // 'fetching_artist', 'importing_shows', 'syncing_songs'
    status: (0, pg_core_1.text)("status").notNull(), // 'pending', 'in_progress', 'completed', 'failed'
    progress: (0, pg_core_1.integer)("progress").default(0), // 0-100
    message: (0, pg_core_1.text)("message"),
    // Data counts
    totalItems: (0, pg_core_1.integer)("total_items").default(0),
    processedItems: (0, pg_core_1.integer)("processed_items").default(0),
    successfulItems: (0, pg_core_1.integer)("successful_items").default(0),
    failedItems: (0, pg_core_1.integer)("failed_items").default(0),
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
