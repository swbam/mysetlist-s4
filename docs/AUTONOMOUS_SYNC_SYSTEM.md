# Autonomous Sync System Documentation

## Overview

The MySetlist Autonomous Sync System is a fully automated data synchronization pipeline that continuously discovers artists, syncs show data, and calculates trending scores. The system runs on Vercel cron jobs and requires no manual intervention once configured.

## Architecture

### Sync Flow

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  Artist Discovery   │────▶│    Show Sync        │────▶│ Trending Calculation│
│ (Ticketmaster/Spotify)    │ (Ticketmaster/Setlist.fm)  │  (Real-time scores) │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
         │                           │                           │
         ▼                           ▼                           ▼
    ┌─────────┐              ┌─────────┐                ┌─────────┐
    │ Artists │              │  Shows  │                │ Trending│
    │   DB    │              │   DB    │                │  Scores │
    └─────────┘              └─────────┘                └─────────┘
```

### Cron Jobs Schedule

| Job | Endpoint | Schedule | Description |
|-----|----------|----------|-------------|
| Artist Discovery | `/api/cron/autonomous-sync?mode=discovery` | Every 4 hours | Discovers new artists from external APIs |
| Artist Sync | `/api/cron/autonomous-sync?mode=sync` | Every 2 hours | Syncs shows for existing artists |
| Master Sync | `/api/cron/master-sync?mode=daily` | Daily at 6 AM | Comprehensive daily sync |
| Trending (Hourly) | `/api/cron/calculate-trending?mode=hourly` | Every hour at :30 | Updates trending scores for active content |
| Trending (Daily) | `/api/cron/calculate-trending?mode=daily` | Daily at 7 AM | Full trending recalculation |

## Components

### 1. Autonomous Discovery (`/api/cron/autonomous-sync`)

Discovers new artists from multiple sources:

- **Ticketmaster**: Searches for upcoming concerts in major markets
- **Spotify**: Analyzes top playlists for popular artists
- **Automatic Import**: Adds discovered artists to the database

### 2. Master Sync (`/api/cron/master-sync`)

Comprehensive sync for existing artists:

- Updates artist metadata from Spotify
- Syncs upcoming shows from Ticketmaster
- Fetches historical setlists from Setlist.fm
- Updates venue information

### 3. Trending Calculation (`/api/cron/calculate-trending`)

Real-time trending score calculation based on:

- Artist popularity and follower growth
- Show attendance and vote counts
- Recent user activity (views, follows, votes)
- Time decay for older content

## Setup Guide

### 1. Environment Variables

Required API keys for autonomous sync:

```env
# Spotify API (required)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Ticketmaster API (required)
TICKETMASTER_API_KEY=your_ticketmaster_api_key

# Setlist.fm API (required)
SETLISTFM_API_KEY=your_setlistfm_api_key

# Cron Security (required)
CRON_SECRET=your_secure_cron_secret

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Verify Setup

```bash
# Check all environment variables
pnpm check:env:apis

# Check database structure
pnpm check:db:sync

# Check sync system status
pnpm check:sync:status
```

### 3. Initial Data Seeding

```bash
# Option 1: Comprehensive seed (recommended)
pnpm seed:comprehensive

# Option 2: Manual discovery
pnpm trigger:sync:discovery --limit 50
```

### 4. Deploy to Vercel

```bash
# Deploy with cron jobs
vercel --prod

# Cron jobs are automatically configured via vercel.json
```

## Manual Operations

### Trigger Sync Manually

```bash
# Discover new artists
pnpm trigger:sync autonomous-discovery --mode discovery --limit 20

# Sync existing artists
pnpm trigger:sync master-sync --mode daily

# Calculate trending scores
pnpm trigger:sync trending --mode daily

# Full sync (discovery + sync)
pnpm trigger:sync autonomous-discovery --mode full
```

### Monitor Sync Status

```bash
# Check last 24 hours
pnpm check:sync:status

# Check last 48 hours
pnpm check:sync:status 48

# Via API endpoint
curl http://localhost:3001/api/sync/monitor?hours=24
```

## Monitoring & Health

### Health Metrics

The sync monitor tracks:

- **Sync Coverage**: Percentage of artists synced
- **Sync Freshness**: Percentage synced recently
- **Trending Coverage**: Percentage with trending scores
- **Error Rate**: Success rate of sync operations

### Sync Monitor API

```bash
GET /api/sync/monitor?hours=24

Response:
{
  "healthScore": {
    "overall": 85,
    "syncCoverage": 90,
    "syncFreshness": 80,
    "trendingCoverage": 85,
    "errorRate": 95
  },
  "statistics": {
    "artists": { "total": 500, "synced": 450, "needsSync": 50 },
    "shows": { "total": 1200, "upcoming": 800, "completed": 400 },
    "venues": { "total": 300, "withShows": 280 }
  },
  "syncSummary": {
    "masterSync": { "runs": 24, "success": 23, "errors": 1 },
    "autonomousSync": { "runs": 48, "success": 47, "errors": 1 },
    "trendingCalc": { "runs": 24, "success": 24, "errors": 0 }
  }
}
```

## Troubleshooting

### Common Issues

1. **No artists being discovered**
   - Check API keys are valid: `pnpm check:env:apis`
   - Verify Ticketmaster/Spotify access
   - Check rate limits

2. **Trending scores not updating**
   - Ensure artists have been synced first
   - Check user activity is being logged
   - Verify trending calculation cron is running

3. **Shows not syncing**
   - Check artist has ticketmaster_id
   - Verify Ticketmaster API access
   - Check venue creation permissions

### Debug Commands

```bash
# Test API connections
pnpm check:env:apis

# Check database state
pnpm check:db:sync

# View sync logs
pnpm check:sync:status

# Dry run sync
pnpm trigger:sync autonomous-discovery --mode discovery --dry-run
```

## API Rate Limits

- **Spotify**: 180 requests/minute (client credentials)
- **Ticketmaster**: 5000 requests/day
- **Setlist.fm**: Generous limits, but implement caching

The sync system automatically implements:
- Rate limiting between API calls
- Exponential backoff on errors
- Caching of successful responses

## Best Practices

1. **Start Small**: Begin with `--limit 10` when testing
2. **Monitor Health**: Check sync status daily initially
3. **Scale Gradually**: Increase limits as system proves stable
4. **Cache Aggressively**: Reduce API calls with smart caching
5. **Log Everything**: Use activity logs for debugging

## Security

- All cron endpoints require `CRON_SECRET` authentication
- Use service role keys only on server-side
- Never expose API keys in client code
- Implement request validation

## Performance Optimization

The system is optimized for:
- Parallel processing where possible
- Batch operations to reduce database calls
- Intelligent caching of API responses
- Progressive enhancement of data quality

## Future Enhancements

Planned improvements:
- Machine learning for trending predictions
- Social media integration for buzz tracking
- Automated venue capacity detection
- Artist similarity recommendations
- Geographic trending analysis