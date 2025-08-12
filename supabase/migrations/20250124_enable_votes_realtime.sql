-- Enable real-time for votes table to support live voting updates
-- This migration adds the votes table to Supabase realtime publication

-- First check if the votes table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'votes'
  ) THEN
    -- Add votes table to realtime publication
    ALTER PUBLICATION supabase_realtime ADD TABLE votes;
    
    -- Also add setlist_songs table for comprehensive voting real-time
    IF EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'setlist_songs'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE setlist_songs;
    END IF;
    
    -- Add vote_aggregates table if it exists
    IF EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'vote_aggregates'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE vote_aggregates;
    END IF;
    
    RAISE NOTICE 'Successfully enabled real-time for voting tables';
  ELSE
    RAISE WARNING 'Votes table does not exist - skipping real-time configuration';
  END IF;
END $$;

-- Verify real-time publication includes all necessary tables
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO table_count
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
  AND tablename IN ('votes', 'setlist_songs', 'vote_aggregates', 'artists', 'shows', 'venues');
  
  RAISE NOTICE 'Real-time enabled for % voting-related tables', table_count;
END $$;

-- Add comment documenting the real-time configuration
COMMENT ON PUBLICATION supabase_realtime IS 
'Real-time publication for TheSet app. Includes:
- artists: Real-time artist updates
- shows: Real-time show updates  
- venues: Real-time venue updates
- votes: Real-time voting updates (critical for live voting)
- setlist_songs: Real-time setlist changes
- vote_aggregates: Real-time vote count updates';