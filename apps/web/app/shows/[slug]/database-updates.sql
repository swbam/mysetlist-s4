-- Create show_attendances table for tracking who's attending shows
CREATE TABLE IF NOT EXISTS show_attendances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(show_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_show_attendances_show_id ON show_attendances(show_id);
CREATE INDEX idx_show_attendances_user_id ON show_attendances(user_id);

-- Create function to increment attendee count
CREATE OR REPLACE FUNCTION increment_attendee_count(show_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE shows 
  SET attendee_count = attendee_count + 1
  WHERE id = show_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to decrement attendee count
CREATE OR REPLACE FUNCTION decrement_attendee_count(show_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE shows 
  SET attendee_count = GREATEST(attendee_count - 1, 0)
  WHERE id = show_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to shift setlist positions when inserting
CREATE OR REPLACE FUNCTION shift_setlist_positions(setlist_id UUID, start_position INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE setlist_songs 
  SET position = position + 1
  WHERE setlist_id = $1 AND position >= $2;
END;
$$ LANGUAGE plpgsql;

-- Create function to reorder setlist after delete
CREATE OR REPLACE FUNCTION reorder_setlist_after_delete(setlist_id UUID, deleted_position INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE setlist_songs 
  SET position = position - 1
  WHERE setlist_id = $1 AND position > $2;
END;
$$ LANGUAGE plpgsql;

-- Create function for bulk updating setlist positions
CREATE OR REPLACE FUNCTION bulk_update_setlist_positions(updates JSONB)
RETURNS VOID AS $$
DECLARE
  update_record JSONB;
BEGIN
  FOR update_record IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    UPDATE setlist_songs 
    SET position = (update_record->>'position')::INTEGER
    WHERE id = (update_record->>'id')::UUID;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS for show_attendances
ALTER TABLE show_attendances ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for show_attendances
CREATE POLICY "Users can view all attendances" ON show_attendances
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own attendance" ON show_attendances
  FOR ALL USING (auth.uid() = user_id);

-- Add missing columns to shows table if they don't exist
ALTER TABLE shows 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS attendee_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS setlist_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS vote_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trending_score DOUBLE PRECISION DEFAULT 0;