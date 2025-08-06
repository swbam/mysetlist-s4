import { pgTable, text, timestamp, jsonb, boolean, integer } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { artists } from "./artists";

export const syncJobs = pgTable("sync_jobs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  entityType: text("entity_type").notNull(), // 'artist', 'venue', 'show'
  entityId: text("entity_id").notNull(),
  spotifyId: text("spotify_id"),
  ticketmasterId: text("ticketmaster_id"),
  setlistfmId: text("setlistfm_id"),
  
  // Status tracking
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, failed, partial
  priority: integer("priority").notNull().default(1), // 1=high, 2=normal, 3=low
  
  // Progress tracking
  totalSteps: integer("total_steps").default(0),
  completedSteps: integer("completed_steps").default(0),
  currentStep: text("current_step"),
  
  // Job details
  jobType: text("job_type").notNull(), // 'full_sync', 'shows_only', 'catalog_only', 'update'
  metadata: jsonb("metadata"), // Additional job-specific data
  error: text("error"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  
  // Feature flags
  autoRetry: boolean("auto_retry").default(true),
  maxRetries: integer("max_retries").default(3),
  retryCount: integer("retry_count").default(0),
});

export const syncProgress = pgTable("sync_progress", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  jobId: text("job_id").notNull().references(() => syncJobs.id, { onDelete: "cascade" }),
  
  // Progress details
  step: text("step").notNull(), // 'fetching_artist', 'importing_shows', 'syncing_songs'
  status: text("status").notNull(), // 'pending', 'in_progress', 'completed', 'failed'
  progress: integer("progress").default(0), // 0-100
  message: text("message"),
  
  // Data counts
  totalItems: integer("total_items").default(0),
  processedItems: integer("processed_items").default(0),
  successfulItems: integer("successful_items").default(0),
  failedItems: integer("failed_items").default(0),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SyncJob = typeof syncJobs.$inferSelect;
export type InsertSyncJob = typeof syncJobs.$inferInsert;
export type SyncProgress = typeof syncProgress.$inferSelect;
export type InsertSyncProgress = typeof syncProgress.$inferInsert;