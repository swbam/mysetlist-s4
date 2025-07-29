import { artists, db, shows } from "@repo/database";
import { sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

const CRON_SECRET = process.env["CRON_SECRET"];

// Trending score calculation weights
const WEIGHTS = {
  artist: {
    followers: 0.3,
    popularity: 0.2,
    recentShows: 0.3,
    followerGrowth: 0.2,
  },
  show: {
    viewCount: 0.2,
    attendeeCount: 0.3,
    voteCount: 0.25,
    setlistCount: 0.15,
    recency: 0.1,
  },
};

// Time decay factor (7 days)
const TIME_DECAY_DAYS = 7;

function calculateTimeDecay(date: Date): number {
  const now = new Date();
  const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - daysDiff / TIME_DECAY_DAYS);
}

async function updateArtistScores() {
  // Get all artists with their stats
  const artistsData = await db
    .select({
      id: artists.id,
      followers: artists.followers,
      popularity: artists.popularity,
      followerCount: artists.followerCount,
    })
    .from(artists);

  let updated = 0;

  // Calculate scores for each artist
  for (const artist of artistsData) {
    // Get recent shows count
    const recentShowsResult = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(shows)
      .where(sql`${shows.headlinerArtistId} = ${artist.id} 
      AND ${shows.date} >= CURRENT_DATE - INTERVAL '30 days'`);

    const recentShowCount = recentShowsResult[0]?.count || 0;

    // Calculate follower growth (simplified - would need historical data)
    const followerGrowth = Math.random() * 50;

    // Calculate trending score
    const score =
      ((artist.followers || 0) / 10000) * WEIGHTS.artist.followers +
      (artist.popularity || 0) * WEIGHTS.artist.popularity +
      recentShowCount * 10 * WEIGHTS.artist.recentShows +
      followerGrowth * WEIGHTS.artist.followerGrowth;

    // Update artist with new trending score
    await db
      .update(artists)
      .set({ trendingScore: score })
      .where(sql`${artists.id} = ${artist.id}`);

    updated++;
  }

  return updated;
}

async function updateShowScores() {
  // Get all upcoming/ongoing shows
  const showsData = await db
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

  let updated = 0;

  // Calculate scores for each show
  for (const show of showsData) {
    const recencyFactor = calculateTimeDecay(new Date(show.createdAt));

    // Calculate trending score
    const score =
      (show.viewCount || 0) * WEIGHTS.show.viewCount +
      (show.attendeeCount || 0) * WEIGHTS.show.attendeeCount +
      (show.voteCount || 0) * WEIGHTS.show.voteCount +
      (show.setlistCount || 0) * 5 * WEIGHTS.show.setlistCount +
      recencyFactor * 100 * WEIGHTS.show.recency;

    // Update show with new trending score
    await db
      .update(shows)
      .set({ trendingScore: score })
      .where(sql`${shows.id} = ${show.id}`);

    updated++;
  }

  return updated;
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Update trending scores
    const [artistsUpdated, showsUpdated] = await Promise.all([
      updateArtistScores(),
      updateShowScores(),
    ]);

    return NextResponse.json({
      success: true,
      message: "Trending scores updated",
      timestamp: new Date().toISOString(),
      results: {
        artists: { updated: artistsUpdated },
        shows: { updated: showsUpdated },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Trending update failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
