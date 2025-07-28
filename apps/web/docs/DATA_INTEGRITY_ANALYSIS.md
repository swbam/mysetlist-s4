# Data Integrity Analysis Report

## Current Issues Found

### 1. **Missing Database Schema Imports**

- The database schema is defined in `@repo/database` but many files are importing incorrectly
- Some files reference tables that don't exist in imports (e.g., `userFollowsArtists`)
- Schema relationships are not properly defined in the codebase

### 2. **Vote Count Inconsistencies**

- Vote counts are denormalized in `setlistSongs` table but not always updated correctly
- Manual vote count updates in `/api/votes/route.ts` can lead to race conditions
- No database triggers to ensure consistency

### 3. **Missing Foreign Key Constraints**

- Shows can exist without venues (`venueId` is nullable)
- No cascading deletes configured for related records
- Orphaned records can accumulate over time

### 4. **Data Sync Issues**

- Artist sync doesn't ensure shows are properly linked
- Song catalog sync is fire-and-forget without verification
- No tracking of sync status or failures

### 5. **Missing Relationships**

- `userFollowsArtists` table is referenced but not defined in schema
- No proper many-to-many relationships for user-artist follows
- Missing indexes for performance on relationship queries

### 6. **Trending Score Calculations**

- Trending scores calculated but not efficiently queried
- Missing indexes on `trendingScore` fields
- No background job to regularly update scores

### 7. **Data Consistency Issues**

- No validation that artist slugs are unique
- Duplicate songs can be created with same Spotify ID
- No data validation before inserts/updates

## Required Fixes

### 1. **Schema Updates Needed**

```sql
-- Add missing tables
CREATE TABLE user_follows_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, artist_id)
);

-- Add missing indexes
CREATE INDEX idx_artists_trending_score ON artists(trending_score DESC);
CREATE INDEX idx_shows_trending_score ON shows(trending_score DESC);
CREATE INDEX idx_venues_trending_score ON venues(trending_score DESC);
CREATE INDEX idx_user_follows_artists_user ON user_follows_artists(user_id);
CREATE INDEX idx_user_follows_artists_artist ON user_follows_artists(artist_id);

-- Add foreign key constraints with cascade
ALTER TABLE setlist_songs
  DROP CONSTRAINT IF EXISTS setlist_songs_setlist_id_fkey,
  ADD CONSTRAINT setlist_songs_setlist_id_fkey
    FOREIGN KEY (setlist_id) REFERENCES setlists(id) ON DELETE CASCADE;

ALTER TABLE votes
  DROP CONSTRAINT IF EXISTS votes_setlist_song_id_fkey,
  ADD CONSTRAINT votes_setlist_song_id_fkey
    FOREIGN KEY (setlist_song_id) REFERENCES setlist_songs(id) ON DELETE CASCADE;
```

### 2. **Database Triggers for Vote Consistency**

```sql
-- Trigger to update vote counts automatically
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE setlist_songs
  SET
    upvotes = (SELECT COUNT(*) FROM votes WHERE setlist_song_id = NEW.setlist_song_id AND vote_type = 'up'),
    downvotes = (SELECT COUNT(*) FROM votes WHERE setlist_song_id = NEW.setlist_song_id AND vote_type = 'down'),
    net_votes = (
      (SELECT COUNT(*) FROM votes WHERE setlist_song_id = NEW.setlist_song_id AND vote_type = 'up') -
      (SELECT COUNT(*) FROM votes WHERE setlist_song_id = NEW.setlist_song_id AND vote_type = 'down')
    ),
    updated_at = NOW()
  WHERE id = NEW.setlist_song_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vote_count_sync
AFTER INSERT OR UPDATE OR DELETE ON votes
FOR EACH ROW EXECUTE FUNCTION update_vote_counts();
```

### 3. **Data Validation Constraints**

```sql
-- Ensure unique slugs
ALTER TABLE artists ADD CONSTRAINT artists_slug_unique UNIQUE (slug);
ALTER TABLE shows ADD CONSTRAINT shows_slug_unique UNIQUE (slug);
ALTER TABLE venues ADD CONSTRAINT venues_slug_unique UNIQUE (slug);

-- Ensure no duplicate songs by Spotify ID
ALTER TABLE songs ADD CONSTRAINT songs_spotify_id_unique UNIQUE (spotify_id);

-- Add check constraints
ALTER TABLE shows ADD CONSTRAINT shows_date_not_null CHECK (date IS NOT NULL);
ALTER TABLE artists ADD CONSTRAINT artists_name_not_empty CHECK (name != '');
```

### 4. **Data Cleanup Queries**

```sql
-- Remove orphaned votes
DELETE FROM votes
WHERE setlist_song_id NOT IN (SELECT id FROM setlist_songs);

-- Remove orphaned setlist songs
DELETE FROM setlist_songs
WHERE setlist_id NOT IN (SELECT id FROM setlists);

-- Fix vote counts
UPDATE setlist_songs ss
SET
  upvotes = (SELECT COUNT(*) FROM votes WHERE setlist_song_id = ss.id AND vote_type = 'up'),
  downvotes = (SELECT COUNT(*) FROM votes WHERE setlist_song_id = ss.id AND vote_type = 'down'),
  net_votes = (
    (SELECT COUNT(*) FROM votes WHERE setlist_song_id = ss.id AND vote_type = 'up') -
    (SELECT COUNT(*) FROM votes WHERE setlist_song_id = ss.id AND vote_type = 'down')
  );

-- Remove duplicate songs by Spotify ID (keep the oldest)
DELETE FROM songs s1
WHERE EXISTS (
  SELECT 1 FROM songs s2
  WHERE s2.spotify_id = s1.spotify_id
  AND s2.created_at < s1.created_at
);
```

## Implementation Priority

1. **CRITICAL - Immediate**: Fix vote count consistency with triggers
2. **CRITICAL - Immediate**: Add missing `user_follows_artists` table
3. **HIGH - Today**: Add foreign key constraints with CASCADE
4. **HIGH - Today**: Add missing indexes for performance
5. **MEDIUM - This Week**: Implement data validation constraints
6. **MEDIUM - This Week**: Run data cleanup queries
7. **LOW - Next Sprint**: Improve sync tracking and error handling

## Performance Impact

Adding these fixes will:

- Improve query performance with proper indexes
- Ensure data consistency automatically
- Prevent orphaned records
- Make trending queries much faster
- Reduce manual intervention needs

## Testing Required

1. Test cascading deletes work properly
2. Verify vote count triggers update correctly
3. Test unique constraints prevent duplicates
4. Benchmark query performance improvements
5. Test data sync with new constraints
