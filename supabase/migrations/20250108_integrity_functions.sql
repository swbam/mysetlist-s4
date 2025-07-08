-- Migration: Data Integrity Verification Functions
-- Description: Creates functions for checking and maintaining data integrity

-- 1. Function to check vote count consistency
CREATE OR REPLACE FUNCTION check_vote_consistency()
RETURNS TABLE (
    setlist_song_id UUID,
    stored_upvotes INTEGER,
    stored_downvotes INTEGER,
    actual_upvotes BIGINT,
    actual_downvotes BIGINT,
    difference INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ss.id as setlist_song_id,
        ss.upvotes as stored_upvotes,
        ss.downvotes as stored_downvotes,
        COUNT(CASE WHEN v.vote_type = 'up' THEN 1 END) as actual_upvotes,
        COUNT(CASE WHEN v.vote_type = 'down' THEN 1 END) as actual_downvotes,
        ABS(ss.upvotes - COUNT(CASE WHEN v.vote_type = 'up' THEN 1 END)::INTEGER) + 
        ABS(ss.downvotes - COUNT(CASE WHEN v.vote_type = 'down' THEN 1 END)::INTEGER) as difference
    FROM setlist_songs ss
    LEFT JOIN votes v ON v.setlist_song_id = ss.id
    GROUP BY ss.id, ss.upvotes, ss.downvotes
    HAVING 
        ss.upvotes != COUNT(CASE WHEN v.vote_type = 'up' THEN 1 END) OR
        ss.downvotes != COUNT(CASE WHEN v.vote_type = 'down' THEN 1 END);
END;
$$ LANGUAGE plpgsql;

-- 2. Function to count orphaned votes
CREATE OR REPLACE FUNCTION count_orphaned_votes()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM votes v
        WHERE NOT EXISTS (
            SELECT 1 FROM setlist_songs ss WHERE ss.id = v.setlist_song_id
        )
    );
END;
$$ LANGUAGE plpgsql;

-- 3. Function to check if a table exists
CREATE OR REPLACE FUNCTION table_exists(table_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
    );
END;
$$ LANGUAGE plpgsql;

-- 4. Function to count empty setlists
CREATE OR REPLACE FUNCTION count_empty_setlists()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM setlists s
        WHERE NOT EXISTS (
            SELECT 1 FROM setlist_songs ss WHERE ss.setlist_id = s.id
        )
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Function to recalculate all trending scores
CREATE OR REPLACE FUNCTION recalculate_all_trending_scores()
RETURNS VOID AS $$
BEGIN
    -- Recalculate artist trending scores
    UPDATE artists 
    SET trending_score = (
        (COALESCE(popularity, 0) * 0.3) +
        (COALESCE(followers, 0) / 10000.0 * 0.2) +
        (COALESCE(follower_count, 0) / 1000.0 * 0.2) +
        (
            SELECT COUNT(*)::NUMERIC * 10 * 0.3
            FROM shows 
            WHERE headliner_artist_id = artists.id 
            AND date >= CURRENT_DATE - INTERVAL '30 days'
        )
    ) * 100,
    updated_at = NOW();

    -- Recalculate show trending scores
    UPDATE shows 
    SET trending_score = (
        (COALESCE(view_count, 0) * 0.2) +
        (COALESCE(attendee_count, 0) * 0.3) +
        (COALESCE(vote_count, 0) * 0.25) +
        (COALESCE(setlist_count, 0) * 10 * 0.15) +
        (
            CASE 
                WHEN date >= CURRENT_DATE - INTERVAL '7 days' THEN 100 * 0.1
                WHEN date >= CURRENT_DATE - INTERVAL '30 days' THEN 50 * 0.1
                ELSE 10 * 0.1
            END
        )
    ) * 10,
    updated_at = NOW();

    -- Recalculate venue trending scores
    UPDATE venues 
    SET trending_score = (
        (
            SELECT COUNT(*)::NUMERIC * 5
            FROM shows 
            WHERE venue_id = venues.id
        ) +
        (
            SELECT COALESCE(SUM(attendee_count), 0)::NUMERIC / 100
            FROM shows 
            WHERE venue_id = venues.id
        )
    ),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 6. Function to fix missing slugs
