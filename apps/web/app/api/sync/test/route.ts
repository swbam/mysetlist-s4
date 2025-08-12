import { artists, db, eq } from "@repo/database";
import {
  ArtistSyncService,
  SetlistSyncService,
  ShowSyncService,
} from "@repo/external-apis";
import { type NextRequest, NextResponse } from "next/server";

// Test endpoint for syncing - no auth required (remove in production!)
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { artistId } = body;

    if (!artistId) {
      return NextResponse.json(
        { error: "artistId is required" },
        { status: 400 }
      );
    }

    // Get artist from database
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (!artist) {
      return NextResponse.json(
        { error: "Artist not found" },
        { status: 404 }
      );
    }

    console.log(`Starting sync for ${artist.name}...`);

    const results = {
      artist: artist.name,
      songs: { status: "pending", count: 0 },
      shows: { status: "pending", count: 0 },
      setlists: { status: "pending", count: 0 },
    };

    // Initialize services
    const artistSyncService = new ArtistSyncService();
    const showSyncService = new ShowSyncService();
    const setlistSyncService = new SetlistSyncService();

    // 1. Sync songs if Spotify ID exists
    if (artist.spotifyId) {
      try {
        console.log(`Syncing songs for ${artist.name}...`);
        results.songs.status = "running";
        
        // Use the syncFullDiscography method
        await artistSyncService.syncFullDiscography(artist.spotifyId);
        
        // Count imported songs
        const songCount = await db.$count(
          db.$with("song_count").as(
            db.raw`
              SELECT COUNT(*) as count 
              FROM songs s
              JOIN artist_songs ars ON s.id = ars.song_id
              WHERE ars.artist_id = ${artist.id}
            `
          )
        );
        
        results.songs.status = "completed";
        results.songs.count = songCount || 0;
        console.log(`Imported ${results.songs.count} songs`);
      } catch (error) {
        console.error("Song sync failed:", error);
        results.songs.status = "failed";
      }
    }

    // 2. Sync shows if Ticketmaster ID exists
    if (artist.ticketmasterId || artist.name) {
      try {
        console.log(`Syncing shows for ${artist.name}...`);
        results.shows.status = "running";
        
        const showResults = await showSyncService.syncArtistShows(artist);
        
        results.shows.status = "completed";
        results.shows.count = showResults.created;
        console.log(`Imported ${results.shows.count} shows`);
      } catch (error) {
        console.error("Show sync failed:", error);
        results.shows.status = "failed";
      }
    }

    // 3. Create default setlists for shows
    if (results.shows.count > 0) {
      try {
        console.log(`Creating setlists for ${artist.name}...`);
        results.setlists.status = "running";
        
        const setlistResults = await setlistSyncService.createDefaultSetlists(
          artist.id
        );
        
        results.setlists.status = "completed";
        results.setlists.count = setlistResults.created;
        console.log(`Created ${results.setlists.count} setlists`);
      } catch (error) {
        console.error("Setlist creation failed:", error);
        results.setlists.status = "failed";
      }
    }

    console.log(`Sync complete for ${artist.name}!`);
    
    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Sync test error:", error);
    return NextResponse.json(
      {
        error: "Sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}