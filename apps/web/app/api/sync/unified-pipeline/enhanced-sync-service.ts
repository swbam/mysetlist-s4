import { db } from "@repo/database"
import { artists, shows, songs, venues } from "@repo/database"
import { eq, sql } from "drizzle-orm"
import { CacheClient, RedisRateLimiter, cacheKeys } from "~/lib/cache/redis"
// import { SyncProgressTracker } from '~/lib/sync-progress-tracker';

// Enhanced sync service with performance optimizations
export class EnhancedSyncService {
  private cache = CacheClient.getInstance()
  private rateLimiter = new RedisRateLimiter()
  // private progressTracker: SyncProgressTracker;

  constructor() {
    // this.progressTracker = new SyncProgressTracker();
  }

  // Orchestrate full artist sync with all data sources
  async syncArtistComplete(
    artistId: string,
    options?: {
      force?: boolean
      includeShows?: boolean
      includeSongs?: boolean
    }
  ) {
    const syncKey = `sync:artist:${artistId}`

    // Check if sync is already in progress
    const inProgress = await this.cache.get(`${syncKey}:lock`)
    if (inProgress && !options?.force) {
      return {
        status: "in_progress",
        message: "Sync already in progress for this artist",
      }
    }

    // Set lock with 30 minute expiry
    await this.cache.set(`${syncKey}:lock`, true, { ex: 1800 })

    try {
      // Initialize progress tracking
      // // await this.progressTracker.initializeSync(artistId, {
      //   totalSteps: 5,
      //   steps: [
      //     'fetch_artist_details',
      //     'sync_spotify_data',
      //     'sync_shows',
      //     'sync_songs',
      //     'calculate_stats',
      //   ],
      // });

      // Step 1: Fetch and update artist details
      // await this.progressTracker.updateProgress(
      //   artistId,
      //   'fetch_artist_details',
      //   'in_progress'
      // );
      const artistData = await this.syncArtistDetails(artistId)
      // await this.progressTracker.updateProgress(...args);

      // Step 2: Sync Spotify data
      if (artistData.spotifyId) {
        // await this.progressTracker.updateProgress(artistId, 'sync_spotify_data', 'in_progress');
        await this.syncSpotifyArtistData(artistData.spotifyId, artistId)
        // await this.progressTracker.updateProgress(artistId, 'sync_spotify_data', 'completed');
      }

      // Step 3: Sync shows (parallel with Ticketmaster and SetlistFM)
      if (options?.includeShows !== false) {
        // await this.progressTracker.updateProgress(artistId, 'sync_shows', 'in_progress');
        await this.syncArtistShows(artistId, artistData.name)
        // await this.progressTracker.updateProgress(artistId, 'sync_shows', 'completed');
      }

      // Step 4: Sync songs
      if (options?.includeSongs !== false) {
        // await this.progressTracker.updateProgress(artistId, 'sync_songs', 'in_progress');
        await this.syncArtistSongs(artistId, artistData.spotifyId || undefined)
        // await this.progressTracker.updateProgress(artistId, 'sync_songs', 'completed');
      }

      // Step 5: Calculate and update statistics
      // await this.progressTracker.updateProgress(artistId, 'calculate_stats', 'in_progress');
      await this.calculateArtistStats(artistId)
      // await this.progressTracker.updateProgress(artistId, 'calculate_stats', 'completed');

      // Clear caches
      await this.invalidateArtistCaches(artistId)

      // Complete sync
      // await this.progressTracker.completeSync(artistId);

      return {
        status: "completed",
        artistId,
        syncedAt: new Date().toISOString(),
      }
    } catch (error) {
      // await this.progressTracker.failSync(artistId, error instanceof Error ? error.message : 'Unknown error');
      throw error
    } finally {
      // Release lock
      await this.cache.del(`${syncKey}:lock`)
    }
  }

  // Sync artist details from multiple sources
  private async syncArtistDetails(artistId: string) {
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1)

    if (!artist) {
      throw new Error(`Artist not found: ${artistId}`)
    }

