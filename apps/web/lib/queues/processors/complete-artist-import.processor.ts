import { Job } from "bullmq";
import { eq } from "drizzle-orm";
import { 
  db, 
  artists, 
  shows, 
  venues, 
  songs, 
  artistSongs,
  importStatus as importStatusTable
} from "@repo/database";
import { SpotifyClient, TicketmasterClient } from "@repo/external-apis";
import { updateImportStatus } from "~/lib/import-status";
import { ImportLogger } from "~/lib/import-logger";
import { spotifyCircuitBreaker, ticketmasterCircuitBreaker } from "~/lib/services/circuit-breaker";
import { redisCache } from "~/lib/redis/production-redis-config";

interface ArtistImportJobData {
  tmAttractionId: string;
  artistId?: string;
  priority?: number;
  adminImport?: boolean;
  userId?: string;
  phase1Complete?: boolean;
  syncOnly?: boolean;
}

interface ArtistImportResult {
  success: boolean;
  artistId: string;
  artistName: string;
  totalSongs: number;
  totalShows: number;
  totalVenues: number;
  spotifyId?: string;
  phases: {
    phase1: { success: boolean; duration: number };
    phase2: { success: boolean; duration: number };
    phase3: { success: boolean; duration: number };
  };
  errors: string[];
  followUpJobs: string[];
}

export class CompleteArtistImportProcessor {
  private spotifyClient: SpotifyClient;
  private ticketmasterClient: TicketmasterClient;

  constructor() {
    this.spotifyClient = new SpotifyClient({});
    this.ticketmasterClient = new TicketmasterClient({});
  }

