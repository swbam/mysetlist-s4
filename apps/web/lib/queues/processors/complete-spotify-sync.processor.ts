import { Job } from "bullmq";
import { eq } from "drizzle-orm";
import { 
  db, 
  artists, 
  songs,
  albums,
  artistSongs,
  artistAlbums
} from "@repo/database";
import { SpotifyClient } from "@repo/external-apis";
import { spotifyCircuitBreaker } from "~/lib/services/circuit-breaker";
import { redisCache } from "~/lib/redis/production-redis-config";
import { ImportLogger } from "~/lib/import-logger";

interface SpotifySyncJobData {
  artistId: string;
  spotifyId: string;
  syncType: 'profile' | 'albums' | 'tracks' | 'full' | 'features';
  options?: {
    forceRefresh?: boolean;
    includeFeatures?: boolean;
    maxAlbums?: number;
    maxTracks?: number;
  };
}

interface SpotifySyncResult {
  success: boolean;
  syncType: string;
  artistId: string;
  artistName: string;
  results: {
    profileUpdated?: boolean;
    albumsProcessed?: number;
    tracksProcessed?: number;
    featuresUpdated?: number;
  };
  errors: string[];
  duration: number;
}

export class CompleteSpotifySyncProcessor {
  private spotifyClient: SpotifyClient;
  private logger: ImportLogger;

  constructor() {
    this.spotifyClient = new SpotifyClient({});
    this.logger = new ImportLogger("spotify-sync");
  }