    return artist
  }

  // Enhanced Spotify sync with retry logic
  private async syncSpotifyArtistData(spotifyId: string, artistId: string) {
    const { allowed } = await this.rateLimiter.checkLimit(
      "spotify:artist",
      50,
      3600 // 50 requests per hour
    )

    if (!allowed) {
      throw new Error("Spotify rate limit exceeded")
    }

    const spotifyData = await this.fetchSpotifyArtist(spotifyId)

    if (spotifyData) {
      await db
        .update(artists)
        .set({
          genres: spotifyData.genres,
          popularity: spotifyData.popularity,
          followers: spotifyData.followers?.total || 0,
          imageUrl: spotifyData.images?.[0]?.url,
          updatedAt: new Date(),
        })
        .where(eq(artists.id, artistId))
    }
  }

  // Sync shows from multiple sources
  private async syncArtistShows(artistId: string, artistName: string) {
    // Parallel fetch from multiple sources
    const [ticketmasterShows, setlistFmShows] = await Promise.all([
      this.fetchTicketmasterShows(artistName),
      this.fetchSetlistFmShows(artistId),
    ])

    // Merge and deduplicate shows
    const mergedShows = this.mergeShowData(ticketmasterShows, setlistFmShows)

    // Batch insert/update shows
    if (mergedShows.length > 0) {
      await this.batchUpsertShows(mergedShows, artistId)
    }
  }

  // Sync artist songs with efficient batching
  private async syncArtistSongs(artistId: string, spotifyId?: string) {
    if (!spotifyId) {
      return
    }

    const topTracks = await this.fetchSpotifyTopTracks(spotifyId)

    if (topTracks.length > 0) {
      // Batch upsert songs
      const songData = topTracks.map((track) => ({
        id: track.id,
        artistId,
        name: track.name,
        spotifyId: track.id,
        duration: track.duration_ms,
        popularity: track.popularity,
        previewUrl: track.preview_url,
        albumName: track.album?.name,
        albumImageUrl: track.album?.images?.[0]?.url,
      }))

      await this.batchUpsertSongs(songData)
    }
  }

  // Calculate artist statistics efficiently
  private async calculateArtistStats(artistId: string) {
    const statsQuery = sql`
      INSERT INTO artist_stats (artist_id, total_shows, upcoming_shows, past_shows, 
                               average_attendance, total_votes, total_songs, 
                               calculated_at, updated_at)
      SELECT 
        ${artistId},
        COUNT(DISTINCT s.id),
        COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'upcoming'),
        COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'completed'),
        COALESCE(AVG(s.attendee_count), 0),
        COALESCE(SUM(s.vote_count), 0),
        COUNT(DISTINCT sg.id),
        NOW(),
        NOW()
      FROM artists a
      LEFT JOIN shows s ON s.headliner_artist_id = a.id
      LEFT JOIN songs sg ON sg.artist_id = a.id
      WHERE a.id = ${artistId}
      ON CONFLICT (artist_id) 
      DO UPDATE SET
        total_shows = EXCLUDED.total_shows,
        upcoming_shows = EXCLUDED.upcoming_shows,
        past_shows = EXCLUDED.past_shows,
        average_attendance = EXCLUDED.average_attendance,
        total_votes = EXCLUDED.total_votes,
        total_songs = EXCLUDED.total_songs,
        calculated_at = NOW(),
        updated_at = NOW()
    `

    await db.execute(statsQuery)
  }

  // Batch operations for better performance
  private async batchUpsertShows(showData: any[], artistId: string) {
    const BATCH_SIZE = 50

    for (let i = 0; i < showData.length; i += BATCH_SIZE) {
      const batch = showData.slice(i, i + BATCH_SIZE)

      await db.transaction(async (tx) => {
        for (const show of batch) {
          // Upsert venue first
          const [venue] = await tx
            .insert(venues)
            .values({
              id: show.venueId,
              name: show.venueName,
              slug: show.venueName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              city: show.city,
              state: show.state,
              country: show.country,
              latitude: show.latitude,
              longitude: show.longitude,
              timezone: "UTC",
            } as any)
            .onConflictDoUpdate({
              target: venues.id,
              set: {
                name: show.venueName,
                updatedAt: new Date(),
              },
            })
            .returning()

          // Upsert show
          await tx
            .insert(shows)
            .values({
              id: show.id,
              name: show.name,
              slug: show.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              date: show.date,
              venueId: venue?.id,
              headlinerArtistId: artistId,
              status: show.status,
              ticketmasterId: show.ticketmasterEventId,
              setlistFmId: show.setlistFmEventId,
            } as any)
            .onConflictDoUpdate({
              target: shows.id,
              set: {
                status: show.status,
                updatedAt: new Date(),
              },
            })
        }
      })
    }
  }

  private async batchUpsertSongs(songData: any[]) {
    const BATCH_SIZE = 100

    for (let i = 0; i < songData.length; i += BATCH_SIZE) {
      const batch = songData.slice(i, i + BATCH_SIZE)

      await db
        .insert(songs)
        .values(batch)
        .onConflictDoUpdate({
          target: songs.spotifyId,
          set: {
            popularity: sql`EXCLUDED.popularity`,
            updatedAt: new Date(),
          },
        })
    }
  }

  // External API calls with error handling
  private async fetchSpotifyArtist(_spotifyId: string): Promise<any> {
    // Implementation would call Spotify API
    // Placeholder for now
    return null
  }

  private async fetchSpotifyTopTracks(_spotifyId: string): Promise<any[]> {
    // Implementation would call Spotify API
    // Placeholder for now
    return []
  }

  private async fetchTicketmasterShows(_artistName: string): Promise<any[]> {
    // Implementation would call Ticketmaster API
    // Placeholder for now
    return []
  }

  private async fetchSetlistFmShows(_artistId: string): Promise<any[]> {
    // Implementation would call SetlistFM API
    // Placeholder for now
    return []
  }

  private mergeShowData(
    _ticketmasterShows: any[],
    _setlistFmShows: any[]
  ): any[] {
    // Implementation would merge and deduplicate shows
    // Placeholder for now
    return []
  }

  // Cache invalidation
  private async invalidateArtistCaches(artistId: string) {
    await Promise.all([
      this.cache.del(cacheKeys.artist(artistId)),
      this.cache.del(`artist:stats:${artistId}`),
      this.cache.invalidatePattern("search:artists:*"),
      this.cache.invalidatePattern("trending:*"),
    ])
  }
}

// Export singleton instance
export const enhancedSyncService = new EnhancedSyncService()
