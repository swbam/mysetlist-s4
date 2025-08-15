/**
 * ArtistImportOrchestrator - Main orchestration logic for 3-phase import
 * Implements GROK.md specifications for studio-only, high-performance artist imports
 */

import { db } from '@repo/database';
import { 
  artists, 
  venues, 
  shows, 
  songs, 
  artistSongs
} from '@repo/database';
import { eq, and, inArray } from 'drizzle-orm';
import { ProgressBus } from '../progress/ProgressBus';
import { fetchJson } from '../util/http';
import { pLimit, processBatch } from '../util/concurrency';
import { 
  createSlug, 
  cleanSongTitle, 
  isLikelyLiveTitle, 
  isLikelyLiveAlbum,
  isRemixTitle,
  generateMatchingKey 
} from '../util/strings';
import { setlistPreseeder } from '../ingest/SetlistPreseeder';
import { invalidateArtistCache } from '../../cache';

/**
 * Core orchestrator interface
 */
export interface ImportResult {
  artistId: string;
  slug: string;
  success: boolean;
  error?: string;
  stats?: {
    songsImported: number;
    showsImported: number;
    venuesImported: number;
    duration: number;
  };
}

/**
 * Configuration for import operations
 */
export interface ImportConfig {
  // API Configuration
  ticketmasterApiKey?: string;
  spotifyClientId?: string;
  spotifyClientSecret?: string;
  
  // Performance Configuration
  concurrency: {
    albums: number;
    tracks: number;
    shows: number;
  };
  
  // Quality Configuration
  livenessThreshold: number;
  retryAttempts: number;
  
  // Phase Configuration
  phases: {
    identity: { timeoutMs: number };
    shows: { timeoutMs: number };
    catalog: { timeoutMs: number };
  };
}

/**
 * Default configuration following GROK.md specifications
 */
const DEFAULT_CONFIG: ImportConfig = {
  ticketmasterApiKey: process.env.TICKETMASTER_API_KEY,
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  concurrency: {
    albums: 10,
    tracks: 5,
    shows: 3,
  },
  livenessThreshold: 0.8,
  retryAttempts: 3,
  phases: {
    identity: { timeoutMs: 200 },
    shows: { timeoutMs: 30000 },
    catalog: { timeoutMs: 45000 },
  },
};

/**
 * Main artist import orchestrator
 * Implements the 3-phase import strategy from GROK.md
 */
export class ArtistImportOrchestrator {
  private config: ImportConfig;
  private progressReporter?: ReturnType<typeof ProgressBus.createReporter>;

