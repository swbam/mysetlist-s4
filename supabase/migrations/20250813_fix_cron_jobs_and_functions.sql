-- =====================================================================
-- Fix Cron Jobs and Database Functions
-- =====================================================================

-- Drop existing cron jobs with wrong URLs
SELECT cron.unschedule('calculate-trending');
SELECT cron.unschedule('hourly-light-sync');
SELECT cron.unschedule('nightly-deep-sync');

-- Recreate cron jobs with correct URLs and authentication
-- Note: Using the correct app URL from environment
SELECT cron.schedule(
    'calculate-trending',
    '*/30 * * * *', -- Every 30 minutes
    $$
    SELECT net.http_post(
        url := 'https://mysetlist-s4-1.vercel.app/api/cron/calculate-trending',
        headers := jsonb_build_object(
            'Authorization', 'Bearer 20812ee7bcf7daf3f7309d03d5cb424cf78866f064ddc4fbf12a42508e5dbf8e',
            'Content-Type', 'application/json'
        ),
        timeout_milliseconds := 60000
    );
    $$
);

SELECT cron.schedule(
    'sync-artist-data',
    '0 */4 * * *', -- Every 4 hours
    $$
    SELECT net.http_post(
        url := 'https://mysetlist-s4-1.vercel.app/api/cron/sync-artist-data',
        headers := jsonb_build_object(
            'Authorization', 'Bearer 20812ee7bcf7daf3f7309d03d5cb424cf78866f064ddc4fbf12a42508e5dbf8e',
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object('mode', 'auto', 'limit', 10),
        timeout_milliseconds := 120000
    );
    $$
);

SELECT cron.schedule(
    'master-sync',
    '0 2 * * *', -- Daily at 2 AM
    $$
    SELECT net.http_post(
        url := 'https://mysetlist-s4-1.vercel.app/api/cron/master-sync',
        headers := jsonb_build_object(
            'Authorization', 'Bearer 20812ee7bcf7daf3f7309d03d5cb424cf78866f064ddc4fbf12a42508e5dbf8e',
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object('mode', 'daily'),
        timeout_milliseconds := 300000
    );
    $$
);

-- Create or replace function to update trending scores
CREATE OR REPLACE FUNCTION update_artist_trending_scores()
RETURNS void AS $$
BEGIN
    -- Update artist stats trending score
    UPDATE artist_stats
    SET 
        trending_score = COALESCE(
            (popularity * 0.3 + 
             monthly_listeners * 0.00001 + 
             followers * 0.00001 +
             CASE WHEN has_upcoming_shows THEN 20 ELSE 0 END +
             CASE WHEN last_show_date > CURRENT_DATE - INTERVAL '30 days' THEN 10 ELSE 0 END),
            0
        ),
        trending_score_updated_at = NOW()
    WHERE artist_id IN (
        SELECT id FROM artists WHERE verified = true
    );
    
    -- Update trending_artists table
    INSERT INTO trending_artists (artist_id, score, period, calculated_at)
    SELECT 
        artist_id,
        trending_score,
        'weekly',
        NOW()
    FROM artist_stats
    WHERE trending_score > 0
    ORDER BY trending_score DESC
    LIMIT 100
    ON CONFLICT (artist_id, period) 
    DO UPDATE SET 
        score = EXCLUDED.score,
        calculated_at = EXCLUDED.calculated_at;
END;
$$ LANGUAGE plpgsql;

-- Create or replace function to update show trending scores
CREATE OR REPLACE FUNCTION update_show_trending_scores()
RETURNS void AS $$
BEGIN
    UPDATE shows
    SET 
        trending_score = COALESCE(
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
                    SELECT trending_score 
                    FROM artist_stats 
                    WHERE artist_id = shows.headliner_artist_id
                ), 0) * 0.5
            ),
            0
        ),
        trending_score_updated_at = NOW()
    WHERE date >= CURRENT_DATE
    AND date <= CURRENT_DATE + INTERVAL '180 days';
    
    -- Update trending_shows table
    INSERT INTO trending_shows (show_id, score, period, calculated_at)
    SELECT 
        id,
        trending_score,
        'weekly',
        NOW()
    FROM shows
    WHERE trending_score > 0
    AND date >= CURRENT_DATE
    ORDER BY trending_score DESC
    LIMIT 100
    ON CONFLICT (show_id, period) 
    DO UPDATE SET 
        score = EXCLUDED.score,
        calculated_at = EXCLUDED.calculated_at;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the main trending refresh function
CREATE OR REPLACE FUNCTION refresh_trending_data()
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    -- Update artist trending scores
    PERFORM update_artist_trending_scores();
    
    -- Update show trending scores
    PERFORM update_show_trending_scores();
    
    -- Clean up old trending data (older than 30 days)
    DELETE FROM trending_artists WHERE calculated_at < NOW() - INTERVAL '30 days';
    DELETE FROM trending_shows WHERE calculated_at < NOW() - INTERVAL '30 days';
    
    result := jsonb_build_object(
        'success', true,
        'message', 'Trending data refreshed successfully',
        'timestamp', NOW(),
        'artists_updated', (SELECT COUNT(*) FROM trending_artists WHERE calculated_at > NOW() - INTERVAL '1 minute'),
        'shows_updated', (SELECT COUNT(*) FROM trending_shows WHERE calculated_at > NOW() - INTERVAL '1 minute')
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to manually trigger sync
CREATE OR REPLACE FUNCTION trigger_manual_sync(sync_type text)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
    app_url text;
    cron_secret text;
BEGIN
    -- Get configuration (would normally come from environment)
    app_url := 'https://mysetlist-s4-1.vercel.app';
    cron_secret := '20812ee7bcf7daf3f7309d03d5cb424cf78866f064ddc4fbf12a42508e5dbf8e';
    
    -- Trigger the appropriate sync based on type
    CASE sync_type
        WHEN 'trending' THEN
            result := net.http_post(
                url := app_url || '/api/cron/calculate-trending',
                headers := jsonb_build_object('Authorization', 'Bearer ' || cron_secret),
                timeout_milliseconds := 60000
            );
        WHEN 'artists' THEN
            result := net.http_post(
                url := app_url || '/api/cron/sync-artist-data',
                headers := jsonb_build_object('Authorization', 'Bearer ' || cron_secret),
                body := jsonb_build_object('mode', 'manual', 'limit', 10),
                timeout_milliseconds := 120000
            );
        WHEN 'master' THEN
            result := net.http_post(
                url := app_url || '/api/cron/master-sync',
                headers := jsonb_build_object('Authorization', 'Bearer ' || cron_secret),
                body := jsonb_build_object('mode', 'manual'),
                timeout_milliseconds := 300000
            );
        ELSE
            result := jsonb_build_object(
                'success', false,
                'error', 'Invalid sync type. Use: trending, artists, or master'
            );
    END CASE;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up unused functions
DROP FUNCTION IF EXISTS trigger_sync_job(text);
DROP FUNCTION IF EXISTS upsert_sync_job(text, text, text, jsonb);
DROP FUNCTION IF EXISTS calculate_show_trending_score(uuid);
DROP FUNCTION IF EXISTS recalculate_all_trending_scores();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION refresh_trending_data() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION trigger_manual_sync(text) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION refresh_trending_data() IS 'Refreshes all trending data for artists and shows';
COMMENT ON FUNCTION trigger_manual_sync(text) IS 'Manually trigger sync jobs: trending, artists, or master';
COMMENT ON FUNCTION update_artist_trending_scores() IS 'Updates trending scores for all verified artists';
COMMENT ON FUNCTION update_show_trending_scores() IS 'Updates trending scores for upcoming shows';