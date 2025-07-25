# Supabase Cron Jobs & Edge Functions Setup

## Overview

All scheduled jobs and background functions for MySetlist are handled by Supabase Edge Functions, NOT Vercel cron jobs.

## Current Edge Functions

Located in `/supabase/functions/`:

1. **update-trending** - Updates trending scores for artists and shows
2. **sync-artists** - Syncs artist data from external APIs
3. **sync-shows** - Syncs show/event data from Ticketmaster
4. **sync-setlists** - Syncs setlist data from Setlist.fm
5. **sync-song-catalog** - Updates song catalogs from Spotify
6. **scheduled-sync** - Master sync coordinator

## Setting Up Cron Jobs in Supabase

### 1. Deploy Edge Functions

```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref yzwkimtdaabyjbpykquu

# Deploy all functions
supabase functions deploy
```

### 2. Create Cron Jobs in Supabase Dashboard

1. Go to your Supabase Dashboard: https://app.supabase.com/project/yzwkimtdaabyjbpykquu
2. Navigate to **Database → Extensions**
3. Enable `pg_cron` extension if not already enabled
4. Go to **SQL Editor** and run:

```sql
-- Daily trending update (3 AM UTC)
SELECT cron.schedule(
  'update-trending-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    'https://yzwkimtdaabyjbpykquu.supabase.co/functions/v1/update-trending',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Hourly show sync (every hour)
SELECT cron.schedule(
  'sync-shows-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    'https://yzwkimtdaabyjbpykquu.supabase.co/functions/v1/sync-shows',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Weekly artist sync (Sundays at 2 AM UTC)
SELECT cron.schedule(
  'sync-artists-weekly',
  '0 2 * * 0',
  $$
  SELECT net.http_post(
    'https://yzwkimtdaabyjbpykquu.supabase.co/functions/v1/sync-artists',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### 3. Set Service Role Key

In Supabase SQL Editor:

```sql
-- Set the service role key for cron jobs
ALTER DATABASE postgres SET "app.settings.service_role_key" = 'your-service-role-key';
```

Replace `your-service-role-key` with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY5MjMxNiwiZXhwIjoyMDY2MjY4MzE2fQ.ZMorLC_eZke3bvBAF0zyzqUONxpomfTN2RpE_mLjz18`

## API Endpoints Still Available

While cron jobs run in Supabase, you can still manually trigger syncs via API:

- `POST /api/admin/sync` - Manual sync trigger
- `POST /api/admin/calculate-trending` - Manual trending calculation
- `POST /api/artists/sync` - Sync specific artist
- `POST /api/shows/sync` - Sync shows for venue/artist

## Monitoring Cron Jobs

### View Scheduled Jobs:
```sql
SELECT * FROM cron.job;
```

### View Job Run History:
```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 20;
```

### Disable/Enable Jobs:
```sql
-- Disable
SELECT cron.unschedule('job-name');

-- Re-enable
SELECT cron.schedule('job-name', 'schedule', 'command');
```

## Important Notes

1. **No Vercel Cron Jobs**: All scheduled tasks run in Supabase
2. **Rate Limits**: Be mindful of external API rate limits
3. **Monitoring**: Check Supabase logs for Edge Function execution
4. **Costs**: Edge Functions have invocation limits on free tier
5. **Security**: Always use service role key for cron jobs, not anon key

## Troubleshooting

- **Function not running**: Check Supabase logs
- **Authentication errors**: Verify service role key is set correctly
- **Rate limit errors**: Adjust cron schedules to spread out API calls
- **Function timeouts**: Edge Functions have 30s timeout by default