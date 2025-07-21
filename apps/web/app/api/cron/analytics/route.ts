import { db } from '@repo/database';
import { sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
// import { CacheService } from '~/lib/cache';
import { MonitoringService } from '~/lib/monitoring';

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env['CRON_SECRET'];

  if (!cronSecret) {
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    MonitoringService.startMeasurement('analytics-processing');

    // Generate daily analytics summary
    const analyticsData = await generateDailyAnalytics();

    // Clean up old analytics data
    await cleanupOldAnalytics();

    // Update trending data based on recent activity
    await updateTrendingData();

    // Generate performance metrics summary
    await generatePerformanceMetrics();

    const duration = MonitoringService.endMeasurement('analytics-processing');

    MonitoringService.trackMetric({
      name: 'cron.analytics.success',
      value: 1,
      tags: {
        duration: duration.toString(),
        records_processed: analyticsData.totalRecords.toString(),
      },
    });

    return NextResponse.json({
      success: true,
      duration,
      analyticsData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    MonitoringService.trackError(error as Error, {
      operation: 'analytics-processing',
      duration,
    });

    MonitoringService.trackMetric({
      name: 'cron.analytics.failure',
      value: 1,
      tags: {
        error: (error as Error).message,
        duration: duration.toString(),
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Generate daily analytics summary
 */
async function generateDailyAnalytics() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Example analytics queries - adjust based on your schema
    const [searchCount, userSignups, showsCreated, votesCount] =
      await Promise.all([
        // These would be actual database queries based on your schema
        db.execute(sql`
        SELECT COUNT(*) as count 
        FROM search_analytics 
        WHERE created_at >= ${yesterday.toISOString()} AND created_at < ${today.toISOString()}
      `),

        db.execute(sql`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE created_at >= ${yesterday.toISOString()} AND created_at < ${today.toISOString()}
      `),

        db.execute(sql`
        SELECT COUNT(*) as count 
        FROM shows 
        WHERE created_at >= ${yesterday.toISOString()} AND created_at < ${today.toISOString()}
      `),

        db.execute(sql`
        SELECT COUNT(*) as count 
        FROM votes 
        WHERE created_at >= ${yesterday.toISOString()} AND created_at < ${today.toISOString()}
      `),
      ]);

    const analyticsData = {
      date: yesterday.toISOString().split('T')[0],
      searches: Number(searchCount[0]?.['count']) || 0,
      newUsers: Number(userSignups[0]?.['count']) || 0,
      newShows: Number(showsCreated[0]?.['count']) || 0,
      votes: Number(votesCount[0]?.['count']) || 0,
      totalRecords: 0,
    };

    analyticsData.totalRecords =
      analyticsData.searches +
      analyticsData.newUsers +
      analyticsData.newShows +
      analyticsData.votes;

    // Cache the analytics data
    // TODO: Fix CacheService.set method
    // await CacheService.set(
    //   `analytics:daily:${analyticsData.date}`,
    //   analyticsData,
    //   { ttl: 86400 * 7 } // Cache for 7 days
    // );

    return analyticsData;
  } catch (error) {
    return {
      date: yesterday.toISOString().split('T')[0],
      searches: 0,
      newUsers: 0,
      newShows: 0,
      votes: 0,
      totalRecords: 0,
      error: (error as Error).message,
    };
  }
}

/**
 * Clean up old analytics data to prevent database bloat
 */
async function cleanupOldAnalytics(): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep 90 days of data

  try {
    // Clean up old search analytics
    await db.execute(sql`
      DELETE FROM search_analytics 
      WHERE created_at < ${cutoffDate.toISOString()}
    `);

    // Clean up old performance metrics if you store them
    await db.execute(sql`
      DELETE FROM performance_metrics 
      WHERE created_at < ${cutoffDate.toISOString()}
    `);
  } catch (_error) {}
}

/**
 * Update trending data based on recent activity
 */
async function updateTrendingData(): Promise<void> {
  try {
    // Calculate trending artists based on database activity
    const trendingArtistQuery = sql`
      UPDATE artists 
      SET trending_score = COALESCE(
        (
          -- Base score from popularity and followers
          (popularity * 0.4) + 
          (follower_count * 0.0001) +
          -- Boost recent shows
          (
            SELECT COUNT(*) * 5 
            FROM shows s 
            WHERE s.headliner_artist_id = artists.id 
            AND s.created_at >= NOW() - INTERVAL '7 days'
          ) +
          -- Boost recent setlists/votes
          (
            SELECT COALESCE(SUM(total_votes), 0) * 0.1
            FROM setlists sl 
            WHERE sl.artist_id = artists.id 
            AND sl.created_at >= NOW() - INTERVAL '7 days'
          )
        ), 
        0
      ),
      updated_at = NOW()
      WHERE 
        trending_score IS NULL OR 
        updated_at < NOW() - INTERVAL '1 hour'
    `;

    await db.execute(trendingArtistQuery);

    // Calculate trending shows based on votes and recent activity  
    const trendingShowQuery = sql`
      UPDATE shows 
      SET trending_score = COALESCE(
        (
          -- Base score from vote counts
          (vote_count * 2.0) +
          (attendee_count * 1.5) +
          -- Recency boost - newer shows get higher scores
          CASE 
            WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 10
            WHEN created_at >= NOW() - INTERVAL '7 days' THEN 5
            WHEN created_at >= NOW() - INTERVAL '30 days' THEN 2
            ELSE 0
          END +
          -- Future show boost
          CASE 
            WHEN date >= CURRENT_DATE AND date <= CURRENT_DATE + INTERVAL '30 days' THEN 8
            WHEN date >= CURRENT_DATE AND date <= CURRENT_DATE + INTERVAL '90 days' THEN 4
            ELSE 0
          END
        ), 
        0
      ),
      updated_at = NOW()
      WHERE 
        trending_score IS NULL OR 
        updated_at < NOW() - INTERVAL '1 hour'
    `;

    await db.execute(trendingShowQuery);

    // Apply decay to prevent stale trending items
    const decayQuery = sql`
      UPDATE artists 
      SET trending_score = trending_score * 0.98
      WHERE trending_score > 0 
      AND updated_at < NOW() - INTERVAL '24 hours'
    `;
    
    await db.execute(decayQuery);

    const showDecayQuery = sql`
      UPDATE shows 
      SET trending_score = trending_score * 0.95
      WHERE trending_score > 0 
      AND updated_at < NOW() - INTERVAL '12 hours'
    `;

    await db.execute(showDecayQuery);

  } catch (error) {
    console.error('Failed to update trending data:', error);
  }
}

/**
 * Generate performance metrics summary
 */
async function generatePerformanceMetrics(): Promise<void> {
  try {
    const metrics = MonitoringService.getMetrics();

    if (metrics.length === 0) {
      return;
    }

    // TODO: Aggregate metrics by type
    // const aggregatedMetrics = metrics.reduce(
    //   (acc, metric) => {
    //     const key = metric.name;
    //     if (!acc[key]) {
    //       acc[key] = {
    //         count: 0,
    //         total: 0,
    //         min: Number.POSITIVE_INFINITY,
    //         max: 0,
    //         avg: 0,
    //       };
    //     }

    //     acc[key].count++;
    //     acc[key].total += metric.value;
    //     acc[key].min = Math.min(acc[key].min, metric.value);
    //     acc[key].max = Math.max(acc[key].max, metric.value);
    //     acc[key].avg = acc[key].total / acc[key].count;

    //     return acc;
    //   },
    //   {} as Record<string, any>
    // );

    // Cache performance summary
    // TODO: Fix CacheService.set method
    // await CacheService.set(
    //   `performance:summary:${new Date().toISOString().split('T')[0]}`,
    //   _aggregatedMetrics,
    //   { ttl: 86400 } // Cache for 24 hours
    // );

    // Clear processed metrics
    MonitoringService.clearMetrics();
  } catch (_error) {}
}

export async function HEAD(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return new NextResponse(null, { status: 401 });
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
}
