import {
  SetlistFmClient,
  type SetlistFmSet,
  type SetlistFmSetlist,
} from "../clients/setlistfm";
import { SpotifyClient } from "../clients/spotify";
import { and, db, eq } from "../database";
import {
  artists,
  setlistSongs,
  setlists,
  shows,
  songs,
  venues,
} from "../schema";

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
          .insert(setlistSongs)
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

  async syncRecentSetlists(artistName: string, limit = 20): Promise<void> {
    const searchResult = await this.setlistFmClient.searchSetlists({
      artistName,
      p: 1,
    });

    const recentSetlists = searchResult.setlist.slice(0, limit);

    for (const setlist of recentSetlists) {
      await this.syncSetlistFromSetlistFm(setlist);
      // Rate limit
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
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
