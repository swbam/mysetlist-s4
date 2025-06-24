-- Function to update artist trending scores
CREATE OR REPLACE FUNCTION update_artist_trending_scores()
RETURNS void AS $$
BEGIN
  UPDATE artists
  SET trending_score = (
    -- Base score from popularity and followers
    (COALESCE(popularity, 0) / 100.0 * 0.3) +
    (LEAST(COALESCE(follower_count, 0) / 10000.0, 1.0) * 0.2) +
    -- Recent show activity (shows in next 30 days)
    (
      SELECT COUNT(*) * 0.1
      FROM shows
      WHERE headliner_artist_id = artists.id
        AND date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    ) +
    -- Recent setlist activity (setlists in last 7 days)
    (
      SELECT COUNT(*) * 0.05
      FROM setlists s
      JOIN shows sh ON s.show_id = sh.id
      WHERE sh.headliner_artist_id = artists.id
        AND s.created_at > NOW() - INTERVAL '7 days'
    ) +
    -- User engagement (views, follows in last 30 days)
    (
      SELECT COALESCE(SUM(
        CASE 
          WHEN created_at > NOW() - INTERVAL '7 days' THEN 0.02
          WHEN created_at > NOW() - INTERVAL '30 days' THEN 0.01
          ELSE 0
        END
      ), 0)
      FROM user_follows_artists
      WHERE artist_id = artists.id
    )
  ),
  updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update show trending scores
CREATE OR REPLACE FUNCTION update_show_trending_scores()
RETURNS void AS $$
BEGIN
  UPDATE shows
  SET trending_score = (
    -- Base score from time proximity (upcoming shows score higher)
    CASE
      WHEN date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 0.5
      WHEN date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 0.3
      WHEN date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days' THEN 0.1
      ELSE 0
    END +
    -- View count impact
    (LEAST(COALESCE(view_count, 0) / 1000.0, 1.0) * 0.2) +
    -- Setlist count impact
    (LEAST(COALESCE(setlist_count, 0) / 10.0, 1.0) * 0.15) +
    -- Vote count impact
    (LEAST(COALESCE(vote_count, 0) / 100.0, 1.0) * 0.1) +
    -- Featured boost
    (CASE WHEN is_featured THEN 0.25 ELSE 0 END) +
    -- Artist popularity impact
    (
      SELECT COALESCE(popularity, 0) / 100.0 * 0.2
      FROM artists
      WHERE id = shows.headliner_artist_id
    )
  ),
  updated_at = NOW()
  WHERE date >= CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shows_trending_score ON shows(trending_score DESC) WHERE status = 'upcoming';
CREATE INDEX IF NOT EXISTS idx_artists_trending_score ON artists(trending_score DESC);

-- Schedule these functions to run periodically (you'll need to set up pg_cron or similar)
-- Example with pg_cron:
-- SELECT cron.schedule('update-trending-scores', '0 * * * *', 'SELECT update_artist_trending_scores(); SELECT update_show_trending_scores();');