import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { 
  users, 
  emailLogs, 
  emailQueue, 
  shows, 
  setlists, 
  setlistSongs, 
  votes, 
  songs, 
  artists, 
  venues,
  userActivityLog,
  searchAnalytics,
  events,
  userSessions,
  emailQueueEnhanced,
  transactionalEmails,
  dataBackups,
  platformStats
} from '@repo/database';
import { and, eq, lte, lt, sql, isNull, ne, inArray, gte } from 'drizzle-orm';
import { env } from '@repo/env';

interface DataMaintenanceResult {
  userCleanup: {
    unverifiedUsersRemoved: number;
    staleSessionsRemoved: number;
    oldActivityLogsRemoved: number;
  };
  emailCleanup: {
    oldEmailLogsRemoved: number;
    staleQueueItemsRemoved: number;
    failedEmailsRetried: number;
  };
  contentCleanup: {
    orphanedSetlistsRemoved: number;
    orphanedVotesRemoved: number;
    duplicateSongsRemoved: number;
    cancelledShowsArchived: number;
  };
  dataIntegrity: {
    voteCountsFixed: number;
    artistStatsUpdated: number;
    brokenReferencesFixed: number;
  };
  performanceOptimization: {
    tablesVacuumed: number;
    indexesRebuilt: number;
    statisticsUpdated: boolean;
  };
  analytics: {
    oldSearchLogsRemoved: number;
    oldEventDataRemoved: number;
    staleBackupsRemoved: number;
  };
}

/**
 * Clean up old/stale user data
 */
async function cleanupUserData(): Promise<DataMaintenanceResult['userCleanup']> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Remove unverified users after 30 days
  const unverifiedUsers = await db
    .delete(users)
    .where(
      and(
        isNull(users.emailVerified),
        lte(users.createdAt, thirtyDaysAgo)
      )
    )
    .returning({ id: users.id });

  // Remove old user activity logs (older than 90 days)
  const oldActivityLogs = await db
    .delete(userActivityLog)
    .where(lte(userActivityLog.createdAt, ninetyDaysAgo))
    .returning({ id: userActivityLog.id });

  // Clean up stale user sessions (older than 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const staleSessions = await db
    .delete(userSessions)
    .where(
      and(
        isNull(userSessions.sessionEnd),
        lte(userSessions.sessionStart, sevenDaysAgo)
      )
    )
    .returning({ id: userSessions.id });

  return {
    unverifiedUsersRemoved: unverifiedUsers.length,
    staleSessionsRemoved: staleSessions.length,
    oldActivityLogsRemoved: oldActivityLogs.length,
  };
}

/**
 * Clean up email system data
 */
async function cleanupEmailData(): Promise<DataMaintenanceResult['emailCleanup']> {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Clean up old email logs (older than 90 days)
  const oldEmailLogs = await db
    .delete(emailLogs)
    .where(lte(emailLogs.createdAt, ninetyDaysAgo))
    .returning({ id: emailLogs.id });

  // Clean up old sent/failed queue items (older than 7 days)
  const staleQueueItems = await db
    .delete(emailQueue)
    .where(
      and(
        lte(emailQueue.createdAt, sevenDaysAgo),
        ne(emailQueue.sentAt, null) // Only remove processed items
      )
    )
    .returning({ id: emailQueue.id });

  // Clean up old enhanced email queue items
  const staleEnhancedQueue = await db
    .delete(emailQueueEnhanced)
    .where(
      and(
        lte(emailQueueEnhanced.createdAt, sevenDaysAgo),
        inArray(emailQueueEnhanced.status, ['sent', 'delivered', 'failed'])
      )
    )
    .returning({ id: emailQueueEnhanced.id });

  // Retry failed emails that are less than 1 day old and haven't exceeded max attempts
  const failedEmailsRetried = await db
    .update(emailQueue)
    .set({
      attempts: sql`${emailQueue.attempts} + 1`,
      failedAt: null,
      updatedAt: now,
    })
    .where(
      and(
        ne(emailQueue.failedAt, null),
        gte(emailQueue.createdAt, oneDayAgo),
        sql`${emailQueue.attempts} < ${emailQueue.maxAttempts}`
      )
    )
    .returning({ id: emailQueue.id });

  return {
    oldEmailLogsRemoved: oldEmailLogs.length,
    staleQueueItemsRemoved: staleQueueItems.length + staleEnhancedQueue.length,
    failedEmailsRetried: failedEmailsRetried.length,
  };
}

/**
 * Clean up orphaned content and fix relationships
 */
