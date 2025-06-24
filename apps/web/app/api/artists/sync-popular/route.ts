import { NextRequest, NextResponse } from 'next/server';
import { ArtistSyncService } from '@repo/external-apis/src/services/artist-sync';
import * as Sentry from "@sentry/nextjs";

const { logger } = Sentry;

export async function POST(request: NextRequest) {
  try {
    // Check for admin authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!authHeader || !cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized sync attempt', { 
        hasAuth: !!authHeader,
        hasCronSecret: !!cronSecret 
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { limit = 50, genres = ['rock', 'pop', 'hip-hop', 'electronic', 'indie', 'country', 'jazz', 'classical'] } = body;

    logger.info('Starting popular artist sync', { limit, genres });

    const syncService = new ArtistSyncService();
    const results = {
      synced: 0,
      errors: 0,
      skipped: 0,
    };

    for (const genre of genres) {
      try {
        logger.debug(`Syncing artists for genre: ${genre}`);
        
        // Search for popular artists in this genre
        const response = await fetch(`https://api.spotify.com/v1/search?q=genre:${genre}&type=artist&limit=${Math.min(limit, 50)}&market=US`, {
          headers: {
            'Authorization': `Bearer ${await getSpotifyToken()}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          logger.error(`Failed to search Spotify for genre ${genre}`, { 
            status: response.status, 
            statusText: response.statusText 
          });
          continue;
        }

        const data = await response.json();
        const artists = data.artists?.items || [];

        logger.debug(`Found ${artists.length} artists for genre: ${genre}`);

        for (const artist of artists.slice(0, Math.floor(limit / genres.length))) {
          try {
            await syncService.syncArtist(artist.id);
            results.synced++;
            logger.debug(`Synced artist: ${artist.name}`);
          } catch (error) {
            logger.error(`Failed to sync artist ${artist.name}`, { 
              artistId: artist.id, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
            results.errors++;
          }
        }
      } catch (error) {
        logger.error(`Failed to process genre ${genre}`, { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        results.errors++;
      }
    }

    logger.info('Popular artist sync completed', results);

    return NextResponse.json({
      success: true,
      message: 'Popular artists sync completed',
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Popular artist sync failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return NextResponse.json(
      { error: 'Failed to sync popular artists' },
      { status: 500 }
    );
  }
}

async function getSpotifyToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get Spotify token');
  }

  const data = await response.json();
  return data.access_token;
} 