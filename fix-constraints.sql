-- Critical Database Constraint Fixes
-- Resolves all UPSERT and constraint issues blocking import functionality

-- Start transaction for atomic fixes
BEGIN;

-- 1. FIX IMPORT_STATUS CONSTRAINT ISSUE
-- The main issue: import_status table needs unique constraint on artist_id for ON CONFLICT to work

-- First, check if import_status table exists and create if missing
CREATE TABLE IF NOT EXISTS import_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id UUID NOT NULL,
    stage VARCHAR(50) NOT NULL,
    progress INTEGER DEFAULT 0,
    message TEXT,
    error TEXT,
    job_id VARCHAR(255),
    total_songs INTEGER DEFAULT 0,
    total_shows INTEGER DEFAULT 0,
    total_venues INTEGER DEFAULT 0,
    artist_name VARCHAR(255),
    started_at TIMESTAMP,
    phase_timings JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP
);

-- Remove any duplicate rows in import_status before adding constraint
WITH duplicates AS (
    SELECT artist_id, MIN(id) as keep_id
    FROM import_status 
    GROUP BY artist_id
)
DELETE FROM import_status 
WHERE id NOT IN (SELECT keep_id FROM duplicates);

-- Add the critical UNIQUE constraint on artist_id that's missing
ALTER TABLE import_status 
    DROP CONSTRAINT IF EXISTS import_status_artist_id_unique;
    
ALTER TABLE import_status 
    ADD CONSTRAINT import_status_artist_id_unique UNIQUE(artist_id);

-- Add foreign key constraint if it doesn't exist
ALTER TABLE import_status 
    DROP CONSTRAINT IF EXISTS import_status_artist_id_fkey;
    
ALTER TABLE import_status 
    ADD CONSTRAINT import_status_artist_id_fkey 
    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_import_status_artist ON import_status(artist_id);

-- 2. FIX VENUE SLUG CONFLICTS
-- Generate unique slugs using tm_venue_id + name combination to avoid conflicts

-- Function to generate safe slugs
CREATE OR REPLACE FUNCTION generate_safe_slug(input_text TEXT, fallback_id TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Generate base slug from input text
    base_slug := LOWER(TRIM(REGEXP_REPLACE(
        REGEXP_REPLACE(input_text, '[^a-zA-Z0-9\s\-]', '', 'g'),
        '\s+', '-', 'g'
    )));
    
    -- Ensure slug is not empty
    IF LENGTH(base_slug) < 1 THEN
        base_slug := COALESCE(fallback_id, 'venue');
    END IF;
    
    -- Truncate if too long
    IF LENGTH(base_slug) > 50 THEN
        base_slug := LEFT(base_slug, 50);
    END IF;
    
    -- Check for uniqueness and add counter if needed
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM venues WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter::TEXT;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Fix existing venue slugs that cause conflicts
UPDATE venues 
SET slug = generate_safe_slug(
    COALESCE(name, 'venue'), 
    COALESCE(tm_venue_id, id::TEXT)
)
WHERE id IN (
    -- Find venues with duplicate slugs
    SELECT DISTINCT v1.id 
    FROM venues v1 
    INNER JOIN venues v2 ON v1.slug = v2.slug AND v1.id != v2.id
);

-- 3. ENSURE PROPER CONSTRAINTS ON ALL CORE TABLES

-- Artists table constraints
ALTER TABLE artists 
    DROP CONSTRAINT IF EXISTS artists_tm_attraction_id_unique;
ALTER TABLE artists 
    ADD CONSTRAINT artists_tm_attraction_id_unique UNIQUE(tm_attraction_id);

ALTER TABLE artists 
    DROP CONSTRAINT IF EXISTS artists_spotify_id_unique;
ALTER TABLE artists 
    ADD CONSTRAINT artists_spotify_id_unique UNIQUE(spotify_id);

ALTER TABLE artists 
    DROP CONSTRAINT IF EXISTS artists_slug_unique;
ALTER TABLE artists 
    ADD CONSTRAINT artists_slug_unique UNIQUE(slug);

-- Venues table constraints  
ALTER TABLE venues 
    DROP CONSTRAINT IF EXISTS venues_tm_venue_id_unique;
ALTER TABLE venues 
    ADD CONSTRAINT venues_tm_venue_id_unique UNIQUE(tm_venue_id);

ALTER TABLE venues 
    DROP CONSTRAINT IF EXISTS venues_slug_unique;
ALTER TABLE venues 
    ADD CONSTRAINT venues_slug_unique UNIQUE(slug);

-- Shows table constraints
ALTER TABLE shows 
    DROP CONSTRAINT IF EXISTS shows_tm_event_id_unique;
ALTER TABLE shows 
    ADD CONSTRAINT shows_tm_event_id_unique UNIQUE(tm_event_id);

-- Songs table constraints
ALTER TABLE songs 
    DROP CONSTRAINT IF EXISTS songs_spotify_id_unique;
ALTER TABLE songs 
    ADD CONSTRAINT songs_spotify_id_unique UNIQUE(spotify_id);

-- 4. ARTIST_SONGS JUNCTION TABLE FIX
-- Ensure proper primary key for UPSERT operations

-- Check if artist_songs table has the right structure
DO $$
BEGIN
    -- Drop old primary key if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'artist_songs_pkey' 
        AND table_name = 'artist_songs'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE artist_songs DROP CONSTRAINT artist_songs_pkey;
    END IF;
    
    -- Remove id column if it exists (should be composite key)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'artist_songs' AND column_name = 'id'
    ) THEN
        ALTER TABLE artist_songs DROP COLUMN id;
    END IF;
    
    -- Ensure composite primary key exists
    ALTER TABLE artist_songs ADD CONSTRAINT artist_songs_pkey PRIMARY KEY (artist_id, song_id);
