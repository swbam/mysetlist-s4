import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { artists, songs } from '@repo/database';
import { eq } from 'drizzle-orm';
import { env } from '@/env';

// Simple Spotify client without external dependencies
class SpotifyClient {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  async authenticate(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return; // Token is still valid
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error('Spotify authentication failed');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
  }

  async searchArtists(query: string, limit = 20): Promise<any> {
    await this.authenticate();
    
    const params = new URLSearchParams({
      q: query,
      type: 'artist',
      limit: limit.toString(),
    });

    const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Spotify search failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getArtist(artistId: string): Promise<any> {
    await this.authenticate();

    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get artist: ${response.statusText}`);
    }

    return response.json();
  }

  async getArtistTopTracks(artistId: string, market = 'US'): Promise<any> {
    await this.authenticate();

    const response = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get top tracks: ${response.statusText}`);
    }

    return response.json();
  }
}

const spotify = new SpotifyClient();

export async function POST(request: NextRequest) {
  try {
    const { artistName, spotifyId } = await request.json();

    if (!artistName && !spotifyId) {
      return NextResponse.json(
        { error: 'Either artistName or spotifyId is required' },
        { status: 400 }
      );
    }

    // Check if Spotify credentials are available
    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Spotify credentials not configured' },
        { status: 500 }
      );
    }

    let spotifyArtist;

    if (spotifyId) {
      // Get artist by ID
      spotifyArtist = await spotify.getArtist(spotifyId);
    } else {
      // Search for artist by name
      const searchResults = await spotify.searchArtists(artistName, 1);
      if (!searchResults.artists?.items?.length) {
        return NextResponse.json(
          { error: 'Artist not found on Spotify' },
          { status: 404 }
        );
      }
      spotifyArtist = searchResults.artists.items[0];
    }

    // Generate slug
    const slug = spotifyArtist.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if artist already exists
    const existingArtist = await db
      .select()
      .from(artists)
      .where(eq(artists.spotifyId, spotifyArtist.id))
      .limit(1);

    let artistRecord;

    if (existingArtist.length > 0) {
      // Update existing artist
      const [updated] = await db
        .update(artists)
        .set({
          name: spotifyArtist.name,
          imageUrl: spotifyArtist.images[0]?.url,
          smallImageUrl: spotifyArtist.images[2]?.url,
          genres: JSON.stringify(spotifyArtist.genres || []),
          popularity: spotifyArtist.popularity || 0,
          followers: spotifyArtist.followers?.total || 0,
          verified: true,
          externalUrls: JSON.stringify(spotifyArtist.external_urls || {}),
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(artists.id, existingArtist[0].id))
        .returning();

      artistRecord = updated;
    } else {
      // Create new artist
      const [created] = await db
        .insert(artists)
        .values({
          spotifyId: spotifyArtist.id,
          name: spotifyArtist.name,
          slug,
          imageUrl: spotifyArtist.images[0]?.url,
          smallImageUrl: spotifyArtist.images[2]?.url,
          genres: JSON.stringify(spotifyArtist.genres || []),
          popularity: spotifyArtist.popularity || 0,
          followers: spotifyArtist.followers?.total || 0,
          verified: true,
          externalUrls: JSON.stringify(spotifyArtist.external_urls || {}),
          lastSyncedAt: new Date(),
        })
        .returning();

      artistRecord = created;
    }

    // Sync top tracks
    try {
      const topTracks = await spotify.getArtistTopTracks(spotifyArtist.id);
      
      for (const track of topTracks.tracks || []) {
        await db
          .insert(songs)
          .values({
            spotifyId: track.id,
            title: track.name,
            artist: track.artists[0]?.name || spotifyArtist.name,
            album: track.album?.name,
            albumArtUrl: track.album?.images?.[0]?.url,
            releaseDate: track.album?.release_date ? new Date(track.album.release_date) : null,
            durationMs: track.duration_ms,
            popularity: track.popularity || 0,
            previewUrl: track.preview_url,
            isExplicit: track.explicit || false,
            isPlayable: track.is_playable !== false,
          })
          .onConflictDoUpdate({
            target: songs.spotifyId,
            set: {
              title: track.name,
              popularity: track.popularity || 0,
              isPlayable: track.is_playable !== false,
              updatedAt: new Date(),
            },
          });
      }
    } catch (error) {
      console.error('Failed to sync top tracks:', error);
      // Continue without failing the entire sync
    }

    return NextResponse.json({
      success: true,
      artist: {
        id: artistRecord.id,
        name: artistRecord.name,
        slug: artistRecord.slug,
        spotifyId: artistRecord.spotifyId,
        imageUrl: artistRecord.imageUrl,
        genres: JSON.parse(artistRecord.genres || '[]'),
        popularity: artistRecord.popularity,
        followers: artistRecord.followers,
      },
    });

  } catch (error) {
    console.error('Artist sync failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync artist',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to sync popular artists
export async function GET() {
  try {
    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Spotify credentials not configured' },
        { status: 500 }
      );
    }

    // Popular artists to seed the database
    const popularArtists = [
      'Taylor Swift',
      'Ed Sheeran', 
      'Ariana Grande',
      'Drake',
      'The Weeknd',
      'Billie Eilish',
      'Post Malone',
      'Olivia Rodrigo',
      'Harry Styles',
      'Dua Lipa',
      'Coldplay',
      'Imagine Dragons',
      'Maroon 5',
      'OneRepublic',
      'The Chainsmokers',
      'Arctic Monkeys',
      'Twenty One Pilots',
      'Foo Fighters',
      'Red Hot Chili Peppers',
      'Radiohead'
    ];

    const syncedArtists = [];
    const errors = [];

    for (const artistName of popularArtists) {
      try {
        const searchResults = await spotify.searchArtists(artistName, 1);
        if (searchResults.artists?.items?.length > 0) {
          const spotifyArtist = searchResults.artists.items[0];
          
          // Sync this artist
          const syncResponse = await fetch(
            `${env.NEXT_PUBLIC_APP_URL}/api/artists/sync`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ spotifyId: spotifyArtist.id }),
            }
          );

          if (syncResponse.ok) {
            const result = await syncResponse.json();
            syncedArtists.push(result.artist);
          } else {
            errors.push(`Failed to sync ${artistName}`);
          }
        }
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error syncing ${artistName}:`, error);
        errors.push(`Error syncing ${artistName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount: syncedArtists.length,
      totalAttempted: popularArtists.length,
      syncedArtists,
      errors,
    });

  } catch (error) {
    console.error('Bulk artist sync failed:', error);
    return NextResponse.json(
      { error: 'Bulk sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 