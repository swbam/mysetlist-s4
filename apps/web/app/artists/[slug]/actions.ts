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

    // First try with Drizzle for better performance
    const artistResults = await db
      .select({
        id: artists.id,
        spotifyId: artists.spotifyId,
        ticketmasterId: artists.ticketmasterId,
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

    // If not found with Drizzle, try Supabase client as fallback
    try {
      const { createServiceClient } = await import("~/lib/supabase/server");
      const supabase = await createServiceClient();

      if (!supabase) {
        console.error("Failed to create Supabase service client");
        return null;
      }

      const { data, error } = await supabase
        .from("artists")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error || !data) {
        console.warn("Artist not found in database:", slug);

        // Try to import artist automatically from external sources
        try {
          // First search for the artist to see if it exists in external APIs
          const searchResponse = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/api/search?q=${encodeURIComponent(slug.replace(/-/g, " "))}&limit=1`,
          );

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const externalArtist = searchData.results?.find(
              (a: any) => a.metadata?.source !== "database",
            );

            if (externalArtist) {
              // Trigger import for this artist
          const importResponse = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/api/artists/import`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tmAttractionId:
                  externalArtist?.metadata?.externalId ||
                  (typeof externalArtist?.id === "string"
                    ? externalArtist.id.replace("tm_", "")
                    : undefined),
              }),
            },
          );

              if (importResponse.ok) {
                const importData = await importResponse.json();
                const returnedSlug = importData.slug || importData.artist?.slug;

                // Return minimal data for now - full sync will happen in background
                return {
                  id: importData.artistId || importData.artist?.id,
                  spotifyId: null,
                  ticketmasterId: null,
                  name: externalArtist.name,
                  slug: returnedSlug,
                  imageUrl: externalArtist.imageUrl,
                  smallImageUrl: null,
                  genres: JSON.stringify(externalArtist.genres || []),
                  popularity: externalArtist.popularity || 0,
                  followers: 0,
                  followerCount: 0,
                  monthlyListeners: null,
                  verified: false,
                  externalUrls: null,
                  lastSyncedAt: null,
                  songCatalogSyncedAt: null,
                  totalAlbums: 0,
                  totalSongs: 0,
                  lastFullSyncAt: null,
                  trendingScore: 0,
                  totalShows: 0,
                  upcomingShows: 0,
                  totalSetlists: 0,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
              }
            }
          }
        } catch (importError) {
          console.error("Auto-import failed:", importError);
        }

        return null;
      }

      // Transform snake_case to camelCase
      return {
        id: data.id,
        spotifyId: data.spotify_id,
        ticketmasterId: data.ticketmaster_id,
        name: data.name,
        slug: data.slug,
        imageUrl: data.image_url,
        smallImageUrl: data.small_image_url,
        genres: data.genres,
        popularity: data.popularity,
        followers: data.followers,
        followerCount: data.follower_count,
        monthlyListeners: data.monthly_listeners,
        verified: data.verified,
        externalUrls: data.external_urls,
        lastSyncedAt: data.last_synced_at,
        songCatalogSyncedAt: data.song_catalog_synced_at,
        totalAlbums: data.total_albums,
        totalSongs: data.total_songs,
        lastFullSyncAt: data.last_full_sync_at,
        trendingScore: data.trending_score,
        totalShows: data.total_shows,
        upcomingShows: data.upcoming_shows,
        totalSetlists: data.total_setlists,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (supabaseError) {
      console.error("Supabase fallback error:", supabaseError);
      return null;
    }
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
                title: song?.title,
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
    const artistSongs = await db
      .select({
        song: drizzleSql`DISTINCT songs.*`,
        timesPlayed: drizzleSql<number>`COUNT(setlist_songs.song_id)::int`,
        lastPlayed: drizzleSql<string>`MAX(setlists.created_at)`,
        popularity: drizzleSql<number>`
          COALESCE(
            (COUNT(CASE WHEN votes.vote_type = 'up' THEN 1 END) - COUNT(CASE WHEN votes.vote_type = 'down' THEN 1 END))::float /
            NULLIF(COUNT(votes.id), 0) * 100, 0
          )::int
        `,
      })
      .from(drizzleSql`songs`)
      .leftJoin(
        drizzleSql`setlist_songs`,
        drizzleSql`setlist_songs.song_id = songs.id`,
      )
      .leftJoin(setlists, drizzleSql`setlist_songs.setlist_id = setlists.id`)
      .leftJoin(
        drizzleSql`votes`,
        drizzleSql`votes.setlist_song_id = setlist_songs.id`,
      )
      .where(
        drizzleSql`songs.artist = (SELECT name FROM artists WHERE id = ${artistId})`,
      )
      .groupBy(drizzleSql`songs.id`)
      .orderBy(drizzleSql`COUNT(setlist_songs.song_id) DESC`)
      .limit(limit);

    return artistSongs;
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
