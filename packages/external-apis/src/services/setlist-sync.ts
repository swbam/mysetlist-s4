import { db, shows, setlists, setlistSongs, songs, artists } from '@repo/database';
import { SetlistFmClient, SetlistFmSetlist, SetlistFmSet } from '../clients/setlistfm';
import { SpotifyClient } from '../clients/spotify';
import { eq, and } from 'drizzle-orm';

export class SetlistSyncService {
  private setlistFmClient: SetlistFmClient;
  private spotifyClient: SpotifyClient;

  constructor() {
    this.setlistFmClient = new SetlistFmClient({});
    this.spotifyClient = new SpotifyClient({});
  }

  async syncSetlistFromSetlistFm(setlistData: SetlistFmSetlist): Promise<void> {
    try {
      await this.spotifyClient.authenticate();

      // Find the show
      const show = await db.query.shows.findFirst({
        where: eq(shows.setlistFmId, setlistData.id),
      });

      if (!show) {
        console.warn(`Show not found for setlist: ${setlistData.id}`);
        return;
      }

      // Find the artist
      const artist = await db.query.artists.findFirst({
        where: eq(artists.name, setlistData.artist.name),
      });

      if (!artist) {
        console.warn(`Artist not found: ${setlistData.artist.name}`);
        return;
      }

      // Create setlist
      const [setlist] = await db
        .insert(setlists)
        .values({
          showId: show.id,
          userId: null, // System-created setlist
          notes: setlistData.info,
          source: 'setlistfm',
          voteCount: 0,
          isOfficial: true,
        })
        .onConflictDoNothing()
        .returning({ id: setlists.id });

      if (!setlist) {
        console.log(`Setlist already exists for show: ${show.id}`);
        return;
      }

      // Process all sets
      let songOrder = 0;
      for (const set of setlistData.sets.set) {
        const songs = await this.processSongsFromSet(set, artist.id, artist.spotifyId);
        
        // Add songs to setlist
        for (const song of songs) {
          await db
            .insert(setlistSongs)
            .values({
              setlistId: setlist.id,
              songId: song.id,
              orderIndex: songOrder++,
              isEncore: set.encore ? true : false,
              notes: song.info,
            })
            .onConflictDoNothing();
        }
      }

      // Update show setlist count
      await db
        .update(shows)
        .set({
          setlistCount: show.setlistCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(shows.id, show.id));

    } catch (error) {
      console.error(`Failed to sync setlist: ${setlistData.id}`, error);
      throw error;
    }
  }

  private async processSongsFromSet(
    set: SetlistFmSet,
    artistId: string,
    artistSpotifyId: string | null
  ): Promise<Array<{ id: string; info?: string }>> {
    const processedSongs: Array<{ id: string; info?: string }> = [];

    for (const songData of set.song) {
      try {
        // Check if song already exists
        let song = await db.query.songs.findFirst({
          where: and(
            eq(songs.title, songData.name),
            eq(songs.artist, songData.cover?.name || artistId)
          ),
        });

        if (!song && artistSpotifyId) {
          // Try to find song on Spotify
          try {
            const searchQuery = `track:"${songData.name}" artist:"${songData.cover?.name || artistId}"`;
            const searchResult = await this.spotifyClient.searchTracks(searchQuery, 1);
            
            if (searchResult.tracks.items.length > 0) {
              const track = searchResult.tracks.items[0];
              
              // Create song
              const [newSong] = await db
                .insert(songs)
                .values({
                  spotifyId: track.id,
                  title: track.name,
                  artist: track.artists[0].name,
                  album: track.album.name,
                  albumArtUrl: track.album.images[0]?.url,
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
          } catch (error) {
            console.error(`Failed to find song on Spotify: ${songData.name}`, error);
          }
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
          
          song = newSong;
        }

        if (song) {
          processedSongs.push({
            id: song.id,
            info: songData.info,
          });
        }
      } catch (error) {
        console.error(`Failed to process song: ${songData.name}`, error);
      }
    }

    return processedSongs;
  }

  async syncRecentSetlists(artistName: string, limit = 20): Promise<void> {
    try {
      const searchResult = await this.setlistFmClient.searchSetlists({
        artistName,
        p: 1,
      });

      const recentSetlists = searchResult.setlist.slice(0, limit);
      
      for (const setlist of recentSetlists) {
        await this.syncSetlistFromSetlistFm(setlist);
        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Failed to sync recent setlists for ${artistName}:`, error);
      throw error;
    }
  }

  async syncSetlistByShowId(showId: string): Promise<void> {
    try {
      const show = await db.query.shows.findFirst({
        where: eq(shows.id, showId),
        with: {
          headlinerArtist: true,
          venue: true,
        },
      });

      if (!show) {
        throw new Error(`Show not found: ${showId}`);
      }

      // Search for setlist on Setlist.fm
      const searchResult = await this.setlistFmClient.searchSetlists({
        artistName: show.headlinerArtist.name,
        venueName: show.venue?.name,
        date: show.date,
      });

      if (searchResult.setlist.length > 0) {
        // Use the first matching setlist
        const setlistData = searchResult.setlist[0];
        
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
      } else {
        console.warn(`No setlist found on Setlist.fm for show: ${showId}`);
      }
    } catch (error) {
      console.error(`Failed to sync setlist for show ${showId}:`, error);
      throw error;
    }
  }
}