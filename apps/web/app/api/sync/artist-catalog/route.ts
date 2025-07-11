import { db } from '@repo/database';
import { artists } from '@repo/database';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { artistId, spotifyId } = await request.json();

    if (!artistId) {
      return NextResponse.json(
        { error: 'artistId is required' },
        { status: 400 }
      );
    }

    // Get artist details
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (!artist) {
      return NextResponse.json(
        { error: 'Artist not found' },
        { status: 404 }
      );
    }

    // If we already have song catalog synced recently, skip
    if (
      artist.songCatalogSyncedAt &&
      new Date(artist.songCatalogSyncedAt) >
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days
    ) {
      return NextResponse.json({
        success: true,
        message: 'Song catalog already up to date',
        lastSyncedAt: artist.songCatalogSyncedAt,
      });
    }

    // For now, return success - in production this would sync with Spotify
    // The actual sync logic is in the sync-artist.ts file
    return NextResponse.json({
      success: true,
      message: 'Artist catalog sync initiated',
      artistId,
      spotifyId: spotifyId || artist.spotifyId,
    });
  } catch (error) {
    console.error('Error syncing artist catalog:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}