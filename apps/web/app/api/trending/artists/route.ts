import { type NextRequest, NextResponse } from 'next/server';
import { CACHE_HEADERS } from '~/lib/cache';
import { parseGenres } from '~/lib/utils';
import { createServiceClient } from '~/lib/supabase/server';
import { calculateArtistGrowth } from '@repo/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get('limit') || '20');
    // TODO: Implement date range filtering based on timeframe parameter
    // const timeframe = searchParams.get('timeframe') || 'week'; // day, week, month
    // Currently using trending score only - future enhancement will filter by date range

    let supabase;
    try {
      supabase = createServiceClient();
    } catch (error) {
      console.error('Failed to create Supabase client:', error);
      // Return empty array instead of throwing
      return NextResponse.json({
        artists: [],
        fallback: true,
        error: 'Database connection failed',
        message: 'Unable to connect to the database',
        total: 0,
      }, { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      });
    }

    // Get trending artists with fallback for empty data
    const { data: trendingArtists, error } = await supabase
      .from('artists')
      .select('*')
      .or('trending_score.gt.0,popularity.gt.0')
      .order('trending_score', { ascending: false })
      .order('popularity', { ascending: false })
      .order('followers', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    // If no trending data, get popular artists as fallback
    if (!trendingArtists || trendingArtists.length === 0) {
      const { data: popularArtists, error: popularError } = await supabase
        .from('artists')
        .select('*')
        .gt('popularity', 0)
        .order('popularity', { ascending: false })
        .order('followers', { ascending: false })
        .limit(limit);

      if (popularError) {
        throw popularError;
      }

      // Transform fallback data too
      const transformedPopularArtists = (popularArtists || []).map((artist) => {
        // Calculate real growth using historical data (no fake calculations)
        const realGrowth = calculateArtistGrowth({
          followers: artist.followers || 0,
          previousFollowers: artist.previous_followers,
          popularity: artist.popularity || 0,
          previousPopularity: artist.previous_popularity,
          monthlyListeners: artist.monthly_listeners,
          previousMonthlyListeners: artist.previous_monthly_listeners,
          followerCount: artist.follower_count || 0,
          previousFollowerCount: artist.previous_follower_count,
        });
        
        // Use real growth data only (0 if no historical data available)
        const weeklyGrowth = realGrowth.overallGrowth;

        return {
          id: artist.id,
          name: artist.name,
          slug: artist.slug,
          imageUrl: artist.image_url,
          smallImageUrl: artist.small_image_url,
          genres: parseGenres(artist.genres),
          popularity: artist.popularity || 0,
          followers: artist.followers || 0,
          trendingScore: 0,
          verified: artist.verified || false,
          totalShows: artist.total_shows || 0,
          upcomingShows: artist.upcoming_shows || 0,
          updatedAt: artist.updated_at,
          recentShows: artist.upcoming_shows || 0,
          weeklyGrowth: Number(weeklyGrowth.toFixed(1)),
        };
      });

      const response = NextResponse.json({
        artists: transformedPopularArtists,
        fallback: true,
        message: 'Showing popular artists (trending data not available)',
        total: transformedPopularArtists.length,
      });

      // Set cache headers for popular content (longer cache as fallback)
      response.headers.set('Cache-Control', CACHE_HEADERS.api.public);

      return response;
    }

    // Transform the data to match frontend expectations
    const transformedArtists = (trendingArtists || []).map((artist) => {
      // Calculate real growth using historical data (no fake calculations)
      const realGrowth = calculateArtistGrowth({
        followers: artist.followers || 0,
        previousFollowers: artist.previous_followers,
        popularity: artist.popularity || 0,
        previousPopularity: artist.previous_popularity,
        monthlyListeners: artist.monthly_listeners,
        previousMonthlyListeners: artist.previous_monthly_listeners,
        followerCount: artist.follower_count || 0,
        previousFollowerCount: artist.previous_follower_count,
      });
      
      // Use real growth data only (0 if no historical data available)
      const weeklyGrowth = realGrowth.overallGrowth;

      return {
        id: artist.id,
        name: artist.name,
        slug: artist.slug,
        imageUrl: artist.image_url,
        smallImageUrl: artist.small_image_url,
        genres: parseGenres(artist.genres),
        popularity: artist.popularity || 0,
        followers: artist.followers || 0,
        trendingScore: artist.trending_score || 0,
        verified: artist.verified || false,
        totalShows: artist.total_shows || 0,
        upcomingShows: artist.upcoming_shows || 0,
        updatedAt: artist.updated_at,
        recentShows: artist.upcoming_shows || 0,
        weeklyGrowth: Number(weeklyGrowth.toFixed(1)),
      };
    });

    const response = NextResponse.json({
      artists: transformedArtists,
      fallback: false,
      message: 'Trending artists loaded successfully',
      total: transformedArtists.length,
    });

    // Set cache headers for trending content
    response.headers.set('Cache-Control', CACHE_HEADERS.api.public);

    return response;
  } catch (error) {
    console.error('Trending artists error:', error);
    // Return empty array with error info instead of throwing
    return NextResponse.json(
      {
        artists: [],
        fallback: true,
        error: 'Failed to load trending artists',
        message: error instanceof Error ? error.message : 'Unable to load artist data at this time',
        total: 0,
      },
      { status: 200 }
    ); // Return 200 to prevent UI crashes
  }
}
