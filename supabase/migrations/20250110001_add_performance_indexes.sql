-- Performance indexes for MySetlist application

-- Artists table indexes
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);
CREATE INDEX IF NOT EXISTS idx_artists_slug ON artists(slug);
CREATE INDEX IF NOT EXISTS idx_artists_musicbrainz_id ON artists(musicbrainz_id) WHERE musicbrainz_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_artists_trending_score ON artists(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_artists_featured ON artists(is_featured) WHERE is_featured = true;

-- Shows table indexes
CREATE INDEX IF NOT EXISTS idx_shows_date ON shows(date DESC);
CREATE INDEX IF NOT EXISTS idx_shows_status ON shows(status);
CREATE INDEX IF NOT EXISTS idx_shows_headliner_artist_id ON shows(headliner_artist_id);
CREATE INDEX IF NOT EXISTS idx_shows_venue_id ON shows(venue_id);
CREATE INDEX IF NOT EXISTS idx_shows_trending_score ON shows(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_shows_featured ON shows(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_shows_date_status ON shows(date DESC, status);

-- Show artists composite indexes (for lineups)
CREATE INDEX IF NOT EXISTS idx_show_artists_show_id ON show_artists(show_id);
CREATE INDEX IF NOT EXISTS idx_show_artists_artist_id ON show_artists(artist_id);
CREATE INDEX IF NOT EXISTS idx_show_artists_show_order ON show_artists(show_id, order_index);

-- Setlists indexes
CREATE INDEX IF NOT EXISTS idx_setlists_show_id ON setlists(show_id);
CREATE INDEX IF NOT EXISTS idx_setlists_user_id ON setlists(user_id);
CREATE INDEX IF NOT EXISTS idx_setlists_created_at ON setlists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_setlists_trending_score ON setlists(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_setlists_featured ON setlists(is_featured) WHERE is_featured = true;

-- Setlist songs composite indexes
CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist_id ON setlist_songs(setlist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_song_id ON setlist_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_order ON setlist_songs(setlist_id, order_index);

-- Songs indexes
CREATE INDEX IF NOT EXISTS idx_songs_name ON songs(name);
CREATE INDEX IF NOT EXISTS idx_songs_artist_id ON songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_songs_musicbrainz_id ON songs(musicbrainz_id) WHERE musicbrainz_id IS NOT NULL;

-- Artist songs indexes (for catalog)
CREATE INDEX IF NOT EXISTS idx_artist_songs_artist_id ON artist_songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_songs_mbid ON artist_songs(mbid) WHERE mbid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_artist_songs_artist_name ON artist_songs(artist_id, name);

-- Votes indexes
CREATE INDEX IF NOT EXISTS idx_votes_setlist_song_id ON votes(setlist_song_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_composite ON votes(user_id, setlist_song_id);

-- Anonymous suggestions indexes
CREATE INDEX IF NOT EXISTS idx_anonymous_suggestions_session_id ON anonymous_suggestions(session_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_suggestions_created_at ON anonymous_suggestions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anonymous_suggestions_session_created ON anonymous_suggestions(session_id, created_at DESC);

-- Show comments indexes
CREATE INDEX IF NOT EXISTS idx_show_comments_show_id ON show_comments(show_id);
CREATE INDEX IF NOT EXISTS idx_show_comments_user_id ON show_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_show_comments_parent_id ON show_comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_show_comments_created_at ON show_comments(created_at DESC);

-- Venues indexes
CREATE INDEX IF NOT EXISTS idx_venues_name ON venues(name);
CREATE INDEX IF NOT EXISTS idx_venues_city_state ON venues(city, state);
CREATE INDEX IF NOT EXISTS idx_venues_location ON venues(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- User follows artists indexes
CREATE INDEX IF NOT EXISTS idx_user_follows_artists_user_id ON user_follows_artists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_artists_artist_id ON user_follows_artists(artist_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_artists_composite ON user_follows_artists(user_id, artist_id);

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_show_id ON attendance(show_id);
CREATE INDEX IF NOT EXISTS idx_attendance_composite ON attendance(user_id, show_id);

-- Trending and analytics composite indexes
CREATE INDEX IF NOT EXISTS idx_shows_trending_featured ON shows(trending_score DESC, is_featured) 
  WHERE status = 'upcoming';
CREATE INDEX IF NOT EXISTS idx_artists_trending_featured ON artists(trending_score DESC, is_featured);
CREATE INDEX IF NOT EXISTS idx_setlists_trending_featured ON setlists(trending_score DESC, is_featured);

-- Text search indexes (if using full-text search)
CREATE INDEX IF NOT EXISTS idx_artists_search ON artists USING gin(to_tsvector('english', name || ' ' || COALESCE(bio, '')));
CREATE INDEX IF NOT EXISTS idx_songs_search ON songs USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_venues_search ON venues USING gin(to_tsvector('english', name || ' ' || city || ' ' || COALESCE(state, '')));

-- Add comment
COMMENT ON INDEX idx_shows_trending_featured IS 'Optimized for trending shows queries filtered by upcoming status';
COMMENT ON INDEX idx_artists_search IS 'Full-text search index for artist names and bios';
COMMENT ON INDEX idx_anonymous_suggestions_session_created IS 'Optimized for rate limiting checks by session';