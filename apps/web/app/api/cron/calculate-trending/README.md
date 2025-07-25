# Calculate Trending Endpoint

This consolidated endpoint combines all trending calculations for the MySetlist application, replacing multiple separate endpoints with a single, efficient solution.

## Overview

The `/api/cron/calculate-trending` endpoint handles:
- Artist trending score calculations
- Show trending score calculations  
- Artist statistics updates
- Trending content identification
- Time-based score decay
- User activity logging

## Endpoints

### GET/POST `/api/cron/calculate-trending`

**Authentication**: Requires `CRON_SECRET` in Authorization header as Bearer token.

**Query Parameters**:
- `mode` (optional): `daily` (default) or `hourly`
  - `daily`: Full recalculation with all features
  - `hourly`: Incremental updates for recently active content
- `type` (optional): `all` (default), `artists`, or `shows`
  - Allows targeting specific entity types for focused updates

## Calculation Methodology

### Artist Trending Score Weights
- **Followers** (25%): Spotify follower count normalized
- **Popularity** (20%): Spotify popularity score  
- **Recent Shows** (25%): Shows in last 30 days
- **Follower Growth** (15%): Change in follower count
- **User Activity** (15%): Recent app interactions (follows, votes, views)

### Show Trending Score Weights  
- **View Count** (20%): Page views
- **Attendee Count** (25%): Marked attendance
- **Vote Count** (25%): Setlist votes
- **Setlist Count** (15%): Number of setlists
- **Recency** (10%): Time-based decay factor
- **Social Activity** (5%): Shares, comments, interactions

### Venue Trending Score Weights
- **Show Count** (40%): Total shows hosted
- **Total Attendance** (30%): Cumulative attendee count
- **Average Rating** (30%): User review ratings

## Features

### 1. Dual Mode Operation

#### Daily Mode (`mode=daily`)
- Full recalculation of all entities
- Updates artist statistics (total_shows, upcoming_shows, total_setlists)
- Identifies top trending content
- Applies time-based decay to old scores
- Comprehensive logging

#### Hourly Mode (`mode=hourly`) 
- Incremental updates for recently active entities only
- Processes only artists/shows with activity in last hour
- Optimized for performance and resource usage
- Focused updates based on user interactions

### 2. Enhanced User Activity Integration
- Tracks user interactions: follows, votes, views, shares
- Weighted scoring based on interaction type:
  - Artist follows: 3x weight
  - Song votes: 2x weight  
  - Profile views: 1x weight
  - Other interactions: 0.5x weight

### 3. Time Decay Mechanisms
- **Score Decay**: 5% daily decay for scores older than 24 hours
- **Recency Factor**: Newer content gets trending boost
- **Configurable Periods**: Adjustable decay timeframes

### 4. Batch Processing
- Processes artists in batches of 50 to prevent memory issues
- Parallel processing within batches for performance
- Error handling per entity to prevent cascade failures

### 5. Statistics Synchronization
- Updates `artist_stats` table with current metrics
- Synchronizes main `artists` table with calculated stats
- Maintains data consistency across related tables

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Trending scores calculated successfully (daily mode)",
  "mode": "daily",
  "fullRecalc": true,
  "type": "all", 
  "timestamp": "2024-01-15T10:30:00.000Z",
  "results": {
    "artistStats": { "updated": 1 },
    "artists": { "updated": 150 },
    "shows": { "updated": 75 },
    "trending": {
      "trendingArtists": 50,
      "trendingShows": 25,
      "topArtist": "Taylor Swift",
      "topShow": "Taylor Swift - Eras Tour"
    },
    "timeDecay": { "applied": true }
  }
}
```

### Error Response
```json
{
  "error": "Trending calculation failed",
  "details": "Database connection timeout",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Usage Examples

### Daily Full Recalculation
```bash
curl -X GET "https://api.mysetlist.com/api/cron/calculate-trending?mode=daily" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Hourly Artist Updates Only  
```bash
curl -X GET "https://api.mysetlist.com/api/cron/calculate-trending?mode=hourly&type=artists" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Show Trending Updates
```bash
curl -X POST "https://api.mysetlist.com/api/cron/calculate-trending?type=shows" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Cron Schedule Recommendations

### Production Setup
```bash
# Daily full recalculation at 2 AM
0 2 * * * curl -X GET "https://api.mysetlist.com/api/cron/calculate-trending?mode=daily"

# Hourly incremental updates during active hours
0 8-23 * * * curl -X GET "https://api.mysetlist.com/api/cron/calculate-trending?mode=hourly"
```

### Development/Testing
```bash  
# Every 15 minutes for testing
*/15 * * * * curl -X GET "http://localhost:3000/api/cron/calculate-trending?mode=hourly"
```

## Database Tables Updated

- `artists`: trending_score, total_shows, upcoming_shows, total_setlists, updated_at
- `artist_stats`: total_shows, upcoming_shows, total_setlists, updated_at
- `shows`: trending_score, updated_at
- `venues`: trending_score, updated_at (future enhancement)
- `user_activity_log`: operation logging

## Performance Considerations

### Optimizations Implemented
- Batch processing to limit memory usage
- Incremental updates for hourly mode
- Parallel processing within batches
- Optimized database queries with proper indexes
- Error isolation per entity

### Resource Usage
- **Daily Mode**: ~5-10 minutes for 10K artists, 1K shows
- **Hourly Mode**: ~30-60 seconds for active entities
- **Memory**: ~100MB peak during batch processing
- **Database**: Read-heavy with targeted updates

## Error Handling

- Individual entity errors don't stop batch processing
- Comprehensive error logging with context
- Graceful degradation for missing data
- Transaction rollback for critical failures

## Future Enhancements

1. **Machine Learning Integration**: 
   - Predictive trending based on historical patterns
   - Anomaly detection for unusual activity spikes

2. **Real-time Updates**:
   - WebSocket integration for live score updates
   - Event-driven recalculation triggers

3. **Geographic Trending**:
   - Location-based trending calculations
   - Regional popularity factors

4. **Advanced Analytics**:
   - Trending velocity (rate of change)
   - Momentum indicators
   - Cross-platform correlation

## Related Endpoints

This endpoint replaces and consolidates:
- `/api/cron/trending-update` 
- `/api/admin/calculate-trending`
- `/api/sync/artist-stats`
- `/api/admin/update-artist-stats`
- `/api/cron/sync-popular-artists`

## Environment Variables

- `CRON_SECRET`: Required for endpoint authentication
- `DATABASE_URL`: Database connection string
- `NODE_ENV`: Environment designation

## Monitoring

The endpoint logs all operations to `user_activity_log` with:
- Operation type and parameters
- Execution results and metrics  
- Performance timing data
- Error details for debugging

Monitor these metrics:
- Execution time trends
- Success/failure rates
- Entity update counts
- Score distribution changes