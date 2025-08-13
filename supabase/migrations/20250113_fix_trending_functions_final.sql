-- =====================================================================
-- Fix Trending Functions to Match Actual Schema
-- =====================================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS update_trending_scores() CASCADE;
DROP FUNCTION IF EXISTS refresh_trending_data() CASCADE;

-- Create function to update trending scores (matching actual schema)
CREATE OR REPLACE FUNCTION update_trending_scores()
RETURNS void AS $$
BEGIN
  -- Update artist stats trending score
  UPDATE artist_stats
  SET 
    trending_score = GREATEST(0, COALESCE(
      (popularity * 0.3 + 
       COALESCE(monthly_listeners, 0) * 0.00001 + 
       COALESCE(followers, 0) * 0.00001 +
       CASE WHEN has_upcoming_shows THEN 20 ELSE 0 END +
       CASE WHEN last_show_date > CURRENT_DATE - INTERVAL '30 days' THEN 10 ELSE 0 END),
      0
    )),
    trending_score_updated_at = NOW()
  WHERE artist_id IN (
    SELECT id FROM artists WHERE verified = true
  );

  -- Update trending_artists table (using actual schema)
  INSERT INTO trending_artists (
    artist_id, 
    score, 
    votes_count,
    shows_count,
    followers_count,
    momentum_score,
    updated_at
  )
  SELECT 
    ast.artist_id,
    ast.trending_score,
    COALESCE(vote_counts.total_votes, 0),
    COALESCE(show_counts.total_shows, 0),
    COALESCE(ast.followers, 0),
    CASE 
      WHEN ast.trending_score > 50 THEN ast.trending_score * 1.2
      ELSE ast.trending_score 
    END,
    NOW()
  FROM artist_stats ast
  LEFT JOIN (
    SELECT artist_id, COUNT(*) as total_votes
    FROM votes v
    JOIN songs s ON v.song_id = s.id
    GROUP BY artist_id
  ) vote_counts ON vote_counts.artist_id = ast.artist_id
  LEFT JOIN (
    SELECT headliner_artist_id as artist_id, COUNT(*) as total_shows
    FROM shows
    WHERE date >= CURRENT_DATE
    GROUP BY headliner_artist_id
  ) show_counts ON show_counts.artist_id = ast.artist_id
  WHERE ast.trending_score > 0
  ORDER BY ast.trending_score DESC
  LIMIT 100
  ON CONFLICT (artist_id) 
  DO UPDATE SET 
    score = EXCLUDED.score,
    votes_count = EXCLUDED.votes_count,
    shows_count = EXCLUDED.shows_count,
    followers_count = EXCLUDED.followers_count,
    momentum_score = EXCLUDED.momentum_score,
    updated_at = NOW();

  -- Update shows trending scores
  UPDATE shows
  SET 
    trending_score = GREATEST(0, COALESCE(
      (
        -- Base score from ticket availability
        CASE 
          WHEN ticket_status = 'onsale' THEN 50
          WHEN ticket_status = 'presale' THEN 40
          ELSE 10
        END +
        -- Days until show (closer = higher score)
        CASE 
          WHEN date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 50
          WHEN date BETWEEN CURRENT_DATE + INTERVAL '7 days' AND CURRENT_DATE + INTERVAL '30 days' THEN 30
          WHEN date BETWEEN CURRENT_DATE + INTERVAL '30 days' AND CURRENT_DATE + INTERVAL '90 days' THEN 20
          ELSE 5
        END +
        -- Artist popularity bonus
        COALESCE((
          SELECT trending_score * 0.5
          FROM artist_stats 
          WHERE artist_id = shows.headliner_artist_id
        ), 0)
      ),
      0
    )),
    trending_score_updated_at = NOW()
  WHERE date >= CURRENT_DATE
  AND date <= CURRENT_DATE + INTERVAL '180 days';

  -- Update trending_shows table (using actual schema)
  INSERT INTO trending_shows (
    show_id,
    score,
    tickets_available,
    votes_count,
    artist_popularity,
    days_until,
    updated_at
  )
  SELECT 
    s.id,
    s.trending_score,
    CASE WHEN s.ticket_status IN ('onsale', 'presale') THEN true ELSE false END,
    COALESCE(vote_counts.total_votes, 0),
    COALESCE(ast.popularity, 0),
    EXTRACT(DAY FROM (s.date - CURRENT_DATE)),
    NOW()
  FROM shows s
  LEFT JOIN artist_stats ast ON ast.artist_id = s.headliner_artist_id
  LEFT JOIN (
    SELECT setlist_id, COUNT(*) as total_votes
    FROM votes
    GROUP BY setlist_id
  ) vote_counts ON vote_counts.setlist_id = s.setlist_id
  WHERE s.trending_score > 0
  AND s.date >= CURRENT_DATE
  ORDER BY s.trending_score DESC
  LIMIT 100
  ON CONFLICT (show_id) 
  DO UPDATE SET 
    score = EXCLUDED.score,
    tickets_available = EXCLUDED.tickets_available,
    votes_count = EXCLUDED.votes_count,
    artist_popularity = EXCLUDED.artist_popularity,
    days_until = EXCLUDED.days_until,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to refresh trending data
CREATE OR REPLACE FUNCTION refresh_trending_data()
RETURNS jsonb AS $$
DECLARE
  artists_updated INTEGER;
  shows_updated INTEGER;
BEGIN
  -- Call update_trending_scores
  PERFORM update_trending_scores();
  
  -- Get counts
  SELECT COUNT(*) INTO artists_updated 
  FROM trending_artists 
  WHERE updated_at > NOW() - INTERVAL '1 minute';
  
  SELECT COUNT(*) INTO shows_updated 
  FROM trending_shows 
  WHERE updated_at > NOW() - INTERVAL '1 minute';
  
  -- Clean up old trending data (keep last 30 days)
  DELETE FROM trending_artists WHERE updated_at < NOW() - INTERVAL '30 days';
  DELETE FROM trending_shows WHERE updated_at < NOW() - INTERVAL '30 days';
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Trending data refreshed successfully',
    'timestamp', NOW(),
    'artists_updated', artists_updated,
    'shows_updated', shows_updated
  );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_trending_scores() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION refresh_trending_data() TO anon, authenticated, service_role;

-- Add comments
COMMENT ON FUNCTION update_trending_scores() IS 'Updates trending scores for all artists and shows based on popularity metrics';
COMMENT ON FUNCTION refresh_trending_data() IS 'Refreshes all trending data and returns statistics';