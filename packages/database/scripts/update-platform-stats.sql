-- Create a scheduled job to update platform stats daily
-- This should be run as a cron job or scheduled function

-- First, ensure the function exists
CREATE OR REPLACE FUNCTION update_platform_stats()
RETURNS void AS $$
BEGIN
    INSERT INTO platform_stats (
        stat_date,
        total_users,
        new_users,
        active_users,
        total_shows,
        new_shows,
        total_setlists,
        new_setlists,
        total_artists,
        new_artists,
        total_venues,
        new_venues,
        total_reviews,
        new_reviews,
        total_photos,
        new_photos,
        total_votes,
        new_votes
    )
    SELECT
        CURRENT_DATE,
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL),
        (SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURRENT_DATE),
        (SELECT COUNT(DISTINCT user_id) FROM votes WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '7 days'),
        (SELECT COUNT(*) FROM shows),
        (SELECT COUNT(*) FROM shows WHERE DATE(created_at) = CURRENT_DATE),
        (SELECT COUNT(*) FROM setlists),
        (SELECT COUNT(*) FROM setlists WHERE DATE(created_at) = CURRENT_DATE),
        (SELECT COUNT(*) FROM artists),
        (SELECT COUNT(*) FROM artists WHERE DATE(created_at) = CURRENT_DATE),
        (SELECT COUNT(*) FROM venues),
        (SELECT COUNT(*) FROM venues WHERE DATE(created_at) = CURRENT_DATE),
    0,
    0,
        (SELECT COUNT(*) FROM venue_photos),
        (SELECT COUNT(*) FROM venue_photos WHERE DATE(created_at) = CURRENT_DATE),
        (SELECT COUNT(*) FROM votes),
        (SELECT COUNT(*) FROM votes WHERE DATE(created_at) = CURRENT_DATE)
    ON CONFLICT (stat_date) DO UPDATE SET
        total_users = EXCLUDED.total_users,
        new_users = EXCLUDED.new_users,
        active_users = EXCLUDED.active_users,
        total_shows = EXCLUDED.total_shows,
        new_shows = EXCLUDED.new_shows,
        total_setlists = EXCLUDED.total_setlists,
        new_setlists = EXCLUDED.new_setlists,
        total_artists = EXCLUDED.total_artists,
        new_artists = EXCLUDED.new_artists,
        total_venues = EXCLUDED.total_venues,
        new_venues = EXCLUDED.new_venues,
        total_reviews = EXCLUDED.total_reviews,
        new_reviews = EXCLUDED.new_reviews,
        total_photos = EXCLUDED.total_photos,
        new_photos = EXCLUDED.new_photos,
        total_votes = EXCLUDED.total_votes,
        new_votes = EXCLUDED.new_votes;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment user warnings
CREATE OR REPLACE FUNCTION increment_user_warnings(user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET 
        warning_count = COALESCE(warning_count, 0) + 1,
        last_warning_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Run initial stats update
SELECT update_platform_stats();

-- Note: In Supabase, you can set up a cron job to run this function daily:
-- SELECT cron.schedule('update-platform-stats', '0 0 * * *', 'SELECT update_platform_stats();');