import { getUserFromRequest } from "@repo/auth/server";
import { artistStats, artists, db, shows, venues } from "@repo/database";
import { desc, eq, gte } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return general trending recommendations since userFollowsArtists table doesn't exist
    const recommendations = await db
      .select({
        show: {
          id: shows.id,
          name: shows.name,
          slug: shows.slug,
          date: shows.date,
          ticketUrl: shows.ticketUrl,
        },
        artist: {
          id: artists.id,
          name: artists.name,
          slug: artists.slug,
          imageUrl: artists.imageUrl,
          genres: artists.genres,
        },
        venue: {
          name: venues.name,
          city: venues.city,
          state: venues.state,
        },
        stats: {
          trendingScore: artists.trendingScore,
          totalShows: artistStats.totalShows,
        },
      })
      .from(shows)
      .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .leftJoin(venues, eq(shows.venueId, venues.id))
      .leftJoin(artistStats, eq(artists.id, artistStats.artistId))
      .where(gte(shows.date, new Date().toISOString().substring(0, 10)))
      .orderBy(desc(artists.trendingScore))
      .limit(20);

    // Group by categories
    const categorized = {
      trending: recommendations
        .filter((r) => r.stats.trendingScore && r.stats.trendingScore > 0.7)
        .slice(0, 5),
      popular: recommendations
        .sort((a, b) => (b.stats.totalShows || 0) - (a.stats.totalShows || 0))
        .slice(0, 5),
      upcoming: recommendations
        .sort(
          (a, b) =>
            new Date(a.show.date).getTime() - new Date(b.show.date).getTime(),
        )
        .slice(0, 5),
    };

    return NextResponse.json({
      recommendations: categorized,
      factors: {
        topGenres: [],
        followedArtistCount: 0,
        note: "Personalized recommendations unavailable - showing trending content",
      },
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to get recommendations" },
      { status: 500 },
    );
  }
}
