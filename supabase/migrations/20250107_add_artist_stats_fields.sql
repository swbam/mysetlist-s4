-- Add missing fields to artists table
ALTER TABLE artists 
ADD COLUMN IF NOT EXISTS total_shows integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS upcoming_shows integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_setlists integer DEFAULT 0;

-- Add missing fields to artist_stats table
ALTER TABLE artist_stats 
ADD COLUMN IF NOT EXISTS upcoming_shows integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_votes integer DEFAULT 0;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_shows_headliner_artist_id ON shows(headliner_artist_id);
CREATE INDEX IF NOT EXISTS idx_shows_status ON shows(status);
CREATE INDEX IF NOT EXISTS idx_setlists_artist_id ON setlists(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_stats_artist_id ON artist_stats(artist_id);

-- Create index for show_artists relationship
CREATE INDEX IF NOT EXISTS idx_show_artists_show_id ON show_artists(show_id);
CREATE INDEX IF NOT EXISTS idx_show_artists_artist_id ON show_artists(artist_id);
CREATE INDEX IF NOT EXISTS idx_show_artists_order ON show_artists(order_index);