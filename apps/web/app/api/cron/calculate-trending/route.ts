import {
  artists,
  artistStats,
  db,
  shows,
  venues,
  userActivityLog,
  events,
  artistAnalytics,
  calculateArtistGrowth,
  calculateShowGrowth,
  calculateVenueGrowth,
  createHistoricalSnapshot,
} from "@repo/database";
import { sql, and, gte, eq, desc, asc } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

const CRON_SECRET = process.env["CRON_SECRET"];

// Enhanced trending score calculation weights
const WEIGHTS = {
  artist: {
    followers: 0.25,
    popularity: 0.2,
    recentShows: 0.25,
    followerGrowth: 0.15,
    userActivity: 0.15, // New: votes, follows, views
  },
  show: {
    viewCount: 0.2,
    attendeeCount: 0.25,
    voteCount: 0.25,
    setlistCount: 0.15,
    recency: 0.1,
    socialActivity: 0.05, // New: shares, comments
  },
  venue: {
    showCount: 0.4,
    totalAttendance: 0.3,
    averageRating: 0.3,
  },
};

// Time decay configuration
const TIME_DECAY_DAYS = 7;
const RECENT_ACTIVITY_DAYS = 30;

interface TrendingMode {
  mode: "daily" | "hourly";
  fullRecalc: boolean;
}

function calculateTimeDecay(date: Date, decayDays = TIME_DECAY_DAYS): number {
  const now = new Date();
  const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - daysDiff / decayDays);
}

async function getRecentUserActivity(artistId?: string, showId?: string) {
  const thirtyDaysAgo = new Date(
    Date.now() - RECENT_ACTIVITY_DAYS * 24 * 60 * 60 * 1000,
  );

  // Count recent user activities (follows, votes, views)
  const activityQuery = db
    .select({
      count: sql<number>`count(*)::int`,
      action: userActivityLog.action,
    })
    .from(userActivityLog)
    .where(
      and(
        gte(userActivityLog.createdAt, thirtyDaysAgo),
        artistId ? eq(userActivityLog.targetId, artistId) : sql`true`,
        showId ? eq(userActivityLog.targetId, showId) : sql`true`,
      ),
    )
    .groupBy(userActivityLog.action);

  const activities = await activityQuery;

  // Calculate weighted activity score
  let activityScore = 0;
  for (const activity of activities) {
    const weight =
      activity.action === "artist_follow"
        ? 3
        : activity.action === "song_vote"
          ? 2
          : activity.action === "artist_view"
            ? 1
            : 0.5;
    activityScore += (activity.count || 0) * weight;
  }

  return activityScore;
}

async function updateArtistStats() {
  // Update artist statistics (total_shows, upcoming_shows, total_setlists)
  const updateQuery = sql`
    INSERT INTO artist_stats (artist_id, total_shows, upcoming_shows, total_setlists, updated_at)
    SELECT 
      a.id,
      COALESCE(all_shows.count, 0) as total_shows,
      COALESCE(upcoming_shows.count, 0) as upcoming_shows,
      COALESCE(setlist_count.count, 0) as total_setlists,
      NOW() as updated_at
    FROM ${artists} a
    LEFT JOIN (
      SELECT headliner_artist_id, COUNT(*) as count
      FROM ${shows}
      GROUP BY headliner_artist_id
    ) all_shows ON all_shows.headliner_artist_id = a.id
    LEFT JOIN (
      SELECT headliner_artist_id, COUNT(*) as count
      FROM ${shows}
      WHERE status = 'upcoming' AND date >= CURRENT_DATE
      GROUP BY headliner_artist_id
    ) upcoming_shows ON upcoming_shows.headliner_artist_id = a.id
    LEFT JOIN (
      SELECT s.headliner_artist_id, COUNT(DISTINCT sl.id) as count
      FROM ${shows} s
      LEFT JOIN setlists sl ON sl.show_id = s.id
      GROUP BY s.headliner_artist_id
    ) setlist_count ON setlist_count.headliner_artist_id = a.id
    ON CONFLICT (artist_id) DO UPDATE SET
      total_shows = EXCLUDED.total_shows,
      upcoming_shows = EXCLUDED.upcoming_shows,
      total_setlists = EXCLUDED.total_setlists,
      updated_at = EXCLUDED.updated_at
  `;

  await db.execute(updateQuery);

  // Also update the main artists table
  await db.execute(sql`
    UPDATE ${artists} 
    SET 
      total_shows = stats.total_shows,
      upcoming_shows = stats.upcoming_shows,
      total_setlists = stats.total_setlists,
      updated_at = NOW()
    FROM artist_stats stats
    WHERE ${artists.id} = stats.artist_id
  `);
}

