# MySetlist Sync System Documentation

## Overview

The MySetlist sync system imports real data from external APIs (Ticketmaster and Spotify) to populate the database with artists, shows, venues, and songs. This ensures the application has real, up-to-date data for users to interact with.

## Environment Variables Required

Before running any sync operations, ensure these environment variables are set in your `.env` file:

```env
# Spotify API (Required)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id

# Ticketmaster API (Required)
TICKETMASTER_API_KEY=your_ticketmaster_api_key

# Supabase (Required for edge functions)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## Sync Components

### 1. Artist Sync API (`/api/artists/sync`)

The main sync endpoint that:

- Accepts artist data from Spotify and/or Ticketmaster
- Creates or updates artist records in the database
- Triggers background jobs for song catalog and show syncing

**POST endpoint:**

```bash
curl -X POST http://localhost:3001/api/artists/sync \
  -H "Content-Type: application/json" \
  -d '{"spotifyId": "spotify_artist_id", "artistName": "Artist Name"}'
```

**GET endpoint:**

```bash
# Automatically syncs top 10 trending artists with upcoming US shows
curl http://localhost:3001/api/artists/sync
```

### 2. Edge Functions

#### `sync-song-catalog`

- Fetches an artist's complete discography from Spotify
- Imports all songs, albums, and metadata
- Updates artist statistics

#### `sync-artist-shows`

- Fetches upcoming shows from Ticketmaster
- Creates venue records as needed
- Links shows to artists and venues

### 3. Sync Scripts

#### `sync-trending-artists.ts`

```bash
# Sync top 10 trending artists with upcoming shows
pnpm sync:artists
```

This script:

1. Queries Ticketmaster for upcoming music events in the US
2. Identifies the most popular artists by show count
3. Matches artists with Spotify for additional metadata
4. Syncs each artist through the API

#### `comprehensive-e2e-test.ts`

```bash
# Run comprehensive tests on synced data
pnpm test:e2e
```

This script verifies:

- Artists exist with proper data
- Shows are properly linked to artists and venues
- API endpoints return correct data
- Data integrity is maintained

### 4. All-in-One Command

```bash
# Sync artists and run tests
pnpm allofit
```

This runs:

1. `sync:artists` - Syncs trending artists
2. Waits 5 seconds for background jobs
3. `test:e2e` - Runs comprehensive tests

## Data Flow

1. **Artist Discovery**
   - Ticketmaster API → Find artists with upcoming shows
   - Sort by popularity/show count
   - Take top 10 artists

2. **Artist Enrichment**
   - Spotify API → Get artist metadata
   - Genres, popularity, images, follower count

3. **Background Sync**
   - Edge Function: `sync-song-catalog` → Import all songs
   - Edge Function: `sync-artist-shows` → Import shows and venues

4. **Data Storage**

   ```
   artists (table)
   ├── Basic info from Spotify
   ├── Ticketmaster ID for show linking
   └── Last sync timestamp

   shows (table)
   ├── Event details from Ticketmaster
   ├── Linked to artist and venue
   └── Status (upcoming/completed)

   venues (table)
   ├── Location data from Ticketmaster
   └── Capacity and contact info

   songs (table)
   ├── Complete catalog from Spotify
   ├── Album info and release dates
   └── Preview URLs and metadata
   ```

## Troubleshooting

### Common Issues

1. **"Spotify credentials not configured"**
   - Ensure `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are set
   - Check credentials are valid at https://developer.spotify.com/dashboard

2. **"Ticketmaster API key not configured"**
   - Ensure `TICKETMASTER_API_KEY` is set
   - Verify key at https://developer.ticketmaster.com/

3. **Edge functions not running**
   - Check Supabase credentials are set
   - Verify edge functions are deployed: `supabase functions list`
   - Check logs: `supabase functions logs sync-song-catalog`

4. **No upcoming shows found**
   - Ticketmaster data varies by region and time
   - The sync focuses on US shows in the next 6 months
   - Try running sync at different times

### Monitoring Sync Progress

1. **Check database counts:**

   ```sql
   SELECT COUNT(*) FROM artists;
   SELECT COUNT(*) FROM shows WHERE status = 'upcoming';
   SELECT COUNT(*) FROM venues;
   SELECT COUNT(*) FROM songs;
   ```

2. **View sync logs:**

   ```bash
   # Supabase edge function logs
   supabase functions logs sync-song-catalog
   supabase functions logs sync-artist-shows
   ```

3. **Check artist sync status:**
   ```sql
   SELECT name, last_synced_at, song_catalog_synced_at
   FROM artists
   ORDER BY last_synced_at DESC;
   ```

## Rate Limits

- **Spotify:** Client Credentials flow has generous limits
- **Ticketmaster:** 5000 requests per day
- **Sync scripts include delays to respect rate limits**

## Best Practices

1. **Initial Setup:**
   - Run `pnpm allofit` for initial data population
   - Wait for background jobs to complete (check logs)

2. **Regular Updates:**
   - Schedule periodic syncs to keep data fresh
   - Use cron jobs or scheduled functions

3. **Development:**
   - Use local database for testing
   - Don't oversync - cache data when possible
   - Monitor API usage to stay within limits

4. **Production:**
   - Use environment-specific API keys
   - Set up monitoring for sync failures
   - Implement retry logic for failed syncs
