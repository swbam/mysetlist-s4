/**
 * Artist Import Orchestrator
 * Coordinates large-scale artist imports and manages background processing
 */

import { db, artists, venues, shows, songs, artistSongs } from '@repo/database';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { ProgressBus } from '../progress/ProgressBus';
import { TicketmasterIngest, type IngestResult } from '../ingest/ticketmaster-ingest';
import { SpotifyCatalogIngest, type CatalogIngestResult } from '../ingest/spotify-catalog-ingest';
import { getAttraction } from '../adapters/TicketmasterClient';
import { createSlug } from '../util/slug';
import { invalidateArtistCache } from '../../cache';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '../../cache';

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

export interface ImportConfig {
  ticketmasterApiKey?: string;
  spotifyClientId?: string;
  spotifyClientSecret?: string;
  concurrency: {
    albums: number;
    tracks: number;
    shows: number;
  };
  livenessThreshold: number;
  retryAttempts: number;
  phases: {
    identity: { timeoutMs: number };
    shows: { timeoutMs: number };
    catalog: { timeoutMs: number };
  };
}

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
 * Main artist import orchestrator for large-scale data processing
 */
export class ArtistImportOrchestrator {
  private config: ImportConfig;
  private progressReporter?: ReturnType<typeof ProgressBus.createReporter>;

