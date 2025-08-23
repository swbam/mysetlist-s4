// MySetlist-S4 Complete Artist Import Processor
// File: apps/web/lib/queues/processors/artist-import.processor.ts
// Enhanced implementation with 3-phase import system

import { Job } from "bullmq";
import { 
  db, 
  artists, 
  shows, 
  venues, 
  songs, 
  artistSongs, 
  setlists, 
  setlistSongs,
  eq, 
  sql, 
  and,
  desc 
} from "@repo/database";
import { SpotifyClient, TicketmasterClient } from "@repo/external-apis";
import { updateImportStatus } from "../../import-status";
import { ImportLogger } from "../../import-logger";
import { RedisClientFactory } from "../redis-config";

// Simple circuit breaker replacement for now
const circuitBreaker = {
  execute: async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      console.error('Circuit breaker caught error:', error);
      throw error;
    }
  }
};

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
  private static spotifyClient = new SpotifyClient({});
  private static ticketmasterClient = new TicketmasterClient({
    apiKey: process.env.TICKETMASTER_API_KEY || "",
  });

  static async process(job: Job<ArtistImportJobData>): Promise<ImportResult> {
    const { tmAttractionId, artistId, syncOnly = false } = job.data;
    const logger = new ImportLogger({
      artistId: artistId || "unknown",
      tmAttractionId,
      jobId: job.id || "unknown",
    });
    const startTime = Date.now();
    
    const phaseTimings = {
      phase1Duration: 0,
      phase2Duration: 0,
      phase3Duration: 0,
    };

    try {
      await logger.info("import-start", "Starting artist import process", { 
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
          job_id: job.id,
        });
      }

      let artist: any;
      
      // Phase 1: Basic artist data (must complete quickly < 3 seconds)
      const phase1Start = Date.now();
      if (!artistId || !syncOnly) {
        artist = await this.executePhase1(tmAttractionId, job, logger);
      } else {
        artist = await db
          .select()
          .from(artists)
          .where(eq(artists.id, artistId))
          .get();
      }
      phaseTimings.phase1Duration = Date.now() - phase1Start;

      if (!artist) {
        throw new Error("Failed to create or find artist");
      }

      // Update logger with actual artist ID
      if (logger.getJobId() !== artist.id) {
        logger.updateArtistId(artist.id);
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
      const showsResult = await this.executePhase2(artist, job, logger);
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
      const catalogResult = await this.executePhase3(artist, job, logger);
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

      const setlistsCreated = await this.createInitialSetlists(artist, showsResult.shows, logger);

      // Final completion
      await job.updateProgress(100);
      await updateImportStatus(artist.id, {
        stage: "completed",
        progress: 100,
        message: "Import completed successfully",
        completed_at: new Date(),
      });

      const totalDuration = Date.now() - startTime;
      
      await logger.success("import-complete", "Artist import completed", {
        artistId: artist.id,
        totalSongs: catalogResult.totalSongs,
        totalShows: showsResult.totalShows,
        totalVenues: showsResult.venuesCreated,
        setlistsCreated,
        duration: totalDuration,
        phaseTimings,
      });

      await logger.complete();

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
      
      await logger.error("import-failed", "Artist import failed", error);
      await logger.complete();
      
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

  private static async executePhase1(tmAttractionId: string, job: Job, logger: ImportLogger): Promise<any> {
    await logger.info("phase1-start", "Starting Phase 1: Basic artist data");
    
    // Get artist data from Ticketmaster with circuit breaker
    const tmArtist = await circuitBreaker.execute(async () => 
      this.ticketmasterClient.getAttraction(tmAttractionId)
    );
    
    if (!tmArtist) {
      throw new Error(`Artist not found in Ticketmaster: ${tmAttractionId}`);
    }

    await job.updateProgress(5);

    // Search for Spotify ID
    let spotifyId: string | undefined;
    let spotifyData: any = null;

    try {
      await this.spotifyClient.authenticate();
      
      const searchResults = await circuitBreaker.execute(async () =>
        this.spotifyClient.searchArtists(tmArtist.name, 5)
      );
      
      if (searchResults.artists?.items?.length > 0) {
        // Find best match (exact name match or highest popularity)
        const exactMatch = searchResults.artists.items.find(
          artist => artist.name.toLowerCase() === tmArtist.name.toLowerCase()
        );
        
        const selectedArtist = exactMatch || searchResults.artists.items[0];
        spotifyId = selectedArtist.id;
        spotifyData = selectedArtist;
        
        await logger.info("spotify-match", `Found Spotify match: ${selectedArtist.name} (${spotifyId})`);
      }
    } catch (error) {
      await logger.warning("spotify-lookup", "Failed to find Spotify ID", error);
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
    const [artist] = await db
      .insert(artists)
      .values({
        tmAttractionId,
        spotifyId,
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

    await job.updateProgress(15);

    await logger.success("phase1-complete", `Created artist ${artist.name} (${artist.id})`);
    return artist;
  }

  private static async executePhase2(artist: any, job: Job, logger: ImportLogger): Promise<{
    totalShows: number;
    venuesCreated: number;
    shows: any[];
  }> {
    await logger.info("phase2-start", "Starting Phase 2: Shows and venues");
    
    if (!artist.tmAttractionId) {
      return { totalShows: 0, venuesCreated: 0, shows: [] };
    }

    // Fetch events from Ticketmaster
    const events = await circuitBreaker.execute(async () =>
      this.ticketmasterClient.getArtistEvents(artist.tmAttractionId)
    );
    
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
            const existingVenue = await db
              .select({ id: venues.id })
              .from(venues)
              .where(eq(venues.tmVenueId, venueData.id))
              .get();

            if (existingVenue) {
              venueId = existingVenue.id;
            } else {
              // Create venue
              const [newVenue] = await db
                .insert(venues)
                .values({
                  tmVenueId: venueData.id,
                  name: venueData.name,
                  address: venueData.address ? JSON.stringify(venueData.address) : null,
                  city: venueData.city?.name,
                  state: venueData.state?.name,
                  country: venueData.country?.name,
                  postalCode: venueData.postalCode,
                  timezone: venueData.timezone,
                  capacity: venueData.capacity,
                  imageUrl: venueData.images?.[0]?.url,
                })
                .returning();
              
              venueId = newVenue.id;
              venuesCreated++;
            }
          }

          // Create show
          const showSlug = this.generateShowSlug(artist.name, venueId || 'venue', event.dates?.start?.localDate);
          
          const [show] = await db
            .insert(shows)
            .values({
              headlinerArtistId: artist.id,
              venueId,
              name: event.name,
              slug: showSlug,
              date: event.dates?.start?.localDate,
              startTime: event.dates?.start?.localTime,
              doorsTime: event.dates?.start?.doorTime || null,
              status: this.getShowStatus(event.dates?.start?.localDate),
              description: event.info || null,
              ticketUrl: event.url,
              minPrice: event.priceRanges?.[0]?.min,
              maxPrice: event.priceRanges?.[0]?.max,
              currency: event.priceRanges?.[0]?.currency || "USD",
              tmEventId: event.id,
            })
            .returning();

          createdShows.push(show);
          totalShows++;

        } catch (error) {
          await logger.warning("show-create", `Failed to create show for event ${event.id}`, error);
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

    await logger.success("phase2-complete", `Created ${totalShows} shows and ${venuesCreated} venues`);
    return { totalShows, venuesCreated, shows: createdShows };
  }

  private static async executePhase3(artist: any, job: Job, logger: ImportLogger): Promise<{
    totalSongs: number;
    totalAlbums: number;
  }> {
    await logger.info("phase3-start", "Starting Phase 3: Song catalog");
    
    if (!artist.spotifyId) {
      await logger.warning("phase3-skip", "No Spotify ID, skipping song catalog sync");
      return { totalSongs: 0, totalAlbums: 0 };
    }

    await job.updateProgress(65);

    // Get artist's albums from Spotify
    const albums = await circuitBreaker.execute(async () =>
      this.spotifyClient.getArtistAlbums(artist.spotifyId, {
        include_groups: 'album,single',
        market: 'US',
        limit: 50,
      })
    );

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
          const tracks = await circuitBreaker.execute(async () =>
            this.spotifyClient.getAlbumTracks(album.id)
          );
          
          for (const track of tracks) {
            // Skip if already processed (handles duplicates across albums)
            if (processedTracks.has(track.id)) {
              continue;
            }
            
            // Skip live versions for studio albums
            if (this.isLiveTrack(track.name) && album.album_type === 'album') {
              continue;
            }

            // Create song record
            try {
              const [song] = await db
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

            } catch (error) {
              // Skip duplicate songs
              if (!error.message?.includes('unique constraint')) {
                await logger.warning("song-create", `Failed to create song ${track.name}`, error);
              }
            }
          }

        } catch (error) {
          await logger.warning("album-process", `Failed to process album ${album.name}`, error);
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

    await logger.success("phase3-complete", `Imported ${totalSongs} songs from ${totalAlbums} albums`);
    return { totalSongs, totalAlbums };
  }

  private static async createInitialSetlists(artist: any, shows: any[], logger: ImportLogger): Promise<number> {
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
        const [setlist] = await db
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

        // Add songs to setlist (top 15-20 songs)
        const setlistSongsList = popularSongs.slice(0, Math.min(18, popularSongs.length));
        
        for (let i = 0; i < setlistSongsList.length; i++) {
          await db
            .insert(setlistSongs)
            .values({
              setlistId: setlist.id,
              songId: setlistSongsList[i].id,
              position: i + 1,
            });
        }

        setlistsCreated++;
      } catch (error) {
        await logger.warning("setlist-create", `Failed to create setlist for show ${show.id}`, error);
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
      const existing = await db
        .select({ id: artists.id })
        .from(artists)
        .where(eq(artists.slug, slug))
        .get();

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

// Export for backward compatibility
export const processArtistImport = ArtistImportProcessor.process;
export default ArtistImportProcessor;