# Supabase Edge Functions Cleanup Plan

## Executive Summary

The MySetlist app currently has 2 deployed edge functions but references 7 in various places. All edge functions are redundant as their functionality has been migrated to API routes. The edge functions that exist are just proxies that call back to API routes, creating unnecessary overhead and complexity.

## Current State Analysis

### Edge Functions Actually Deployed
1. **sync-artist-shows** - Proxies to `/api/sync/shows`
2. **sync-song-catalog** - Proxies to `/api/artists/sync`

### Edge Functions Referenced But Missing
1. **scheduled-sync** - Referenced by cron jobs and `/api/cron/sync/route.ts`
2. **sync-artists** - Referenced in old migration files
3. **sync-shows** - Referenced in old migration files  
4. **sync-setlists** - Referenced in old migration files
5. **update-trending** - Referenced in old migration files

### Redundancy Analysis
- All sync functionality is handled by API routes in `/apps/web/app/api/`
- The 2 existing edge functions just forward requests to API routes
- This creates circular dependencies: API → Edge Function → API
- Adds latency and complexity without any benefit

## Cleanup Actions Required

### 1. Remove Edge Function Invocations

**File**: `/apps/web/app/api/artists/sync/route.ts`
- Line 156-158: Remove `sync-song-catalog` invocation
- Line 162-168: Remove `sync-artist-shows` invocation
- Replace with direct API calls or inline the functionality

**File**: `/apps/web/app/api/artists/sync/sync-artist.ts`
- Line 415: Remove `sync-artist-shows` invocation
- Replace with direct API call to `/api/sync/shows`

### 2. Fix Cron Jobs

The cron jobs are calling non-existent `scheduled-sync` function. They should call the master sync API directly.

**Update needed in database**:
- Change cron job URLs from `/functions/v1/scheduled-sync` to `/api/cron/master-sync`
- Update both `sync-artists-job` and `update-trending-job`

### 3. Update API Route

**File**: `/apps/web/app/api/cron/sync/route.ts`
- Remove the edge function call (line 29)
- Replace with direct call to `/api/cron/master-sync` or inline the sync logic

### 4. Delete Edge Functions

Remove these directories:
- `/supabase/functions/sync-artist-shows/`
- `/supabase/functions/sync-song-catalog/`

### 5. Update Deployment Script

**File**: `/scripts/deploy-supabase-functions.ts`
- Remove references to edge functions
- Update to only deploy if there are actual edge functions needed

## Implementation Steps

1. **Phase 1: Update Code (Priority: HIGH)**
   - Remove edge function invocations from API routes
   - Replace with direct API calls
   - Update cron sync route

2. **Phase 2: Update Database (Priority: HIGH)**
   - Create migration to update cron job URLs
   - Test cron jobs with new endpoints

3. **Phase 3: Delete Edge Functions (Priority: MEDIUM)**
   - Delete edge function directories
   - Remove from deployment scripts
   - Deploy changes to Supabase

4. **Phase 4: Verification (Priority: MEDIUM)**
   - Test sync functionality
   - Verify cron jobs are working
   - Check logs for any errors

## Benefits of Cleanup

1. **Performance**: Remove unnecessary network hops (API → Edge → API)
2. **Simplicity**: Single source of truth for sync logic
3. **Cost**: Reduce Supabase edge function invocations
4. **Maintenance**: Easier to debug and maintain
5. **Reliability**: Fewer points of failure

## Risk Assessment

- **Low Risk**: All functionality exists in API routes
- **Mitigation**: Test each change incrementally
- **Rollback**: Keep backup of edge functions until verified

## Estimated Time

- Code updates: 30 minutes
- Database updates: 15 minutes
- Testing: 30 minutes
- Total: ~1.5 hours