CREATE OR REPLACE FUNCTION fix_missing_slugs()
RETURNS VOID AS $$
BEGIN
    -- Fix artist slugs
    UPDATE artists 
    SET slug = generate_slug(name),
        updated_at = NOW()
    WHERE slug IS NULL OR slug = '';

    -- Fix show slugs
    UPDATE shows 
    SET slug = generate_slug(name || '-' || TO_CHAR(date, 'YYYY-MM-DD')),
        updated_at = NOW()
    WHERE slug IS NULL OR slug = '';

    -- Fix venue slugs
    UPDATE venues 
    SET slug = generate_slug(name || '-' || COALESCE(city, 'unknown')),
        updated_at = NOW()
    WHERE slug IS NULL OR slug = '';

    -- Handle duplicates
    PERFORM ensure_unique_slugs('artists');
    PERFORM ensure_unique_slugs('shows');
    PERFORM ensure_unique_slugs('venues');
END;
$$ LANGUAGE plpgsql;

-- 7. Helper function to generate slugs
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                REGEXP_REPLACE(
                    COALESCE(input_text, 'untitled'),
                    '[^a-zA-Z0-9\s-]', '', 'g'
                ),
                '\s+', '-', 'g'
            ),
            '-+', '-', 'g'
        )
    );
END;
$$ LANGUAGE plpgsql;

-- 8. Helper function to ensure unique slugs
CREATE OR REPLACE FUNCTION ensure_unique_slugs(table_name TEXT)
RETURNS VOID AS $$
DECLARE
    query TEXT;
BEGIN
    query := format('
        WITH numbered_duplicates AS (
            SELECT id, slug,
                   ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) - 1 as dup_num
            FROM %I
            WHERE slug IS NOT NULL
        )
        UPDATE %I t
        SET slug = CASE 
            WHEN nd.dup_num = 0 THEN t.slug 
            ELSE t.slug || ''-'' || nd.dup_num
        END,
        updated_at = NOW()
        FROM numbered_duplicates nd
        WHERE t.id = nd.id AND nd.dup_num > 0', 
        table_name, table_name
    );
    
    EXECUTE query;
END;
$$ LANGUAGE plpgsql;

-- 9. Function to cleanup orphaned records
CREATE OR REPLACE FUNCTION cleanup_orphaned_records()
RETURNS TABLE (
    votes_deleted INTEGER,
    setlist_songs_deleted INTEGER,
    setlists_deleted INTEGER
) AS $$
DECLARE
    v_votes_deleted INTEGER;
    v_setlist_songs_deleted INTEGER;
    v_setlists_deleted INTEGER;
BEGIN
    -- Delete orphaned votes
    DELETE FROM votes 
    WHERE setlist_song_id NOT IN (SELECT id FROM setlist_songs);
    GET DIAGNOSTICS v_votes_deleted = ROW_COUNT;

    -- Delete orphaned setlist songs
    DELETE FROM setlist_songs 
    WHERE setlist_id NOT IN (SELECT id FROM setlists);
    GET DIAGNOSTICS v_setlist_songs_deleted = ROW_COUNT;

    -- Delete orphaned setlists
    DELETE FROM setlists 
    WHERE show_id NOT IN (SELECT id FROM shows);
    GET DIAGNOSTICS v_setlists_deleted = ROW_COUNT;

    RETURN QUERY SELECT v_votes_deleted, v_setlist_songs_deleted, v_setlists_deleted;
END;
$$ LANGUAGE plpgsql;

