// MySetlist-S4 Complete Artist Import Processor
// File: apps/web/lib/queues/processors/artist-import.processor.ts
// NEW FILE - Core processor for artist import jobs

import { Job } from "bullmq";
import { db, artists, shows, venues, songs, artistSongs, setlists, setlistSongs, eq, desc } from "@repo/database";
import { SpotifyClient, TicketmasterClient } from "@repo/external-apis";
import { updateImportStatus } from "~/lib/import-status";
import { ImportLogger } from "~/lib/import-logger";
import { RedisClientFactory } from "../redis-config";

interface ArtistImportJobData {
  tmAttractionId: string;
  artistId?: string;
  priority?: number;
  adminImport?: boolean;
  userId?: string;
  phase1Complete?: boolean;
  syncOnly?: boolean;
}

interface ImportResult {
  success: boolean;
  artistId: string;
  slug: string;
  totalSongs: number;
  totalShows: number;
  totalVenues: number;
  importDuration: number;
  phaseTimings: {
  phase1Duration: number;
    phase2Duration: number; 
    phase3Duration: number;
  };
}

export class ArtistImportProcessor {
  private static spotifyClient = new SpotifyClient({ apiKey: process.env["SPOTIFY_CLIENT_ID"] });
  private static ticketmasterClient = new TicketmasterClient({ apiKey: process.env["TICKETMASTER_API_KEY"] });
  private static redis = RedisClientFactory.getClient('pubsub');