async function createHistoricalSnapshots() {
  // Store current values as previous values for next growth calculation cycle
  // This must be done BEFORE updating current values

  // Artists historical snapshot
  await db.execute(sql`
    UPDATE ${artists} 
    SET 
      previous_followers = followers,
      previous_popularity = popularity,
      previous_monthly_listeners = monthly_listeners,
      previous_follower_count = follower_count,
      last_growth_calculated = NOW()
    WHERE followers IS NOT NULL 
    OR popularity IS NOT NULL 
    OR monthly_listeners IS NOT NULL 
    OR follower_count IS NOT NULL
  `);

  // Shows historical snapshot
  await db.execute(sql`
    UPDATE ${shows} 
    SET 
      previous_view_count = view_count,
      previous_attendee_count = attendee_count,
      previous_vote_count = vote_count,
      previous_setlist_count = setlist_count,
      last_growth_calculated = NOW()
    WHERE view_count IS NOT NULL 
    OR attendee_count IS NOT NULL 
    OR vote_count IS NOT NULL 
    OR setlist_count IS NOT NULL
  `);

  // Venues historical snapshot (need to calculate current values first)
  await db.execute(sql`
    UPDATE ${venues} v
    SET 
      previous_total_shows = COALESCE(v.total_shows, 0),
      previous_upcoming_shows = COALESCE(v.upcoming_shows, 0),
      previous_total_attendance = COALESCE(v.total_attendance, 0),
      last_growth_calculated = NOW()
  `);
}

async function calculateArtistTrendingScores(mode: TrendingMode) {
  let artistsToProcess;

  if (mode.fullRecalc) {
    // Full recalculation - get all artists
    artistsToProcess = await db
      .select({
        id: artists.id,
        followers: artists.followers,
        popularity: artists.popularity,
        followerCount: artists.followerCount,
        monthlyListeners: artists.monthlyListeners,
        totalShows: artists.totalShows,
        upcomingShows: artists.upcomingShows,
        createdAt: artists.createdAt,
        // Historical data for real growth calculations
        previousFollowers: artists.previousFollowers,
        previousPopularity: artists.previousPopularity,
        previousFollowerCount: artists.previousFollowerCount,
        previousMonthlyListeners: artists.previousMonthlyListeners,
      })
      .from(artists);
  } else {
    // Incremental - only artists with recent activity
    const recentActivityArtists = await db
      .select({ artistId: userActivityLog.targetId })
      .from(userActivityLog)
      .where(
        and(
          gte(userActivityLog.createdAt, new Date(Date.now() - 60 * 60 * 1000)), // Last hour
          eq(userActivityLog.targetType, "artist"),
        ),
      )
      .groupBy(userActivityLog.targetId);

    if (recentActivityArtists.length === 0) {
      return { updated: 0, message: "No recent artist activity" };
    }

    artistsToProcess = await db
      .select({
        id: artists.id,
        followers: artists.followers,
        popularity: artists.popularity,
        followerCount: artists.followerCount,
        monthlyListeners: artists.monthlyListeners,
        totalShows: artists.totalShows,
        upcomingShows: artists.upcomingShows,
        createdAt: artists.createdAt,
        // Historical data for real growth calculations
        previousFollowers: artists.previousFollowers,
        previousPopularity: artists.previousPopularity,
        previousFollowerCount: artists.previousFollowerCount,
        previousMonthlyListeners: artists.previousMonthlyListeners,
      })
      .from(artists)
      .where(
        sql`${artists.id} IN (${sql.join(
          recentActivityArtists
            .map((a) => a.artistId)
            .filter((id): id is string => Boolean(id)),
          sql`, `,
        )})`,
      );
  }

  let updated = 0;

  // Process artists in batches to avoid memory issues
  const batchSize = 50;
  for (let i = 0; i < artistsToProcess.length; i += batchSize) {
    const batch = artistsToProcess.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (artist) => {
        try {
          // Get recent user activity for this artist
          const userActivityScore = await getRecentUserActivity(artist.id);

          // Get recent shows count (last 30 days)
          const recentShowsResult = await db
            .select({
              count: sql<number>`count(*)::int`,
            })
            .from(shows).where(sql`${shows.headlinerArtistId} = ${artist.id} 
            AND ${shows.date} >= CURRENT_DATE - INTERVAL '30 days'`);

          const recentShowCount = recentShowsResult[0]?.count || 0;

          // Calculate real growth using historical data
          const realGrowth = calculateArtistGrowth({
            followers: artist.followers || 0,
            previousFollowers: artist.previousFollowers,
            popularity: artist.popularity || 0,
            previousPopularity: artist.previousPopularity,
            monthlyListeners: artist.monthlyListeners,
            previousMonthlyListeners: artist.previousMonthlyListeners,
            followerCount: artist.followerCount || 0,
            previousFollowerCount: artist.previousFollowerCount,
          });

          // Use real overall growth percentage (not fake random numbers)
          const followerGrowth = realGrowth.overallGrowth;

          // Calculate comprehensive trending score
          const baseScore =
            ((artist.followers || 0) / 10000) * WEIGHTS.artist.followers +
            (artist.popularity || 0) * WEIGHTS.artist.popularity +
            recentShowCount * 10 * WEIGHTS.artist.recentShows +
            followerGrowth * WEIGHTS.artist.followerGrowth +
            (userActivityScore / 100) * WEIGHTS.artist.userActivity;

          // Apply time decay for older artists
          const timeFactor = calculateTimeDecay(new Date(artist.createdAt));
          const finalScore = baseScore * (0.7 + 0.3 * timeFactor);

          // Update artist with new trending score
          await db
            .update(artists)
            .set({
              trendingScore: finalScore,
              updatedAt: new Date(),
            })
            .where(eq(artists.id, artist.id));

          updated++;
        } catch (error) {
          console.error(
            `Error calculating score for artist ${artist.id}:`,
            error,
          );
        }
      }),
    );
  }

  return { updated };
}

