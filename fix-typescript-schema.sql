-- Additional database fixes to ensure complete schema alignment
-- These are additional SQL fixes that may be needed based on TypeScript errors

-- 1. Ensure all tables have the correct field names as expected by the code
-- Update any remaining old column names that TypeScript is expecting

-- Fix shows table if needed (TypeScript expects certain fields)
ALTER TABLE shows ADD COLUMN IF NOT EXISTS "tm_event_id" TEXT;
ALTER TABLE shows DROP CONSTRAINT IF EXISTS shows_tm_event_id_unique;
ALTER TABLE shows ADD CONSTRAINT shows_tm_event_id_unique UNIQUE(tm_event_id);

-- Fix venues table if needed 
ALTER TABLE venues ADD COLUMN IF NOT EXISTS "tm_venue_id" TEXT;
ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_tm_venue_id_unique; 
ALTER TABLE venues ADD CONSTRAINT venues_tm_venue_id_unique UNIQUE(tm_venue_id);

-- Fix songs table - ensure it has 'name' column (not 'title')
DO $$
BEGIN
    -- Check if we still have title column and need to migrate
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'songs' AND column_name = 'title') THEN
        -- Add name column
        ALTER TABLE songs ADD COLUMN IF NOT EXISTS name TEXT;
        
        -- Migrate data
        UPDATE songs SET name = title WHERE name IS NULL AND title IS NOT NULL;
        
        -- Drop old column
        ALTER TABLE songs DROP COLUMN title;
    END IF;
    
    -- Ensure name column is NOT NULL
    ALTER TABLE songs ALTER COLUMN name SET NOT NULL;
END $$;

-- Fix songs table - ensure it has 'album_name' column (not 'album')
DO $$
BEGIN
    -- Check if we still have album column and need to migrate
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'songs' AND column_name = 'album') THEN
        -- Add album_name column
        ALTER TABLE songs ADD COLUMN IF NOT EXISTS album_name TEXT;
        
        -- Migrate data
        UPDATE songs SET album_name = album WHERE album_name IS NULL AND album IS NOT NULL;
        
        -- Drop old column
        ALTER TABLE songs DROP COLUMN album;
    END IF;
END $$;

-- Verify critical columns exist with correct names
SELECT 
    'Schema verification' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artists' AND column_name = 'tm_attraction_id') 
        THEN 'artists.tm_attraction_id: OK'
        ELSE 'artists.tm_attraction_id: MISSING'
    END as artists_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'tm_venue_id') 
        THEN 'venues.tm_venue_id: OK'
        ELSE 'venues.tm_venue_id: MISSING'
    END as venues_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shows' AND column_name = 'tm_event_id') 
        THEN 'shows.tm_event_id: OK'
        ELSE 'shows.tm_event_id: MISSING'
    END as shows_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'songs' AND column_name = 'name') 
        THEN 'songs.name: OK'
        ELSE 'songs.name: MISSING'
    END as songs_name_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'songs' AND column_name = 'album_name') 
        THEN 'songs.album_name: OK'
        ELSE 'songs.album_name: MISSING'
    END as songs_album_check;