async function cleanupContentData(): Promise<DataMaintenanceResult['contentCleanup']> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Remove orphaned votes (votes pointing to non-existent setlist songs)
  const orphanedVotes = await db
    .delete(votes)
    .where(
      sql`${votes.setlistSongId} NOT IN (SELECT id FROM ${setlistSongs})`
    )
    .returning({ id: votes.id });

  // Remove orphaned setlist songs (songs in non-existent setlists)
  const orphanedSetlistSongs = await db
    .delete(setlistSongs)
    .where(
      sql`${setlistSongs.setlistId} NOT IN (SELECT id FROM ${setlists})`
    )
    .returning({ id: setlistSongs.id });

  // Remove orphaned setlists (setlists for non-existent shows)
  const orphanedSetlists = await db
    .delete(setlists)
    .where(
      sql`${setlists.showId} NOT IN (SELECT id FROM ${shows})`
    )
    .returning({ id: setlists.id });

  // Archive very old cancelled shows (older than 30 days)
  const cancelledShows = await db
    .update(shows)
    .set({
      status: 'completed', // Archive instead of delete for analytics
      updatedAt: now,
    })
    .where(
      and(
        eq(shows.status, 'cancelled'),
        lte(shows.updatedAt, thirtyDaysAgo)
      )
    )
    .returning({ id: shows.id });

  // Remove duplicate songs by Spotify ID (keeping the one with most complete data)
  const duplicateSongsResult = await db.execute(sql`
    WITH duplicate_songs AS (
      SELECT 
        spotify_id,
        COUNT(*) as duplicate_count
      FROM ${songs}
      WHERE spotify_id IS NOT NULL
      GROUP BY spotify_id
      HAVING COUNT(*) > 1
    ),
    songs_to_keep AS (
      SELECT DISTINCT ON (s.spotify_id) s.id
      FROM ${songs} s
      INNER JOIN duplicate_songs ds ON s.spotify_id = ds.spotify_id
      ORDER BY s.spotify_id, 
               s.created_at ASC,
               (CASE WHEN s.album IS NOT NULL THEN 1 ELSE 0 END) DESC,
               (CASE WHEN s.album_art_url IS NOT NULL THEN 1 ELSE 0 END) DESC
    )
    DELETE FROM ${songs} 
    WHERE spotify_id IN (SELECT spotify_id FROM duplicate_songs)
    AND id NOT IN (SELECT id FROM songs_to_keep)
  `);

  return {
    orphanedSetlistsRemoved: orphanedSetlists.length,
    orphanedVotesRemoved: orphanedVotes.length + orphanedSetlistSongs.length,
    duplicateSongsRemoved: duplicateSongsResult.rowCount || 0,
    cancelledShowsArchived: cancelledShows.length,
  };
}

/**
 * Fix data integrity issues and update statistics
 */
async function fixDataIntegrity(): Promise<DataMaintenanceResult['dataIntegrity']> {
  const now = new Date();

  // Fix vote counts to match actual vote records
  const voteCountsFixed = await db.execute(sql`
    UPDATE ${setlistSongs} ss
    SET 
      upvotes = COALESCE((
        SELECT COUNT(*) 
        FROM ${votes} 
        WHERE ${votes.setlistSongId} = ss.id 
        AND ${votes.voteType} = 'up'
      ), 0),
      downvotes = COALESCE((
        SELECT COUNT(*) 
        FROM ${votes} 
        WHERE ${votes.setlistSongId} = ss.id 
        AND ${votes.voteType} = 'down'
      ), 0),
      net_votes = COALESCE((
        (SELECT COUNT(*) FROM ${votes} WHERE ${votes.setlistSongId} = ss.id AND ${votes.voteType} = 'up') -
        (SELECT COUNT(*) FROM ${votes} WHERE ${votes.setlistSongId} = ss.id AND ${votes.voteType} = 'down')
      ), 0),
      updated_at = ${now}
    WHERE EXISTS (
      SELECT 1 FROM ${votes} WHERE ${votes.setlistSongId} = ss.id
    ) OR (upvotes > 0 OR downvotes > 0)
  `);

  // Update artist statistics and show counts
  const artistStatsUpdated = await db.execute(sql`
    UPDATE ${artists} a
    SET 
      total_shows = (
        SELECT COUNT(DISTINCT s.id)
        FROM ${shows} s
        WHERE s.headliner_artist_id = a.id
        AND s.status IN ('completed', 'ongoing', 'upcoming')
      ),
      upcoming_shows = (
        SELECT COUNT(DISTINCT s.id)
        FROM ${shows} s
        WHERE s.headliner_artist_id = a.id
        AND s.status = 'upcoming'
        AND s.date >= CURRENT_DATE
      ),
      total_setlists = (
        SELECT COUNT(DISTINCT sl.id)
        FROM ${shows} s
        INNER JOIN ${setlists} sl ON sl.show_id = s.id
        WHERE s.headliner_artist_id = a.id
      ),
      updated_at = ${now}
    WHERE EXISTS (
      SELECT 1 FROM ${shows} s
      WHERE s.headliner_artist_id = a.id
      AND s.updated_at >= ${new Date(now.getTime() - 24 * 60 * 60 * 1000)}
    )
  `);

  // Update show statistics
  const showStatsUpdated = await db.execute(sql`
    UPDATE ${shows} s
    SET 
      setlist_count = COALESCE((
        SELECT COUNT(*) 
        FROM ${setlists} 
        WHERE show_id = s.id
      ), 0),
      vote_count = COALESCE((
        SELECT SUM(ss.upvotes + ss.downvotes)
        FROM ${setlists} sl
        INNER JOIN ${setlistSongs} ss ON ss.setlist_id = sl.id
        WHERE sl.show_id = s.id
      ), 0),
      updated_at = ${now}
    WHERE EXISTS (
      SELECT 1 FROM ${setlists} sl
      WHERE sl.show_id = s.id
      AND sl.updated_at >= ${new Date(now.getTime() - 24 * 60 * 60 * 1000)}
    )
  `);

  return {
    voteCountsFixed: voteCountsFixed.rowCount || 0,
    artistStatsUpdated: artistStatsUpdated.rowCount || 0,
    brokenReferencesFixed: showStatsUpdated.rowCount || 0,
  };
}