  constructor(config: Partial<ImportConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Phase 1: Identity/Bootstrap (< 200ms)
   * Creates artist record immediately for instant page loads
   */
  async initiateImport(tmAttractionId: string): Promise<{ artistId: string; slug: string }> {
    const startTime = Date.now();
    
    try {
      // Generate temporary slug
      const tempSlug = `tm-${tmAttractionId}`;
      
      // Upsert artist with minimal data for instant availability
      const [artist] = await db
        .insert(artists)
        .values({
          tmAttractionId,
          name: 'Loading...', // Temporary name
          slug: tempSlug,
          importStatus: 'initializing',
        })
        .onConflictDoUpdate({
          target: artists.tmAttractionId,
          set: {
            importStatus: 'initializing',
            lastSyncedAt: new Date(),
          },
        })
        .returning();

      if (!artist) {
        throw new Error('Failed to create artist record');
      }

      // Set up progress reporter
      this.progressReporter = ProgressBus.createReporter(artist.id, {
        artistName: artist.name,
        jobId: `import-${artist.id}-${Date.now()}`,
      });

      const duration = Date.now() - startTime;
      
      // Report initial progress
      if (this.progressReporter) {
        await this.progressReporter.report(
          'initializing',
          10,
          `Artist record created in ${duration}ms`
        );
      }

      return {
        artistId: artist.id,
        slug: artist.slug,
      };

    } catch (error) {
      console.error('Phase 1 Identity/Bootstrap failed:', error);
      throw new Error(`Failed to initialize artist import: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Full import orchestration with all 3 phases
   * Called by SSE handler to perform complete import
   */
  async runFullImport(artistId: string): Promise<ImportResult> {
    const startTime = Date.now();
    let stats = {
      songsImported: 0,
      showsImported: 0,
      venuesImported: 0,
      duration: 0,
    };

    try {
      // Get artist record
      const [artist] = await db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);

      if (!artist) {
        throw new Error(`Artist not found: ${artistId}`);
      }

      // Set up progress reporter
      this.progressReporter = ProgressBus.createReporter(artistId, {
        artistName: artist.name,
        jobId: `import-${artistId}-${Date.now()}`,
      });

      // Phase 2: Shows & Venues Import
      if (this.progressReporter) {
        await this.progressReporter.report('importing-shows', 25, 'Starting shows and venues import...');
      }
      
      if (artist.tmAttractionId) {
        const showStats = await this.importShowsAndVenues(artistId, artist.tmAttractionId);
        stats.showsImported = showStats.showsImported;
        stats.venuesImported = showStats.venuesImported;
        
        // Update artist with shows sync timestamp
        await db
          .update(artists)
          .set({ showsSyncedAt: new Date() })
          .where(eq(artists.id, artistId));
      }

      if (this.progressReporter) {
        await this.progressReporter.report('importing-shows', 70, `Imported ${stats.showsImported} shows`);
      }

      // Phase 3: Studio-Only Catalog Import
      if (this.progressReporter) {
        await this.progressReporter.report('importing-songs', 75, 'Starting studio catalog import...');
      }
      
      if (artist.spotifyId) {
        const catalogStats = await this.importStudioCatalog(artistId, artist.spotifyId);
        stats.songsImported = catalogStats.songsImported;
        
        // Update artist with catalog sync timestamp
        await db
          .update(artists)
          .set({ 
            songCatalogSyncedAt: new Date(),
            totalSongs: stats.songsImported 
          })
          .where(eq(artists.id, artistId));
      } else {
        if (this.progressReporter) {
          await this.progressReporter.report('importing-songs', 90, 'Skipped catalog (no Spotify ID)');
        }
      }

      // Phase 4: Wrap-up (setlists pre-seed, cache invalidation)
      if (this.progressReporter) {
        await this.progressReporter.report('wrap-up', 95, 'Starting wrap-up phase...');
      }
      
      const wrapUpResult = await this.runWrapUpPhase(artistId);

      // Mark import as complete
      await db
        .update(artists)
        .set({ 
          importStatus: 'completed',
          lastFullSyncAt: new Date() 
        })
        .where(eq(artists.id, artistId));

      stats.duration = Date.now() - startTime;
      
      if (this.progressReporter) {
        await this.progressReporter.reportComplete(
          `Import completed: ${stats.songsImported} songs, ${stats.showsImported} shows, ${wrapUpResult.setlistsCreated} setlists`,
          { stats }
        );
      }

      return {
        artistId,
        slug: artist.slug,
        success: true,
        stats,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Full import failed:', error);
      
      // Mark import as failed
      await db
        .update(artists)
        .set({ importStatus: 'failed' })
        .where(eq(artists.id, artistId));

      if (this.progressReporter) {
        await this.progressReporter.reportError(
          error instanceof Error ? error : new Error(errorMessage),
          'failed'
        );
      }

      return {
        artistId,
        slug: '',
        success: false,
        error: errorMessage,
        stats: { ...stats, duration: Date.now() - startTime },
      };
    }
  }

  /**
   * Phase 2: Import shows and venues from Ticketmaster
   * Implements paginated fetching with proper venue FK mapping
   */
  private async importShowsAndVenues(
    artistId: string,
    tmAttractionId: string
  ): Promise<{ showsImported: number; venuesImported: number }> {
    const { ticketmasterApiKey } = this.config;
    if (!ticketmasterApiKey) {
      throw new Error('Ticketmaster API key not configured');
    }

    let showsImported = 0;
    let venuesImported = 0;
    const venueMap = new Map<string, string>(); // tmVenueId -> dbVenueId

    const limit = pLimit(this.config.concurrency.shows);
    
    try {
      // Iterate through all pages of events
      for await (const events of this.iterateTicketmasterEvents(tmAttractionId, ticketmasterApiKey)) {
        // Process venues first
        const venueData = this.extractVenuesFromEvents(events);
        
        if (venueData.length > 0) {
          const newVenues = await this.upsertVenues(venueData);
          venuesImported += newVenues.length;
          
          // Update venue mapping
          newVenues.forEach(venue => {
            if (venue.tmVenueId) {
              venueMap.set(venue.tmVenueId, venue.id);
            }
          });
        }

        // Process shows with proper venue FK mapping
        const showData = this.extractShowsFromEvents(events, venueMap, artistId);
        
        if (showData.length > 0) {
          const newShows = await this.upsertShows(showData);
          showsImported += newShows.length;
        }

        // Report progress
        if (this.progressReporter) {
          await this.progressReporter.report(
            'importing-shows',
            Math.min(65, 25 + (showsImported / 50) * 40),
            `Processed ${showsImported} shows, ${venuesImported} venues`
          );
        }
      }

    } catch (error) {
      console.error('Shows/venues import failed:', error);
      throw error;
    }

    return { showsImported, venuesImported };
  }

  /**
   * Phase 3: Import studio-only catalog with ISRC deduplication
   * Implements GROK.md studio-only requirements with liveness filtering
   */
  private async importStudioCatalog(
    artistId: string,
    spotifyArtistId: string
  ): Promise<{ songsImported: number }> {
    const { spotifyClientId, spotifyClientSecret, livenessThreshold } = this.config;
    
    if (!spotifyClientId || !spotifyClientSecret) {
      throw new Error('Spotify credentials not configured');
    }

    try {
      // Get Spotify access token
      const token = await this.getSpotifyAccessToken(spotifyClientId, spotifyClientSecret);
      
      // Step 1: Get all albums (studio only by include_groups filter)
      const albums = await this.getSpotifyAlbums(spotifyArtistId, token);
      const studioAlbums = albums.filter(album => !isLikelyLiveAlbum(album.name));
      
      if (this.progressReporter) {
        await this.progressReporter.report(
          'importing-songs',
          78,
          `Found ${studioAlbums.length} studio albums`
        );
      }

      // Step 2: Get tracks from all albums with concurrency control
      const limit = pLimit(this.config.concurrency.albums);
      const allTracks: any[] = [];
      
      await processBatch(
        studioAlbums,
        async (album) => {
          const tracks = await this.getAlbumTracks(album.id, token);
          return tracks.filter(track => !isLikelyLiveTitle(track.name));
        },
        {
          concurrency: this.config.concurrency.albums,
          onProgress: (completed, total) => {
            const progress = 78 + (completed / total) * 10;
            if (this.progressReporter) {
              this.progressReporter.report(
                'importing-songs',
                Math.floor(progress),
                `Processing album ${completed}/${total}`
              );
            }
          },
        }
      ).then(results => {
        results.forEach(tracks => allTracks.push(...tracks));
      });

      // Step 3: Get full track details for ISRC and popularity
      const trackIds = Array.from(new Set(allTracks.map(t => t.id))).filter(Boolean);
      const trackDetails = await this.getTracksDetails(trackIds, token);
      
      if (this.progressReporter) {
        await this.progressReporter.report(
          'importing-songs',
          88,
          `Got details for ${trackDetails.length} tracks`
        );
      }

      // Step 4: Get audio features for liveness filtering
      const audioFeatures = await this.getAudioFeatures(trackIds, token);
      const featuresMap = new Map(audioFeatures.map(f => [f.id, f]));
      
      // Step 5: Filter to studio-only using liveness threshold
      const studioTracks = trackDetails.filter(track => {
        const features = featuresMap.get(track.id);
        return features && features.liveness <= livenessThreshold;
      });

      if (this.progressReporter) {
        await this.progressReporter.report(
          'importing-songs',
          92,
          `Filtered to ${studioTracks.length} studio tracks`
        );
      }

      // Step 6: Deduplicate by ISRC with popularity tie-breaker
      const deduplicatedTracks = this.deduplicateByISRC(studioTracks);
      
      // Step 7: Upsert songs and create artist-song relationships
      const songsImported = await this.upsertSongs(artistId, deduplicatedTracks, featuresMap);

      if (this.progressReporter) {
        await this.progressReporter.report(
          'importing-songs',
          95,
          `Imported ${songsImported} unique studio songs`
        );
      }

      return { songsImported };

    } catch (error) {
      console.error('Studio catalog import failed:', error);
      throw error;
    }
  }

  /**
   * Phase 4: Wrap-up (setlists pre-seed, cache invalidation)
   * Implements GROK.md Phase 4 requirements to complete import at 100%
   */
  private async runWrapUpPhase(artistId: string): Promise<{ setlistsCreated: number }> {
    try {
      if (this.progressReporter) {
        await this.progressReporter.report('wrap-up', 96, 'Starting wrap-up phase...');
      }

      // Step 1: Pre-seed setlists for upcoming shows
      if (this.progressReporter) {
        await this.progressReporter.report('wrap-up', 97, 'Creating initial setlists...');
      }

      const setlistResult = await setlistPreseeder.preseedSetlistsForArtist(artistId, {
        songsPerSetlist: 5,
        weightByPopularity: true,
        excludeLive: true,
        setlistName: 'Predicted Setlist',
      });

      if (this.progressReporter) {
        await this.progressReporter.report(
          'wrap-up', 
          98, 
          `Created ${setlistResult.setlistsCreated} setlists for ${setlistResult.showsProcessed} shows`
        );
      }

      // Step 2: Cache invalidation
      if (this.progressReporter) {
        await this.progressReporter.report('wrap-up', 99, 'Invalidating caches...');
      }

      // Get artist details for cache invalidation
      const [artist] = await db
        .select({ slug: artists.slug })
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);

      // Invalidate artist-related caches
      await invalidateArtistCache(artistId, artist?.slug);

      if (this.progressReporter) {
        await this.progressReporter.report('wrap-up', 100, 'Wrap-up phase completed successfully');
      }

      return { setlistsCreated: setlistResult.setlistsCreated };

    } catch (error) {
      console.error('Wrap-up phase failed:', error);
      // Don't throw - wrap-up failures shouldn't fail the entire import
      if (this.progressReporter) {
        await this.progressReporter.report(
          'wrap-up', 
          95, 
          `Wrap-up phase failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
      return { setlistsCreated: 0 };
    }
  }

  /**
   * Iterate through all Ticketmaster event pages
   */
  private async* iterateTicketmasterEvents(attractionId: string, apiKey: string) {
    const baseUrl = 'https://app.ticketmaster.com/discovery/v2';
    let page = 0;
    let totalPages = 1;

    while (page < totalPages) {
      const url = `${baseUrl}/events.json?attractionId=${encodeURIComponent(attractionId)}&size=200&page=${page}&apikey=${apiKey}`;
      
      const data = await fetchJson(url, {}, {
        tries: this.config.retryAttempts,
        baseDelay: 1000,
      });

      totalPages = data?.page?.totalPages ?? 0;
      const events = data?._embedded?.events ?? [];
      
      yield events;
      page++;
    }
  }

  /**
   * Extract venue data from Ticketmaster events
   */
  private extractVenuesFromEvents(events: any[]): any[] {
    const venuesMap = new Map();

    events.forEach(event => {
      const venue = event?._embedded?.venues?.[0];
      if (venue?.id && !venuesMap.has(venue.id)) {
        venuesMap.set(venue.id, {
          tmVenueId: venue.id,
          name: venue.name,
          city: venue.city?.name || '',
          state: venue.state?.stateCode || '',
          country: venue.country?.countryCode || 'US',
          address: venue.address?.line1 || '',
          postalCode: venue.postalCode || '',
          timezone: venue.timezone || 'America/New_York',
          latitude: venue.location?.latitude ? parseFloat(venue.location.latitude) : null,
          longitude: venue.location?.longitude ? parseFloat(venue.location.longitude) : null,
          slug: createSlug(venue.name),
        });
      }
    });

    return Array.from(venuesMap.values());
  }

  /**
   * Extract show data from Ticketmaster events
   */
  private extractShowsFromEvents(events: any[], venueMap: Map<string, string>, artistId: string): any[] {
    return events.map(event => {
      const venue = event?._embedded?.venues?.[0];
      const venueId = venue?.id ? venueMap.get(venue.id) : null;
      
      if (!venueId || !event.id) return null;

      const dateStr = event?.dates?.start?.dateTime ?? event?.dates?.start?.localDate;
      if (!dateStr) return null;

      return {
        tmEventId: event.id,
        headlinerArtistId: artistId,
        venueId,
        name: event.name || null,
        date: new Date(dateStr).toISOString().split('T')[0], // Date only
        ticketUrl: event.url || null,
        slug: event.name ? createSlug(`${event.name}-${dateStr}`) : null,
        status: 'upcoming',
      };
    }).filter(Boolean);
  }

  /**
   * Upsert venues to database
   */
  private async upsertVenues(venueData: any[]): Promise<any[]> {
    const results: any[] = [];
    
    for (const venue of venueData) {
      const [result] = await db
        .insert(venues)
        .values(venue)
        .onConflictDoUpdate({
          target: venues.tmVenueId,
          set: {
            name: venue.name,
            city: venue.city,
            state: venue.state,
            country: venue.country,
            address: venue.address,
            postalCode: venue.postalCode,
            timezone: venue.timezone,
            latitude: venue.latitude,
            longitude: venue.longitude,
            updatedAt: new Date(),
          },
        })
        .returning();
      
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Upsert shows to database
   */
  private async upsertShows(showData: any[]): Promise<any[]> {
    const results: any[] = [];
    
    for (const show of showData) {
      const [result] = await db
        .insert(shows)
        .values(show)
        .onConflictDoUpdate({
          target: shows.tmEventId,
          set: {
            headlinerArtistId: show.headlinerArtistId,
            venueId: show.venueId,
            name: show.name,
            date: show.date,
            ticketUrl: show.ticketUrl,
            status: show.status,
            updatedAt: new Date(),
          },
        })
        .returning();
      
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Get Spotify access token
   */
  private async getSpotifyAccessToken(clientId: string, clientSecret: string): Promise<string> {
    const response = await fetchJson('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.access_token) {
      throw new Error('Failed to get Spotify access token');
    }

    return response.access_token;
  }

  /**
   * Get artist albums from Spotify
   */
  private async getSpotifyAlbums(artistId: string, token: string): Promise<any[]> {
    let next = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=50&market=US`;
    const albums: any[] = [];

    while (next) {
      const data = await fetchJson(next, {
        headers: { Authorization: `Bearer ${token}` },
      });

      albums.push(...(data.items ?? []));
      next = data.next ?? null;
    }

    return albums;
  }

  /**
   * Get tracks from a specific album
   */
  private async getAlbumTracks(albumId: string, token: string): Promise<any[]> {
    let next = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`;
    const tracks: any[] = [];

    while (next) {
      const data = await fetchJson(next, {
        headers: { Authorization: `Bearer ${token}` },
      });

      tracks.push(...(data.items ?? []));
      next = data.next ?? null;
    }

    return tracks;
  }

  /**
   * Get detailed track information in batches
   */
  private async getTracksDetails(trackIds: string[], token: string): Promise<any[]> {
    const tracks: any[] = [];
    const batchSize = 50;

    for (let i = 0; i < trackIds.length; i += batchSize) {
      const batch = trackIds.slice(i, i + batchSize);
      const data = await fetchJson(
        `https://api.spotify.com/v1/tracks?ids=${batch.join(',')}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      tracks.push(...(data.tracks ?? []));
    }

    return tracks.filter(Boolean);
  }

  /**
   * Get audio features in batches
   */
  private async getAudioFeatures(trackIds: string[], token: string): Promise<any[]> {
    const features: any[] = [];
    const batchSize = 100;

    for (let i = 0; i < trackIds.length; i += batchSize) {
      const batch = trackIds.slice(i, i + batchSize);
      const data = await fetchJson(
        `https://api.spotify.com/v1/audio-features?ids=${batch.join(',')}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      features.push(...(data.audio_features ?? []).filter(Boolean));
    }

    return features;
  }

  /**
   * Deduplicate tracks by ISRC, preferring highest popularity
   */
  private deduplicateByISRC(tracks: any[]): any[] {
    const byKey = new Map<string, any>();

    for (const track of tracks) {
      const isrc = track?.external_ids?.isrc;
      const key = isrc || generateMatchingKey(
        cleanSongTitle(track.name || ''),
        Math.round((track.duration_ms || 0) / 1000).toString()
      );

      const existing = byKey.get(key);
      if (!existing || (track.popularity ?? 0) > (existing.popularity ?? 0)) {
        byKey.set(key, track);
      }
    }

    return Array.from(byKey.values());
  }

  /**
   * Upsert songs and create artist-song relationships
   */
  private async upsertSongs(
    artistId: string,
    tracks: any[],
    featuresMap: Map<string, any>
  ): Promise<number> {
    let songsImported = 0;

    for (const track of tracks) {
      const features = featuresMap.get(track.id);
      
      // Upsert song
      const [song] = await db
        .insert(songs)
        .values({
          spotifyId: track.id,
          name: cleanSongTitle(track.name),
          albumName: track.album?.name || null,
          artist: track.artists?.[0]?.name || 'Unknown',
          popularity: track.popularity || 0,
          isrc: track.external_ids?.isrc || null,
          durationMs: track.duration_ms || null,
          isLive: false, // Already filtered out
          isRemix: isRemixTitle(track.name),
          acousticness: features?.acousticness?.toString() || null,
          danceability: features?.danceability?.toString() || null,
          energy: features?.energy?.toString() || null,
          valence: features?.valence?.toString() || null,
        })
        .onConflictDoUpdate({
          target: songs.spotifyId,
          set: {
            name: cleanSongTitle(track.name),
            albumName: track.album?.name || null,
            popularity: track.popularity || 0,
            updatedAt: new Date(),
          },
        })
        .returning();

      if (!song) {
        continue;
      }

      // Create artist-song relationship
      await db
        .insert(artistSongs)
        .values({
          artistId,
          songId: song.id,
          isPrimaryArtist: true,
        })
        .onConflictDoNothing();

      songsImported++;
    }

    return songsImported;
  }
}

/**
 * Convenience functions for easier integration
 */
export async function initiateImport(tmAttractionId: string, config?: Partial<ImportConfig>) {
  const orchestrator = new ArtistImportOrchestrator(config);
  return orchestrator.initiateImport(tmAttractionId);
}

export async function runFullImport(artistId: string, config?: Partial<ImportConfig>) {
  const orchestrator = new ArtistImportOrchestrator(config);
  return orchestrator.runFullImport(artistId);
}