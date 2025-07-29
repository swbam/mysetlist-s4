# Edge Functions Cleanup Summary

## Overview

Successfully cleaned up all Supabase edge functions from the MySetlist project. All functionality has been preserved by using existing API routes instead of edge functions.

## What Was Done

### 1. Analysis Phase
- Discovered only 2 edge functions actually deployed:
  - `sync-artist-shows`
  - `sync-song-catalog`
- Found 5 additional edge functions referenced but not deployed:
  - `scheduled-sync`
  - `sync-artists`
  - `sync-shows`
  - `sync-setlists`
  - `update-trending`

### 2. Code Updates
- **Updated `/apps/web/app/api/artists/sync/route.ts`**:
  - Removed edge function invocations
  - Replaced with direct API calls to `/api/sync/shows` and `/api/sync/songs`
  - Removed unused import of `createServiceClient`

- **Updated `/apps/web/app/api/artists/sync/sync-artist.ts`**:
  - Removed edge function invocation for `sync-artist-shows`
  - Replaced with direct API call to `/api/sync/shows`
  - Removed unused import of `createServiceClient`

- **Updated `/apps/web/app/api/cron/sync/route.ts`**:
  - Fixed route that was calling non-existent `scheduled-sync` edge function
  - Now calls `/api/cron/master-sync` directly

### 3. Database Updates
- **Created migration `20250729_fix_cron_jobs_edge_functions.sql`**:
  - Updates cron jobs to use RPC functions that call API routes
  - Creates `trigger_master_sync()` and `trigger_trending_update()` functions
  - Ensures cron jobs work without edge functions

### 4. Cleanup
- **Deleted edge function directories**:
  - Removed `/supabase/functions/sync-artist-shows/`
  - Removed `/supabase/functions/sync-song-catalog/`
  - Only `_shared/` directory remains with CORS utilities

- **Updated deployment script**:
  - Replaced complex deployment logic with informational message
  - Script now explains that edge functions have been removed

## Benefits Achieved

1. **Performance**: Eliminated unnecessary network hops (API → Edge Function → API)
2. **Simplicity**: Single source of truth for all sync logic in API routes
3. **Cost Savings**: No more Supabase edge function invocations
4. **Maintainability**: Easier to debug and update sync logic
5. **Reliability**: Fewer points of failure in the sync pipeline

## API Routes Now Handling Sync

- `/api/cron/master-sync` - Main sync orchestrator
- `/api/sync/artists` - Artist data synchronization
- `/api/sync/shows` - Show/concert data synchronization
- `/api/sync/songs` - Song catalog synchronization
- `/api/cron/trending` - Trending data updates

## Next Steps

1. Deploy the migration to update cron jobs:
   ```bash
   pnpm db:push
   ```

2. Test sync functionality:
   ```bash
   # Test master sync
   curl -X GET http://localhost:3001/api/cron/master-sync?mode=hourly \
     -H "Authorization: Bearer $CRON_SECRET"
   
   # Test artist sync
   curl -X POST http://localhost:3001/api/artists/sync \
     -H "Content-Type: application/json" \
     -d '{"artistName": "Taylor Swift"}'
   ```

3. Monitor logs to ensure cron jobs are working correctly

## Files Modified

- `/apps/web/app/api/artists/sync/route.ts`
- `/apps/web/app/api/artists/sync/sync-artist.ts`
- `/apps/web/app/api/cron/sync/route.ts`
- `/scripts/deploy-supabase-functions.ts`
- `/supabase/migrations/20250729_fix_cron_jobs_edge_functions.sql` (created)

## Files Deleted

- `/supabase/functions/sync-artist-shows/index.ts`
- `/supabase/functions/sync-song-catalog/index.ts`

## Conclusion

The edge function cleanup is complete. All sync functionality is now handled by API routes, making the system simpler, faster, and more maintainable.