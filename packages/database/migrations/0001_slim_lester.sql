DROP TABLE "user_profiles";--> statement-breakpoint
DROP TABLE "show_comments";--> statement-breakpoint
ALTER TABLE "user_follows_artists" DROP CONSTRAINT "user_follows_artists_user_id_artist_id_unique";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_spotify_id_unique";--> statement-breakpoint
ALTER TABLE "user_follows_artists" DROP CONSTRAINT "user_follows_artists_user_id_users_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_follows_artists" ADD CONSTRAINT "user_follows_artists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "display_name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "avatar_url";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "spotify_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "spotify_refresh_token";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "preferences";