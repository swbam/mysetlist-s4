import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface LiveTrendingItem {
  id: string;
  type: 'artist' | 'show' | 'venue';
  name: string;
  slug: string;
  imageUrl?: string;
  score: number;
  metrics: {
    searches: number;
    views: number;
    interactions: number;
    growth: number;
  };
  timeframe: '1h' | '6h' | '24h';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const timeframe = (searchParams.get('timeframe') as '1h' | '6h' | '24h') || '24h';
  const limit = parseInt(searchParams.get('limit') || '10');
  const type = searchParams.get('type') as 'artist' | 'show' | 'venue' | 'all';

  try {
    const supabase = createClient();
    
    // Calculate timeframe cutoff
    const cutoffDate = new Date();
    switch (timeframe) {
      case '1h':
        cutoffDate.setHours(cutoffDate.getHours() - 1);
        break;
      case '6h':
        cutoffDate.setHours(cutoffDate.getHours() - 6);
        break;
      case '24h':
        cutoffDate.setHours(cutoffDate.getHours() - 24);
        break;
    }

    const trending: LiveTrendingItem[] = [];

    // Get trending artists
    if (type === 'all' || type === 'artist') {
      const { data: artists } = await supabase
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
        .limit(type === 'artist' ? limit : Math.ceil(limit / 3));

      if (artists) {
        artists.forEach(artist => {
          // Calculate trending metrics (simulated for now - in production you'd track real metrics)
          const baseScore = artist.popularity || 0;
          const recentActivity = Math.floor(Math.random() * 100);
          const searchVolume = Math.floor(Math.random() * 500);
          const viewCount = Math.floor(Math.random() * 1000);
          
          const score = calculateTrendingScore({
            basePopularity: baseScore,
            recentActivity,
            searchVolume,
            viewCount,
            timeframe
          });

          trending.push({
            id: artist.id,
            type: 'artist',
            name: artist.name,
            slug: artist.slug,
            imageUrl: artist.image_url,
            score,
            metrics: {
              searches: searchVolume,
              views: viewCount,
              interactions: recentActivity,
              growth: Math.floor(Math.random() * 50) - 10, // -10% to +40% growth
            },
            timeframe,
          });
        });
      }
    }

    // Get trending shows
    if (type === 'all' || type === 'show') {
      const { data: shows } = await supabase
        .from('shows')
        .select(`
          id,
          slug,
          name,
          date,
          status,
          created_at,
          artist:artists(name, slug),
          venue:venues(name, city, state)
        `)
        .eq('status', 'confirmed')
        .gte('date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(type === 'show' ? limit : Math.ceil(limit / 3));

      if (shows) {
        shows.forEach(show => {
          const recentActivity = Math.floor(Math.random() * 200);
          const searchVolume = Math.floor(Math.random() * 300);
          const viewCount = Math.floor(Math.random() * 800);
          
          const score = calculateTrendingScore({
            basePopularity: 50,
            recentActivity,
            searchVolume,
            viewCount,
            timeframe,
            isUpcoming: true
          });

          trending.push({
            id: show.id,
            type: 'show',
            name: show.name || `${show.artist?.name} Concert`,
            slug: show.slug,
            score,
            metrics: {
              searches: searchVolume,
              views: viewCount,
              interactions: recentActivity,
              growth: Math.floor(Math.random() * 60) - 5, // -5% to +55% growth
            },
            timeframe,
          });
        });
      }
    }

    // Get trending venues
    if (type === 'all' || type === 'venue') {
      const { data: venues } = await supabase
        .from('venues')
        .select('id, name, slug, city, state, capacity, show_count')
        .order('show_count', { ascending: false })
        .limit(type === 'venue' ? limit : Math.ceil(limit / 3));

      if (venues) {
        venues.forEach(venue => {
          const recentActivity = Math.floor(Math.random() * 80);
          const searchVolume = Math.floor(Math.random() * 200);
          const viewCount = Math.floor(Math.random() * 400);
          
          const score = calculateTrendingScore({
            basePopularity: (venue.show_count || 0) * 2,
            recentActivity,
            searchVolume,
            viewCount,
            timeframe
          });

          trending.push({
            id: venue.id,
            type: 'venue',
            name: venue.name,
            slug: venue.slug,
            score,
            metrics: {
              searches: searchVolume,
              views: viewCount,
              interactions: recentActivity,
              growth: Math.floor(Math.random() * 30) - 5, // -5% to +25% growth
            },
            timeframe,
          });
        });
      }
    }

    // Sort by score and return top results
    const sortedTrending = trending
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return NextResponse.json({
      timeframe,
      limit,
      type: type || 'all',
      trending: sortedTrending,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching live trending:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending data' },
      { status: 500 }
    );
  }
}

function calculateTrendingScore({
  basePopularity,
  recentActivity,
  searchVolume,
  viewCount,
  timeframe,
  isUpcoming = false
}: {
  basePopularity: number;
  recentActivity: number;
  searchVolume: number;
  viewCount: number;
  timeframe: '1h' | '6h' | '24h';
  isUpcoming?: boolean;
}): number {
  // Base score from popularity
  let score = basePopularity * 0.3;
  
  // Recent activity weight (higher for shorter timeframes)
  const activityWeight = timeframe === '1h' ? 2.0 : timeframe === '6h' ? 1.5 : 1.0;
  score += recentActivity * activityWeight * 0.4;
  
  // Search volume weight
  score += searchVolume * 0.2;
  
  // View count weight
  score += viewCount * 0.1;
  
  // Boost upcoming shows
  if (isUpcoming) {
    score *= 1.2;
  }
  
  // Add some randomness for variety
  score += Math.random() * 10;
  
  return Math.round(score * 100) / 100;
}