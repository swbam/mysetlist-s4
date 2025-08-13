-- =====================================================================
-- Correct Trending Functions with Actual Column Names
-- =====================================================================

-- Drop and recreate one more time with correct columns
DROP FUNCTION IF EXISTS update_trending_scores() CASCADE;
DROP FUNCTION IF EXISTS refresh_trending_data() CASCADE;

-- Create the SIMPLEST possible version that works
CREATE OR REPLACE FUNCTION update_trending_scores()
RETURNS void AS $$
BEGIN
  -- Simple update for artist_stats
  UPDATE artist_stats
  SET 
    trending_score = COALESCE(
      total_shows * 2 + 
      upcoming_shows * 10 + 
      total_votes * 0.5,
      0
    ),
    trending_score_updated_at = NOW();

  -- Simple update for shows (using actual 'status' column)
  UPDATE shows
  SET 
    trending_score = CASE 
      WHEN date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 100
      WHEN date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 50
      WHEN date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days' THEN 20
      ELSE 5
    END,
    trending_score_updated_at = NOW()
  WHERE date >= CURRENT_DATE
  AND status = 'upcoming';
END;
$$ LANGUAGE plpgsql;

-- Simple refresh function
CREATE OR REPLACE FUNCTION refresh_trending_data()
RETURNS jsonb AS $$
BEGIN
  -- Call update function
  PERFORM update_trending_scores();
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Trending data refreshed',
    'timestamp', NOW()
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_trending_scores() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION refresh_trending_data() TO anon, authenticated, service_role;