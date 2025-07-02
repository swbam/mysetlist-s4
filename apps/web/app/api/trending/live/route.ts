import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

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
    const supabase = await createServiceClient();
    
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

    // -----------------------------
    // Artists
    // -----------------------------
    if (type === 'all' || type === 'artist') {
      const { data: artists } = await supabase
        .from('artists')
        .select('id, name, slug, image_url, trending_score, followers, popularity')
        .order('trending_score', { ascending: false })
        .limit(type === 'artist' ? limit : Math.ceil(limit / 3));

      (artists ?? []).forEach((artist) => {
        trending.push({
          id: artist.id,
          type: 'artist',
          name: artist.name,
          slug: artist.slug,
          imageUrl: artist.image_url,
          score: artist.trending_score ?? 0,
          metrics: {
            searches: 0,
            views: 0,
            interactions: artist.followers ?? 0,
            growth: 0,
          },
          timeframe,
        });
      });
    }

    // -----------------------------
    // Shows (upcoming)
    // -----------------------------
    if (type === 'all' || type === 'show') {
      const { data: shows } = await supabase
        .from('shows')
        .select('id, slug, name, trending_score')
        .order('trending_score', { ascending: false })
        .lt('date', new Date().toISOString())
        .limit(type === 'show' ? limit : Math.ceil(limit / 3));

      (shows ?? []).forEach((show) => {
        trending.push({
          id: show.id,
          type: 'show',
          name: show.name,
          slug: show.slug,
          score: show.trending_score ?? 0,
          metrics: {
            searches: 0,
            views: 0,
            interactions: 0,
            growth: 0,
          },
          timeframe,
        });
      });
    }

    // -----------------------------
    // Venues (rank by show_count)
    // -----------------------------
    if (type === 'all' || type === 'venue') {
      const { data: venues } = await supabase
        .from('venues')
        .select('id, name, slug, show_count')
        .order('show_count', { ascending: false })
        .limit(type === 'venue' ? limit : Math.ceil(limit / 3));

      (venues ?? []).forEach((venue) => {
        trending.push({
          id: venue.id,
          type: 'venue',
          name: venue.name,
          slug: venue.slug,
          score: (venue.show_count ?? 0),
          metrics: {
            searches: 0,
            views: 0,
            interactions: 0,
            growth: 0,
          },
          timeframe,
        });
      });
    }

    // Sort by score and return top results
    const sortedTrending = trending.sort((a, b) => b.score - a.score).slice(0, limit);

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