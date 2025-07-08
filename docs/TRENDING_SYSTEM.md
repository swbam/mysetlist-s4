# Trending System Documentation

## Overview

The MySetlist trending system calculates and displays trending artists, shows, and venues based on various engagement metrics. The system uses a weighted scoring algorithm that considers views, votes, attendance, and time decay.

## Components

### 1. Database Schema

The trending system uses the following database fields:

- **Artists**: `trendingScore` (double precision)
- **Shows**: `trendingScore`, `viewCount`, `attendeeCount`, `voteCount`, `setlistCount`
- **Venues**: Activity is calculated based on show counts

### 2. Scoring Algorithm

#### Artist Scoring Weights:
- Followers: 30%
- Popularity: 20%
- Recent Shows: 30%
- Follower Growth: 20%

#### Show Scoring Weights:
- View Count: 20%
- Attendee Count: 30%
- Vote Count: 25%
- Setlist Count: 15%
- Recency: 10% (7-day decay)

### 3. API Endpoints

#### Public Endpoints:
- `GET /api/trending` - Get combined trending content
- `GET /api/trending/artists` - Get trending artists
- `GET /api/trending/shows` - Get trending shows
- `GET /api/trending/venues` - Get trending venues
- `GET /api/trending/live` - Get live/real-time trending data
- `GET /api/trending/test` - Test endpoint to verify data availability

#### Admin Endpoints:
- `POST /api/admin/calculate-trending` - Calculate trending scores
- `POST /api/admin/seed-trending` - Seed realistic trending data
- `POST /api/admin/trending-init` - Initialize entire trending system

#### Cron Jobs:
- `/api/cron/trending-update` - Automated hourly update of trending scores

### 4. Analytics Tracking

- `POST /api/analytics/track-view` - Track page views
- `useTrackView` hook - React hook for automatic view tracking

## Usage

### Initialize Trending System

To initialize the trending system with data:

```bash
curl -X POST http://localhost:3000/api/admin/trending-init \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

This will:
1. Seed realistic metrics to existing data
2. Calculate trending scores based on metrics
3. Make the trending page show real data

### Track Views in Components

```tsx
import { useTrackView } from '@/hooks/use-track-view';

export function ArtistPage({ artistId }: { artistId: string }) {
  // Automatically tracks view after 1 second
  useTrackView('artist', artistId);
  
  return <div>Artist content...</div>;
}
```

### Fetch Trending Data

```tsx
import { getTrendingArtists, getTrendingShows } from '@/lib/trending';

// In a server component
const trendingArtists = await getTrendingArtists({ limit: 10 });
const trendingShows = await getTrendingShows({ limit: 10 });

// Via API
const response = await fetch('/api/trending/artists?limit=10');
const data = await response.json();
```

## Configuration

### Environment Variables

```env
ADMIN_API_KEY=your-admin-key
CRON_SECRET=your-cron-secret
```

### Trending Config

Customize trending calculation in `/lib/trending.ts`:

```ts
const DEFAULT_CONFIG: TrendingConfig = {
  timeWindow: 168, // 7 days in hours
  weightVotes: 2.0,
  weightAttendees: 1.5,
  weightRecency: 1.2,
  limit: 10,
};
```

## Maintenance

### Regular Updates

The cron job at `/api/cron/trending-update` should run hourly to:
- Recalculate trending scores
- Apply time decay
- Update rankings

### Manual Recalculation

To manually recalculate all trending scores:

```bash
curl -X POST http://localhost:3000/api/admin/calculate-trending?type=all \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

### Testing

To verify the trending system is working:

```bash
curl http://localhost:3000/api/trending/test
```

This returns statistics about:
- Number of items with trending scores
- Average and max scores
- API endpoint health

## Troubleshooting

### No Trending Data Showing

1. Check if data has trending scores:
   ```bash
   curl http://localhost:3000/api/trending/test
   ```

2. Initialize the system:
   ```bash
   curl -X POST http://localhost:3000/api/admin/trending-init \
     -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
   ```

3. Verify cron job is running

### Scores Not Updating

1. Check cron job logs
2. Manually trigger update:
   ```bash
   curl -X POST http://localhost:3000/api/cron/trending-update \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

### Performance Issues

1. Add database indexes on `trendingScore` columns
2. Limit the number of items processed in each update
3. Consider caching trending results