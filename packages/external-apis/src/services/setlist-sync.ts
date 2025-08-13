import {
  artistSongs,
  artists,
  setlistSongs as setlistSongsTable,
  setlists,
  shows,
  songs,
  venues,
} from "@repo/database";
import {
  SetlistFmClient,
  type SetlistFmSet,
  type SetlistFmSetlist,
} from "../clients/setlistfm";
import { SpotifyClient } from "../clients/spotify";
import { and, db, eq, sql } from "../database";

export class SetlistSyncService {
  private setlistFmClient: SetlistFmClient;
  private spotifyClient: SpotifyClient;

  constructor() {
    this.setlistFmClient = new SetlistFmClient({});
    this.spotifyClient = new SpotifyClient({});
  }

  async syncSetlistFromSetlistFm(setlistData: SetlistFmSetlist): Promise<void> {
    await this.spotifyClient.authenticate();

    // Find the show
    const showResults = await db
      .select()
      .from(shows)
      .where(eq(shows.setlistFmId, setlistData.id))
      .limit(1);
    const show = showResults[0];

    if (!show) {
      return;
    }

    // Find the artist
    const artistResults = await db
      .select()
      .from(artists)
      .where(eq(artists.name, setlistData.artist.name))
      .limit(1);
    const artist = artistResults[0];

    if (!artist) {
      return;
    }

    // Create setlist
    const [setlist] = await db
      .insert(setlists)
      .values({
        showId: show.id,
        artistId: artist.id,
        type: "actual" as const,
        name: "Main Set",
        importedFrom: "setlist.fm",
        externalId: setlistData.id,
        importedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: setlists.id });

    if (!setlist) {
      return;
    }

    // Process all sets
    let songOrder = 0;
    for (const set of setlistData.sets.set) {
      const songs = await this.processSongsFromSet(
        set,
        artist.id,
        artist.spotifyId,
      );

      // Add songs to setlist
      for (const song of songs) {
        await db
          .insert(setlistSongsTable)
          .values({
            setlistId: setlist.id,
            songId: song.id,
            position: songOrder++,
            notes: song.info || null,
          })
          .onConflictDoNothing();
      }
    }

    // Update show setlist count
    await db
      .update(shows)
      .set({
        setlistCount: (show.setlistCount || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(shows.id, show.id));
  }

  private async processSongsFromSet(
    set: SetlistFmSet,
    artistId: string,
    artistSpotifyId: string | null,
  ): Promise<Array<{ id: string; info?: string | undefined }>> {
    const processedSongs: Array<{ id: string; info?: string | undefined }> = [];

    for (const songData of set.song) {
      try {
        // Check if song already exists
        const songResults = await db
          .select({ id: songs.id })
          .from(songs)
          .where(
            and(
              eq(songs.title, songData.name),
              eq(songs.artist, songData.cover?.name || artistId),
            ),
          )
          .limit(1);
        let song: { id: string } | undefined = songResults[0];

        if (!song && artistSpotifyId) {
          // Try to find song on Spotify
          try {
            const searchQuery = `track:"${songData.name}" artist:"${
              songData.cover?.name || artistId
            }"`;
            const searchResult = await this.spotifyClient.searchTracks(
              searchQuery,
              1,
            );

            if (searchResult.tracks.items.length > 0) {
              const track = searchResult.tracks.items[0];

              if (track) {
                // Create song
                const [newSong] = await db
                  .insert(songs)
                  .values({
                    spotifyId: track.id,
                    title: track.name,
                    artist: track.artists[0]?.name || "Unknown Artist",
                    album: track.album.name,
                    albumArtUrl: track.album.images[0]?.url || null,
                    releaseDate: track.album.release_date,
                    durationMs: track.duration_ms,
                    popularity: track.popularity,
                    previewUrl: track.preview_url,
                    isExplicit: track.explicit,
                    isPlayable: track.is_playable,
                  })
                  .onConflictDoNothing()
                  .returning({ id: songs.id });

                if (newSong) {
                  song = newSong;
                }
              }
            }
          } catch (_error) {}
        }

        if (!song) {
          // Create a basic song entry without Spotify data
          const [newSong] = await db
            .insert(songs)
            .values({
              title: songData.name,
              artist: songData.cover?.name || artistId,
            })
            .returning({ id: songs.id });

          if (newSong) {
            song = newSong;
          }
        }

        if (song) {
          processedSongs.push({
            id: song.id,
            info: songData.info,
          });
        }
      } catch (_error) {}
    }

    return processedSongs;
  }

  async createDefaultSetlists(artistId: string): Promise<{
    upcomingShows: number;
    createdSetlists: number;
    skipped: number;
  }> {
    // Get all upcoming shows for this artist without an existing setlist
    const upcomingShows = await db
      .select()
      .from(shows)
      .where(
        and(
          eq(shows.headlinerArtistId, artistId),
          sql`${shows.date} >= CURRENT_DATE`,
        ),
      );

    let createdSetlists = 0;

    for (const show of upcomingShows) {
      // Skip if setlist already exists
      const existingSetlist = await db
        .select()
        .from(setlists)
        .where(eq(setlists.showId, show.id))
        .limit(1);

      if (existingSetlist.length > 0) {
        continue;
      }

      // Get non-live songs from catalog and pick 5 random
      const catalog = await db
        .select({
          id: songs.id,
          title: songs.title,
          popularity: songs.popularity,
        })
        .from(songs)
        .innerJoin(artistSongs, eq(songs.id, artistSongs.songId))
        .where(eq(artistSongs.artistId, artistId));

      const nonLive = catalog.filter((s) => {
        const name = (s.title || "").toLowerCase();
        return !(
          name.includes("(live") ||
          name.includes(" - live") ||
          name.includes(" live") ||
          name.includes(" - live at") ||
          name.includes(" (live at") ||
          name.includes("[live]")
        );
      });

      if (nonLive.length === 0) continue;

      // Shuffle and take 5 (optionally weight by popularity by partial sort)
      nonLive.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
      const topPool = nonLive.slice(0, Math.min(25, nonLive.length));
      for (let i = topPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = topPool[i]!;
        topPool[i] = topPool[j]!;
        topPool[j] = tmp;
      }
      const selected = topPool.slice(0, Math.min(5, topPool.length));

      // Create predicted setlist
      const result = await db
        .insert(setlists)
        .values({
          showId: show.id,
          artistId: artistId,
          type: "predicted",
          name: "Predicted Setlist",
          orderIndex: 0,
          isLocked: false,
          importedFrom: "api",
        })
        .returning();

      const setlist = result[0];
      if (!setlist) continue;

      // Add songs to setlist
      for (let i = 0; i < selected.length; i++) {
        const song = selected[i];
        if (!song?.id) continue; // Skip if song or id is undefined

        await db
          .insert(setlistSongsTable)
          .values({
            setlistId: setlist.id,
            songId: song.id,
            position: i + 1,
            notes: null,
            isPlayed: null,
          })
          .onConflictDoNothing();
      }

      createdSetlists++;
    }

    return {
      upcomingShows: upcomingShows.length,
      createdSetlists,
      skipped: upcomingShows.length - createdSetlists,
    };
  }

  /**
   * Ensures initial setlists exist for new shows
   * Creates 5-song initial setlist with songs randomly selected from artist's non-live catalog
   * Optionally weights by popularity
   */
  async ensureInitialSetlists(
    showId: string,
    options: {
      songCount?: number;
      weightByPopularity?: boolean;
      excludeLive?: boolean;
    } = {},
  ): Promise<{ created: boolean; songCount: number; skippedLive: number }> {
    const {
      songCount = 5,
      weightByPopularity = true,
      excludeLive = true,
    } = options;

    // Get show details
    const [show] = await db
      .select()
      .from(shows)
      .where(eq(shows.id, showId))
      .limit(1);

    if (!show) {
      throw new Error(`Show not found: ${showId}`);
    }

    // Check if setlist already exists
    const existingSetlist = await db
      .select()
      .from(setlists)
      .where(eq(setlists.showId, showId))
      .limit(1);

    if (existingSetlist.length > 0) {
      return { created: false, songCount: 0, skippedLive: 0 };
    }

    // Get artist's catalog
    let songQuery = db
      .select({
        id: songs.id,
        title: songs.title,
        artist: songs.artist,
        album: songs.album,
        popularity: songs.popularity,
        durationMs: songs.durationMs,
        albumType: songs.albumType,
      })
      .from(songs)
      .innerJoin(artistSongs, eq(songs.id, artistSongs.songId))
      .where(eq(artistSongs.artistId, show.headlinerArtistId));

    // Apply ordering based on options
    // Apply ordering based on options (cast to any to avoid narrowed builder issues)
    if (weightByPopularity) {
      (songQuery as any) = (songQuery as any).orderBy(
        sql`${songs.popularity} DESC NULLS LAST, RANDOM()`,
      );
    } else {
      (songQuery as any) = (songQuery as any).orderBy(sql`RANDOM()`);
    }

    const availableSongs = await (songQuery as any).limit(50); // Get more than we need for filtering

    // Filter out live tracks if requested
    let filteredSongs = availableSongs;
    let skippedLive = 0;

    if (excludeLive) {
      filteredSongs = availableSongs.filter((song: any) => {
        const isLive = this.isLiveTrack(
          song.title.toLowerCase(),
          song.album?.toLowerCase() || "",
        );
        if (isLive) skippedLive++;
        return !isLive;
      });
    }

    if (filteredSongs.length === 0) {
      return { created: false, songCount: 0, skippedLive };
    }

    // Select the requested number of songs
    const selectedSongs = filteredSongs.slice(
      0,
      Math.min(songCount, filteredSongs.length),
    );

    // Create predicted setlist
    const [setlist] = await db
      .insert(setlists)
      .values({
        showId: showId,
        artistId: show.headlinerArtistId,
        type: "predicted",
        name: "Predicted Setlist",
        orderIndex: 0,
        isLocked: false,
        importedFrom: "api",
      })
      .returning();

    if (!setlist) {
      throw new Error("Failed to create setlist");
    }

    // Add songs to setlist
    for (let i = 0; i < selectedSongs.length; i++) {
      const song = selectedSongs[i];
      if (!song?.id) continue;

      await db.insert(setlistSongsTable).values({
        setlistId: setlist.id,
        songId: song.id,
        position: i + 1,
        notes: null,
        isPlayed: null, // Not applicable for predicted setlists
      });
    }

    return {
      created: true,
      songCount: selectedSongs.length,
      skippedLive,
    };
  }

  /**
   * Checks if a track is likely a live recording
   */
  private isLiveTrack(trackTitle: string, albumName: string): boolean {
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
      "acoustic session",
      "unplugged",
      "mtv unplugged",
      "radio session",
      "bbc session",
      "peel session",
    ];

    const combinedText = `${trackTitle} ${albumName}`;

    return liveIndicators.some((indicator) => combinedText.includes(indicator));
  }

  async syncSetlistByShowId(showId: string): Promise<void> {
    const showResults = await db
      .select()
      .from(shows)
      .where(eq(shows.id, showId))
      .limit(1);
    const show = showResults[0];

    if (!show) {
      throw new Error(`Show not found: ${showId}`);
    }

    // Get the headliner artist
    const headlinerResults = await db
      .select()
      .from(artists)
      .where(eq(artists.id, show.headlinerArtistId))
      .limit(1);
    const headlinerArtist = headlinerResults[0];

    // Get the venue if it exists
    let venue: typeof venues.$inferSelect | null = null;
    if (show.venueId) {
      const venueResults = await db
        .select()
        .from(venues)
        .where(eq(venues.id, show.venueId))
        .limit(1);
      venue = venueResults[0] || null;
    }

    if (!headlinerArtist) {
      throw new Error(`Headliner artist not found for show: ${showId}`);
    }

    // Search for setlist on Setlist.fm
    const searchParams: any = {
      artistName: headlinerArtist.name,
      date: show.date,
    };

    if (venue?.name) {
      searchParams.venueName = venue.name;
    }

    const searchResult =
      await this.setlistFmClient.searchSetlists(searchParams);

    if (searchResult.setlist.length > 0) {
      // Use the first matching setlist
      const setlistData = searchResult.setlist[0];

      if (setlistData) {
        // Update show with setlist.fm ID
        await db
          .update(shows)
          .set({
            setlistFmId: setlistData.id,
            updatedAt: new Date(),
          })
          .where(eq(shows.id, showId));

        // Sync the setlist
        await this.syncSetlistFromSetlistFm(setlistData);
      }
    }
  }
}