async function calculateShowTrendingScores(mode: TrendingMode) {
  let showsToProcess;

  if (mode.fullRecalc) {
    // Get all upcoming/ongoing shows
    showsToProcess = await db
      .select({
        id: shows.id,
        viewCount: shows.viewCount,
        attendeeCount: shows.attendeeCount,
        voteCount: shows.voteCount,
        setlistCount: shows.setlistCount,
        date: shows.date,
        createdAt: shows.createdAt,
      })
      .from(shows)
      .where(sql`${shows.status} IN ('upcoming', 'ongoing')`);
  } else {
    // Incremental - shows with recent activity
    const recentActivityShows = await db
      .select({ showId: userActivityLog.targetId })
      .from(userActivityLog)
      .where(
        and(
          gte(userActivityLog.createdAt, new Date(Date.now() - 60 * 60 * 1000)),
          eq(userActivityLog.targetType, "show"),
        ),
      )
      .groupBy(userActivityLog.targetId);

    if (recentActivityShows.length === 0) {
      return { updated: 0, message: "No recent show activity" };
    }

    showsToProcess = await db
      .select({
        id: shows.id,
        viewCount: shows.viewCount,
        attendeeCount: shows.attendeeCount,
        voteCount: shows.voteCount,
        setlistCount: shows.setlistCount,
        date: shows.date,
        createdAt: shows.createdAt,
      })
      .from(shows)
      .where(
        sql`${shows.id} IN (${sql.join(
          recentActivityShows
            .map((s) => s.showId)
            .filter((id): id is string => Boolean(id)),
          sql`, `,
        )})`,
      );
  }

  let updated = 0;

  for (const show of showsToProcess) {
    try {
      const recencyFactor = calculateTimeDecay(new Date(show.createdAt));

      // Get recent social activity
      const socialActivity = await getRecentUserActivity(undefined, show.id);

      // Calculate trending score with enhanced metrics
      const score =
        (show.viewCount || 0) * WEIGHTS.show.viewCount +
        (show.attendeeCount || 0) * WEIGHTS.show.attendeeCount +
        (show.voteCount || 0) * WEIGHTS.show.voteCount +
        (show.setlistCount || 0) * 5 * WEIGHTS.show.setlistCount +
        recencyFactor * 100 * WEIGHTS.show.recency +
        (socialActivity / 10) * WEIGHTS.show.socialActivity;

      // Update show with new trending score
      await db
        .update(shows)
        .set({
          trendingScore: score,
          updatedAt: new Date(),
        })
        .where(eq(shows.id, show.id));

      updated++;
    } catch (error) {
      console.error(`Error calculating score for show ${show.id}:`, error);
    }
  }

  return { updated };
}

