# Supabase Edge Functions Cleanup Checklist

## Date: 2025-07-24

## Project ID: yzwkimtdaabyjbpykquu

### ✅ Completed Tasks

1. **Deployed all 7 functions that should be kept:**
   - ✅ `scheduled-sync` - Main orchestrator for all sync operations
   - ✅ `sync-artists` - Syncs artist data from external APIs
   - ✅ `sync-artist-shows` - Syncs shows for specific artists
   - ✅ `sync-shows` - Syncs show details
   - ✅ `sync-setlists` - Syncs setlist data
   - ✅ `sync-song-catalog` - Syncs song catalog
   - ✅ `update-trending` - Updates trending data

2. **Applied migration:** `20250724_cleanup_edge_functions.sql`

### 🗑️ Functions to Delete Manually from Supabase Dashboard

Please delete the following 9 unused edge functions from the Supabase Dashboard:

1. **`artist-discovery`**
   - Reason: Duplicate of search functionality
   - Status: Not referenced in codebase

2. **`artist-sync`**
   - Reason: Old duplicate of sync-artists
   - Status: Replaced by sync-artists

3. **`daily-artist-sync`**
   - Reason: Replaced by scheduled-sync
   - Status: Obsolete

4. **`daily-sync`**
   - Reason: Replaced by scheduled-sync
   - Status: Obsolete

5. **`get-artist-shows`**
   - Reason: Replaced by sync-artist-shows
   - Status: Functionality moved to sync-artist-shows

6. **`process-artist-links`**
   - Reason: Not used anywhere
   - Status: No references found

7. **`real-time-sync`**
   - Reason: Not needed, no real-time requirements
   - Status: Never implemented

8. **`search-spotify-artists`**
   - Reason: Should be API route, not edge function
   - Status: Functionality belongs in API routes

9. **`setlist-scraper`**
   - Reason: Old name for sync-setlists
   - Status: Renamed to sync-setlists

### 📋 Manual Deletion Steps

1. Go to [Supabase Dashboard](https://app.supabase.com/project/yzwkimtdaabyjbpykquu/functions)
2. For each function listed above:
   - Click on the function name
   - Click "Delete" button
   - Confirm deletion

### 🔍 Verification

After deletion, verify that only these 7 functions remain:

- scheduled-sync
- sync-artists
- sync-artist-shows
- sync-shows
- sync-setlists
- sync-song-catalog
- update-trending

### 📝 Notes

- The `scheduled-sync` function is the only one called by cron jobs
- All other sync functions are called internally by scheduled-sync
- This cleanup reduces edge functions from 16 to 7, improving maintainability
