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
