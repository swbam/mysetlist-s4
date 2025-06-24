-- Create a view for easier access to artist followers
-- This helps with compatibility and easier querying

-- First, ensure the followerCount column exists (in case migration 0002 hasn't run)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'artists' 
                   AND column_name = 'followerCount') THEN
        ALTER TABLE artists ADD COLUMN "followerCount" INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create or replace the view
CREATE OR REPLACE VIEW artist_followers AS
SELECT 
    artist_id,
    user_id,
    created_at
FROM user_follows_artists;

-- Grant permissions on the view
GRANT SELECT ON artist_followers TO authenticated;
GRANT SELECT ON artist_followers TO anon;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_user_follows_artists_created_at 
ON user_follows_artists(created_at DESC);