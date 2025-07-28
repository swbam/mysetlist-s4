import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"
import { artists } from "./artists"
import { setlists } from "./setlists"
import { shows } from "./shows"
import { users } from "./users"
import { venues } from "./venues"

// Enums for analytics
export const eventTypeEnum = pgEnum("event_type", [
  "page_view",
  "search",
  "artist_view",
  "show_view",
  "venue_view",
  "setlist_view",
  "song_vote",
  "setlist_vote",
  "artist_follow",
  "artist_unfollow",
  "show_attendance",
  "review_created",
  "photo_uploaded",
  "share",
  "external_link_click",
  "notification_click",
  "email_open",
  "email_click",
  "app_open",
  "session_start",
  "session_end",
])

export const deviceTypeEnum = pgEnum("device_type", [
  "desktop",
  "mobile",
  "tablet",
  "tv",
  "bot",
  "unknown",
])

export const aggregationPeriodEnum = pgEnum("aggregation_period", [
  "minute",
  "hour",
  "day",
  "week",
  "month",
  "quarter",
  "year",
])

// Core event tracking table
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    sessionId: uuid("session_id").notNull(),
    eventType: eventTypeEnum("event_type").notNull(),
    eventCategory: varchar("event_category", { length: 50 }),
    eventAction: varchar("event_action", { length: 100 }),
    eventLabel: varchar("event_label", { length: 255 }),
    eventValue: doublePrecision("event_value"),

    // Entity references
    artistId: uuid("artist_id").references(() => artists.id),
    showId: uuid("show_id").references(() => shows.id),
    venueId: uuid("venue_id").references(() => venues.id),
    setlistId: uuid("setlist_id").references(() => setlists.id),

    // Context data
    pageUrl: text("page_url"),
    referrerUrl: text("referrer_url"),
    userAgent: text("user_agent"),
    ipAddress: varchar("ip_address", { length: 45 }),
    country: varchar("country", { length: 2 }),
    region: varchar("region", { length: 100 }),
    city: varchar("city", { length: 100 }),
    deviceType: deviceTypeEnum("device_type"),
    browser: varchar("browser", { length: 50 }),
    os: varchar("os", { length: 50 }),

    // Additional metadata
    metadata: jsonb("metadata"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    processedAt: timestamp("processed_at"),
  },
  (table) => ({
    // Indexes for common queries
    timestampIdx: index("idx_events_timestamp").on(table.timestamp),
    userIdIdx: index("idx_events_user_id").on(table.userId),
    sessionIdIdx: index("idx_events_session_id").on(table.sessionId),
    eventTypeIdx: index("idx_events_type").on(table.eventType),
    artistIdIdx: index("idx_events_artist_id").on(table.artistId),
    showIdIdx: index("idx_events_show_id").on(table.showId),
    processedIdx: index("idx_events_processed").on(table.processedAt),
  })
)

// User sessions table
export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    sessionStart: timestamp("session_start").defaultNow().notNull(),
    sessionEnd: timestamp("session_end"),
    duration: integer("duration"), // in seconds
    pageViews: integer("page_views").default(0),
    events: integer("events").default(0),
    deviceType: deviceTypeEnum("device_type"),
    browser: varchar("browser", { length: 50 }),
    os: varchar("os", { length: 50 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    country: varchar("country", { length: 2 }),
    isAuthenticated: boolean("is_authenticated").default(false),
    metadata: jsonb("metadata"),
  },
  (table) => ({
    userIdIdx: index("idx_sessions_user_id").on(table.userId),
    startIdx: index("idx_sessions_start").on(table.sessionStart),
  })
)

// Aggregated analytics tables
export const pageViewStats = pgTable(
  "page_view_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    period: aggregationPeriodEnum("period").notNull(),
    periodStart: timestamp("period_start").notNull(),
    pageUrl: text("page_url").notNull(),
    views: integer("views").default(0),
    uniqueVisitors: integer("unique_visitors").default(0),
    avgTimeOnPage: doublePrecision("avg_time_on_page"),
    bounceRate: doublePrecision("bounce_rate"),
    exitRate: doublePrecision("exit_rate"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    periodIdx: index("idx_page_stats_period").on(
      table.period,
      table.periodStart
    ),
    urlIdx: index("idx_page_stats_url").on(table.pageUrl),
  })
)

export const artistAnalytics = pgTable(
  "artist_analytics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    artistId: uuid("artist_id")
      .references(() => artists.id)
      .notNull(),
    period: aggregationPeriodEnum("period").notNull(),
    periodStart: timestamp("period_start").notNull(),

    // Engagement metrics
    profileViews: integer("profile_views").default(0),
    uniqueViewers: integer("unique_viewers").default(0),
    follows: integer("follows").default(0),
    unfollows: integer("unfollows").default(0),
    showViews: integer("show_views").default(0),
    setlistViews: integer("setlist_views").default(0),
    songVotes: integer("song_votes").default(0),
    shares: integer("shares").default(0),

    // Trending metrics
    trendingScore: doublePrecision("trending_score").default(0),
    growthRate: doublePrecision("growth_rate"),
    engagementRate: doublePrecision("engagement_rate"),

    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    artistPeriodIdx: index("idx_artist_analytics_period").on(
      table.artistId,
      table.period,
      table.periodStart
    ),
    trendingIdx: index("idx_artist_analytics_trending").on(table.trendingScore),
  })
)

