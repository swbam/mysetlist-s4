import { db } from '@repo/database';
import { setlists, shows } from '@repo/database';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

const CRON_SECRET = process.env['CRON_SECRET'];

// Update trending scores based on recent activity
async function updateTrendingScores() {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Update artist trending scores based on:
    // - Recent show views
    // - Vote activity
    // - Follower growth
    // - Upcoming shows
    await db.execute(sql`
      WITH artist_activity AS (
        SELECT 
          a.id,
          -- Recent show views (weight: 30%)
          COALESCE(SUM(CASE 
            WHEN s.created_at >= ${sevenDaysAgo} THEN s.view_count * 0.3
            WHEN s.created_at >= ${thirtyDaysAgo} THEN s.view_count * 0.1
            ELSE 0
          END), 0) as view_score,
          -- Vote activity (weight: 40%)
          COALESCE(COUNT(DISTINCT CASE 
            WHEN v.created_at >= ${sevenDaysAgo} THEN v.id
          END) * 0.4, 0) as vote_score,
          -- Upcoming shows (weight: 20%)
          COALESCE(COUNT(DISTINCT CASE 
            WHEN s.date >= ${now} AND s.date <= ${now}::date + INTERVAL '30 days' THEN s.id
          END) * 0.2, 0) as upcoming_score,
          -- Follower growth (weight: 10%)
          CASE 
            WHEN a.follower_count > 0 THEN LOG(a.follower_count) * 0.1
            ELSE 0
          END as follower_score
        FROM artists a
        LEFT JOIN show_artists sa ON a.id = sa.artist_id
        LEFT JOIN shows s ON sa.show_id = s.id
        LEFT JOIN setlists sl ON s.id = sl.show_id
        LEFT JOIN votes v ON v.artist_id = a.id
        WHERE a.created_at >= ${thirtyDaysAgo}
        GROUP BY a.id, a.follower_count
      )
      UPDATE artists
      SET 
        trending_score = LEAST(
          (view_score + vote_score + upcoming_score + follower_score) * 10,
          100
        ),
        updated_at = CURRENT_TIMESTAMP
      FROM artist_activity
      WHERE artists.id = artist_activity.id
      AND (view_score + vote_score + upcoming_score + follower_score) > 0
    `);

    // Update show trending scores
    await db.execute(sql`
      WITH show_activity AS (
        SELECT 
          s.id,
          -- View count (weight: 30%)
          COALESCE(s.view_count * 0.3, 0) as view_score,
          -- Vote activity (weight: 30%)
          COALESCE(COUNT(DISTINCT v.id) * 0.3, 0) as vote_score,
          -- Attendee interest (weight: 25%)
          CASE 
            WHEN s.attendee_count > 0 THEN LOG(s.attendee_count + 1) * 0.25
            ELSE 0
          END as attendee_score,
          -- Time proximity (weight: 15%)
          CASE 
            WHEN s.date >= ${now} AND s.date <= ${now}::date + INTERVAL '7 days' THEN 0.15
            WHEN s.date >= ${now} AND s.date <= ${now}::date + INTERVAL '30 days' THEN 0.10
            ELSE 0
          END as proximity_score
        FROM shows s
        LEFT JOIN setlists sl ON s.id = sl.show_id
        LEFT JOIN votes v ON v.artist_id = a.id AND v.created_at >= ${sevenDaysAgo}
        WHERE s.status = 'upcoming'
        AND s.date >= ${now}
        GROUP BY s.id, s.view_count, s.attendee_count, s.date
      )
      UPDATE shows
      SET 
        trending_score = LEAST(
          (view_score + vote_score + attendee_score + proximity_score) * 10,
          100
        ),
        updated_at = CURRENT_TIMESTAMP
      FROM show_activity
      WHERE shows.id = show_activity.id
    `);

    return {
      success: true,
      message: 'Trending scores updated successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Clean up old data
async function cleanupOldData() {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Mark old shows as completed
    await db
      .update(shows)
      .set({
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(shows.status, 'upcoming'),
          lte(shows.date, ninetyDaysAgo.toISOString().split('T')[0]!)
        )
      );

    // Archive old votes (optional - keep for analytics)
    // Could move to a separate archive table if needed

    return {
      success: true,
      message: 'Cleanup completed successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Update show statuses
async function updateShowStatuses() {
  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Update past shows
    await db
      .update(shows)
      .set({
        status: 'completed',
        updatedAt: now,
      })
      .where(
        and(
          eq(shows.status, 'upcoming'),
          lte(shows.date, yesterday.toISOString().split('T')[0]!)
        )
      );

    // Lock setlists for shows that have started
    await db
      .update(setlists)
      .set({
        isLocked: true,
        updatedAt: now,
      })
      .where(
        and(
          eq(setlists.isLocked, false),
          gte(
            sql`(SELECT date FROM shows WHERE shows.id = setlists.show_id)`,
            yesterday
          )
        )
      );

    return {
      success: true,
      message: 'Show statuses updated successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Run all tasks in parallel
    const [trendingResult, cleanupResult, statusResult] =
      await Promise.allSettled([
        updateTrendingScores(),
        cleanupOldData(),
        updateShowStatuses(),
      ]);

    const results = {
      trending:
        trendingResult.status === 'fulfilled'
          ? trendingResult.value
          : { success: false, error: 'Failed to update trending scores' },
      cleanup:
        cleanupResult.status === 'fulfilled'
          ? cleanupResult.value
          : { success: false, error: 'Failed to cleanup old data' },
      showStatuses:
        statusResult.status === 'fulfilled'
          ? statusResult.value
          : { success: false, error: 'Failed to update show statuses' },
    };

    const allSuccessful = Object.values(results).every((r) => r.success);

    return NextResponse.json({
      success: allSuccessful,
      message: allSuccessful
        ? 'All hourly updates completed successfully'
        : 'Some updates failed',
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Hourly update failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
