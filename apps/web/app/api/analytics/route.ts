import { db } from "@repo/database";
import { sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { withCache } from "~/lib/cache/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AnalyticsQuery {
  metric: "overview" | "trending" | "engagement" | "growth" | "performance";
  period?: "day" | "week" | "month" | "year" | "all";
  startDate?: string;
  endDate?: string;
  groupBy?: "day" | "week" | "month";
  filters?: {
    artistIds?: string[];
    venueIds?: string[];
    showStatus?: string[];
  };
}

// Cache analytics queries for 15 minutes
const getCachedAnalytics = withCache(
  async (query: AnalyticsQuery) => {
    return await getAnalyticsData(query);
  },
  (query) => `analytics:${JSON.stringify(query)}`,
  900, // 15 minutes
);

async function getAnalyticsData(query: AnalyticsQuery) {
  const {
    metric,
    period = "week",
    startDate,
    endDate,
    groupBy = "day",
    filters,
  } = query;

  // Calculate date range
  const dates = getDateRange(period, startDate, endDate);

  switch (metric) {
    case "overview":
      return getOverviewMetrics(dates, filters);
    case "trending":
      return getTrendingMetrics(dates, filters);
    case "engagement":
      return getEngagementMetrics(dates, groupBy, filters);
    case "growth":
      return getGrowthMetrics(dates, groupBy, filters);
    case "performance":
      return getPerformanceMetrics(dates, filters);
    default:
      throw new Error(`Unknown metric: ${metric}`);
  }
}

function getDateRange(period: string, startDate?: string, endDate?: string) {
  const end = endDate ? new Date(endDate) : new Date();
  let start: Date;

  if (startDate) {
    start = new Date(startDate);
  } else {
    start = new Date(end);
    switch (period) {
      case "day":
        start.setDate(start.getDate() - 1);
        break;
      case "week":
        start.setDate(start.getDate() - 7);
        break;
      case "month":
        start.setMonth(start.getMonth() - 1);
        break;
      case "year":
        start.setFullYear(start.getFullYear() - 1);
        break;
      case "all":
        start = new Date("2020-01-01");
        break;
    }
  }

  return { start, end };
}

async function getOverviewMetrics(dates: any, _filters?: any) {
  const query = sql`
    SELECT 
      -- User metrics
      (SELECT COUNT(DISTINCT id) FROM users WHERE created_at BETWEEN ${dates.start} AND ${dates.end}) as new_users,
      (SELECT COUNT(DISTINCT id) FROM users) as total_users,
      
      -- Show metrics
      (SELECT COUNT(*) FROM shows WHERE created_at BETWEEN ${dates.start} AND ${dates.end}) as new_shows,
      (SELECT COUNT(*) FROM shows WHERE status = 'upcoming') as upcoming_shows,
      (SELECT COUNT(*) FROM shows WHERE status = 'completed') as completed_shows,
      
      -- Artist metrics
      (SELECT COUNT(*) FROM artists WHERE created_at BETWEEN ${dates.start} AND ${dates.end}) as new_artists,
      (SELECT COUNT(*) FROM artists) as total_artists,
      
      -- Engagement metrics
      (SELECT COUNT(*) FROM setlist_votes WHERE created_at BETWEEN ${dates.start} AND ${dates.end}) as votes_cast,
      (SELECT COUNT(DISTINCT user_id) FROM setlist_votes WHERE created_at BETWEEN ${dates.start} AND ${dates.end}) as active_voters,
      (SELECT COUNT(*) FROM show_attendance WHERE created_at BETWEEN ${dates.start} AND ${dates.end}) as new_attendances,
      
      -- Venue metrics
      (SELECT COUNT(*) FROM venues) as total_venues,
      (SELECT COUNT(DISTINCT venue_id) FROM shows WHERE date BETWEEN ${dates.start} AND ${dates.end}) as active_venues
  `;

  const result = await db.execute(query);
  return (result as any).rows?.[0] || (result as any)[0] || result;
}