  static async process(job: Job<ArtistImportJobData>): Promise<ImportResult> {
    const { tmAttractionId, artistId, syncOnly = false } = job.data;
    const logger = new ImportLogger({ artistId: artistId || "unknown", tmAttractionId, jobId: String(job.id) });
  const startTime = Date.now();
    
    const phaseTimings = {
      phase1Duration: 0,
      phase2Duration: 0,
      phase3Duration: 0,
    };

    try {
      await logger.info("start", "Starting artist import process", { 
        tmAttractionId, 
        artistId, 
        syncOnly,
        jobId: job.id,
      });

      await job.updateProgress(0);
      if (artistId) {
        await updateImportStatus(artistId, {
      stage: "initializing",
          progress: 0,
          message: "Starting artist import process",
          ...(job.id ? { job_id: String(job.id) } : {} as any),
        });
      }

      let artist: any;
      
      // Phase 1: Basic artist data (must complete quickly < 3 seconds)
      const phase1Start = Date.now();
      if (!artistId || !syncOnly) {
        artist = await this.executePhase1(tmAttractionId, job);
      } else {
        const rows = await db.select().from(artists).where(eq(artists.id, artistId)).limit(1);
        artist = Array.isArray(rows) ? rows[0] : rows;
      }
      phaseTimings.phase1Duration = Date.now() - phase1Start;

      if (!artist) {
        throw new Error("Failed to create or find artist");
      }

      await job.updateProgress(20);
      await updateImportStatus(artist.id, {
        stage: "syncing-identifiers",
        progress: 20,
        message: "Artist created, syncing identifiers",
        artist_name: artist.name,
      });

      // Phase 2: Shows and venues (background processing)
      const phase2Start = Date.now();
      const showsResult = await this.executePhase2(artist, job);
      phaseTimings.phase2Duration = Date.now() - phase2Start;

      await job.updateProgress(60);
      await updateImportStatus(artist.id, {
        stage: "importing-shows",
        progress: 60,
        message: `Imported ${showsResult.totalShows} shows and ${showsResult.venuesCreated} venues`,
        total_shows: showsResult.totalShows,
        total_venues: showsResult.venuesCreated,
      });

      // Phase 3: Complete song catalog (background processing)
      const phase3Start = Date.now();
      const catalogResult = await this.executePhase3(artist, job);
      phaseTimings.phase3Duration = Date.now() - phase3Start;

      await job.updateProgress(90);
      await updateImportStatus(artist.id, {
        stage: "importing-songs",
        progress: 90,
        message: `Imported ${catalogResult.totalSongs} songs from ${catalogResult.totalAlbums} albums`,
        total_songs: catalogResult.totalSongs,
      });

      // Phase 4: Create initial setlists
      await updateImportStatus(artist.id, {
        stage: "creating-setlists",
        progress: 95,
        message: "Creating initial setlists for upcoming shows",
      });

      const setlistsCreated = await this.createInitialSetlists(artist, showsResult.shows);

      // Final completion
      await job.updateProgress(100);
      await updateImportStatus(artist.id, {
        stage: "completed",
        progress: 100,
        message: "Import completed successfully",
        completed_at: new Date(),
      });

      const totalDuration = Date.now() - startTime;
      
      await logger.success("complete", "Artist import completed", {
        artistId: artist.id,
        totalSongs: catalogResult.totalSongs,
        totalShows: showsResult.totalShows,
        totalVenues: showsResult.venuesCreated,
        setlistsCreated,
        duration: totalDuration,
        phaseTimings,
      });

      return {
        success: true,
        artistId: artist.id,
        slug: artist.slug,
        totalSongs: catalogResult.totalSongs,
        totalShows: showsResult.totalShows,
        totalVenues: showsResult.venuesCreated,
        importDuration: totalDuration,
        phaseTimings,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      await logger.error("failed", "Artist import failed", { message: errorMessage });
      
      if (artistId) {
        await updateImportStatus(artistId, {
          stage: "failed",
          progress: 0,
          message: "Import failed",
          error: errorMessage,
        });
      }

      throw error;
    }
  }

  private static async executePhase1(tmAttractionId: string, job: Job): Promise<any> {
    // Get artist data from Ticketmaster
    const tmArtist = await this.ticketmasterClient.getAttraction(tmAttractionId);
    if (!tmArtist) {
      throw new Error(`Artist not found in Ticketmaster: ${tmAttractionId}`);
    }

    await job.updateProgress(5);

    // Search for Spotify ID
    let spotifyId: string | undefined;
    let spotifyData: any = null;

    try {
      const searchResults = await this.spotifyClient.searchArtists(tmArtist.name, 5);
      
      if (searchResults.artists?.items?.length > 0) {
        // Find best match (exact name match or highest popularity)
        const exactMatch = searchResults.artists.items.find(
          artist => artist.name.toLowerCase() === tmArtist.name.toLowerCase()
        );
        
        const selectedArtist = exactMatch || searchResults.artists.items[0];
        spotifyId = selectedArtist!.id;
        spotifyData = selectedArtist;
        
        console.log(`✅ Found Spotify match: ${selectedArtist!.name} (${spotifyId})`);
      }
    } catch (error) {
      console.warn("Failed to find Spotify ID:", error);
    }

    await job.updateProgress(10);

    // Generate unique slug
    const slug = await this.generateUniqueSlug(tmArtist.name);

    // Extract genres from Ticketmaster and Spotify
    const genres: string[] = [];
    
    // Add Ticketmaster genre
    if (tmArtist.classifications?.[0]?.genre?.name) {
      genres.push(tmArtist.classifications[0].genre.name);
    }
    
    // Add Spotify genres
    if (spotifyData?.genres) {
      genres.push(...spotifyData.genres);
    }

    // Remove duplicates and limit to top 5
    const uniqueGenres = [...new Set(genres)].slice(0, 5);

    // Create artist record
    const insertedArtist = await db
      .insert(artists)
      .values({
        tmAttractionId,
        spotifyId: spotifyId ?? null,
        name: tmArtist.name,
        slug,
        imageUrl: tmArtist.images?.[0]?.url || spotifyData?.images?.[0]?.url,
        smallImageUrl: tmArtist.images?.[1]?.url || spotifyData?.images?.[1]?.url,
        genres: JSON.stringify(uniqueGenres),
        popularity: spotifyData?.popularity || 0,
        followers: spotifyData?.followers?.total || 0,
        externalUrls: JSON.stringify({
          spotify: spotifyData?.external_urls?.spotify,
          ticketmaster: tmArtist.url,
        }),
        importStatus: "in_progress",
        verified: false,
      })
      .returning();
    const createdArtist = Array.isArray(insertedArtist) ? insertedArtist[0] : insertedArtist;
    if (!createdArtist) throw new Error('Failed to insert artist');
    
    await job.updateProgress(15);

    console.log(`✅ Phase 1 completed: Created artist ${createdArtist.name} (${createdArtist.id})`);
    return createdArtist;
  }

  private static async executePhase2(artist: any, job: Job): Promise<{
    totalShows: number;
    venuesCreated: number;
    shows: any[];
  }> {
    if (!artist.tmAttractionId) {
      return { totalShows: 0, venuesCreated: 0, shows: [] };
    }

    // Fetch events from Ticketmaster
    const eventsRes = await this.ticketmasterClient.searchEvents({ attractionId: artist.tmAttractionId, size: 200 });
    const events = eventsRes?._embedded?.events || [];
    
    let totalShows = 0;
    let venuesCreated = 0;
    const createdShows: any[] = [];

    await job.updateProgress(25);

    // Process events in batches
    const batchSize = 10;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      
      for (const event of batch) {
        try {
          // Create or find venue
          let venueId: string | null = null;
          if (event._embedded?.venues?.[0]) {
            const venueData = event._embedded.venues[0];
            
            // Check if venue exists
            const existingRows = await db
              .select({ id: venues.id })
              .from(venues)
              .where(eq(venues.tmVenueId, venueData.id))
              .limit(1);
            const existingVenue = Array.isArray(existingRows) ? existingRows[0] : existingRows;

            if (existingVenue) {
              venueId = existingVenue.id;
            } else {
              // Create venue
              const venueSlug = `${(venueData.name || 'venue').toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${String(venueData.id || 'id').slice(-6)}`;
              const vInserted = await db
                .insert(venues)
                .values({
                  tmVenueId: venueData.id,
                  name: venueData.name,
                  slug: venueSlug,
                  address: venueData.address?.line1 ?? null,
                  city: venueData.city?.name || 'Unknown',
                  state: venueData.state?.stateCode || null,
                  country: venueData.country?.countryCode || 'US',
                  postalCode: venueData.postalCode,
                  timezone: venueData.timezone || 'UTC',
                  capacity: venueData.capacity ?? null,
                  imageUrl: null,
                })
                .returning();
              const newVenue = Array.isArray(vInserted) ? vInserted[0] : vInserted;
              if (!newVenue) throw new Error('Failed to insert venue');
              venueId = newVenue.id;
              venuesCreated++;
            }
          }

          // Create show
          const showSlug = this.generateShowSlug(artist.name, venueId || 'venue', event.dates?.start?.localDate);
          
          const showInserted = await db
            .insert(shows)
            .values({
              headlinerArtistId: artist.id,
              venueId,
              name: event.name,
              slug: showSlug,
              date: event.dates?.start?.localDate,
              startTime: event.dates?.start?.localTime || null,
              doorsTime: null,
              status: this.getShowStatus(event.dates?.start?.localDate),
              description: null,
              ticketUrl: event.url,
              minPrice: event.priceRanges?.[0]?.min ?? null,
              maxPrice: event.priceRanges?.[0]?.max ?? null,
              currency: event.priceRanges?.[0]?.currency || "USD",
              tmEventId: event.id,
            })
            .returning();
          const show = Array.isArray(showInserted) ? showInserted[0] : showInserted;
          createdShows.push(show);
          totalShows++;

        } catch (error) {
          console.error(`Failed to create show for event ${event.id}:`, error);
        }
      }

      // Update progress
      const progress = 25 + Math.floor((i / events.length) * 35);
      await job.updateProgress(Math.min(progress, 60));
    }

    // Update artist with show counts
    await db
      .update(artists)
      .set({
        totalShows,
        upcomingShows: createdShows.filter(s => s.status === 'upcoming').length,
        showsSyncedAt: new Date(),
      })
      .where(eq(artists.id, artist.id));

    console.log(`✅ Phase 2 completed: Created ${totalShows} shows and ${venuesCreated} venues`);
    return { totalShows, venuesCreated, shows: createdShows };
  }