  async process(job: Job<SpotifySyncJobData>): Promise<SpotifySyncResult> {
    const startTime = Date.now();
    const { artistId, spotifyId, syncType, options = {} } = job.data;
    const errors: string[] = [];
    const results: SpotifySyncResult['results'] = {};

    try {
      this.logger.info(`Starting Spotify ${syncType} sync`, { artistId, spotifyId });

      // Get artist from database
      const artist = await db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .get();

      if (!artist) {
        throw new Error(`Artist ${artistId} not found`);
      }

      // Authenticate with Spotify
      await spotifyCircuitBreaker.execute(async () => {
        await this.spotifyClient.authenticate();
      });

      await job.updateProgress(10);

      // Execute sync based on type
      switch (syncType) {
        case 'profile':
          results.profileUpdated = await this.syncArtistProfile(artist, spotifyId, job);
          break;

        case 'albums':
          results.albumsProcessed = await this.syncArtistAlbums(
            artist, 
            spotifyId, 
            job,
            options.maxAlbums
          );
          break;

        case 'tracks':
          results.tracksProcessed = await this.syncArtistTracks(
            artist,
            spotifyId,
            job,
            options.maxTracks
          );
          break;

        case 'features':
          results.featuresUpdated = await this.syncTrackFeatures(artist, job);
          break;

        case 'full':
          // Full sync executes all types
          results.profileUpdated = await this.syncArtistProfile(artist, spotifyId, job);
          await job.updateProgress(25);
          
          results.albumsProcessed = await this.syncArtistAlbums(
            artist,
            spotifyId,
            job,
            options.maxAlbums
          );
          await job.updateProgress(50);
          
          results.tracksProcessed = await this.syncArtistTracks(
            artist,
            spotifyId,
            job,
            options.maxTracks
          );
          await job.updateProgress(75);
          
          if (options.includeFeatures) {
            results.featuresUpdated = await this.syncTrackFeatures(artist, job);
          }
          break;

        default:
          throw new Error(`Unknown sync type: ${syncType}`);
      }

      await job.updateProgress(100);

      // Clear cache for this artist
      if (options.forceRefresh) {
        await redisCache.invalidatePattern(`artist:${artistId}:*`);
        await redisCache.invalidatePattern(`spotify:${spotifyId}:*`);
      }

      this.logger.success(`Spotify ${syncType} sync completed`, {
        artistId,
        results,
        duration: Date.now() - startTime
      });

      return {
        success: true,
        syncType,
        artistId,
        artistName: artist.name,
        results,
        errors,
        duration: Date.now() - startTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Spotify sync failed`, { error: errorMessage });
      errors.push(errorMessage);

      return {
        success: false,
        syncType,
        artistId,
        artistName: 'Unknown',
        results,
        errors,
        duration: Date.now() - startTime
      };
    }
  }

  private async syncArtistProfile(
    artist: any,
    spotifyId: string,
    job: Job
  ): Promise<boolean> {
    try {
      // Get artist data from Spotify
      const spotifyArtist = await spotifyCircuitBreaker.execute(async () => {
        return await this.spotifyClient.getArtist(spotifyId);
      });

      if (!spotifyArtist) {
        throw new Error('Artist not found on Spotify');
      }

      // Update artist profile
      await db
        .update(artists)
        .set({
          name: spotifyArtist.name,
          imageUrl: spotifyArtist.images?.[0]?.url || artist.imageUrl,
          genres: JSON.stringify(spotifyArtist.genres || []),
          popularity: spotifyArtist.popularity,
          followers: spotifyArtist.followers?.total,
          externalUrls: JSON.stringify(spotifyArtist.external_urls || {}),
          spotifySyncedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(artists.id, artist.id));

      // Cache artist profile
      await redisCache.set(
        `spotify:artist:${spotifyId}`,
        spotifyArtist,
        3600 // 1 hour
      );

      return true;
    } catch (error) {
      this.logger.error('Failed to sync artist profile', { error });
      throw error;
    }
  }

  private async syncArtistAlbums(
    artist: any,
    spotifyId: string,
    job: Job,
    maxAlbums?: number
  ): Promise<number> {
    try {
      // Get all albums from Spotify
      const albumsResponse = await spotifyCircuitBreaker.execute(async () => {
        return await this.spotifyClient.getArtistAlbums(spotifyId, {
          include_groups: 'album,single,compilation',
          limit: 50,
          market: 'US'
        });
      });

      const albumsToProcess = maxAlbums 
        ? albumsResponse.items.slice(0, maxAlbums)
        : albumsResponse.items;

      let processedCount = 0;

      for (let i = 0; i < albumsToProcess.length; i++) {
        const spotifyAlbum = albumsToProcess[i];

        try {
          // Check if album exists
          let album = await db
            .select()
            .from(albums)
            .where(eq(albums.spotifyId, spotifyAlbum.id))
            .get();

          if (!album) {
            // Get full album details
            const fullAlbum = await spotifyCircuitBreaker.execute(async () => {
              return await this.spotifyClient.getAlbum(spotifyAlbum.id);
            });

            // Create album
            [album] = await db
              .insert(albums)
              .values({
                spotifyId: fullAlbum.id,
                name: fullAlbum.name,
                artistId: artist.id,
                albumType: fullAlbum.album_type,
                releaseDate: fullAlbum.release_date,
                releaseDatePrecision: fullAlbum.release_date_precision,
                totalTracks: fullAlbum.total_tracks,
                imageUrl: fullAlbum.images?.[0]?.url,
                label: fullAlbum.label,
                popularity: fullAlbum.popularity,
                genres: JSON.stringify(fullAlbum.genres || []),
                copyrights: JSON.stringify(fullAlbum.copyrights || []),
                externalUrls: JSON.stringify(fullAlbum.external_urls || {}),
                availableMarkets: JSON.stringify(fullAlbum.available_markets || [])
              })
              .returning();
          }

          // Create artist-album relationship
          await db
            .insert(artistAlbums)
            .values({
              artistId: artist.id,
              albumId: album.id,
              isPrimary: true
            })
            .onConflictDoNothing();

          processedCount++;

          // Update progress
          if (i % 5 === 0) {
            const progress = Math.floor((i / albumsToProcess.length) * 100);
            await job.updateProgress(progress);
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          this.logger.warn(`Failed to process album ${spotifyAlbum.name}`, { error });
          // Continue with next album
        }
      }

      return processedCount;
    } catch (error) {
      this.logger.error('Failed to sync artist albums', { error });
      throw error;
    }
  }

  private async syncArtistTracks(
    artist: any,
    spotifyId: string,
    job: Job,
    maxTracks?: number
  ): Promise<number> {
    try {
      // Get artist's top tracks
      const topTracks = await spotifyCircuitBreaker.execute(async () => {
        return await this.spotifyClient.getArtistTopTracks(spotifyId, 'US');
      });

      // Get tracks from albums
      const albums = await db
        .select()
        .from(artistAlbums)
        .innerJoin(albums, eq(artistAlbums.albumId, albums.id))
        .where(eq(artistAlbums.artistId, artist.id))
        .limit(20); // Limit albums to process

      let allTracks = [...topTracks.tracks];
      let processedCount = 0;

      // Get tracks from each album
      for (const { albums: album } of albums) {
        if (album.spotifyId) {
          try {
            const albumTracks = await spotifyCircuitBreaker.execute(async () => {
              return await this.spotifyClient.getAlbumTracks(album.spotifyId!, {
                limit: 50,
                market: 'US'
              });
            });

            allTracks.push(...albumTracks.items);

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            this.logger.warn(`Failed to get tracks for album ${album.name}`, { error });
          }
        }
      }

      // Remove duplicates and limit tracks
      const uniqueTracks = this.deduplicateTracks(allTracks);
      const tracksToProcess = maxTracks 
        ? uniqueTracks.slice(0, maxTracks)
        : uniqueTracks;

      // Process each track
      for (let i = 0; i < tracksToProcess.length; i++) {
        const track = tracksToProcess[i];

        try {
          // Skip if track exists
          const existingSong = await db
            .select()
            .from(songs)
            .where(eq(songs.spotifyId, track.id))
            .get();

          if (!existingSong) {
            // Create song
            const [song] = await db
              .insert(songs)
              .values({
                spotifyId: track.id,
                name: track.name,
                artist: artist.name,
                artistId: artist.id,
                albumName: track.album?.name,
                albumId: track.album?.id,
                durationMs: track.duration_ms,
                isrc: track.external_ids?.isrc,
                popularity: track.popularity || 0,
                previewUrl: track.preview_url,
                trackNumber: track.track_number,
                discNumber: track.disc_number,
                explicit: track.explicit,
                releaseDate: track.album?.release_date,
                availableMarkets: JSON.stringify(track.available_markets || []),
                externalUrls: JSON.stringify(track.external_urls || {})
              })
              .returning();

            // Create artist-song relationship
            await db
              .insert(artistSongs)
              .values({
                artistId: artist.id,
                songId: song.id,
                isPrimary: true
              })
              .onConflictDoNothing();

            processedCount++;
          }

          // Update progress
          if (i % 10 === 0) {
            const progress = Math.floor((i / tracksToProcess.length) * 100);
            await job.updateProgress(progress);
          }

        } catch (error) {
          this.logger.warn(`Failed to process track ${track.name}`, { error });
          // Continue with next track
        }
      }

      // Update artist track count
      await db
        .update(artists)
        .set({
          totalSongs: processedCount,
          songCatalogSyncedAt: new Date()
        })
        .where(eq(artists.id, artist.id));

      return processedCount;
    } catch (error) {
      this.logger.error('Failed to sync artist tracks', { error });
      throw error;
    }
  }

  private async syncTrackFeatures(
    artist: any,
    job: Job
  ): Promise<number> {
    try {
      // Get songs without audio features
      const songsWithoutFeatures = await db
        .select()
        .from(artistSongs)
        .innerJoin(songs, eq(artistSongs.songId, songs.id))
        .where(eq(artistSongs.artistId, artist.id))
        .limit(100); // Process in batches

      const songIds = songsWithoutFeatures
        .map(({ songs }) => songs.spotifyId)
        .filter(id => id !== null) as string[];

      if (songIds.length === 0) {
        return 0;
      }

      // Get audio features in batches of 100
      let featuresUpdated = 0;
      const batchSize = 100;

      for (let i = 0; i < songIds.length; i += batchSize) {
        const batch = songIds.slice(i, i + batchSize);

        try {
          const features = await spotifyCircuitBreaker.execute(async () => {
            return await this.spotifyClient.getAudioFeatures(batch);
          });

          // Update songs with features
          for (const feature of features.audio_features) {
            if (feature) {
              await db
                .update(songs)
                .set({
                  audioFeatures: JSON.stringify({
                    acousticness: feature.acousticness,
                    danceability: feature.danceability,
                    energy: feature.energy,
                    instrumentalness: feature.instrumentalness,
                    key: feature.key,
                    liveness: feature.liveness,
                    loudness: feature.loudness,
                    mode: feature.mode,
                    speechiness: feature.speechiness,
                    tempo: feature.tempo,
                    time_signature: feature.time_signature,
                    valence: feature.valence
                  }),
                  updatedAt: new Date()
                })
                .where(eq(songs.spotifyId, feature.id));

              featuresUpdated++;
            }
          }

          // Update progress
          const progress = Math.floor((i / songIds.length) * 100);
          await job.updateProgress(progress);

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          this.logger.warn(`Failed to get audio features for batch`, { error });
          // Continue with next batch
        }
      }

      return featuresUpdated;
    } catch (error) {
      this.logger.error('Failed to sync track features', { error });
      throw error;
    }
  }

  private deduplicateTracks(tracks: any[]): any[] {
    const seen = new Set<string>();
    return tracks.filter(track => {
      if (seen.has(track.id)) {
        return false;
      }
      seen.add(track.id);
      return true;
    });
  }
}

// Export the processor function for BullMQ
export async function processSpotifySync(job: Job<SpotifySyncJobData>): Promise<SpotifySyncResult> {
  const processor = new CompleteSpotifySyncProcessor();
  return processor.process(job);
}
