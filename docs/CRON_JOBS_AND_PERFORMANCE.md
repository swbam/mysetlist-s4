# TheSet - Background Sync System & Performance

## Overview

TheSet uses a modern **ArtistImportOrchestrator** system combined with intelligent background sync jobs. The system provides instant user experience with real-time progress tracking via Server-Sent Events (SSE).

## Import System Architecture

### Real-time Artist Import
- **Phase 1 (< 3 seconds)**: Instant artist page creation
- **Phase 2 (Background)**: Show and venue import via SSE progress
- **Phase 3 (Background)**: Complete song catalog sync with live updates
- **SSE Progress Tracking**: Real-time updates sent to connected clients

### Background Maintenance Jobs
1. **Active Artists Sync (Every 6 hours)** - Artists with recent activity
2. **Trending Artists Sync (Daily at 2 AM)** - Top 100 artists deep refresh
3. **Complete System Sync (Weekly)** - Full maintenance and cleanup

## Cron Job Endpoints

### 1. Update Active Artists (`/api/cron/update-active-artists`)

**Schedule**: Every 6 hours via Supabase Edge Functions
**Purpose**: Maintains fresh data for artists with recent user activity

**Enhanced Features**:
- Intelligent activity detection (votes, follows, page views)
- Spotify popularity and new release monitoring
- Parallel processing with smart batching (5 artists per batch)
- Circuit breaker pattern for API resilience
- Multi-layer caching with Redis + memory fallback
- Real-time progress updates via SSE when user-initiated

**Usage**:
```bash
curl -X POST "https://your-domain.com/api/cron/update-active-artists" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"limit": 50, "forceSync": false}'
```

### 2. Trending Artist Sync (`/api/cron/trending-artist-sync`)

**Schedule**: Daily at 2 AM via Supabase Edge Functions
**Purpose**: Deep catalog maintenance for top trending artists

**Production Features**:
- Complete discography refresh with intelligent filtering
- Live track detection and deduplication
- Album art optimization and caching
- Smart retry logic with exponential backoff
- Progress tracking in database for monitoring
- Automatic cleanup of stale data

**Usage**:
```bash
curl -X POST "https://your-domain.com/api/cron/trending-artist-sync" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"limit": 100, "skipRecentlyUpdated": true}'
```

### 3. Complete Catalog Sync (`/api/cron/complete-catalog-sync`)

**Schedule**: Weekly  
**Purpose**: Full system maintenance and data integrity checks

**Features**:
- Multi-phase execution (Artist Sync → Show Sync → Data Cleanup → Integrity Checks)
- Duplicate record removal
- Orphaned data cleanup
- Data integrity validation
- Conservative rate limiting (5-second delays)

**Usage**:
```bash
curl -X POST "https://your-domain.com/api/cron/complete-catalog-sync" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "maxArtists": 500,
    "includeDataCleanup": true,
    "performIntegrityChecks": true
  }'
```

## Modern Performance System

### 1. Real-time Import with SSE

**Server-Sent Events Integration**:
```typescript
// GET /api/artists/import/progress/[jobId]
export async function GET(request: Request) {
  return new Response(
    new ReadableStream({
      start(controller) {
        const subscription = supabase
          .channel(`import_progress_${jobId}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public', 
            table: 'import_status'
          }, (payload) => {
            const data = `data: ${JSON.stringify(payload.new)}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          })
          .subscribe();
      }
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    }
  );
}
```

### 2. Enhanced Cache Manager

**Production-grade caching strategy**:
- **Redis Primary**: Pattern-based invalidation with clustering support
- **Memory Fallback**: LRU cache with intelligent TTL management  
- **Edge Caching**: Vercel Edge Network integration
- **Smart Prefetching**: Predictive cache warming for popular content

**Cache TTL Configuration**:
- Artist Pages: 1 hour
- Show Data: 6 hours  
- Song Catalog: 24 hours
- Setlists: 1 hour
- Trending Data: 30 minutes

**Usage**:
```typescript
import { cacheManager } from '@/lib/services/cache-manager';

// Cache artist data
await cacheManager.cacheArtist(artistId, artistData);

// Get cached artist
const artist = await cacheManager.getCachedArtist(artistId);

// Cache with custom TTL
await cacheManager.set('custom-key', data, { ttl: 3600 });
```

### 2. Parallel Processing (`/lib/optimizations/performance-config.ts`)

**Batch processing with controlled concurrency**:
```typescript
import { ParallelProcessor } from '@/lib/optimizations/performance-config';

// Process items in batches
const results = await ParallelProcessor.processInBatches(
  items,
  async (item) => await processItem(item),
  5, // batch size
  1000 // delay between batches
);

// Process with retry logic
const result = await ParallelProcessor.processWithRetry(
  () => apiCall(),
  3, // max retries
  1000 // backoff delay
);
```

### 3. Database Optimizations (`/packages/database/migrations/0003_performance_optimizations.sql`)

**New Indexes Added**:
- `idx_artists_activity_lookup`: For active artists queries
- `idx_artists_trending_score`: For trending calculations
- `idx_shows_artist_date`: For recent show lookups
- `idx_votes_recent_activity`: For vote trending analysis
- `idx_songs_duplicate_detection`: For cleanup operations

**Materialized Views**:
- `trending_artists_mv`: Pre-calculated trending scores
- `show_stats_mv`: Aggregated show voting statistics

**Performance Functions**:
- `refresh_trending_data()`: Efficiently updates all trending data
- `cleanup_old_data()`: Removes old votes and logs in batches
- `analyze_query_performance()`: Query performance monitoring

## Monitoring and Alerting

### Cron Job Monitor (`/lib/monitoring/cron-monitor.ts`)

**Features**:
- Real-time health monitoring
- Performance metrics tracking
- Automatic alerting on failures
- Dead man's switch for missed executions

**Health Check API** (`/api/monitoring/cron-health`):
```bash
# Get system health
curl -X GET "https://your-domain.com/api/monitoring/cron-health" \
  -H "Authorization: Bearer ${ADMIN_API_KEY}"

# Get specific job metrics
curl -X GET "https://your-domain.com/api/monitoring/cron-health?jobName=update-active-artists&includeMetrics=true" \
  -H "Authorization: Bearer ${ADMIN_API_KEY}"

# Get full monitoring report
curl -X GET "https://your-domain.com/api/monitoring/cron-health?includeReport=true" \
  -H "Authorization: Bearer ${ADMIN_API_KEY}"
```

### Alert Rules

**Default Alert Conditions**:
- Error rate > 10%
- Execution time > 5 minutes
- 3+ consecutive failures
- Missed execution (dead man's switch)

**Notification Channels**:
- Email alerts for critical failures
- Slack notifications for warnings
- PagerDuty for consecutive failures

## Deployment Setup

### 1. Environment Variables

Add to your environment:
```bash
# Required for cron authentication
CRON_SECRET=your-secure-cron-secret
ADMIN_API_KEY=your-admin-api-key

# Optional: Redis for enhanced caching
REDIS_URL=your-redis-url
REDIS_TOKEN=your-redis-token
```

### 2. Database Migration

Run the performance optimization migration:
```bash
cd packages/database
npm run db:migrate
```

### 3. Vercel Cron Configuration

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/update-active-artists",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/trending-artist-sync", 
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/complete-catalog-sync",
      "schedule": "0 3 * * 0"
    },
    {
      "path": "/api/cron/calculate-trending",
      "schedule": "0 * * * *"
    }
  ]
}
```

### 4. Manual Testing

Test individual cron jobs:
```bash
# Test active artists sync
npm run test:cron:active-artists

