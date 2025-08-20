import { createServiceClient } from "~/lib/supabase/server";

export interface TrendingItem {
  id: string;
  type: "show" | "artist";
  name: string;
  score: number;
  votes: number;
  attendees: number;
  recent_activity: number;
  image_url?: string;
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

// calculateTrendingScore function removed - using real trending_score from database only
// No mathematical calculations allowed - all trending scores come from sync system

export async function getTrendingShows(
  config: TrendingConfig = DEFAULT_CONFIG,
): Promise<TrendingItem[]> {
  try {
    const supabase = createServiceClient();

    // Get shows with proper joins to get real artist and venue names
    const { data: shows, error } = await supabase
      .from("shows")
      .select(
        `
        id,
        slug,
        name,
        date,
        status,
        created_at,
        trending_score,
        view_count,
        attendee_count,
        vote_count,
        headliner_artist_id,
        venue_id,
        artists!headliner_artist_id (
          id,
          name,
          image_url
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
      .gt("trending_score", 0)
      .in("status", ["upcoming", "ongoing"])
      .order("trending_score", { ascending: false })
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
        score: show.trending_score || 0,
        votes: show.vote_count || 0,
        attendees: show.attendee_count || 0,
        recent_activity: (show.vote_count || 0) + (show.attendee_count || 0),
        image_url: artist?.image_url || undefined,
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

    // First try to get artists with trending scores > 0
    let { data: artists, error } = await supabase
      .from("artists")
      .select(
        `
        id,
        name,
        slug,
        image_url,
        popularity,
        followers,
        follower_count,
        trending_score,
        created_at,
        updated_at
      `,
      )
      .gt("trending_score", 0)
      .order("trending_score", { ascending: false })
      .limit(config.limit);

    // If no artists have trending_score > 0, fall back to popularity-based sorting
    if (error || !artists || artists.length === 0) {
      console.log(
        "No artists with trending_score > 0, falling back to popularity",
      );
      const fallbackQuery = await supabase
        .from("artists")
        .select(
          `
          id,
          name,
          slug,
          image_url,
          popularity,
          followers,
          follower_count,
          trending_score,
          created_at,
          updated_at
        `,
        )
        .or("popularity.gt.0,follower_count.gt.0,trending_score.gt.0")
        .order("popularity", { ascending: false })
        .limit(config.limit);

      if (fallbackQuery.error || !fallbackQuery.data) {
        console.error("Error in fallback query:", fallbackQuery.error);
        return [];
      }

      artists = fallbackQuery.data;
    }

    // Transform artists to trending items
    const trendingArtists = artists.map((artist) => {
      // Use real metrics from database only (no mathematical scaling)
      const votes = artist.popularity || 0; // Direct popularity value from Spotify
      const attendees = artist.follower_count || 0; // App followers
      const score = artist.trending_score || artist.popularity || 0; // Use trending_score if available, otherwise popularity

      return {
        id: artist.id,
        type: "artist" as const,
        name: artist.name,
        score,
        votes,
        attendees,
        recent_activity: votes + attendees,
        image_url: artist.image_url,
        slug: artist.slug,
      };
    });

    return trendingArtists;
  } catch (_error) {
    console.error("Error in getTrendingArtists:", _error);
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
