import { createServiceClient } from "~/lib/supabase/server";

export interface TrendingArtistInsight {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  trendingScore: number;
  voteCount: number;
  recentShowsCount: number;
  followerCount: number;
  popularity: number;
  genres: string[];
  weeklyGrowth: number;
  monthlyGrowth: number;
  rank: number;
}

export interface MostVotedSong {
  id: string;
  title: string;
  artist: string;
  artistSlug: string;
  totalVotes: number;
  showCount: number;
  lastVotedAt: string;
  albumArtUrl: string | null;
}

export interface HotVenue {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string | null;
  country: string;
  imageUrl: string | null;
  totalShows: number;
  upcomingShows: number;
  totalVotes: number;
  averageRating: number | null;
  recentActivity: number;
}

export interface RecentSetlistActivity {
  id: string;
  type: "new_vote" | "new_setlist" | "show_update";
  showName: string;
  showSlug: string;
  artistName: string;
  artistSlug: string;
  venueName: string;
  venueCity: string;
  date: string;
  createdAt: string;
  metadata?: {
    songTitle?: string;
    voteCount?: number;
    setlistCount?: number;
  };
}

export interface TrendingLocation {
  city: string;
  state: string | null;
  country: string;
  showCount: number;
  upcomingShows: number;
  totalVotes: number;
  totalVenues: number;
  topArtist: string;
  rank: number;
}

export interface RisingArtist {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  followerGrowth: number;
  voteGrowth: number;
  showsAdded: number;
  daysActive: number;
  popularity: number;
  rank: number;
}

export interface TrendingStats {
  totalVotes: number;
  totalShows: number;
  totalSetlists: number;
  totalUsers: number;
  weeklyVotes: number;
  weeklyShows: number;
  weeklyUsers: number;
  mostActiveCity: string;
  averageSetlistLength: number;
  topGenre: string;
}

/**
 * Get top trending artists with real vote counts and activity metrics
 */
export async function getTrendingArtistsInsights(
  limit = 20,
): Promise<TrendingArtistInsight[]> {
  try {
    const supabase = await createServiceClient();

    // Use the database function for optimized query
    const { data: artists, error } = await supabase.rpc(
      "get_trending_artists_with_votes",
      { limit_count: limit },
    );

    if (error || !artists) {
      console.error("Error fetching trending artists:", error);
      return [];
    }

    return artists.map((artist, index) => {
      const currentFollowers = artist.follower_count || 0;
      const previousFollowers = artist.previous_follower_count || 0;
      const currentPopularity = artist.popularity || 0;
      const previousPopularity = artist.previous_popularity || 0;

      // Calculate growth rates (only if we have previous data)
      const weeklyGrowth =
        previousFollowers > 0
          ? ((currentFollowers - previousFollowers) / previousFollowers) * 100
          : 0;
      const monthlyGrowth =
        previousPopularity > 0
          ? ((currentPopularity - previousPopularity) / previousPopularity) *
            100
          : 0;

      return {
        id: artist.id,
        name: artist.name,
        slug: artist.slug,
        imageUrl: artist.image_url,
        trendingScore: artist.trending_score || 0,
        voteCount: artist.total_votes || 0,
        recentShowsCount: artist.upcoming_shows || 0,
        followerCount: currentFollowers,
        popularity: currentPopularity,
        genres: artist.genres ? JSON.parse(artist.genres) : [],
        weeklyGrowth,
        monthlyGrowth,
        rank: index + 1,
      };
    });
  } catch (error) {
    console.error("Error in getTrendingArtistsInsights:", error);
    return [];
  }
}

/**
 * Get most voted songs across all shows
 */
export async function getMostVotedSongs(
  timeframe: "week" | "month" | "all" = "week",
  limit = 20,
): Promise<MostVotedSong[]> {
  try {
    const supabase = await createServiceClient();

    // Convert timeframe to days for the database function
    let timeframeDays = 0; // 0 = all time
    if (timeframe === "week") {
      timeframeDays = 7;
    } else if (timeframe === "month") {
      timeframeDays = 30;
    }

    // Use the database function for optimized query
    const { data: songs, error } = await supabase.rpc("get_most_voted_songs", {
      timeframe_days: timeframeDays,
      limit_count: limit,
    });

    if (error || !songs) {
      console.error("Error fetching most voted songs:", error);
      return [];
    }

    return songs.map((song) => ({
      id: song.song_id,
      title: song.title,
      artist: song.artist,
      artistSlug: song.artist_slug || "",
      totalVotes: Number(song.total_votes) || 0,
      showCount: Number(song.show_count) || 0,
      lastVotedAt: song.last_voted_at || new Date().toISOString(),
      albumArtUrl: song.album_art_url,
    }));
  } catch (error) {
    console.error("Error in getMostVotedSongs:", error);
    return [];
  }
}

