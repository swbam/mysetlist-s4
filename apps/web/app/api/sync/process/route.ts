import { NextRequest, NextResponse } from "next/server";
import { getSyncQueue } from "@repo/utils";
import { spotify, ticketmaster, setlistfm } from "@repo/external-apis";
import { db } from "@repo/database";
import { artists, shows, venues, artistSongs } from "@repo/database";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();
    
    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID required" },
        { status: 400 }
      );
    }

    // Process the job in background (non-blocking response)
    processJobInBackground(jobId);

    return NextResponse.json({ 
      success: true, 
      message: "Job processing started",
      jobId 
    });

  } catch (error) {
    console.error("Sync process error:", error);
    return NextResponse.json(
      { error: "Failed to start job processing" },
      { status: 500 }
    );
  }
}

// Background job processor
async function processJobInBackground(jobId: string) {
  const syncQueue = getSyncQueue();
  
  try {
    const { job } = await syncQueue.getJobStatus(jobId);
    
    if (!job || job.status !== "pending") {
      return;
    }

    // Mark as in progress
    await syncQueue.supabase
      .from("sync_jobs")
      .update({ 
        status: "in_progress", 
        started_at: new Date().toISOString() 
      })
      .eq("id", jobId);

    // Process based on entity type and job type
    if (job.entity_type === "artist") {
      await processArtistSync(job, syncQueue);
    } else if (job.entity_type === "venue") {
      await processVenueSync(job, syncQueue);
    } else if (job.entity_type === "show") {
      await processShowSync(job, syncQueue);
    }

    await syncQueue.completeJob(jobId, "completed");

  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    await syncQueue.completeJob(jobId, "failed", String(error));
  }
}

async function processArtistSync(job: any, syncQueue: any) {
  const { entity_id: artistId, spotify_id: spotifyId, job_type: jobType } = job;

  // Step 1: Fetch artist data from Spotify
  await syncQueue.updateProgress(job.id, "fetching_artist", 0, "Fetching artist information from Spotify...");
  
  const spotifyArtist = await spotify.getArtist(spotifyId);
  if (!spotifyArtist) {
    throw new Error("Artist not found on Spotify");
  }

  // Update artist in database
  await db.update(artists)
    .set({
      name: spotifyArtist.name,
      image_url: spotifyArtist.images?.[0]?.url,
      genres: spotifyArtist.genres,
      spotify_followers: spotifyArtist.followers?.total,
      spotify_popularity: spotifyArtist.popularity,
      updated_at: new Date(),
    })
    .where(eq(artists.id, artistId));

  await syncQueue.updateProgress(job.id, "fetching_artist", 100, "Artist information updated");

  if (jobType === "full_sync" || jobType === "shows_only") {
    // Step 2: Fetch shows from Ticketmaster
    await syncQueue.updateProgress(job.id, "importing_shows", 0, "Fetching shows from Ticketmaster...");
    
    const ticketmasterShows = await ticketmaster.getArtistShows(spotifyArtist.name);
    let processedShows = 0;
    
    for (const show of ticketmasterShows || []) {
      try {
        // Import venue if needed
        let venueId = await getOrCreateVenue(show.venue);
        
        // Import show
        await db.insert(shows)
          .values({
            artist_id: artistId,
            venue_id: venueId,
            date: new Date(show.date),
            ticketmaster_id: show.id,
            name: show.name,
            status: "upcoming",
            ticket_url: show.ticketUrl,
          })
          .onConflictDoNothing();
          
        processedShows++;
        
        const progress = Math.round((processedShows / ticketmasterShows.length) * 100);
        await syncQueue.updateProgress(
          job.id, 
          "importing_shows", 
          progress, 
          `Imported ${processedShows}/${ticketmasterShows.length} shows`
        );
        
      } catch (error) {
        console.error(`Failed to import show ${show.id}:`, error);
      }
    }
    
    await syncQueue.updateProgress(job.id, "importing_shows", 100, `Imported ${processedShows} shows`);
  }

  if (jobType === "full_sync" || jobType === "catalog_only") {
    // Step 3: Fetch artist's top tracks and albums
    await syncQueue.updateProgress(job.id, "syncing_songs", 0, "Importing song catalog...");
    
    const [topTracks, albums] = await Promise.all([
      spotify.getArtistTopTracks(spotifyId),
      spotify.getArtistAlbums(spotifyId)
    ]);
    
    const allTracks = [...(topTracks || [])];
    
    // Get tracks from albums
    for (const album of albums || []) {
      const albumTracks = await spotifyApi.getAlbumTracks(album.id);
      if (albumTracks) {
        allTracks.push(...albumTracks);
      }
    }
    
    // Deduplicate by Spotify ID
    const uniqueTracks = allTracks.reduce((acc, track) => {
      if (!acc.some(t => t.id === track.id)) {
        acc.push(track);
      }
      return acc;
    }, [] as typeof allTracks);
    
    let processedTracks = 0;
    
    for (const track of uniqueTracks) {
      try {
        await db.insert(artistSongs)
          .values({
            artist_id: artistId,
            title: track.name,
            spotify_id: track.id,
            duration_ms: track.duration_ms,
            popularity: track.popularity,
            preview_url: track.preview_url,
            album_name: track.album?.name,
            track_number: track.track_number,
          })
          .onConflictDoNothing();
          
        processedTracks++;
        
        const progress = Math.round((processedTracks / uniqueTracks.length) * 100);
        await syncQueue.updateProgress(
          job.id, 
          "syncing_songs", 
          progress, 
          `Imported ${processedTracks}/${uniqueTracks.length} songs`
        );
        
      } catch (error) {
        console.error(`Failed to import track ${track.id}:`, error);
      }
    }
    
    await syncQueue.updateProgress(job.id, "syncing_songs", 100, `Imported ${processedTracks} songs`);
  }

  // Final step: Update artist stats
  await syncQueue.updateProgress(job.id, "finalizing", 0, "Updating artist statistics...");
  
  // Calculate stats (show count, song count, etc.)
  const [showCount, songCount] = await Promise.all([
    db.select({ count: shows.id }).from(shows).where(eq(shows.artist_id, artistId)),
    db.select({ count: artistSongs.id }).from(artistSongs).where(eq(artistSongs.artist_id, artistId))
  ]);
  
  await db.update(artists)
    .set({
      show_count: showCount.length,
      song_count: songCount.length,
      last_synced_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(artists.id, artistId));
  
  await syncQueue.updateProgress(job.id, "finalizing", 100, "Sync completed successfully");
}

async function processVenueSync(job: any, syncQueue: any) {
  // Venue sync implementation
  await syncQueue.updateProgress(job.id, "venue_sync", 100, "Venue sync not implemented yet");
}

async function processShowSync(job: any, syncQueue: any) {
  // Show sync implementation  
  await syncQueue.updateProgress(job.id, "show_sync", 100, "Show sync not implemented yet");
}

async function getOrCreateVenue(venueData: any): Promise<string> {
  // Check if venue exists
  const existingVenue = await db
    .select()
    .from(venues)
    .where(eq(venues.ticketmaster_id, venueData.id))
    .limit(1);
    
  if (existingVenue.length > 0) {
    return existingVenue[0].id;
  }
  
  // Create new venue
  const newVenue = await db.insert(venues)
    .values({
      name: venueData.name,
      city: venueData.city,
      state: venueData.state,
      country: venueData.country,
      ticketmaster_id: venueData.id,
      address: venueData.address,
      capacity: venueData.capacity,
    })
    .returning({ id: venues.id });
    
  return newVenue[0].id;
}