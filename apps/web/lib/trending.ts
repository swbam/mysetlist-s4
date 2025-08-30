import { createServiceClient } from "~/lib/supabase/server";

export interface TrendingItem {
  id: string;
  type: "show" | "artist";
  name: string;
  score: number;
  votes: number;
  attendees: number;
  recent_activity: number;
  imageUrl?: string;
  slug?: string;
  artist_name?: string;
  venue_name?: string;
  show_date?: string;
}

export interface TrendingConfig {
  timeWindow: number; // hours
  weightVotes: number;
  weightAttendees: number;
  weightRecency: number;
  limit: number;
}

const DEFAULT_CONFIG: TrendingConfig = {
  timeWindow: 168, // 7 days
  weightVotes: 2.0,
  weightAttendees: 1.5,
  weightRecency: 1.2,
  limit: 10,
};

// calculateTrendingScore function removed - using real trendingScore from database only
// No mathematical calculations allowed - all trending scores come from sync system

export async function getTrendingShows(
  config: TrendingConfig = DEFAULT_CONFIG,
): Promise<TrendingItem[]> {
  try {
    const supabase = createServiceClient();

    // Get shows with proper joins to get real artist and venue names
    const { data: shows, error } = await supabase
      api.shows
      .select(
        `
        id,
        slug,
        name,
        date,
        status,
        _creationTime,
        trendingScore,
        viewCount,
        attendeeCount,
        voteCount,
        artistId,
        venueId,
        artists!artistId (
          id,
          name,
          imageUrl
        ),
        venues (
          id,
          name,
          city,
          state,
          country
        )
      `,
      )
      .gt("trendingScore", 0)
      .in("status", ["upcoming", "ongoing"])
      .order("trendingScore", { ascending: false })
      .limit(config.limit);

    if (error || !shows) {
      console.error("Error fetching trending shows:", error);
      return [];
    }

    // Transform shows to trending items with real artist and venue data
    const trendingShows = shows.map((show) => {
      // Handle joined data - Supabase returns arrays for joins, take first element
      const artist = Array.isArray(show.artists)
        ? show.artists[0]
        : show.artists;
      const venue = Array.isArray(show.venues) ? show.venues[0] : show.venues;

      return {
        id: show.id,
        type: "show" as const,
        name: show.name || "Concert Show",
        score: show.trendingScore || 0,
        votes: show.voteCount || 0,
        attendees: show.attendeeCount || 0,
        recent_activity: (show.voteCount || 0) + (show.attendeeCount || 0),
        ...(artist?.imageUrl && { imageUrl: artist.imageUrl }),
        slug: show.slug,
        artist_name: artist?.name || "Artist TBA",
        venue_name: venue
          ? `${venue.name}${venue.city ? `, ${venue.city}` : ""}`
          : "Venue TBA",
        show_date: show.date,
      };
    });

    return trendingShows;
  } catch (_error) {
    console.error("Error in getTrendingShows:", _error);
    return [];
  }
}

export async function getTrendingArtists(
  config: TrendingConfig = DEFAULT_CONFIG,
): Promise<TrendingItem[]> {
  try {
    const supabase = createServiceClient();

    // Get artists with highest trending scores
    const { data: artists, error } = await supabase
      api.artists
      .select(
        `
        id,
        name,
        slug,
        imageUrl,
        popularity,
        followers,
        followerCount,
        trendingScore,
        _creationTime,
        updated_at
      `,
      )
      .gt("trendingScore", 0)
      .order("trendingScore", { ascending: false })
      .limit(config.limit);

    if (error || !artists) {
      return [];
    }

    // Transform artists to trending items
    const trendingArtists = artists.map((artist) => {
      // Use real metrics from database only (no mathematical scaling)
      const votes = artist.popularity || 0; // Direct popularity value from Spotify
      const attendees = artist.followerCount || 0; // App followers

      return {
        id: artist.id,
        type: "artist" as const,
        name: artist.name,
        score: artist.trendingScore || 0,
        votes,
        attendees,
        recent_activity: votes + attendees,
        imageUrl: artist.imageUrl,
        slug: artist.slug,
      };
    });

    return trendingArtists;
  } catch (_error) {
    return [];
  }
}

export async function getTrendingContent(
  config: TrendingConfig = DEFAULT_CONFIG,
): Promise<{
  shows: TrendingItem[];
  artists: TrendingItem[];
  combined: TrendingItem[];
}> {
  const [shows, artists] = await Promise.all([
    getTrendingShows(config),
    getTrendingArtists(config),
  ]);

  // Combine and sort all items
  const combined = [...shows, ...artists]
    .sort((a, b) => b.score - a.score)
    .slice(0, config.limit);

  return {
    shows,
    artists,
    combined,
  };
}

// Get trending content for specific time periods
export async function getDailyTrending(limit = 10) {
  return getTrendingContent({
    ...DEFAULT_CONFIG,
    timeWindow: 24,
    limit,
  });
}

export async function getWeeklyTrending(limit = 20) {
  return getTrendingContent({
    ...DEFAULT_CONFIG,
    timeWindow: 168,
    limit,
  });
}

export async function getMonthlyTrending(limit = 30) {
  return getTrendingContent({
    ...DEFAULT_CONFIG,
    timeWindow: 720,
    limit,
  });
}
