-- Database Performance Optimization Migration
-- This migration adds indexes, triggers, and optimizations for the MySetlist database

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Artists table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_trending_score ON artists(trending_score DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_popularity ON artists(popularity DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_name_trgm ON artists USING gin(name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_genres ON artists USING gin(genres);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_verified ON artists(verified) WHERE verified = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_last_synced ON artists(last_synced_at);

-- Shows table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_date ON shows(date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_status ON shows(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_trending_score ON shows(trending_score DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_headliner_date ON shows(headliner_artist_id, date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_venue_date ON shows(venue_id, date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_featured ON shows(is_featured) WHERE is_featured = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shows_upcoming ON shows(date) WHERE status = 'upcoming';

-- Setlists table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlists_show_artist ON setlists(show_id, artist_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlists_type ON setlists(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlists_total_votes ON setlists(total_votes DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlists_locked ON setlists(is_locked);

-- Setlist songs indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlist_songs_position ON setlist_songs(setlist_id, position);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlist_songs_votes ON setlist_songs(net_votes DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_setlist_songs_song_id ON setlist_songs(song_id);

-- Songs table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_title_trgm ON songs USING gin(title gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_artist_trgm ON songs USING gin(artist gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_popularity ON songs(popularity DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_spotify_id ON songs(spotify_id) WHERE spotify_id IS NOT NULL;

-- Votes table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_user_created ON votes(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_setlist_song_type ON votes(setlist_song_id, vote_type);

-- Venues table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venues_location ON venues(city, state, country);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venues_name_trgm ON venues USING gin(name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venues_coordinates ON venues(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- User profiles indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_public ON user_profiles(is_public) WHERE is_public = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_location ON user_profiles(location) WHERE location IS NOT NULL;

-- User follows artists indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_follows_user ON user_follows_artists(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_follows_artist ON user_follows_artists(artist_id);

-- Analytics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_timestamp_type ON events(timestamp DESC, event_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_user_timestamp ON events(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_analytics_query ON search_analytics(query, search_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_analytics_timestamp ON search_analytics(search_timestamp DESC);

-- ============================================================================
-- FULL-TEXT SEARCH SETUP
-- ============================================================================

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create composite search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_search ON artists 
USING gin((name || ' ' || COALESCE(genres, '')) gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_search ON songs 
USING gin((title || ' ' || artist || ' ' || COALESCE(album, '')) gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venues_search ON venues 
USING gin((name || ' ' || city || ' ' || COALESCE(state, '') || ' ' || country) gin_trgm_ops);

-- ============================================================================
-- REAL-TIME VOTE AGGREGATION TRIGGERS
-- ============================================================================

-- Function to update setlist_songs vote counts
CREATE OR REPLACE FUNCTION update_setlist_song_votes()
RETURNS TRIGGER AS $
DECLARE
    upvote_count INTEGER;
    downvote_count INTEGER;
    net_count INTEGER;
BEGIN
    -- Calculate vote counts for the affected setlist_song
    SELECT 
        COUNT(*) FILTER (WHERE vote_type = 'up'),
        COUNT(*) FILTER (WHERE vote_type = 'down')
    INTO upvote_count, downvote_count
    FROM votes 
    WHERE setlist_song_id = COALESCE(NEW.setlist_song_id, OLD.setlist_song_id);
    
    net_count := upvote_count - downvote_count;
    
    -- Update the setlist_songs table
    UPDATE setlist_songs 
    SET 
        upvotes = upvote_count,
        downvotes = downvote_count,
        net_votes = net_count,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.setlist_song_id, OLD.setlist_song_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql;

-- Create triggers for vote aggregation
DROP TRIGGER IF EXISTS trigger_update_votes_on_insert ON votes;
CREATE TRIGGER trigger_update_votes_on_insert
    AFTER INSERT ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_setlist_song_votes();

DROP TRIGGER IF EXISTS trigger_update_votes_on_update ON votes;
CREATE TRIGGER trigger_update_votes_on_update
    AFTER UPDATE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_setlist_song_votes();

DROP TRIGGER IF EXISTS trigger_update_votes_on_delete ON votes;
CREATE TRIGGER trigger_update_votes_on_delete
    AFTER DELETE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_setlist_song_votes();

-- ============================================================================
-- SETLIST TOTAL VOTES AGGREGATION
-- ============================================================================

-- Function to update setlist total votes
CREATE OR REPLACE FUNCTION update_setlist_total_votes()
RETURNS TRIGGER AS $
DECLARE
    total_votes_count INTEGER;
BEGIN
    -- Calculate total votes for the setlist
    SELECT COALESCE(SUM(ABS(net_votes)), 0)
    INTO total_votes_count
    FROM setlist_songs 
    WHERE setlist_id = (
        SELECT setlist_id 
        FROM setlist_songs 
        WHERE id = COALESCE(NEW.setlist_song_id, OLD.setlist_song_id)
    );
    
    -- Update the setlists table
    UPDATE setlists 
    SET 
        total_votes = total_votes_count,
        updated_at = NOW()
    WHERE id = (
        SELECT setlist_id 
        FROM setlist_songs 
        WHERE id = COALESCE(NEW.setlist_song_id, OLD.setlist_song_id)
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql;

-- Create trigger for setlist vote aggregation
DROP TRIGGER IF EXISTS trigger_update_setlist_votes ON setlist_songs;
CREATE TRIGGER trigger_update_setlist_votes
    AFTER UPDATE OF net_votes ON setlist_songs
    FOR EACH ROW
    EXECUTE FUNCTION update_setlist_total_votes();

-- ============================================================================
-- ARTIST STATISTICS TRIGGERS
-- ============================================================================

-- Function to update artist statistics
CREATE OR REPLACE FUNCTION update_artist_stats()
RETURNS TRIGGER AS $
DECLARE
    artist_id_val UUID;
BEGIN
    -- Get artist ID from the affected record
    artist_id_val := COALESCE(NEW.headliner_artist_id, OLD.headliner_artist_id);
    
    -- Update artist statistics
    INSERT INTO artist_stats (artist_id, total_shows, upcoming_shows, updated_at)
    SELECT 
        artist_id_val,
        COUNT(*) as total_shows,
        COUNT(*) FILTER (WHERE status = 'upcoming') as upcoming_shows,
        NOW()
    FROM shows 
    WHERE headliner_artist_id = artist_id_val
    ON CONFLICT (artist_id) 
    DO UPDATE SET
        total_shows = EXCLUDED.total_shows,
        upcoming_shows = EXCLUDED.upcoming_shows,
        updated_at = EXCLUDED.updated_at;
    
    -- Also update the denormalized fields in artists table
    UPDATE artists 
    SET 
        total_shows = (SELECT total_shows FROM artist_stats WHERE artist_id = artist_id_val),
        upcoming_shows = (SELECT upcoming_shows FROM artist_stats WHERE artist_id = artist_id_val),
        updated_at = NOW()
    WHERE id = artist_id_val;
    
    RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql;

-- Create triggers for artist stats
DROP TRIGGER IF EXISTS trigger_update_artist_stats_on_show_change ON shows;
CREATE TRIGGER trigger_update_artist_stats_on_show_change
    AFTER INSERT OR UPDATE OR DELETE ON shows
    FOR EACH ROW
    EXECUTE FUNCTION update_artist_stats();

-- ============================================================================
-- TRENDING SCORE CALCULATION
-- ============================================================================

-- Function to calculate trending scores
CREATE OR REPLACE FUNCTION calculate_trending_scores()
RETURNS void AS $
DECLARE
    current_time TIMESTAMP := NOW();
    time_decay_factor NUMERIC := 0.8; -- Decay factor for time-based scoring
BEGIN
    -- Update artist trending scores
    UPDATE artists 
    SET 
        trending_score = (
            -- Base popularity score
            COALESCE(popularity, 0) * 0.3 +
            -- Recent show activity (last 30 days)
            (SELECT COUNT(*) * 10 FROM shows 
             WHERE headliner_artist_id = artists.id 
             AND date >= current_time - INTERVAL '30 days') +
            -- Recent vote activity (last 7 days)
            (SELECT COUNT(*) * 2 FROM votes v
             JOIN setlist_songs ss ON v.setlist_song_id = ss.id
             JOIN setlists s ON ss.setlist_id = s.id
             WHERE s.artist_id = artists.id
             AND v.created_at >= current_time - INTERVAL '7 days') +
            -- Follower growth (weighted by recency)
            COALESCE(follower_count, 0) * 0.1
        ),
        updated_at = current_time
    WHERE last_synced_at >= current_time - INTERVAL '7 days'; -- Only update recently synced artists
    
    -- Update show trending scores
    UPDATE shows 
    SET 
        trending_score = (
            -- Vote activity score
            COALESCE(vote_count, 0) * 2 +
            -- View count score
            COALESCE(view_count, 0) * 0.1 +
            -- Recency bonus (upcoming shows get higher scores)
            CASE 
                WHEN status = 'upcoming' AND date >= current_date THEN 50
                WHEN status = 'upcoming' AND date >= current_date - INTERVAL '7 days' THEN 30
                WHEN status = 'completed' AND date >= current_date - INTERVAL '7 days' THEN 20
                ELSE 0
            END +
            -- Artist popularity bonus
            (SELECT COALESCE(popularity, 0) * 0.1 FROM artists WHERE id = shows.headliner_artist_id)
        ),
        updated_at = current_time
    WHERE date >= current_date - INTERVAL '30 days'; -- Only update recent shows
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

-- Votes policies
CREATE POLICY "Users can view all votes" ON votes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own votes" ON votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" ON votes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON votes
    FOR DELETE USING (auth.uid() = user_id);

-- User profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON user_profiles
    FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- User follows artists policies
CREATE POLICY "Users can view all follows" ON user_follows_artists
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own follows" ON user_follows_artists
    FOR ALL USING (auth.uid() = user_id);

-- Email preferences policies
CREATE POLICY "Users can manage their own email preferences" ON email_preferences
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ============================================================================

-- Popular artists view
CREATE MATERIALIZED VIEW IF NOT EXISTS popular_artists AS
SELECT 
    a.id,
    a.name,
    a.slug,
    a.image_url,
    a.popularity,
    a.follower_count,
    a.trending_score,
    COUNT(DISTINCT s.id) as total_shows,
    COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'upcoming') as upcoming_shows,
    MAX(s.date) as last_show_date
FROM artists a
LEFT JOIN shows s ON a.id = s.headliner_artist_id
WHERE a.verified = true OR a.popularity > 50
GROUP BY a.id, a.name, a.slug, a.image_url, a.popularity, a.follower_count, a.trending_score
ORDER BY a.trending_score DESC, a.popularity DESC;

CREATE UNIQUE INDEX ON popular_artists (id);

-- Trending shows view
CREATE MATERIALIZED VIEW IF NOT EXISTS trending_shows AS
SELECT 
    s.id,
    s.name,
    s.slug,
    s.date,
    s.status,
    s.trending_score,
    s.vote_count,
    s.view_count,
    a.name as artist_name,
    a.image_url as artist_image,
    v.name as venue_name,
    v.city as venue_city
FROM shows s
JOIN artists a ON s.headliner_artist_id = a.id
LEFT JOIN venues v ON s.venue_id = v.id
WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY s.trending_score DESC, s.vote_count DESC;

CREATE UNIQUE INDEX ON trending_shows (id);

-- ============================================================================
-- SCHEDULED JOBS SETUP
-- ============================================================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY popular_artists;
    REFRESH MATERIALIZED VIEW CONCURRENTLY trending_shows;
    
    -- Calculate trending scores
    PERFORM calculate_trending_scores();
    
    -- Log the refresh
    INSERT INTO admin_notifications (type, title, message, severity)
    VALUES ('system', 'Materialized Views Refreshed', 'Successfully refreshed popular_artists and trending_shows views', 'low');
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- PERFORMANCE MONITORING
-- ============================================================================

-- Function to analyze slow queries
CREATE OR REPLACE FUNCTION analyze_query_performance()
RETURNS TABLE(
    query_text TEXT,
    calls BIGINT,
    total_time NUMERIC,
    mean_time NUMERIC,
    max_time NUMERIC
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        pg_stat_statements.query,
        pg_stat_statements.calls,
        pg_stat_statements.total_exec_time,
        pg_stat_statements.mean_exec_time,
        pg_stat_statements.max_exec_time
    FROM pg_stat_statements
    WHERE pg_stat_statements.mean_exec_time > 100 -- Queries taking more than 100ms on average
    ORDER BY pg_stat_statements.mean_exec_time DESC
    LIMIT 20;
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- CLEANUP AND MAINTENANCE
-- ============================================================================

-- Function to clean up old analytics data
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS void AS $
BEGIN
    -- Delete events older than 90 days
    DELETE FROM events WHERE timestamp < NOW() - INTERVAL '90 days';
    
    -- Delete search analytics older than 30 days
    DELETE FROM search_analytics WHERE search_timestamp < NOW() - INTERVAL '30 days';
    
    -- Delete expired realtime analytics
    DELETE FROM realtime_analytics WHERE expires_at < NOW();
    
    -- Delete old user sessions
    DELETE FROM user_sessions WHERE session_start < NOW() - INTERVAL '30 days';
    
    -- Log cleanup
    INSERT INTO admin_notifications (type, title, message, severity)
    VALUES ('maintenance', 'Analytics Cleanup', 'Cleaned up old analytics data', 'low');
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION update_setlist_song_votes() IS 'Automatically updates vote counts on setlist_songs when votes are added/updated/deleted';
COMMENT ON FUNCTION update_setlist_total_votes() IS 'Updates total vote count on setlists when setlist_songs votes change';
COMMENT ON FUNCTION update_artist_stats() IS 'Maintains artist statistics when shows are added/updated/deleted';
COMMENT ON FUNCTION calculate_trending_scores() IS 'Calculates trending scores for artists and shows based on recent activity';
COMMENT ON FUNCTION refresh_materialized_views() IS 'Refreshes all materialized views and updates trending scores';
COMMENT ON FUNCTION cleanup_old_analytics() IS 'Removes old analytics data to keep database size manageable';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $
BEGIN
    RAISE NOTICE 'Database performance optimization migration completed successfully!';
    RAISE NOTICE 'Added indexes, triggers, RLS policies, and materialized views.';
    RAISE NOTICE 'Remember to schedule regular execution of refresh_materialized_views() and cleanup_old_analytics().';
END;
$;