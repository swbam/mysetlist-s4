import { db } from "@repo/database";
import {
  artists,
  setlistSongs,
  setlists,
  shows,
  songs,
  venues,
} from "@repo/database";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { cacheKeys, withCache } from "~/lib/cache/redis";

// Optimized query helpers with caching
export const optimizedQueries = {
  // Batch fetch with single query
  async getShowsWithDetails(showIds: string[]) {
    if (showIds.length === 0) {
      return [];
    }

    const result = await db
      .select({
        show: shows,
        artist: artists,
        venue: venues,
      })
      .from(shows)
      .leftJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .leftJoin(venues, eq(shows.venueId, venues.id))
      .where(inArray(shows.id, showIds))
      .execute();

    // Group by show ID for easy access
    const showMap = new Map();
    result.forEach((row) => {
      if (!showMap.has(row.show.id)) {
        showMap.set(row.show.id, {
          ...row.show,
          artist: row.artist,
          venue: row.venue,
        });
      }
    });

    return Array.from(showMap.values());
  },

  // Optimized trending query with proper indexes
  async getTrendingShowsOptimized(limit = 20, hoursAgo = 168) {
    const cutoffDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    // Use a CTE for better performance
    const query = sql`
      WITH trending_shows AS (
        SELECT 
          s.*,
          a.name as artist_name,
          a.slug as artist_slug,
          a.imageUrl as artist_image,
          v.name as venue_name,
          v.city as venue_city,
          v.state as venue_state,
          (s.voteCount * 2 + s.attendeeCount * 1.5 + 
           (1 - EXTRACT(EPOCH FROM (NOW() - s._creationTime)) / (${hoursAgo} * 3600)) * 10) as calculated_score
        FROM shows s
        LEFT JOIN artists a ON s.artistId = a.id
        LEFT JOIN venues v ON s.venueId = v.id
        WHERE s._creationTime >= ${cutoffDate}
          AND s.status IN ('upcoming', 'ongoing')
          AND s.trendingScore > 0
      )
      SELECT * FROM trending_shows
      ORDER BY calculated_score DESC
      LIMIT ${limit}
    `;

    const result = await db.execute(query);
    return result;
  },

  // Efficient artist search with full-text search
  async searchArtistsOptimized(searchTerm: string, limit = 20) {
    // Use PostgreSQL full-text search for better performance
    const query = sql`
      SELECT 
        id, name, slug, imageUrl, genres, popularity, followerCount, trendingScore
      FROM artists
      WHERE 
        to_tsvector('english', name || ' ' || COALESCE(genres, '')) 
        @@ plainto_tsquery('english', ${searchTerm})
      ORDER BY 
        ts_rank(to_tsvector('english', name), plainto_tsquery('english', ${searchTerm})) DESC,
        popularity DESC,
        followerCount DESC
      LIMIT ${limit}
    `;

    const result = await db.execute(query);
    return result;
  },

  // Batch setlist fetch with songs
  async getSetlistsWithSongs(setlistIds: string[]) {
    if (setlistIds.length === 0) {
      return [];
    }

    // Fetch setlists and their songs in parallel
    const [setlistData, songData] = await Promise.all([
      db
        .select()
        .from(setlists)
        .where(inArray(setlists.id, setlistIds))
        .execute(),

      db
        .select({
          setlistId: setlistSongs.setlistId,
          songOrder: setlistSongs.position,
          song: songs,
        })
        .from(setlistSongs)
        .innerJoin(songs, eq(setlistSongs.songId, songs.id))
        .where(inArray(setlistSongs.setlistId, setlistIds))
        .orderBy(asc(setlistSongs.position))
        .execute(),
    ]);

    // Group songs by setlist
    const songsBySetlist = new Map<string, any[]>();
    songData.forEach((row) => {
      if (!songsBySetlist.has(row.setlistId)) {
        songsBySetlist.set(row.setlistId, []);
      }
      songsBySetlist.get(row.setlistId)?.push({
        order: row.songOrder,
        ...row.song,
      });
    });

    // Combine data
    return setlistData.map((setlist) => ({
      ...setlist,
      songs: songsBySetlist.get(setlist.id) || [],
    }));
  },

  // Venue search with geo-location
  async searchVenuesNearby(
    lat: number,
    lng: number,
    radiusMiles = 50,
    limit = 20,
  ) {
    const radiusKm = radiusMiles * 1.60934;

    const query = sql`
      SELECT 
        *,
        (6371 * acos(
          cos(radians(${lat})) * 
          cos(radians(latitude)) * 
          cos(radians(longitude) - radians(${lng})) + 
          sin(radians(${lat})) * 
          sin(radians(latitude))
        )) as distance_km
      FROM venues
      WHERE 
        latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND (6371 * acos(
          cos(radians(${lat})) * 
          cos(radians(latitude)) * 
          cos(radians(longitude) - radians(${lng})) + 
          sin(radians(${lat})) * 
          sin(radians(latitude))
        )) <= ${radiusKm}
      ORDER BY distance_km ASC
      LIMIT ${limit}
    `;

    const result = await db.execute(query);
    return result;
  },

  // Get artist statistics with aggregation
  async getArtistStats(artistId: string) {
    const query = sql`
      SELECT 
        a.*,
        COUNT(DISTINCT s.id) as totalShows,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'upcoming') as upcomingShows,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'completed') as past_shows,
        AVG(s.attendeeCount) as avg_attendance,
        SUM(s.voteCount) as total_votes,
        COUNT(DISTINCT sa.id) as total_songs
      FROM artists a
      LEFT JOIN shows s ON (s.artistId = a.id OR EXISTS (
        SELECT 1 FROM show_artists sha WHERE sha.showId = s.id AND sha.artistId = a.id
      ))
      LEFT JOIN songs sa ON sa.artistId = a.id
      WHERE a.id = ${artistId}
      GROUP BY a.id
    `;

    const result = await db.execute(query);
    return result[0];
  },
};

// Add caching to expensive queries
export const cachedQueries = {
  getTrendingShows: withCache(
    optimizedQueries.getTrendingShowsOptimized,
    (limit, _hoursAgo) => cacheKeys.trending("custom", "shows", limit || 20),
    300, // 5 minutes
  ),

  searchArtists: withCache(
    optimizedQueries.searchArtistsOptimized,
    (searchTerm, _limit) => cacheKeys.searchResults(searchTerm, "artists"),
    600, // 10 minutes
  ),

  getArtistStats: withCache(
    optimizedQueries.getArtistStats,
    (artistId) => `artist:stats:${artistId}`,
    900, // 15 minutes
  ),
};

// Query performance monitoring
export async function withQueryMetrics<T>(
  _queryName: string,
  queryFn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  const result = await queryFn();
  const duration = Date.now() - start;

  // Log slow queries
  if (duration > 100) {
  }

  // Track metrics (could send to analytics)
  if (typeof process !== "undefined" && process.env['NODE_ENV'] === "production") {
    // Track query performance metrics
  }

  return result;
}
