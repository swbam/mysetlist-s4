-- Create venue_tip_category enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE venue_tip_category AS ENUM ('parking', 'food', 'access', 'sound', 'view', 'general');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create venue_tips table
CREATE TABLE IF NOT EXISTS venue_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  category venue_tip_category NOT NULL,
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_venue_tips_venue_id ON venue_tips(venue_id);
CREATE INDEX idx_venue_tips_user_id ON venue_tips(user_id);
CREATE INDEX idx_venue_tips_category ON venue_tips(category);
CREATE INDEX idx_venue_tips_upvotes ON venue_tips(upvotes DESC);

-- Add RLS policies
ALTER TABLE venue_tips ENABLE ROW LEVEL SECURITY;

-- Anyone can read venue tips
CREATE POLICY "Anyone can read venue tips"
  ON venue_tips FOR SELECT
  USING (true);

-- Users can create their own tips
CREATE POLICY "Users can create venue tips"
  ON venue_tips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tips
CREATE POLICY "Users can update their own venue tips"
  ON venue_tips FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own tips
CREATE POLICY "Users can delete their own venue tips"
  ON venue_tips FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_venue_tips_updated_at
  BEFORE UPDATE ON venue_tips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();