async function getTrendingMetrics(dates: any, _filters?: any) {
  const artistsQuery = sql`
    SELECT 
      a.id,
      a.name,
      a.slug,
      a.image_url,
      a.trending_score,
      COUNT(DISTINCT s.id) as show_count,
      SUM(s.vote_count) as total_votes,
      SUM(s.attendee_count) as total_attendees
    FROM artists a
    LEFT JOIN shows s ON s.headliner_artist_id = a.id
    WHERE s.date BETWEEN ${dates.start} AND ${dates.end}
    GROUP BY a.id
    ORDER BY a.trending_score DESC
    LIMIT 10
  `;

  const showsQuery = sql`
    SELECT 
      s.id,
      s.name,
      s.slug,
      s.date,
      s.trending_score,
      s.vote_count,
      s.attendee_count,
      a.name as artist_name,
      v.name as venue_name,
      v.city
    FROM shows s
    JOIN artists a ON s.headliner_artist_id = a.id
    JOIN venues v ON s.venue_id = v.id
    WHERE s.date BETWEEN ${dates.start} AND ${dates.end}
    ORDER BY s.trending_score DESC
    LIMIT 10
  `;

  const [artists, shows] = await Promise.all([
    db.execute(artistsQuery),
    db.execute(showsQuery),
  ]);

  return {
    topArtists: (artists as any).rows || (artists as any) || [],
    topShows: (shows as any).rows || (shows as any) || [],
  };
}

async function getEngagementMetrics(
  dates: any,
  groupBy: string,
  _filters?: any,
) {
  const timeFormat = getTimeGroupFormat(groupBy);

  const query = sql`
    WITH time_series AS (
      SELECT 
        ${sql.raw(timeFormat)} as period,
        COUNT(DISTINCT sv.user_id) as unique_voters,
        COUNT(sv.id) as total_votes,
        AVG(sv.vote_value) as avg_vote_value,
        COUNT(DISTINCT sa.user_id) as unique_attendees,
        COUNT(sa.id) as total_attendances
      FROM generate_series(
        ${dates.start}::timestamp,
        ${dates.end}::timestamp,
        '1 ${sql.raw(groupBy)}'::interval
      ) AS period
      LEFT JOIN setlist_votes sv ON ${sql.raw(timeFormat.replace("period", "sv.created_at"))} = ${sql.raw(timeFormat)}
      LEFT JOIN show_attendance sa ON ${sql.raw(timeFormat.replace("period", "sa.created_at"))} = ${sql.raw(timeFormat)}
      GROUP BY period
      ORDER BY period
    )
    SELECT * FROM time_series
  `;

  const result = await db.execute(query);
  const rows = (result as any).rows || (result as any) || [];

  return {
    engagement: rows,
    summary: {
      totalVotes: rows.reduce(
        (sum: number, row: any) => sum + (row.total_votes || 0),
        0,
      ),
      totalAttendances: rows.reduce(
        (sum: number, row: any) => sum + (row.total_attendances || 0),
        0,
      ),
      avgVoteValue:
        rows.reduce(
          (sum: number, row: any) => sum + (row.avg_vote_value || 0),
          0,
        ) / (rows.length || 1),
    },
  };
}

async function getGrowthMetrics(dates: any, groupBy: string, _filters?: any) {
  const timeFormat = getTimeGroupFormat(groupBy);

  const query = sql`
    WITH growth_metrics AS (
      SELECT 
        ${sql.raw(timeFormat)} as period,
        COUNT(DISTINCT CASE WHEN u.created_at::date = period::date THEN u.id END) as new_users,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE WHEN a.created_at::date = period::date THEN a.id END) as new_artists,
        COUNT(DISTINCT CASE WHEN s.created_at::date = period::date THEN s.id END) as new_shows,
        COUNT(DISTINCT CASE WHEN v.created_at::date = period::date THEN v.id END) as new_venues
      FROM generate_series(
        ${dates.start}::timestamp,
        ${dates.end}::timestamp,
        '1 ${sql.raw(groupBy)}'::interval
      ) AS period
      LEFT JOIN users u ON u.created_at <= period
      LEFT JOIN artists a ON a.created_at <= period
      LEFT JOIN shows s ON s.created_at <= period
      LEFT JOIN venues v ON v.created_at <= period
      GROUP BY period
      ORDER BY period
    )
    SELECT 
      period,
      new_users,
      total_users,
      new_artists,
      new_shows,
      new_venues,
      LAG(total_users, 1) OVER (ORDER BY period) as prev_total_users,
      CASE 
        WHEN LAG(total_users, 1) OVER (ORDER BY period) > 0 
        THEN ((total_users::float - LAG(total_users, 1) OVER (ORDER BY period)) / LAG(total_users, 1) OVER (ORDER BY period) * 100)
        ELSE 0 
      END as user_growth_rate
    FROM growth_metrics
  `;

  const result = await db.execute(query);
  const rows = (result as any).rows || (result as any) || [];

  return {
    growth: rows,
    summary: {
      totalNewUsers: rows.reduce(
        (sum: number, row: any) => sum + (row.new_users || 0),
        0,
      ),
      totalNewArtists: rows.reduce(
        (sum: number, row: any) => sum + (row.new_artists || 0),
        0,
      ),
      totalNewShows: rows.reduce(
        (sum: number, row: any) => sum + (row.new_shows || 0),
        0,
      ),
      avgGrowthRate:
        rows.reduce(
          (sum: number, row: any) => sum + (row.user_growth_rate || 0),
          0,
        ) / (rows.length || 1),
    },
  };
}

