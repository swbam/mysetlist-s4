import { db } from '@repo/database';
import { artistSongs, artists, songs } from '@repo/database';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

// POST /api/sync/songs
// Body: { artistId: string }
// Syncs song catalog for a given artist
export async function POST(request: NextRequest) {
  try {
    const { artistId } = await request.json();

    if (!artistId) {
      return NextResponse.json(
        { error: 'Artist ID required' },
        { status: 400 }
      );
    }

    // Verify artist exists
    const artist = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (!artist.length) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    const artistData = artist[0];

    // Check if artist already has songs
    const existingSongs = await db
      .select({
        song: songs,
      })
      .from(artistSongs)
      .innerJoin(songs, eq(artistSongs.songId, songs.id))
      .where(eq(artistSongs.artistId, artistId));

    if (existingSongs.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Song catalog already synced',
        artist: artistData,
        songsCount: existingSongs.length,
        songs: existingSongs.map((s) => s.song),
      });
    }

    // For now, create sample songs
    // In production, this would call Spotify API or other music data sources
    const sampleSongs = [
      {
        title: 'Greatest Hit #1',
        artist: artistData.name,
        album: 'Best Of Collection',
        albumType: 'album' as const,
        releaseDate: '2023-01-01',
        durationMs: 210000, // 3:30
        popularity: 85,
        isExplicit: false,
        isPlayable: true,
      },
      {
        title: 'Fan Favorite',
        artist: artistData.name,
        album: 'Live Sessions',
        albumType: 'album' as const,
        releaseDate: '2023-06-15',
        durationMs: 195000, // 3:15
        popularity: 78,
        isExplicit: false,
        isPlayable: true,
      },
      {
        title: 'Acoustic Dreams',
        artist: artistData.name,
        album: 'Unplugged',
        albumType: 'album' as const,
        releaseDate: '2023-09-20',
        durationMs: 240000, // 4:00
        popularity: 72,
        isExplicit: false,
        isPlayable: true,
      },
      {
        title: 'Electric Nights',
        artist: artistData.name,
        album: 'Dance Collection',
        albumType: 'album' as const,
        releaseDate: '2024-01-10',
        durationMs: 180000, // 3:00
        popularity: 80,
        isExplicit: false,
        isPlayable: true,
      },
      {
        title: 'Summer Vibes',
        artist: artistData.name,
        album: 'Seasonal Hits',
        albumType: 'single' as const,
        releaseDate: '2024-07-01',
        durationMs: 200000, // 3:20
        popularity: 75,
        isExplicit: false,
        isPlayable: true,
      },
    ];

    // Insert songs
    const insertedSongs = await db
      .insert(songs)
      .values(sampleSongs)
      .returning();

    // Create artist-song relationships
    const artistSongRelations = insertedSongs.map((song) => ({
      artistId: artistId,
      songId: song.id,
      isPrimaryArtist: true,
    }));

    await db.insert(artistSongs).values(artistSongRelations);

    // Update artist's song catalog sync timestamp and counts
    await db
      .update(artists)
      .set({
        songCatalogSyncedAt: new Date(),
        totalSongs: insertedSongs.length,
        updatedAt: new Date(),
      })
      .where(eq(artists.id, artistId));

    return NextResponse.json({
      success: true,
      message: 'Song catalog sync completed',
      artist: artistData,
      songsCount: insertedSongs.length,
      songs: insertedSongs,
    });
  } catch (error) {
    console.error('Songs sync error:', error);
    return NextResponse.json(
      {
        error: 'Songs sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
