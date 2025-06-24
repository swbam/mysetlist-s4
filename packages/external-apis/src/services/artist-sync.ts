import { db, artists, songs } from '@repo/database';
import { SpotifyClient } from '../clients/spotify';
import { eq } from 'drizzle-orm';

export class ArtistSyncService {
  private spotifyClient: SpotifyClient;

  constructor() {
    this.spotifyClient = new SpotifyClient({});
  }

  async syncArtist(artistId: string): Promise<void> {
    await this.spotifyClient.authenticate();

    try {
      // Get artist from Spotify
      const spotifyArtist = await this.spotifyClient.getArtist(artistId);
      
      // Get top tracks
      const topTracks = await this.spotifyClient.getArtistTopTracks(artistId);
      
      // Update or create artist in database
      await db
        .insert(artists)
        .values({
          spotifyId: spotifyArtist.id,
          name: spotifyArtist.name,
          slug: this.generateSlug(spotifyArtist.name),
          imageUrl: spotifyArtist.images[0]?.url,
          smallImageUrl: spotifyArtist.images[2]?.url,
          genres: JSON.stringify(spotifyArtist.genres),
          popularity: spotifyArtist.popularity,
          followers: spotifyArtist.followers.total,
          externalUrls: JSON.stringify(spotifyArtist.external_urls),
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: artists.spotifyId,
          set: {
            name: spotifyArtist.name,
            imageUrl: spotifyArtist.images[0]?.url,
            smallImageUrl: spotifyArtist.images[2]?.url,
            genres: JSON.stringify(spotifyArtist.genres),
            popularity: spotifyArtist.popularity,
            followers: spotifyArtist.followers.total,
            lastSyncedAt: new Date(),
          },
        });

      // Sync top tracks
      await this.syncArtistTracks(artistId, topTracks.tracks);

    } catch (error) {
      console.error(`Failed to sync artist ${artistId}:`, error);
      throw error;
    }
  }

  private async syncArtistTracks(artistId: string, tracks: any[]): Promise<void> {
    const artist = await db.query.artists.findFirst({
      where: eq(artists.spotifyId, artistId),
    });

    if (!artist) return;

    for (const track of tracks) {
      await db
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
        .onConflictDoUpdate({
          target: songs.spotifyId,
          set: {
            title: track.name,
            popularity: track.popularity,
            isPlayable: track.is_playable,
          },
        });
    }
  }

  async syncPopularArtists(): Promise<void> {
    await this.spotifyClient.authenticate();
    
    try {
      // Get popular artists in different genres
      const genres = ['rock', 'pop', 'hip-hop', 'electronic', 'indie'];
      
      for (const genre of genres) {
        const searchResult = await this.spotifyClient.searchArtists(genre, 10);
        
        for (const artist of searchResult.artists.items) {
          try {
            await this.syncArtist(artist.id);
          } catch (error) {
            console.error(`Failed to sync artist ${artist.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to sync popular artists:', error);
      throw error;
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
} 