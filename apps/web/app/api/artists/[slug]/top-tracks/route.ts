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

    // Fallback to mock data if no Spotify ID or Spotify API fails
    const mockTracks = [
      {
        id: `track_${artist[0].id}_1`,
        name: "Popular Song #1",
        duration_ms: 180000,
        popularity: 85,
        preview_url: null,
        explicit: false,
        is_playable: true,
        external_urls: {
          spotify: `https://open.spotify.com/track/mock_${artist[0].id}_1`,
        },
        album: {
          id: `album_${artist[0].id}_1`,
          name: "Popular Album",
          release_date: "2023-01-01",
          images: [],
        },
        artists: [
          {
            id: artist[0].spotifyId || `artist_${artist[0].id}`,
            name: artist[0].name,
          },
        ],
      },
      {
        id: `track_${artist[0].id}_2`,
        name: "Popular Song #2",
        duration_ms: 210000,
        popularity: 78,
        preview_url: null,
        explicit: false,
        is_playable: true,
        external_urls: {
          spotify: `https://open.spotify.com/track/mock_${artist[0].id}_2`,
        },
        album: {
          id: `album_${artist[0].id}_2`,
          name: "Another Album",
          release_date: "2022-06-15",
          images: [],
        },
        artists: [
          {
            id: artist[0].spotifyId || `artist_${artist[0].id}`,
            name: artist[0].name,
          },
        ],
      },
      {
        id: `track_${artist[0].id}_3`,
        name: "Popular Song #3",
        duration_ms: 195000,
        popularity: 72,
        preview_url: null,
        explicit: false,
        is_playable: true,
        external_urls: {
          spotify: `https://open.spotify.com/track/mock_${artist[0].id}_3`,
        },
        album: {
          id: `album_${artist[0].id}_3`,
          name: "Latest Release",
          release_date: "2023-09-20",
          images: [],
        },
        artists: [
          {
            id: artist[0].spotifyId || `artist_${artist[0].id}`,
            name: artist[0].name,
          },
        ],
      },
      {
        id: `track_${artist[0].id}_4`,
        name: "Popular Song #4",
        duration_ms: 165000,
        popularity: 68,
        preview_url: null,
        explicit: false,
        is_playable: true,
        external_urls: {
          spotify: `https://open.spotify.com/track/mock_${artist[0].id}_4`,
        },
        album: {
          id: `album_${artist[0].id}_4`,
          name: "Greatest Hits",
          release_date: "2021-03-10",
          images: [],
        },
        artists: [
          {
            id: artist[0].spotifyId || `artist_${artist[0].id}`,
            name: artist[0].name,
          },
        ],
      },
      {
        id: `track_${artist[0].id}_5`,
        name: "Popular Song #5",
        duration_ms: 220000,
        popularity: 65,
        preview_url: null,
        explicit: false,
        is_playable: true,
        external_urls: {
          spotify: `https://open.spotify.com/track/mock_${artist[0].id}_5`,
        },
        album: {
          id: `album_${artist[0].id}_5`,
          name: "Studio Sessions",
          release_date: "2020-11-05",
          images: [],
        },
        artists: [
          {
            id: artist[0].spotifyId || `artist_${artist[0].id}`,
            name: artist[0].name,
          },
        ],
      },
    ];

    return NextResponse.json({
      tracks: mockTracks,
      total: mockTracks.length,
      source: "mock",
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch top tracks" },
      { status: 500 },
    );
  }
}
