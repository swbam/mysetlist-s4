-- Fix RLS policies and realtime publication
-- Run this script in your Supabase SQL editor

-- 1. Enable RLS on import_status table if not already enabled
ALTER TABLE import_status ENABLE ROW LEVEL SECURITY;

-- 2. Add RLS policies for import_status
-- Service role access for import_status
CREATE POLICY "Service role can manage import_status" ON import_status
    AS PERMISSIVE FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users can read import status
CREATE POLICY "Users can view import_status" ON import_status
    FOR SELECT USING (true);

-- 3. Enable RLS on artist_songs table if not already enabled  
ALTER TABLE artist_songs ENABLE ROW LEVEL SECURITY;

-- Service role access for artist_songs
CREATE POLICY "Service role can manage artist_songs" ON artist_songs
    AS PERMISSIVE FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Users can view artist songs
CREATE POLICY "Users can view artist_songs" ON artist_songs
    FOR SELECT USING (true);

-- 4. Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE import_status;
ALTER PUBLICATION supabase_realtime ADD TABLE artist_songs;
ALTER PUBLICATION supabase_realtime ADD TABLE songs;

-- 5. Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_import_status_artist_id ON import_status(artist_id);
CREATE INDEX IF NOT EXISTS idx_import_status_stage ON import_status(stage);
CREATE INDEX IF NOT EXISTS idx_artist_songs_artist_id ON artist_songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_songs_song_id ON artist_songs(song_id);

-- 6. Ensure trending scores are not null
UPDATE artists SET trending_score = COALESCE(trending_score, 0) WHERE trending_score IS NULL;
UPDATE shows SET trending_score = COALESCE(trending_score, 0) WHERE trending_score IS NULL;

-- Success message
SELECT 'RLS policies and realtime publication setup completed successfully!' as result;