  private static async executePhase3(artist: any, job: Job): Promise<{
    totalSongs: number;
    totalAlbums: number;
  }> {
    if (!artist.spotifyId) {
      console.log("⚠️ No Spotify ID, skipping song catalog sync");
      return { totalSongs: 0, totalAlbums: 0 };
    }

    await job.updateProgress(65);

    // Get artist's albums from Spotify
    const albums = await this.spotifyClient.getArtistAlbums(artist.spotifyId, {
      include_groups: 'album,single',
      market: 'US',
      limit: 50,
    });

    if (!albums || albums.length === 0) {
      return { totalSongs: 0, totalAlbums: 0 };
    }

    let totalSongs = 0;
    const totalAlbums = albums.length;
    const processedTracks = new Set<string>(); // Track duplicates

    await job.updateProgress(70);

    // Process albums in batches
    const albumBatchSize = 5;
    for (let i = 0; i < albums.length; i += albumBatchSize) {
      const albumBatch = albums.slice(i, i + albumBatchSize);
      
      for (const album of albumBatch) {
        try {
          // Get album tracks
          const tracks = await this.spotifyClient.getAlbumTracks(album.id);
          
          for (const track of tracks) {
            // Skip if already processed (handles duplicates across albums)
            if (processedTracks.has(track.id)) {
              continue;
            }
            
            // Exclude all live songs (track or album indicated as live)
            const albumLooksLive = typeof album.name === 'string' && /\blive\b/i.test(album.name);
            if (this.isLiveTrack(track.name) || albumLooksLive) {
              continue;
            }

            // Create song record
            try {
              const sInserted = await db
                .insert(songs)
                .values({
                  spotifyId: track.id,
                  name: track.name,
                  artist: artist.name,
                  albumName: album.name,
                  albumId: album.id,
                  trackNumber: track.track_number,
                  discNumber: track.disc_number || 1,
                  albumType: album.album_type,
                  albumArtUrl: album.images?.[0]?.url,
                  releaseDate: album.release_date,
                  durationMs: track.duration_ms,
                  popularity: track.popularity || 0,
                  previewUrl: track.preview_url,
                  spotifyUri: track.uri,
                  externalUrls: JSON.stringify(track.external_urls),
                  isExplicit: track.explicit || false,
                  isPlayable: !track.restrictions,
                  isLive: this.isLiveTrack(track.name),
                  isRemix: this.isRemixTrack(track.name),
                })
                .returning();
              const song = Array.isArray(sInserted) ? sInserted[0] : sInserted;
              if (!song) throw new Error('Failed to insert song');

              // Link song to artist
              await db
                .insert(artistSongs)
                .values({
                  artistId: artist.id,
                  songId: song.id,
                  isPrimaryArtist: true,
                })
                .onConflictDoNothing();

              processedTracks.add(track.id);
              totalSongs++;

            } catch (error: any) {
              // Skip duplicate songs
              if (!error.message?.includes('unique constraint')) {
                console.error(`Failed to create song ${track.name}:`, error);
              }
            }
          }
    
  } catch (error) {
          console.error(`Failed to process album ${album.name}:`, error);
        }
      }

      // Update progress
      const progress = 70 + Math.floor((i / albums.length) * 20);
      await job.updateProgress(Math.min(progress, 90));
    }

    // Update artist with song catalog info
    await db
      .update(artists)
      .set({
        totalSongs,
        totalAlbums,
        songCatalogSyncedAt: new Date(),
        lastFullSyncAt: new Date(),
      })
      .where(eq(artists.id, artist.id));

    console.log(`✅ Phase 3 completed: Imported ${totalSongs} songs from ${totalAlbums} albums`);
    return { totalSongs, totalAlbums };
  }

