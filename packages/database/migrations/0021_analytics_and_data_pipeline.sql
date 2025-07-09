-- Analytics and Data Pipeline Tables
-- This migration adds comprehensive analytics tracking, data warehouse structures, and pipeline management

-- Create enums for analytics
CREATE TYPE "event_type" AS ENUM (
  'page_view',
  'search',
  'artist_view',
  'show_view',
  'venue_view',
  'setlist_view',
  'song_vote',
  'setlist_vote',
  'artist_follow',
  'artist_unfollow',
  'show_attendance',
  'review_created',
  'photo_uploaded',
  'share',
  'external_link_click',
  'notification_click',
  'email_open',
  'email_click',
  'app_open',
  'session_start',
  'session_end'
);

CREATE TYPE "device_type" AS ENUM (
  'desktop',
  'mobile',
  'tablet',
  'tv',
  'bot',
  'unknown'
);

CREATE TYPE "aggregation_period" AS ENUM (
  'minute',
  'hour',
  'day',
  'week',
  'month',
  'quarter',
  'year'
);

-- Core event tracking table
CREATE TABLE "events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID REFERENCES "users"("id"),
  "session_id" UUID NOT NULL,
  "event_type" "event_type" NOT NULL,
  "event_category" VARCHAR(50),
  "event_action" VARCHAR(100),
  "event_label" VARCHAR(255),
  "event_value" DOUBLE PRECISION,
  
  -- Entity references
  "artist_id" UUID REFERENCES "artists"("id"),
  "show_id" UUID REFERENCES "shows"("id"),
  "venue_id" UUID REFERENCES "venues"("id"),
  "setlist_id" UUID REFERENCES "setlists"("id"),
  
  -- Context data
  "page_url" TEXT,
  "referrer_url" TEXT,
  "user_agent" TEXT,
  "ip_address" VARCHAR(45),
  "country" VARCHAR(2),
  "region" VARCHAR(100),
  "city" VARCHAR(100),
  "device_type" "device_type",
  "browser" VARCHAR(50),
  "os" VARCHAR(50),
  
  -- Additional metadata
  "metadata" JSONB,
  "timestamp" TIMESTAMP NOT NULL DEFAULT NOW(),
  "processed_at" TIMESTAMP
);

-- User sessions table
CREATE TABLE "user_sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID REFERENCES "users"("id"),
  "session_start" TIMESTAMP NOT NULL DEFAULT NOW(),
  "session_end" TIMESTAMP,
  "duration" INTEGER, -- in seconds
  "page_views" INTEGER DEFAULT 0,
  "events" INTEGER DEFAULT 0,
  "device_type" "device_type",
  "browser" VARCHAR(50),
  "os" VARCHAR(50),
  "ip_address" VARCHAR(45),
  "country" VARCHAR(2),
  "is_authenticated" BOOLEAN DEFAULT false,
  "metadata" JSONB
);

-- Aggregated analytics tables
CREATE TABLE "page_view_stats" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "period" "aggregation_period" NOT NULL,
  "period_start" TIMESTAMP NOT NULL,
  "page_url" TEXT NOT NULL,
  "views" INTEGER DEFAULT 0,
  "unique_visitors" INTEGER DEFAULT 0,
  "avg_time_on_page" DOUBLE PRECISION,
  "bounce_rate" DOUBLE PRECISION,
  "exit_rate" DOUBLE PRECISION,
  "metadata" JSONB,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "artist_analytics" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "artist_id" UUID NOT NULL REFERENCES "artists"("id"),
  "period" "aggregation_period" NOT NULL,
  "period_start" TIMESTAMP NOT NULL,
  
  -- Engagement metrics
  "profile_views" INTEGER DEFAULT 0,
  "unique_viewers" INTEGER DEFAULT 0,
  "follows" INTEGER DEFAULT 0,
  "unfollows" INTEGER DEFAULT 0,
  "show_views" INTEGER DEFAULT 0,
  "setlist_views" INTEGER DEFAULT 0,
  "song_votes" INTEGER DEFAULT 0,
  "shares" INTEGER DEFAULT 0,
  
  -- Trending metrics
  "trending_score" DOUBLE PRECISION DEFAULT 0,
  "growth_rate" DOUBLE PRECISION,
  "engagement_rate" DOUBLE PRECISION,
  
  "metadata" JSONB,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "show_analytics" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "show_id" UUID NOT NULL REFERENCES "shows"("id"),
  "period" "aggregation_period" NOT NULL,
  "period_start" TIMESTAMP NOT NULL,
  
  -- Engagement metrics
  "views" INTEGER DEFAULT 0,
  "unique_viewers" INTEGER DEFAULT 0,
  "attendance_marked" INTEGER DEFAULT 0,
  "setlist_views" INTEGER DEFAULT 0,
  "votes" INTEGER DEFAULT 0,
  "shares" INTEGER DEFAULT 0,
  
  -- Conversion metrics
  "view_to_attendance_rate" DOUBLE PRECISION,
  "view_to_vote_rate" DOUBLE PRECISION,
  
  "metadata" JSONB,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Real-time analytics cache
CREATE TABLE "realtime_analytics" (
  "key" VARCHAR(255) PRIMARY KEY,
  "value" JSONB NOT NULL,
  "expires_at" TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ML model results for recommendations
CREATE TABLE "user_recommendations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id"),
  "recommendation_type" VARCHAR(50) NOT NULL, -- 'artist', 'show', 'venue'
  "recommendation_id" UUID NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "reason" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMP NOT NULL
);

