-- Create user_music_preferences table to store Spotify data
CREATE TABLE IF NOT EXISTS user_music_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  top_artists JSONB,
  followed_artists JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX idx_user_music_preferences_user_id ON user_music_preferences(user_id);

-- Add RLS policies
ALTER TABLE user_music_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only view and update their own preferences
CREATE POLICY "Users can view own preferences" ON user_music_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_music_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_music_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can manage all preferences
CREATE POLICY "Service role can manage all preferences" ON user_music_preferences
  FOR ALL USING (auth.role() = 'service_role');