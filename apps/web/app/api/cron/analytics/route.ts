import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { MonitoringService } from '@/lib/monitoring';
import { CacheService } from '@/lib/cache';

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return false;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  
  try {
    MonitoringService.startMeasurement('analytics-processing');
    
    console.log('📊 Starting analytics processing...');
    
    // Generate daily analytics summary
    const analyticsData = await generateDailyAnalytics();
    console.log('✅ Daily analytics generated');
    
    // Clean up old analytics data
    await cleanupOldAnalytics();
    console.log('✅ Old analytics cleaned up');
    
    // Update trending data based on recent activity
    await updateTrendingData();
    console.log('✅ Trending data updated');
    
    // Generate performance metrics summary
    await generatePerformanceMetrics();
    console.log('✅ Performance metrics generated');
    
    const duration = MonitoringService.endMeasurement('analytics-processing');
    
    MonitoringService.trackMetric({
      name: 'cron.analytics.success',
      value: 1,
      tags: {
        duration: duration.toString(),
        records_processed: analyticsData.totalRecords.toString(),
      },
    });
    
    console.log(`🚀 Analytics processing completed in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      duration,
      analyticsData,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('❌ Analytics processing failed:', error);
    
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
    const [
      searchCount,
      userSignups,
      showsCreated,
      votesCount,
    ] = await Promise.all([
      // These would be actual database queries based on your schema
      db.execute(`
        SELECT COUNT(*) as count 
        FROM search_analytics 
        WHERE created_at >= $1 AND created_at < $2
      `, [yesterday.toISOString(), today.toISOString()]),
      
      db.execute(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE created_at >= $1 AND created_at < $2
      `, [yesterday.toISOString(), today.toISOString()]),
      
      db.execute(`
        SELECT COUNT(*) as count 
        FROM shows 
        WHERE created_at >= $1 AND created_at < $2
      `, [yesterday.toISOString(), today.toISOString()]),
      
      db.execute(`
        SELECT COUNT(*) as count 
        FROM votes 
        WHERE created_at >= $1 AND created_at < $2
      `, [yesterday.toISOString(), today.toISOString()]),
    ]);
    
    const analyticsData = {
      date: yesterday.toISOString().split('T')[0],
      searches: searchCount.rows[0]?.count || 0,
      newUsers: userSignups.rows[0]?.count || 0,
      newShows: showsCreated.rows[0]?.count || 0,
      votes: votesCount.rows[0]?.count || 0,
      totalRecords: 0,
    };
    
    analyticsData.totalRecords = 
      analyticsData.searches + 
      analyticsData.newUsers + 
      analyticsData.newShows + 
      analyticsData.votes;
    
    // Cache the analytics data
    await CacheService.set(
      `analytics:daily:${analyticsData.date}`,
      analyticsData,
      { ttl: 86400 * 7 } // Cache for 7 days
    );
    
    return analyticsData;
  } catch (error) {
    console.warn('Analytics generation failed:', error);
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
    await db.execute(`
      DELETE FROM search_analytics 
      WHERE created_at < $1
    `, [cutoffDate.toISOString()]);
    
    // Clean up old performance metrics if you store them
    await db.execute(`
      DELETE FROM performance_metrics 
      WHERE created_at < $1
    `, [cutoffDate.toISOString()]);
    
    console.log(`🗑️ Cleaned up analytics data older than ${cutoffDate.toISOString()}`);
  } catch (error) {
    console.warn('Analytics cleanup failed:', error);
  }
}

/**
 * Update trending data based on recent activity
 */
async function updateTrendingData(): Promise<void> {
  try {
    // Calculate trending artists based on recent searches/views
    const trendingArtists = await db.execute(`
      SELECT artist_id, COUNT(*) as activity_count
      FROM (
        SELECT artist_id FROM search_analytics 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        UNION ALL
        SELECT artist_id FROM show_views 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      ) combined
      GROUP BY artist_id
      ORDER BY activity_count DESC
      LIMIT 50
    `);
    
    // Cache trending artists
    await CacheService.set(
      'trending:artists',
      trendingArtists.rows,
      { ttl: 3600 } // Cache for 1 hour
    );
    
    // Calculate trending shows
    const trendingShows = await db.execute(`
      SELECT show_id, COUNT(*) as activity_count
      FROM (
        SELECT show_id FROM show_views 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        UNION ALL
        SELECT show_id FROM votes 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      ) combined
      GROUP BY show_id
      ORDER BY activity_count DESC
      LIMIT 50
    `);
    
    // Cache trending shows
    await CacheService.set(
      'trending:shows',
      trendingShows.rows,
      { ttl: 3600 } // Cache for 1 hour
    );
    
    console.log('📈 Trending data updated');
  } catch (error) {
    console.warn('Trending data update failed:', error);
  }
}

/**
 * Generate performance metrics summary
 */
async function generatePerformanceMetrics(): Promise<void> {
  try {
    const metrics = MonitoringService.getMetrics();
    
    if (metrics.length === 0) {
      console.log('📊 No performance metrics to process');
      return;
    }
    
    // Aggregate metrics by type
    const aggregatedMetrics = metrics.reduce((acc, metric) => {
      const key = metric.name;
      if (!acc[key]) {
        acc[key] = {
          count: 0,
          total: 0,
          min: Infinity,
          max: 0,
          avg: 0,
        };
      }
      
      acc[key].count++;
      acc[key].total += metric.value;
      acc[key].min = Math.min(acc[key].min, metric.value);
      acc[key].max = Math.max(acc[key].max, metric.value);
      acc[key].avg = acc[key].total / acc[key].count;
      
      return acc;
    }, {} as Record<string, any>);
    
    // Cache performance summary
    await CacheService.set(
      `performance:summary:${new Date().toISOString().split('T')[0]}`,
      aggregatedMetrics,
      { ttl: 86400 } // Cache for 24 hours
    );
    
    // Clear processed metrics
    MonitoringService.clearMetrics();
    
    console.log('📊 Performance metrics summary generated');
  } catch (error) {
    console.warn('Performance metrics generation failed:', error);
  }
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