-- 10. Function to validate all relationships
CREATE OR REPLACE FUNCTION validate_all_relationships()
RETURNS TABLE (
    relationship TEXT,
    orphaned_count INTEGER,
    status TEXT
) AS $$
BEGIN
    -- Check votes -> setlist_songs
    RETURN QUERY
    SELECT 
        'votes -> setlist_songs'::TEXT,
        COUNT(*)::INTEGER,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'FAILED' END
    FROM votes v
    WHERE NOT EXISTS (SELECT 1 FROM setlist_songs ss WHERE ss.id = v.setlist_song_id);

    -- Check setlist_songs -> setlists
    RETURN QUERY
    SELECT 
        'setlist_songs -> setlists'::TEXT,
        COUNT(*)::INTEGER,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'FAILED' END
    FROM setlist_songs ss
    WHERE NOT EXISTS (SELECT 1 FROM setlists s WHERE s.id = ss.setlist_id);

    -- Check setlists -> shows
    RETURN QUERY
    SELECT 
        'setlists -> shows'::TEXT,
        COUNT(*)::INTEGER,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'FAILED' END
    FROM setlists s
    WHERE NOT EXISTS (SELECT 1 FROM shows sh WHERE sh.id = s.show_id);

    -- Check shows -> artists
    RETURN QUERY
    SELECT 
        'shows -> artists'::TEXT,
        COUNT(*)::INTEGER,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'FAILED' END
    FROM shows sh
    WHERE sh.headliner_artist_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM artists a WHERE a.id = sh.headliner_artist_id);

    -- Check shows -> venues
    RETURN QUERY
    SELECT 
        'shows -> venues'::TEXT,
        COUNT(*)::INTEGER,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END  -- Warning since venue can be null
    FROM shows sh
    WHERE sh.venue_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM venues v WHERE v.id = sh.venue_id);

    -- Check user_follows_artists -> artists (if table exists)
    IF table_exists('user_follows_artists') THEN
        RETURN QUERY
        SELECT 
            'user_follows_artists -> artists'::TEXT,
            COUNT(*)::INTEGER,
            CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'FAILED' END
        FROM user_follows_artists ufa
        WHERE NOT EXISTS (SELECT 1 FROM artists a WHERE a.id = ufa.artist_id);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 11. Function to get data statistics
CREATE OR REPLACE FUNCTION get_data_statistics()
RETURNS TABLE (
    entity TEXT,
    total_count BIGINT,
    with_nulls BIGINT,
    percentage_complete NUMERIC
) AS $$
BEGIN
    -- Artists statistics
    RETURN QUERY
    SELECT 
        'artists'::TEXT,
        COUNT(*),
        COUNT(*) FILTER (WHERE spotify_id IS NULL),
        ROUND((COUNT(*) FILTER (WHERE spotify_id IS NOT NULL))::NUMERIC / COUNT(*) * 100, 2)
    FROM artists;

    -- Shows statistics
    RETURN QUERY
    SELECT 
        'shows'::TEXT,
        COUNT(*),
        COUNT(*) FILTER (WHERE venue_id IS NULL),
        ROUND((COUNT(*) FILTER (WHERE venue_id IS NOT NULL))::NUMERIC / COUNT(*) * 100, 2)
    FROM shows;

    -- Songs statistics
    RETURN QUERY
    SELECT 
        'songs'::TEXT,
        COUNT(*),
        COUNT(*) FILTER (WHERE spotify_id IS NULL),
        ROUND((COUNT(*) FILTER (WHERE spotify_id IS NOT NULL))::NUMERIC / COUNT(*) * 100, 2)
    FROM songs;

    -- Setlists statistics
    RETURN QUERY
    SELECT 
        'setlists'::TEXT,
        COUNT(*),
        COUNT(*) FILTER (WHERE type = 'predicted'),
        ROUND((COUNT(*) FILTER (WHERE type = 'actual'))::NUMERIC / COUNT(*) * 100, 2)
    FROM setlists;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION check_vote_consistency() TO authenticated;
GRANT EXECUTE ON FUNCTION count_orphaned_votes() TO authenticated;
GRANT EXECUTE ON FUNCTION table_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION count_empty_setlists() TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_all_trending_scores() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_missing_slugs() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_records() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_all_relationships() TO authenticated;
GRANT EXECUTE ON FUNCTION get_data_statistics() TO authenticated;