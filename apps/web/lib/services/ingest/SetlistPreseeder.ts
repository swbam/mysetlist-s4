/**
 * SetlistPreseeder - Creates initial setlists for imported shows
 * Implements GROK.md Phase 4 setlist pre-seeding requirements
 */

import { db } from "@repo/database";
import {
  artistSongs,
  setlistSongs,
  setlists,
  shows,
  songs,
} from "@repo/database";
import { and, desc, eq, sql } from "drizzle-orm";

export interface SetlistPreseedResult {
  showsProcessed: number;
  setlistsCreated: number;
  songsAdded: number;
  skippedShows: number;
}

export interface PreseedOptions {
  songsPerSetlist: number;
  weightByPopularity: boolean;
  excludeLive: boolean;
  setlistName: string;
}

/**
 * Service for creating initial predicted setlists for imported shows
 * Following GROK.md specifications for Phase 4 wrap-up
 */
export class SetlistPreseeder {
  private readonly defaultOptions: PreseedOptions = {
    songsPerSetlist: 5,
    weightByPopularity: true,
    excludeLive: true,
    setlistName: "Predicted Setlist",
  };

  /**
   * Creates initial setlists for all upcoming shows of an artist
   * This is called during Phase 4 of the import process
   */
  async preseedSetlistsForArtist(
    artistId: string,
    options: Partial<PreseedOptions> = {},
  ): Promise<SetlistPreseedResult> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();

    try {
      // Get all upcoming shows for the artist that don't have setlists yet
      const upcomingShows = await db
        .select({
          id: shows.id,
          name: shows.name,
          date: shows.date,
          venueId: shows.venueId,
        })
        .from(shows)
        .where(
          and(
            eq(shows.headlinerArtistId, artistId),
            sql`${shows.date} >= CURRENT_DATE`,
          ),
        )
        .orderBy(shows.date);

      console.log(
        `Found ${upcomingShows.length} upcoming shows for artist ${artistId}`,
      );

      let setlistsCreated = 0;
      let songsAdded = 0;
      let skippedShows = 0;

      // Get artist's studio catalog once for efficiency
      const artistCatalog = await this.getArtistStudioCatalog(artistId, opts);

      if (artistCatalog.length === 0) {
        console.warn(`No studio catalog found for artist ${artistId}`);
        return {
          showsProcessed: upcomingShows.length,
          setlistsCreated: 0,
          songsAdded: 0,
          skippedShows: upcomingShows.length,
        };
      }

      // Process each show
      for (const show of upcomingShows) {
        try {
          // Check if setlist already exists
          const existingSetlist = await db
            .select({ id: setlists.id })
            .from(setlists)
            .where(eq(setlists.showId, show.id))
            .limit(1);

          if (existingSetlist.length > 0) {
            skippedShows++;
            continue;
          }

          // Create initial setlist for this show
          const result = await this.createInitialSetlist(
            show.id,
            artistId,
            artistCatalog,
            opts,
          );

          if (result.success) {
            setlistsCreated++;
            songsAdded += result.songsAdded;
          } else {
            skippedShows++;
          }
        } catch (error) {
          console.error(`Failed to create setlist for show ${show.id}:`, error);
          skippedShows++;
        }
      }

      // Update show setlist_ready flags
      if (setlistsCreated > 0) {
        await db
          .update(shows)
          .set({ setlistReady: true, updatedAt: new Date() })
          .where(
            and(
              eq(shows.headlinerArtistId, artistId),
              sql`${shows.date} >= CURRENT_DATE`,
            ),
          );
      }

      const duration = Date.now() - startTime;
      console.log(
        `Setlist preseeding completed in ${duration}ms: ` +
          `${setlistsCreated} setlists created, ${songsAdded} songs added, ${skippedShows} shows skipped`,
      );

      return {
        showsProcessed: upcomingShows.length,
        setlistsCreated,
        songsAdded,
        skippedShows,
      };
    } catch (error) {
      console.error("Setlist preseeding failed:", error);
      throw new Error(
        `Failed to preseed setlists for artist ${artistId}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Creates an initial setlist for a specific show
   */
  private async createInitialSetlist(
    showId: string,
    artistId: string,
    catalog: Array<{ id: string; name: string; popularity: number }>,
    options: PreseedOptions,
  ): Promise<{ success: boolean; songsAdded: number }> {
    try {
      // Select random songs from catalog
      const selectedSongs = this.selectRandomSongs(catalog, options);

      if (selectedSongs.length === 0) {
        return { success: false, songsAdded: 0 };
      }

      // Create setlist
      const [newSetlist] = await db
        .insert(setlists)
        .values({
          showId,
          artistId,
          type: "predicted",
          name: options.setlistName,
          orderIndex: 0,
          isLocked: false,
          totalVotes: 0,
          accuracyScore: 0,
          moderationStatus: "approved",
          importedFrom: "api",
          importedAt: new Date(),
        })
        .returning({ id: setlists.id });

      if (!newSetlist) {
        throw new Error("Failed to create setlist");
      }

      // Add songs to setlist
      for (let i = 0; i < selectedSongs.length; i++) {
        const song = selectedSongs[i];
        if (!song?.id) continue;

        await db
          .insert(setlistSongs)
          .values({
            setlistId: newSetlist.id,
            songId: song.id,
            position: i + 1,
            notes: null,
            isPlayed: null, // Not applicable for predicted setlists
            upvotes: 0,
          })
          .onConflictDoNothing();
      }

      return { success: true, songsAdded: selectedSongs.length };
    } catch (error) {
      console.error(
        `Failed to create initial setlist for show ${showId}:`,
        error,
      );
      return { success: false, songsAdded: 0 };
    }
  }

  /**
   * Gets artist's studio catalog, excluding live tracks
   */
  private async getArtistStudioCatalog(
    artistId: string,
    options: PreseedOptions,
  ): Promise<Array<{ id: string; name: string; popularity: number }>> {
    try {
      // Build base query for artist's songs
      const baseQuery = db
        .select({
          id: songs.id,
          name: songs.name,
          popularity: songs.popularity,
          albumName: songs.albumName,
          isLive: songs.isLive,
        })
        .from(songs)
        .innerJoin(artistSongs, eq(songs.id, artistSongs.songId))
        .where(eq(artistSongs.artistId, artistId));

      // Apply ordering based on options and execute
      const allSongs = options.weightByPopularity
        ? await baseQuery.orderBy(desc(songs.popularity)).limit(100)
        : await baseQuery.orderBy(sql`RANDOM()`).limit(100);

      // Filter songs based on options
      let filteredSongs = allSongs;

      if (options.excludeLive) {
        filteredSongs = allSongs.filter((song) => {
          // Use database isLive flag if available
          if (song.isLive === true) {
            return false;
          }

          // Additional text-based filtering for safety
          const name = (song.name || "").toLowerCase();
          const album = (song.albumName || "").toLowerCase();

          const liveIndicators = [
            "live at",
            "live from",
            "live in",
            "live on",
            "- live",
            "(live)",
            "[live]",
            "live version",
            "live recording",
            "concert",
            "unplugged",
            "mtv unplugged",
            "acoustic session",
          ];

          const combinedText = `${name} ${album}`;
          return !liveIndicators.some((indicator) =>
            combinedText.includes(indicator),
          );
        });
      }

      // Return with proper typing
      return filteredSongs.map((song) => ({
        id: song.id,
        name: song.name,
        popularity: song.popularity || 0,
      }));
    } catch (error) {
      console.error(
        `Failed to get studio catalog for artist ${artistId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Selects random songs from catalog based on options
   */
  private selectRandomSongs(
    catalog: Array<{ id: string; name: string; popularity: number }>,
    options: PreseedOptions,
  ): Array<{ id: string; name: string; popularity: number }> {
    if (catalog.length === 0) {
      return [];
    }

    const { songsPerSetlist, weightByPopularity } = options;
    let pool = [...catalog];

    if (weightByPopularity) {
      // Take top songs by popularity, then shuffle within that pool
      const topPoolSize = Math.min(25, catalog.length);
      const topSongs = pool.slice(0, topPoolSize);

      // Shuffle the top songs
      for (let i = topSongs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [topSongs[i], topSongs[j]] = [topSongs[j]!, topSongs[i]!];
      }

      pool = topSongs;
    } else {
      // Shuffle entire catalog
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j]!, pool[i]!];
      }
    }

    // Return requested number of songs
    return pool.slice(0, Math.min(songsPerSetlist, pool.length));
  }

