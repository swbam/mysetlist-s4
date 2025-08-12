-- Create user_follows_artists table for artist following functionality
CREATE TABLE IF NOT EXISTS user_follows_artists (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    PRIMARY KEY (user_id, artist_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_follows_artists_user_id ON user_follows_artists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_artists_artist_id ON user_follows_artists(artist_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_artists_created_at ON user_follows_artists(created_at DESC);

-- Add RLS policies
ALTER TABLE user_follows_artists ENABLE ROW LEVEL SECURITY;

-- Users can see all follows (public information)
CREATE POLICY "Anyone can view follows" ON user_follows_artists
    FOR SELECT USING (true);

-- Users can only manage their own follows
CREATE POLICY "Users can manage their own follows" ON user_follows_artists
    FOR ALL USING (auth.uid() = user_id);