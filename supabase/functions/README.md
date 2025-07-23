# Supabase Edge Functions

This directory contains the Supabase Edge Functions for syncing data from external APIs.

## Functions Overview

### sync-artists
Syncs artist data from Spotify API. Can fetch by Spotify ID or search by artist name.

**Endpoint:** `/functions/v1/sync-artists`

**Request Body:**
```json
{
  "spotifyId": "string", // Optional if artistName provided
  "artistName": "string", // Optional if spotifyId provided
  "forceSync": false // Optional, forces re-sync even if recently synced
}
```

### sync-shows
Syncs upcoming shows/concerts from Ticketmaster API.

**Endpoint:** `/functions/v1/sync-shows`

**Request Body:**
```json
{
  "artistName": "string", // Optional if artistId provided
  "artistId": "string", // Optional if artistName provided
  "city": "string", // Optional
  "dateRange": {
    "start": "2024-01-15", // Optional, YYYY-MM-DD format
    "end": "2024-07-15" // Optional, YYYY-MM-DD format
  }
}
```

### sync-setlists
Syncs setlist data from Setlist.fm API.

**Endpoint:** `/functions/v1/sync-setlists`

**Request Body:**
```json
{
  "setlistId": "string", // Optional if showId or artistName+date provided
  "showId": "string", // Optional, will create setlist for this show
  "artistName": "string", // Required with date if no setlistId
  "date": "2024-01-15" // Required with artistName if no setlistId
}
```

### scheduled-sync
Scheduled function to sync data periodically. Should be called via cron job.

**Endpoint:** `/functions/v1/scheduled-sync`

**Request Body:**
```json
{
  "type": "all", // Options: "all", "artists", "shows", "setlists"
  "limit": 10 // Number of items to sync per type
}
```

## Environment Variables

The following environment variables need to be set in Supabase:

```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
TICKETMASTER_API_KEY=your_ticketmaster_api_key
SETLIST_FM_API_KEY=your_setlistfm_api_key
```

## Local Development

To run functions locally:

```bash
# Start Supabase locally
supabase start

# Serve functions locally
supabase functions serve

# Test a specific function
supabase functions serve sync-artists --env-file .env.local
```

## Deployment

To deploy functions to production:

```bash
# Deploy all functions
supabase functions deploy

# Deploy a specific function
supabase functions deploy sync-artists

# Set secrets (one time)
supabase secrets set SPOTIFY_CLIENT_ID=your_value
supabase secrets set SPOTIFY_CLIENT_SECRET=your_value
supabase secrets set TICKETMASTER_API_KEY=your_value
supabase secrets set SETLIST_FM_API_KEY=your_value
```

## Setting up Scheduled Sync

To set up the scheduled sync, you'll need to create a cron job that calls the `scheduled-sync` function. This can be done using:

1. **Supabase Dashboard**: Go to the "Cron Jobs" section and create a new job
2. **External service**: Use services like GitHub Actions, Vercel Cron, or any cron service

Example cron expression for hourly sync:
```
0 * * * * curl -X POST https://your-project.supabase.co/functions/v1/scheduled-sync \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTIzMTYsImV4cCI6MjA2NjI2ODMxNn0.8pKUt_PL7q9XmNACDKVrkyqBfK8jmUDx6ARNybrmIVM" \
  -H "Content-Type: application/json" \
  -d '{"type": "all", "limit": 20}'
```

## API Usage Examples

### From the frontend (using Supabase client):

```typescript
// Sync an artist
const { data, error } = await supabase.functions.invoke('sync-artists', {
  body: { artistName: 'Taylor Swift' }
});

// Sync shows for an artist
const { data, error } = await supabase.functions.invoke('sync-shows', {
  body: { 
    artistName: 'Arctic Monkeys',
    dateRange: {
      start: '2024-01-01',
      end: '2024-12-31'
    }
  }
});

// Sync setlist for a show
const { data, error } = await supabase.functions.invoke('sync-setlists', {
  body: { 
    showId: 'show-uuid-here',
    artistName: 'Billie Eilish',
    date: '2024-03-20'
  }
});
```

### Direct HTTP calls:

```bash
# Sync artist
curl -X POST https://your-project.supabase.co/functions/v1/sync-artists \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTIzMTYsImV4cCI6MjA2NjI2ODMxNn0.8pKUt_PL7q9XmNACDKVrkyqBfK8jmUDx6ARNybrmIVM" \
  -H "Content-Type: application/json" \
  -d '{"artistName": "The Weeknd"}'

# Sync shows
curl -X POST https://your-project.supabase.co/functions/v1/sync-shows \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTIzMTYsImV4cCI6MjA2NjI2ODMxNn0.8pKUt_PL7q9XmNACDKVrkyqBfK8jmUDx6ARNybrmIVM" \
  -H "Content-Type: application/json" \
  -d '{"artistName": "Olivia Rodrigo", "city": "Los Angeles"}'
```

## Rate Limits

Be aware of API rate limits:
- Spotify: 180 requests per minute (with client credentials)
- Ticketmaster: 5000 requests per day
- Setlist.fm: 2 requests per second

The functions implement caching to minimize API calls. Artists are cached for 24 hours by default.

## Troubleshooting

1. **Function timeout**: Edge functions have a 30-second timeout. For large sync operations, use the scheduled-sync with smaller limits.

2. **CORS errors**: The functions include CORS headers for all origins. For production, update the `Access-Control-Allow-Origin` header to your specific domain.

3. **Authentication errors**: Make sure all API keys are properly set as Supabase secrets.

4. **Missing data**: Some external APIs may not have complete data. The functions handle missing data gracefully by using null values.