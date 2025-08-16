ALTER TABLE "artists" DROP CONSTRAINT "artists_ticketmaster_id_unique";--> statement-breakpoint
ALTER TABLE "venues" DROP CONSTRAINT "venues_ticketmaster_id_unique";--> statement-breakpoint
ALTER TABLE "shows" DROP CONSTRAINT "shows_ticketmaster_id_unique";--> statement-breakpoint
ALTER TABLE "import_status" ALTER COLUMN "artist_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "artist_songs" ADD CONSTRAINT "artist_songs_artist_id_song_id_pk" PRIMARY KEY("artist_id","song_id");--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "tm_attraction_id" text;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "import_status" text;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "shows_synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "tm_venue_id" text;--> statement-breakpoint
ALTER TABLE "shows" ADD COLUMN "tm_event_id" text;--> statement-breakpoint
ALTER TABLE "shows" ADD COLUMN "setlist_ready" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "isrc" text;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "album_name" text;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "is_live" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "is_remix" boolean DEFAULT false;--> statement-breakpoint
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
 ALTER TABLE "import_status" ADD CONSTRAINT "import_status_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "artist_songs" DROP COLUMN IF EXISTS "id";--> statement-breakpoint
ALTER TABLE "artists" DROP COLUMN IF EXISTS "ticketmaster_id";--> statement-breakpoint
ALTER TABLE "venues" DROP COLUMN IF EXISTS "ticketmaster_id";--> statement-breakpoint
ALTER TABLE "shows" DROP COLUMN IF EXISTS "ticketmaster_id";--> statement-breakpoint
ALTER TABLE "songs" DROP COLUMN IF EXISTS "title";--> statement-breakpoint
ALTER TABLE "songs" DROP COLUMN IF EXISTS "album";--> statement-breakpoint
ALTER TABLE "import_status" ADD CONSTRAINT "import_status_artist_id_unique" UNIQUE("artist_id");--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_tm_attraction_id_unique" UNIQUE("tm_attraction_id");--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_tm_venue_id_unique" UNIQUE("tm_venue_id");--> statement-breakpoint
ALTER TABLE "shows" ADD CONSTRAINT "shows_tm_event_id_unique" UNIQUE("tm_event_id");