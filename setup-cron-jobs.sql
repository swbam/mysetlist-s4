-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing jobs if they exist
SELECT cron.unschedule('scheduled-sync');
SELECT cron.unschedule('sync-artists');
SELECT cron.unschedule('sync-setlists');
SELECT cron.unschedule('sync-shows');

-- Scheduled sync (runs at 3 AM UTC)
SELECT cron.schedule(
    'scheduled-sync',
    '0 3 * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://yzwkimtdaabyjbpykquu.supabase.co/functions/v1/scheduled-sync',
        headers := jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTIzMTYsImV4cCI6MjA2NjI2ODMxNn0.8pKUt_PL7q9XmNACDKVrkyqBfK8jmUDx6ARNybrmIVM',
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    $$
);

-- Artist sync (runs every 6 hours)
SELECT cron.schedule(
    'sync-artists',
    '0 */6 * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://yzwkimtdaabyjbpykquu.supabase.co/functions/v1/sync-artists',
        headers := jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTIzMTYsImV4cCI6MjA2NjI2ODMxNn0.8pKUt_PL7q9XmNACDKVrkyqBfK8jmUDx6ARNybrmIVM',
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    $$
);

-- Setlist sync (runs every 4 hours)
SELECT cron.schedule(
    'sync-setlists',
    '0 */4 * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://yzwkimtdaabyjbpykquu.supabase.co/functions/v1/sync-setlists',
        headers := jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTIzMTYsImV4cCI6MjA2NjI2ODMxNn0.8pKUt_PL7q9XmNACDKVrkyqBfK8jmUDx6ARNybrmIVM',
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    $$
);

-- Show sync (runs every 2 hours)
SELECT cron.schedule(
    'sync-shows',
    '0 */2 * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://yzwkimtdaabyjbpykquu.supabase.co/functions/v1/sync-shows',
        headers := jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTIzMTYsImV4cCI6MjA2NjI2ODMxNn0.8pKUt_PL7q9XmNACDKVrkyqBfK8jmUDx6ARNybrmIVM',
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    $$
);
