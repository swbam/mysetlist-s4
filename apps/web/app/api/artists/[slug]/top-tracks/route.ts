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
      } catch (_spotifyError) {
        // Fall through to mock data
      }
    }

    // Fallback: return empty list to avoid leaking mock data
    return NextResponse.json({ tracks: [], total: 0, source: "none" });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch top tracks" },
      { status: 500 },
    );
  }
}