/**
 * Perform database performance optimizations
 */
async function optimizePerformance(): Promise<DataMaintenanceResult['performanceOptimization']> {
  // PostgreSQL VACUUM and ANALYZE operations
  const mainTables = [
    'users', 'artists', 'shows', 'venues', 'setlists', 'setlist_songs', 'votes', 'songs'
  ];

  let tablesVacuumed = 0;
  let indexesRebuilt = 0;

  for (const tableName of mainTables) {
    try {
      // VACUUM ANALYZE to reclaim space and update statistics
      await db.execute(sql.raw(`VACUUM ANALYZE ${tableName}`));
      tablesVacuumed++;

      // Reindex if needed (PostgreSQL handles this automatically, but we can force it)
      await db.execute(sql.raw(`REINDEX TABLE ${tableName}`));
      indexesRebuilt++;
    } catch (error) {
      console.warn(`Could not optimize table ${tableName}:`, error);
      // Continue with other tables
    }
  }

  // Update table statistics
  try {
    await db.execute(sql.raw(`ANALYZE`));
  } catch (error) {
    console.warn('Could not update database statistics:', error);
  }

  return {
    tablesVacuumed,
    indexesRebuilt,
    statisticsUpdated: true,
  };
}

/**
 * Clean up analytics and monitoring data
 */
async function cleanupAnalyticsData(): Promise<DataMaintenanceResult['analytics']> {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Remove old search analytics (older than 90 days)
  const oldSearchLogs = await db
    .delete(searchAnalytics)
    .where(lte(searchAnalytics.searchTimestamp, ninetyDaysAgo))
    .returning({ id: searchAnalytics.id });

  // Remove old event data (older than 90 days, keep aggregated data)
  const oldEventData = await db
    .delete(events)
    .where(
      and(
        lte(events.timestamp, ninetyDaysAgo),
        ne(events.processedAt, null) // Only remove processed events
      )
    )
    .returning({ id: events.id });

  // Clean up old backup records (older than 30 days, successful ones only)
  const staleBackups = await db
    .delete(dataBackups)
    .where(
      and(
        lte(dataBackups.startedAt, thirtyDaysAgo),
        eq(dataBackups.status, 'completed')
      )
    )
    .returning({ id: dataBackups.id });

  return {
    oldSearchLogsRemoved: oldSearchLogs.length,
    oldEventDataRemoved: oldEventData.length,
    staleBackupsRemoved: staleBackups.length,
  };
}

/**
 * Log maintenance operations for monitoring
 */