-- A/B testing experiments
CREATE TABLE "experiments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL UNIQUE,
  "description" TEXT,
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, running, paused, completed
  "variants" JSONB NOT NULL, -- Array of variant configurations
  "traffic_allocation" JSONB NOT NULL, -- Percentage per variant
  "success_metrics" JSONB NOT NULL,
  "started_at" TIMESTAMP,
  "ended_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "experiment_assignments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "experiment_id" UUID NOT NULL REFERENCES "experiments"("id"),
  "user_id" UUID NOT NULL REFERENCES "users"("id"),
  "variant" VARCHAR(50) NOT NULL,
  "assigned_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("experiment_id", "user_id")
);

CREATE TABLE "experiment_results" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "experiment_id" UUID NOT NULL REFERENCES "experiments"("id"),
  "variant" VARCHAR(50) NOT NULL,
  "metric" VARCHAR(100) NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "sample_size" INTEGER NOT NULL,
  "confidence" DOUBLE PRECISION,
  "p_value" DOUBLE PRECISION,
  "calculated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Data quality monitoring
CREATE TABLE "data_quality_checks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "check_name" VARCHAR(100) NOT NULL,
  "table_name" VARCHAR(100) NOT NULL,
  "check_type" VARCHAR(50) NOT NULL, -- completeness, accuracy, consistency, timeliness
  "status" VARCHAR(20) NOT NULL, -- passed, failed, warning
  "details" JSONB,
  "rows_checked" INTEGER,
  "issues_found" INTEGER,
  "run_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Anomaly detection results
CREATE TABLE "anomalies" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "metric_name" VARCHAR(100) NOT NULL,
  "entity_type" VARCHAR(50), -- artist, show, venue, user
  "entity_id" UUID,
  "expected_value" DOUBLE PRECISION NOT NULL,
  "actual_value" DOUBLE PRECISION NOT NULL,
  "deviation" DOUBLE PRECISION NOT NULL,
  "severity" VARCHAR(20) NOT NULL, -- low, medium, high, critical
  "detected_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "resolved_at" TIMESTAMP,
  "metadata" JSONB
);

-- Create indexes for performance
CREATE INDEX "idx_events_timestamp" ON "events"("timestamp");
CREATE INDEX "idx_events_user_id" ON "events"("user_id");
CREATE INDEX "idx_events_session_id" ON "events"("session_id");
CREATE INDEX "idx_events_type" ON "events"("event_type");
CREATE INDEX "idx_events_artist_id" ON "events"("artist_id");
CREATE INDEX "idx_events_show_id" ON "events"("show_id");
CREATE INDEX "idx_events_processed" ON "events"("processed_at");

CREATE INDEX "idx_sessions_user_id" ON "user_sessions"("user_id");
CREATE INDEX "idx_sessions_start" ON "user_sessions"("session_start");

CREATE INDEX "idx_page_stats_period" ON "page_view_stats"("period", "period_start");
CREATE INDEX "idx_page_stats_url" ON "page_view_stats"("page_url");

CREATE INDEX "idx_artist_analytics_period" ON "artist_analytics"("artist_id", "period", "period_start");
CREATE INDEX "idx_artist_analytics_trending" ON "artist_analytics"("trending_score");

CREATE INDEX "idx_show_analytics_period" ON "show_analytics"("show_id", "period", "period_start");

CREATE INDEX "idx_realtime_expires" ON "realtime_analytics"("expires_at");

CREATE INDEX "idx_recommendations_user_type" ON "user_recommendations"("user_id", "recommendation_type");
CREATE INDEX "idx_recommendations_score" ON "user_recommendations"("score");
CREATE INDEX "idx_recommendations_expires" ON "user_recommendations"("expires_at");

CREATE INDEX "idx_exp_assignments" ON "experiment_assignments"("experiment_id", "user_id");
CREATE INDEX "idx_exp_results" ON "experiment_results"("experiment_id", "variant");

CREATE INDEX "idx_quality_checks_run" ON "data_quality_checks"("run_at");
CREATE INDEX "idx_quality_checks_status" ON "data_quality_checks"("status");

CREATE INDEX "idx_anomalies_detected" ON "anomalies"("detected_at");
CREATE INDEX "idx_anomalies_severity" ON "anomalies"("severity");
CREATE INDEX "idx_anomalies_entity" ON "anomalies"("entity_type", "entity_id");

-- Function to calculate trending scores
CREATE OR REPLACE FUNCTION calculate_trending_score(
  view_count INTEGER,
  engagement_count INTEGER,
  time_decay_hours INTEGER DEFAULT 72
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  base_score DOUBLE PRECISION;
  time_factor DOUBLE PRECISION;
BEGIN
  -- Base score from views and engagement
  base_score := LOG(GREATEST(view_count, 1)) * 10 + SQRT(GREATEST(engagement_count, 1)) * 5;
  
  -- Time decay factor (exponential decay over time_decay_hours)
  time_factor := EXP(-0.1 * (time_decay_hours / 24.0));
  
  RETURN base_score * time_factor;
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate events into analytics
CREATE OR REPLACE FUNCTION aggregate_events_to_analytics() RETURNS void AS $$
BEGIN
  -- This would be implemented based on specific aggregation needs
  -- Example: Aggregate artist views by hour
  INSERT INTO artist_analytics (
    artist_id, period, period_start, profile_views, unique_viewers
  )
  SELECT 
    artist_id,
    'hour'::aggregation_period,
    date_trunc('hour', timestamp) as period_start,
    COUNT(*) as profile_views,
    COUNT(DISTINCT user_id) as unique_viewers
  FROM events
  WHERE event_type = 'artist_view'
    AND processed_at IS NULL
    AND artist_id IS NOT NULL
  GROUP BY artist_id, date_trunc('hour', timestamp)
  ON CONFLICT DO NOTHING;
  
  -- Mark events as processed
  UPDATE events 
  SET processed_at = NOW() 
  WHERE processed_at IS NULL;
END;
$$ LANGUAGE plpgsql;