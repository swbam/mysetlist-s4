-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Profile information
  bio TEXT,
  location TEXT,
  favorite_genres TEXT, -- JSON array
  
  -- Social links
  instagram_url TEXT,
  twitter_url TEXT,
  spotify_url TEXT,
  
  -- Profile settings
  is_public BOOLEAN DEFAULT true NOT NULL,
  show_attended_shows BOOLEAN DEFAULT true NOT NULL,
  show_voted_songs BOOLEAN DEFAULT true NOT NULL,
  
  -- Statistics
  shows_attended INTEGER DEFAULT 0 NOT NULL,
  songs_voted INTEGER DEFAULT 0 NOT NULL,
  artists_followed INTEGER DEFAULT 0 NOT NULL,
  
  -- Avatar
  avatar_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create updated_at trigger
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create indexes for performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_location ON user_profiles(location) WHERE location IS NOT NULL;
CREATE INDEX idx_user_profiles_created_at ON user_profiles(created_at DESC);

-- Insert profiles for existing users
INSERT INTO user_profiles (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;