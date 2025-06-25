import { createClient } from '@/lib/supabase/server';
import { differenceInHours, differenceInDays } from 'date-fns';

export interface TrendingItem {
  id: string;
  type: 'show' | 'artist';
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
  weightVotes: 0.5,
  weightAttendees: 0.3,
  weightRecency: 0.2,
  limit: 20,
};

export async function calculateTrendingScore(
  votes: number,
  attendees: number,
  createdAt: Date,
  config: TrendingConfig = DEFAULT_CONFIG
): Promise<number> {
  // Normalize values
  const normalizedVotes = Math.log10(votes + 1);
  const normalizedAttendees = Math.log10(attendees + 1);
  
  // Calculate recency score (0-1, where 1 is most recent)
  const hoursAgo = differenceInHours(new Date(), createdAt);
  const recencyScore = Math.max(0, 1 - (hoursAgo / config.timeWindow));
  
  // Calculate weighted score
  const score = 
    normalizedVotes * config.weightVotes +
    normalizedAttendees * config.weightAttendees +
    recencyScore * config.weightRecency;
  
  return score;
}

export async function getTrendingShows(
  config: TrendingConfig = DEFAULT_CONFIG
): Promise<TrendingItem[]> {
  const supabase = await createClient();
  
  // Get shows with activity in the time window
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - config.timeWindow);
  
  const { data: shows, error } = await supabase
    .from('shows')
    .select(`
      id,
      slug,
      show_date,
      created_at,
      artists!inner(id, name, slug, image_url),
      venues!inner(id, name, city),
      show_votes(count),
      show_attendees(count)
    `)
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching trending shows:', error);
    return [];
  }
  
  // Calculate trending scores
  const trendingShows = await Promise.all(
    shows.map(async (show) => {
      const votes = show.show_votes?.[0]?.count || 0;
      const attendees = show.show_attendees?.[0]?.count || 0;
      
      const score = await calculateTrendingScore(
        votes,
        attendees,
        new Date(show.created_at),
        config
      );
      
      return {
        id: show.id,
        type: 'show' as const,
        name: `${show.artists.name} at ${show.venues.name}`,
        score,
        votes,
        attendees,
        recent_activity: votes + attendees,
        image_url: show.artists.image_url,
        slug: show.slug,
        artist_name: show.artists.name,
        venue_name: `${show.venues.name}, ${show.venues.city}`,
        show_date: show.show_date,
      };
    })
  );
  
  // Sort by score and limit
  return trendingShows
    .sort((a, b) => b.score - a.score)
    .slice(0, config.limit);
}

export async function getTrendingArtists(
  config: TrendingConfig = DEFAULT_CONFIG
): Promise<TrendingItem[]> {
  const supabase = await createClient();
  
  // Get artists with recent activity
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - config.timeWindow);
  
  const { data: artists, error } = await supabase
    .from('artists')
    .select(`
      id,
      name,
      slug,
      image_url,
      created_at,
      shows!inner(
        id,
        created_at,
        show_votes(count),
        show_attendees(count)
      ),
      user_follows_artists(count)
    `)
    .gte('shows.created_at', cutoffDate.toISOString());
  
  if (error) {
    console.error('Error fetching trending artists:', error);
    return [];
  }
  
  // Aggregate activity per artist
  const artistActivity = artists.map((artist) => {
    const totalVotes = artist.shows.reduce(
      (sum, show) => sum + (show.show_votes?.[0]?.count || 0),
      0
    );
    const totalAttendees = artist.shows.reduce(
      (sum, show) => sum + (show.show_attendees?.[0]?.count || 0),
      0
    );
    const followers = artist.user_follows_artists?.[0]?.count || 0;
    
    // Find most recent show
    const mostRecentShow = artist.shows.reduce((recent, show) => {
      return new Date(show.created_at) > new Date(recent.created_at) ? show : recent;
    });
    
    return {
      ...artist,
      totalVotes,
      totalAttendees: totalAttendees + followers, // Include followers in attendees
      mostRecentShowDate: new Date(mostRecentShow.created_at),
    };
  });
  
  // Calculate trending scores
  const trendingArtists = await Promise.all(
    artistActivity.map(async (artist) => {
      const score = await calculateTrendingScore(
        artist.totalVotes,
        artist.totalAttendees,
        artist.mostRecentShowDate,
        config
      );
      
      return {
        id: artist.id,
        type: 'artist' as const,
        name: artist.name,
        score,
        votes: artist.totalVotes,
        attendees: artist.totalAttendees,
        recent_activity: artist.totalVotes + artist.totalAttendees,
        image_url: artist.image_url,
        slug: artist.slug,
      };
    })
  );
  
  // Sort by score and limit
  return trendingArtists
    .sort((a, b) => b.score - a.score)
    .slice(0, config.limit);
}

export async function getTrendingContent(
  config: TrendingConfig = DEFAULT_CONFIG
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