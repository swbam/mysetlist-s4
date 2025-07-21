# Show Lifecycle Management Endpoint

This endpoint consolidates all show lifecycle operations into a single, comprehensive cron job that manages show status transitions, setlist operations, and related data maintenance.

## Overview

The show lifecycle endpoint (`/api/cron/show-lifecycle`) handles the complete lifecycle of shows from upcoming → ongoing → completed, including all associated data operations like setlist locking, vote tallying, and cleanup.

## Operations Performed

### 1. Show Status Updates
- **Upcoming → Ongoing**: Marks shows as ongoing when show date arrives (with 15-minute buffer before start time)
- **Ongoing → Completed**: Marks shows as completed 4 hours after start time
- **Cancelled**: Marks very old upcoming shows (7+ days past) as cancelled

### 2. Setlist Operations
- **Lock Setlists**: Locks predicted setlists for ongoing/completed shows to prevent further voting
- **Calculate Vote Tallies**: Updates final vote counts (upvotes, downvotes, net_votes) for completed shows
- **Vote Aggregation**: Denormalizes vote data for performance

### 3. Artist Statistics Updates
- **Show Counts**: Updates artist show counts based on recent show status changes
- **Upcoming Shows**: Maintains accurate upcoming show counts for each artist
- **Performance Metrics**: Updates artist statistics for trending calculations

### 4. Data Cleanup
- **Orphaned Setlists**: Removes setlists for non-existent shows
- **Stale Data**: Cleans up old cancelled shows (30+ days) for database hygiene
- **Consistency Checks**: Maintains referential integrity

### 5. Notifications (Placeholder)
- Ready for integration with email/push notification systems
- Can notify users of show status changes, artist updates, etc.

## Scheduling

- **Frequency**: Designed for hourly execution
- **Timing**: Can run at any time (operations are idempotent)
- **Manual**: Supports POST requests for manual triggering

## Security

- **Authentication**: Requires `CRON_SECRET` bearer token
- **Authorization**: Only accessible via cron jobs or manual admin triggers
- **Rate Limiting**: Protected by Vercel's built-in cron job limits

## Response Format

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:00:00.000Z",
  "duration_ms": 1250,
  "summary": {
    "total_operations": 15,
    "shows_transitioned": 5,
    "setlists_locked": 8,
    "data_cleaned": 2
  },
  "details": {
    "statusUpdates": {
      "upcomingToOngoing": 2,
      "ongoingToCompleted": 3,
      "markedCancelled": 1
    },
    "setlistOperations": {
      "lockedSetlists": 8,
      "calculatedVotes": 5
    },
    "notifications": {
      "usersNotified": 0,
      "messagesQueued": 0
    },
    "cleanup": {
      "orphanedShows": 1,
      "staleData": 1
    },
    "artistUpdates": {
      "showCountsUpdated": 12
    }
  }
}
```

## Database Impact

### Tables Modified
- `shows`: Status updates, analytics counters
- `setlists`: Locking status, vote tallies
- `setlist_songs`: Vote aggregations (upvotes, downvotes, net_votes)
- `artists`: Show counts, statistics

### Performance Considerations
- Uses indexed queries for efficient status transitions
- Batch operations where possible
- Minimal database locks (quick updates)
- Idempotent operations (safe to re-run)

## Monitoring & Logging

- **Console Logging**: Detailed operation results and timing
- **Error Tracking**: Full error context with stack traces
- **Metrics**: Duration tracking and operation counts
- **Alerting**: Returns HTTP errors for monitoring systems

## Error Handling

- **Database Errors**: Graceful handling with detailed error reporting
- **Timeout Protection**: Operations designed to complete quickly
- **Partial Failures**: Continues processing even if individual operations fail
- **Recovery**: All operations are idempotent and safe to retry

## Consolidation Benefits

This endpoint consolidates functionality from several previous cron jobs:
- `update-show-status`: Show status transitions
- `process-completed-shows`: Setlist locking and vote tallies
- `check-upcoming-shows`: Upcoming show validation
- `shows-sync`: Status-related synchronization
- `lock-setlists`: Setlist locking logic
- `close-polls`: Vote finalization

Benefits:
- **Consistency**: All related operations happen together
- **Performance**: Single database connection, optimized queries
- **Reliability**: Reduced race conditions between separate jobs
- **Maintainability**: Single endpoint to monitor and debug
- **Cost**: Fewer cron job invocations

## Configuration

Required environment variables:
- `CRON_SECRET`: Authentication token for cron requests
- Database connection variables (handled by database package)

## Usage Examples

### Vercel Cron Job
```json
{
  "crons": [
    {
      "path": "/api/cron/show-lifecycle",
      "schedule": "0 * * * *"
    }
  ]
}
```

### Manual Trigger (for testing)
```bash
curl -X POST "https://mysetlist.com/api/cron/show-lifecycle" \
  -H "Authorization: Bearer your-cron-secret"
```

### Health Check
```bash
curl -X GET "https://mysetlist.com/api/cron/show-lifecycle" \
  -H "Authorization: Bearer your-cron-secret"
```

## Future Enhancements

1. **Notification Integration**: Connect to email/push services
2. **Advanced Analytics**: More sophisticated show lifecycle metrics
3. **Configurable Timing**: Environment-based buffer times
4. **Batch Processing**: Handle high-volume show updates efficiently
5. **Audit Trail**: Detailed change history for show transitions