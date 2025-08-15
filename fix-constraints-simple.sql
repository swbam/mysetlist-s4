-- Simple, targeted fixes for critical database constraint issues
-- Fixes the core import functionality problems without complex transactions

-- 1. CRITICAL: Fix import_status table constraint issue
-- This is the main blocker for UPSERT operations

-- Add unique constraint on artist_id if it doesn't exist
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'import_status_artist_id_unique' 
        AND table_name = 'import_status'
    ) THEN
        -- Remove duplicates by keeping the most recent record for each artist_id
        DELETE FROM import_status 
        WHERE id IN (
            SELECT id FROM (
                SELECT id, 
                       ROW_NUMBER() OVER (PARTITION BY artist_id ORDER BY updated_at DESC) as rn
                FROM import_status
            ) t WHERE t.rn > 1
        );
        
        -- Now add the unique constraint
        ALTER TABLE import_status ADD CONSTRAINT import_status_artist_id_unique UNIQUE(artist_id);
        
        RAISE NOTICE 'Added unique constraint on import_status.artist_id';
    ELSE
        RAISE NOTICE 'Unique constraint on import_status.artist_id already exists';
    END IF;
END $$;

-- 2. Fix venue slug conflicts by making slugs unique
-- Generate unique slugs for any duplicates

CREATE OR REPLACE FUNCTION make_slug_unique(base_slug TEXT, venue_id UUID)
RETURNS TEXT AS $$
DECLARE
    unique_slug TEXT;
    counter INTEGER := 0;
BEGIN
    unique_slug := base_slug;
    
    -- Keep adding numbers until we find a unique slug
    WHILE EXISTS (
        SELECT 1 FROM venues 
        WHERE slug = unique_slug AND id != venue_id
    ) LOOP
        counter := counter + 1;
        unique_slug := base_slug || '-' || counter::TEXT;
    END LOOP;
    
    RETURN unique_slug;
END;
$$ LANGUAGE plpgsql;

-- Update duplicate venue slugs
UPDATE venues 
SET slug = make_slug_unique(slug, id)
WHERE id IN (
    SELECT DISTINCT v1.id 
    FROM venues v1 
    INNER JOIN venues v2 ON v1.slug = v2.slug AND v1.id != v2.id
);

-- 3. Ensure all required unique constraints exist

-- Artists table
ALTER TABLE artists DROP CONSTRAINT IF EXISTS artists_tm_attraction_id_unique;
ALTER TABLE artists ADD CONSTRAINT artists_tm_attraction_id_unique UNIQUE(tm_attraction_id);

ALTER TABLE artists DROP CONSTRAINT IF EXISTS artists_spotify_id_unique;  
ALTER TABLE artists ADD CONSTRAINT artists_spotify_id_unique UNIQUE(spotify_id);

ALTER TABLE artists DROP CONSTRAINT IF EXISTS artists_slug_unique;
ALTER TABLE artists ADD CONSTRAINT artists_slug_unique UNIQUE(slug);

-- Venues table
ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_tm_venue_id_unique;
ALTER TABLE venues ADD CONSTRAINT venues_tm_venue_id_unique UNIQUE(tm_venue_id);

ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_slug_unique;
ALTER TABLE venues ADD CONSTRAINT venues_slug_unique UNIQUE(slug);

-- Shows table  
ALTER TABLE shows DROP CONSTRAINT IF EXISTS shows_tm_event_id_unique;
ALTER TABLE shows ADD CONSTRAINT shows_tm_event_id_unique UNIQUE(tm_event_id);

-- Songs table
ALTER TABLE songs DROP CONSTRAINT IF EXISTS songs_spotify_id_unique;
ALTER TABLE songs ADD CONSTRAINT songs_spotify_id_unique UNIQUE(spotify_id);

-- 4. Fix artist_songs table to support proper UPSERT
DO $$
BEGIN
    -- Ensure artist_songs has composite primary key for UPSERT
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'artist_songs_pkey' 
        AND table_name = 'artist_songs'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        -- Remove any existing primary key
        ALTER TABLE artist_songs DROP CONSTRAINT IF EXISTS artist_songs_pkey;
        
        -- Add composite primary key
        ALTER TABLE artist_songs ADD CONSTRAINT artist_songs_pkey PRIMARY KEY (artist_id, song_id);
        
        RAISE NOTICE 'Added composite primary key to artist_songs table';
    END IF;
END $$;

-- 5. Add essential indexes for performance
CREATE INDEX IF NOT EXISTS idx_import_status_artist ON import_status(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_tm_attraction ON artists(tm_attraction_id);
CREATE INDEX IF NOT EXISTS idx_artist_spotify ON artists(spotify_id);
CREATE INDEX IF NOT EXISTS idx_venue_tm ON venues(tm_venue_id);
CREATE INDEX IF NOT EXISTS idx_show_tm_event ON shows(tm_event_id);
CREATE INDEX IF NOT EXISTS idx_song_spotify ON songs(spotify_id);
CREATE INDEX IF NOT EXISTS idx_song_isrc ON songs(isrc) WHERE isrc IS NOT NULL;

-- 6. Test that UPSERT operations will work
DO $$
DECLARE
    test_artist_id UUID;
BEGIN
    -- Get a real artist ID for testing  
    SELECT id INTO test_artist_id FROM artists LIMIT 1;
    
    IF test_artist_id IS NOT NULL THEN
        -- Test import_status UPSERT
        INSERT INTO import_status (artist_id, stage, progress, message)
        VALUES (test_artist_id, 'test', 0, 'Testing UPSERT')
        ON CONFLICT (artist_id) DO UPDATE SET
            stage = EXCLUDED.stage,
            progress = EXCLUDED.progress,
            message = EXCLUDED.message,
            updated_at = NOW();
            
        -- Clean up test data
        DELETE FROM import_status WHERE artist_id = test_artist_id AND stage = 'test';
        
        RAISE NOTICE 'UPSERT test passed - import_status table ready for use';
    END IF;
END $$;

-- Clean up helper function
DROP FUNCTION IF EXISTS make_slug_unique(TEXT, UUID);

-- Summary
SELECT 
    'CONSTRAINT FIXES COMPLETED' as status,
    'import_status UPSERT ready' as import_status_fix,
    'venue slug conflicts resolved' as venue_fix,
    'all unique constraints verified' as constraint_fix;