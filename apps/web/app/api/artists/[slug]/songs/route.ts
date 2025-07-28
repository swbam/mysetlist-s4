import { artists, db, songs } from "@repo/database";
import { SpotifyClient } from "@repo/external-apis";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase();
    const limit = Math.min(
      Number.parseInt(searchParams.get("limit") || "50"),
      100,
    );
    const offset = Number.parseInt(searchParams.get("offset") || "0");

    // Find the artist by slug or ID (for backwards compatibility)
    const artist = await db
      .select()
      .from(artists)
      .where(
        or(
          eq(artists.slug, slug),
          eq(artists.id, slug), // Also check ID in case it's passed instead of slug
        ),
      )
      .limit(1);

    if (!artist[0]) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    // Enhanced database query with setlist integration
    const artistSongs = await db
      .select({
        song: songs,
        timesPlayed: sql<number>`(
          SELECT COUNT(*)::int 
          FROM setlist_songs ss 
          JOIN setlists s ON ss.setlist_id = s.id 
          WHERE ss.song_id = ${songs.id} AND s.artist_id = ${artist[0].id}
        )`,
        lastPlayed: sql<string>`(
          SELECT MAX(s.created_at)
          FROM setlist_songs ss 
          JOIN setlists s ON ss.setlist_id = s.id 
          WHERE ss.song_id = ${songs.id} AND s.artist_id = ${artist[0].id}
        )`,
        avgRating: sql<number>`(
          SELECT COALESCE(AVG(v.rating), 0)::int
          FROM setlist_songs ss 
          JOIN setlists s ON ss.setlist_id = s.id
          JOIN votes v ON v.setlist_id = s.id
          WHERE ss.song_id = ${songs.id} AND s.artist_id = ${artist[0].id}
        )`,
      })
      .from(songs)
      .where(
        and(
          eq(songs.artist, artist[0].name),
          query ? sql`LOWER(${songs.title}) LIKE ${`%${query}%`}` : undefined,
        ),
      )
      .orderBy(desc(songs.popularity))
      .limit(limit)
      .offset(offset);

    // If we have songs in the database, return them with enhanced data
    if (artistSongs.length > 0) {
      const enhancedSongs = artistSongs.map(
        ({ song, timesPlayed, lastPlayed, avgRating }) => ({
          ...song,
          timesPlayed: timesPlayed || 0,
          lastPlayed: lastPlayed || null,
          avgRating: avgRating || 0,
          isPopular: (timesPlayed || 0) >= 3, // Consider songs played 3+ times as popular
        }),
      );

      return NextResponse.json({
        songs: enhancedSongs,
        total: enhancedSongs.length,
        artist: {
          id: artist[0].id,
          name: artist[0].name,
          slug: artist[0].slug,
          imageUrl: artist[0].imageUrl,
        },
        source: "database",
      });
    }

    // If no songs in database and artist has Spotify ID, try to fetch from Spotify
    if (artist[0].spotifyId) {
      try {
        const spotifyClient = new SpotifyClient({});
        await spotifyClient.authenticate();

        // Get top tracks as a starting point for the song catalog
        const topTracks = await spotifyClient.getArtistTopTracks(
          artist[0].spotifyId,
        );

        // Transform Spotify tracks to our song format
        const spotifySongs = topTracks.tracks.map((track) => ({
          id: `spotify_${track.id}`,
          spotifyId: track.id,
          title: track.name,
          artist: artist[0]?.name || "Unknown Artist",
          album: track.album.name,
          albumArtUrl: track.album.images[0]?.url || null,
          releaseDate: track.album.release_date,
          durationMs: track.duration_ms,
          popularity: track.popularity,
          previewUrl: track.preview_url,
          isExplicit: track.explicit,
          isPlayable: track.is_playable !== false,
          acousticness: null,
          danceability: null,
          energy: null,
          valence: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        // Optionally save these songs to the database for future use
        // This could be done asynchronously to not block the response

        return NextResponse.json({
          songs: spotifySongs,
          total: spotifySongs.length,
          artist: {
            id: artist[0].id,
            name: artist[0].name,
            slug: artist[0].slug,
            imageUrl: artist[0].imageUrl,
          },
          source: "spotify",
        });
      } catch (_spotifyError) {
        // Fall through to mock data
      }
    }

    // Fallback to generated mock data
    const mockSongs = generateMockSongs(artist[0], limit, offset);

    return NextResponse.json({
      songs: mockSongs,
      total: mockSongs.length,
      artist: {
        id: artist[0].id,
        name: artist[0].name,
        slug: artist[0].slug,
        imageUrl: artist[0].imageUrl,
      },
      source: "mock",
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch artist songs" },
      { status: 500 },
    );
  }
}

function generateMockSongs(artist: any, limit: number, offset: number) {
  const songTitles = [
    "Electric Dreams",
    "Midnight City",
    "Neon Lights",
    "Lost in Time",
    "Summer Breeze",
    "Cosmic Love",
    "Digital Heart",
    "Ocean Drive",
    "City Streets",
    "Golden Hour",
    "Starlight",
    "Paradise",
    "Thunder Road",
    "Crystal Clear",
    "Wildfire",
    "Echo Chamber",
    "Velvet Sky",
    "Silver Lining",
    "Aurora",
    "Phoenix Rising",
    "Moonlight Sonata",
    "Solar Flare",
    "Gravity",
    "Kaleidoscope",
    "Prism",
    "Horizon",
    "Zenith",
    "Wavelength",
    "Frequency",
    "Amplitude",
    "Resonance",
    "Harmony",
    "Melody",
    "Rhythm",
  ];

  const albums = [
    "Debut Album",
    "Sophomore Release",
    "Greatest Hits",
    "Live Sessions",
    "Studio Collection",
    "B-Sides & Rarities",
    "Acoustic Sessions",
    "Remix Album",
  ];

  const songs: any[] = [];
  const startIdx = offset;
  const endIdx = Math.min(startIdx + limit, songTitles.length);

  for (let i = startIdx; i < endIdx; i++) {
    songs.push({
      id: `mock_${artist.id}_song_${i}`,
      spotifyId: null,
      title: songTitles[i] || `Song ${i + 1}`,
      artist: artist.name,
      album: albums[i % albums.length],
      albumArtUrl: `https://via.placeholder.com/300x300.png?text=${encodeURIComponent(songTitles[i] || `Song ${i + 1}`)}`,
      releaseDate: new Date(2020 + Math.floor(i / 10), i % 12, 1)
        .toISOString()
        .split("T")[0],
      durationMs: 180000 + ((i * 5000) % 120000), // 3-5 minutes
      popularity: Math.max(100 - i * 2, 30), // Decreasing popularity
      previewUrl: null,
      isExplicit: i % 7 === 0, // Some songs are explicit
      isPlayable: true,
      acousticness: null,
      danceability: null,
      energy: null,
      valence: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return songs;
}
