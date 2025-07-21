import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '~/lib/api/supabase/server';
import { db } from '@repo/database';
import { artists, setlists, shows, setlistSongs, votes, users } from '@repo/database';
import { and, eq, gte, lte, lt, sql, isNull, ne, inArray } from 'drizzle-orm';
import { env } from '@repo/env';

interface ShowLifecycleResult {
  statusUpdates: {
    upcomingToOngoing: number;
    ongoingToCompleted: number;
    markedCancelled: number;
  };
  setlistOperations: {
    lockedSetlists: number;
    calculatedVotes: number;
  };
  notifications: {
    usersNotified: number;
    messagesQueued: number;
  };
  cleanup: {
    orphanedShows: number;
    staleData: number;
  };
  artistUpdates: {
    showCountsUpdated: number;
  };
}

/**
 * Update show statuses based on current time
 */
async function updateShowStatuses(): Promise<ShowLifecycleResult['statusUpdates']> {
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0]!;
  const currentTime = now.toTimeString().split(' ')[0]!.substring(0, 5); // HH:MM format
  
  // Buffer times for status transitions
  const showStartBuffer = 15; // minutes before show start to mark as ongoing
  const showEndBuffer = 4 * 60; // 4 hours after start time to mark as completed
  
  // 1. Mark shows as ongoing (when show date arrives + start time - buffer)
  const upcomingToOngoingQuery = db
    .update(shows)
    .set({
      status: 'ongoing',
      updatedAt: now,
    })
    .where(
      and(
        eq(shows.status, 'upcoming'),
        lte(shows.date, currentDate),
        // If start time exists, check if we're within buffer
        sql`(
          ${shows.startTime} IS NULL OR 
          EXTRACT(EPOCH FROM (
            (${shows.date} || ' ' || ${shows.startTime})::timestamp - ${now}
          )) / 60 <= ${showStartBuffer}
        )`
      )
    )
    .returning({ id: shows.id, name: shows.name });

  const upcomingToOngoing = await upcomingToOngoingQuery;

  // 2. Mark shows as completed (show date + estimated end time has passed)
  const ongoingToCompletedQuery = db
    .update(shows)
    .set({
      status: 'completed',
      updatedAt: now,
    })
    .where(
      and(
        eq(shows.status, 'ongoing'),
        // Show is completed if it started more than 4 hours ago
        sql`EXTRACT(EPOCH FROM (
          ${now} - (${shows.date} || ' ' || COALESCE(${shows.startTime}, '20:00'))::timestamp
        )) / 60 > ${showEndBuffer}`
      )
    )
    .returning({ id: shows.id, name: shows.name });

  const ongoingToCompleted = await ongoingToCompletedQuery;

  // 3. Mark very old upcoming shows as cancelled (shows from more than 7 days ago that weren't updated)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const markedCancelledQuery = db
    .update(shows)
    .set({
      status: 'cancelled',
      updatedAt: now,
    })
    .where(
      and(
        eq(shows.status, 'upcoming'),
        lte(shows.date, sevenDaysAgo.toISOString().split('T')[0]!)
      )
    )
    .returning({ id: shows.id, name: shows.name });

  const markedCancelled = await markedCancelledQuery;

  return {
    upcomingToOngoing: upcomingToOngoing.length,
    ongoingToCompleted: ongoingToCompleted.length,
    markedCancelled: markedCancelled.length,
  };
}

/**
 * Process setlist operations for shows that changed status
 */
async function processSetlistOperations(): Promise<ShowLifecycleResult['setlistOperations']> {
  const now = new Date();
  
  // 1. Lock setlists for ongoing shows
  const lockedSetlistsResult = await db
    .update(setlists)
    .set({
      isLocked: true,
      updatedAt: now,
    })
    .where(
      and(
        eq(setlists.isLocked, false),
        eq(setlists.type, 'predicted'),
        // Only lock setlists for shows that are now ongoing or completed
        sql`EXISTS (
          SELECT 1 FROM ${shows} 
          WHERE ${shows.id} = ${setlists.showId} 
          AND ${shows.status} IN ('ongoing', 'completed')
        )`
      )
    )
    .returning({ id: setlists.id, showId: setlists.showId });

  // 2. Calculate final vote tallies for completed shows
  const completedShowSetlists = await db
    .select({ id: setlists.id, showId: setlists.showId })
    .from(setlists)
    .innerJoin(shows, eq(shows.id, setlists.showId))
    .where(
      and(
        eq(shows.status, 'completed'),
        eq(setlists.type, 'predicted')
      )
    );

  let calculatedVotes = 0;
  for (const setlist of completedShowSetlists) {
    // Update vote counts for all songs in this setlist
    await db.execute(sql`
      UPDATE ${setlistSongs}
      SET 
        upvotes = COALESCE((
          SELECT COUNT(*) 
          FROM ${votes} 
          WHERE ${votes.setlistSongId} = ${setlistSongs.id} 
          AND ${votes.voteType} = 'up'
        ), 0),
        downvotes = COALESCE((
          SELECT COUNT(*) 
          FROM ${votes} 
          WHERE ${votes.setlistSongId} = ${setlistSongs.id} 
          AND ${votes.voteType} = 'down'
        ), 0),
        net_votes = COALESCE((
          SELECT COUNT(CASE WHEN ${votes.voteType} = 'up' THEN 1 END) - 
                 COUNT(CASE WHEN ${votes.voteType} = 'down' THEN 1 END)
          FROM ${votes} 
          WHERE ${votes.setlistSongId} = ${setlistSongs.id}
        ), 0),
        updated_at = ${now}
      WHERE setlist_id = ${setlist.id}
    `);
    calculatedVotes++;
  }

  return {
    lockedSetlists: lockedSetlistsResult.length,
    calculatedVotes,
  };
}

