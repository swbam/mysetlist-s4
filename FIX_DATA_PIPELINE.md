# MySetlist Data Pipeline Fix

This document explains how to fix the MySetlist data pipeline and populate the database with real data.

## Problem Summary

The MySetlist app was configured with:
- Cron jobs pointing to the wrong domain (mysetlist.io instead of mysetlist-sonnet.vercel.app)
- No initial data in the database
- Broken sync pipeline preventing data population

## Quick Fix Instructions

### 1. Apply Database Migration

Run the migration to update cron jobs to use the correct domain:

```bash
# Option A: Use the helper script
./scripts/apply-cron-fix.sh

# Option B: Apply migration directly
pnpm db:migrate
```

### 2. Populate Initial Data

Run the data pipeline fix script to seed initial artists, venues, shows, and songs:

```bash
pnpm fix:pipeline
```

This will:
- Seed 5 top US artists (Taylor Swift, Drake, Bad Bunny, The Weeknd, Post Malone)
- Create venues in major cities (Madison Square Garden, The Forum, etc.)
- Generate upcoming shows
- Add popular songs for each artist
- Calculate trending scores
- Test API endpoints

### 3. Alternative Seeding Options

If you need more control over the data:

```bash
# Seed artists directly to database (bypasses API)
pnpm seed:direct

# Run manual sync (discovers artists from Spotify)
pnpm sync:manual

# Initialize app data via API
pnpm init:app
```

### 4. Manual Cron Trigger

To manually trigger sync operations:

```bash
# Trigger master sync
curl -X POST https://mysetlist-sonnet.vercel.app/api/cron/master-sync \
  -H "Authorization: Bearer 6155002300"

# Trigger trending update
curl -X POST https://mysetlist-sonnet.vercel.app/api/cron/trending \
  -H "Authorization: Bearer 6155002300"
```

## Updated Cron Jobs

The migration updates cron jobs to:

1. **sync-artists-job** - Runs every 6 hours
   - Calls `/api/cron/master-sync?mode=daily`
   - Syncs artist data, shows, and setlists

2. **update-trending-job** - Runs every 2 hours
   - Calls `/api/cron/trending`
   - Updates trending scores

Both jobs now use:
- Correct domain: `https://mysetlist-sonnet.vercel.app`
- Correct authentication: Bearer token `6155002300`
- API routes instead of edge functions

## Verification

After running the fixes:

1. Check the database has data:
   ```bash
   pnpm db:studio
   ```

2. Visit the app:
   - Homepage: https://mysetlist-sonnet.vercel.app
   - Trending: https://mysetlist-sonnet.vercel.app/trending
   - Artists: https://mysetlist-sonnet.vercel.app/artists

3. Test search functionality

4. Verify cron jobs are running (check cron_job_logs table)

## Environment Variables

Ensure these are set in your `.env.local`:

```env
# Required
DATABASE_URL=your_supabase_connection_string
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# For real data sync (optional)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
TICKETMASTER_API_KEY=your_ticketmaster_api_key

# Cron authentication
CRON_SECRET=6155002300
```

## Troubleshooting

If data doesn't appear:

1. Check logs in the database:
   ```sql
   SELECT * FROM user_activity_log WHERE action LIKE '%sync%' ORDER BY created_at DESC;
   SELECT * FROM cron_job_logs ORDER BY created_at DESC;
   ```

2. Test API endpoints directly:
   ```bash
   curl https://mysetlist-sonnet.vercel.app/api/trending
   curl https://mysetlist-sonnet.vercel.app/api/artists?q=taylor
   ```

3. Run sync manually:
   ```bash
   pnpm sync:manual
   ```

4. Check for TypeScript errors:
   ```bash
   pnpm typecheck
   ```

## Notes

- The app uses mock data if external API keys aren't configured
- Real data sync requires Spotify and Ticketmaster API keys
- Cron jobs will continue to sync data periodically
- No email notifications or analytics tracking is implemented (as requested)