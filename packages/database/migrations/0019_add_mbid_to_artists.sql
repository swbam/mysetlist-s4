-- Add MusicBrainz ID (mbid) to artists table for Setlist.fm integration
ALTER TABLE artists 
ADD COLUMN IF NOT EXISTS mbid TEXT UNIQUE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_artists_mbid ON artists(mbid);

-- Add comment for clarity
COMMENT ON COLUMN artists.mbid IS 'MusicBrainz ID used for Setlist.fm API integration';