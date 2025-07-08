-- Migration: Data Cleanup
-- Description: Cleans up existing data issues before applying constraints

-- 1. Log current state for debugging
DO $$
BEGIN
    RAISE NOTICE 'Starting data cleanup migration at %', NOW();
END $$;

-- 2. Remove orphaned votes (votes pointing to non-existent setlist songs)
DELETE FROM votes 
WHERE setlist_song_id NOT IN (SELECT id FROM setlist_songs);

-- 3. Remove orphaned setlist songs (songs in non-existent setlists)
DELETE FROM setlist_songs 
WHERE setlist_id NOT IN (SELECT id FROM setlists);

-- 4. Remove orphaned setlists (setlists for non-existent shows)
DELETE FROM setlists 
WHERE show_id NOT IN (SELECT id FROM shows);

-- 5. Fix vote counts to match actual vote records
UPDATE setlist_songs ss
SET 
    upvotes = COALESCE((
        SELECT COUNT(*) 
        FROM votes 
        WHERE setlist_song_id = ss.id 
        AND vote_type = 'up'
    ), 0),
    downvotes = COALESCE((
        SELECT COUNT(*) 
        FROM votes 
        WHERE setlist_song_id = ss.id 
        AND vote_type = 'down'
    ), 0),
    net_votes = COALESCE((
        (SELECT COUNT(*) FROM votes WHERE setlist_song_id = ss.id AND vote_type = 'up') -
        (SELECT COUNT(*) FROM votes WHERE setlist_song_id = ss.id AND vote_type = 'down')
    ), 0),
    updated_at = NOW()
WHERE EXISTS (
    SELECT 1 FROM votes WHERE setlist_song_id = ss.id
) OR (upvotes > 0 OR downvotes > 0);

-- 6. Remove duplicate songs by Spotify ID (keeping the oldest with most data)
WITH duplicate_songs AS (
    SELECT 
        spotify_id,
        MIN(created_at) as earliest_created,
        COUNT(*) as duplicate_count
    FROM songs
    WHERE spotify_id IS NOT NULL
    GROUP BY spotify_id
    HAVING COUNT(*) > 1
),
songs_to_keep AS (
    SELECT DISTINCT ON (s.spotify_id) s.id
    FROM songs s
    INNER JOIN duplicate_songs ds ON s.spotify_id = ds.spotify_id
    ORDER BY s.spotify_id, 
             s.created_at ASC,
             (CASE WHEN s.album IS NOT NULL THEN 1 ELSE 0 END) DESC,
             (CASE WHEN s.album_art_url IS NOT NULL THEN 1 ELSE 0 END) DESC
)
DELETE FROM songs 
WHERE spotify_id IN (SELECT spotify_id FROM duplicate_songs)
AND id NOT IN (SELECT id FROM songs_to_keep);

-- 7. Fix empty or null slugs for artists
UPDATE artists 
SET slug = LOWER(
    REGEXP_REPLACE(
        REGEXP_REPLACE(
            REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'),
            '\s+', '-', 'g'
        ),
        '-+', '-', 'g'
    )
)
WHERE slug IS NULL OR slug = '';

-- 8. Fix empty or null slugs for shows
UPDATE shows 
SET slug = CONCAT(
    LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'),
                '\s+', '-', 'g'
            ),
            '-+', '-', 'g'
        )
    ),
    '-',
    TO_CHAR(date, 'YYYY-MM-DD')
)
WHERE slug IS NULL OR slug = '';

-- 9. Fix empty or null slugs for venues
UPDATE venues 
SET slug = LOWER(
    REGEXP_REPLACE(
        REGEXP_REPLACE(
            REGEXP_REPLACE(CONCAT(name, '-', city), '[^a-zA-Z0-9\s-]', '', 'g'),
            '\s+', '-', 'g'
        ),
        '-+', '-', 'g'
    )
)
WHERE slug IS NULL OR slug = '';

-- 10. Ensure unique slugs by appending numbers where needed
-- For artists
WITH numbered_duplicates AS (
    SELECT id, slug,
           ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) - 1 as dup_num
    FROM artists
    WHERE slug IS NOT NULL
)
UPDATE artists a
SET slug = CASE 
    WHEN nd.dup_num = 0 THEN a.slug 
    ELSE CONCAT(a.slug, '-', nd.dup_num)
END
FROM numbered_duplicates nd
WHERE a.id = nd.id AND nd.dup_num > 0;

-- For shows
WITH numbered_duplicates AS (
    SELECT id, slug,
           ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) - 1 as dup_num
    FROM shows
    WHERE slug IS NOT NULL
)
UPDATE shows s
SET slug = CASE 
    WHEN nd.dup_num = 0 THEN s.slug 
    ELSE CONCAT(s.slug, '-', nd.dup_num)
END
FROM numbered_duplicates nd
WHERE s.id = nd.id AND nd.dup_num > 0;

-- For venues
WITH numbered_duplicates AS (
    SELECT id, slug,
           ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) - 1 as dup_num
    FROM venues
    WHERE slug IS NOT NULL
)
UPDATE venues v
SET slug = CASE 
    WHEN nd.dup_num = 0 THEN v.slug 
    ELSE CONCAT(v.slug, '-', nd.dup_num)
END
FROM numbered_duplicates nd
WHERE v.id = nd.id AND nd.dup_num > 0;

-- 11. Update artist follower counts to match actual follows (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_follows_artists') THEN
        UPDATE artists a
        SET follower_count = COALESCE((
            SELECT COUNT(*) 
            FROM user_follows_artists 
            WHERE artist_id = a.id
        ), 0);
    END IF;
END $$;

-- 12. Update show statistics
UPDATE shows s
SET 
    setlist_count = COALESCE((
        SELECT COUNT(*) 
        FROM setlists 
        WHERE show_id = s.id
    ), 0),
    vote_count = COALESCE((
        SELECT SUM(ss.upvotes + ss.downvotes)
        FROM setlists sl
        INNER JOIN setlist_songs ss ON ss.setlist_id = sl.id
        WHERE sl.show_id = s.id
    ), 0),
    updated_at = NOW();

-- 13. Initialize trending scores for records without them
UPDATE artists 
SET trending_score = COALESCE(
    (popularity * 0.3 + (followers / 1000) * 0.2 + RANDOM() * 0.5) * 100,
    0
)
WHERE trending_score IS NULL OR trending_score = 0;

UPDATE shows 
SET trending_score = COALESCE(
    (view_count * 0.2 + attendee_count * 0.3 + vote_count * 0.25 + setlist_count * 10 * 0.15 + RANDOM() * 0.1) * 10,
    0
)
WHERE trending_score IS NULL OR trending_score = 0;

UPDATE venues 
SET trending_score = COALESCE(
    ((SELECT COUNT(*) FROM shows WHERE venue_id = venues.id) * 10),
    0
)
WHERE trending_score IS NULL OR trending_score = 0;

-- 14. Clean up any null dates on shows (set to future date if missing)
UPDATE shows 
SET date = CURRENT_DATE + INTERVAL '30 days'
WHERE date IS NULL;

-- 15. Log completion
DO $$
DECLARE
    v_orphaned_votes INTEGER;
    v_orphaned_songs INTEGER;
    v_duplicate_songs INTEGER;
BEGIN
    -- Count fixes (these would have been tracked during deletes in a real scenario)
    RAISE NOTICE 'Data cleanup migration completed at %', NOW();
    RAISE NOTICE 'Fixed vote counts, removed orphaned records, and ensured data integrity';
END $$;