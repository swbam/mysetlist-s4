import {
  boolean,
  date,
  inet,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// Enums for admin tables
export const systemHealthStatusEnum = pgEnum("system_health_status", [
  "healthy",
  "degraded",
  "down",
]);
export const moderationStatusEnum = pgEnum("moderation_status", [
  "pending",
  "approved",
  "rejected",
  "flagged",
]);
export const priorityEnum = pgEnum("priority_level", [
  "low",
  "medium",
  "high",
  "urgent",
]);
export const reportStatusEnum = pgEnum("report_status", [
  "pending",
  "investigating",
  "resolved",
  "dismissed",
]);
export const notificationSeverityEnum = pgEnum("notification_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);
export const backupStatusEnum = pgEnum("backup_status", [
  "in_progress",
  "completed",
  "failed",
]);

export const importStageEnum = pgEnum("import_stage", [
  "initializing",
  "syncing-identifiers", 
  "importing-songs",
  "importing-shows",
  "creating-setlists",
  "completed",
  "failed",
]);

// System health monitoring
export const systemHealth = pgTable("system_health", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceName: varchar("service_name", { length: 100 }).notNull(),
  status: systemHealthStatusEnum("status").notNull(),
  responseTime: integer("response_time"), // milliseconds
  errorCount: integer("error_count").default(0),
  lastCheck: timestamp("last_check").defaultNow(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Content moderation
export const contentModeration = pgTable("content_moderation", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentType: varchar("content_type", { length: 50 }).notNull(),
  contentId: uuid("content_id").notNull(),
  status: moderationStatusEnum("status").default("pending").notNull(),
  moderatorId: uuid("moderator_id").references(() => users.id),
  reason: text("reason"),
  actionTaken: varchar("action_taken", { length: 100 }),
  priority: priorityEnum("priority").default("medium"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User reports
export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id").references(() => users.id),
  contentType: varchar("content_type", { length: 50 }).notNull(),
  contentId: uuid("content_id").notNull(),
  reason: varchar("reason", { length: 100 }).notNull(),
  description: text("description"),
  status: reportStatusEnum("status").default("pending").notNull(),
  assignedTo: uuid("assigned_to").references(() => users.id),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Moderation activity logs
export const moderationLogs = pgTable("moderation_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  moderatorId: uuid("moderator_id")
    .references(() => users.id)
    .notNull(),
  targetType: varchar("target_type", { length: 50 }).notNull(),
  targetId: uuid("target_id").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  reason: text("reason"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Platform statistics
export const platformStats = pgTable(
  "platform_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    statDate: date("stat_date").notNull(),
    totalUsers: integer("total_users").default(0),
    activeUsers: integer("active_users").default(0),
    newUsers: integer("new_users").default(0),
    totalShows: integer("total_shows").default(0),
    newShows: integer("new_shows").default(0),
    totalSetlists: integer("total_setlists").default(0),
    newSetlists: integer("new_setlists").default(0),
    totalVotes: integer("total_votes").default(0),
    newVotes: integer("new_votes").default(0),
    newReviews: integer("new_reviews").default(0),
    newPhotos: integer("new_photos").default(0),
    apiCalls: integer("api_calls").default(0),
    storageUsedMb: integer("storage_used_mb").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueStatDate: unique().on(table.statDate),
  }),
);

// User activity logs
export const userActivityLog = pgTable("user_activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("target_type", { length: 50 }),
  targetId: uuid("target_id"),
  details: jsonb("details"),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Admin notifications
export const adminNotifications = pgTable("admin_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  severity: notificationSeverityEnum("severity").default("medium"),
  read: boolean("read").default(false),
  actionable: boolean("actionable").default(false),
  actionUrl: text("action_url"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Data backup tracking
export const dataBackups = pgTable("data_backups", {
  id: uuid("id").primaryKey().defaultRandom(),
  backupType: varchar("backup_type", { length: 50 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSizeMb: integer("file_size_mb"),
  compressionType: varchar("compression_type", { length: 20 }),
  status: backupStatusEnum("status").default("in_progress").notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
});

// Import status tracking for artist imports
export const importStatus = pgTable("import_status", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: varchar("artist_id", { length: 255 }).notNull(), // Can be temp ID like "tmp_123" or real UUID
  stage: importStageEnum("stage").notNull(),
  percentage: integer("percentage").default(0),
  message: text("message"),
  error: text("error"),
  jobId: varchar("job_id", { length: 255 }),
  totalSongs: integer("total_songs").default(0),
  totalShows: integer("total_shows").default(0),
  totalVenues: integer("total_venues").default(0),
  artistName: varchar("artist_name", { length: 255 }),
  startedAt: timestamp("started_at"),
  phaseTimings: jsonb("phase_timings"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Log level enum
export const logLevelEnum = pgEnum("log_level", [
  "info",
  "warning",
  "error",
  "success",
  "debug",
]);

// Import logs for detailed tracking
export const importLogs = pgTable("import_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: varchar("artist_id", { length: 255 }).notNull(),
  artistName: varchar("artist_name", { length: 255 }),
  ticketmasterId: varchar("ticketmaster_id", { length: 255 }),
  spotifyId: varchar("spotify_id", { length: 255 }),
  jobId: varchar("job_id", { length: 255 }),
  
  // Log details
  level: logLevelEnum("level").notNull(),
  stage: varchar("stage", { length: 50 }).notNull(),
  message: text("message").notNull(),
  details: jsonb("details"),
  
  // Metrics
  itemsProcessed: integer("items_processed").default(0),
  itemsTotal: integer("items_total"),
  durationMs: integer("duration_ms"),
  
  // Error tracking
  errorCode: varchar("error_code", { length: 50 }),
  errorStack: text("error_stack"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Export types
export type ImportStatus = typeof importStatus.$inferSelect;
export type InsertImportStatus = typeof importStatus.$inferInsert;
export type ImportLog = typeof importLogs.$inferSelect;
export type InsertImportLog = typeof importLogs.$inferInsert;

// Tables are exported individually above
