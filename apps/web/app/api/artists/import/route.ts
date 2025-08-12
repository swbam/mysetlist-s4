import { spotify, setlistfm, ticketmaster } from "@repo/external-apis";
import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { CACHE_TAGS } from "~/lib/cache";
import { db, artists, shows, songs, setlists, setlistSongs, artistSongs } from "@repo/database";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
<<<<<<< HEAD
    const { tmAttractionId, ticketmasterId, artistName, imageUrl, genres } = body;

    const resolvedTmId = tmAttractionId || ticketmasterId;

    if (!resolvedTmId && !artistName) {
=======
    const { tmAttractionId } = body;

    if (!tmAttractionId) {
>>>>>>> terragon/fix-finish-mysetlist-sync-cron
      return NextResponse.json(
        { error: "tmAttractionId is required" },
        { status: 400 },
      );
    }

    // Check if artist already exists by ticketmaster ID (idempotency)
    const existingArtist = await db
      .select()
      .from(artists)
      .where(eq(artists.ticketmasterId, tmAttractionId))
      .limit(1);

    if (existingArtist.length > 0) {
      return NextResponse.json(
        {
          artistId: existingArtist[0].id,
          slug: existingArtist[0].slug,
        },
        { status: 200 },
      );
    }

    // First, get artist details from Ticketmaster
    let artistName: string;
    let imageUrl: string | undefined;
    let genres: string[] = [];
    
    try {
      const tmArtist = await ticketmaster.getArtistDetails(tmAttractionId);
      if (!tmArtist) {
        return NextResponse.json(
          { error: "Artist not found on Ticketmaster" },
          { status: 404 },
        );
      }
      artistName = tmArtist.name;
      imageUrl = tmArtist.imageUrl;
      genres = tmArtist.genres || [];
    } catch (error) {
      console.error("Failed to fetch artist from Ticketmaster:", error);
      return NextResponse.json(
        { error: "Failed to fetch artist details from Ticketmaster" },
        { status: 500 },
      );
    }

    // Generate slug from artist name
    const slug = artistName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

<<<<<<< HEAD
    // Check if artist already exists by slug or ticketmaster ID
    const { data: existingArtist } = await supabase
      .from("artists")
      .select("*")
      .or(
        `slug.eq.${slug}${resolvedTmId ? `,ticketmaster_id.eq.${resolvedTmId}` : ""}`,
      )
      .single();

    if (existingArtist) {
      return NextResponse.json(
        {
          artist: {
            id: existingArtist.id,
            slug: existingArtist.slug,
            name: existingArtist.name,
          },
          imported: false,
          message: "Artist already exists",
        },
        { status: 200 },
      );
    }

    // Initialize artist data
=======
    // Initialize artist data (stub record)
>>>>>>> terragon/fix-finish-mysetlist-sync-cron
    let artistData: any = {
      name: artistName,
      slug,
      imageUrl: imageUrl,
      genres: JSON.stringify(genres || []),
<<<<<<< HEAD
      ticketmasterId: resolvedTmId, 
=======
      ticketmasterId: tmAttractionId,
>>>>>>> terragon/fix-finish-mysetlist-sync-cron
      verified: false,
      popularity: 0,
      songCatalogSyncedAt: null, // Will be updated during background sync
    };

<<<<<<< HEAD
    // Fetch and integrate data from external APIs
    if (resolvedTmId) {
      try {
        const tmArtist = await ticketmaster.getArtistDetails(resolvedTmId);
        if (tmArtist) {
          artistData = {
            ...artistData,
            name: tmArtist.name || artistName,
            imageUrl: tmArtist.imageUrl || imageUrl,
            genres: JSON.stringify(tmArtist.genres || genres || []),
            popularity: tmArtist.popularity || 0,
          };
        }
      } catch (error) {
        console.warn("Failed to fetch additional Ticketmaster data:", error);
      }
    }

    // Try to find and set Spotify ID
=======
    // Quick Spotify lookup for basic data (non-blocking)
>>>>>>> terragon/fix-finish-mysetlist-sync-cron
    try {
      await spotify.authenticate();
      const spotifyResults = await spotify.searchArtists(artistName, 1);
      if (spotifyResults.artists.items.length > 0) {
        const spotifyArtist = spotifyResults.artists.items[0];
        if (spotifyArtist) {
          artistData.spotifyId = spotifyArtist.id;
          // Use Spotify image if Ticketmaster didn't provide one
          if (!artistData.imageUrl && spotifyArtist.images[0]) {
            artistData.imageUrl = spotifyArtist.images[0].url;
          }
        }
      }
    } catch (error) {
<<<<<<< HEAD
      console.warn("Failed to fetch Spotify data:", error);
    }

    // Try to find and set Setlist.fm MBID
    try {
      const setlistResults = await setlistfm.searchArtists(artistName, 1);
      if (setlistResults.artist && setlistResults.artist.length > 0 && setlistResults.artist[0]) {
        artistData.mbid = setlistResults.artist[0].mbid;
      }
    } catch (error) {
      console.warn("Failed to fetch Setlist.fm data:", error);
=======
      console.warn("Failed to fetch basic Spotify data:", error);
>>>>>>> terragon/fix-finish-mysetlist-sync-cron
    }

    // Insert the new artist
    const [newArtist] = await db
      .insert(artists)
      .values(artistData)
      .returning({ id: artists.id, slug: artists.slug, name: artists.name });

    if (!newArtist) {
      console.error("Failed to insert artist");
      return NextResponse.json(
        { error: "Failed to create artist" },
        { status: 500 },
      );
    }

    // Revalidate cache
    revalidateTag(CACHE_TAGS.artists);

    // Trigger background tasks (fire and forget)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3001';
    
    const backgroundTasks = [
      // 1. Sync identifiers (Spotify, MBID)
      fetch(`${baseUrl}/api/cron/sync-artist-data`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.CRON_SECRET}`,
        },
<<<<<<< HEAD
        body: JSON.stringify({
          type: "artist",
                     artistId: newArtist.id,
           ticketmasterId: newArtist.ticketmasterId,
           spotifyId: newArtist.spotifyId, 
           mbid: newArtist.mbid, 
          options: {
            syncSongs: true,
            syncShows: true,
            syncSetlists: true,
            createDefaultSetlists: true,
            fullDiscography: true,
          },
=======
        body: JSON.stringify({ artistId: newArtist.id }),
      }).catch((error) => console.warn("Failed to trigger artist data sync:", error)),
      
      // 2. Import full song catalog (excluding live tracks)
      fetch(`${baseUrl}/api/sync/songs`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ 
          artistId: newArtist.id, 
          fullDiscography: true,
          batchSize: 50 
>>>>>>> terragon/fix-finish-mysetlist-sync-cron
        }),
      }).catch((error) => console.warn("Failed to trigger song sync:", error)),
      
      // 3. Import shows and venues
      fetch(`${baseUrl}/api/sync/shows`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ artistId: newArtist.id }),
      }).catch((error) => console.warn("Failed to trigger show sync:", error)),
    ];

    // Execute all background tasks
    Promise.allSettled(backgroundTasks).then(async (results) => {
      // Wait a bit for the sync to start, then create initial setlists
      setTimeout(async () => {
        try {
          await createInitialSetlistsForNewShows(newArtist.id);
        } catch (error) {
          console.warn("Failed to create initial setlists:", error);
        }
      }, 30000); // Wait 30 seconds for other syncs to populate data
    });

    return NextResponse.json(
      {
        artistId: newArtist.id,
        slug: newArtist.slug,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Import API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Helper function to create initial setlists for new shows
async function createInitialSetlistsForNewShows(artistId: string): Promise<void> {
  try {
    // Get artist's songs (excluding live tracks)
    const artistSongsQuery = await db
      .select({
        id: songs.id,
        name: songs.name,
        popularity: songs.popularity,
      })
      .from(songs)
      .innerJoin(artistSongs, eq(songs.id, artistSongs.songId))
      .where(eq(artistSongs.artistId, artistId))
      .limit(50); // Get up to 50 songs for selection

    // Filter out live tracks by name patterns
    const nonLiveSongs = artistSongsQuery.filter(song => {
      const songName = song.name.toLowerCase();
      return !songName.includes('live') && 
             !songName.includes('acoustic') &&
             !songName.includes('unplugged') &&
             !songName.includes('session');
    });

    if (nonLiveSongs.length === 0) {
      console.log("No non-live songs found for artist, skipping setlist creation");
      return;
    }

    // Get recent shows without setlists
    const recentShows = await db
      .select()
      .from(shows)
      .where(eq(shows.headlinerArtistId, artistId))
      .limit(20);

    for (const show of recentShows) {
      // Check if setlist already exists
      const existingSetlist = await db
        .select()
        .from(setlists)
        .where(eq(setlists.showId, show.id))
        .limit(1);

      if (existingSetlist.length > 0) {
        continue; // Skip if setlist already exists
      }

      // Create setlist
      const [newSetlist] = await db
        .insert(setlists)
        .values({
          showId: show.id,
          name: `${show.name} - Predicted Setlist`,
          isDefault: true,
          totalVotes: 0,
        })
        .returning({ id: setlists.id });

      if (newSetlist) {
        // Select 5 songs (prioritize by popularity, then random)
        const sortedSongs = nonLiveSongs
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, 10) // Take top 10 by popularity
          .sort(() => 0.5 - Math.random()) // Randomize the top songs
          .slice(0, 5); // Select 5

        // Add songs to setlist
        const setlistSongData = sortedSongs.map((song, index) => ({
          setlistId: newSetlist.id,
          songId: song.id,
          orderIndex: index + 1,
          votes: 0,
        }));

        await db.insert(setlistSongs).values(setlistSongData);
        console.log(`Created initial setlist for ${show.name} with ${sortedSongs.length} songs`);
      }
    }
  } catch (error) {
    console.error("Failed to create initial setlists:", error);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tmAttractionId = searchParams.get("tmAttractionId");

  if (!tmAttractionId) {
    return NextResponse.json(
      { error: "tmAttractionId is required" },
      { status: 400 },
    );
  }

  try {
    // Check if artist exists
    const existingArtist = await db
      .select()
      .from(artists)
      .where(eq(artists.ticketmasterId, tmAttractionId))
      .limit(1);

    if (existingArtist.length > 0) {
      return NextResponse.json({
        exists: true,
        artistId: existingArtist[0].id,
        slug: existingArtist[0].slug,
      });
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error("Import check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}