/**
 * Get venues with most activity and upcoming shows
 */
export async function getHotVenues(limit = 15): Promise<HotVenue[]> {
  try {
    const supabase = await createServiceClient();

    const { data: venues, error } = await supabase
      .from("venues")
      .select(`
        id,
        name,
        slug,
        city,
        state,
        country,
        image_url,
        total_shows,
        upcoming_shows,
        total_attendance,
        average_rating
      `)
      .gt("total_shows", 0)
      .order("upcoming_shows", { ascending: false })
      .order("total_shows", { ascending: false })
      .limit(limit);

    if (error || !venues) {
      console.error("Error fetching hot venues:", error);
      return [];
    }

    // Get vote counts for venues through their shows
    const venueIds = venues.map((v) => v.id);
    const { data: venuVotes } = await supabase
      .from("shows")
      .select("venue_id, vote_count")
      .in("venue_id", venueIds);

    const venueVoteMap = new Map<string, number>();
    venuVotes?.forEach((show) => {
      if (show.venue_id) {
        const existing = venueVoteMap.get(show.venue_id) || 0;
        venueVoteMap.set(show.venue_id, existing + (show.vote_count || 0));
      }
    });

    return venues.map((venue) => ({
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
      city: venue.city,
      state: venue.state,
      country: venue.country,
      imageUrl: venue.image_url,
      totalShows: venue.total_shows || 0,
      upcomingShows: venue.upcoming_shows || 0,
      totalVotes: venueVoteMap.get(venue.id) || 0,
      averageRating: venue.average_rating,
      recentActivity:
        (venue.upcoming_shows || 0) + (venueVoteMap.get(venue.id) || 0),
    }));
  } catch (error) {
    console.error("Error in getHotVenues:", error);
    return [];
  }
}

/**
 * Get recent setlist and voting activity
 */
export async function getRecentSetlistActivity(
  limit = 20,
): Promise<RecentSetlistActivity[]> {
  try {
    const supabase = await createServiceClient();

    // Use the database function for optimized query
    const { data: activities, error } = await supabase.rpc(
      "get_recent_setlist_activity",
      { limit_count: limit },
    );

    if (error || !activities) {
      console.error("Error fetching recent activity:", error);
      return [];
    }

    return activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      showName: activity.show_name,
      showSlug: activity.show_slug,
      artistName: activity.artist_name,
      artistSlug: activity.artist_slug,
      venueName: activity.venue_name,
      venueCity: activity.venue_city,
      date: activity.show_date,
      createdAt: activity.created_at,
      metadata: {
        songTitle: activity.song_title,
      },
    }));
  } catch (error) {
    console.error("Error in getRecentSetlistActivity:", error);
    return [];
  }
}

/**
 * Get trending locations by show and vote activity
 */
export async function getTrendingLocations(
  limit = 10,
): Promise<TrendingLocation[]> {
  try {
    const supabase = await createServiceClient();

    // Use the database function for optimized query
    const { data: locations, error } = await supabase.rpc(
      "get_trending_locations",
      { limit_count: limit },
    );

    if (error || !locations) {
      console.error("Error fetching trending locations:", error);
      return [];
    }

    return locations.map((location, index) => ({
      city: location.city,
      state: location.state,
      country: location.country,
      showCount: Number(location.show_count) || 0,
      upcomingShows: Number(location.upcoming_shows) || 0,
      totalVotes: Number(location.total_votes) || 0,
      totalVenues: Number(location.total_venues) || 0,
      topArtist: location.top_artist || "",
      rank: index + 1,
    }));
  } catch (error) {
    console.error("Error in getTrendingLocations:", error);
    return [];
  }
}

/**
 * Get comprehensive trending statistics
 */
