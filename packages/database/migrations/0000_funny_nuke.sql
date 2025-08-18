DO $$ BEGIN
 CREATE TYPE "user_role" AS ENUM('user', 'moderator', 'admin');
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
 CREATE TYPE "moderation_status" AS ENUM('pending', 'approved', 'rejected', 'flagged');
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
CREATE TABLE IF NOT EXISTS "artist_songs" (
	"artist_id" uuid NOT NULL,
	"song_id" uuid NOT NULL,
	"is_primary_artist" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "artist_songs_artist_id_song_id_pk" PRIMARY KEY("artist_id","song_id")
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
CREATE TABLE IF NOT EXISTS "import_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" varchar(255) NOT NULL,
	"artist_name" varchar(255),
	"ticketmaster_id" varchar(255),
	"spotify_id" varchar(255),
	"job_id" varchar(255),
	"level" "log_level" NOT NULL,
	"stage" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"details" jsonb,
	"items_processed" integer DEFAULT 0,
	"items_total" integer,
	"duration_ms" integer,
	"error_code" varchar(50),
	"error_stack" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "import_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"stage" "import_stage" NOT NULL,
	"percentage" integer DEFAULT 0,
	"message" text,
	"error" text,
	"job_id" varchar(255),
	"total_songs" integer DEFAULT 0,
	"total_shows" integer DEFAULT 0,
	"total_venues" integer DEFAULT 0,
	"artist_name" varchar(255),
	"started_at" timestamp,
	"phase_timings" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "import_status_artist_id_unique" UNIQUE("artist_id")
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
CREATE TABLE IF NOT EXISTS "user_follows_artists" (
	"user_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_follows_artists_user_id_artist_id_pk" PRIMARY KEY("user_id","artist_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_insider_tips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tip_category" text NOT NULL,
	"tip" text NOT NULL,
	"helpful" integer DEFAULT 0,
	"moderation_status" "moderation_status" DEFAULT 'approved',
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
	"moderation_status" "moderation_status" DEFAULT 'approved',
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
	"moderation_status" "moderation_status" DEFAULT 'approved',
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
	"tm_attraction_id" text,
	"spotify_id" text,
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
	"external_urls" text,
	"import_status" text,
	"last_synced_at" timestamp,
	"song_catalog_synced_at" timestamp,
	"shows_synced_at" timestamp,
	"total_albums" integer DEFAULT 0,
	"total_songs" integer DEFAULT 0,
	"last_full_sync_at" timestamp,
	"previous_followers" integer,
	"previous_popularity" integer,
	"previous_monthly_listeners" integer,
	"previous_follower_count" integer,
	"last_growth_calculated" timestamp,
	"trending_score" double precision DEFAULT 0,
	"total_shows" integer DEFAULT 0,
	"upcoming_shows" integer DEFAULT 0,
	"total_setlists" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "artists_tm_attraction_id_unique" UNIQUE("tm_attraction_id"),
	CONSTRAINT "artists_spotify_id_unique" UNIQUE("spotify_id"),
	CONSTRAINT "artists_mbid_unique" UNIQUE("mbid"),
	CONSTRAINT "artists_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"tm_venue_id" text,
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
	"total_shows" integer DEFAULT 0,
	"upcoming_shows" integer DEFAULT 0,
	"total_attendance" integer DEFAULT 0,
	"average_rating" double precision,
	"previous_total_shows" integer,
	"previous_upcoming_shows" integer,
	"previous_total_attendance" integer,
	"last_growth_calculated" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "venues_slug_unique" UNIQUE("slug"),
	CONSTRAINT "venues_tm_venue_id_unique" UNIQUE("tm_venue_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "show_artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"show_id" uuid,
	"artist_id" uuid,
	"order_index" integer,
	"set_length" integer,
	"is_headliner" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"headliner_artist_id" uuid,
	"venue_id" uuid,
	"name" text,
	"slug" text,
	"date" date,
	"start_time" time,
	"doors_time" time,
	"status" "show_status" DEFAULT 'upcoming',
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
	"previous_view_count" integer,
	"previous_attendee_count" integer,
	"previous_vote_count" integer,
	"previous_setlist_count" integer,
	"last_growth_calculated" timestamp,
	"is_featured" boolean DEFAULT false,
	"is_verified" boolean DEFAULT false,
	"tm_event_id" text,
	"setlistfm_id" text,
	"setlist_ready" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "shows_slug_unique" UNIQUE("slug"),
	CONSTRAINT "shows_tm_event_id_unique" UNIQUE("tm_event_id")
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
	"moderation_status" "moderation_status" DEFAULT 'approved',
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
	"isrc" text,
	"name" text NOT NULL,
	"album_name" text,
	"artist" text NOT NULL,
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
	"is_live" boolean DEFAULT false,
	"is_remix" boolean DEFAULT false,
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
CREATE TABLE IF NOT EXISTS "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"last_reset" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE INDEX IF NOT EXISTS "idx_import_status_artist" ON "import_status" ("artist_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_artist_tm_attraction" ON "artists" ("tm_attraction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_artist_spotify" ON "artists" ("spotify_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_venue_tm" ON "venues" ("tm_venue_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_show_artist_date" ON "shows" ("headliner_artist_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_show_tm_event" ON "shows" ("tm_event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_song_isrc" ON "songs" ("isrc");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_song_popularity" ON "songs" ("popularity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_song_spotify" ON "songs" ("spotify_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "artist_songs" ADD CONSTRAINT "artist_songs_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "artist_songs" ADD CONSTRAINT "artist_songs_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "import_status" ADD CONSTRAINT "import_status_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "show_artists" ADD CONSTRAINT "show_artists_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE cascade ON UPDATE no action;
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
DO $$ BEGIN
 ALTER TABLE "shows" ADD CONSTRAINT "shows_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE set null ON UPDATE no action;
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
 ALTER TABLE "sync_progress" ADD CONSTRAINT "sync_progress_job_id_sync_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "sync_jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
