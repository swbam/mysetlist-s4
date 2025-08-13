-- =====================================================================
-- Fix Trending Functions with Actual Database Schema
-- =====================================================================

-- Drop and recreate with correct column names
DROP FUNCTION IF EXISTS update_trending_scores() CASCADE;
DROP FUNCTION IF EXISTS refresh_trending_data() CASCADE;

-- Create function using actual columns from artist_stats
CREATE OR REPLACE FUNCTION update_trending_scores()
RETURNS void AS $$
BEGIN
  -- Update artist stats trending score based on available columns
  UPDATE artist_stats
  SET 
    trending_score = GREATEST(0, COALESCE(
      (
       COALESCE(total_shows, 0) * 2 +          -- Shows are important
       COALESCE(upcoming_shows, 0) * 10 +      -- Upcoming shows are very important
       COALESCE(total_votes, 0) * 0.5 +        -- Votes indicate popularity
       COALESCE(total_songs, 0) * 0.1 +        -- More songs = established artist
       CASE 
         WHEN last_show_date > CURRENT_DATE - INTERVAL '30 days' THEN 50
         WHEN last_show_date > CURRENT_DATE - INTERVAL '90 days' THEN 20
         ELSE 0
       END
      ),
      0
    )),
    trending_score_updated_at = NOW()
  WHERE artist_id IN (
    SELECT id FROM artists WHERE verified = true
  );

  -- Update trending_artists table with available data
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
    COALESCE(ast.total_votes, 0),
    COALESCE(ast.upcoming_shows, 0),
    0, -- No followers column available
    CASE 
      WHEN ast.trending_score > 50 THEN ast.trending_score * 1.2
      ELSE ast.trending_score 
    END,
    NOW()
  FROM artist_stats ast
  WHERE ast.trending_score > 0
  ORDER BY ast.trending_score DESC
  LIMIT 100
  ON CONFLICT (artist_id) 
  DO UPDATE SET 
    score = EXCLUDED.score,
    votes_count = EXCLUDED.votes_count,
    shows_count = EXCLUDED.shows_count,
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
        -- Artist trending bonus
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

  -- Update trending_shows table
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
    0, -- Will be updated separately
    COALESCE(ast.trending_score, 0),
    EXTRACT(DAY FROM (s.date - CURRENT_DATE)),
    NOW()
  FROM shows s
  LEFT JOIN artist_stats ast ON ast.artist_id = s.headliner_artist_id
  WHERE s.trending_score > 0
  AND s.date >= CURRENT_DATE
  ORDER BY s.trending_score DESC
  LIMIT 100
  ON CONFLICT (show_id) 
  DO UPDATE SET 
    score = EXCLUDED.score,
    tickets_available = EXCLUDED.tickets_available,
    artist_popularity = EXCLUDED.artist_popularity,
    days_until = EXCLUDED.days_until,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create simplified refresh function
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
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Trending data refreshed successfully',
    'timestamp', NOW(),
    'artists_updated', artists_updated,
    'shows_updated', shows_updated
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Error refreshing trending data',
      'error', SQLERRM,
      'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_trending_scores() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION refresh_trending_data() TO anon, authenticated, service_role;

-- Add comments
COMMENT ON FUNCTION update_trending_scores() IS 'Updates trending scores based on actual artist_stats columns';
COMMENT ON FUNCTION refresh_trending_data() IS 'Refreshes trending data with error handling';