END $$;

-- 5. ADD MISSING INDEXES FOR PERFORMANCE

-- Artist indexes
CREATE INDEX IF NOT EXISTS idx_artist_tm_attraction ON artists(tm_attraction_id);
CREATE INDEX IF NOT EXISTS idx_artist_spotify ON artists(spotify_id);
CREATE INDEX IF NOT EXISTS idx_artist_slug ON artists(slug);

-- Venue indexes
CREATE INDEX IF NOT EXISTS idx_venue_tm ON venues(tm_venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_slug ON venues(slug);

-- Show indexes
CREATE INDEX IF NOT EXISTS idx_show_tm_event ON shows(tm_event_id);
CREATE INDEX IF NOT EXISTS idx_show_artist_date ON shows(headliner_artist_id, date DESC);

-- Song indexes
CREATE INDEX IF NOT EXISTS idx_song_spotify ON songs(spotify_id);
CREATE INDEX IF NOT EXISTS idx_song_isrc ON songs(isrc) WHERE isrc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_song_popularity ON songs(popularity) WHERE popularity IS NOT NULL;

-- Import logs indexes
CREATE INDEX IF NOT EXISTS idx_import_logs_artist_id ON import_logs(artist_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_job_id ON import_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_level ON import_logs(level);
CREATE INDEX IF NOT EXISTS idx_import_logs_created_at ON import_logs(created_at);

-- 6. UPDATE FUNCTION FOR VENUE SLUG GENERATION ON INSERT/UPDATE
CREATE OR REPLACE FUNCTION ensure_unique_venue_slug() 
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-generate slug if not provided or conflicts exist
    IF NEW.slug IS NULL OR EXISTS (SELECT 1 FROM venues WHERE slug = NEW.slug AND id != NEW.id) THEN
        NEW.slug := generate_safe_slug(
            COALESCE(NEW.name, 'venue'),
            COALESCE(NEW.tm_venue_id, NEW.id::TEXT)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for venue slug generation
DROP TRIGGER IF EXISTS trigger_venue_slug ON venues;
CREATE TRIGGER trigger_venue_slug 
    BEFORE INSERT OR UPDATE ON venues 
    FOR EACH ROW EXECUTE FUNCTION ensure_unique_venue_slug();

-- 7. CLEAN UP ANY INVALID DATA

-- Remove any null values in required fields
DELETE FROM import_status WHERE artist_id IS NULL;
DELETE FROM artist_songs WHERE artist_id IS NULL OR song_id IS NULL;

-- Ensure all venues have valid slugs
UPDATE venues 
SET slug = generate_safe_slug(COALESCE(name, 'venue'), COALESCE(tm_venue_id, id::TEXT))
WHERE slug IS NULL OR slug = '';

-- Ensure all artists have valid slugs
UPDATE artists 
SET slug = generate_safe_slug(COALESCE(name, 'artist'), COALESCE(tm_attraction_id, id::TEXT))
WHERE slug IS NULL OR slug = '';

-- 8. VERIFY CONSTRAINTS ARE WORKING

-- Test that UPSERT will work on import_status
DO $$
DECLARE
    test_artist_id UUID;
    test_result RECORD;
BEGIN
    -- Get a real artist ID for testing
    SELECT id INTO test_artist_id FROM artists LIMIT 1;
    
    IF test_artist_id IS NOT NULL THEN
        -- Test UPSERT operation
        INSERT INTO import_status (artist_id, stage, progress, message)
        VALUES (test_artist_id, 'test', 0, 'Testing constraint')
        ON CONFLICT (artist_id) DO UPDATE SET
            stage = EXCLUDED.stage,
            progress = EXCLUDED.progress,
            message = EXCLUDED.message,
            updated_at = NOW();
            
        -- Clean up test data
        DELETE FROM import_status WHERE artist_id = test_artist_id AND stage = 'test';
        
        RAISE NOTICE 'UPSERT test passed for import_status table';
    END IF;
END $$;

-- Clean up the helper function (keep for future use)
-- DROP FUNCTION IF EXISTS generate_safe_slug(TEXT, TEXT);

COMMIT;

-- Final verification queries
SELECT 'import_status constraint check' as test, 
       COUNT(*) as total_rows,
       COUNT(DISTINCT artist_id) as unique_artists
FROM import_status;

SELECT 'venue slug conflict check' as test,
       COUNT(*) as total_venues,
       COUNT(DISTINCT slug) as unique_slugs
FROM venues;

SELECT 'Constraint fixes completed successfully' as status;