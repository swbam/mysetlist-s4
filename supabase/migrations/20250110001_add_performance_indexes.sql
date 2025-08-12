CREATE INDEX IF NOT EXISTS idx_songs_search ON songs USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_venues_search ON venues USING gin(to_tsvector('english', name || ' ' || city || ' ' || COALESCE(state, '')));

-- Add comment
COMMENT ON INDEX idx_shows_trending_featured IS 'Optimized for trending shows queries filtered by upcoming status';
COMMENT ON INDEX idx_artists_search IS 'Full-text search index for artist names and genres';
COMMENT ON INDEX idx_anonymous_suggestions_session_created IS 'Optimized for rate limiting checks by session';
