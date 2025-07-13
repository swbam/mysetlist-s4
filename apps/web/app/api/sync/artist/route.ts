import { db } from '@repo/database';
import { artists } from '@repo/database';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { invalidateArtistCache } from '~/lib/cache';

// POST /api/sync/artist
// Body: { artistId: string, slug: string }
// Triggers Supabase edge functions (sync-artists, sync-artist-shows, sync-song-catalog)
export async function POST(request: NextRequest) {
  try {
    const { artistId, slug } = await request.json();

    if (!artistId && !slug) {
      return NextResponse.json(
        { error: 'Artist ID or slug required' },
        { status: 400 }
      );
    }

    // Find artist
    const artist = await db
      .select()
      .from(artists)
      .where(artistId ? eq(artists.id, artistId) : eq(artists.slug, slug))
      .limit(1);

    if (!artist.length || !artist[0]) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    const artistData = artist[0];

    // Check if sync is needed (last synced > 1 hour ago)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const needsSync =
      !artistData.lastSyncedAt ||
      new Date(artistData.lastSyncedAt) < oneHourAgo;

    if (!needsSync) {
      return NextResponse.json({
        success: true,
        message: 'Artist data is up to date',
        artist: artistData,
        synced: false,
      });
    }

    // Trigger sync operations in parallel
    const syncPromises: Promise<Response>[] = [];

    // 1. Sync artist shows
    if (artistData.spotifyId) {
      syncPromises.push(
        fetch(`${process.env['NEXT_PUBLIC_APP_URL']}/api/sync/shows`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artistId: artistData.id }),
        })
      );
    }

    // 2. Sync song catalog if needed
    const songCatalogStale =
      !artistData.songCatalogSyncedAt ||
      new Date(artistData.songCatalogSyncedAt) <
        new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours

    if (songCatalogStale && artistData.spotifyId) {
      syncPromises.push(
        fetch(`${process.env['NEXT_PUBLIC_APP_URL']}/api/sync/songs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artistId: artistData.id }),
        })
      );
    }

    // 3. Update artist stats
    syncPromises.push(
      fetch(`${process.env['NEXT_PUBLIC_APP_URL']}/api/sync/artist-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId: artistData.id }),
      })
    );

    // Execute all syncs
    await Promise.allSettled(syncPromises);

    // Update last synced timestamp
    await db
      .update(artists)
      .set({
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(artists.id, artistData.id));

    // Invalidate artist cache after sync
    await invalidateArtistCache(artistData.id, artistData.slug);

    return NextResponse.json({
      success: true,
      message: 'Artist sync completed',
      artist: artistData,
      synced: true,
      operations: {
        shows: true,
        songs: songCatalogStale,
        stats: true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
