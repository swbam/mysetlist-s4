-- Create artist_songs table to properly link songs to artists for full catalog support
CREATE TABLE IF NOT EXISTS artist_songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    is_primary_artist BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(artist_id, song_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_artist_songs_artist_id ON artist_songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_songs_song_id ON artist_songs(song_id);

-- Add updated_at trigger
CREATE TRIGGER update_artist_songs_updated_at
BEFORE UPDATE ON artist_songs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add missing fields to songs table for better Spotify integration
ALTER TABLE songs 
ADD COLUMN IF NOT EXISTS album_id TEXT,
ADD COLUMN IF NOT EXISTS track_number INTEGER,
ADD COLUMN IF NOT EXISTS disc_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS album_type TEXT, -- 'album', 'single', 'compilation'
ADD COLUMN IF NOT EXISTS spotify_uri TEXT,
ADD COLUMN IF NOT EXISTS external_urls JSONB DEFAULT '{}';

-- Add index for album_id for better performance
CREATE INDEX IF NOT EXISTS idx_songs_album_id ON songs(album_id);
CREATE INDEX IF NOT EXISTS idx_songs_spotify_id ON songs(spotify_id);

-- Update artists table to track sync progress
ALTER TABLE artists
ADD COLUMN IF NOT EXISTS total_albums INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_songs INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_full_sync_at TIMESTAMP WITH TIME ZONE;

-- Add comment for clarity
COMMENT ON TABLE artist_songs IS 'Links songs to artists, supporting multiple artists per song';
COMMENT ON COLUMN artist_songs.is_primary_artist IS 'True if this is the primary/main artist for the song';