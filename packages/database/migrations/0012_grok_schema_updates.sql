-- Migration 0012: GROK.md Schema Updates
-- Updates schema to match GROK.md Prisma models for enhanced import system

-- 1. ARTIST TABLE UPDATES
-- Add tmAttractionId field (rename from ticketmaster_id if exists)
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "tm_attraction_id" TEXT;
ALTER TABLE "artists" ADD CONSTRAINT "artists_tm_attraction_id_unique" UNIQUE("tm_attraction_id");

-- Add importStatus field
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "import_status" TEXT;

-- Add showsSyncedAt field
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "shows_synced_at" TIMESTAMP;

-- Drop old ticketmaster_id column if it exists (rename to tm_attraction_id)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artists' AND column_name = 'ticketmaster_id') THEN
        -- Copy data from old column to new column if not already done
        UPDATE "artists" SET "tm_attraction_id" = "ticketmaster_id" WHERE "tm_attraction_id" IS NULL AND "ticketmaster_id" IS NOT NULL;
        
        -- Drop the old column
        ALTER TABLE "artists" DROP COLUMN IF EXISTS "ticketmaster_id";
    END IF;
END $$;

-- 2. VENUE TABLE UPDATES
-- Add tmVenueId field (rename from ticketmaster_id)
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "tm_venue_id" TEXT;
ALTER TABLE "venues" ADD CONSTRAINT "venues_tm_venue_id_unique" UNIQUE("tm_venue_id");

-- Migrate data from ticketmaster_id to tm_venue_id if column exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'ticketmaster_id') THEN
        -- Copy data from old column to new column if not already done
        UPDATE "venues" SET "tm_venue_id" = "ticketmaster_id" WHERE "tm_venue_id" IS NULL AND "ticketmaster_id" IS NOT NULL;
        
        -- Drop the old column
        ALTER TABLE "venues" DROP COLUMN IF EXISTS "ticketmaster_id";
    END IF;
END $$;

-- 3. SHOW TABLE UPDATES
-- Add tmEventId field (rename from ticketmaster_id)
ALTER TABLE "shows" ADD COLUMN IF NOT EXISTS "tm_event_id" TEXT;
ALTER TABLE "shows" ADD CONSTRAINT "shows_tm_event_id_unique" UNIQUE("tm_event_id");

-- Add setlistReady field
ALTER TABLE "shows" ADD COLUMN IF NOT EXISTS "setlist_ready" BOOLEAN DEFAULT FALSE;

-- Migrate data from ticketmaster_id to tm_event_id if column exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shows' AND column_name = 'ticketmaster_id') THEN
        -- Copy data from old column to new column if not already done
        UPDATE "shows" SET "tm_event_id" = "ticketmaster_id" WHERE "tm_event_id" IS NULL AND "ticketmaster_id" IS NOT NULL;
        
        -- Drop the old column
        ALTER TABLE "shows" DROP COLUMN IF EXISTS "ticketmaster_id";
    END IF;
END $$;

-- 4. SONG TABLE UPDATES
-- Add ISRC field
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "isrc" TEXT;

-- Add isLive and isRemix fields
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "is_live" BOOLEAN DEFAULT FALSE;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "is_remix" BOOLEAN DEFAULT FALSE;

-- Rename title to name if title column exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'songs' AND column_name = 'title') THEN
        -- Add name column if it doesn't exist
        ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "name" TEXT;
        
        -- Copy data from title to name if name is empty
        UPDATE "songs" SET "name" = "title" WHERE "name" IS NULL AND "title" IS NOT NULL;
        
        -- Make name NOT NULL after data migration
        ALTER TABLE "songs" ALTER COLUMN "name" SET NOT NULL;
        
        -- Drop the old title column
        ALTER TABLE "songs" DROP COLUMN IF EXISTS "title";
    END IF;
END $$;

