# Data Maintenance Cron Job

This endpoint provides comprehensive database cleanup and maintenance operations for the MySetlist application. It consolidates multiple data maintenance tasks into a single, efficient endpoint that can be run daily to keep the database healthy and performant.

## Overview

The data maintenance job performs the following categories of operations:

1. **User Data Cleanup** - Removes stale user accounts and activity logs
2. **Email System Cleanup** - Manages email logs and queue cleanup
3. **Content Cleanup** - Removes orphaned records and fixes relationships
4. **Data Integrity** - Fixes vote counts and updates statistics
5. **Performance Optimization** - Vacuums tables and rebuilds indexes
6. **Analytics Cleanup** - Manages analytics and monitoring data

## Endpoint Details

### Authentication
- Requires `Authorization: Bearer ${CRON_SECRET}` header
- Protected endpoint for cron jobs only

### GET `/api/cron/data-maintenance`
Runs the complete data maintenance suite.

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-01-21T10:00:00.000Z",
  "duration_ms": 45000,
  "summary": {
    "total_records_processed": 1250,
    "tables_optimized": 8,
    "data_integrity_fixed": 45,
    "space_reclaimed": "8 tables vacuumed"
  },
  "details": {
    "userCleanup": {
      "unverifiedUsersRemoved": 12,
      "staleSessionsRemoved": 150,
      "oldActivityLogsRemoved": 300
    },
    "emailCleanup": {
      "oldEmailLogsRemoved": 250,
      "staleQueueItemsRemoved": 75,
      "failedEmailsRetried": 5
    },
    "contentCleanup": {
      "orphanedSetlistsRemoved": 8,
      "orphanedVotesRemoved": 45,
      "duplicateSongsRemoved": 12,
      "cancelledShowsArchived": 3
    },
    "dataIntegrity": {
      "voteCountsFixed": 120,
      "artistStatsUpdated": 25,
      "brokenReferencesFixed": 8
    },
    "performanceOptimization": {
      "tablesVacuumed": 8,
      "indexesRebuilt": 8,
      "statisticsUpdated": true
    },
    "analytics": {
      "oldSearchLogsRemoved": 500,
      "oldEventDataRemoved": 750,
      "staleBackupsRemoved": 10
    }
  },
  "next_run": "Daily at 2:00 AM UTC",
  "retention_policies": {
    "unverified_users": "30 days",
    "email_logs": "90 days",
    "user_activity": "90 days",
    "search_logs": "90 days",
    "event_data": "90 days (processed)",
    "backup_records": "30 days (completed)",
    "cancelled_shows": "30 days (then archived)"
  }
}
```

### POST `/api/cron/data-maintenance`
Runs specific maintenance operations.

**Request Body:**
```json
{
  "operation": "users_only",
  "retention_days": 30
}
```

**Available Operations:**
- `users_only` - Only user data cleanup
- `email_only` - Only email system cleanup
- `content_only` - Only content cleanup
- `integrity_only` - Only data integrity fixes
- `performance_only` - Only database optimization
- `full` - Complete maintenance (same as GET)

## Data Retention Policies

### User Data
- **Unverified Users**: Removed after 30 days
- **User Sessions**: Stale sessions removed after 7 days
- **Activity Logs**: Removed after 90 days

### Email System
- **Email Logs**: Removed after 90 days
- **Queue Items**: Processed items removed after 7 days
- **Failed Emails**: Retried if less than 1 day old and under max attempts

### Content Data
- **Orphaned Records**: Removed immediately when detected
- **Duplicate Songs**: Consolidated, keeping most complete record
- **Cancelled Shows**: Archived (not deleted) after 30 days

### Analytics Data
- **Search Logs**: Removed after 90 days
- **Event Data**: Processed events removed after 90 days
- **Backup Records**: Successful backups removed after 30 days

## Operations Performed

### 1. User Cleanup
```sql
-- Remove unverified users (30+ days old)
DELETE FROM users 
WHERE email_verified IS NULL 
AND created_at <= NOW() - INTERVAL '30 days';

-- Clean up stale sessions
DELETE FROM user_sessions 
WHERE session_end IS NULL 
AND session_start <= NOW() - INTERVAL '7 days';
```

### 2. Email Cleanup
```sql
-- Remove old email logs
DELETE FROM email_logs 
WHERE created_at <= NOW() - INTERVAL '90 days';

-- Clean up processed queue items
DELETE FROM email_queue 
WHERE created_at <= NOW() - INTERVAL '7 days' 
AND sent_at IS NOT NULL;
```

### 3. Content Cleanup
```sql
-- Remove orphaned votes
DELETE FROM votes 
WHERE setlist_song_id NOT IN (SELECT id FROM setlist_songs);

