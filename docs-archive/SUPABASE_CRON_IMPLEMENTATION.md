# MySetlist Supabase Cron Implementation

## Overview

MySetlist uses Supabase pg_cron for scheduled tasks. The implementation has been cleaned up to include only essential cron jobs based on the documented requirements.

## Current Cron Jobs

### 1. **Hourly Sync** (`hourly-sync`)
- **Schedule**: Every hour at minute 0
- **Endpoint**: `/api/cron/master-sync?mode=hourly`
- **Purpose**: Light sync for trending updates and recent changes
- **Operations**:
  - Updates trending scores
  - Syncs recent artist activity
  - Refreshes show statuses

### 2. **Daily Sync** (`daily-sync`)
- **Schedule**: Daily at 2:00 AM UTC
- **Endpoint**: `/api/cron/master-sync?mode=daily`
- **Purpose**: Comprehensive daily synchronization
- **Operations**:
  - Syncs popular artists from Spotify
  - Updates show data from Ticketmaster
  - Imports setlists from Setlist.fm
  - Performs data cleanup

### 3. **Calculate Trending** (`calculate-trending`)
- **Schedule**: Every 30 minutes
- **Endpoint**: `/api/cron/calculate-trending`
- **Purpose**: Updates trending scores for artists and shows
- **Operations**:
  - Calculates popularity based on views, votes, and activity
  - Updates trending rankings

## API Endpoints

### Master Sync (`/api/cron/master-sync`)
The main sync endpoint that handles all synchronization operations.

**Modes**:
- `hourly` - Light sync for recent updates
- `daily` - Full sync of all data
- `full` - Complete resync (use sparingly)

**Authentication**: Bearer token with CRON_SECRET (6155002300)

### Calculate Trending (`/api/cron/calculate-trending`)
Updates trending scores based on user activity and popularity metrics.

**Authentication**: Bearer token with CRON_SECRET

## Monitoring

### View Cron Status
```sql
SELECT * FROM cron_job_monitor;
```

### Check Recent Job Runs
```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 20;
```

### View Sync Logs
```sql
SELECT * FROM sync_log 
ORDER BY started_at DESC;
```

## Manual Execution

### Test Cron Endpoints
```bash
# Test hourly sync
curl -X GET https://mysetlist-sonnet.vercel.app/api/cron/master-sync?mode=hourly \
  -H "Authorization: Bearer 6155002300"

# Test daily sync
curl -X GET https://mysetlist-sonnet.vercel.app/api/cron/master-sync?mode=daily \
  -H "Authorization: Bearer 6155002300"

# Test trending calculation
curl -X GET https://mysetlist-sonnet.vercel.app/api/cron/calculate-trending \
  -H "Authorization: Bearer 6155002300"
```

## Configuration

App settings are stored in the `app_settings` table:
- `app_url`: https://mysetlist-sonnet.vercel.app
- `cron_secret`: 6155002300

## Cleanup Summary

The following were removed as unnecessary:
- 18+ duplicate cron endpoints
- Multiple overlapping SQL migration files
- Redundant database functions
- Unnecessary scheduled jobs

The system now has a clean, minimal implementation with only the essential cron jobs documented in the project requirements.