# Test trending sync
npm run test:cron:trending

# Test complete sync
npm run test:cron:complete

# Test monitoring
npm run test:monitoring
```

## Performance Monitoring

### Key Metrics Tracked

1. **Execution Time**: Average and max execution times per job
2. **Error Rate**: Percentage of failed executions
3. **Memory Usage**: Peak memory consumption during execution
4. **Cache Hit Rate**: Effectiveness of caching strategy
5. **API Rate Limits**: External API usage monitoring

### Performance Targets

- **Active Artists Sync**: < 2 minutes execution time
- **Trending Sync**: < 10 minutes execution time  
- **Complete Sync**: < 30 minutes execution time
- **Cache Hit Rate**: > 80% for repeated queries
- **Error Rate**: < 5% across all jobs

## Troubleshooting

### Common Issues

1. **Rate Limiting**: If external APIs are rate-limited, increase delays between batches
2. **Memory Issues**: Monitor heap usage and adjust batch sizes
3. **Database Timeouts**: Ensure indexes are properly created
4. **Cache Misses**: Verify Redis connection and fallback to memory cache

### Debug Commands

```bash
# Check cron job health
curl -X GET "/api/monitoring/cron-health" \
  -H "Authorization: Bearer ${ADMIN_API_KEY}"

# Trigger manual health check
curl -X POST "/api/monitoring/cron-health" \
  -H "Authorization: Bearer ${ADMIN_API_KEY}" \
  -d '{"action": "triggerHealthCheck"}'

# Get specific job metrics
curl -X POST "/api/monitoring/cron-health" \
  -H "Authorization: Bearer ${ADMIN_API_KEY}" \
  -d '{"action": "getMetrics", "jobName": "update-active-artists"}'
```

### Log Analysis

Monitor cron job execution:
```sql
-- Check recent cron executions
SELECT * FROM cron_logs 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Check error patterns
SELECT job_name, COUNT(*) as error_count
FROM cron_logs 
WHERE status = 'failed' 
AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY job_name;

-- Check performance metrics
SELECT job_name, AVG(execution_time_ms) as avg_time
FROM cron_metrics
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY job_name;
```

## Integration with Existing Code

### Using the Cache Manager

```typescript
// In your API routes
import { cacheManager, withCache } from '@/lib/services/cache-manager';

export const getTrendingArtists = withCache(
  async (period: string, limit: number) => {
    // Your existing trending logic
    return await fetchTrendingArtists(period, limit);
  },
  (period, limit) => `trending:${period}:${limit}`,
  { ttl: 1800 } // 30 minutes
);
```

### Adding Monitoring to New Jobs

```typescript
import { withMonitoring } from '@/lib/monitoring/cron-monitor';

// Wrap your cron job function
export const myNewCronJob = withMonitoring(
  'my-new-job',
  async (params) => {
    // Your cron job logic
    return await processSomething(params);
  }
);
```

## Maintenance

### Regular Tasks

1. **Weekly**: Review monitoring reports and error rates
2. **Monthly**: Analyze cache hit rates and optimize TTL values
3. **Quarterly**: Review and update alert thresholds
4. **As needed**: Adjust batch sizes based on API rate limits

### Scaling Considerations

- **High Load**: Increase batch processing delays
- **More Artists**: Adjust limits in cron jobs
- **Performance Issues**: Scale Redis cache or add more memory
- **API Limits**: Implement additional rate limiting

This system provides a robust foundation for maintaining data freshness while respecting API rate limits and system performance requirements.