export async function getTrendingStatistics(): Promise<TrendingStats> {
  try {
    const supabase = await createServiceClient();

    const weekAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Get total counts
    const [
      { count: totalVotes },
      { count: totalShows },
      { count: totalSetlists },
      { count: totalUsers },
      { count: weeklyVotes },
      { count: weeklyShows },
      { count: weeklyUsers },
    ] = await Promise.all([
      supabase.from("votes").select("*", { count: "exact", head: true }),
      supabase.from("shows").select("*", { count: "exact", head: true }),
      supabase.from("setlists").select("*", { count: "exact", head: true }),
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase
        .from("votes")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo),
      supabase
        .from("shows")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo),
      supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo),
    ]);

    // Get most active city
    const { data: cityData } = await supabase
      .from("venues")
      .select("city, upcoming_shows")
      .gt("upcoming_shows", 0)
      .order("upcoming_shows", { ascending: false })
      .limit(1);

    // Get average setlist length from a simple count approach
    const { count: totalSetlistSongs } = await supabase
      .from("setlist_songs")
      .select("*", { count: "exact", head: true });

    const { count: totalSetlistsCount } = await supabase
      .from("setlists")
      .select("*", { count: "exact", head: true });

    const averageSetlistLength =
      totalSetlistsCount && totalSetlistsCount > 0
        ? Math.round((totalSetlistSongs || 0) / totalSetlistsCount)
        : 0;

    // Get top genre (simplified - would need more complex query for real data)
    const topGenre = "Pop"; // Placeholder - would need genre analysis

    return {
      totalVotes: totalVotes || 0,
      totalShows: totalShows || 0,
      totalSetlists: totalSetlists || 0,
      totalUsers: totalUsers || 0,
      weeklyVotes: weeklyVotes || 0,
      weeklyShows: weeklyShows || 0,
      weeklyUsers: weeklyUsers || 0,
      mostActiveCity: cityData?.[0]?.city || "Unknown",
      averageSetlistLength,
      topGenre,
    };
  } catch (error) {
    console.error("Error in getTrendingStatistics:", error);
    return {
      totalVotes: 0,
      totalShows: 0,
      totalSetlists: 0,
      totalUsers: 0,
      weeklyVotes: 0,
      weeklyShows: 0,
      weeklyUsers: 0,
      mostActiveCity: "Unknown",
      averageSetlistLength: 0,
      topGenre: "Pop",
    };
  }
}

/**
 * Get rising artists (newer artists with high growth)
 */
export async function getRisingArtists(limit = 15): Promise<RisingArtist[]> {
  try {
    const supabase = await createServiceClient();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { data: artists, error } = await supabase
      .from("artists")
      .select(`
        id,
        name,
        slug,
        image_url,
        popularity,
        follower_count,
        previous_follower_count,
        previous_popularity,
        total_shows,
        upcoming_shows,
        created_at
      `)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .gt("follower_count", 0)
      .order("follower_count", { ascending: false })
      .limit(limit * 2); // Get more to filter

    if (error || !artists) {
      console.error("Error fetching rising artists:", error);
      return [];
    }

    return artists
      .map((artist) => {
        const currentFollowers = artist.follower_count || 0;
        const previousFollowers = artist.previous_follower_count || 0;
        const currentPopularity = artist.popularity || 0;
        const previousPopularity = artist.previous_popularity || 0;

        const followerGrowth =
          previousFollowers > 0
            ? ((currentFollowers - previousFollowers) / previousFollowers) * 100
            : 0;
        const voteGrowth =
          previousPopularity > 0
            ? ((currentPopularity - previousPopularity) / previousPopularity) *
              100
            : 0;

        const daysActive = Math.floor(
          (new Date().getTime() - new Date(artist.created_at).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        return {
          id: artist.id,
          name: artist.name,
          slug: artist.slug,
          imageUrl: artist.image_url,
          followerGrowth,
          voteGrowth,
          showsAdded: artist.upcoming_shows || 0,
          daysActive,
          popularity: currentPopularity,
          rank: 0,
        };
      })
      .filter((artist) => artist.followerGrowth > 0 || artist.voteGrowth > 0) // Only growing artists
      .sort((a, b) => {
        // Sort by growth rate and recency
        const aScore = a.followerGrowth + a.voteGrowth + (30 - a.daysActive);
        const bScore = b.followerGrowth + b.voteGrowth + (30 - b.daysActive);
        return bScore - aScore;
      })
      .slice(0, limit)
      .map((artist, index) => ({ ...artist, rank: index + 1 }));
  } catch (error) {
    console.error("Error in getRisingArtists:", error);
    return [];
  }
}
