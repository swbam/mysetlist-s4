import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ETL job status
export const etlJobStatusEnum = pgEnum("etl_job_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
  "retrying",
]);

// Data source types
export const dataSourceTypeEnum = pgEnum("data_source_type", [
  "database",
  "api",
  "file",
  "stream",
  "webhook",
]);

// Aggregation types
export const aggregationTypeEnum = pgEnum("aggregation_type", [
  "sum",
  "avg",
  "min",
  "max",
  "count",
  "distinct_count",
  "percentile",
  "stddev",
]);

// ETL Jobs
export const etlJobs = pgTable(
  "etl_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(), // analytics, email, sync, archive
    schedule: varchar("schedule", { length: 100 }), // Cron expression
    status: etlJobStatusEnum("status").default("pending").notNull(),
    lastRunAt: timestamp("last_run_at"),
    nextRunAt: timestamp("next_run_at"),
    configuration: jsonb("configuration").notNull(),
    retryCount: integer("retry_count").default(0),
    maxRetries: integer("max_retries").default(3),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("idx_etl_jobs_status").on(table.status),
    nextRunIdx: index("idx_etl_jobs_next_run").on(table.nextRunAt),
    activeIdx: index("idx_etl_jobs_active").on(table.isActive),
  }),
);

// ETL Job Runs
export const etlJobRuns = pgTable(
  "etl_job_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .references(() => etlJobs.id)
      .notNull(),
    status: etlJobStatusEnum("status").default("running").notNull(),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    duration: integer("duration"), // in seconds
    recordsProcessed: integer("records_processed").default(0),
    recordsFailed: integer("records_failed").default(0),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata"),
    metrics: jsonb("metrics"), // Performance metrics
  },
  (table) => ({
    jobIdx: index("idx_etl_runs_job").on(table.jobId),
    statusIdx: index("idx_etl_runs_status").on(table.status),
    startedIdx: index("idx_etl_runs_started").on(table.startedAt),
  }),
);

// Data Sources
export const dataSources = pgTable(
  "data_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    type: dataSourceTypeEnum("type").notNull(),
    connectionString: text("connection_string"), // Encrypted
    configuration: jsonb("configuration").notNull(),
    isActive: boolean("is_active").default(true),
    lastSyncAt: timestamp("last_sync_at"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index("idx_data_sources_type").on(table.type),
    activeIdx: index("idx_data_sources_active").on(table.isActive),
  }),
);

// Materialized Views Registry
export const materializedViews = pgTable(
  "materialized_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    viewName: varchar("view_name", { length: 100 }).notNull().unique(),
    description: text("description"),
    query: text("query").notNull(),
    refreshSchedule: varchar("refresh_schedule", { length: 100 }), // Cron expression
    lastRefreshedAt: timestamp("last_refreshed_at"),
    nextRefreshAt: timestamp("next_refresh_at"),
    refreshDuration: integer("refresh_duration"), // in seconds
    isActive: boolean("is_active").default(true),
    dependencies: jsonb("dependencies"), // Other views/tables this depends on
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    activeIdx: index("idx_mat_views_active").on(table.isActive),
    nextRefreshIdx: index("idx_mat_views_refresh").on(table.nextRefreshAt),
  }),
);

// Data Warehouse Facts Table
export const factEvents = pgTable(
  "fact_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventDate: timestamp("event_date").notNull(),
    eventHour: integer("event_hour").notNull(), // 0-23

    // Dimensions
    userId: uuid("user_id"),
    sessionId: uuid("session_id"),
    artistId: uuid("artist_id"),
    showId: uuid("show_id"),
    venueId: uuid("venue_id"),

    // Event details
    eventType: varchar("event_type", { length: 50 }).notNull(),
    eventCategory: varchar("event_category", { length: 50 }),

    // Metrics
    eventCount: integer("event_count").default(1),
    eventValue: doublePrecision("event_value"),

    // User attributes at time of event
    userCountry: varchar("user_country", { length: 2 }),
    userRegion: varchar("user_region", { length: 100 }),
    deviceType: varchar("device_type", { length: 20 }),
    browser: varchar("browser", { length: 50 }),
    os: varchar("os", { length: 50 }),

    // Additional context
    metadata: jsonb("metadata"),
    processedAt: timestamp("processed_at").defaultNow().notNull(),
  },
  (table) => ({
    dateIdx: index("idx_fact_events_date").on(table.eventDate),
    userIdx: index("idx_fact_events_user").on(table.userId),
    artistIdx: index("idx_fact_events_artist").on(table.artistId),
    typeIdx: index("idx_fact_events_type").on(table.eventType),
  }),
);