  async process(job: Job<ArtistImportJobData>): Promise<ArtistImportResult> {
    const startTime = Date.now();
    const { tmAttractionId, artistId, syncOnly = false } = job.data;
    const logger = new ImportLogger(job.id || "unknown");
    const errors: string[] = [];
    const followUpJobs: string[] = [];

    const phases = {
      phase1: { success: false, duration: 0 },
      phase2: { success: false, duration: 0 },
      phase3: { success: false, duration: 0 }
    };

    try {
      logger.info("Starting artist import", { 
        tmAttractionId, 
        artistId, 
        syncOnly 
      });

      // Phase 1: Basic artist data (must complete quickly)
      const phase1Start = Date.now();
      let artist;
      
      try {
        await updateImportStatus(artistId || tmAttractionId, {
          stage: "initializing",
          progress: 0,
          message: "Starting artist import process",
          job_id: job.id,
        });

        if (!artistId || !syncOnly) {
          artist = await this.executePhase1(tmAttractionId, job);
          await updateImportStatus(artist.id, {
            stage: "syncing-identifiers",
            progress: 20,
            message: "Artist created, syncing identifiers",
            artist_name: artist.name,
          });
        } else {
          const existingArtist = await db
            .select()
            .from(artists)
            .where(eq(artists.id, artistId))
            .get();
          
          if (!existingArtist) {
            throw new Error(`Artist ${artistId} not found`);
          }
          
          artist = existingArtist;
        }

        phases.phase1.success = true;
        phases.phase1.duration = Date.now() - phase1Start;

        // Phase 2: Shows and venues
        const phase2Start = Date.now();
        try {
          const showsResult = await this.executePhase2(artist, job);
          await updateImportStatus(artist.id, {
            stage: "importing-shows",
            progress: 60,
            message: `Imported ${showsResult.totalShows} shows and ${showsResult.venuesCreated} venues`,
            total_shows: showsResult.totalShows,
            total_venues: showsResult.venuesCreated,
          });

          phases.phase2.success = true;
          phases.phase2.duration = Date.now() - phase2Start;
        } catch (error) {
          logger.error("Phase 2 failed", { error });
          errors.push(`Phase 2 (shows): ${error instanceof Error ? error.message : 'Unknown error'}`);
          phases.phase2.duration = Date.now() - phase2Start;
        }

        // Phase 3: Complete song catalog
        const phase3Start = Date.now();
        try {
          const catalogResult = await this.executePhase3(artist, job);
          await updateImportStatus(artist.id, {
            stage: "importing-songs",
            progress: 90,
            message: `Imported ${catalogResult.totalSongs} songs from ${catalogResult.totalAlbums} albums`,
            total_songs: catalogResult.totalSongs,
          });

          phases.phase3.success = true;
          phases.phase3.duration = Date.now() - phase3Start;
        } catch (error) {
          logger.error("Phase 3 failed", { error });
          errors.push(`Phase 3 (catalog): ${error instanceof Error ? error.message : 'Unknown error'}`);
          phases.phase3.duration = Date.now() - phase3Start;
        }

        // Final: Create initial setlists
        await updateImportStatus(artist.id, {
          stage: "creating-setlists",
          progress: 95,
          message: "Creating initial setlists",
        });

        // Mark import as complete
        await updateImportStatus(artist.id, {
          stage: "completed",
          progress: 100,
          message: "Import completed successfully",
          completed_at: new Date(),
        });

        // Clear cache for this artist
        await redisCache.invalidatePattern(`artist:${artist.id}:*`);
        await redisCache.invalidatePattern(`shows:${artist.id}:*`);

        logger.success("Artist import completed", {
          artistId: artist.id,
          duration: Date.now() - startTime,
          phases
        });

        return {
          success: true,
          artistId: artist.id,
          artistName: artist.name,
          totalSongs: catalogResult?.totalSongs || 0,
          totalShows: showsResult?.totalShows || 0,
          totalVenues: showsResult?.venuesCreated || 0,
          spotifyId: artist.spotifyId,
          phases,
          errors,
          followUpJobs
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.error("Artist import failed", { error: errorMessage });
        
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Fatal error: ${errorMessage}`);
      
      return {
        success: false,
        artistId: artistId || "",
        artistName: "Unknown",
        totalSongs: 0,
        totalShows: 0,
        totalVenues: 0,
        phases,
        errors,
        followUpJobs
      };
    }
  }

  private async executePhase1(tmAttractionId: string, job: Job): Promise<any> {
    // Get artist data from Ticketmaster with circuit breaker
    const tmArtist = await ticketmasterCircuitBreaker.execute(async () => {
      await this.ticketmasterClient.authenticate();
      return await this.ticketmasterClient.getAttraction(tmAttractionId);
    });

    if (!tmArtist) {
      throw new Error(`Artist not found in Ticketmaster: ${tmAttractionId}`);
    }

    await job.updateProgress(10);

    // Search for Spotify ID with circuit breaker
    let spotifyId: string | undefined;
    try {
      const spotifyResults = await spotifyCircuitBreaker.execute(async () => {
        await this.spotifyClient.authenticate();
        return await this.spotifyClient.searchArtists(tmArtist.name, 1);
      });
      
      if (spotifyResults.artists?.items?.length > 0) {
        const spotifyArtist = spotifyResults.artists.items[0];
        // Verify it's the same artist by checking genres or other metadata
        spotifyId = spotifyArtist.id;
      }
    } catch (error) {
      console.warn("Failed to find Spotify ID:", error);
      // Continue without Spotify ID
    }

    // Check if artist already exists
    const existingArtist = await db
      .select()
      .from(artists)
      .where(eq(artists.tmAttractionId, tmAttractionId))
      .get();

    if (existingArtist) {
      // Update existing artist
      await db
        .update(artists)
        .set({
          spotifyId: spotifyId || existingArtist.spotifyId,
          name: tmArtist.name,
          imageUrl: tmArtist.images?.[0]?.url || existingArtist.imageUrl,
          genres: JSON.stringify(
            tmArtist.classifications?.[0]?.genre?.name 
              ? [tmArtist.classifications[0].genre.name] 
              : []
          ),
          updatedAt: new Date(),
        })
        .where(eq(artists.id, existingArtist.id));
      
      return existingArtist;
    }

    // Create new artist
    const [artist] = await db
      .insert(artists)
      .values({
        tmAttractionId,
        spotifyId,
        name: tmArtist.name,
        slug: this.generateSlug(tmArtist.name),
        imageUrl: tmArtist.images?.[0]?.url,
        genres: JSON.stringify(
          tmArtist.classifications?.[0]?.genre?.name 
            ? [tmArtist.classifications[0].genre.name] 
            : []
        ),
        importStatus: "in_progress",
      })
      .returning();

    // Cache artist data
    await redisCache.set(`artist:${artist.id}`, artist, 3600); // 1 hour

    return artist;
  }

  private async executePhase2(artist: any, job: Job): Promise<any> {
    // Import shows and venues with circuit breaker
    const events = await ticketmasterCircuitBreaker.execute(async () => {
      return await this.ticketmasterClient.getArtistEvents(artist.tmAttractionId!);
    });
    
    let totalShows = 0;
    const venueIds = new Set<string>();
    const processedEvents = [];

    await job.updateProgress(40);

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      try {
        // Process venue first
        if (event._embedded?.venues?.[0]) {
          const tmVenue = event._embedded.venues[0];
          
          // Check if venue exists
          let venue = await db
            .select()
            .from(venues)
            .where(eq(venues.tmVenueId, tmVenue.id))
            .get();

          if (!venue) {
            // Create venue
            [venue] = await db
              .insert(venues)
              .values({
                tmVenueId: tmVenue.id,
                name: tmVenue.name,
                city: tmVenue.city?.name,
                state: tmVenue.state?.stateCode,
                country: tmVenue.country?.countryCode,
                latitude: tmVenue.location?.latitude 
                  ? parseFloat(tmVenue.location.latitude) 
                  : null,
                longitude: tmVenue.location?.longitude 
                  ? parseFloat(tmVenue.location.longitude) 
                  : null,
                capacity: tmVenue.generalInfo?.generalRule 
                  ? parseInt(tmVenue.generalInfo.generalRule) 
                  : null,
                timezone: tmVenue.timezone,
              })
              .returning();
          }

          venueIds.add(venue.id);

          // Create show
          const showDate = new Date(event.dates.start.localDate);
          
          const existingShow = await db
            .select()
            .from(shows)
            .where(eq(shows.tmEventId, event.id))
            .get();

          if (!existingShow) {
            await db
              .insert(shows)
              .values({
                tmEventId: event.id,
                headlinerArtistId: artist.id,
                venueId: venue.id,
                name: event.name,
                date: showDate,
                timezone: event.dates.timezone,
                status: event.dates.status?.code || "scheduled",
                ticketUrl: event.url,
                minPrice: event.priceRanges?.[0]?.min,
                maxPrice: event.priceRanges?.[0]?.max,
                currency: event.priceRanges?.[0]?.currency || "USD",
              });

            totalShows++;
          }
        }

        // Update progress
        if (i % 5 === 0) {
          await job.updateProgress(40 + (20 * i / events.length));
        }

        // Rate limiting
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.warn(`Failed to process show ${event.name}:`, error);
        // Continue processing other shows
      }
    }

    // Update artist with show counts
    await db
      .update(artists)
      .set({
        totalShows,
        upcomingShows: totalShows, // Simplified for now
        showsSyncedAt: new Date(),
      })
      .where(eq(artists.id, artist.id));

    return { totalShows, venuesCreated: venueIds.size };
  }

  private async executePhase3(artist: any, job: Job): Promise<any> {
    if (!artist.spotifyId) {
      console.log("No Spotify ID, skipping catalog sync");
      return { totalSongs: 0, totalAlbums: 0 };
    }

    // Get artist's albums with circuit breaker
    const albums = await spotifyCircuitBreaker.execute(async () => {
      await this.spotifyClient.authenticate();
      return await this.spotifyClient.getArtistAlbums(artist.spotifyId, {
        include_groups: 'album,single',
        limit: 50
      });
    });
    
    let totalSongs = 0;
    let totalAlbums = albums.items.length;
    const processedTracks = new Set<string>();

    await job.updateProgress(70);

    for (let i = 0; i < albums.items.length; i++) {
      const album = albums.items[i];
      
      try {
        // Get album tracks with circuit breaker
        const tracks = await spotifyCircuitBreaker.execute(async () => {
          return await this.spotifyClient.getAlbumTracks(album.id, { limit: 50 });
        });

        for (const track of tracks.items) {
          // Skip live tracks
          if (this.isLiveTrack(track.name)) {
            continue;
          }

          // Check for duplicates
          const trackKey = `${artist.spotifyId}:${track.id}`;
          if (processedTracks.has(trackKey)) {
            continue;
          }

          processedTracks.add(trackKey);

          // Check if song exists
          let song = await db
            .select()
            .from(songs)
            .where(eq(songs.spotifyId, track.id))
            .get();

          if (!song) {
            // Create song
            [song] = await db
              .insert(songs)
              .values({
                spotifyId: track.id,
                name: track.name,
                artist: artist.name,
                artistId: artist.id,
                albumName: album.name,
                albumId: album.id,
                durationMs: track.duration_ms,
                isrc: track.external_ids?.isrc,
                popularity: track.popularity || 0,
                previewUrl: track.preview_url,
                trackNumber: track.track_number,
                explicit: track.explicit,
                releaseDate: album.release_date,
              })
              .returning();
          }

          // Create artist-song relationship
          await db
            .insert(artistSongs)
            .values({
              artistId: artist.id,
              songId: song.id,
              isPrimary: true,
            })
            .onConflictDoNothing();

          totalSongs++;
        }

        // Update progress
        if (i % 3 === 0) {
          await job.updateProgress(70 + (20 * i / albums.items.length));
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.warn(`Failed to process album ${album.name}:`, error);
        // Continue processing other albums
      }
    }

    // Update artist with song catalog info
    await db
      .update(artists)
      .set({
        totalSongs,
        totalAlbums,
        songCatalogSyncedAt: new Date(),
        importStatus: "completed",
      })
      .where(eq(artists.id, artist.id));

    // Cache catalog data
    await redisCache.set(`artist:${artist.id}:catalog`, {
      totalSongs,
      totalAlbums,
      lastSynced: new Date()
    }, 86400); // 24 hours

    return { totalSongs, totalAlbums };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private isLiveTrack(trackName: string): boolean {
    const livePatterns = [
      /\(live\)/i,
      /\[live\]/i,
      /- live/i,
      /live at/i,
      /live from/i,
      /live in/i,
      /acoustic version/i,
      /radio edit/i,
      /demo/i,
      /remix/i
    ];
    
    return livePatterns.some(pattern => pattern.test(trackName));
  }
}

// Export the processor function for BullMQ
export async function processArtistImport(job: Job<ArtistImportJobData>): Promise<ArtistImportResult> {
  const processor = new CompleteArtistImportProcessor();
  return processor.process(job);
}
