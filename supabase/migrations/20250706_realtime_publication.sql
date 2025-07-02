-- Add public tables to supabase_realtime publication so anon client can
-- receive presence & broadcast events.

ALTER PUBLICATION supabase_realtime ADD TABLE artists, shows, venues;

GRANT USAGE ON PUBLICATION supabase_realtime TO anon;