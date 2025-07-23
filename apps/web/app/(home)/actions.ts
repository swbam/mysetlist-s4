'use server';

import { createClient } from '~/lib/supabase/server';

export async function getHomePageStats() {
  try {
    const supabase = await createClient();
    
    // Get real stats from database
    const [
      { count: artistCount },
      { count: showCount }, 
      { count: userCount },
      { count: voteCount }
    ] = await Promise.all([
      supabase.from('artists').select('*', { count: 'exact', head: true }),
      supabase.from('shows').select('*', { count: 'exact', head: true }).gte('show_date', new Date().toISOString()),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('votes').select('*', { count: 'exact', head: true })
    ]);

    // Get trending artists
    const { data: trendingArtists } = await supabase
      .from('artists')
      .select('name, slug')
      .order('trending_score', { ascending: false })
      .limit(4);

    return {
      stats: {
        activeShows: showCount || 0,
        activeArtists: artistCount || 0,
        votesCast: voteCount || 0,
        musicFans: userCount || 0,
      },
      trendingArtists: trendingArtists || [],
    };
  } catch (error) {
    console.error('Failed to fetch homepage stats:', error);
    
    // Return empty data instead of throwing
    return {
      stats: {
        activeShows: 0,
        activeArtists: 0,
        votesCast: 0,
        musicFans: 0,
      },
      trendingArtists: [],
    };
  }
}