/**
 * Update artist show counts and statistics
 */
async function updateArtistStats(): Promise<ShowLifecycleResult['artistUpdates']> {
  const now = new Date();
  
  // Update artist show counts for artists with recent show changes
  const result = await db.execute(sql`
    UPDATE ${artists}
    SET 
      show_count = (
        SELECT COUNT(DISTINCT s.id)
        FROM ${shows} s
        WHERE s.headliner_artist_id = ${artists.id}
        AND s.status IN ('completed', 'ongoing', 'upcoming')
      ),
      upcoming_show_count = (
        SELECT COUNT(DISTINCT s.id)
        FROM ${shows} s
        WHERE s.headliner_artist_id = ${artists.id}
        AND s.status = 'upcoming'
        AND s.date >= CURRENT_DATE
      ),
      updated_at = ${now}
    WHERE EXISTS (
      SELECT 1 FROM ${shows} s
      WHERE s.headliner_artist_id = ${artists.id}
      AND s.updated_at >= ${new Date(now.getTime() - 60 * 60 * 1000)} -- Updated in last hour
    )
  `);

  return {
    showCountsUpdated: result.rowCount || 0,
  };
}

/**
 * Send notifications to users about show status changes
 */
async function processNotifications(): Promise<ShowLifecycleResult['notifications']> {
  // For now, this is a placeholder - would integrate with email/push notification system
  // Could query for users who have favorited/are following artists with status changes
  
  // Example implementation:
  // 1. Find users following artists with shows that just went live
  // 2. Queue email notifications for show completions
  // 3. Send push notifications for shows starting soon
  
  return {
    usersNotified: 0, // Placeholder
    messagesQueued: 0, // Placeholder
  };
}

/**
 * Clean up orphaned and stale data
 */
async function cleanupOrphanedData(): Promise<ShowLifecycleResult['cleanup']> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // 1. Clean up setlists for shows that no longer exist
  const orphanedSetlists = await db
    .delete(setlists)
    .where(
      sql`NOT EXISTS (
        SELECT 1 FROM ${shows} 
        WHERE ${shows.id} = ${setlists.showId}
      )`
    )
    .returning({ id: setlists.id });

  // 2. Clean up very old cancelled shows (optional - keep for analytics)
  const staleShows = await db
    .delete(shows)
    .where(
      and(
        eq(shows.status, 'cancelled'),
        lte(shows.updatedAt, thirtyDaysAgo)
      )
    )
    .returning({ id: shows.id });

  return {
    orphanedShows: orphanedSetlists.length,
    staleData: staleShows.length,
  };
}

/**
 * Log operations for monitoring and debugging
 */
async function logOperations(results: ShowLifecycleResult, duration: number): Promise<void> {
  const logEntry = {
    timestamp: new Date().toISOString(),
    duration_ms: duration,
    results,
  };

  console.log('[SHOW_LIFECYCLE]', JSON.stringify(logEntry, null, 2));

  // Could also save to database logs table or external monitoring service
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Verify this is a legitimate cron request
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Execute all lifecycle operations in sequence for data consistency
    const statusUpdates = await updateShowStatuses();
    const setlistOperations = await processSetlistOperations();
    const artistUpdates = await updateArtistStats();
    const notifications = await processNotifications();
    const cleanup = await cleanupOrphanedData();

    const results: ShowLifecycleResult = {
      statusUpdates,
      setlistOperations,
      notifications,
      cleanup,
      artistUpdates,
    };

    const duration = Date.now() - startTime;
    await logOperations(results, duration);

    // Determine if any critical operations had issues
    const hasErrors = false; // Could add error detection logic
    const totalOperations = 
      statusUpdates.upcomingToOngoing +
      statusUpdates.ongoingToCompleted +
      statusUpdates.markedCancelled +
      setlistOperations.lockedSetlists +
      setlistOperations.calculatedVotes +
      artistUpdates.showCountsUpdated +
      cleanup.orphanedShows +
      cleanup.staleData;

    return NextResponse.json({
      success: !hasErrors,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      summary: {
        total_operations: totalOperations,
        shows_transitioned: statusUpdates.upcomingToOngoing + statusUpdates.ongoingToCompleted,
        setlists_locked: setlistOperations.lockedSetlists,
        data_cleaned: cleanup.orphanedShows + cleanup.staleData,
      },
      details: results,
      next_run: 'Hourly via cron',
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('[SHOW_LIFECYCLE_ERROR]', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: duration,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Show lifecycle processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration_ms: duration,
      },
      { status: 500 }
    );
  }
}

// Support POST requests for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}