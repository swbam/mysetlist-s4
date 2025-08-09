import { db } from "@repo/database";
import {
  artists,
  artistStats,
  shows,
  setlists,
  venues,
  songs,
  artistSongs,
} from "@repo/database";
import { eq, sql, and, desc } from "drizzle-orm";
import { SyncProgressTracker } from "~/lib/sync-progress-tracker";
import {
  ArtistSyncService,
  ShowSyncService,
  SetlistSyncService,
  VenueSyncService,
  SyncScheduler,
} from "@repo/external-apis";

// Rate limiting utility
export class RateLimiter {
  private static requestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  static async checkLimit(
    key: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<boolean> {
    const now = Date.now();
    const current = RateLimiter.requestCounts.get(key);

    if (!current || now > current.resetTime) {
      RateLimiter.requestCounts.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (current.count >= maxRequests) {
      return false;
    }

    current.count++;
    return true;
  }

  static async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Unified Sync Service V2 - Uses external-apis sync services
export class UnifiedSyncService {
  private artistSyncService: ArtistSyncService;
  private showSyncService: ShowSyncService;
  private setlistSyncService: SetlistSyncService;
  private venueSyncService: VenueSyncService;
  private syncScheduler: SyncScheduler;
  private progressTracker: SyncProgressTracker;

  constructor() {
    this.artistSyncService = new ArtistSyncService();
    this.showSyncService = new ShowSyncService();
    this.setlistSyncService = new SetlistSyncService();
    this.venueSyncService = new VenueSyncService();
    this.syncScheduler = new SyncScheduler();
    this.progressTracker = new SyncProgressTracker();
  }

  async syncArtistCatalog(artistId: string) {
    const results = {
      artist: { updated: false, data: null as any },
      songs: { synced: 0, errors: 0 },
      shows: { synced: 0, errors: 0 },
      venues: { synced: 0, errors: 0 },
      setlists: { synced: 0, errors: 0 },
      stats: { calculated: false },
    };

    try {
      // Get artist from database
      const [artist] = await db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);

      if (!artist) {
        throw new Error("Artist not found");
      }

      results.artist.data = artist;

      // Start progress tracking
      await this.progressTracker.startSync(artistId, artist.name);

      // Step 1: Sync artist data using SyncScheduler
      await this.progressTracker.updateProgress(artistId, {
        currentStep: "Syncing artist data",
        completedSteps: 1,
      });

      await this.syncScheduler.syncArtistData(artist.name);
      results.artist.updated = true;

      // Get updated stats after sync
      const updatedArtist = await db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);

      if (updatedArtist[0]) {
        results.artist.data = updatedArtist[0];
      }

      // Step 2: Count synced songs
      const songCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(songs)
        .innerJoin(artistSongs, eq(artistSongs.songId, songs.id))
        .where(eq(artistSongs.artistId, artistId));

      results.songs.synced = Number(songCount[0]?.count || 0);

      // Step 3: Count synced shows
      const showCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(shows)
        .where(eq(shows.headlinerArtistId, artistId));

      results.shows.synced = Number(showCount[0]?.count || 0);

      // Step 4: Count synced venues (through shows)
      const venueCount = await db
        .select({ count: sql<number>`count(distinct ${shows.venueId})` })
        .from(shows)
        .where(
          and(
            eq(shows.headlinerArtistId, artistId),
            sql`${shows.venueId} IS NOT NULL`,
          ),
        );

      results.venues.synced = Number(venueCount[0]?.count || 0);

      // Step 5: Count synced setlists
      const setlistCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(setlists)
        .where(eq(setlists.artistId, artistId));

      results.setlists.synced = Number(setlistCount[0]?.count || 0);

      // Step 6: Calculate artist stats
      await this.progressTracker.updateProgress(artistId, {
        currentStep: "Calculating artist statistics",
        completedSteps: 3,
      });

      await this.calculateArtistStats(artistId);
      results.stats.calculated = true;

      // Update artist with last full sync timestamp
      await db
        .update(artists)
        .set({
          lastFullSyncAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(artists.id, artistId));

      // Complete sync
      await this.progressTracker.completeSync(artistId);
      await this.progressTracker.updateProgress(artistId, {
        completedSteps: 4,
        details: {
          songs: results.songs,
          shows: results.shows,
          venues: results.venues,
          setlists: results.setlists,
        },
      });
    } catch (error) {
      await this.progressTracker.completeSync(
        artistId,
        error instanceof Error ? error.message : "Unknown error",
      );
      throw error;
    }

    return results;
  }

  // Calculate artist statistics
  private async calculateArtistStats(artistId: string): Promise<void> {
    // Get total shows count
    const showsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(shows)
      .where(eq(shows.headlinerArtistId, artistId));

    const totalShows = Number(showsCount[0]?.count || 0);

    // Get upcoming shows count
    const upcomingShowsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(shows)
      .where(
        and(
          eq(shows.headlinerArtistId, artistId),
          eq(shows.status, "upcoming"),
        ),
      );

    const upcomingShows = Number(upcomingShowsCount[0]?.count || 0);

    // Get total setlists count
    const setlistsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(setlists)
      .where(eq(setlists.artistId, artistId));

    const totalSetlists = Number(setlistsCount[0]?.count || 0);

    // Get total songs count
    const songsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(songs)
      .innerJoin(artistSongs, eq(artistSongs.songId, songs.id))
      .where(eq(artistSongs.artistId, artistId));

    const totalSongs = Number(songsCount[0]?.count || 0);

    // Update artist stats
    await db
      .update(artists)
      .set({
        totalShows,
        upcomingShows,
        totalSetlists,
        totalSongs,
        updatedAt: new Date(),
      })
      .where(eq(artists.id, artistId));

    // Check if detailed stats record exists
    const existingStats = await db
      .select()
      .from(artistStats)
      .where(eq(artistStats.artistId, artistId))
      .limit(1);

    const statsData = {
      totalShows,
      upcomingShows,
      totalSetlists,
      totalSongs,
      updatedAt: new Date(),
    };

    if (existingStats.length > 0) {
      // Update existing stats
      await db
        .update(artistStats)
        .set(statsData)
        .where(eq(artistStats.artistId, artistId));
    } else {
      // Create new stats record
      await db.insert(artistStats).values({
        artistId,
        ...statsData,
      });
    }
  }

  // Sync multiple artists in bulk
  async syncBulkArtists(artistIds: string[]) {
    const results = {
      total: artistIds.length,
      synced: 0,
      errors: 0,
      details: [] as any[],
    };

    for (const artistId of artistIds) {
      try {
        const syncResult = await this.syncArtistCatalog(artistId);
        results.synced++;
        results.details.push({
          artistId,
          success: true,
          ...syncResult,
        });
      } catch (error) {
        results.errors++;
        results.details.push({
          artistId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Rate limiting between artists
      await RateLimiter.delay(500);
    }

    return results;
  }

  // Sync popular artists
  async syncPopularArtists() {
    await this.syncScheduler.runInitialSync();
  }

  // Sync shows by location
  async syncShowsByLocation(city: string, stateCode?: string) {
    await this.syncScheduler.syncByLocation(city, stateCode);
  }

  // Run daily sync
  async runDailySync() {
    await this.syncScheduler.runDailySync();
  }
}
