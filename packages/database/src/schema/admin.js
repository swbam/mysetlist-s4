"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importLogs = exports.logLevelEnum = exports.importStatus = exports.dataBackups = exports.adminNotifications = exports.userActivityLog = exports.platformStats = exports.moderationLogs = exports.reports = exports.contentModeration = exports.systemHealth = exports.importStageEnum = exports.backupStatusEnum = exports.notificationSeverityEnum = exports.reportStatusEnum = exports.priorityEnum = exports.moderationStatusEnum = exports.systemHealthStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
const artists_1 = require("./artists");
// Enums for admin tables
exports.systemHealthStatusEnum = (0, pg_core_1.pgEnum)("system_health_status", [
    "healthy",
    "degraded",
    "down",
]);
exports.moderationStatusEnum = (0, pg_core_1.pgEnum)("moderation_status", [
    "pending",
    "approved",
    "rejected",
    "flagged",
]);
exports.priorityEnum = (0, pg_core_1.pgEnum)("priority_level", [
    "low",
    "medium",
    "high",
    "urgent",
]);
exports.reportStatusEnum = (0, pg_core_1.pgEnum)("report_status", [
    "pending",
    "investigating",
    "resolved",
    "dismissed",
]);
exports.notificationSeverityEnum = (0, pg_core_1.pgEnum)("notification_severity", [
    "low",
    "medium",
    "high",
    "critical",
]);
exports.backupStatusEnum = (0, pg_core_1.pgEnum)("backup_status", [
    "in_progress",
    "completed",
    "failed",
]);
exports.importStageEnum = (0, pg_core_1.pgEnum)("import_stage", [
    "initializing",
    "syncing-identifiers",
    "importing-songs",
    "importing-shows",
    "creating-setlists",
    "completed",
    "failed",
]);
// System health monitoring
exports.systemHealth = (0, pg_core_1.pgTable)("system_health", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    serviceName: (0, pg_core_1.varchar)("service_name", { length: 100 }).notNull(),
    status: (0, exports.systemHealthStatusEnum)("status").notNull(),
    responseTime: (0, pg_core_1.integer)("response_time"), // milliseconds
    errorCount: (0, pg_core_1.integer)("error_count").default(0),
    lastCheck: (0, pg_core_1.timestamp)("last_check").defaultNow(),
    metadata: (0, pg_core_1.jsonb)("metadata"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// Content moderation
exports.contentModeration = (0, pg_core_1.pgTable)("content_moderation", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    contentType: (0, pg_core_1.varchar)("content_type", { length: 50 }).notNull(),
    contentId: (0, pg_core_1.uuid)("content_id").notNull(),
    status: (0, exports.moderationStatusEnum)("status").default("pending").notNull(),
    moderatorId: (0, pg_core_1.uuid)("moderator_id").references(() => users_1.users.id),
    reason: (0, pg_core_1.text)("reason"),
    actionTaken: (0, pg_core_1.varchar)("action_taken", { length: 100 }),
    priority: (0, exports.priorityEnum)("priority").default("medium"),
    metadata: (0, pg_core_1.jsonb)("metadata"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// User reports
exports.reports = (0, pg_core_1.pgTable)("reports", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    reporterId: (0, pg_core_1.uuid)("reporter_id").references(() => users_1.users.id),
    contentType: (0, pg_core_1.varchar)("content_type", { length: 50 }).notNull(),
    contentId: (0, pg_core_1.uuid)("content_id").notNull(),
    reason: (0, pg_core_1.varchar)("reason", { length: 100 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    status: (0, exports.reportStatusEnum)("status").default("pending").notNull(),
    assignedTo: (0, pg_core_1.uuid)("assigned_to").references(() => users_1.users.id),
    resolution: (0, pg_core_1.text)("resolution"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// Moderation activity logs
exports.moderationLogs = (0, pg_core_1.pgTable)("moderation_logs", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    moderatorId: (0, pg_core_1.uuid)("moderator_id")
        .references(() => users_1.users.id)
        .notNull(),
    targetType: (0, pg_core_1.varchar)("target_type", { length: 50 }).notNull(),
    targetId: (0, pg_core_1.uuid)("target_id").notNull(),
    action: (0, pg_core_1.varchar)("action", { length: 100 }).notNull(),
    reason: (0, pg_core_1.text)("reason"),
    details: (0, pg_core_1.jsonb)("details"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// Platform statistics
exports.platformStats = (0, pg_core_1.pgTable)("platform_stats", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    statDate: (0, pg_core_1.date)("stat_date").notNull(),
    totalUsers: (0, pg_core_1.integer)("total_users").default(0),
    activeUsers: (0, pg_core_1.integer)("active_users").default(0),
    newUsers: (0, pg_core_1.integer)("new_users").default(0),
    totalShows: (0, pg_core_1.integer)("total_shows").default(0),
    newShows: (0, pg_core_1.integer)("new_shows").default(0),
    totalSetlists: (0, pg_core_1.integer)("total_setlists").default(0),
    newSetlists: (0, pg_core_1.integer)("new_setlists").default(0),
    totalVotes: (0, pg_core_1.integer)("total_votes").default(0),
    newVotes: (0, pg_core_1.integer)("new_votes").default(0),
    newReviews: (0, pg_core_1.integer)("new_reviews").default(0),
    newPhotos: (0, pg_core_1.integer)("new_photos").default(0),
    apiCalls: (0, pg_core_1.integer)("api_calls").default(0),
    storageUsedMb: (0, pg_core_1.integer)("storage_used_mb").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => ({
    uniqueStatDate: (0, pg_core_1.unique)().on(table.statDate),
}));
// User activity logs
exports.userActivityLog = (0, pg_core_1.pgTable)("user_activity_log", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => users_1.users.id),
    action: (0, pg_core_1.varchar)("action", { length: 100 }).notNull(),
    targetType: (0, pg_core_1.varchar)("target_type", { length: 50 }),
    targetId: (0, pg_core_1.uuid)("target_id"),
    details: (0, pg_core_1.jsonb)("details"),
    ipAddress: (0, pg_core_1.inet)("ip_address"),
    userAgent: (0, pg_core_1.text)("user_agent"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// Admin notifications
exports.adminNotifications = (0, pg_core_1.pgTable)("admin_notifications", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    type: (0, pg_core_1.varchar)("type", { length: 50 }).notNull(),
    title: (0, pg_core_1.varchar)("title", { length: 200 }).notNull(),
    message: (0, pg_core_1.text)("message").notNull(),
    severity: (0, exports.notificationSeverityEnum)("severity").default("medium"),
    read: (0, pg_core_1.boolean)("read").default(false),
    actionable: (0, pg_core_1.boolean)("actionable").default(false),
    actionUrl: (0, pg_core_1.text)("action_url"),
    metadata: (0, pg_core_1.jsonb)("metadata"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// Data backup tracking
exports.dataBackups = (0, pg_core_1.pgTable)("data_backups", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    backupType: (0, pg_core_1.varchar)("backup_type", { length: 50 }).notNull(),
    filePath: (0, pg_core_1.text)("file_path").notNull(),
    fileSizeMb: (0, pg_core_1.integer)("file_size_mb"),
    compressionType: (0, pg_core_1.varchar)("compression_type", { length: 20 }),
    status: (0, exports.backupStatusEnum)("status").default("in_progress").notNull(),
    startedAt: (0, pg_core_1.timestamp)("started_at").defaultNow(),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
    errorMessage: (0, pg_core_1.text)("error_message"),
    metadata: (0, pg_core_1.jsonb)("metadata"),
});
// Import status tracking for artist imports
exports.importStatus = (0, pg_core_1.pgTable)("import_status", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    artistId: (0, pg_core_1.uuid)("artist_id")
        .references(() => artists_1.artists.id, { onDelete: "cascade" })
        .notNull()
        .unique(),
    stage: (0, exports.importStageEnum)("stage").notNull(),
    percentage: (0, pg_core_1.integer)("percentage").default(0), // Database column name
    message: (0, pg_core_1.text)("message"),
    error: (0, pg_core_1.text)("error"),
    jobId: (0, pg_core_1.varchar)("job_id", { length: 255 }),
    totalSongs: (0, pg_core_1.integer)("total_songs").default(0),
    totalShows: (0, pg_core_1.integer)("total_shows").default(0),
    totalVenues: (0, pg_core_1.integer)("total_venues").default(0),
    artistName: (0, pg_core_1.varchar)("artist_name", { length: 255 }),
    startedAt: (0, pg_core_1.timestamp)("started_at"),
    phaseTimings: (0, pg_core_1.jsonb)("phase_timings"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
}, (table) => ({
    artistIdIdx: (0, pg_core_1.index)("idx_import_status_artist").on(table.artistId),
}));
// Log level enum
exports.logLevelEnum = (0, pg_core_1.pgEnum)("log_level", [
    "info",
    "warning",
    "error",
    "success",
    "debug",
]);
// Import logs for detailed tracking
exports.importLogs = (0, pg_core_1.pgTable)("import_logs", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    artistId: (0, pg_core_1.varchar)("artist_id", { length: 255 }).notNull(),
    artistName: (0, pg_core_1.varchar)("artist_name", { length: 255 }),
    ticketmasterId: (0, pg_core_1.varchar)("ticketmaster_id", { length: 255 }),
    spotifyId: (0, pg_core_1.varchar)("spotify_id", { length: 255 }),
    jobId: (0, pg_core_1.varchar)("job_id", { length: 255 }),
    // Log details
    level: (0, exports.logLevelEnum)("level").notNull(),
    stage: (0, pg_core_1.varchar)("stage", { length: 50 }).notNull(),
    message: (0, pg_core_1.text)("message").notNull(),
    details: (0, pg_core_1.jsonb)("details"),
    // Metrics
    itemsProcessed: (0, pg_core_1.integer)("items_processed").default(0),
    itemsTotal: (0, pg_core_1.integer)("items_total"),
    durationMs: (0, pg_core_1.integer)("duration_ms"),
    // Error tracking
    errorCode: (0, pg_core_1.varchar)("error_code", { length: 50 }),
    errorStack: (0, pg_core_1.text)("error_stack"),
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// Tables are exported individually above
