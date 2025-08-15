"use server";

import {
  artistStats,
  artists,
  db,
  setlistSongs,
  setlists,
  showArtists,
  shows,
  songs,
  venues,
} from "@repo/database";
import { spotify } from "@repo/external-apis";
import { and, desc, sql as drizzleSql, eq, or } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, REVALIDATION_TIMES } from "~/lib/cache";

const _getArtist = async (slug: string) => {
  try {
    // Validate input
    if (!slug || typeof slug !== "string") {
      console.error("Invalid slug provided to getArtist:", slug);
      return null;
    }

    // Use Drizzle ORM for consistent database access
    const artistResults = await db
      .select({
        id: artists.id,
        spotifyId: artists.spotifyId,
        tmAttractionId: artists.tmAttractionId,
        name: artists.name,
        slug: artists.slug,
        imageUrl: artists.imageUrl,
        smallImageUrl: artists.smallImageUrl,
        genres: artists.genres,
        popularity: artists.popularity,
        followers: artists.followers,
        followerCount: artists.followerCount,
        monthlyListeners: artists.monthlyListeners,
        verified: artists.verified,
        externalUrls: artists.externalUrls,
        importStatus: artists.importStatus,
        lastSyncedAt: artists.lastSyncedAt,
        songCatalogSyncedAt: artists.songCatalogSyncedAt,
        totalAlbums: artists.totalAlbums,
        totalSongs: artists.totalSongs,
        lastFullSyncAt: artists.lastFullSyncAt,
        trendingScore: artists.trendingScore,
        totalShows: artists.totalShows,
        upcomingShows: artists.upcomingShows,
        totalSetlists: artists.totalSetlists,
        createdAt: artists.createdAt,
        updatedAt: artists.updatedAt,
      })
      .from(artists)
      .where(eq(artists.slug, slug))
      .limit(1);

    const [artist] = artistResults;
    if (artist) {
      return artist;
    }

    // Artist not found - return null instead of auto-importing
    console.warn("Artist not found in database:", slug);
    return null;
  } catch (err: unknown) {
    console.error("Critical error in getArtist for slug:", slug, err);
    // Return null instead of throwing to prevent 500 errors
    return null;
  }
};

// Cached version with tags
export const getArtist = unstable_cache(_getArtist, ["artist-by-slug"], {
  revalidate: REVALIDATION_TIMES.artist,
  tags: [CACHE_TAGS.artists],
});