// Dimension Tables
export const dimDate = pgTable(
  "dim_date",
  {
    dateKey: integer("date_key").primaryKey(), // YYYYMMDD format
    fullDate: timestamp("full_date").notNull(),
    year: integer("year").notNull(),
    quarter: integer("quarter").notNull(),
    month: integer("month").notNull(),
    week: integer("week").notNull(),
    dayOfMonth: integer("day_of_month").notNull(),
    dayOfWeek: integer("day_of_week").notNull(),
    dayName: varchar("day_name", { length: 10 }).notNull(),
    monthName: varchar("month_name", { length: 10 }).notNull(),
    isWeekend: boolean("is_weekend").notNull(),
    isHoliday: boolean("is_holiday").default(false),
    holidayName: varchar("holiday_name", { length: 50 }),
  },
  (table) => ({
    fullDateIdx: index("idx_dim_date_full").on(table.fullDate),
    yearMonthIdx: index("idx_dim_date_ym").on(table.year, table.month),
  }),
);

// Pre-aggregated metrics
export const aggregatedMetrics = pgTable(
  "aggregated_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    metricName: varchar("metric_name", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }), // artist, show, venue, user, global
    entityId: uuid("entity_id"),
    periodType: varchar("period_type", { length: 20 }).notNull(), // hour, day, week, month
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),

    // Aggregated values
    metrics: jsonb("metrics").notNull(), // Flexible JSON for different metric types

    calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
  },
  (table) => ({
    metricEntityIdx: index("idx_agg_metrics_entity").on(
      table.metricName,
      table.entityType,
      table.entityId,
    ),
    periodIdx: index("idx_agg_metrics_period").on(
      table.periodType,
      table.periodStart,
    ),
  }),
);

// Data retention policies
export const dataRetentionPolicies = pgTable(
  "data_retention_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tableName: varchar("table_name", { length: 100 }).notNull().unique(),
    retentionDays: integer("retention_days").notNull(),
    archiveEnabled: boolean("archive_enabled").default(false),
    archiveTableName: varchar("archive_table_name", { length: 100 }),
    deleteEnabled: boolean("delete_enabled").default(true),
    lastRunAt: timestamp("last_run_at"),
    nextRunAt: timestamp("next_run_at"),
    isActive: boolean("is_active").default(true),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    activeIdx: index("idx_retention_active").on(table.isActive),
    nextRunIdx: index("idx_retention_next_run").on(table.nextRunAt),
  }),
);

// Data lineage tracking
export const dataLineage = pgTable(
  "data_lineage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceTable: varchar("source_table", { length: 100 }).notNull(),
    targetTable: varchar("target_table", { length: 100 }).notNull(),
    transformationType: varchar("transformation_type", {
      length: 50,
    }).notNull(),
    jobId: uuid("job_id").references(() => etlJobs.id),
    recordCount: integer("record_count"),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time"),
    metadata: jsonb("metadata"),
  },
  (table) => ({
    sourceIdx: index("idx_lineage_source").on(table.sourceTable),
    targetIdx: index("idx_lineage_target").on(table.targetTable),
    jobIdx: index("idx_lineage_job").on(table.jobId),
  }),
);

// Stream processing checkpoints
export const streamCheckpoints = pgTable(
  "stream_checkpoints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    streamName: varchar("stream_name", { length: 100 }).notNull(),
    partitionKey: varchar("partition_key", { length: 100 }).notNull(),
    offset: varchar("offset", { length: 100 }).notNull(),
    processedAt: timestamp("processed_at").defaultNow().notNull(),
    metadata: jsonb("metadata"),
  },
  (table) => ({
    streamPartitionIdx: index("idx_checkpoint_stream").on(
      table.streamName,
      table.partitionKey,
    ),
  }),
);

// Data quality metrics
export const dataQualityMetrics = pgTable(
  "data_quality_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tableName: varchar("table_name", { length: 100 }).notNull(),
    columnName: varchar("column_name", { length: 100 }),
    metricType: varchar("metric_type", { length: 50 }).notNull(), // completeness, uniqueness, validity, accuracy
    metricValue: doublePrecision("metric_value").notNull(),
    threshold: doublePrecision("threshold"),
    status: varchar("status", { length: 20 }).notNull(), // pass, fail, warning
    details: jsonb("details"),
    measuredAt: timestamp("measured_at").defaultNow().notNull(),
  },
  (table) => ({
    tableColumnIdx: index("idx_quality_table_col").on(
      table.tableName,
      table.columnName,
    ),
    statusIdx: index("idx_quality_status").on(table.status),
    measuredIdx: index("idx_quality_measured").on(table.measuredAt),
  }),
);
