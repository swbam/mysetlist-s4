# MySetlist Data Initialization Guide

## Quick Start

To get your MySetlist app running with data:

```bash
# Option 1: Use the initialization script (Recommended)
pnpm tsx scripts/initialize-app-data.ts

# Option 2: Manual initialization via API
curl -X POST http://localhost:3001/api/admin/initialize-data
```

## Data Flow Overview

1. **Mock Data Seeding** - Populates database with sample artists, venues, shows, and songs
2. **Trending Metrics** - Adds realistic view counts, vote counts, and follower numbers
3. **Score Calculation** - Calculates trending scores based on weighted algorithms
4. **Real Data Sync** (Optional) - Syncs real artists from Spotify/Ticketmaster APIs

## Available Endpoints

### 1. Complete Initialization

```bash
POST /api/admin/initialize-data
```

- Seeds mock data if database is empty
- Initializes trending metrics
- Calculates all trending scores
- Returns summary of initialized data

### 2. Trending System Only

```bash
# Initialize trending scores for existing data
POST /api/admin/init-trending

# Seed trending metrics (views, votes, followers)
POST /api/admin/seed-trending?type=all

# Calculate trending scores
POST /api/admin/calculate-trending?type=all

# Combined trending initialization
POST /api/admin/trending-init
```

### 3. Real Artist Sync

```bash
# Sync single artist from Spotify
POST /api/artists/sync
Body: {
  "artistName": "Taylor Swift",
  // OR
  "spotifyId": "06HL4z0CvFAxyc27GXpf02"
}

# Sync trending artists from Ticketmaster
GET /api/artists/sync
```

## Trending Score Algorithms

### Artist Trending Score

```
score = (followers / 10000) * 0.3 +
        popularity * 0.2 +
        recentShowCount * 10 * 0.3 +
        followerGrowth * 0.2
```

### Show Trending Score

```
score = viewCount * 0.2 +
        attendeeCount * 0.3 +
        voteCount * 0.25 +
        setlistCount * 5 * 0.15 +
        recencyFactor * 100 * 0.1
```

### Venue Trending Score

```
score = showCount * 5 * 0.4 +
        (totalAttendance / 100) * 0.3 +
        avgRating * 20 * 0.3
```

## Automated Updates

### Supabase Edge Functions

- `update-trending` - Recalculates trending scores
- `sync-song-catalog` - Syncs artist song catalogs from Spotify
- `sync-artist-shows` - Syncs shows from Ticketmaster
- `scheduled-sync` - Orchestrates all sync operations

### Cron Jobs (via pg_cron)

- **Daily Sync** - 2 AM UTC - Full data sync
- **Hourly Trending** - Every hour - Updates trending scores
- **Email Queue** - Every 5 minutes - Processes email notifications

## Troubleshooting

### No Data Showing

1. Check if database has data:

   ```bash
   curl http://localhost:3001/api/admin/init-trending
   ```

2. Initialize if empty:
   ```bash
   curl -X POST http://localhost:3001/api/admin/initialize-data
   ```

### Trending Scores Not Updating

1. Manually trigger calculation:

   ```bash
   curl -X POST http://localhost:3001/api/admin/calculate-trending
   ```

2. Check Supabase edge function logs for `update-trending`

### API Keys Not Working

1. Ensure environment variables are set:
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `TICKETMASTER_API_KEY`

2. Test with mock data first, then sync real data

## Mock Data Details

### Artists (10 total)

- Taylor Swift, Drake, Bad Bunny, The Weeknd, Post Malone
- Billie Eilish, Ed Sheeran, Ariana Grande, Bruno Mars, Dua Lipa

### Venues (5 total)

- Madison Square Garden (NYC)
- Staples Center (LA)
- United Center (Chicago)
- TD Garden (Boston)
- American Airlines Arena (Miami)

### Shows

- 25 shows (5 artists × 5 venues)
- Random dates within next 180 days
- Realistic attendance and vote counts

### Songs

- 15-25 songs per artist
- Total: ~200 songs
- Random popularity scores

## Development Tips

1. **Quick Reset**: Drop all data and reinitialize

   ```sql
   -- In Supabase SQL editor
   TRUNCATE artists, venues, shows, songs CASCADE;
   ```

2. **Test Specific Sync**:

   ```bash
   # Artists only
   curl -X POST http://localhost:3001/api/admin/seed-trending?type=artists

   # Shows only
   curl -X POST http://localhost:3001/api/admin/seed-trending?type=shows
   ```

3. **Monitor Trending Updates**:
   ```sql
   -- Check top trending
   SELECT name, trending_score FROM artists ORDER BY trending_score DESC LIMIT 10;
   SELECT name, trending_score FROM shows ORDER BY trending_score DESC LIMIT 10;
   ```

## Production Considerations

1. **Admin API Key**: Set `ADMIN_API_KEY` in production
2. **Rate Limiting**: Implement for public endpoints
3. **Cache Strategy**: Consider Redis for trending data
4. **Monitoring**: Set up alerts for failed sync jobs
5. **Backup**: Regular database backups before bulk operations
