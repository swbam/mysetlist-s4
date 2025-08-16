import {
  artists,
  artistSongs,
  db,
  eq,
  shows,
  songs,
  sql,
  venues,
  syncJobs,
  syncProgress,
  setlists,
  setlistSongs,
} from "@repo/database";
import { 
  SpotifyClient, 
  TicketmasterClient,
  ArtistSyncService,
  ShowSyncService,
  VenueSyncService
} from "@repo/external-apis";
import { ImportLogger } from "~/lib/import-logger";
import { updateImportStatus } from "~/lib/import-status";
import { CacheManager } from "./cache-manager";

// ================================
// Types and Interfaces
// ================================

export interface ImportTask {
  id: string;
  type: 'spotify-artist' | 'spotify-albums' | 'spotify-tracks' | 
        'ticketmaster-shows' | 'ticketmaster-venues' | 'setlists';
  priority: 1 | 2 | 3;
  artistId: string;
  spotifyId?: string;
  tmAttractionId?: string;
  data?: any;
  retryCount?: number;
  maxRetries?: number;
}

export interface ImportProgress {
  stage: string;
  progress: number;
  message: string;
  error?: string;
  artistId?: string;
  totalSongs?: number;
  totalShows?: number;
  totalVenues?: number;
  timestamp: number;
  estimatedTimeRemaining?: number;
  substeps?: Array<{
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
  }>;
}

export interface ImportResult {
  success: boolean;
  artistId: string;
  slug: string;
  totalSongs: number;
  totalShows: number;
  totalVenues: number;
  importDuration: number;
  cached: boolean;
  phases: {
    phase1: { duration: number; cached: boolean };
    phase2: { duration: number; items: number };
    phase3: { duration: number; items: number };
  };
}

// ================================
// Worker Pool for Parallel Processing
// ================================