export const showAnalytics = pgTable(
  "show_analytics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    showId: uuid("show_id")
      .references(() => shows.id)
      .notNull(),
    period: aggregationPeriodEnum("period").notNull(),
    periodStart: timestamp("period_start").notNull(),

    // Engagement metrics
    views: integer("views").default(0),
    uniqueViewers: integer("unique_viewers").default(0),
    attendanceMarked: integer("attendance_marked").default(0),
    setlistViews: integer("setlist_views").default(0),
    votes: integer("votes").default(0),
    shares: integer("shares").default(0),

    // Conversion metrics
    viewToAttendanceRate: doublePrecision("view_to_attendance_rate"),
    viewToVoteRate: doublePrecision("view_to_vote_rate"),

    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    showPeriodIdx: index("idx_show_analytics_period").on(
      table.showId,
      table.period,
      table.periodStart
    ),
  })
)

// Real-time analytics cache
export const realtimeAnalytics = pgTable(
  "realtime_analytics",
  {
    key: varchar("key", { length: 255 }).primaryKey(),
    value: jsonb("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    expiresIdx: index("idx_realtime_expires").on(table.expiresAt),
  })
)

// ML model results for recommendations
export const userRecommendations = pgTable(
  "user_recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    recommendationType: varchar("recommendation_type", {
      length: 50,
    }).notNull(), // 'artist', 'show', 'venue'
    recommendationId: uuid("recommendation_id").notNull(),
    score: doublePrecision("score").notNull(),
    reason: text("reason"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => ({
    userTypeIdx: index("idx_recommendations_user_type").on(
      table.userId,
      table.recommendationType
    ),
    scoreIdx: index("idx_recommendations_score").on(table.score),
    expiresIdx: index("idx_recommendations_expires").on(table.expiresAt),
  })
)

// A/B testing experiments
export const experiments = pgTable("experiments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, running, paused, completed
  variants: jsonb("variants").notNull(), // Array of variant configurations
  trafficAllocation: jsonb("traffic_allocation").notNull(), // Percentage per variant
  successMetrics: jsonb("success_metrics").notNull(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const experimentAssignments = pgTable(
  "experiment_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    experimentId: uuid("experiment_id")
      .references(() => experiments.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    variant: varchar("variant", { length: 50 }).notNull(),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  },
  (table) => ({
    experimentUserIdx: index("idx_exp_assignments").on(
      table.experimentId,
      table.userId
    ),
    pk: primaryKey({ columns: [table.experimentId, table.userId] }),
  })
)

export const experimentResults = pgTable(
  "experiment_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    experimentId: uuid("experiment_id")
      .references(() => experiments.id)
      .notNull(),
    variant: varchar("variant", { length: 50 }).notNull(),
    metric: varchar("metric", { length: 100 }).notNull(),
    value: doublePrecision("value").notNull(),
    sampleSize: integer("sample_size").notNull(),
    confidence: doublePrecision("confidence"),
    pValue: doublePrecision("p_value"),
    calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
  },
  (table) => ({
    experimentVariantIdx: index("idx_exp_results").on(
      table.experimentId,
      table.variant
    ),
  })
)

// Data quality monitoring
export const dataQualityChecks = pgTable(
  "data_quality_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    checkName: varchar("check_name", { length: 100 }).notNull(),
    tableName: varchar("table_name", { length: 100 }).notNull(),
    checkType: varchar("check_type", { length: 50 }).notNull(), // completeness, accuracy, consistency, timeliness
    status: varchar("status", { length: 20 }).notNull(), // passed, failed, warning
    details: jsonb("details"),
    rowsChecked: integer("rows_checked"),
    issuesFound: integer("issues_found"),
    runAt: timestamp("run_at").defaultNow().notNull(),
  },
  (table) => ({
    runAtIdx: index("idx_quality_checks_run").on(table.runAt),
    statusIdx: index("idx_quality_checks_status").on(table.status),
  })
)

// Anomaly detection results
export const anomalies = pgTable(
  "anomalies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    metricName: varchar("metric_name", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }), // artist, show, venue, user
    entityId: uuid("entity_id"),
    expectedValue: doublePrecision("expected_value").notNull(),
    actualValue: doublePrecision("actual_value").notNull(),
    deviation: doublePrecision("deviation").notNull(),
    severity: varchar("severity", { length: 20 }).notNull(), // low, medium, high, critical
    detectedAt: timestamp("detected_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
    metadata: jsonb("metadata"),
  },
  (table) => ({
    detectedIdx: index("idx_anomalies_detected").on(table.detectedAt),
    severityIdx: index("idx_anomalies_severity").on(table.severity),
    entityIdx: index("idx_anomalies_entity").on(
      table.entityType,
      table.entityId
    ),
  })
)
