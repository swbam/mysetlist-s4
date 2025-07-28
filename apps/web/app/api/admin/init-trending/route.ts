import { db } from "@repo/database"
import { artists, shows } from "@repo/database"
import { desc, gt, sql } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    console.log("Initializing trending scores...")

    // Update trending scores for artists based on popularity and followers
    const artistsUpdated = await db
      .update(artists)
      .set({
        trendingScore: sql`
          CASE 
            WHEN ${artists.popularity} > 80 THEN ${artists.popularity} * 1.5
            WHEN ${artists.popularity} > 60 THEN ${artists.popularity} * 1.2
            ELSE ${artists.popularity} * 1.0
          END + 
          CASE 
            WHEN ${artists.followers} > 1000000 THEN 20
            WHEN ${artists.followers} > 100000 THEN 10
            ELSE 5
          END
        `,
      })
      .where(gt(artists.popularity, 0))

    // Update trending scores for shows based on view count and attendee count
    const showsUpdated = await db
      .update(shows)
      .set({
        trendingScore: sql`
          COALESCE(${shows.viewCount}, 0) * 0.1 + 
          COALESCE(${shows.attendeeCount}, 0) * 0.3 + 
          COALESCE(${shows.voteCount}, 0) * 0.5 +
          CASE 
            WHEN ${shows.status} = 'upcoming' THEN 10
            WHEN ${shows.status} = 'ongoing' THEN 20
            ELSE 0
          END
        `,
      })
      .where(sql`${shows.date} >= CURRENT_DATE - INTERVAL '30 days'`)

    // Get top trending artists
    const topArtists = await db
      .select({
        name: artists.name,
        trendingScore: artists.trendingScore,
      })
      .from(artists)
      .orderBy(desc(artists.trendingScore))
      .limit(10)

    // Get top trending shows
    const topShows = await db
      .select({
        name: shows.name,
        trendingScore: shows.trendingScore,
      })
      .from(shows)
      .orderBy(desc(shows.trendingScore))
      .limit(10)

    return NextResponse.json({
      success: true,
      message: "Trending scores initialized",
      stats: {
        artistsUpdated,
        showsUpdated,
        topArtists,
        topShows,
      },
    })
  } catch (error) {
    console.error("Error initializing trending scores:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Get current trending stats
    const [artistCount] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(artists)
      .where(gt(artists.trendingScore, 0))

    const [showCount] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(shows)
      .where(gt(shows.trendingScore, 0))

    const topArtists = await db
      .select({
        name: artists.name,
        trendingScore: artists.trendingScore,
        popularity: artists.popularity,
        followers: artists.followers,
      })
      .from(artists)
      .orderBy(desc(artists.trendingScore))
      .limit(5)

    const topShows = await db
      .select({
        name: shows.name,
        trendingScore: shows.trendingScore,
        viewCount: shows.viewCount,
        attendeeCount: shows.attendeeCount,
      })
      .from(shows)
      .orderBy(desc(shows.trendingScore))
      .limit(5)

    return NextResponse.json({
      success: true,
      stats: {
        trendingArtists: artistCount?.count || 0,
        trendingShows: showCount?.count || 0,
        topArtists,
        topShows,
      },
    })
  } catch (error) {
    console.error("Error getting trending stats:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
