import { db } from '@repo/database';
import {
  artistSongs,
  artistStats,
  artists,
  setlists,
  shows,
  songs,
} from '@repo/database';
import { desc, eq, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

// POST /api/sync/artist-stats
// Body: { artistId: string }
// Updates or creates artist statistics
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

    // Calculate total shows
    const showsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(shows)
      .where(eq(shows.headlinerArtistId, artistId));

    const totalShows = Number(showsCount[0]?.count || 0);

    // Calculate total setlists
    const setlistsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(setlists)
      .where(eq(setlists.artistId, artistId));

    const totalSetlists = Number(setlistsCount[0]?.count || 0);

    // Calculate average setlist length
    const avgLengthResult = await db
      .select({
        avgLength: sql<number>`avg(subquery.song_count)`,
      })
      .from(
        db
          .select({
            setlistId: setlists.id,
            song_count: sql<number>`count(*)`.as('song_count'),
          })
          .from(setlists)
          .leftJoin(
            sql`setlist_songs`,
            sql`setlist_songs.setlist_id = ${setlists.id}`
          )
          .where(eq(setlists.artistId, artistId))
          .groupBy(setlists.id)
          .as('subquery')
      );

    const avgSetlistLength = avgLengthResult[0]?.avgLength || 0;

    // Get most played song (if we had setlist_songs data)
    // For now, we'll get the most popular song from the artist's catalog
    const popularSong = await db
      .select({
        title: songs.title,
        popularity: songs.popularity,
      })
      .from(artistSongs)
      .innerJoin(songs, eq(artistSongs.songId, songs.id))
      .where(eq(artistSongs.artistId, artistId))
      .orderBy(desc(songs.popularity))
      .limit(1);

    const mostPlayedSong = popularSong[0]?.title || null;

    // Get last show date
    const lastShow = await db
      .select({ date: shows.date })
      .from(shows)
      .where(eq(shows.headlinerArtistId, artistId))
      .orderBy(desc(shows.date))
      .limit(1);

    const lastShowDate = lastShow[0]?.date ? new Date(lastShow[0].date) : null;

    // Check if stats already exist
    const existingStats = await db
      .select()
      .from(artistStats)
      .where(eq(artistStats.artistId, artistId))
      .limit(1);

    let stats;
    const statsData = {
      artistId,
      totalShows,
      totalSetlists,
      avgSetlistLength: Number.parseFloat(avgSetlistLength.toFixed(2)),
      mostPlayedSong,
      lastShowDate,
      updatedAt: new Date(),
    };

    if (existingStats.length > 0) {
      // Update existing stats
      stats = await db
        .update(artistStats)
        .set(statsData)
        .where(eq(artistStats.artistId, artistId))
        .returning();
    } else {
      // Create new stats
      stats = await db.insert(artistStats).values(statsData).returning();
    }

    return NextResponse.json({
      success: true,
      message: 'Artist stats updated',
      artist: artistData,
      stats: stats[0],
    });
  } catch (error) {
    console.error('Artist stats sync error:', error);
    return NextResponse.json(
      {
        error: 'Artist stats sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
