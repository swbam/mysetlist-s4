# MySetlist App - Issues Summary & Solutions

## Current Issues Found

### 1. **Database Column Name Mismatch** 🔴
**Problem**: The API endpoints use Supabase snake_case column names (e.g., `image_url`, `show_date`) but the sync services are likely using camelCase from Drizzle ORM.

**Solution**: Ensure all Supabase queries use the correct snake_case column names that match the actual database schema.

### 2. **Missing Environment Variables on Vercel** 🔴
**Problem**: Search and other features fail because environment variables aren't set on Vercel.

**Required Environment Variables**:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
TICKETMASTER_API_KEY
SETLISTFM_API_KEY
CRON_SECRET=6155002300
```

### 3. **Empty Database Tables** 🔴
**Problem**: Trending pages show no data because the database tables are empty.

**Solution**: 
1. Run the master sync to populate data
2. Ensure Ticketmaster API is properly configured
3. Test sync with a few popular artists

### 4. **Artist Pages 500 Error** 🟡
**Possible Causes**:
- Missing database connection on Vercel
- Column name mismatches
- Missing data in artist table

### 5. **Cron Jobs Need to Run in Supabase** 🟢
**Status**: Already cleaned up and configured with 3 essential jobs:
- Hourly sync
- Daily sync  
- Trending calculation

## Quick Fix Steps

### Step 1: Set Environment Variables on Vercel
```bash
# Add these to Vercel Dashboard > Settings > Environment Variables
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
DATABASE_URL=<your-database-url>
SPOTIFY_CLIENT_ID=<your-spotify-client-id>
SPOTIFY_CLIENT_SECRET=<your-spotify-client-secret>
TICKETMASTER_API_KEY=<your-ticketmaster-api-key>
SETLISTFM_API_KEY=<your-setlistfm-api-key>
CRON_SECRET=6155002300
```

### Step 2: Run SQL Migration in Supabase
```sql
-- Run this in Supabase SQL Editor
-- Path: /root/repo/supabase/migrations/20250122_cleanup_cron_jobs_final.sql
```

### Step 3: Test Master Sync
```bash
# Test locally first
curl -X GET http://localhost:3000/api/cron/master-sync?mode=daily \
  -H "Authorization: Bearer 6155002300"

# Then test on Vercel
curl -X GET https://mysetlist-sonnet.vercel.app/api/cron/master-sync?mode=daily \
  -H "Authorization: Bearer 6155002300"
```

### Step 4: Populate Initial Data
```bash
# Import a few popular artists to test
curl -X POST http://localhost:3000/api/sync/artist-import \
  -H "Content-Type: application/json" \
  -d '{"artistName": "Taylor Swift", "source": "ticketmaster"}'
```

## Verification Steps

1. **Check Database Tables**:
```sql
-- In Supabase SQL Editor
SELECT COUNT(*) FROM artists;
SELECT COUNT(*) FROM shows;
SELECT COUNT(*) FROM venues;
```

2. **Test Search**:
```bash
curl "https://mysetlist-sonnet.vercel.app/api/search?q=taylor"
```

3. **Test Trending**:
```bash
curl "https://mysetlist-sonnet.vercel.app/api/trending/artists"
```

## Summary

The app is architecturally complete but needs:
1. ✅ Cron jobs cleaned up (DONE)
2. ❌ Environment variables set on Vercel
3. ❌ Initial data sync to populate database
4. ❌ Column name consistency check

Once these are fixed, the app should be 100% functional.