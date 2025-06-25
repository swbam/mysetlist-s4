import { createClient } from '@/lib/supabase/client';

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
  weightVotes: 2.0,
  weightAttendees: 1.5,
  weightRecency: 1.2,
  limit: 10,
};

export async function calculateTrendingScore(
  votes: number,
  attendees: number,
  createdAt: Date,
  config: TrendingConfig = DEFAULT_CONFIG
): Promise<number> {
  const hoursOld = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  const recencyFactor = Math.max(0, 1 - hoursOld / config.timeWindow);
  
  const score = 
    votes * config.weightVotes +
    attendees * config.weightAttendees +
    recencyFactor * config.weightRecency * 10;
  
  return Math.round(score * 100) / 100;
}

export async function getTrendingShows(
  config: TrendingConfig = DEFAULT_CONFIG
): Promise<TrendingItem[]> {
  try {
    const supabase = createClient();
    
    // Get recent shows from the database
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - config.timeWindow);
    
            const { data: shows, error } = await supabase
      .from('shows')
      .select(`
        id,
        slug,
        name,
        date,
        status,
        created_at,
        headliner_artist_id,
        venue_id
      `)
      .gte('created_at', cutoffDate.toISOString())
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })
      .limit(config.limit * 2);
    
    if (error || !shows) {
      console.warn('No shows found for trending:', error);
      return [];
    }

    // Calculate trending scores for shows
    const trendingShows = await Promise.all(
      shows.map(async (show) => {
        // For now, use simple metrics based on recent creation
        const votes = Math.floor(Math.random() * 50); // Placeholder
        const attendees = Math.floor(Math.random() * 100); // Placeholder
        
        const score = await calculateTrendingScore(
          votes,
          attendees,
          new Date(show.created_at),
          config
        );
        
        return {
          id: show.id,
          type: 'show' as const,
          name: show.name || 'Concert Show',
          score,
          votes,
          attendees,
          recent_activity: votes + attendees,
          image_url: undefined,
          slug: show.slug,
          artist_name: 'Various Artists',
          venue_name: 'TBA',
          show_date: show.date,
        };
      })
    );
    
    return trendingShows
      .sort((a, b) => b.score - a.score)
      .slice(0, config.limit);
  } catch (error) {
    console.error('Error fetching trending shows:', error);
    return [];
  }
}

export async function getTrendingArtists(
  config: TrendingConfig = DEFAULT_CONFIG
): Promise<TrendingItem[]> {
  try {
    const supabase = createClient();
    
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
        popularity,
        followers,
        created_at,
        updated_at
      `)
      .order('popularity', { ascending: false })
      .limit(config.limit * 2);
    
    if (error || !artists) {
      console.warn('No artists found for trending:', error);
      return [];
    }

    // Calculate trending scores for artists
    const trendingArtists = await Promise.all(
      artists.map(async (artist) => {
        // Use popularity and followers as metrics
        const votes = Math.floor((artist.popularity || 0) / 10);
        const attendees = Math.floor((artist.followers || 0) / 1000);
        
        const score = await calculateTrendingScore(
          votes,
          attendees,
          new Date(artist.updated_at || artist.created_at),
          config
        );
        
        return {
          id: artist.id,
          type: 'artist' as const,
          name: artist.name,
          score,
          votes,
          attendees,
          recent_activity: votes + attendees,
          image_url: artist.image_url,
          slug: artist.slug,
        };
      })
    );
    
    return trendingArtists
      .sort((a, b) => b.score - a.score)
      .slice(0, config.limit);
  } catch (error) {
    console.error('Error fetching trending artists:', error);
    return [];
  }
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