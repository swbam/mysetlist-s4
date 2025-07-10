'use server';

import {
  artistStats,
  artists,
  db,
  setlists,
  showArtists,
  shows,
  venues,
} from '@repo/database';
import { spotify } from '@repo/external-apis';
import { and, desc, sql as drizzleSql, eq, gte, lt, or } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, REVALIDATION_TIMES } from '~/lib/cache';

const _getArtist = async (slug: string) => {
  try {
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.slug, slug))
      .limit(1);
    return artist;
  } catch (err: unknown) {
    const error = err as Partial<{ code: string; message: string }>;
    // If column "mbid" (or any other missing column) does not exist, attempt to patch schema on the fly.
    if (error?.code === '42703') {
      // Add mbid column if it is missing
      try {
        await db.execute(
          drizzleSql`ALTER TABLE artists ADD COLUMN IF NOT EXISTS mbid TEXT UNIQUE;`
        );
        // retry once
        const [artistRetry] = await db
          .select()
          .from(artists)
          .where(eq(artists.slug, slug))
          .limit(1);
        return artistRetry;
      } catch (_patchErr) {}
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
    // Enhanced query with better data handling and validation
    const artistShows = await db
      .select({
        show: shows,
        venue: venues,
        orderIndex: showArtists.orderIndex,
        isHeadliner: showArtists.isHeadliner,
        // Additional fields for complete show data
        setlistCount: drizzleSql<number>`(
          SELECT COUNT(*)::int 
          FROM setlists 
          WHERE setlists.show_id = ${shows.id}
        )`,
        attendeeCount: drizzleSql<number>`(
          SELECT COUNT(*)::int 
          FROM show_attendance 
          WHERE show_attendance.show_id = ${shows.id}
        )`,
        voteCount: drizzleSql<number>`(
          SELECT COUNT(*)::int 
          FROM votes v 
          JOIN setlists s ON v.setlist_id = s.id 
          WHERE s.show_id = ${shows.id}
        )`,
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
            ? gte(shows.date, now.toISOString().split('T')[0] || now.toISOString())
            : lt(shows.date, now.toISOString().split('T')[0] || now.toISOString())
        )
      )
      .orderBy(type === 'upcoming' ? shows.date : desc(shows.date))
      .limit(type === 'upcoming' ? 15 : 25); // Increased limits for better UX

    // Enhanced validation and data transformation
    if (!artistShows || artistShows.length === 0) {
      return [];
    }

    // Transform and validate each show record
    return artistShows
      .filter(({ show }) => show && show.id) // Ensure valid show data
      .map(({ show, venue, orderIndex, isHeadliner, setlistCount, attendeeCount, voteCount }) => ({
        show: {
          ...show,
          setlistCount: setlistCount || 0,
          attendeeCount: attendeeCount || 0,
          voteCount: voteCount || 0,
          ticketUrl: show.ticketUrl || undefined,
          status: show.status || (type === 'upcoming' ? 'confirmed' : 'completed'),
        },
        venue: venue || undefined,
        orderIndex: orderIndex || 0,
        isHeadliner: isHeadliner || false,
      }));
  } catch (error) {
    console.error(`Error fetching ${type} shows for artist ${artistId}:`, error);
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
  const [stats] = await db
    .select()
    .from(artistStats)
    .where(eq(artistStats.artistId, artistId))
    .limit(1);

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

const _getSimilarArtists = async (artistId: string, _genres: string | null) => {
  // For now, just get random verified artists
  // In production, this would use genre matching or collaborative filtering
  const similar = await db
    .select()
    .from(artists)
    .where(
      and(
        eq(artists.verified, true),
        drizzleSql`${artists.id} != ${artistId}`
      )
    )
    .orderBy(desc(artists.popularity))
    .limit(5);

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
  } catch (_error) {
    return [];
  }
}

// New action for complete artist-to-setlist flow
const _getArtistSetlists = async (artistId: string, limit: number = 10) => {
  try {
    const artistSetlists = await db
      .select({
        setlist: setlists,
        show: shows,
        venue: venues,
        songCount: drizzleSql<number>`(
          SELECT COUNT(*)::int 
          FROM setlist_songs 
          WHERE setlist_songs.setlist_id = ${setlists.id}
        )`,
        voteCount: drizzleSql<number>`(
          SELECT COUNT(*)::int 
          FROM votes 
          WHERE votes.setlist_id = ${setlists.id}
        )`,
      })
      .from(setlists)
      .leftJoin(shows, eq(setlists.showId, shows.id))
      .leftJoin(venues, eq(shows.venueId, venues.id))
      .where(eq(setlists.artistId, artistId))
      .orderBy(desc(setlists.createdAt))
      .limit(limit);

    return artistSetlists
      .filter(({ setlist }) => setlist && setlist.id)
      .map(({ setlist, show, venue, songCount, voteCount }) => ({
        setlist,
        show: show || undefined,
        venue: venue || undefined,
        songCount: songCount || 0,
        voteCount: voteCount || 0,
      }));
  } catch (error) {
    console.error(`Error fetching setlists for artist ${artistId}:`, error);
    return [];
  }
};

export const getArtistSetlists = unstable_cache(
  _getArtistSetlists,
  ['artist-setlists'],
  {
    revalidate: REVALIDATION_TIMES.show,
    tags: [CACHE_TAGS.shows],
  }
);

// Enhanced action for artist songs with setlist integration
const _getArtistSongsWithSetlistData = async (artistId: string, limit: number = 50) => {
  try {
    const artistSongs = await db
      .select({
        song: drizzleSql`DISTINCT songs.*`,
        timesPlayed: drizzleSql<number>`COUNT(setlist_songs.song_id)::int`,
        lastPlayed: drizzleSql<string>`MAX(setlists.created_at)`,
        popularity: drizzleSql<number>`
          COALESCE(AVG(votes.rating), 0)::int
        `,
      })
      .from(drizzleSql`songs`)
      .leftJoin(drizzleSql`setlist_songs`, drizzleSql`setlist_songs.song_id = songs.id`)
      .leftJoin(setlists, drizzleSql`setlist_songs.setlist_id = setlists.id`)
      .leftJoin(drizzleSql`votes`, drizzleSql`votes.setlist_id = setlists.id`)
      .where(drizzleSql`songs.artist = (SELECT name FROM artists WHERE id = ${artistId})`)
      .groupBy(drizzleSql`songs.id`)
      .orderBy(drizzleSql`COUNT(setlist_songs.song_id) DESC`)
      .limit(limit);

    return artistSongs;
  } catch (error) {
    console.error(`Error fetching songs with setlist data for artist ${artistId}:`, error);
    return [];
  }
};

export const getArtistSongsWithSetlistData = unstable_cache(
  _getArtistSongsWithSetlistData,
  ['artist-songs-with-setlist-data'],
  {
    revalidate: REVALIDATION_TIMES.stats,
    tags: [CACHE_TAGS.stats],
  }
);
