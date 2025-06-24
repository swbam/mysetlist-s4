-- Fix naming consistency issues
-- Rename followerCount to follower_count to match PostgreSQL naming conventions

-- First check if the column exists with camelCase
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'artists' 
               AND column_name = 'followerCount') THEN
        -- Rename the column to snake_case
        ALTER TABLE artists RENAME COLUMN "followerCount" TO follower_count;
    END IF;
END $$;

-- Update the trigger function to use snake_case
CREATE OR REPLACE FUNCTION update_artist_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE artists SET follower_count = follower_count + 1 WHERE id = NEW.artist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE artists SET follower_count = follower_count - 1 WHERE id = OLD.artist_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger (in case it needs updating)
DROP TRIGGER IF EXISTS update_artist_follower_count_trigger ON user_follows_artists;
CREATE TRIGGER update_artist_follower_count_trigger
AFTER INSERT OR DELETE ON user_follows_artists
FOR EACH ROW
EXECUTE FUNCTION update_artist_follower_count();

-- Update the artist_followers view to ensure it exists properly
DROP VIEW IF EXISTS artist_followers;
CREATE VIEW artist_followers AS
SELECT 
    artist_id,
    user_id,
    created_at
FROM user_follows_artists;

-- Grant permissions on the view
GRANT SELECT ON artist_followers TO authenticated;
GRANT SELECT ON artist_followers TO anon;