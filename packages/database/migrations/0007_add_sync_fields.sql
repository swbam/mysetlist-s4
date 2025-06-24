-- Add missing fields for external API sync

-- Add setlistfm_id to setlists table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'setlists' AND column_name = 'setlistfm_id'
  ) THEN
    ALTER TABLE setlists ADD COLUMN setlistfm_id TEXT;
  END IF;
END $$;

-- Add source field to setlists to track where the data came from
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'setlists' AND column_name = 'source'
  ) THEN
    ALTER TABLE setlists ADD COLUMN source TEXT DEFAULT 'user';
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_artists_spotify_id ON artists(spotify_id);
CREATE INDEX IF NOT EXISTS idx_artists_last_synced_at ON artists(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_shows_ticketmaster_id ON shows(ticketmaster_id);
CREATE INDEX IF NOT EXISTS idx_setlists_setlistfm_id ON setlists(setlistfm_id);
CREATE INDEX IF NOT EXISTS idx_setlists_source ON setlists(source);

-- Add composite index for show lookups
CREATE INDEX IF NOT EXISTS idx_shows_date_status ON shows(date, status);
CREATE INDEX IF NOT EXISTS idx_shows_headliner_date ON shows(headliner_artist_id, date);

-- Add index for venue city searches
CREATE INDEX IF NOT EXISTS idx_venues_city ON venues(city);

-- Create RLS policies for edge functions
-- Allow service role to insert/update artists
CREATE POLICY IF NOT EXISTS "Service role can manage artists" ON artists
  FOR ALL USING (auth.role() = 'service_role');

-- Allow service role to insert/update shows
CREATE POLICY IF NOT EXISTS "Service role can manage shows" ON shows
  FOR ALL USING (auth.role() = 'service_role');

-- Allow service role to insert/update venues
CREATE POLICY IF NOT EXISTS "Service role can manage venues" ON venues
  FOR ALL USING (auth.role() = 'service_role');

-- Allow service role to insert/update setlists
CREATE POLICY IF NOT EXISTS "Service role can manage setlists" ON setlists
  FOR ALL USING (auth.role() = 'service_role');