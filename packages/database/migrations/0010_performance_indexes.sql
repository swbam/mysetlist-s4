-- Additional performance indexes

-- Artists table indexes
CREATE INDEX IF NOT EXISTS idx_artists_slug ON artists(slug);
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);
CREATE INDEX IF NOT EXISTS idx_artists_verified ON artists(verified) WHERE verified = true;
CREATE INDEX IF NOT EXISTS idx_artists_trending ON artists(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_artists_name_trgm ON artists USING gin(name gin_trgm_ops);

-- Venues table indexes
CREATE INDEX IF NOT EXISTS idx_venues_slug ON venues(slug);
CREATE INDEX IF NOT EXISTS idx_venues_city_country ON venues(city, country);
CREATE INDEX IF NOT EXISTS idx_venues_name_trgm ON venues USING gin(name gin_trgm_ops);

-- Shows table indexes
CREATE INDEX IF NOT EXISTS idx_shows_headliner ON shows(headliner_artist_id);
CREATE INDEX IF NOT EXISTS idx_shows_venue ON shows(venue_id);
CREATE INDEX IF NOT EXISTS idx_shows_slug ON shows(slug);
CREATE INDEX IF NOT EXISTS idx_shows_featured ON shows(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_shows_trending ON shows(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_shows_upcoming ON shows(date, status) WHERE status = 'upcoming';

-- Songs table indexes
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
CREATE INDEX IF NOT EXISTS idx_songs_title_trgm ON songs USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_songs_artist_trgm ON songs USING gin(artist gin_trgm_ops);

-- Setlists table indexes
CREATE INDEX IF NOT EXISTS idx_setlists_show ON setlists(show_id);
CREATE INDEX IF NOT EXISTS idx_setlists_artist ON setlists(artist_id);
CREATE INDEX IF NOT EXISTS idx_setlists_type ON setlists(type);
CREATE INDEX IF NOT EXISTS idx_setlists_created_by ON setlists(created_by);

-- Setlist songs table indexes
CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist ON setlist_songs(setlist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_song ON setlist_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_votes ON setlist_songs(net_votes DESC);

-- Show artists table indexes
CREATE INDEX IF NOT EXISTS idx_show_artists_show ON show_artists(show_id);
CREATE INDEX IF NOT EXISTS idx_show_artists_artist ON show_artists(artist_id);

-- User profiles table indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_public ON user_profiles(is_public) WHERE is_public = true;

-- Artist stats table indexes
CREATE INDEX IF NOT EXISTS idx_artist_stats_artist ON artist_stats(artist_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_shows_date_venue_status ON shows(date, venue_id, status);
CREATE INDEX IF NOT EXISTS idx_setlists_show_artist_type ON setlists(show_id, artist_id, type);
CREATE INDEX IF NOT EXISTS idx_votes_user_setlist_song ON votes(user_id, setlist_song_id);

-- Full text search indexes
CREATE INDEX IF NOT EXISTS idx_artists_search ON artists USING gin(
  to_tsvector('english', name || ' ' || COALESCE(genres, ''))
);

CREATE INDEX IF NOT EXISTS idx_venues_search ON venues USING gin(
  to_tsvector('english', name || ' ' || city || ' ' || country)
);

CREATE INDEX IF NOT EXISTS idx_shows_search ON shows USING gin(
  to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

CREATE INDEX IF NOT EXISTS idx_songs_search ON songs USING gin(
  to_tsvector('english', title || ' ' || artist || ' ' || COALESCE(album, ''))
);