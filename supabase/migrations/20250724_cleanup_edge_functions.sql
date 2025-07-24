-- Cleanup of unused Supabase Edge Functions
-- Date: 2025-07-24
-- 
-- This migration documents the cleanup of 9 unused edge functions
-- that were deployed but not referenced in the codebase.
--
-- Functions being removed:
-- 1. artist-discovery - Duplicate of search functionality
-- 2. artist-sync - Old duplicate of sync-artists
-- 3. daily-artist-sync - Replaced by scheduled-sync
-- 4. daily-sync - Replaced by scheduled-sync  
-- 5. get-artist-shows - Replaced by sync-artist-shows
-- 6. process-artist-links - Not used anywhere
-- 7. real-time-sync - Not needed, no real-time requirements
-- 8. search-spotify-artists - Should be API route, not edge function
-- 9. setlist-scraper - Old name for sync-setlists
--
-- Functions being kept (7 total):
-- 1. scheduled-sync - Main orchestrator for all sync operations
-- 2. sync-artists - Syncs artist data from external APIs
-- 3. sync-artist-shows - Syncs shows for specific artists
-- 4. sync-shows - Syncs show details
-- 5. sync-setlists - Syncs setlist data
-- 6. sync-song-catalog - Syncs song catalog
-- 7. update-trending - Updates trending data
--
-- Note: Only scheduled-sync is called by cron jobs.
-- All other sync functions are called internally by scheduled-sync.

-- Log the cleanup
INSERT INTO public.cron_job_logs (job_name, status, message, created_at)
VALUES 
  ('edge-function-cleanup', 'completed', 'Removed 9 unused edge functions. Reduced from 16 to 7 functions.', NOW());

-- Update any references in config (none found, but for safety)
-- No action needed as no references were found in the codebase