  private static async createInitialSetlists(artist: any, shows: any[]): Promise<number> {
    // Only create setlists for upcoming shows
    const upcomingShows = shows.filter(show => show.status === 'upcoming');
    
    if (upcomingShows.length === 0) {
      return 0;
    }

    // Get artist's most popular songs for setlist creation
    const popularSongs = await db
      .select({
        id: songs.id,
        name: songs.name,
        popularity: songs.popularity,
      })
      .from(songs)
      .innerJoin(artistSongs, eq(songs.id, artistSongs.songId))
      .where(eq(artistSongs.artistId, artist.id))
      .orderBy(desc(songs.popularity))
      .limit(25);

    if (popularSongs.length === 0) {
      return 0;
    }

    let setlistsCreated = 0;

    for (const show of upcomingShows.slice(0, 10)) { // Limit to first 10 shows
      try {
        // Create predicted setlist
        const insertedSetlist = await db
          .insert(setlists)
          .values({
            showId: show.id,
            artistId: artist.id,
            type: "predicted",
            name: "Main Set",
            orderIndex: 0,
            isLocked: false,
            importedFrom: "auto-generated",
          })
          .returning();
        const setlist = Array.isArray(insertedSetlist) ? insertedSetlist[0] : insertedSetlist;
        if (!setlist) throw new Error('Failed to insert setlist');

        // Add songs to setlist (top 15-20 songs)
        const setlistItems = popularSongs.slice(0, Math.min(18, popularSongs.length));
        
        for (let i = 0; i < setlistItems.length; i++) {
          const item = setlistItems[i];
          await db
            .insert(setlistSongs)
            .values({
              setlistId: setlist.id,
              songId: item!.id as string,
              position: i + 1,
            });
        }

        setlistsCreated++;
      } catch (error: any) {
        console.error(`Failed to create setlist for show ${show.id}:`, error);
      }
    }

    return setlistsCreated;
  }

  // Utility methods
  private static async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existingRows = await db
        .select({ id: artists.id })
        .from(artists)
        .where(eq(artists.slug, slug))
        .limit(1);
      const existing = Array.isArray(existingRows) ? existingRows[0] : existingRows;

      if (!existing) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  private static generateShowSlug(artistName: string, venueId: string, date: string | null): string {
    const artistSlug = artistName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const dateSlug = date ? date.replace(/-/g, '') : 'tbd';
    const venueSlug = venueId.slice(-6); // Last 6 chars of venue ID
    
    return `${artistSlug}-${venueSlug}-${dateSlug}`;
  }

  private static getShowStatus(date: string | null): "upcoming" | "ongoing" | "completed" | "cancelled" {
    if (!date) return "upcoming";
    
    const showDate = new Date(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (showDate < today) return "completed";
    return "upcoming";
  }

  private static isLiveTrack(name: string): boolean {
    const liveKeywords = [/\blive\b/i, /\bconcert\b/i, /\btour\b/i, /\bshow\b/i];
    return liveKeywords.some(pattern => pattern.test(name));
  }

  private static isRemixTrack(name: string): boolean {
    const remixKeywords = [/\bremix\b/i, /\bedit\b/i, /\brework\b/i];
    return remixKeywords.some(pattern => pattern.test(name));
  }
}

export default ArtistImportProcessor;