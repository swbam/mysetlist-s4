import { artists, db } from "@repo/database";
import { SpotifyClient } from "@repo/external-apis";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    // Find the artist by slug
    const artist = await db
      .select()
      .from(artists)
      .where(eq(artists.slug, slug))
      .limit(1);

    if (!artist[0]) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    // If we have a Spotify ID, fetch from Spotify API
    if (artist[0].spotifyId) {
      try {
        const spotifyClient = new SpotifyClient({});
        await spotifyClient.authenticate();

        const topTracks = await spotifyClient.getArtistTopTracks(
          artist[0].spotifyId,
        );

        return NextResponse.json({
          tracks: topTracks.tracks,
          total: topTracks.tracks.length,
          source: "spotify",
        });
      } catch (spotifyError) {
        console.warn("Spotify API failed for top tracks:", spotifyError);

        // Return empty result instead of mock data
        return NextResponse.json({
          tracks: [],
          total: 0,
          source: "empty",
          message:
            "No top tracks available. Check back later for Spotify integration.",
        });
      }
    }

    // Return empty result instead of mock data for artists without Spotify ID
    return NextResponse.json({
      tracks: [],
      total: 0,
      source: "empty",
      message: "Top tracks not available. Artist needs Spotify integration.",
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch top tracks" },
      { status: 500 },
    );
  }
}
