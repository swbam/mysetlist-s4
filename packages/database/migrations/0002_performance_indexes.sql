-- Performance indexes for fast queries
-- Run this migration to significantly improve query performance

-- Artists table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_tm_attraction 
  ON artists(tm_attraction_id) 
  WHERE tm_attraction_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_spotify 
  ON artists(spotify_id) 
  WHERE spotify_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_slug 
  ON artists(slug);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_popularity 
  ON artists(popularity DESC NULLS LAST);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_trending 
  ON artists(is_trending, trending_score DESC) 
  WHERE is_trending = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_last_synced 
  ON artists(last_synced_at DESC NULLS LAST);

-- Shows table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_artist_date 
  ON shows(headliner_artist_id, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_tm_event 
  ON shows(tm_event_id) 
  WHERE tm_event_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_venue 
  ON shows(venue_id) 
  WHERE venue_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_upcoming 
  ON shows(date) 
  WHERE date >= CURRENT_DATE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_status 
  ON shows(status) 
  WHERE status IN ('scheduled', 'onsale');

-- Songs table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_spotify 
  ON songs(spotify_id) 
  WHERE spotify_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_popularity 
  ON songs(popularity DESC NULLS LAST);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_name_trgm 
  ON songs USING gin(name gin_trgm_ops);

-- Venues table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venues_tm_venue 
  ON venues(tm_venue_id) 
  WHERE tm_venue_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venues_location 
  ON venues(city, state, country);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venues_geo 
  ON venues(latitude, longitude) 
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Artist songs junction table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artist_songs_artist 
  ON artist_songs(artist_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artist_songs_song 
  ON artist_songs(song_id);

-- Setlists table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlists_show 
  ON setlists(show_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlists_artist 
  ON setlists(artist_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlists_type 
  ON setlists(type);

-- Setlist songs table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlist_songs_setlist 
  ON setlist_songs(setlist_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlist_songs_position 
  ON setlist_songs(setlist_id, position);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlist_songs_upvotes 
  ON setlist_songs(upvotes DESC);

-- Votes table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_user 
  ON votes(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_setlist_song 
  ON votes(setlist_song_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_created 
  ON votes(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_unique 
  ON votes(user_id, setlist_song_id);

-- User profiles table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_user 
  ON user_profiles(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_username 
  ON user_profiles(username) 
  WHERE username IS NOT NULL;

-- Import status table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_import_status_job 
  ON import_status(job_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_import_status_artist 
  ON import_status(artist_id) 
  WHERE artist_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_import_status_stage 
  ON import_status(stage) 
  WHERE stage NOT IN ('completed', 'failed');

-- Sync jobs table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_jobs_entity 
  ON sync_jobs(entity_type, entity_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_jobs_status 
  ON sync_jobs(status) 
  WHERE status IN ('pending', 'in_progress');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_jobs_priority 
  ON sync_jobs(priority, created_at) 
  WHERE status = 'pending';

-- Materialized view for artist dashboard (optional but recommended)
CREATE MATERIALIZED VIEW IF NOT EXISTS artist_dashboard AS
SELECT 
  a.id,
  a.slug,
  a.name,
  a.image_url,
  a.popularity,
  a.followers,
  a.is_trending,
  a.trending_score,
  COUNT(DISTINCT s.id) as total_songs,
  COUNT(DISTINCT sh.id) as total_shows,
  COUNT(DISTINCT CASE WHEN sh.date >= CURRENT_DATE THEN sh.id END) as upcoming_shows,
  COUNT(DISTINCT sh.venue_id) as total_venues,
  MAX(sh.date) as latest_show_date,
  MIN(CASE WHEN sh.date >= CURRENT_DATE THEN sh.date END) as next_show_date
FROM artists a
LEFT JOIN artist_songs aso ON aso.artist_id = a.id
LEFT JOIN songs s ON s.id = aso.song_id
LEFT JOIN shows sh ON sh.headliner_artist_id = a.id
GROUP BY a.id;

-- Index for the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_artist_dashboard_id 
  ON artist_dashboard(id);

CREATE INDEX IF NOT EXISTS idx_artist_dashboard_slug 
  ON artist_dashboard(slug);

CREATE INDEX IF NOT EXISTS idx_artist_dashboard_trending 
  ON artist_dashboard(is_trending, trending_score DESC) 
  WHERE is_trending = true;

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_artist_dashboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY artist_dashboard;
END;
$$ LANGUAGE plpgsql;

-- Enable trigram extension for fuzzy search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add GIN indexes for full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_search 
  ON artists USING gin(
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(genres::text, ''))
  );

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_search 
  ON songs USING gin(
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(album_name, ''))
  );

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venues_search 
  ON venues USING gin(
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(city, '') || ' ' || coalesce(state, ''))
  );

-- Analyze tables to update statistics after creating indexes
ANALYZE artists;
ANALYZE shows;
ANALYZE songs;
ANALYZE venues;
ANALYZE artist_songs;
ANALYZE setlists;
ANALYZE setlist_songs;
ANALYZE votes;
ANALYZE user_profiles;
ANALYZE import_status;
ANALYZE sync_jobs;