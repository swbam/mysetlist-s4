# Edge Functions Manual Cleanup Guide

## 🚨 URGENT: Clean Up 20+ Redundant Edge Functions

Since I cannot access your Supabase project directly, here's a comprehensive guide to manually clean up all edge functions.

## Step 1: Access Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project (ID: `yzwkimtdaabyjbpykquu`)
3. Click on **"Edge Functions"** in the left sidebar

## Step 2: Identify Functions to Delete

Based on our analysis, ALL edge functions should be deleted because:
- Your API routes (`/apps/web/app/api/`) handle all functionality
- Edge functions are just proxies adding unnecessary latency
- They create maintenance overhead and potential failure points

### Expected Functions You'll See:

#### Sync Functions (DELETE ALL):
- `scheduled-sync`
- `sync-artists`
- `sync-artist-shows`
- `sync-shows`
- `sync-setlists`
- `sync-song-catalog`
- `update-trending`
- `daily-artist-sync`
- `daily-sync`
- `artist-sync`
- `artist-discovery`

#### API Functions (DELETE ALL):
- `spotify-sync`
- `ticketmaster-sync`
- `setlist-fm-sync`
- `musicbrainz-sync`
- `venue-sync`

#### Processing Functions (DELETE ALL):
- `email-processor`
- `send-email`
- `analytics-processor`
- `notification-sender`
- `calculate-trending`

#### Legacy/Test Functions (DELETE ALL):
- `get-artist-shows`
- `process-artist-links`
- `real-time-sync`
- `search-spotify-artists`
- `setlist-scraper`

## Step 3: Delete Each Function

For each function in the dashboard:

1. Click on the function name
2. Review the function details (optional)
3. Click the **"Delete"** button (usually in the top right)
4. Confirm deletion when prompted
5. Repeat for ALL functions

## Step 4: Update Your Cron Jobs

After deleting all edge functions, ensure your cron jobs are updated to use API routes:

```sql
-- Run this in Supabase SQL Editor to update all cron jobs
-- This migration has already been created: 20250729_fix_cron_jobs_edge_functions.sql

-- Example of what the cron jobs should look like:
SELECT cron.schedule(
  'sync-trending-job',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.app_url') || '/api/cron/master-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('mode', 'hourly')
  );
  $$
);
```

## Step 5: Verify Code References

Check these files to ensure no edge function calls remain:

### Files to Check:
- `/apps/web/lib/sync-functions.ts` - Should be removed or updated
- `/apps/web/app/api/cron/sync/route.ts` - Should call API routes
- Any file using `supabase.functions.invoke()`

### Replace Edge Function Calls:

```typescript
// BEFORE (Edge Function)
const { data } = await supabase.functions.invoke('sync-artists', {
  body: { artistId }
});

// AFTER (API Route)
const response = await fetch('/api/sync/artists', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ artistId })
});
const data = await response.json();
```

## Step 6: Test Everything

After deleting all edge functions:

1. **Test Cron Jobs**: Check if scheduled syncs still work
2. **Test Manual Syncs**: Try syncing an artist manually
3. **Check Logs**: Look for any errors about missing functions
4. **Monitor Performance**: Should see improved response times

## Why Delete ALL Edge Functions?

1. **Redundancy**: Your API routes already implement all functionality
2. **Performance**: Removes unnecessary network hop (Edge Function → API)
3. **Cost**: No more edge function invocations on your Supabase bill
4. **Simplicity**: Single source of truth for all sync logic
5. **Debugging**: Easier to debug issues in Next.js API routes

## Architecture After Cleanup:

```
BEFORE: Cron/App → Edge Function → API Route → Database (4 hops)
AFTER:  Cron/App → API Route → Database (2 hops)
```

## Troubleshooting

If anything breaks after deletion:

1. **Check API Routes**: Ensure all endpoints exist in `/apps/web/app/api/`
2. **Update Environment Variables**: Ensure `NEXT_PUBLIC_APP_URL` is set correctly
3. **Check Authentication**: API routes should validate `CRON_SECRET` for cron jobs
4. **Review Logs**: Check both Vercel and Supabase logs for errors

## Summary

Delete ALL 20+ edge functions. They are ALL redundant. Your Next.js API routes handle everything these functions were doing, but more efficiently and with better error handling.