-- Rename album to album_name if album column exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'songs' AND column_name = 'album') THEN
        -- Add album_name column if it doesn't exist
        ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "album_name" TEXT;
        
        -- Copy data from album to album_name if album_name is empty
        UPDATE "songs" SET "album_name" = "album" WHERE "album_name" IS NULL AND "album" IS NOT NULL;
        
        -- Drop the old album column
        ALTER TABLE "songs" DROP COLUMN IF EXISTS "album";
    END IF;
END $$;

-- 5. ARTIST_SONGS TABLE UPDATES
-- Drop the id column and make artistId, songId a composite primary key
DO $$ 
BEGIN
    -- Check if id column exists and primary key needs to be updated
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_songs' AND column_name = 'id') THEN
        -- Drop existing primary key constraint
        ALTER TABLE "artist_songs" DROP CONSTRAINT IF EXISTS "artist_songs_pkey";
        
        -- Drop the id column
        ALTER TABLE "artist_songs" DROP COLUMN IF EXISTS "id";
        
        -- Add composite primary key
        ALTER TABLE "artist_songs" ADD CONSTRAINT "artist_songs_pkey" PRIMARY KEY ("artist_id", "song_id");
    END IF;
END $$;

-- 6. IMPORT_STATUS TABLE UPDATES
-- Update artistId to be a proper UUID foreign key
DO $$ 
BEGIN
    -- Check if artistId is varchar and needs to be updated to UUID with FK
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'import_status' 
        AND column_name = 'artist_id' 
        AND data_type = 'character varying'
    ) THEN
        -- First, clean up any invalid artist_id values that aren't valid UUIDs
        DELETE FROM "import_status" WHERE "artist_id" !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        
        -- Change column type to UUID
        ALTER TABLE "import_status" ALTER COLUMN "artist_id" TYPE UUID USING "artist_id"::UUID;
        
        -- Add foreign key constraint
        ALTER TABLE "import_status" ADD CONSTRAINT "import_status_artist_id_fkey" 
            FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE;
        
        -- Add unique constraint
        ALTER TABLE "import_status" ADD CONSTRAINT "import_status_artist_id_unique" UNIQUE("artist_id");
    END IF;
END $$;

-- Rename percentage to progress for GROK.md compatibility
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_status' AND column_name = 'percentage') THEN
        ALTER TABLE "import_status" RENAME COLUMN "percentage" TO "progress";
    END IF;
END $$;

-- 7. CREATE CRITICAL INDEXES FOR PERFORMANCE (from GROK.md)
-- Artist indexes
CREATE INDEX IF NOT EXISTS "idx_artist_tm" ON "artists"("tm_attraction_id");
CREATE INDEX IF NOT EXISTS "idx_artist_spotify" ON "artists"("spotify_id");

-- Show indexes  
CREATE INDEX IF NOT EXISTS "idx_show_artist_date" ON "shows"("headliner_artist_id", "date" DESC);

-- Venue indexes
CREATE INDEX IF NOT EXISTS "idx_venue_tm" ON "venues"("tm_venue_id");

-- Song indexes
CREATE INDEX IF NOT EXISTS "idx_song_isrc" ON "songs"("isrc");
CREATE INDEX IF NOT EXISTS "idx_song_pop" ON "songs"("popularity");

-- Import status indexes
CREATE INDEX IF NOT EXISTS "idx_import_status_artist" ON "import_status"("artist_id");

-- 8. SKIP ENUM UPDATES - no import_stage enum exists
-- Stage will be stored as TEXT field instead

-- Add helpful comment
COMMENT ON TABLE "artists" IS 'Updated to match GROK.md schema with tmAttractionId, importStatus, and sync timestamps';
COMMENT ON TABLE "venues" IS 'Updated to match GROK.md schema with tmVenueId field';
COMMENT ON TABLE "shows" IS 'Updated to match GROK.md schema with tmEventId and setlistReady fields';
COMMENT ON TABLE "songs" IS 'Updated to match GROK.md schema with ISRC, isLive, isRemix fields and renamed columns';
COMMENT ON TABLE "import_status" IS 'Updated to match GROK.md schema with proper UUID FK to artists table';