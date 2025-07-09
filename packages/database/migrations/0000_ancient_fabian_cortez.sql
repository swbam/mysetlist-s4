DO $$ BEGIN
 CREATE TYPE "user_role" AS ENUM('user', 'moderator', 'admin');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "venue_tip_category" AS ENUM('parking', 'food', 'access', 'sound', 'view', 'general');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "show_status" AS ENUM('upcoming', 'ongoing', 'completed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "setlist_type" AS ENUM('predicted', 'actual');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "vote_type" AS ENUM('up', 'down');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "email_frequency" AS ENUM('immediately', 'daily', 'weekly', 'never');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "email_status" AS ENUM('queued', 'sent', 'delivered', 'bounced', 'failed', 'spam');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "email_type" AS ENUM('show_reminders', 'new_shows', 'setlist_updates', 'weekly_digest', 'marketing', 'all');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "queued_email_type" AS ENUM('welcome', 'show_reminder', 'new_show', 'setlist_update', 'weekly_digest', 'password_reset', 'email_verification');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "attendance_status" AS ENUM('going', 'interested', 'not_going');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "backup_status" AS ENUM('in_progress', 'completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "moderation_status" AS ENUM('pending', 'approved', 'rejected', 'flagged');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "notification_severity" AS ENUM('low', 'medium', 'high', 'critical');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "priority_level" AS ENUM('low', 'medium', 'high', 'urgent');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "report_status" AS ENUM('pending', 'investigating', 'resolved', 'dismissed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "system_health_status" AS ENUM('healthy', 'degraded', 'down');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "aggregation_period" AS ENUM('minute', 'hour', 'day', 'week', 'month', 'quarter', 'year');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "device_type" AS ENUM('desktop', 'mobile', 'tablet', 'tv', 'bot', 'unknown');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "event_type" AS ENUM('page_view', 'search', 'artist_view', 'show_view', 'venue_view', 'setlist_view', 'song_vote', 'setlist_vote', 'artist_follow', 'artist_unfollow', 'show_attendance', 'review_created', 'photo_uploaded', 'share', 'external_link_click', 'notification_click', 'email_open', 'email_click', 'app_open', 'session_start', 'session_end');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "email_channel" AS ENUM('email', 'push', 'sms', 'in_app');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "email_priority" AS ENUM('low', 'normal', 'high', 'urgent');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "email_template_type" AS ENUM('welcome', 'show_reminder', 'new_show', 'setlist_update', 'weekly_digest', 'monthly_digest', 'artist_update', 'password_reset', 'email_verification', 'account_deletion', 'marketing', 'transactional', 'notification');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "aggregation_type" AS ENUM('sum', 'avg', 'min', 'max', 'count', 'distinct_count', 'percentile', 'stddev');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "data_source_type" AS ENUM('database', 'api', 'file', 'stream', 'webhook');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "etl_job_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled', 'retrying');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "artist_songs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"song_id" uuid NOT NULL,
	"is_primary_artist" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"email_verified" timestamp,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bio" text,
	"location" text,
	"favorite_genres" text,
	"instagram_url" text,
	"twitter_url" text,
	"spotify_url" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"show_attended_shows" boolean DEFAULT true NOT NULL,
	"show_voted_songs" boolean DEFAULT true NOT NULL,
	"shows_attended" integer DEFAULT 0 NOT NULL,
	"songs_voted" integer DEFAULT 0 NOT NULL,
	"artists_followed" integer DEFAULT 0 NOT NULL,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "artist_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"total_shows" integer DEFAULT 0,
	"upcoming_shows" integer DEFAULT 0,
	"total_setlists" integer DEFAULT 0,
	"avg_setlist_length" double precision,
	"most_played_song" text,
	"last_show_date" timestamp,
	"total_votes" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spotify_id" text,
	"ticketmaster_id" text,
	"mbid" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"image_url" text,
	"small_image_url" text,
	"genres" text,
	"popularity" integer DEFAULT 0,
	"followers" integer DEFAULT 0,
	"follower_count" integer DEFAULT 0,
	"monthly_listeners" integer,
	"verified" boolean DEFAULT false,
	"bio" text,
	"external_urls" text,
	"last_synced_at" timestamp,
	"song_catalog_synced_at" timestamp,
	"total_albums" integer DEFAULT 0,
	"total_songs" integer DEFAULT 0,
	"last_full_sync_at" timestamp,
	"trending_score" double precision DEFAULT 0,
	"total_shows" integer DEFAULT 0,
	"upcoming_shows" integer DEFAULT 0,
	"total_setlists" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "artists_spotify_id_unique" UNIQUE("spotify_id"),
	CONSTRAINT "artists_ticketmaster_id_unique" UNIQUE("ticketmaster_id"),
	CONSTRAINT "artists_mbid_unique" UNIQUE("mbid"),
	CONSTRAINT "artists_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_tips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"category" "venue_tip_category" NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"address" text,
	"city" text NOT NULL,
	"state" text,
	"country" text NOT NULL,
	"postal_code" text,
	"latitude" double precision,
	"longitude" double precision,
	"timezone" text NOT NULL,
	"capacity" integer,
	"venue_type" text,
	"phone_number" text,
	"website" text,
	"image_url" text,
	"description" text,
	"amenities" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "venues_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_insider_tips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tip_category" text NOT NULL,
	"tip" text NOT NULL,
	"helpful" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"caption" text,
	"photo_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"review" text NOT NULL,
	"acoustics" integer,
	"accessibility" integer,
	"sightlines" integer,
	"parking_ease" integer,
	"concessions" integer,
	"visited_at" timestamp NOT NULL,
	"helpful" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "show_artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"show_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	"set_length" integer,
	"is_headliner" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "show_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"show_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"parent_id" uuid,
	"is_edited" boolean DEFAULT false NOT NULL,
	"edited_at" timestamp,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"headliner_artist_id" uuid NOT NULL,
	"venue_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"date" date NOT NULL,
	"start_time" time,
	"doors_time" time,
	"status" "show_status" DEFAULT 'upcoming' NOT NULL,
	"description" text,
	"ticket_url" text,
	"min_price" integer,
	"max_price" integer,
	"currency" text DEFAULT 'USD',
	"view_count" integer DEFAULT 0,
	"attendee_count" integer DEFAULT 0,
	"setlist_count" integer DEFAULT 0,
	"vote_count" integer DEFAULT 0,
	"trending_score" double precision DEFAULT 0,
	"is_featured" boolean DEFAULT false,
	"is_verified" boolean DEFAULT false,
	"ticketmaster_id" text,
	"setlistfm_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shows_slug_unique" UNIQUE("slug"),
	CONSTRAINT "shows_ticketmaster_id_unique" UNIQUE("ticketmaster_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "setlist_songs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setlist_id" uuid NOT NULL,
	"song_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"notes" text,
	"is_played" boolean,
	"play_time" timestamp,
	"upvotes" integer DEFAULT 0,
	"downvotes" integer DEFAULT 0,
	"net_votes" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "setlist_songs_setlist_id_position_unique" UNIQUE("setlist_id","position")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "setlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"show_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"type" "setlist_type" NOT NULL,
	"name" text DEFAULT 'Main Set',
	"order_index" integer DEFAULT 0,
	"is_locked" boolean DEFAULT false,
	"total_votes" integer DEFAULT 0,
	"accuracy_score" integer DEFAULT 0,
	"imported_from" text,
	"external_id" text,
	"imported_at" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "songs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spotify_id" text,
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"album" text,
	"album_id" text,
	"track_number" integer,
	"disc_number" integer DEFAULT 1,
	"album_type" text,
	"album_art_url" text,
	"release_date" date,
	"duration_ms" integer,
	"popularity" integer DEFAULT 0,
	"preview_url" text,
	"spotify_uri" text,
	"external_urls" text,
	"is_explicit" boolean DEFAULT false,
	"is_playable" boolean DEFAULT true,
	"acousticness" text,
	"danceability" text,
	"energy" text,
	"valence" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "songs_spotify_id_unique" UNIQUE("spotify_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"setlist_song_id" uuid NOT NULL,
	"vote_type" "vote_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "votes_user_id_setlist_song_id_unique" UNIQUE("user_id","setlist_song_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"email_type" text NOT NULL,
	"subject" text NOT NULL,
	"recipient" text NOT NULL,
	"status" "email_status" DEFAULT 'queued' NOT NULL,
	"resend_id" text,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"show_reminders" boolean DEFAULT true NOT NULL,
	"show_reminder_frequency" "email_frequency" DEFAULT 'daily' NOT NULL,
	"new_show_notifications" boolean DEFAULT true NOT NULL,
	"new_show_frequency" "email_frequency" DEFAULT 'immediately' NOT NULL,
	"setlist_updates" boolean DEFAULT true NOT NULL,
	"setlist_update_frequency" "email_frequency" DEFAULT 'immediately' NOT NULL,
	"weekly_digest" boolean DEFAULT true NOT NULL,
	"marketing_emails" boolean DEFAULT false NOT NULL,
	"security_emails" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email_type" "queued_email_type" NOT NULL,
	"email_data" text,
	"scheduled_for" timestamp NOT NULL,
	"sent_at" timestamp,
	"failed_at" timestamp,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_unsubscribes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email_type" "email_type" NOT NULL,
	"unsubscribed_at" timestamp DEFAULT now() NOT NULL,
	"token" text NOT NULL,
	CONSTRAINT "email_unsubscribes_user_id_email_type_unique" UNIQUE("user_id","email_type")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_follows_artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_show_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"show_id" uuid NOT NULL,
	"status" "attendance_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"severity" "notification_severity" DEFAULT 'medium',
	"read" boolean DEFAULT false,
	"actionable" boolean DEFAULT false,
	"action_url" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_moderation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"content_id" uuid NOT NULL,
	"status" "moderation_status" DEFAULT 'pending' NOT NULL,
	"moderator_id" uuid,
	"reason" text,
	"action_taken" varchar(100),
	"priority" "priority_level" DEFAULT 'medium',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_backups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"backup_type" varchar(50) NOT NULL,
	"file_path" text NOT NULL,
	"file_size_mb" integer,
	"compression_type" varchar(20),
	"status" "backup_status" DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"error_message" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moderation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moderator_id" uuid NOT NULL,
	"target_type" varchar(50) NOT NULL,
	"target_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"reason" text,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stat_date" date NOT NULL,
	"total_users" integer DEFAULT 0,
	"active_users" integer DEFAULT 0,
	"new_users" integer DEFAULT 0,
	"total_shows" integer DEFAULT 0,
	"new_shows" integer DEFAULT 0,
	"total_setlists" integer DEFAULT 0,
	"new_setlists" integer DEFAULT 0,
	"total_votes" integer DEFAULT 0,
	"new_votes" integer DEFAULT 0,
	"new_reviews" integer DEFAULT 0,
	"new_photos" integer DEFAULT 0,
	"api_calls" integer DEFAULT 0,
	"storage_used_mb" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_stats_stat_date_unique" UNIQUE("stat_date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid,
	"content_type" varchar(50) NOT NULL,
	"content_id" uuid NOT NULL,
	"reason" varchar(100) NOT NULL,
	"description" text,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"assigned_to" uuid,
	"resolution" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_name" varchar(100) NOT NULL,
	"status" "system_health_status" NOT NULL,
	"response_time" integer,
	"error_count" integer DEFAULT 0,
	"last_check" timestamp DEFAULT now(),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"target_type" varchar(50),
	"target_id" uuid,
	"details" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "artist_followers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"followed_at" timestamp DEFAULT now() NOT NULL,
	"notification_enabled" boolean DEFAULT true,
	CONSTRAINT "artist_followers_artist_id_user_id_unique" UNIQUE("artist_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "popular_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query" text NOT NULL,
	"search_type" varchar(50) NOT NULL,
	"count" integer DEFAULT 1,
	"last_searched" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "popular_searches_query_search_type_unique" UNIQUE("query","search_type")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"query" text NOT NULL,
	"search_type" varchar(50) NOT NULL,
	"filters" jsonb,
	"notification_enabled" boolean DEFAULT false,
	"last_checked" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "saved_searches_user_id_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "search_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_id" varchar(255),
	"query" text NOT NULL,
	"search_type" varchar(50) NOT NULL,
	"results_count" integer DEFAULT 0,
	"response_time_ms" integer,
	"clicked_result_id" uuid,
	"clicked_result_type" varchar(50),
	"clicked_result_position" integer,
	"search_timestamp" timestamp DEFAULT now() NOT NULL,
	"user_agent" text,
	"ip_address" "inet",
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_bans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"banned_by" uuid NOT NULL,
	"reason" text NOT NULL,
	"ban_type" varchar(50) DEFAULT 'temporary',
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"lifted_at" timestamp,
	"lifted_by" uuid,
	"lift_reason" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "anomalies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_name" varchar(100) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"expected_value" double precision NOT NULL,
	"actual_value" double precision NOT NULL,
	"deviation" double precision NOT NULL,
	"severity" varchar(20) NOT NULL,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "artist_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"period" "aggregation_period" NOT NULL,
	"period_start" timestamp NOT NULL,
	"profile_views" integer DEFAULT 0,
	"unique_viewers" integer DEFAULT 0,
	"follows" integer DEFAULT 0,
	"unfollows" integer DEFAULT 0,
	"show_views" integer DEFAULT 0,
	"setlist_views" integer DEFAULT 0,
	"song_votes" integer DEFAULT 0,
	"shares" integer DEFAULT 0,
	"trending_score" double precision DEFAULT 0,
	"growth_rate" double precision,
	"engagement_rate" double precision,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_quality_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"check_name" varchar(100) NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"check_type" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"details" jsonb,
	"rows_checked" integer,
	"issues_found" integer,
	"run_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_id" uuid NOT NULL,
	"event_type" "event_type" NOT NULL,
	"event_category" varchar(50),
	"event_action" varchar(100),
	"event_label" varchar(255),
	"event_value" double precision,
	"artist_id" uuid,
	"show_id" uuid,
	"venue_id" uuid,
	"setlist_id" uuid,
	"page_url" text,
	"referrer_url" text,
	"user_agent" text,
	"ip_address" varchar(45),
	"country" varchar(2),
	"region" varchar(100),
	"city" varchar(100),
	"device_type" "device_type",
	"browser" varchar(50),
	"os" varchar(50),
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "experiment_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experiment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"variant" varchar(50) NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "experiment_assignments_experiment_id_user_id_pk" PRIMARY KEY("experiment_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "experiment_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experiment_id" uuid NOT NULL,
	"variant" varchar(50) NOT NULL,
	"metric" varchar(100) NOT NULL,
	"value" double precision NOT NULL,
	"sample_size" integer NOT NULL,
	"confidence" double precision,
	"p_value" double precision,
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "experiments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"variants" jsonb NOT NULL,
	"traffic_allocation" jsonb NOT NULL,
	"success_metrics" jsonb NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "experiments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "page_view_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" "aggregation_period" NOT NULL,
	"period_start" timestamp NOT NULL,
	"page_url" text NOT NULL,
	"views" integer DEFAULT 0,
	"unique_visitors" integer DEFAULT 0,
	"avg_time_on_page" double precision,
	"bounce_rate" double precision,
	"exit_rate" double precision,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "realtime_analytics" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "show_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"show_id" uuid NOT NULL,
	"period" "aggregation_period" NOT NULL,
	"period_start" timestamp NOT NULL,
	"views" integer DEFAULT 0,
	"unique_viewers" integer DEFAULT 0,
	"attendance_marked" integer DEFAULT 0,
	"setlist_views" integer DEFAULT 0,
	"votes" integer DEFAULT 0,
	"shares" integer DEFAULT 0,
	"view_to_attendance_rate" double precision,
	"view_to_vote_rate" double precision,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recommendation_type" varchar(50) NOT NULL,
	"recommendation_id" uuid NOT NULL,
	"score" double precision NOT NULL,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_start" timestamp DEFAULT now() NOT NULL,
	"session_end" timestamp,
	"duration" integer,
	"page_views" integer DEFAULT 0,
	"events" integer DEFAULT 0,
	"device_type" "device_type",
	"browser" varchar(50),
	"os" varchar(50),
	"ip_address" varchar(45),
	"country" varchar(2),
	"is_authenticated" boolean DEFAULT false,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "artist_update_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"new_shows" boolean DEFAULT true,
	"setlist_updates" boolean DEFAULT true,
	"artist_news" boolean DEFAULT true,
	"frequency" "email_channel" DEFAULT 'email' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "artist_update_subscriptions_user_id_artist_id_pk" PRIMARY KEY("user_id","artist_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "digest_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"digest_type" varchar(20) NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"content_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"image_url" text,
	"action_url" text,
	"priority" integer DEFAULT 0,
	"metadata" jsonb,
	"scheduled_for" timestamp NOT NULL,
	"included_in_digest" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"template_id" uuid NOT NULL,
	"total_recipients" integer DEFAULT 0,
	"sent" integer DEFAULT 0,
	"delivered" integer DEFAULT 0,
	"opened" integer DEFAULT 0,
	"clicked" integer DEFAULT 0,
	"bounced" integer DEFAULT 0,
	"complained" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"scheduled_for" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_engagement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_id" uuid NOT NULL,
	"user_id" uuid,
	"action" varchar(20) NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"clicked_url" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_queue_enhanced" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid,
	"user_id" uuid,
	"recipient_email" varchar(255) NOT NULL,
	"template_id" uuid NOT NULL,
	"channel" "email_channel" DEFAULT 'email' NOT NULL,
	"priority" "email_priority" DEFAULT 'normal' NOT NULL,
	"template_data" jsonb,
	"scheduled_for" timestamp NOT NULL,
	"send_after" timestamp,
	"send_before" timestamp,
	"processing_started_at" timestamp,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"bounced_at" timestamp,
	"complained_at" timestamp,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 3,
	"last_error" text,
	"provider_id" varchar(100),
	"provider_response" jsonb,
	"tags" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "email_template_type" NOT NULL,
	"subject" text NOT NULL,
	"html_template" text NOT NULL,
	"text_template" text,
	"mjml_template" text,
	"variables" jsonb,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true,
	"version" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_templates_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"default_channels" jsonb DEFAULT '["email"]' NOT NULL,
	"is_optional" boolean DEFAULT true,
	"priority" "email_priority" DEFAULT 'normal',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_categories_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "show_reminder_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"show_id" uuid NOT NULL,
	"reminder_days_before" integer DEFAULT 1,
	"reminder_sent" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "show_reminder_subscriptions_user_id_show_id_pk" PRIMARY KEY("user_id","show_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactional_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"recipient_email" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"subject" text NOT NULL,
	"provider_id" varchar(100),
	"status" varchar(20) NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"global_email_enabled" boolean DEFAULT true,
	"global_push_enabled" boolean DEFAULT true,
	"global_sms_enabled" boolean DEFAULT false,
	"quiet_hours_enabled" boolean DEFAULT false,
	"quiet_hours_start" varchar(5),
	"quiet_hours_end" varchar(5),
	"timezone" varchar(50) DEFAULT 'UTC',
	"max_daily_emails" integer DEFAULT 10,
	"max_weekly_emails" integer DEFAULT 50,
	"preferences" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aggregated_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_name" varchar(100) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"period_type" varchar(20) NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"metrics" jsonb NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_lineage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_table" varchar(100) NOT NULL,
	"target_table" varchar(100) NOT NULL,
	"transformation_type" varchar(50) NOT NULL,
	"job_id" uuid,
	"record_count" integer,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_quality_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"column_name" varchar(100),
	"metric_type" varchar(50) NOT NULL,
	"metric_value" double precision NOT NULL,
	"threshold" double precision,
	"status" varchar(20) NOT NULL,
	"details" jsonb,
	"measured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_retention_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"retention_days" integer NOT NULL,
	"archive_enabled" boolean DEFAULT false,
	"archive_table_name" varchar(100),
	"delete_enabled" boolean DEFAULT true,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "data_retention_policies_table_name_unique" UNIQUE("table_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "data_source_type" NOT NULL,
	"connection_string" text,
	"configuration" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "data_sources_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dim_date" (
	"date_key" integer PRIMARY KEY NOT NULL,
	"full_date" timestamp NOT NULL,
	"year" integer NOT NULL,
	"quarter" integer NOT NULL,
	"month" integer NOT NULL,
	"week" integer NOT NULL,
	"day_of_month" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"day_name" varchar(10) NOT NULL,
	"month_name" varchar(10) NOT NULL,
	"is_weekend" boolean NOT NULL,
	"is_holiday" boolean DEFAULT false,
	"holiday_name" varchar(50)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "etl_job_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"status" "etl_job_status" DEFAULT 'running' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration" integer,
	"records_processed" integer DEFAULT 0,
	"records_failed" integer DEFAULT 0,
	"error_message" text,
	"metadata" jsonb,
	"metrics" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "etl_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"schedule" varchar(100),
	"status" "etl_job_status" DEFAULT 'pending' NOT NULL,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"configuration" jsonb NOT NULL,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fact_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_date" timestamp NOT NULL,
	"event_hour" integer NOT NULL,
	"user_id" uuid,
	"session_id" uuid,
	"artist_id" uuid,
	"show_id" uuid,
	"venue_id" uuid,
	"event_type" varchar(50) NOT NULL,
	"event_category" varchar(50),
	"event_count" integer DEFAULT 1,
	"event_value" double precision,
	"user_country" varchar(2),
	"user_region" varchar(100),
	"device_type" varchar(20),
	"browser" varchar(50),
	"os" varchar(50),
	"metadata" jsonb,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "materialized_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"view_name" varchar(100) NOT NULL,
	"description" text,
	"query" text NOT NULL,
	"refresh_schedule" varchar(100),
	"last_refreshed_at" timestamp,
	"next_refresh_at" timestamp,
	"refresh_duration" integer,
	"is_active" boolean DEFAULT true,
	"dependencies" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "materialized_views_view_name_unique" UNIQUE("view_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stream_checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stream_name" varchar(100) NOT NULL,
	"partition_key" varchar(100) NOT NULL,
	"offset" varchar(100) NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_anomalies_detected" ON "anomalies" ("detected_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_anomalies_severity" ON "anomalies" ("severity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_anomalies_entity" ON "anomalies" ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_artist_analytics_period" ON "artist_analytics" ("artist_id","period","period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_artist_analytics_trending" ON "artist_analytics" ("trending_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quality_checks_run" ON "data_quality_checks" ("run_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quality_checks_status" ON "data_quality_checks" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_events_timestamp" ON "events" ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_events_user_id" ON "events" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_events_session_id" ON "events" ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_events_type" ON "events" ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_events_artist_id" ON "events" ("artist_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_events_show_id" ON "events" ("show_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_events_processed" ON "events" ("processed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_exp_assignments" ON "experiment_assignments" ("experiment_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_exp_results" ON "experiment_results" ("experiment_id","variant");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_page_stats_period" ON "page_view_stats" ("period","period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_page_stats_url" ON "page_view_stats" ("page_url");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_realtime_expires" ON "realtime_analytics" ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_show_analytics_period" ON "show_analytics" ("show_id","period","period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_recommendations_user_type" ON "user_recommendations" ("user_id","recommendation_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_recommendations_score" ON "user_recommendations" ("score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_recommendations_expires" ON "user_recommendations" ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "user_sessions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_start" ON "user_sessions" ("session_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_artist_subs" ON "artist_update_subscriptions" ("user_id","artist_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_digest_content_user" ON "digest_content" ("user_id","digest_type","scheduled_for");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_digest_content_included" ON "digest_content" ("included_in_digest");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_batches_status" ON "email_batches" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_batches_created" ON "email_batches" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_engagement_email" ON "email_engagement" ("email_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_engagement_user" ON "email_engagement" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_engagement_action" ON "email_engagement" ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_engagement_timestamp" ON "email_engagement" ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_queue_enh_scheduled" ON "email_queue_enhanced" ("scheduled_for","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_queue_enh_status" ON "email_queue_enhanced" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_queue_enh_batch" ON "email_queue_enhanced" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_queue_enh_user" ON "email_queue_enhanced" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_queue_enh_priority" ON "email_queue_enhanced" ("priority","scheduled_for");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_templates_type" ON "email_templates" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_templates_active" ON "email_templates" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_show_reminders" ON "show_reminder_subscriptions" ("user_id","show_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_show_reminders_sent" ON "show_reminder_subscriptions" ("reminder_sent");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactional_user" ON "transactional_emails" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactional_type" ON "transactional_emails" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactional_sent" ON "transactional_emails" ("sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notification_prefs_user" ON "user_notification_preferences" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_agg_metrics_entity" ON "aggregated_metrics" ("metric_name","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_agg_metrics_period" ON "aggregated_metrics" ("period_type","period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lineage_source" ON "data_lineage" ("source_table");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lineage_target" ON "data_lineage" ("target_table");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lineage_job" ON "data_lineage" ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quality_table_col" ON "data_quality_metrics" ("table_name","column_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quality_status" ON "data_quality_metrics" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quality_measured" ON "data_quality_metrics" ("measured_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_retention_active" ON "data_retention_policies" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_retention_next_run" ON "data_retention_policies" ("next_run_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_data_sources_type" ON "data_sources" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_data_sources_active" ON "data_sources" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dim_date_full" ON "dim_date" ("full_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dim_date_ym" ON "dim_date" ("year","month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_etl_runs_job" ON "etl_job_runs" ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_etl_runs_status" ON "etl_job_runs" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_etl_runs_started" ON "etl_job_runs" ("started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_etl_jobs_status" ON "etl_jobs" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_etl_jobs_next_run" ON "etl_jobs" ("next_run_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_etl_jobs_active" ON "etl_jobs" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fact_events_date" ON "fact_events" ("event_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fact_events_user" ON "fact_events" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fact_events_artist" ON "fact_events" ("artist_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fact_events_type" ON "fact_events" ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mat_views_active" ON "materialized_views" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mat_views_refresh" ON "materialized_views" ("next_refresh_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_checkpoint_stream" ON "stream_checkpoints" ("stream_name","partition_key");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "artist_songs" ADD CONSTRAINT "artist_songs_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "artist_songs" ADD CONSTRAINT "artist_songs_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "artist_stats" ADD CONSTRAINT "artist_stats_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_tips" ADD CONSTRAINT "venue_tips_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_tips" ADD CONSTRAINT "venue_tips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_insider_tips" ADD CONSTRAINT "venue_insider_tips_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_insider_tips" ADD CONSTRAINT "venue_insider_tips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_photos" ADD CONSTRAINT "venue_photos_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_photos" ADD CONSTRAINT "venue_photos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_reviews" ADD CONSTRAINT "venue_reviews_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_reviews" ADD CONSTRAINT "venue_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "show_artists" ADD CONSTRAINT "show_artists_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "show_artists" ADD CONSTRAINT "show_artists_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "show_comments" ADD CONSTRAINT "show_comments_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "show_comments" ADD CONSTRAINT "show_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "show_comments" ADD CONSTRAINT "show_comments_parent_id_show_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "show_comments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shows" ADD CONSTRAINT "shows_headliner_artist_id_artists_id_fk" FOREIGN KEY ("headliner_artist_id") REFERENCES "artists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shows" ADD CONSTRAINT "shows_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "setlist_songs" ADD CONSTRAINT "setlist_songs_setlist_id_setlists_id_fk" FOREIGN KEY ("setlist_id") REFERENCES "setlists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "setlist_songs" ADD CONSTRAINT "setlist_songs_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "setlists" ADD CONSTRAINT "setlists_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "setlists" ADD CONSTRAINT "setlists_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "setlists" ADD CONSTRAINT "setlists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "votes" ADD CONSTRAINT "votes_setlist_song_id_setlist_songs_id_fk" FOREIGN KEY ("setlist_song_id") REFERENCES "setlist_songs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_preferences" ADD CONSTRAINT "email_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_unsubscribes" ADD CONSTRAINT "email_unsubscribes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_follows_artists" ADD CONSTRAINT "user_follows_artists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_follows_artists" ADD CONSTRAINT "user_follows_artists_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_show_attendance" ADD CONSTRAINT "user_show_attendance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_show_attendance" ADD CONSTRAINT "user_show_attendance_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_moderation" ADD CONSTRAINT "content_moderation_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reports" ADD CONSTRAINT "reports_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_activity_log" ADD CONSTRAINT "user_activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "artist_followers" ADD CONSTRAINT "artist_followers_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "artist_followers" ADD CONSTRAINT "artist_followers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "search_analytics" ADD CONSTRAINT "search_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_bans" ADD CONSTRAINT "user_bans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_bans" ADD CONSTRAINT "user_bans_banned_by_users_id_fk" FOREIGN KEY ("banned_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_bans" ADD CONSTRAINT "user_bans_lifted_by_users_id_fk" FOREIGN KEY ("lifted_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "artist_analytics" ADD CONSTRAINT "artist_analytics_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_setlist_id_setlists_id_fk" FOREIGN KEY ("setlist_id") REFERENCES "setlists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "experiment_assignments" ADD CONSTRAINT "experiment_assignments_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "experiments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "experiment_assignments" ADD CONSTRAINT "experiment_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "experiment_results" ADD CONSTRAINT "experiment_results_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "experiments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "show_analytics" ADD CONSTRAINT "show_analytics_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_recommendations" ADD CONSTRAINT "user_recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "artist_update_subscriptions" ADD CONSTRAINT "artist_update_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "artist_update_subscriptions" ADD CONSTRAINT "artist_update_subscriptions_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "digest_content" ADD CONSTRAINT "digest_content_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_batches" ADD CONSTRAINT "email_batches_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "email_templates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_engagement" ADD CONSTRAINT "email_engagement_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_queue_enhanced" ADD CONSTRAINT "email_queue_enhanced_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_queue_enhanced" ADD CONSTRAINT "email_queue_enhanced_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "email_templates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "show_reminder_subscriptions" ADD CONSTRAINT "show_reminder_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "show_reminder_subscriptions" ADD CONSTRAINT "show_reminder_subscriptions_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactional_emails" ADD CONSTRAINT "transactional_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "data_lineage" ADD CONSTRAINT "data_lineage_job_id_etl_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "etl_jobs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "etl_job_runs" ADD CONSTRAINT "etl_job_runs_job_id_etl_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "etl_jobs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