async function logMaintenanceOperations(results: DataMaintenanceResult, duration: number): Promise<void> {
  const logEntry = {
    timestamp: new Date().toISOString(),
    operation: 'data-maintenance',
    duration_ms: duration,
    results,
    total_operations: Object.values(results).reduce((total, category) => {
      return total + Object.values(category).reduce((sum, val) => {
        return sum + (typeof val === 'number' ? val : 0);
      }, 0);
    }, 0),
  };

  console.log('[DATA_MAINTENANCE]', JSON.stringify(logEntry, null, 2));

  // Store in platform stats for historical tracking
  try {
    const today = new Date().toISOString().split('T')[0];
    await db.execute(sql`
      INSERT INTO ${platformStats} (
        stat_date, 
        api_calls,
        created_at,
        updated_at
      ) VALUES (
        ${today}::date,
        1,
        NOW(),
        NOW()
      )
      ON CONFLICT (stat_date) 
      DO UPDATE SET
        api_calls = ${platformStats.apiCalls} + 1,
        updated_at = NOW()
    `);
  } catch (error) {
    console.warn('Could not update platform stats:', error);
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Verify this is a legitimate cron request
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[DATA_MAINTENANCE] Starting comprehensive data maintenance...');

    // Execute all maintenance operations in sequence
    const userCleanup = await cleanupUserData();
    console.log('[DATA_MAINTENANCE] User cleanup completed');

    const emailCleanup = await cleanupEmailData();
    console.log('[DATA_MAINTENANCE] Email cleanup completed');

    const contentCleanup = await cleanupContentData();
    console.log('[DATA_MAINTENANCE] Content cleanup completed');

    const dataIntegrity = await fixDataIntegrity();
    console.log('[DATA_MAINTENANCE] Data integrity fixes completed');

    const performanceOptimization = await optimizePerformance();
    console.log('[DATA_MAINTENANCE] Performance optimization completed');

    const analytics = await cleanupAnalyticsData();
    console.log('[DATA_MAINTENANCE] Analytics cleanup completed');

    const results: DataMaintenanceResult = {
      userCleanup,
      emailCleanup,
      contentCleanup,
      dataIntegrity,
      performanceOptimization,
      analytics,
    };

    const duration = Date.now() - startTime;
    await logMaintenanceOperations(results, duration);

    // Calculate totals for summary
    const totalRecordsProcessed = 
      userCleanup.unverifiedUsersRemoved +
      userCleanup.staleSessionsRemoved +
      emailCleanup.oldEmailLogsRemoved +
      emailCleanup.staleQueueItemsRemoved +
      contentCleanup.orphanedSetlistsRemoved +
      contentCleanup.orphanedVotesRemoved +
      contentCleanup.duplicateSongsRemoved +
      dataIntegrity.voteCountsFixed +
      dataIntegrity.artistStatsUpdated +
      analytics.oldSearchLogsRemoved +
      analytics.oldEventDataRemoved;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      summary: {
        total_records_processed: totalRecordsProcessed,
        tables_optimized: performanceOptimization.tablesVacuumed,
        data_integrity_fixed: dataIntegrity.voteCountsFixed + dataIntegrity.artistStatsUpdated,
        space_reclaimed: `${performanceOptimization.tablesVacuumed} tables vacuumed`,
      },
      details: results,
      next_run: 'Daily at 2:00 AM UTC',
      retention_policies: {
        unverified_users: '30 days',
        email_logs: '90 days',
        user_activity: '90 days',
        search_logs: '90 days',
        event_data: '90 days (processed)',
        backup_records: '30 days (completed)',
        cancelled_shows: '30 days (then archived)',
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('[DATA_MAINTENANCE_ERROR]', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: duration,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Data maintenance failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration_ms: duration,
      },
      { status: 500 }
    );
  }
}

// Support POST requests for manual triggers with specific operations
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { operation, retention_days } = await request.json();
    const startTime = Date.now();

    switch (operation) {
      case 'users_only': {
        const userCleanup = await cleanupUserData();
        return NextResponse.json({
          success: true,
          operation: 'users_only',
          results: { userCleanup },
          duration_ms: Date.now() - startTime,
        });
      }

      case 'email_only': {
        const emailCleanup = await cleanupEmailData();
        return NextResponse.json({
          success: true,
          operation: 'email_only',
          results: { emailCleanup },
          duration_ms: Date.now() - startTime,
        });
      }

      case 'content_only': {
        const contentCleanup = await cleanupContentData();
        return NextResponse.json({
          success: true,
          operation: 'content_only',
          results: { contentCleanup },
          duration_ms: Date.now() - startTime,
        });
      }

      case 'integrity_only': {
        const dataIntegrity = await fixDataIntegrity();
        return NextResponse.json({
          success: true,
          operation: 'integrity_only',
          results: { dataIntegrity },
          duration_ms: Date.now() - startTime,
        });
      }

      case 'performance_only': {
        const performanceOptimization = await optimizePerformance();
        return NextResponse.json({
          success: true,
          operation: 'performance_only',
          results: { performanceOptimization },
          duration_ms: Date.now() - startTime,
        });
      }

      case 'full': {
        // Run full maintenance (same as GET)
        return GET(request);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid operation. Use: users_only, email_only, content_only, integrity_only, performance_only, or full' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Manual operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}