async function identifyTrendingContent() {
  // Get top trending artists
  const topTrendingArtists = await db
    .select({
      id: artists.id,
      name: artists.name,
      trendingScore: artists.trendingScore,
    })
    .from(artists)
    .where(sql`${artists.trendingScore} > 0`)
    .orderBy(desc(artists.trendingScore))
    .limit(50);

  // Get top trending shows
  const topTrendingShows = await db
    .select({
      id: shows.id,
      name: shows.name,
      trendingScore: shows.trendingScore,
    })
    .from(shows)
    .where(
      sql`${shows.trendingScore} > 0 AND ${shows.status} IN ('upcoming', 'ongoing')`,
    )
    .orderBy(desc(shows.trendingScore))
    .limit(50);

  return {
    trendingArtists: topTrendingArtists.length,
    trendingShows: topTrendingShows.length,
    topArtist: topTrendingArtists[0]?.name || "None",
    topShow: topTrendingShows[0]?.name || "None",
  };
}

async function applyTimeDecayToOldScores() {
  // Apply decay to trending scores older than 24 hours
  const decayFactor = 0.95; // 5% daily decay

  await db.execute(sql`
    UPDATE ${artists} 
    SET trending_score = trending_score * ${decayFactor},
        updated_at = NOW()
    WHERE updated_at < NOW() - INTERVAL '1 day'
    AND trending_score > 0
  `);

  await db.execute(sql`
    UPDATE ${shows} 
    SET trending_score = trending_score * ${decayFactor},
        updated_at = NOW()
    WHERE updated_at < NOW() - INTERVAL '1 day'
    AND trending_score > 0
    AND status IN ('upcoming', 'ongoing')
  `);
}

async function logTrendingOperation(
  operation: string,
  results: any,
  mode: TrendingMode,
) {
  try {
    await db.insert(userActivityLog).values({
      action: `trending_${operation}`,
      targetType: "system",
      details: {
        mode: mode.mode,
        fullRecalc: mode.fullRecalc,
        results,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to log trending operation:", error);
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const modeParam = searchParams.get("mode") || "daily"; // 'daily' or 'hourly'
    const typeParam = searchParams.get("type") || "all"; // 'all', 'artists', 'shows'

    const mode: TrendingMode = {
      mode: modeParam as "daily" | "hourly",
      fullRecalc: modeParam === "daily",
    };

    console.log(
      `Starting trending calculation - Mode: ${mode.mode}, Type: ${typeParam}, Full recalc: ${mode.fullRecalc}`,
    );

    const results = {
      artistStats: { updated: 0 },
      artists: { updated: 0 },
      shows: { updated: 0 },
      trending: null as any,
      timeDecay: null as any,
      historicalSnapshots: { created: false },
    };

    // 0. Create historical snapshots FIRST (for next cycle's growth calculations)
    if (mode.fullRecalc) {
      console.log("Creating historical snapshots for growth tracking...");
      try {
        await createHistoricalSnapshots();
        results.historicalSnapshots.created = true;
      } catch (error) {
        console.error("Failed to create historical snapshots:", error);
        // Continue with calculation even if snapshots fail
      }
    }

    // 1. Update artist statistics (always run for daily)
    if (mode.fullRecalc && (typeParam === "all" || typeParam === "artists")) {
      console.log("Updating artist statistics...");
      await updateArtistStats();
      results.artistStats.updated = 1;
    }

    // 2. Calculate artist trending scores
    if (typeParam === "all" || typeParam === "artists") {
      console.log("Calculating artist trending scores...");
      const artistResults = await calculateArtistTrendingScores(mode);
      results.artists = artistResults;
    }

    // 3. Calculate show trending scores
    if (typeParam === "all" || typeParam === "shows") {
      console.log("Calculating show trending scores...");
      const showResults = await calculateShowTrendingScores(mode);
      results.shows = showResults;
    }

    // 4. Identify trending content (daily only)
    if (mode.fullRecalc) {
      console.log("Identifying trending content...");
      const trendingContent = await identifyTrendingContent();
      results.trending = trendingContent;
    }

    // 5. Apply time-based decay to old scores (daily only)
    if (mode.fullRecalc) {
      console.log("Applying time decay to old scores...");
      await applyTimeDecayToOldScores();
      results.timeDecay = { applied: true };
    }

    // 6. Log operation
    await logTrendingOperation("calculate", results, mode);

    const responseData = {
      success: true,
      message: `Trending scores calculated successfully (${mode.mode} mode)`,
      mode: mode.mode,
      fullRecalc: mode.fullRecalc,
      type: typeParam,
      timestamp: new Date().toISOString(),
      results,
    };

    console.log("Trending calculation completed:", responseData);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Trending calculation failed:", error);

    return NextResponse.json(
      {
        error: "Trending calculation failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
