/**
 * Trending System Monitor
 * Provides health checks and status information for the trending calculation system
 */

import { artists, db, shows, userActivityLog } from "@repo/database";
import { and, desc, gte, sql } from "drizzle-orm";

export interface TrendingSystemHealth {
  status: "healthy" | "degraded" | "error";
  timestamp: string;
  metrics: {
    totalArtists: number;
    artistsWithTrendingScores: number;
    totalShows: number;
    showsWithTrendingScores: number;
    lastCalculationTime?: string;
    recentActivityCount: number;
  };
  performance: {
    avgTrendingScore: number;
    topTrendingArtist?: string;
    topTrendingShow?: string;
    calculationFrequency: string;
  };
  issues: string[];
  recommendations: string[];
}

export async function checkTrendingSystemHealth(): Promise<TrendingSystemHealth> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let status: "healthy" | "degraded" | "error" = "healthy";

  try {
    // Get basic metrics
    const [
      totalArtistsResult,
      artistsWithScoresResult,
      totalShowsResult,
      showsWithScoresResult,
      recentActivityResult,
      lastCalculationResult,
      topTrendingArtistResult,
      topTrendingShowResult,
    ] = await Promise.all([
      // Total artists
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(artists),

      // Artists with trending scores
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(artists)
        .where(sql`${artists.trendingScore} > 0`),

      // Total shows
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(shows),

      // Shows with trending scores
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(shows)
        .where(sql`${shows.trendingScore} > 0`),

      // Recent activity (last 24 hours)
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(userActivityLog)
        .where(
          gte(
            userActivityLog.createdAt,
            new Date(Date.now() - 24 * 60 * 60 * 1000),
          ),
        ),

      // Last trending calculation
      db
        .select({
          createdAt: userActivityLog.createdAt,
          details: userActivityLog.details,
        })
        .from(userActivityLog)
        .where(sql`${userActivityLog.action} LIKE 'trending_%'`)
        .orderBy(desc(userActivityLog.createdAt))
        .limit(1),

      // Top trending artist
      db
        .select({
          name: artists.name,
          trendingScore: artists.trendingScore,
        })
        .from(artists)
        .where(sql`${artists.trendingScore} > 0`)
        .orderBy(desc(artists.trendingScore))
        .limit(1),

      // Top trending show
      db
        .select({
          name: shows.name,
          trendingScore: shows.trendingScore,
        })
        .from(shows)
        .where(sql`${shows.trendingScore} > 0`)
        .orderBy(desc(shows.trendingScore))
        .limit(1),
    ]);

    const metrics = {
      totalArtists: totalArtistsResult[0]?.count || 0,
      artistsWithTrendingScores: artistsWithScoresResult[0]?.count || 0,
      totalShows: totalShowsResult[0]?.count || 0,
      showsWithTrendingScores: showsWithScoresResult[0]?.count || 0,
      lastCalculationTime: lastCalculationResult[0]?.createdAt?.toISOString(),
      recentActivityCount: recentActivityResult[0]?.count || 0,
    };

    // Calculate average trending score
    const avgTrendingResult = await db.execute(sql`
      SELECT AVG(trending_score) as avg_score 
      FROM ${artists} 
      WHERE trending_score > 0
    `);

    const avgTrendingScore = Number(avgTrendingResult[0]?.["avg_score"] || 0);

    const performance = {
      avgTrendingScore,
      topTrendingArtist: topTrendingArtistResult[0]?.name,
      topTrendingShow: topTrendingShowResult[0]?.name,
      calculationFrequency: getCalculationFrequency(
        lastCalculationResult[0]?.createdAt,
      ),
    };

    // Health checks and issue detection

    // Check if trending scores are being calculated
    if (metrics.artistsWithTrendingScores === 0 && metrics.totalArtists > 0) {
      issues.push(
        "No artists have trending scores - trending calculation may not be running",
      );
      status = "error";
    }

    if (metrics.showsWithTrendingScores === 0 && metrics.totalShows > 0) {
      issues.push(
        "No shows have trending scores - trending calculation may not be running",
      );
      if (status !== "error") status = "degraded";
    }

    // Check last calculation time
    const lastCalc = lastCalculationResult[0]?.createdAt;
    if (!lastCalc || Date.now() - lastCalc.getTime() > 25 * 60 * 60 * 1000) {
      // > 25 hours
      issues.push("Trending calculation has not run in the last 25 hours");
      if (status !== "error") status = "degraded";
    }

    // Check trending score coverage
    const artistCoverage =
      metrics.totalArtists > 0
        ? (metrics.artistsWithTrendingScores / metrics.totalArtists) * 100
        : 0;

    if (artistCoverage < 50) {
      issues.push(
        `Low artist trending score coverage: ${artistCoverage.toFixed(1)}%`,
      );
      if (status !== "error") status = "degraded";
    }

    // Check for recent activity
    if (metrics.recentActivityCount === 0) {
      recommendations.push(
        "No user activity in last 24 hours - consider marketing initiatives",
      );
    }

    // Check average trending score health
    if (avgTrendingScore < 10) {
      recommendations.push(
        "Average trending score is low - consider adjusting calculation weights",
      );
    }

    // Performance recommendations
    if (metrics.totalArtists > 10000) {
      recommendations.push(
        "Large artist database detected - consider optimizing batch processing",
      );
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      metrics,
      performance,
      issues,
      recommendations,
    };
  } catch (error) {
    return {
      status: "error",
      timestamp: new Date().toISOString(),
      metrics: {
        totalArtists: 0,
        artistsWithTrendingScores: 0,
        totalShows: 0,
        showsWithTrendingScores: 0,
        recentActivityCount: 0,
      },
      performance: {
        avgTrendingScore: 0,
        calculationFrequency: "unknown",
      },
      issues: [
        `System error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
      recommendations: [
        "Check database connection and trending calculation service",
      ],
    };
  }
}

function getCalculationFrequency(lastCalc?: Date): string {
  if (!lastCalc) return "never";

  const hoursAgo = (Date.now() - lastCalc.getTime()) / (1000 * 60 * 60);

  if (hoursAgo < 2) return "recent (< 2 hours)";
  if (hoursAgo < 25) return "daily";
  if (hoursAgo < 25 * 7) return "weekly";
  return "stale (> 1 week)";
}

export async function getTrendingLeaderboards(limit = 10) {
  const [topArtists, topShows] = await Promise.all([
    db
      .select({
        id: artists.id,
        name: artists.name,
        slug: artists.slug,
        trendingScore: artists.trendingScore,
        followers: artists.followers,
        upcomingShows: artists.upcomingShows,
      })
      .from(artists)
      .where(sql`${artists.trendingScore} > 0`)
      .orderBy(desc(artists.trendingScore))
      .limit(limit),

    db
      .select({
        id: shows.id,
        name: shows.name,
        slug: shows.slug,
        trendingScore: shows.trendingScore,
        date: shows.date,
        voteCount: shows.voteCount,
      })
      .from(shows)
      .where(
        sql`${shows.trendingScore} > 0 AND ${shows.status} IN ('upcoming', 'ongoing')`,
      )
      .orderBy(desc(shows.trendingScore))
      .limit(limit),
  ]);

  return {
    topTrendingArtists: topArtists,
    topTrendingShows: topShows,
  };
}

export async function getTrendingAnalytics(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Get trending calculation history
  const calculationHistory = await db
    .select({
      createdAt: userActivityLog.createdAt,
      action: userActivityLog.action,
      details: userActivityLog.details,
    })
    .from(userActivityLog)
    .where(
      and(
        sql`${userActivityLog.action} LIKE 'trending_%'`,
        gte(userActivityLog.createdAt, since),
      ),
    )
    .orderBy(desc(userActivityLog.createdAt));

  // Get score distribution
  const scoreDistribution = await db.execute(sql`
    SELECT 
      CASE 
        WHEN trending_score = 0 THEN 'none'
        WHEN trending_score < 10 THEN 'low'
        WHEN trending_score < 50 THEN 'medium'
        WHEN trending_score < 100 THEN 'high'
        ELSE 'very_high'
      END as score_range,
      COUNT(*) as count
    FROM ${artists}
    GROUP BY score_range
    ORDER BY 
      CASE score_range 
        WHEN 'none' THEN 0
        WHEN 'low' THEN 1
        WHEN 'medium' THEN 2 
        WHEN 'high' THEN 3
        WHEN 'very_high' THEN 4
      END
  `);

  return {
    calculationHistory,
    scoreDistribution: scoreDistribution.map((row) => ({
      range: row["score_range"],
      count: Number(row["count"] || 0),
    })),
  };
}

// CLI utility for monitoring
if (require.main === module) {
  checkTrendingSystemHealth()
    .then((health) => {
      console.log("🔍 Trending System Health Check\n");

      const statusEmoji =
        health.status === "healthy"
          ? "✅"
          : health.status === "degraded"
            ? "⚠️"
            : "❌";

      console.log(`${statusEmoji} Status: ${health.status.toUpperCase()}\n`);

      console.log("📊 Metrics:");
      console.log(`   Total Artists: ${health.metrics.totalArtists}`);
      console.log(
        `   Artists with Trending Scores: ${health.metrics.artistsWithTrendingScores}`,
      );
      console.log(`   Total Shows: ${health.metrics.totalShows}`);
      console.log(
        `   Shows with Trending Scores: ${health.metrics.showsWithTrendingScores}`,
      );
      console.log(
        `   Recent Activity (24h): ${health.metrics.recentActivityCount}`,
      );
      console.log(
        `   Last Calculation: ${health.metrics.lastCalculationTime || "Never"}\n`,
      );

      console.log("🏆 Performance:");
      console.log(
        `   Avg Trending Score: ${health.performance.avgTrendingScore.toFixed(2)}`,
      );
      console.log(
        `   Top Artist: ${health.performance.topTrendingArtist || "None"}`,
      );
      console.log(
        `   Top Show: ${health.performance.topTrendingShow || "None"}`,
      );
      console.log(
        `   Calculation Frequency: ${health.performance.calculationFrequency}\n`,
      );

      if (health.issues.length > 0) {
        console.log("🚨 Issues:");
        health.issues.forEach((issue) => console.log(`   • ${issue}`));
        console.log("");
      }

      if (health.recommendations.length > 0) {
        console.log("💡 Recommendations:");
        health.recommendations.forEach((rec) => console.log(`   • ${rec}`));
        console.log("");
      }

      if (health.status === "healthy") {
        console.log("🎉 Trending system is healthy!");
      }
    })
    .catch((error) => {
      console.error("💥 Health check failed:", error);
      process.exit(1);
    });
}
