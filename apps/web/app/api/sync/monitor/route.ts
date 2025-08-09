import { NextResponse } from "next/server";
import { db } from "@repo/database";
import { artists, shows, venues, userActivityLog } from "@repo/database";
import { sql, desc, gte, and, eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get("hours") || "24");
    const limit = parseInt(searchParams.get("limit") || "100");
    
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    // Get sync activity logs
    const syncActivities = await db
      .select({
        id: userActivityLog.id,
        action: userActivityLog.action,
        targetType: userActivityLog.targetType,
        targetId: userActivityLog.targetId,
        details: userActivityLog.details,
        createdAt: userActivityLog.createdAt,
      })
      .from(userActivityLog)
      .where(
        and(
          gte(userActivityLog.createdAt, startTime),
          sql`${userActivityLog.action} LIKE '%sync%' OR ${userActivityLog.action} LIKE 'trending_%'`
        )
      )
      .orderBy(desc(userActivityLog.createdAt))
      .limit(limit);
    
    // Get sync statistics
    const [artistStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        synced: sql<number>`count(case when last_synced_at is not null then 1 end)::int`,
        syncedRecently: sql<number>`count(case when last_synced_at > ${startTime} then 1 end)::int`,
        needsSync: sql<number>`count(case when last_synced_at is null or last_synced_at < current_timestamp - interval '1 day' then 1 end)::int`,
        withTrending: sql<number>`count(case when trending_score > 0 then 1 end)::int`,
      })
      .from(artists);
    
    const [showStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        upcoming: sql<number>`count(case when status = 'upcoming' then 1 end)::int`,
        completed: sql<number>`count(case when status = 'completed' then 1 end)::int`,
        withTrending: sql<number>`count(case when trending_score > 0 then 1 end)::int`,
        createdRecently: sql<number>`count(case when created_at > ${startTime} then 1 end)::int`,
      })
      .from(shows);
    
    const [venueStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        withShows: sql<number>`count(distinct case when exists (select 1 from ${shows} where ${shows.venueId} = ${venues.id}) then ${venues.id} end)::int`,
        createdRecently: sql<number>`count(case when created_at > ${startTime} then 1 end)::int`,
      })
      .from(venues);
    
    // Get trending artists
    const trendingArtists = await db
      .select({
        id: artists.id,
        name: artists.name,
        slug: artists.slug,
        trendingScore: artists.trendingScore,
        popularity: artists.popularity,
        followers: artists.followers,
        lastSyncedAt: artists.lastSyncedAt,
      })
      .from(artists)
      .where(sql`${artists.trendingScore} > 0`)
      .orderBy(desc(artists.trendingScore))
      .limit(10);
    
    // Get trending shows
    const trendingShows = await db
      .select({
        id: shows.id,
        name: shows.name,
        slug: shows.slug,
        trendingScore: shows.trendingScore,
        date: shows.date,
        status: shows.status,
      })
      .from(shows)
      .where(sql`${shows.trendingScore} > 0`)
      .orderBy(desc(shows.trendingScore))
      .limit(10);
    
    // Parse sync activities for summary
    const syncSummary = {
      masterSync: { runs: 0, success: 0, errors: 0, lastRun: null as Date | null },
      autonomousSync: { runs: 0, success: 0, errors: 0, lastRun: null as Date | null },
      trendingCalc: { runs: 0, success: 0, errors: 0, lastRun: null as Date | null },
      artistDiscovery: { found: 0, added: 0 },
      showsSync: { found: 0, added: 0 },
    };
    
    syncActivities.forEach(activity => {
      if (activity.action.includes("master-sync")) {
        syncSummary.masterSync.runs++;
        if (activity.action.includes("complete")) syncSummary.masterSync.success++;
        if (activity.action.includes("error")) syncSummary.masterSync.errors++;
        if (!syncSummary.masterSync.lastRun || activity.createdAt > syncSummary.masterSync.lastRun) {
          syncSummary.masterSync.lastRun = activity.createdAt;
        }
      }
      
      if (activity.action.includes("autonomous-sync")) {
        syncSummary.autonomousSync.runs++;
        if (activity.action.includes("complete")) syncSummary.autonomousSync.success++;
        if (activity.action.includes("error")) syncSummary.autonomousSync.errors++;
        if (!syncSummary.autonomousSync.lastRun || activity.createdAt > syncSummary.autonomousSync.lastRun) {
          syncSummary.autonomousSync.lastRun = activity.createdAt;
        }
        
        // Extract discovery stats from details
        if (activity.details && typeof activity.details === "object") {
          const details = activity.details as any;
          if (details.discovery) {
            syncSummary.artistDiscovery.found += details.discovery.ticketmaster?.found || 0;
            syncSummary.artistDiscovery.found += details.discovery.spotify?.found || 0;
            syncSummary.artistDiscovery.added += details.discovery.ticketmaster?.added || 0;
            syncSummary.artistDiscovery.added += details.discovery.spotify?.added || 0;
          }
          if (details.sync?.shows) {
            syncSummary.showsSync.found += details.sync.shows.processed || 0;
            syncSummary.showsSync.added += details.sync.shows.added || 0;
          }
        }
      }
      
      if (activity.action.includes("trending_")) {
        syncSummary.trendingCalc.runs++;
        if (activity.action.includes("calculate")) syncSummary.trendingCalc.success++;
        if (!syncSummary.trendingCalc.lastRun || activity.createdAt > syncSummary.trendingCalc.lastRun) {
          syncSummary.trendingCalc.lastRun = activity.createdAt;
        }
      }
    });
    
    // Calculate health score
    const healthScore = {
      overall: 0,
      syncCoverage: 0,
      syncFreshness: 0,
      trendingCoverage: 0,
      errorRate: 0,
    };
    
    // Sync coverage (percentage of artists synced)
    healthScore.syncCoverage = artistStats.total > 0 
      ? Math.round((artistStats.synced / artistStats.total) * 100)
      : 0;
    
    // Sync freshness (percentage synced recently)
    healthScore.syncFreshness = artistStats.synced > 0
      ? Math.round((artistStats.syncedRecently / artistStats.synced) * 100)
      : 0;
    
    // Trending coverage (percentage with trending scores)
    healthScore.trendingCoverage = artistStats.total > 0
      ? Math.round((artistStats.withTrending / artistStats.total) * 100)
      : 0;
    
    // Error rate (inverse percentage)
    const totalRuns = syncSummary.masterSync.runs + syncSummary.autonomousSync.runs;
    const totalErrors = syncSummary.masterSync.errors + syncSummary.autonomousSync.errors;
    healthScore.errorRate = totalRuns > 0
      ? 100 - Math.round((totalErrors / totalRuns) * 100)
      : 100;
    
    // Overall health (average of all metrics)
    healthScore.overall = Math.round(
      (healthScore.syncCoverage + healthScore.syncFreshness + healthScore.trendingCoverage + healthScore.errorRate) / 4
    );
    
    return NextResponse.json({
      success: true,
      timeRange: {
        hours,
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
      },
      healthScore,
      statistics: {
        artists: artistStats,
        shows: showStats,
        venues: venueStats,
      },
      syncSummary,
      trending: {
        artists: trendingArtists,
        shows: trendingShows,
      },
      recentActivity: syncActivities.slice(0, 20).map(activity => ({
        ...activity,
        timeAgo: getTimeAgo(activity.createdAt),
      })),
    });
  } catch (error) {
    console.error("Sync monitor error:", error);
    return NextResponse.json(
      { error: "Failed to get sync status", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}