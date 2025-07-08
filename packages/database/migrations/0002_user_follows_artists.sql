-- Create user follows artists table
CREATE TABLE IF NOT EXISTS user_follows_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, artist_id)
);

-- Create indexes
CREATE INDEX idx_user_follows_artists_user_id ON user_follows_artists(user_id);
CREATE INDEX idx_user_follows_artists_artist_id ON user_follows_artists(artist_id);

-- Add follower count to artists table if not exists
-- Note: Using camelCase to match Drizzle schema
ALTER TABLE artists ADD COLUMN IF NOT EXISTS "followerCount" INTEGER DEFAULT 0;

-- Create function to update follower count
CREATE OR REPLACE FUNCTION update_artist_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE artists SET "followerCount" = "followerCount" + 1 WHERE id = NEW.artist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE artists SET "followerCount" = "followerCount" - 1 WHERE id = OLD.artist_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update follower count
CREATE TRIGGER update_artist_follower_count_trigger
AFTER INSERT OR DELETE ON user_follows_artists
FOR EACH ROW
EXECUTE FUNCTION update_artist_follower_count();