  /**
   * Creates initial setlist for a single show (used by external callers)
   */
  async createInitialSetlistForShow(
    showId: string,
    options: Partial<PreseedOptions> = {},
  ): Promise<{ success: boolean; songsAdded: number; setlistId?: string }> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      // Get show details
      const [show] = await db
        .select({
          id: shows.id,
          headlinerArtistId: shows.headlinerArtistId,
          name: shows.name,
        })
        .from(shows)
        .where(eq(shows.id, showId))
        .limit(1);

      if (!show || !show.headlinerArtistId) {
        throw new Error(`Show not found or missing headliner: ${showId}`);
      }

      // Check if setlist already exists
      const existingSetlist = await db
        .select({ id: setlists.id })
        .from(setlists)
        .where(eq(setlists.showId, showId))
        .limit(1);

      if (existingSetlist.length > 0) {
        return { success: false, songsAdded: 0 };
      }

      // Get artist catalog
      const catalog = await this.getArtistStudioCatalog(
        show.headlinerArtistId,
        opts,
      );

      if (catalog.length === 0) {
        return { success: false, songsAdded: 0 };
      }

      // Create setlist
      const result = await this.createInitialSetlist(
        showId,
        show.headlinerArtistId,
        catalog,
        opts,
      );

      return {
        success: result.success,
        songsAdded: result.songsAdded,
      };
    } catch (error) {
      console.error(
        `Failed to create initial setlist for show ${showId}:`,
        error,
      );
      return { success: false, songsAdded: 0 };
    }
  }
}

/**
 * Convenience function for easy imports
 */
export const setlistPreseeder = new SetlistPreseeder();