const _getArtistShows = async (artistId: string, type: "upcoming" | "past") => {
  try {
    // Validate inputs
    if (!artistId || typeof artistId !== "string") {
      console.error("Invalid artistId provided to getArtistShows:", artistId);
      return [];
    }

    if (!type || !["upcoming", "past"].includes(type)) {
      console.error("Invalid type provided to getArtistShows:", type);
      return [];
    }
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
        // Attendance feature removed as per requirements
        voteCount: drizzleSql<number>`(
          SELECT COUNT(*)::int 
          FROM votes v 
          JOIN setlist_songs ss ON v.setlist_song_id = ss.id 
          JOIN setlists s ON ss.setlist_id = s.id 
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
            eq(showArtists.artistId, artistId),
          ),
          type === "upcoming"
            ? drizzleSql`${shows.date} >= CURRENT_DATE`
            : drizzleSql`${shows.date} < CURRENT_DATE`,
        ),
      )
      .orderBy(type === "upcoming" ? shows.date : desc(shows.date))
      .limit(type === "upcoming" ? 15 : 25); // Increased limits for better UX

    // If no shows found and we're looking for upcoming shows, log for monitoring
    if ((!artistShows || artistShows.length === 0) && type === "upcoming") {
      console.log(
        `No ${type} shows found for artist ${artistId}. Real-time sync may be needed.`,
      );
      // Return empty results - no fake data
      return [];
    }

    // Enhanced validation and data transformation
    if (!artistShows || artistShows.length === 0) {
      return [];
    }

    // Transform and validate each show record
    return artistShows
      .filter(({ show }) => show?.id) // Ensure valid show data
      .map(
        ({
          show,
          venue,
          orderIndex,
          isHeadliner,
          setlistCount,
          voteCount,
        }) => ({
          show: {
            ...show,
            setlistCount: setlistCount || 0,
            voteCount: voteCount || 0,
            ticketUrl: show.ticketUrl || undefined,
            status:
              show.status || (type === "upcoming" ? "confirmed" : "completed"),
          },
          venue: venue || undefined,
          orderIndex: orderIndex || 0,
          isHeadliner: isHeadliner || false,
        }),
      );
  } catch (error) {
    console.error(
      `Error fetching ${type} shows for artist ${artistId}:`,
      error,
    );
    return [];
  }
};

// Cached version with dynamic revalidation based on show type
export const getArtistShows = unstable_cache(
  _getArtistShows,
  ["artist-shows"],
  {
    revalidate: 1800, // 30 minutes for better performance
    tags: [CACHE_TAGS.shows, CACHE_TAGS.artists],
  },
);

const _getArtistStats = async (artistId: string) => {
  try {
    // Validate input
    if (!artistId || typeof artistId !== "string") {
      console.error("Invalid artistId provided to getArtistStats:", artistId);
      return null;
    }

    const [stats] = await db
      .select()
      .from(artistStats)
      .where(eq(artistStats.artistId, artistId))
      .limit(1);

    return stats || null;
  } catch (error) {
    console.error(`Error fetching artist stats for ${artistId}:`, error);
    return null;
  }
};

// Cached version
export const getArtistStats = unstable_cache(
  _getArtistStats,
  ["artist-stats"],
  {
    revalidate: REVALIDATION_TIMES.stats,
    tags: [CACHE_TAGS.stats],
  },
);

const _getSimilarArtists = async (artistId: string, _genres: string | null) => {
  // For now, just get random verified artists
  // In production, this would use genre matching or collaborative filtering
  const similar = await db
    .select()
    .from(artists)
    .where(
      and(eq(artists.verified, true), drizzleSql`${artists.id} != ${artistId}`),
    )
    .orderBy(desc(artists.popularity))
    .limit(5);

  return similar;
};

// Cached version
export const getSimilarArtists = unstable_cache(
  _getSimilarArtists,
  ["similar-artists"],
  {
    revalidate: REVALIDATION_TIMES.artist,
    tags: [CACHE_TAGS.artists],
  },
);

export async function getArtistTopTracks(spotifyId: string) {
  try {
    const tracks = await spotify.getArtistTopTracks(spotifyId);
    return tracks;
  } catch (_error) {
    return [];
  }
}

// Enhanced action for complete artist-to-setlist flow with songs
const _getArtistSetlists = async (artistId: string, limit = 10) => {
  try {
    // Get setlists with show and venue information
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
          FROM votes v 
          JOIN setlist_songs ss ON v.setlist_song_id = ss.id 
          WHERE ss.setlist_id = ${setlists.id}
        )`,
      })
      .from(setlists)
      .leftJoin(shows, eq(setlists.showId, shows.id))
      .leftJoin(venues, eq(shows.venueId, venues.id))
      .where(eq(setlists.artistId, artistId))
      .orderBy(desc(shows.date), desc(setlists.createdAt))
      .limit(limit);

    // For each setlist, get the songs
    const setlistsWithSongs = await Promise.all(
      artistSetlists.map(
        async ({ setlist, show, venue, songCount, voteCount }) => {
          // Get songs for this setlist
          const setlistSongsData = await db
            .select({
              song: songs,
              setlistSong: setlistSongs,
            })
            .from(setlistSongs)
            .leftJoin(songs, eq(setlistSongs.songId, songs.id))
            .where(eq(setlistSongs.setlistId, setlist.id))
            .orderBy(setlistSongs.position);

          return {
            setlist,
            show: show || undefined,
            venue: venue || undefined,
            songCount: songCount || 0,
            voteCount: voteCount || 0,
            songs: setlistSongsData
              .filter(({ song }) => song)
              .map(({ song, setlistSong }) => ({
                id: song?.id,
                title: song?.name,
                artist: song?.artist,
                position: setlistSong.position,
                upvotes: setlistSong.upvotes || 0,
                notes: setlistSong.notes,
                isPlayed: setlistSong.isPlayed,
              })),
          };
        },
      ),
    );

    return setlistsWithSongs.filter(({ setlist }) => setlist?.id);
  } catch (error) {
    console.error(`Error fetching setlists for artist ${artistId}:`, error);
    return [];
  }
};

export const getArtistSetlists = unstable_cache(
  _getArtistSetlists,
  ["artist-setlists"],
  {
    revalidate: REVALIDATION_TIMES.show,
    tags: [CACHE_TAGS.shows],
  },
);

// Enhanced action for artist songs with setlist integration
const _getArtistSongsWithSetlistData = async (artistId: string, limit = 50) => {
  try {
    // Simplified query to avoid complex raw SQL that might fail in production
    // First get the artist name
    const [artist] = await db
      .select({ name: artists.name })
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (!artist) {
      return [];
    }

    // Get songs for this artist using a simpler approach
    const artistSongs = await db
      .select({
        id: songs.id,
        name: songs.name,
        artist: songs.artist,
        albumName: songs.albumName,
        popularity: songs.popularity,
        durationMs: songs.durationMs,
        spotifyId: songs.spotifyId,
      })
      .from(songs)
      .where(eq(songs.artist, artist.name))
      .orderBy(desc(songs.popularity))
      .limit(limit);

    return artistSongs.map(song => ({
      song,
      timesPlayed: 0, // Simplified for now
      lastPlayed: null,
      popularity: song.popularity || 0,
    }));
  } catch (error) {
    console.error(
      `Error fetching songs with setlist data for artist ${artistId}:`,
      error,
    );
    return [];
  }
};

export const getArtistSongsWithSetlistData = unstable_cache(
  _getArtistSongsWithSetlistData,
  ["artist-songs-with-setlist-data"],
  {
    revalidate: REVALIDATION_TIMES.stats,
    tags: [CACHE_TAGS.stats],
  },
);
