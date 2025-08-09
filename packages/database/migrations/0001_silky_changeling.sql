DO $$ BEGIN
 CREATE TYPE "auth_provider" AS ENUM('spotify', 'google', 'apple');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "auth_provider" NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_type" text DEFAULT 'Bearer',
	"scope" text,
	"expires_at" timestamp,
	"provider_profile" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_followed_artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"artist_id" text NOT NULL,
	"artist_name" text NOT NULL,
	"artist_image" text,
	"notify_new_shows" boolean DEFAULT true NOT NULL,
	"notify_setlist_updates" boolean DEFAULT true NOT NULL,
	"followed_at" timestamp DEFAULT now() NOT NULL,
	"unfollowed_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_music_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"favorite_genres" text,
	"top_artists" text,
	"top_tracks" text,
	"preferred_venues" text,
	"notification_radius" integer DEFAULT 50,
	"enable_personalized_recommendations" boolean DEFAULT true,
	"include_spotify_data" boolean DEFAULT true,
	"last_spotify_sync" timestamp,
	"auto_sync_spotify" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_music_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"last_reset" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"scopes" text[] DEFAULT  NOT NULL,
	"rate_limit" jsonb DEFAULT '{"requests":1000,"window":3600}'::jsonb NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"spotify_id" text,
	"ticketmaster_id" text,
	"setlistfm_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"total_steps" integer DEFAULT 0,
	"completed_steps" integer DEFAULT 0,
	"current_step" text,
	"job_type" text NOT NULL,
	"metadata" jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"auto_retry" boolean DEFAULT true,
	"max_retries" integer DEFAULT 3,
	"retry_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"step" text NOT NULL,
	"status" text NOT NULL,
	"progress" integer DEFAULT 0,
	"message" text,
	"total_items" integer DEFAULT 0,
	"processed_items" integer DEFAULT 0,
	"successful_items" integer DEFAULT 0,
	"failed_items" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "user_show_attendance";--> statement-breakpoint
ALTER TABLE "artist_songs" DROP CONSTRAINT "artist_songs_artist_id_artists_id_fk";
--> statement-breakpoint
ALTER TABLE "artist_stats" DROP CONSTRAINT "artist_stats_artist_id_artists_id_fk";
--> statement-breakpoint
ALTER TABLE "show_artists" DROP CONSTRAINT "show_artists_show_id_shows_id_fk";
--> statement-breakpoint
ALTER TABLE "show_comments" DROP CONSTRAINT "show_comments_show_id_shows_id_fk";
--> statement-breakpoint
ALTER TABLE "shows" DROP CONSTRAINT "shows_headliner_artist_id_artists_id_fk";
--> statement-breakpoint
ALTER TABLE "user_follows_artists" ADD CONSTRAINT "user_follows_artists_user_id_artist_id_pk" PRIMARY KEY("user_id","artist_id");--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "previous_followers" integer;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "previous_popularity" integer;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "previous_monthly_listeners" integer;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "previous_follower_count" integer;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "last_growth_calculated" timestamp;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "total_shows" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "upcoming_shows" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "total_attendance" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "average_rating" double precision;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "previous_total_shows" integer;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "previous_upcoming_shows" integer;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "previous_total_attendance" integer;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "last_growth_calculated" timestamp;--> statement-breakpoint
ALTER TABLE "shows" ADD COLUMN "previous_view_count" integer;--> statement-breakpoint
ALTER TABLE "shows" ADD COLUMN "previous_attendee_count" integer;--> statement-breakpoint
ALTER TABLE "shows" ADD COLUMN "previous_vote_count" integer;--> statement-breakpoint
ALTER TABLE "shows" ADD COLUMN "previous_setlist_count" integer;--> statement-breakpoint
ALTER TABLE "shows" ADD COLUMN "last_growth_calculated" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "artist_songs" ADD CONSTRAINT "artist_songs_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "artist_stats" ADD CONSTRAINT "artist_stats_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "show_artists" ADD CONSTRAINT "show_artists_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "show_comments" ADD CONSTRAINT "show_comments_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shows" ADD CONSTRAINT "shows_headliner_artist_id_artists_id_fk" FOREIGN KEY ("headliner_artist_id") REFERENCES "artists"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "user_follows_artists" DROP COLUMN IF EXISTS "id";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_auth_tokens" ADD CONSTRAINT "user_auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_followed_artists" ADD CONSTRAINT "user_followed_artists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_music_preferences" ADD CONSTRAINT "user_music_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sync_progress" ADD CONSTRAINT "sync_progress_job_id_sync_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "sync_jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