-- Fix duplicate songs
WITH duplicate_songs AS (
  SELECT spotify_id, COUNT(*) as count
  FROM songs 
  WHERE spotify_id IS NOT NULL
  GROUP BY spotify_id 
  HAVING COUNT(*) > 1
)
DELETE FROM songs WHERE ... -- Keep most complete record
```

### 4. Data Integrity
```sql
-- Fix vote counts
UPDATE setlist_songs ss
SET upvotes = (SELECT COUNT(*) FROM votes WHERE setlist_song_id = ss.id AND vote_type = 'up'),
    downvotes = (SELECT COUNT(*) FROM votes WHERE setlist_song_id = ss.id AND vote_type = 'down'),
    net_votes = upvotes - downvotes;

-- Update artist statistics
UPDATE artists SET 
  total_shows = (SELECT COUNT(*) FROM shows WHERE headliner_artist_id = artists.id),
  upcoming_shows = (SELECT COUNT(*) FROM shows WHERE headliner_artist_id = artists.id AND status = 'upcoming');
```

### 5. Performance Optimization
```sql
-- Vacuum and analyze tables
VACUUM ANALYZE users;
VACUUM ANALYZE artists;
VACUUM ANALYZE shows;
-- ... etc for all main tables

-- Reindex tables
REINDEX TABLE users;
REINDEX TABLE artists;
-- ... etc
```

## Scheduling

### Recommended Schedule
- **Daily**: Complete maintenance at 2:00 AM UTC (low traffic time)
- **Weekly**: Performance optimization only
- **Monthly**: Full integrity check and cleanup

### Vercel Cron Configuration
```javascript
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/data-maintenance",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Supabase Edge Functions
```sql
-- Schedule in Supabase
SELECT cron.schedule('data-maintenance', '0 2 * * *', 'https://your-domain.com/api/cron/data-maintenance');
```

## Monitoring and Alerting

### Success Metrics
- Operations completed successfully
- Processing time under 60 seconds
- No critical errors in logs

### Alert Conditions
- Maintenance job fails 2 times in a row
- Processing time exceeds 5 minutes
- Large number of records processed (potential data corruption)

### Logging
All operations are logged with:
- Timestamp and duration
- Detailed results by category
- Total records processed
- Any errors or warnings

### Example Log Entry
```json
{
  "timestamp": "2025-01-21T02:00:00.000Z",
  "operation": "data-maintenance",
  "duration_ms": 45000,
  "results": { /* detailed results */ },
  "total_operations": 1250
}
```

## Error Handling

### Graceful Degradation
- Individual operation failures don't stop the entire job
- Warnings logged for non-critical issues
- Critical failures return 500 status with details

### Recovery
- Failed operations can be retried via POST endpoint
- Specific operation targeting for problem isolation
- Manual intervention support through admin interface

## Performance Considerations

### Execution Time
- Typical run: 30-60 seconds
- Large datasets: up to 5 minutes
- Timeout protection: 10 minutes

### Database Impact
- Operations run during low-traffic hours
- Vacuum operations may lock tables briefly
- Indexing operations are online where possible

### Resource Usage
- Memory usage scales with dataset size
- CPU intensive during vacuum/reindex operations
- Network usage minimal (database operations only)

## Testing

### Local Testing
```bash
# Test complete maintenance
curl -X GET "http://localhost:3000/api/cron/data-maintenance" \
  -H "Authorization: Bearer your-cron-secret"

# Test specific operation
curl -X POST "http://localhost:3000/api/cron/data-maintenance" \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json" \
  -d '{"operation": "users_only"}'
```

### Production Testing
- Test in staging environment first
- Monitor logs during first production runs
- Gradually increase operation scope

## Security

### Access Control
- Bearer token authentication required
- Cron secret stored securely in environment variables
- No user data exposed in responses

### Data Privacy
- User data cleanup respects privacy requirements
- Soft deletes where audit trails needed
- Anonymization of removed user data

## Maintenance

### Regular Review
- Monthly review of retention policies
- Quarterly performance analysis
- Annual security audit

### Updates
- Monitor database schema changes
- Update cleanup operations for new tables
- Adjust retention periods based on storage costs

## Troubleshooting

### Common Issues
1. **Timeout errors**: Reduce operation scope or increase timeout
2. **Lock conflicts**: Reschedule to avoid peak traffic
3. **Memory issues**: Process in smaller batches

### Debugging
1. Check logs for specific error messages
2. Run individual operations to isolate issues
3. Monitor database performance during operations
4. Use manual POST triggers for testing

### Support
- Contact: engineering team
- Escalation: database administrator
- Emergency: pause cron job, manual investigation