  constructor(config: Partial<ImportConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Phase 1: Identity/Bootstrap (< 200ms) - Create artist record immediately
   */
  async initiateImport(tmAttractionId: string): Promise<{ artistId: string; slug: string }> {
    const startTime = Date.now();
    
    try {
      // Fetch artist details from Ticketmaster
      const attraction = await getAttraction(tmAttractionId, this.config.ticketmasterApiKey);
      
      if (!attraction) {
        throw new Error(`Attraction ${tmAttractionId} not found in Ticketmaster`);
      }

      // Generate proper slug from artist name
      const slug = attraction.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Extract external IDs
      const spotifyUrl = attraction.externalLinks?.spotify?.[0]?.url;
      const spotifyId = spotifyUrl ? spotifyUrl.split('/').pop() : null;
      const mbid = attraction.externalLinks?.musicbrainz?.[0]?.id || null;

      // Extract genres
      const genres = attraction.classifications?.map(c => 
        [c.genre?.name, c.subGenre?.name]
          .filter(Boolean)
          .join(', ')
      ).filter(Boolean) || [];

      // Get best image
      const imageUrl = attraction.images?.find((img: any) => img.width && img.width >= 500)?.url ||
                       attraction.images?.[0]?.url || null;
      const smallImageUrl = attraction.images?.find((img: any) => img.width && img.width < 500)?.url || imageUrl;
      
      // Upsert artist with full data from Ticketmaster
      const [artist] = await db
        .insert(artists)
        .values({
          tmAttractionId,
          name: attraction.name,
          slug,
          spotifyId,
          mbid,
          imageUrl,
          smallImageUrl,
          genres: JSON.stringify(genres),
          importStatus: 'initializing',
        })
        .onConflictDoUpdate({
          target: artists.tmAttractionId,
          set: {
            name: attraction.name,
            slug,
            spotifyId,
            mbid,
            imageUrl,
            smallImageUrl,
            genres: JSON.stringify(genres),
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
   * Full import orchestration with robust error handling and progress tracking
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

      // Phase 2: Shows & Venues Import using new ingest service
      if (this.progressReporter) {
        await this.progressReporter.report('importing-shows', 25, 'Starting shows and venues import...');
      }
      
      if (artist.tmAttractionId) {
        const ticketmasterIngest = new TicketmasterIngest({
          concurrency: this.config.concurrency.shows,
          progressReporter: this.progressReporter,
        });

        const showsResult = await ticketmasterIngest.ingest({
          artistId,
          tmAttractionId: artist.tmAttractionId,
          concurrency: this.config.concurrency.shows,
        });

        stats.showsImported = showsResult.newShows;
        stats.venuesImported = showsResult.newVenues;
        
        // Update artist with shows sync timestamp
        await db
          .update(artists)
          .set({ showsSyncedAt: new Date() })
          .where(eq(artists.id, artistId));
      }

      if (this.progressReporter) {
        await this.progressReporter.report('importing-shows', 70, `Imported ${stats.showsImported} shows`);
      }

      // Phase 3: Studio-Only Catalog Import using new ingest service
      if (this.progressReporter) {
        await this.progressReporter.report('importing-songs', 75, 'Starting studio catalog import...');
      }
      
      if (artist.spotifyId) {
        const spotifyIngest = new SpotifyCatalogIngest({
          concurrency: this.config.concurrency.tracks,
          progressReporter: this.progressReporter,
        });

        const catalogResult = await spotifyIngest.ingest({
          artistId,
          spotifyId: artist.spotifyId,
          concurrency: this.config.concurrency.tracks,
        });

        stats.songsImported = catalogResult.studioTracksIngested;
        
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

      // Phase 4: Wrap-up (cache invalidation, trending calculation)
      if (this.progressReporter) {
        await this.progressReporter.report('creating-setlists', 95, 'Starting wrap-up phase...');
      }
      
      await this.runWrapUpPhase(artistId);

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
          `Import completed: ${stats.songsImported} songs, ${stats.showsImported} shows`,
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
   * Batch import multiple artists with coordinated resource management
   */
  async runBatchImport(tmAttractionIds: string[]): Promise<ImportResult[]> {
    const results: ImportResult[] = [];
    
    // Process artists in smaller batches to manage resource usage
    const batchSize = 3;
    
    for (let i = 0; i < tmAttractionIds.length; i += batchSize) {
      const batch = tmAttractionIds.slice(i, i + batchSize);
      
      // Initialize all artists in the batch first
      const initializedArtists = await Promise.all(
        batch.map(async (tmAttractionId) => {
          try {
            const { artistId, slug } = await this.initiateImport(tmAttractionId);
            return { tmAttractionId, artistId, slug, success: true };
          } catch (error) {
            return { 
              tmAttractionId, 
              artistId: '', 
              slug: '', 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            };
          }
        })
      );
      
      // Run full imports for successfully initialized artists
      const batchResults = await Promise.all(
        initializedArtists.map(async (artist) => {
          if (!artist.success) {
            return {
              artistId: artist.artistId,
              slug: artist.slug,
              success: false,
              error: artist.error,
            };
          }
          
          try {
            return await this.runFullImport(artist.artistId);
          } catch (error) {
            return {
              artistId: artist.artistId,
              slug: artist.slug,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        })
      );
      
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Phase 4: Wrap-up with cache invalidation and trending updates
   */
  private async runWrapUpPhase(artistId: string): Promise<void> {
    try {
      if (this.progressReporter) {
        await this.progressReporter.report('creating-setlists', 96, 'Starting wrap-up phase...');
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
        await this.progressReporter.report('creating-setlists', 98, 'Invalidating caches...');
      }

      // Recalculate trending scores
      try {
        await db.execute(sql`SELECT update_trending_scores()`);
      } catch (error) {
        console.error('Failed to update trending scores:', error);
      }
      
      try {
        revalidateTag(CACHE_TAGS.trending);
      } catch (error) {
        console.error('Failed to revalidate trending cache:', error);
      }

      if (this.progressReporter) {
        await this.progressReporter.report('creating-setlists', 100, 'Wrap-up phase completed successfully');
      }

    } catch (error) {
      console.error('Wrap-up phase failed:', error);
      if (this.progressReporter) {
        await this.progressReporter.report(
          'creating-setlists', 
          95, 
          `Wrap-up phase failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
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

export async function runBatchImport(tmAttractionIds: string[], config?: Partial<ImportConfig>) {
  const orchestrator = new ArtistImportOrchestrator(config);
  return orchestrator.runBatchImport(tmAttractionIds);
}