class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: ImportTask[] = [];
  private activeWorkers = 0;
  private maxWorkers: number;
  private results = new Map<string, any>();
  private callbacks = new Map<string, (result: any) => void>();

  constructor(maxWorkers = 10) {
    this.maxWorkers = maxWorkers;
  }

  async dispatch(tasks: ImportTask[]): Promise<Map<string, any>> {
    // Sort by priority
    const sortedTasks = tasks.sort((a, b) => a.priority - b.priority);
    this.taskQueue.push(...sortedTasks);
    
    // Start processing
    const promises: Promise<void>[] = [];
    while (this.taskQueue.length > 0 && this.activeWorkers < this.maxWorkers) {
      const task = this.taskQueue.shift()!;
      promises.push(this.processTask(task));
    }
    
    // Wait for all tasks to complete
    await Promise.all(promises);
    return this.results;
  }

  private async processTask(task: ImportTask): Promise<void> {
    this.activeWorkers++;
    
    try {
      const result = await this.executeTask(task);
      this.results.set(task.id, result);
      
      // Execute callback if exists
      const callback = this.callbacks.get(task.id);
      if (callback) {
        callback(result);
        this.callbacks.delete(task.id);
      }
    } catch (error) {
      console.error(`Task ${task.id} failed:`, error);
      
      // Retry logic
      if (task.retryCount === undefined) task.retryCount = 0;
      if (task.maxRetries === undefined) task.maxRetries = 3;
      
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, task.retryCount) * 1000));
        this.taskQueue.push(task);
      } else {
        this.results.set(task.id, { error: error.message });
      }
    } finally {
      this.activeWorkers--;
      
      // Process next task if available
      if (this.taskQueue.length > 0 && this.activeWorkers < this.maxWorkers) {
        const nextTask = this.taskQueue.shift()!;
        await this.processTask(nextTask);
      }
    }
  }

  private async executeTask(task: ImportTask): Promise<any> {
    const spotifyClient = new SpotifyClient({});
    const ticketmasterClient = new TicketmasterClient({
      apiKey: process.env.TICKETMASTER_API_KEY || "",
    });

    switch (task.type) {
      case 'spotify-artist':
        await spotifyClient.authenticate();
        return await spotifyClient.getArtist(task.spotifyId!);
        
      case 'spotify-albums':
        await spotifyClient.authenticate();
        return await this.fetchAllAlbums(spotifyClient, task.spotifyId!);
        
      case 'spotify-tracks':
        await spotifyClient.authenticate();
        return await this.fetchAllTracks(spotifyClient, task.data.albums);
        
      case 'ticketmaster-shows':
        return await this.fetchShows(ticketmasterClient, task.tmAttractionId!);
        
      case 'ticketmaster-venues':
        return await this.fetchVenues(task.data.shows);
        
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  private async fetchAllAlbums(spotify: SpotifyClient, artistId: string) {
    const albumTypes = ['album', 'single'];
    const results = await Promise.all(
      albumTypes.map(type => 
        spotify.getArtistAlbums(artistId, { 
          album_type: type, 
          limit: 50,
          market: 'US'
        })
      )
    );
    
    return results.flat();
  }

  private async fetchAllTracks(spotify: SpotifyClient, albums: any[]) {
    const chunks = this.chunkArray(albums, 10);
    const allTracks = [];
    
    for (const chunk of chunks) {
      const tracks = await Promise.all(
        chunk.map(album => spotify.getAlbumTracks(album.id))
      );
      allTracks.push(...tracks.flat());
    }
    
    return this.filterStudioTracks(allTracks);
  }

  private filterStudioTracks(tracks: any[]) {
    const seen = new Set<string>();
    return tracks.filter(track => {
      const name = track.name.toLowerCase();
      const album = track.album?.name?.toLowerCase() || '';
      
      // Exclude live recordings
      if (name.includes('(live') || 
          name.includes(' - live') ||
          album.includes('live at') ||
          album.includes('unplugged')) {
        return false;
      }
      
      // Exclude remixes, acoustic versions, radio edits
      if (name.includes('remix') ||
          name.includes('acoustic') ||
          name.includes('radio edit') ||
          name.includes('demo') ||
          name.includes('instrumental')) {
        return false;
      }
      
      // Deduplicate by normalized name
      const normalized = name.replace(/[^a-z0-9]/g, '');
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      
      return true;
    });
  }

  private async fetchShows(ticketmaster: TicketmasterClient, attractionId: string) {
    const events = await ticketmaster.getAttractionEvents(attractionId);
    return events || [];
  }

  private async fetchVenues(shows: any[]) {
    const uniqueVenues = new Map();
    
    shows.forEach(show => {
      if (show._embedded?.venues?.[0]) {
        const venue = show._embedded.venues[0];
        if (!uniqueVenues.has(venue.id)) {
          uniqueVenues.set(venue.id, venue);
        }
      }
    });
    
    return Array.from(uniqueVenues.values());
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  onTaskComplete(taskId: string, callback: (result: any) => void) {
    this.callbacks.set(taskId, callback);
  }
}

// ================================
// Predictive Cache Manager
// ================================

class PredictiveCache {
  private cache = new Map<string, any>();
  private predictions = new Map<string, string[]>();
  private importQueue = new Set<string>();
  
  async prefetchLikelyArtists(searchQuery: string) {
    if (searchQuery.length < 2) return;
    
    // Predict top 3 likely artists based on search
    const predictions = await this.predictArtists(searchQuery);
    
    // Store predictions
    this.predictions.set(searchQuery, predictions.map(p => p.tmAttractionId));
    
    // Silently import in background before user clicks
    predictions.forEach(artist => {
      if (!this.importQueue.has(artist.tmAttractionId)) {
        this.importQueue.add(artist.tmAttractionId);
        this.backgroundImport(artist.tmAttractionId);
      }
    });
  }
  
  private async predictArtists(query: string): Promise<any[]> {
    const ticketmaster = new TicketmasterClient({
      apiKey: process.env.TICKETMASTER_API_KEY || "",
    });
    
    try {
      const results = await ticketmaster.searchAttractions(query, {
        size: 3,
        classificationName: 'music'
      });
      
      return results?._embedded?.attractions || [];
    } catch {
      return [];
    }
  }
  
  private async backgroundImport(tmAttractionId: string) {
    try {
      const service = new UltraFastImportService();
      const result = await service.importArtist(tmAttractionId, { 
        background: true,
        priority: 'low' 
      });
      
      // Cache the result
      this.cache.set(tmAttractionId, result);
      
      // Remove from queue
      this.importQueue.delete(tmAttractionId);
    } catch (error) {
      console.error(`Background import failed for ${tmAttractionId}:`, error);
      this.importQueue.delete(tmAttractionId);
    }
  }
  
  getCached(tmAttractionId: string): any | null {
    return this.cache.get(tmAttractionId) || null;
  }
  
  isPredicted(query: string, tmAttractionId: string): boolean {
    const predictions = this.predictions.get(query) || [];
    return predictions.includes(tmAttractionId);
  }
}

// ================================
// Main Ultra-Fast Import Service
// ================================

export class UltraFastImportService {
  private workers = new WorkerPool(10);
  private cache = new CacheManager();
  private predictiveCache = new PredictiveCache();
  private progressCallbacks = new Map<string, (progress: ImportProgress) => void>();
  private logger?: ImportLogger;
  
  constructor() {
    // Initialize services
  }

  /**
   * Ultra-fast artist import with < 3s initial load
   */
  async importArtist(
    tmAttractionId: string, 
    options: {
      background?: boolean;
      priority?: 'high' | 'normal' | 'low';
      progressCallback?: (progress: ImportProgress) => void;
      jobId?: string;
    } = {}
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const jobId = options.jobId || `import_${tmAttractionId}_${Date.now()}`;
    
    // Check predictive cache first
    const cached = this.predictiveCache.getCached(tmAttractionId);
    if (cached) {
      return { ...cached, cached: true };
    }
    
    // Register progress callback
    if (options.progressCallback) {
      this.progressCallbacks.set(jobId, options.progressCallback);
    }
    
    // Initialize logger
    this.logger = new ImportLogger({
      artistId: `tmp_${tmAttractionId}`,
      tmAttractionId: tmAttractionId,
    });
    
    try {
      // Create sync job record
      const [syncJob] = await db
        .insert(syncJobs)
        .values({
          entityType: 'artist',
          entityId: tmAttractionId,
          ticketmasterId: tmAttractionId,
          status: 'in_progress',
          priority: options.priority === 'high' ? 1 : options.priority === 'low' ? 3 : 2,
          jobType: 'full_sync',
          totalSteps: 3,
          completedSteps: 0,
          currentStep: 'phase1',
          startedAt: new Date(),
        })
        .returning();
      
      // Phase 1: Create placeholder immediately (< 100ms)
      const phase1Start = Date.now();
      await this.updateProgress(jobId, {
        stage: 'initializing',
        progress: 5,
        message: 'Creating artist placeholder...',
        timestamp: Date.now(),
      });
      
      const artist = await this.createPlaceholder(tmAttractionId);
      const phase1Duration = Date.now() - phase1Start;
      
      // Update logger with real artist ID
      this.logger.updateArtistId(artist.id);
      
      await this.updateProgress(jobId, {
        stage: 'phase1_complete',
        progress: 25,
        message: `Artist "${artist.name}" ready! Loading in background...`,
        artistId: artist.id,
        timestamp: Date.now(),
      });
      
      // Fire all imports in parallel (non-blocking)
      const phase2Start = Date.now();
      const phase3Start = Date.now();
      
      const tasks: ImportTask[] = [
        {
          id: `${jobId}_spotify_artist`,
          type: 'spotify-artist',
          priority: 1,
          artistId: artist.id,
          spotifyId: artist.spotifyId,
        },
        {
          id: `${jobId}_tm_shows`,
          type: 'ticketmaster-shows',
          priority: 1,
          artistId: artist.id,
          tmAttractionId: tmAttractionId,
        },
      ];
      
      // Dispatch parallel tasks
      this.workers.dispatch(tasks).then(async (results) => {
        // Phase 2: Process shows and venues
        const showsResult = results.get(`${jobId}_tm_shows`);
        if (showsResult && !showsResult.error) {
          await this.processShows(artist.id, showsResult);
          
          const venueTasks: ImportTask[] = [{
            id: `${jobId}_venues`,
            type: 'ticketmaster-venues',
            priority: 2,
            artistId: artist.id,
            data: { shows: showsResult }
          }];
          
          const venueResults = await this.workers.dispatch(venueTasks);
          const venues = venueResults.get(`${jobId}_venues`);
          if (venues && !venues.error) {
            await this.processVenues(venues);
          }
        }
        
        // Phase 3: Import complete song catalog
        if (artist.spotifyId) {
          const albumTasks: ImportTask[] = [{
            id: `${jobId}_albums`,
            type: 'spotify-albums',
            priority: 2,
            artistId: artist.id,
            spotifyId: artist.spotifyId,
          }];
          
          const albumResults = await this.workers.dispatch(albumTasks);
          const albums = albumResults.get(`${jobId}_albums`);
          
          if (albums && !albums.error) {
            const trackTasks: ImportTask[] = [{
              id: `${jobId}_tracks`,
              type: 'spotify-tracks',
              priority: 3,
              artistId: artist.id,
              data: { albums }
            }];
            
            const trackResults = await this.workers.dispatch(trackTasks);
            const tracks = trackResults.get(`${jobId}_tracks`);
            
            if (tracks && !tracks.error) {
              await this.processSongs(artist.id, tracks);
            }
          }
        }
        
        // Update sync job as completed
        await db
          .update(syncJobs)
          .set({
            status: 'completed',
            completedSteps: 3,
            completedAt: new Date(),
          })
          .where(eq(syncJobs.id, syncJob.id));
        
        await this.updateProgress(jobId, {
          stage: 'completed',
          progress: 100,
          message: 'Import completed successfully!',
          artistId: artist.id,
          timestamp: Date.now(),
        });
      }).catch(async (error) => {
        console.error('Background import failed:', error);
        
        await db
          .update(syncJobs)
          .set({
            status: 'failed',
            error: error.message,
          })
          .where(eq(syncJobs.id, syncJob.id));
      });
      
      const totalDuration = Date.now() - startTime;
      
      // Return immediately, don't wait for background tasks
      return {
        success: true,
        artistId: artist.id,
        slug: artist.slug,
        totalSongs: 0, // Will be updated in background
        totalShows: 0, // Will be updated in background
        totalVenues: 0, // Will be updated in background
        importDuration: totalDuration,
        cached: false,
        phases: {
          phase1: { duration: phase1Duration, cached: false },
          phase2: { duration: 0, items: 0 },
          phase3: { duration: 0, items: 0 },
        },
      };
      
    } catch (error) {
      console.error('Import failed:', error);
      
      await this.updateProgress(jobId, {
        stage: 'failed',
        progress: 0,
        message: 'Import failed',
        error: error.message,
        timestamp: Date.now(),
      });
      
      throw error;
    } finally {
      // Clean up progress callback
      this.progressCallbacks.delete(jobId);
    }
  }

  /**
   * Create artist placeholder with minimal data
   */
  private async createPlaceholder(tmAttractionId: string): Promise<any> {
    const ticketmaster = new TicketmasterClient({
      apiKey: process.env.TICKETMASTER_API_KEY || "",
    });
    
    // Get basic data from Ticketmaster
    const tmArtist = await ticketmaster.getAttraction(tmAttractionId);
    
    if (!tmArtist || !tmArtist.name) {
      throw new Error(`Artist not found: ${tmAttractionId}`);
    }
    
    // Quick Spotify lookup (with 1s timeout)
    let spotifyData: any = null;
    try {
      const spotify = new SpotifyClient({});
      await spotify.authenticate();
      
      const searchPromise = spotify.searchArtists(tmArtist.name, 1);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 1000)
      );
      
      const searchResult = await Promise.race([searchPromise, timeoutPromise]) as any;
      
      if (searchResult?.artists?.items?.[0]) {
        spotifyData = searchResult.artists.items[0];
      }
    } catch {
      // Continue without Spotify data
    }
    
    // Create artist record
    const slug = this.generateSlug(spotifyData?.name || tmArtist.name);
    
    const [artist] = await db
      .insert(artists)
      .values({
        tmAttractionId: tmAttractionId,
        spotifyId: spotifyData?.id || null,
        name: spotifyData?.name || tmArtist.name,
        slug,
        imageUrl: spotifyData?.images?.[0]?.url || tmArtist.images?.[0]?.url || null,
        smallImageUrl: spotifyData?.images?.[2]?.url || null,
        genres: JSON.stringify(spotifyData?.genres || tmArtist.classifications?.[0]?.genre?.name ? [tmArtist.classifications[.genre.name] : []),
        popularity: spotifyData?.popularity || 0,
        followers: spotifyData?.followers?.total || 0,
        externalUrls: JSON.stringify(spotifyData?.external_urls || {}),
        verified: false,
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: artists.tmAttractionId,
        set: {
          spotifyId: spotifyData?.id || null,
          name: spotifyData?.name || tmArtist.name,
          imageUrl: spotifyData?.images?.[0]?.url || tmArtist.images?.[0]?.url || null,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    return artist;
  }

  /**
   * Process and store shows
   */
  private async processShows(artistId: string, showsData: any[]) {
    if (!showsData || showsData.length === 0) return;
    
    const showRecords = showsData.map(show => ({
      tmEventId: show.id,
      headlinerArtistId: artistId,
      name: show.name,
      date: new Date(show.dates?.start?.dateTime || show.dates?.start?.localDate),
      venueId: null, // Will be linked later
      timezone: show.dates?.timezone || null,
      status: show.dates?.status?.code || 'scheduled',
      priceMin: show.priceRanges?.[0]?.min || null,
      priceMax: show.priceRanges?.[0]?.max || null,
      ticketUrl: show.url || null,
      imageUrl: show.images?.[0]?.url || null,
      smallImageUrl: show.images?.[2]?.url || null,
      seatmapUrl: show.seatmap?.staticUrl || null,
      rawData: JSON.stringify(show),
    }));
    
    await db
      .insert(shows)
      .values(showRecords as any)
      .onConflictDoNothing();
  }

  /**
   * Process and store venues
   */
  private async processVenues(venuesData: any[]) {
    if (!venuesData || venuesData.length === 0) return;
    
    const venueRecords = venuesData.map(venue => ({
      tmVenueId: venue.id,
      name: venue.name,
      city: venue.city?.name || null,
      state: venue.state?.stateCode || venue.state?.name || null,
      country: venue.country?.countryCode || venue.country?.name || null,
      address: venue.address?.line1 || null,
      postalCode: venue.postalCode || null,
      latitude: venue.location?.latitude ? parseFloat(venue.location.latitude) : null,
      longitude: venue.location?.longitude ? parseFloat(venue.location.longitude) : null,
      timezone: venue.timezone || null,
      url: venue.url || null,
      imageUrl: venue.images?.[0]?.url || null,
      capacity: venue.generalInfo?.generalRule || null,
      rawData: JSON.stringify(venue),
    }));
    
    await db
      .insert(venues)
      .values(venueRecords as any)
      .onConflictDoNothing();
    
    // Link venues to shows
    for (const venue of venuesData) {
      await db.execute(sql`
        UPDATE ${shows}
        SET venue_id = (
          SELECT id FROM ${venues} WHERE tm_venue_id = ${venue.id} LIMIT 1
        )
        WHERE raw_data::jsonb -> '_embedded' -> 'venues' -> 0 ->> 'id' = ${venue.id}
      `);
    }
  }

  /**
   * Process and store songs
   */
  private async processSongs(artistId: string, tracksData: any[]) {
    if (!tracksData || tracksData.length === 0) return;
    
    // Deduplicate tracks
    const uniqueTracks = new Map<string, any>();
    tracksData.forEach(track => {
      const key = this.normalizeTitle(track.name);
      if (!uniqueTracks.has(key) || track.popularity > uniqueTracks.get(key).popularity) {
        uniqueTracks.set(key, track);
      }
    });
    
    const songRecords = Array.from(uniqueTracks.values()).map(track => ({
      spotifyId: track.id,
      name: track.name,
      duration: track.duration_ms || null,
      explicit: track.explicit || false,
      popularity: track.popularity || 0,
      previewUrl: track.preview_url || null,
      spotifyUrl: track.external_urls?.spotify || null,
      albumId: track.album?.id || null,
      albumName: track.album?.name || null,
      albumArt: track.album?.images?.[0]?.url || null,
      releaseDate: track.album?.release_date || null,
      artistIds: JSON.stringify(track.artists?.map((a: any) => a.id) || []),
      artistNames: JSON.stringify(track.artists?.map((a: any) => a.name) || []),
      trackNumber: track.track_number || null,
      discNumber: track.disc_number || null,
      isrc: track.external_ids?.isrc || null,
      rawData: JSON.stringify(track),
    }));
    
    // Insert songs
    const insertedSongs = await db
      .insert(songs)
      .values(songRecords as any)
      .onConflictDoUpdate({
        target: songs.spotifyId,
        set: {
          popularity: sql`GREATEST(${songs.popularity}, EXCLUDED.popularity)`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: songs.id, spotifyId: songs.spotifyId });
    
    // Link songs to artist
    const artistSongRecords = insertedSongs.map(song => ({
      artistId: artistId,
      songId: song.id,
    }));
    
    await db
      .insert(artistSongs)
      .values(artistSongRecords)
      .onConflictDoNothing();
    
    // Update artist song count
    await db.execute(sql`
      UPDATE ${artists}
      SET total_songs = (
        SELECT COUNT(*) FROM ${artistSongs} WHERE artist_id = ${artistId}
      )
      WHERE id = ${artistId}
    `);
  }

  /**
   * Update progress and notify callbacks
   */
  private async updateProgress(jobId: string, progress: ImportProgress) {
    // Update import status
    if (progress.artistId) {
      await updateImportStatus(progress.artistId, {
        stage: progress.stage,
        progress: progress.progress,
        message: progress.message,
        error: progress.error,
      });
    }
    
    // Notify callback
    const callback = this.progressCallbacks.get(jobId);
    if (callback) {
      callback(progress);
    }
    
    // Log progress
    if (this.logger) {
      await this.logger.info(progress.stage, progress.message, {
        progress: progress.progress,
        artistId: progress.artistId,
      });
    }
  }

  /**
   * Generate URL-safe slug
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * Normalize title for deduplication
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  /**
   * Prefetch likely artists based on search
   */
  async prefetchArtists(searchQuery: string) {
    await this.predictiveCache.prefetchLikelyArtists(searchQuery);
  }
}