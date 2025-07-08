-- Create table for tracking anonymous suggestions
CREATE TABLE IF NOT EXISTS anonymous_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  setlist_id UUID REFERENCES setlists(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('song_addition', 'vote')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_anonymous_song_per_setlist UNIQUE (session_id, setlist_id, song_id, type)
);

-- Add index for faster lookups
CREATE INDEX idx_anonymous_suggestions_session ON anonymous_suggestions(session_id);
CREATE INDEX idx_anonymous_suggestions_setlist ON anonymous_suggestions(setlist_id);

-- Add RLS policies
ALTER TABLE anonymous_suggestions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert anonymous suggestions
CREATE POLICY "Anyone can create anonymous suggestions" ON anonymous_suggestions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Allow anyone to read their own anonymous suggestions
CREATE POLICY "Anyone can read their own anonymous suggestions" ON anonymous_suggestions
  FOR SELECT TO anon, authenticated
  USING (true);