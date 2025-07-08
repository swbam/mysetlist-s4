'use server';

import { CACHE_TAGS, REVALIDATION_TIMES } from '@/lib/cache';
import {
  artistStats,
  artists,
  db,
  showArtists,
  shows,
  venues,
} from '@repo/database';
import { spotify } from '@repo/external-apis';
import { and, desc, sql as drizzleSql, eq, gte, lt, or } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import type { PostgresError } from 'postgres';

const _getArtist = async (slug: string) => {
  try {
    const artist = await db.query.artists.findFirst({
      where: eq(artists.slug, slug),
    });
    return artist;
  } catch (err: unknown) {
    const error = err as Partial<PostgresError & { code: string }>;
    // If column "mbid" (or any other missing column) does not exist, attempt to patch schema on the fly.
    if (error?.code === '42703') {
      console.warn(
        '[db] Missing column detected, attempting hot-patch:',
        error
      );
      // Add mbid column if it is missing
      try {
        await db.execute(
          drizzleSql`ALTER TABLE artists ADD COLUMN IF NOT EXISTS mbid TEXT UNIQUE;`
        );
        // retry once
        const artistRetry = await db.query.artists.findFirst({
          where: eq(artists.slug, slug),
        });
        return artistRetry;
      } catch (patchErr) {
        console.error('Failed to hot-patch artists table:', patchErr);
      }
    }
    throw err;
  }
};

// Cached version with tags
export const getArtist = unstable_cache(_getArtist, ['artist-by-slug'], {
  revalidate: REVALIDATION_TIMES.artist,
  tags: [CACHE_TAGS.artists],
});

const _getArtistShows = async (artistId: string, type: 'upcoming' | 'past') => {
  const now = new Date();

  try {
    const artistShows = await db
      .select({
        show: shows,
        venue: venues,
        orderIndex: showArtists.orderIndex,
        isHeadliner: showArtists.isHeadliner,
      })
      .from(shows)
      .leftJoin(showArtists, eq(shows.id, showArtists.showId))
      .leftJoin(venues, eq(shows.venueId, venues.id))
      .where(
        and(
          or(
            eq(shows.headlinerArtistId, artistId),
            eq(showArtists.artistId, artistId)
          ),
          type === 'upcoming'
            ? gte(shows.date, now.toISOString().split('T')[0])
            : lt(shows.date, now.toISOString().split('T')[0])
        )
      )
      .orderBy(type === 'upcoming' ? shows.date : desc(shows.date))
      .limit(type === 'upcoming' ? 10 : 20);

    return artistShows;
  } catch (error) {
    console.error('Error fetching artist shows:', error);
    return [];
  }
};

// Cached version with shorter revalidation for upcoming shows
export const getArtistShows = unstable_cache(
  _getArtistShows,
  ['artist-shows'],
  {
    revalidate: REVALIDATION_TIMES.show,
    tags: [CACHE_TAGS.shows],
  }
);

const _getArtistStats = async (artistId: string) => {
  const stats = await db.query.artistStats.findFirst({
    where: eq(artistStats.artistId, artistId),
  });

  return stats;
};

// Cached version
export const getArtistStats = unstable_cache(
  _getArtistStats,
  ['artist-stats'],
  {
    revalidate: REVALIDATION_TIMES.stats,
    tags: [CACHE_TAGS.stats],
  }
);

const _getSimilarArtists = async (artistId: string, genres: string | null) => {
  // For now, just get random verified artists
  // In production, this would use genre matching or collaborative filtering
  const similar = await db.query.artists.findMany({
    where: and(
      eq(artists.verified, true),
      drizzleSql`${artists.id} != ${artistId}`
    ),
    limit: 5,
    orderBy: desc(artists.popularity),
  });

  return similar;
};

// Cached version
export const getSimilarArtists = unstable_cache(
  _getSimilarArtists,
  ['similar-artists'],
  {
    revalidate: REVALIDATION_TIMES.artist,
    tags: [CACHE_TAGS.artists],
  }
);

export async function getArtistTopTracks(spotifyId: string) {
  try {
    const tracks = await spotify.getArtistTopTracks(spotifyId);
    return tracks;
  } catch (error) {
    console.error('Failed to fetch top tracks:', error);
    return [];
  }
}
