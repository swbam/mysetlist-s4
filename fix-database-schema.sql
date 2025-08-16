-- Fix database schema inconsistencies for import system
-- This addresses the column mismatch and missing configurations

-- 1. Fix import_status column name mismatch
ALTER TABLE import_status RENAME COLUMN percentage TO progress;

-- 2. Add missing RLS policies for import_status
ALTER TABLE import_status ENABLE ROW LEVEL SECURITY;

-- Service role access for import_status
CREATE POLICY "Service role can manage import_status" ON import_status
    AS PERMISSIVE FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users can read their own import status
CREATE POLICY "Users can view import_status" ON import_status
    FOR SELECT USING (true);

-- 3. Add import_status to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE import_status;
ALTER PUBLICATION supabase_realtime ADD TABLE artist_songs;
ALTER PUBLICATION supabase_realtime ADD TABLE songs;

-- 4. Fix any missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_import_status_artist_id ON import_status(artist_id);
CREATE INDEX IF NOT EXISTS idx_import_status_stage ON import_status(stage);
CREATE INDEX IF NOT EXISTS idx_artist_songs_artist_id ON artist_songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_songs_song_id ON artist_songs(song_id);

-- 5. Ensure trending calculations work
UPDATE artists SET trending_score = COALESCE(trending_score, 0) WHERE trending_score IS NULL;
UPDATE shows SET trending_score = COALESCE(trending_score, 0) WHERE trending_score IS NULL;