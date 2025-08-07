-- Create trending materialized views and refresh function used by optimized endpoints

-- Trending artists summary
CREATE MATERIALIZED VIEW IF NOT EXISTS trending_artists_summary AS
SELECT a.id,
       a.name,
       a.slug,
       a.image_url,
       a.small_image_url,
       a.genres,
       a.popularity,
       a.followers,
       a.trending_score,
       a.verified,
       a.total_shows,
       a.upcoming_shows,
       a.updated_at
FROM artists a
WHERE a.trending_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trending_artists_score
  ON trending_artists_summary (trending_score DESC);

-- Trending shows summary
CREATE MATERIALIZED VIEW IF NOT EXISTS trending_shows_summary AS
SELECT s.id,
       s.name,
       s.slug,
       s.date,
       s.status,
       s.headliner_artist_id,
       s.venue_id,
       s.vote_count,
       s.attendee_count,
       s.view_count,
       s.trending_score,
       s.updated_at
FROM shows s
WHERE s.trending_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trending_shows_score
  ON trending_shows_summary (trending_score DESC);

-- Refresh helper
CREATE OR REPLACE FUNCTION refresh_trending_data() RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY trending_artists_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY trending_shows_summary;
END;
$$ LANGUAGE plpgsql;


