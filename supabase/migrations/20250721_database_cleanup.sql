-- Database Cleanup Migration
-- This migration fixes critical issues identified in the database schema

-- 1. Fix User Table Inconsistency
-- Create a system user for demo data (if not exists)
INSERT INTO public.users (id, email, role, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'system@mysetlist.com', 'admin', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Reassign demo user data to the system user
UPDATE setlists 
SET created_by = '00000000-0000-0000-0000-000000000000'
WHERE created_by IN (
    SELECT id FROM public.users 
    WHERE id NOT IN (SELECT id FROM auth.users)
);

UPDATE votes 
SET user_id = '00000000-0000-0000-0000-000000000000'
WHERE user_id IN (
    SELECT id FROM public.users 
    WHERE id NOT IN (SELECT id FROM auth.users)
);

-- Now safe to remove demo users
DELETE FROM public.users 
WHERE id NOT IN (SELECT id FROM auth.users)
AND id != '00000000-0000-0000-0000-000000000000';

-- Insert missing auth users into public.users
INSERT INTO public.users (id, email, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    au.created_at,
    au.created_at
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL;

-- 2. Update foreign key references before removing duplicate tables
-- First, check if there's data in votes table that we need to preserve
DO $$ 
BEGIN
    -- If song_votes is empty and votes has data, we're good to proceed
    IF (SELECT COUNT(*) FROM song_votes) = 0 THEN
        -- Drop the empty duplicate table
        DROP TABLE IF EXISTS song_votes CASCADE;
    END IF;
END $$;

-- 3. Remove duplicate venue tips table
DO $$ 
BEGIN
    -- If venue_insider_tips is empty, remove it
    IF (SELECT COUNT(*) FROM venue_insider_tips) = 0 THEN
        DROP TABLE IF EXISTS venue_insider_tips CASCADE;
    END IF;
END $$;

-- 4. Standardize timestamp columns to use timezone
-- This ensures consistency across all tables
ALTER TABLE artists ALTER COLUMN last_synced_at TYPE timestamp with time zone;
ALTER TABLE artists ALTER COLUMN song_catalog_synced_at TYPE timestamp with time zone;
ALTER TABLE artists ALTER COLUMN created_at TYPE timestamp with time zone;
ALTER TABLE artists ALTER COLUMN updated_at TYPE timestamp with time zone;

ALTER TABLE artist_stats ALTER COLUMN last_show_date TYPE timestamp with time zone;
ALTER TABLE artist_stats ALTER COLUMN updated_at TYPE timestamp with time zone;

ALTER TABLE shows ALTER COLUMN created_at TYPE timestamp with time zone;
ALTER TABLE shows ALTER COLUMN updated_at TYPE timestamp with time zone;

ALTER TABLE setlists ALTER COLUMN imported_at TYPE timestamp with time zone;
ALTER TABLE setlists ALTER COLUMN created_at TYPE timestamp with time zone;
ALTER TABLE setlists ALTER COLUMN updated_at TYPE timestamp with time zone;

ALTER TABLE songs ALTER COLUMN created_at TYPE timestamp with time zone;
ALTER TABLE songs ALTER COLUMN updated_at TYPE timestamp with time zone;

-- 5. Add missing indexes for performance
-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_artist_songs_artist_id ON artist_songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_songs_song_id ON artist_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_artist_stats_artist_id ON artist_stats(artist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist_id ON setlist_songs(setlist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_song_id ON setlist_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_show_artists_show_id ON show_artists(show_id);
CREATE INDEX IF NOT EXISTS idx_show_artists_artist_id ON show_artists(artist_id);
CREATE INDEX IF NOT EXISTS idx_shows_venue_id ON shows(venue_id);
CREATE INDEX IF NOT EXISTS idx_shows_headliner_artist_id ON shows(headliner_artist_id);
CREATE INDEX IF NOT EXISTS idx_user_artists_artist_id ON user_artists(artist_id);

-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_artists_slug ON artists(slug);
CREATE INDEX IF NOT EXISTS idx_artists_trending_score ON artists(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_shows_date ON shows(date);
CREATE INDEX IF NOT EXISTS idx_shows_status ON shows(status);
CREATE INDEX IF NOT EXISTS idx_shows_trending_score ON shows(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_songs_spotify_id ON songs(spotify_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status_next_run ON sync_jobs(status, next_run_at) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_sync_logs_job_id_created ON sync_logs(job_id, created_at DESC);

-- 6. Add helpful comments to clarify table purposes
COMMENT ON TABLE votes IS 'User votes on individual songs in setlists';
COMMENT ON TABLE setlist_votes IS 'User votes on entire setlists (kept for future functionality)';
COMMENT ON TABLE venue_tips IS 'User-submitted tips about venues with categorization';
COMMENT ON TABLE sync_jobs IS 'Tracks all data synchronization jobs and their schedules';
COMMENT ON TABLE sync_logs IS 'Detailed logs for sync job executions';

-- 7. Create a function to ensure user consistency going forward
CREATE OR REPLACE FUNCTION ensure_public_user() 
RETURNS TRIGGER AS $$
BEGIN
    -- When a new auth user is created, create corresponding public user
    INSERT INTO public.users (id, email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, NEW.created_at, NEW.created_at)
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to keep tables in sync
DROP TRIGGER IF EXISTS sync_auth_users_to_public ON auth.users;
CREATE TRIGGER sync_auth_users_to_public
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION ensure_public_user();

-- 8. Log this migration
INSERT INTO schema_migrations (version) 
VALUES ('20250721_database_cleanup')
ON CONFLICT (version) DO NOTHING;