DO $$ BEGIN
 CREATE TYPE "moderation_status" AS ENUM('pending', 'approved', 'rejected', 'flagged');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
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
ALTER TABLE "show_artists" ALTER COLUMN "show_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "show_artists" ALTER COLUMN "artist_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "show_artists" ALTER COLUMN "order_index" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "show_artists" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "shows" ALTER COLUMN "headliner_artist_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "shows" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "shows" ALTER COLUMN "slug" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "shows" ALTER COLUMN "date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "shows" ALTER COLUMN "status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "shows" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "shows" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "import_status" ADD COLUMN "job_id" varchar(255);--> statement-breakpoint
ALTER TABLE "import_status" ADD COLUMN "total_songs" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "import_status" ADD COLUMN "total_shows" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "import_status" ADD COLUMN "total_venues" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "import_status" ADD COLUMN "artist_name" varchar(255);--> statement-breakpoint
ALTER TABLE "import_status" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
ALTER TABLE "import_status" ADD COLUMN "phase_timings" jsonb;--> statement-breakpoint
ALTER TABLE "venue_reviews" ADD COLUMN "moderation_status" "moderation_status" DEFAULT 'approved';--> statement-breakpoint
ALTER TABLE "setlists" ADD COLUMN "moderation_status" "moderation_status" DEFAULT 'approved';--> statement-breakpoint
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
