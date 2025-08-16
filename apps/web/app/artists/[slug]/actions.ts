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
import { spotify, SpotifyClient, TicketmasterClient } from "@repo/external-apis";
import { and, desc, sql as drizzleSql, eq, or } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, REVALIDATION_TIMES } from "~/lib/cache";
import { absoluteUrl } from "~/lib/absolute-url";

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

    // Artist not found - attempt auto-import
    console.log("Artist not found in database, attempting auto-import:", slug);
    
    try {
      const autoImportResult = await attemptAutoImport(slug);
      if (autoImportResult) {
        console.log("Auto-import successful for:", slug);
        return autoImportResult;
      }
    } catch (error) {
      console.warn("Auto-import failed for:", slug, error);
    }

    console.warn("Artist not found and auto-import failed:", slug);
    return null;
  } catch (err: unknown) {
    console.error("Critical error in getArtist for slug:", slug, err);
    // Return null instead of throwing to prevent 500 errors
    return null;
  }
};

// Auto-import function that searches external APIs and triggers import
async function attemptAutoImport(slug: string) {
  try {
    // Convert slug to artist name for search
    const searchName = slug.replace(/-/g, " ");
    
    // Search external APIs in parallel for best match
    const searchPromises = await Promise.allSettled([
      searchSpotifyArtist(searchName),
      searchTicketmasterArtist(searchName)
    ]);
    
    const spotifyResult = searchPromises[0].status === 'fulfilled' ? searchPromises[0].value : null;
    const ticketmasterResult = searchPromises[1].status === 'fulfilled' ? searchPromises[1].value : null;
    
    // Prefer Ticketmaster for auto-import (has shows data)
    const tmAttractionId = ticketmasterResult?.tmAttractionId;
    const spotifyId = spotifyResult?.spotifyId;
    
    if (!tmAttractionId && !spotifyId) {
      console.log("No external artist found for:", searchName);
      return null;
    }
    
    // Trigger auto-import via internal API
    const importUrl = getImportUrl();
    const importResponse = await fetch(`${importUrl}/api/artists/auto-import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CRON_SECRET && {
          "Authorization": `Bearer ${process.env.CRON_SECRET}`
        }),
      },
      body: JSON.stringify({
        tmAttractionId,
        spotifyId,
        artistName: searchName,
      }),
    });
    
    if (!importResponse.ok) {
      console.error("Auto-import failed:", await importResponse.text());
      return null;
    }
    
    const importData = await importResponse.json();
    
    // If artist already exists, fetch and return it
    if (importData.alreadyExists && importData.artistId) {
      const existingArtist = await db
        .select()
        .from(artists)
        .where(eq(artists.id, importData.artistId))
        .limit(1);
      return existingArtist[0] || null;
    }
    
    // Return minimal artist data while import runs in background
    return {
      id: importData.artistId,
      spotifyId: spotifyId || null,
      tmAttractionId: tmAttractionId || null,
      name: ticketmasterResult?.name || spotifyResult?.name || searchName,
      slug: importData.slug || slug,
      imageUrl: ticketmasterResult?.imageUrl || spotifyResult?.imageUrl || null,
      smallImageUrl: null,
      genres: JSON.stringify(spotifyResult?.genres || []),
      popularity: spotifyResult?.popularity || 0,
      followers: spotifyResult?.followers || 0,
      followerCount: 0,
      monthlyListeners: null,
      verified: false,
      externalUrls: null,
      importStatus: "in_progress",
      lastSyncedAt: null,
      songCatalogSyncedAt: null,
      totalAlbums: 0,
      totalSongs: 0,
      lastFullSyncAt: null,
      trendingScore: 0,
      totalShows: 0,
      upcomingShows: 0,
      totalSetlists: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error("Auto-import error:", error);
    return null;
  }
}

// Helper function to get proper import URL for production
function getImportUrl(): string {
  // In server action context, we need to use absolute URLs
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  // Fallback for local development
  return "http://localhost:3001";
}

// Search Spotify for artist
async function searchSpotifyArtist(name: string) {
  try {
    const spotifyClient = new SpotifyClient();
    const result = await spotifyClient.searchArtists(name);
    const artist = result.artists?.items?.[0];
    if (!artist) return null;
    
    return {
      spotifyId: artist.id,
      name: artist.name,
      imageUrl: artist.images?.[0]?.url,
      genres: artist.genres,
      popularity: artist.popularity,
      followers: artist.followers?.total || 0,
    };
  } catch (error) {
    console.error("Spotify search error:", error);
    return null;
  }
}

// Search Ticketmaster for artist
async function searchTicketmasterArtist(name: string) {
  try {
    const ticketmasterClient = new TicketmasterClient();
    const attractions = await ticketmasterClient.searchAttractions({
      keyword: name,
      size: 1,
      classificationName: 'music'
    });
    
    const attraction = attractions._embedded?.attractions?.[0];
    if (!attraction) return null;
    
    return {
      tmAttractionId: attraction.id,
      name: attraction.name,
      imageUrl: attraction.images?.find((img: any) => img.ratio === "16_9")?.url,
    };
  } catch (error) {
    console.error("Ticketmaster search error:", error);
    return null;
  }
}

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

/**
 * Attempt to auto-import an artist when not found in database
 * Searches external APIs and triggers import if found
 */
async function attemptAutoImport(slug: string) {
  try {
    // Convert slug back to artist name for searching
    const artistName = slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    console.log(`[AUTO-IMPORT] Searching for artist: ${artistName}`);

    // Initialize API clients
    const spotifyClient = new SpotifyClient({});
    const ticketmasterClient = new TicketmasterClient({
      apiKey: process.env.TICKETMASTER_API_KEY || "",
    });

    // Search external APIs in parallel
    const [spotifyResult, ticketmasterResult] = await Promise.allSettled([
      searchSpotifyArtist(spotifyClient, artistName),
      searchTicketmasterArtist(ticketmasterClient, artistName),
    ]);

    let spotifyMatch: any = null;
    let tmAttractionId: string | null = null;

    if (spotifyResult.status === "fulfilled" && spotifyResult.value) {
      spotifyMatch = spotifyResult.value;
      console.log(`[AUTO-IMPORT] Found Spotify match: ${spotifyMatch.name}`);
    }

    if (ticketmasterResult.status === "fulfilled" && ticketmasterResult.value) {
      tmAttractionId = ticketmasterResult.value;
      console.log(`[AUTO-IMPORT] Found Ticketmaster match: ${tmAttractionId}`);
    }

    // If we found matches, trigger import and return minimal artist data
    if (spotifyMatch || tmAttractionId) {
      // Trigger background import
      triggerBackgroundImport({
        artistName: spotifyMatch?.name || artistName,
        spotifyId: spotifyMatch?.id,
        tmAttractionId: tmAttractionId || undefined,
        slug,
      });

      // Return minimal artist data for immediate page load
      return createMinimalArtistData(spotifyMatch, artistName, slug);
    }

    return null;
  } catch (error) {
    console.error(`[AUTO-IMPORT] Error during auto-import for ${slug}:`, error);
    return null;
  }
}

/**
 * Search for artist on Spotify
 */
async function searchSpotifyArtist(client: SpotifyClient, artistName: string) {
  try {
    await client.authenticate();
    const searchResult = await client.searchArtists(artistName, 5);
    
    if (searchResult?.artists?.items && searchResult.artists.items.length > 0) {
      // Find best match
      const exactMatch = searchResult.artists.items.find((artist: any) =>
        normalizeArtistName(artist.name) === normalizeArtistName(artistName)
      );
      
      return exactMatch || searchResult.artists.items[0];
    }
    
    return null;
  } catch (error) {
    console.warn(`[AUTO-IMPORT] Spotify search failed for ${artistName}:`, error);
    return null;
  }
}

/**
 * Search for artist on Ticketmaster
 */
async function searchTicketmasterArtist(client: TicketmasterClient, artistName: string) {
  try {
    const searchResult = await client.searchAttractions({
      keyword: artistName,
      classificationName: "music",
      size: 10,
    });

    if (searchResult?._embedded?.attractions) {
      // Find best match
      const exactMatch = searchResult._embedded.attractions.find((attraction: any) =>
        normalizeArtistName(attraction.name) === normalizeArtistName(artistName)
      );
      
      const match = exactMatch || searchResult._embedded.attractions[0];
      return match?.id || null;
    }
    
    return null;
  } catch (error) {
    console.warn(`[AUTO-IMPORT] Ticketmaster search failed for ${artistName}:`, error);
    return null;
  }
}

/**
 * Trigger background import via API call
 */
async function triggerBackgroundImport({
  artistName,
  spotifyId,
  tmAttractionId,
  slug,
}: {
  artistName: string;
  spotifyId?: string;
  tmAttractionId?: string;
  slug: string;
}) {
  try {
    // Use absolute URL for production compatibility
    const apiUrl = absoluteUrl("/api/artists/auto-import");
    
    const importPayload = {
      artistName,
      ...(spotifyId && { spotifyId }),
      ...(tmAttractionId && { tmAttractionId }),
      retryOnFailure: false, // Don't retry for auto-imports
    };

    console.log(`[AUTO-IMPORT] Triggering background import for ${artistName}`);

    // Fire and forget - don't await this call
    fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(importPayload),
    }).catch((error) => {
      console.error(`[AUTO-IMPORT] Background import API call failed:`, error);
    });

  } catch (error) {
    console.error(`[AUTO-IMPORT] Failed to trigger background import:`, error);
  }
}

/**
 * Create minimal artist data for immediate page load
 */
function createMinimalArtistData(spotifyMatch: any, artistName: string, slug: string) {
  const now = new Date();
  
  return {
    id: `temp_${slug}`, // Temporary ID
    spotifyId: spotifyMatch?.id || null,
    tmAttractionId: null,
    name: spotifyMatch?.name || artistName,
    slug,
    imageUrl: spotifyMatch?.images?.[0]?.url || null,
    smallImageUrl: spotifyMatch?.images?.[2]?.url || null,
    genres: spotifyMatch?.genres ? JSON.stringify(spotifyMatch.genres) : "[]",
    popularity: spotifyMatch?.popularity || 0,
    followers: spotifyMatch?.followers?.total || 0,
    followerCount: spotifyMatch?.followers?.total || 0,
    monthlyListeners: null,
    verified: false,
    externalUrls: spotifyMatch?.external_urls ? JSON.stringify(spotifyMatch.external_urls) : null,
    importStatus: "importing",
    lastSyncedAt: now,
    songCatalogSyncedAt: null,
    totalAlbums: null,
    totalSongs: null,
    lastFullSyncAt: null,
    trendingScore: null,
    totalShows: null,
    upcomingShows: null,
    totalSetlists: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Check if artist exists after import completion
 * This helps handle the case where the import completes while we're using temp data
 */
async function checkForCompletedImport(slug: string): Promise<any> {
  try {
    // Check if the actual artist now exists in the database
    const artistResults = await db
      .select()
      .from(artists)
      .where(eq(artists.slug, slug))
      .limit(1);

    return artistResults[0] || null;
  } catch (error) {
    console.warn(`[AUTO-IMPORT] Failed to check for completed import: ${slug}`, error);
    return null;
  }
}

/**
 * Normalize artist name for comparison
 */
function normalizeArtistName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}
