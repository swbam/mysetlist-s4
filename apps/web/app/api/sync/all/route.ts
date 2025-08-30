import { artists, db, shows } from "@repo/database";
import { sql } from "drizzle-orm";
import { 
  SetlistSyncService,
  ShowSyncService,
  SpotifyClient,
  TicketmasterClient,
  SetlistFmClient
} from "@repo/external-apis";
import { eq, isNull, and, desc, isNotNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for comprehensive sync

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "trending"; // trending, all, specific, incomplete
    const artistId = searchParams.get("artistId");
    const limit = Math.min(Number(searchParams.get("limit")) || 10, 50);

    const results = {
      mode,
      processed: 0,
      success: 0,
      errors: 0,
      details: [] as any[],
    };

    // Initialize services
    const setlistSync = new SetlistSyncService();
    const showSync = new ShowSyncService();
    const setlistFmClient = new SetlistFmClient({
      apiKey: process.env['SETLISTFM_API_KEY'] || "",
    });
    const spotifyClient = new SpotifyClient({});
    const ticketmasterClient = new TicketmasterClient({
      apiKey: process.env['TICKETMASTER_API_KEY'] || "",
    });

    await spotifyClient.authenticate();

    // Get artists to sync based on mode
    let artistsToSync: typeof artists.$inferSelect[] = [];
    
    if (mode === "specific" && artistId) {
      artistsToSync = await db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);
    } else if (mode === "incomplete") {
      // Get artists missing data
      artistsToSync = await db
        .select()
        .from(artists)
        .where(
          and(
            isNotNull(artists.spotifyId),
            isNull(artists.tmAttractionId)
          )
        )
        .limit(limit);
    } else if (mode === "all") {
      artistsToSync = await db
        .select()
        .from(artists)
        .orderBy(desc(artists.popularity))
        .limit(limit);
    } else {
      // Default: sync trending/popular artists
      artistsToSync = await db
        .select()
        .from(artists)
        .orderBy(
          sql`${artists.trendingScore} DESC NULLS LAST, ${artists.popularity} DESC NULLS LAST`
        )
        .limit(limit);
    }

    // Process each artist
    for (const artist of artistsToSync) {
      const artistResult = {
        id: artist.id,
        name: artist.name,
        status: "processing" as any,
        shows: 0,
        setlists: 0,
        songs: 0,
        errors: [] as string[],
      };

      try {
        results.processed++;

        // 1. Update artist data if missing
        
        // Get Spotify data if missing
        if (!artist.spotifyId && artist.name) {
          try {
            const spotifyResults = await spotifyClient.searchArtists(artist.name, 1);
            if (spotifyResults.artists.items.length > 0) {
              const spotifyArtist = spotifyResults.artists.items[0];
              
              // Check for name similarity
              if (spotifyArtist) {
                const nameSimilar = spotifyArtist.name.toLowerCase().includes(artist.name.toLowerCase()) ||
                                  artist.name.toLowerCase().includes(spotifyArtist.name.toLowerCase());
                
                if (nameSimilar) {
                await db
                  .update(artists)
                  .set({
                    spotifyId: spotifyArtist.id,
                    imageUrl: spotifyArtist.images[0]?.url || artist.imageUrl,
                    smallImageUrl: spotifyArtist.images[2]?.url || artist.smallImageUrl,
                    genres: JSON.stringify(spotifyArtist.genres),
                    popularity: spotifyArtist.popularity,
                    followers: spotifyArtist.followers.total,
                    updatedAt: new Date(),
                  })
                  .where(eq(artists.id, artist.id));
                artist.spotifyId = spotifyArtist.id;
                }
              }
            }
          } catch (error: any) {
            artistResult.errors.push(`Spotify update: ${error.message}`);
          }
          
          // Rate limit
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Get Ticketmaster data if missing
        if (!artist.tmAttractionId && artist.name) {
          try {
            const tmResults = await ticketmasterClient.searchAttractions({
              keyword: artist.name,
              size: 1,
            });
            
            if (tmResults._embedded?.attractions?.[0]) {
              const attraction = tmResults._embedded.attractions[0];
              
              // Check for name similarity
              const nameSimilar = attraction.name.toLowerCase().includes(artist.name.toLowerCase()) ||
                                artist.name.toLowerCase().includes(attraction.name.toLowerCase());
              
              if (nameSimilar) {
                await db
                  .update(artists)
                  .set({
                    tmAttractionId: attraction.id,
                    updatedAt: new Date(),
                  })
                  .where(eq(artists.id, artist.id));
                artist.tmAttractionId = attraction.id;
              }
            }
          } catch (error: any) {
            if (!error.message.includes("timeout")) {
              artistResult.errors.push(`Ticketmaster update: ${error.message}`);
            }
          }
          
          // Rate limit
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // 2. Sync shows from Ticketmaster if we have the ID
        if (artist.tmAttractionId) {
          try {
            const showsResult = await showSync.syncArtistShows(artist.id);
            artistResult.shows = showsResult.newShows;
            
            // Rate limit
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (error: any) {
            if (!error.message.includes("No events found")) {
              artistResult.errors.push(`Show sync: ${error.message}`);
            }
          }
        }

        // 3. Sync setlists from SetlistFM for past shows
        if (artist.name) {
          try {
            const setlistResults = await setlistFmClient.searchSetlists({
              artistName: artist.name,
            });

            for (const setlistData of setlistResults.setlist) {
              // Only sync setlists with songs
              const songCount = setlistData.sets.set.reduce((acc, set) => acc + set.song.length, 0);
              if (songCount > 0) {
                try {
                  await setlistSync.syncSetlistFromSetlistFm(setlistData);
                  artistResult.setlists++;
                } catch (error: any) {
                  // Ignore individual setlist errors
                }
              }
            }
          } catch (error: any) {
            // SetlistFM errors are not critical
          }
          
          // Rate limit
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        // 4. Create initial setlists for upcoming shows without setlists
        const upcomingShows = await db
          .select()
          .from(shows)
          .where(
            and(
              eq(shows.headlinerArtistId, artist.id),
              sql`${shows.date} >= CURRENT_DATE`
            )
          )
          .limit(10);

        for (const show of upcomingShows) {
          try {
            const setlistResult = await setlistSync.ensureInitialSetlists(show.id, {
              songCount: 5,
              weightByPopularity: true,
              excludeLive: true,
            });
            if (setlistResult.created) {
              artistResult.setlists++;
            }
          } catch (error: any) {
            // Individual setlist creation errors are not critical
          }
        }

        // 5. Get song catalog count
        const songCount = await db.execute(sql`
          SELECT COUNT(DISTINCT song_id) as count
          FROM artist_songs
          WHERE artistId = ${artist.id}
        `);
        artistResult.songs = (songCount[0] as any).count || 0;

        artistResult.status = artistResult.errors.length === 0 ? "success" : "partial";
        if (artistResult.status === "success") results.success++;
      } catch (error: any) {
        artistResult.status = "error";
        artistResult.errors.push(error.message);
        results.errors++;
      }

      results.details.push(artistResult);
    }

    // Get overall database statistics
    const stats = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM artists) as total_artists,
        (SELECT COUNT(*) FROM artists WHERE spotify_id IS NOT NULL) as has_spotify,
        (SELECT COUNT(*) FROM artists WHERE tm_attraction_id IS NOT NULL) as has_ticketmaster,
        (SELECT COUNT(*) FROM shows) as totalShows,
        (SELECT COUNT(*) FROM shows WHERE date >= CURRENT_DATE) as upcomingShows,
        (SELECT COUNT(*) FROM setlists) as total_setlists,
        (SELECT COUNT(*) FROM songs) as total_songs,
        (SELECT COUNT(DISTINCT artistId) FROM artist_songs) as artists_with_songs
    `);

    return NextResponse.json({
      success: true,
      results,
      stats: stats[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Sync failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check sync status
export async function GET() {
  try {
    const stats = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM artists) as total_artists,
        (SELECT COUNT(*) FROM artists WHERE spotify_id IS NOT NULL) as has_spotify,
        (SELECT COUNT(*) FROM artists WHERE tm_attraction_id IS NOT NULL) as has_ticketmaster,
        (SELECT COUNT(*) FROM artists WHERE imageUrl IS NOT NULL) as has_image,
        (SELECT COUNT(*) FROM shows) as totalShows,
        (SELECT COUNT(*) FROM shows WHERE date >= CURRENT_DATE) as upcomingShows,
        (SELECT COUNT(*) FROM setlists) as total_setlists,
        (SELECT COUNT(*) FROM setlists WHERE type = 'predicted') as predicted_setlists,
        (SELECT COUNT(*) FROM setlists WHERE type = 'actual') as actual_setlists,
        (SELECT COUNT(*) FROM songs) as total_songs,
        (SELECT COUNT(DISTINCT artistId) FROM artist_songs) as artists_with_songs,
        (SELECT COUNT(*) FROM venues) as total_venues
    `);

    const recentSync = await db.execute(sql`
      SELECT 
        a.name as artist_name,
        a.updated_at,
        (SELECT COUNT(*) FROM shows WHERE artistId = a.id) as show_count,
        (SELECT COUNT(DISTINCT sl.id) FROM setlists sl 
         JOIN shows s ON sl.showId = s.id 
         WHERE s.artistId = a.id) as setlistCount
      FROM artists a
      WHERE a.updated_at > NOW() - INTERVAL '1 hour'
      ORDER BY a.updated_at DESC
      LIMIT 10
    `);

    return NextResponse.json({
      success: true,
      stats: stats[0],
      recentSync: recentSync,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    );
  }
}