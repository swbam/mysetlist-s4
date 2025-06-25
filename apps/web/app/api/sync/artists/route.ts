import { NextRequest, NextResponse } from 'next/server';
import { db, artists } from '@repo/database';
import { SpotifyClient } from '@repo/external-apis';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { artistId, spotifyId, forceSync } = await request.json();

    if (!artistId && !spotifyId) {
      return NextResponse.json(
        { error: 'Either artistId or spotifyId is required' },
        { status: 400 }
      );
    }

    let artist;
    if (artistId) {
      artist = await db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);
    } else if (spotifyId) {
      artist = await db
        .select()
        .from(artists)
        .where(eq(artists.spotifyId, spotifyId))
        .limit(1);
    }

    if (!artist?.[0]) {
      return NextResponse.json(
        { error: 'Artist not found' },
        { status: 404 }
      );
    }

    const artistRecord = artist[0];

    // Check if sync is needed
    const lastSynced = artistRecord.lastSyncedAt;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    if (!forceSync && lastSynced && lastSynced > oneHourAgo) {
      return NextResponse.json({ 
        message: 'Artist was synced recently',
        artist: artistRecord,
        lastSyncedAt: lastSynced
      });
    }

    if (!artistRecord.spotifyId) {
      return NextResponse.json(
        { error: 'Artist has no Spotify ID for syncing' },
        { status: 400 }
      );
    }

    try {
      const spotifyClient = new SpotifyClient({});
      await spotifyClient.authenticate();

      // Fetch latest data from Spotify
      const spotifyArtist = await spotifyClient.getArtist(artistRecord.spotifyId);
      
      // Update artist with latest data
      const updatedArtist = await db
        .update(artists)
        .set({
          name: spotifyArtist.name,
          imageUrl: spotifyArtist.images[0]?.url,
          smallImageUrl: spotifyArtist.images[2]?.url || spotifyArtist.images[1]?.url,
          genres: JSON.stringify(spotifyArtist.genres),
          popularity: spotifyArtist.popularity,
          followers: spotifyArtist.followers.total,
          externalUrls: JSON.stringify(spotifyArtist.external_urls),
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(artists.id, artistRecord.id))
        .returning();

      // Also sync top tracks if requested
      if (forceSync) {
        try {
          const topTracks = await spotifyClient.getArtistTopTracks(artistRecord.spotifyId);
          // Here you could sync the top tracks to the songs table
          // This is left as an enhancement for future implementation
        } catch (trackError) {
          console.warn('Failed to sync top tracks:', trackError);
        }
      }

      return NextResponse.json({
        success: true,
        artist: updatedArtist[0],
        syncedAt: new Date(),
      });

    } catch (spotifyError) {
      console.error('Spotify sync error:', spotifyError);
      return NextResponse.json(
        { error: 'Failed to sync with Spotify API' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Artist sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync artist' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const outdatedOnly = searchParams.get('outdated') === 'true';

    let query = db
      .select()
      .from(artists)
      .where(eq(artists.verified, true)); // Only sync verified artists

    if (outdatedOnly) {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      query = query.where(
        // Artists that haven't been synced in a week or never synced
        // Note: This would need proper SQL for null check
      );
    }

    const artistsToSync = await query.limit(limit);

    const syncResults = [];
    for (const artist of artistsToSync) {
      if (artist.spotifyId) {
        try {
          const response = await fetch('/api/sync/artists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ artistId: artist.id }),
          });
          
          if (response.ok) {
            const result = await response.json();
            syncResults.push({ artist: artist.id, success: true, result });
          } else {
            syncResults.push({ artist: artist.id, success: false, error: 'API error' });
          }
        } catch (error) {
          syncResults.push({ artist: artist.id, success: false, error: error.message });
        }
      }
    }

    return NextResponse.json({
      synced: syncResults.length,
      results: syncResults,
    });
  } catch (error) {
    console.error('Bulk sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync artists' },
      { status: 500 }
    );
  }
}