async function getPerformanceMetrics(dates: any, _filters?: any) {
  // API performance metrics
  const apiMetrics = sql`
    SELECT 
      COUNT(*) as total_requests,
      AVG(response_time) as avg_response_time,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time) as median_response_time,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) as p95_response_time,
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time) as p99_response_time,
      COUNT(CASE WHEN status_code >= 500 THEN 1 END) as error_count,
      COUNT(CASE WHEN status_code = 429 THEN 1 END) as rate_limited_count
    FROM api_logs
    WHERE created_at BETWEEN ${dates.start} AND ${dates.end}
  `;

  // Database performance metrics
  const dbMetrics = sql`
    SELECT 
      COUNT(*) as total_queries,
      AVG(duration) as avg_query_time,
      MAX(duration) as max_query_time,
      COUNT(CASE WHEN duration > 1000 THEN 1 END) as slow_queries
    FROM query_logs
    WHERE created_at BETWEEN ${dates.start} AND ${dates.end}
  `;

  const [apiResult, dbResult] = await Promise.all([
    db.execute(apiMetrics).catch(() => ({ rows: [{}] })), // Graceful fallback
    db.execute(dbMetrics).catch(() => ({ rows: [{}] })),
  ]);

  return {
    api: (apiResult as any).rows?.[0] || (apiResult as any)[0] || {},
    database: (dbResult as any).rows?.[0] || (dbResult as any)[0] || {},
    cache: {
      hitRate: 0.85, // Placeholder - would calculate from Redis metrics
      avgLatency: 2.5,
    },
  };
}

function getTimeGroupFormat(groupBy: string): string {
  switch (groupBy) {
    case "day":
      return "DATE_TRUNC('day', period)";
    case "week":
      return "DATE_TRUNC('week', period)";
    case "month":
      return "DATE_TRUNC('month', period)";
    default:
      return "DATE_TRUNC('day', period)";
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const query: AnalyticsQuery = {
      metric: (searchParams.get("metric") || "overview") as any,
      period: searchParams.get("period") as any,
      startDate:
        searchParams.get("startDate") ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]!,
      endDate:
        searchParams.get("endDate") || new Date().toISOString().split("T")[0]!,
      groupBy: searchParams.get("groupBy") as any,
    };

    // Parse filters
    const artistIds = searchParams.get("artistIds");
    const venueIds = searchParams.get("venueIds");
    const showStatus = searchParams.get("showStatus");

    if (artistIds || venueIds || showStatus) {
      query.filters = {
        ...(artistIds && { artistIds: artistIds.split(",") }),
        ...(venueIds && { venueIds: venueIds.split(",") }),
        ...(showStatus && { showStatus: showStatus.split(",") }),
      };
    }

    // Get analytics data with caching
    const data = await getCachedAnalytics(query);

    const response = NextResponse.json({
      success: true,
      query,
      data,
      timestamp: new Date().toISOString(),
    });

    // Set cache headers
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=900, stale-while-revalidate=1800", // 15 min cache, 30 min stale
    );

    return response;
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}
