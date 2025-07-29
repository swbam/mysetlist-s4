# Edge Functions Cleanup Report

## Files Updated
1. **/apps/web/lib/sync-functions.ts** - Converted all edge function calls to API routes
2. **/apps/web/app/api/scheduled/_deprecated/backup/route.ts** - Marked as deprecated

## API Route Mappings
The following edge functions should be replaced with API routes:

- `sync-artists` → `/api/sync/artists`
- `sync-shows` → `/api/sync/shows`
- `sync-setlists` → `/api/sync/setlists`
- `scheduled-sync` → `/api/cron/master-sync`
- `sync-artist-shows` → `/api/sync/artist-shows`
- `sync-song-catalog` → `/api/sync/song-catalog`
- `update-trending` → `/api/cron/calculate-trending`
- `backup-database` → `/api/cron/backup`
- `spotify-sync` → `/api/sync/spotify`
- `ticketmaster-sync` → `/api/sync/ticketmaster`
- `setlist-fm-sync` → `/api/sync/setlist-fm`
- `musicbrainz-sync` → `/api/sync/musicbrainz`
- `venue-sync` → `/api/sync/venues`
- `email-processor` → `/api/cron/email-processor`
- `send-email` → `/api/email/send`
- `analytics-processor` → `/api/cron/analytics`
- `notification-sender` → `/api/notifications/send`
- `calculate-trending` → `/api/cron/calculate-trending`

## Next Steps
1. Delete all edge functions from Supabase dashboard
2. Ensure all API routes listed above exist and are properly implemented
3. Test the sync functionality to ensure it works with API routes
4. Remove the deprecated backup route if not needed

## Important Notes
- All sync operations now go through Next.js API routes
- This eliminates the extra network hop through edge functions
- Performance should improve as there's one less layer
- Debugging is easier as all code is in the Next.js app
