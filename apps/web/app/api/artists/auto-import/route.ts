import { db } from '@repo/database';
import { artistSongs, artists, shows } from '@repo/database';
import { eq, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

interface AutoImportRequest {
  artistId?: string;
  artistName?: string;
  spotifyId?: string;
}

/**
 * Automated artist data import handler
 * Triggers comprehensive data sync when user interacts with an artist
 */
export async function POST(request: NextRequest) {
  try {
    const body: AutoImportRequest = await request.json();
    const { artistId, artistName, spotifyId } = body;

    if (!artistId && !artistName && !spotifyId) {
      return NextResponse.json(
        { error: 'Either artistId, artistName, or spotifyId is required' },
        { status: 400 }
      );
    }

    // Find or create artist
    let artist;

    if (artistId) {
      // Look up by ID
      const [existingArtist] = await db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);

      artist = existingArtist;
    } else if (spotifyId) {
      // Look up by Spotify ID
      const [existingArtist] = await db
        .select()
        .from(artists)
        .where(eq(artists.spotifyId, spotifyId))
        .limit(1);

      artist = existingArtist;
    } else if (artistName) {
      // Look up by name
      const [existingArtist] = await db
        .select()
        .from(artists)
        .where(eq(artists.name, artistName))
        .limit(1);

      artist = existingArtist;
    }

    // If artist doesn't exist, trigger sync to create it
    if (!artist) {
      // Import the sync function directly instead of making an HTTP call
      const { syncArtist } = await import('../sync/sync-artist');

      try {
        if (!artistName && !spotifyId) {
          return NextResponse.json(
            { error: 'Artist name or Spotify ID is required for sync' },
            { status: 400 }
          );
        }
        const syncResult = await syncArtist({ 
          artistName: artistName || 'Unknown Artist', 
          ...(spotifyId && { spotifyId })
        });
        if (!syncResult.success || !syncResult.artist) {
          return NextResponse.json(
            { error: 'Failed to sync artist', details: syncResult.error },
            { status: 500 }
          );
        }
        artist = syncResult.artist;
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Failed to sync artist',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    }

    // Check if we need to sync data (only if not synced in last 24 hours)
    const needsSync =
      !artist.lastSyncedAt ||
      new Date(artist.lastSyncedAt) <
        new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours

    if (needsSync) {
      // Update last synced timestamp first to prevent duplicate syncs
      await db
        .update(artists)
        .set({ lastSyncedAt: new Date() })
        .where(eq(artists.id, artist.id));

      // Trigger background sync for shows and additional data
      setImmediate(async () => {
        try {
          // If we have a Ticketmaster ID, sync shows
          if (artist.ticketmasterId) {
            await fetch(`${process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3001'}/api/sync/shows`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ticketmasterId: artist.ticketmasterId,
                artistId: artist.id,
              }),
            });
          }
          
          // Sync additional data from external APIs
          await fetch(`${process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3001'}/api/sync/artist-catalog`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              artistId: artist.id,
              spotifyId: artist.spotifyId,
            }),
          });
        } catch (_error) {}
      });
    }

    // Get current data stats
    const [showCount] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(shows)
      .where(eq(shows.headlinerArtistId, artist.id));

    const [songCount] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(artistSongs)
      .where(eq(artistSongs.artistId, artist.id));

    // Helper function to safely parse genres
    const parseGenres = (genresField: string | null): string[] => {
      if (!genresField) return [];
      
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(genresField);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        // If JSON parsing fails, treat as comma-separated string
        return genresField
          .split(',')
          .map((genre) => genre.trim())
          .filter((genre) => genre.length > 0);
      }
    };

    return NextResponse.json({
      success: true,
      artist: {
        id: artist.id,
        name: artist.name,
        slug: artist.slug,
        spotifyId: artist.spotifyId,
        ticketmasterId: artist.ticketmasterId,
        imageUrl: artist.imageUrl,
        genres: parseGenres(artist.genres),
        popularity: artist.popularity,
        followers: artist.followers,
        verified: artist.verified,
      },
      stats: {
        showCount: showCount?.count || 0,
        songCount: songCount?.count || 0,
        totalAlbums: artist.totalAlbums || 0,
        totalSongs: artist.totalSongs || 0,
        lastSyncedAt: artist.lastSyncedAt,
        lastFullSyncAt: artist.lastFullSyncAt,
        songCatalogSyncedAt: artist.songCatalogSyncedAt,
        syncTriggered: needsSync,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to auto-import artist data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
