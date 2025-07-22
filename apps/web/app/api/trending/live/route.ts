import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '~/lib/supabase/server';

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

// Add ISR support with cache headers
export const revalidate = 60; // Revalidate every minute for live data

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const timeframe =
    (searchParams.get('timeframe') as '1h' | '6h' | '24h') || '24h';
  const limit = Number.parseInt(searchParams.get('limit') || '10');
  const type = searchParams.get('type') as 'artist' | 'show' | 'venue' | 'all';

  try {
    const supabase = await createServiceClient();
    const trending: LiveTrendingItem[] = [];

    // Calculate time window for trending based on timeframe
    const now = new Date();
    const timeWindow = new Date();
    switch (timeframe) {
      case '1h':
        timeWindow.setHours(now.getHours() - 1);
        break;
      case '6h':
        timeWindow.setHours(now.getHours() - 6);
        break;
      case '24h':
      default:
        timeWindow.setDate(now.getDate() - 1);
        break;
    }

    // -----------------------------
    // Artists
    // -----------------------------
    if (type === 'all' || type === 'artist') {
      try {
        const { data: trendingArtists } = await supabase
          .from('artists')
          .select('id, name, slug, image_url, popularity, followers, follower_count, trending_score, updated_at')
          .or('trending_score.gt.0,popularity.gt.0,followers.gt.0')
          .order('trending_score', { ascending: false })
          .order('popularity', { ascending: false })
          .limit(type === 'artist' ? limit : Math.ceil(limit / 3));

        if (trendingArtists && trendingArtists.length > 0) {
          trendingArtists.forEach((artist) => {
            // Calculate metrics based on available data
            const searches = Math.round((artist.popularity || 0) * 1.5);
            const views = artist.popularity || 0;
            const interactions = artist.follower_count || artist.followers || 0;
            const trendingScore = artist.trending_score || 0;

            // Calculate growth based on trending score and activity
            const growth = Math.min(
              50,
              Math.random() * 20 + trendingScore / 50
            );

            // Calculate comprehensive score
            const score =
              trendingScore + searches * 2 + views * 1.5 + interactions * 3;

            trending.push({
              id: artist.id,
              type: 'artist',
              name: artist.name,
              slug: artist.slug,
              ...(artist.image_url && { imageUrl: artist.image_url }),
              score: Math.round(score),
              metrics: {
                searches,
                views,
                interactions,
                growth: Math.round(growth * 10) / 10,
              },
              timeframe,
            });
          });
        }
      } catch (err) {
        console.error('Error fetching trending artists:', err);
        // Continue with other data types
      }
    }

    // -----------------------------
    // Shows
    // -----------------------------
    if (type === 'all' || type === 'show') {
      try {
        const { data: trendingShows } = await supabase
          .from('shows')
          .select(`
            id,
            name,
            slug,
            view_count,
            vote_count,
            attendee_count,
            trending_score,
            updated_at,
            date,
            headliner_artist:artists!shows_headliner_artist_id_fkey(
              name,
              image_url
            )
          `)
          .or('date.gte.' + new Date().toISOString().split('T')[0] + ',attendee_count.gt.0')
          .order('trending_score', { ascending: false })
          .order('attendee_count', { ascending: false })
          .limit(type === 'show' ? limit : Math.ceil(limit / 3));

        
        if (trendingShows && trendingShows.length > 0) {
          trendingShows.forEach((show) => {
            const searches = Math.round((show.view_count || 0) * 0.3);
            const views = show.view_count || 0;
            const interactions =
              (show.vote_count || 0) + (show.attendee_count || 0);
            const trendingScore = show.trending_score || 0;

            // Calculate growth based on activity and recency
            const growth = Math.min(40, Math.random() * 15 + interactions / 10);

            // Calculate comprehensive score
            const score =
              trendingScore + searches * 2 + views * 1.5 + interactions * 3;

            const artistName = show.headliner_artist?.name || show.name || 'Unnamed Show';
            const artistImage = show.headliner_artist?.image_url;

            trending.push({
              id: show.id,
              type: 'show',
              name: artistName,
              slug: show.slug,
              ...(artistImage && { imageUrl: artistImage }),
              score: Math.round(score),
              metrics: {
                searches,
                views,
                interactions,
                growth: Math.round(growth * 10) / 10,
              },
              timeframe,
            });
          });
        }
      } catch (err) {
        console.error('Error fetching trending shows:', err);
      }
    }

    // -----------------------------
    // Venues
    // -----------------------------
    if (type === 'all' || type === 'venue') {
      try {
        // Get venues with show count
        const { data: trendingVenues } = await supabase
          .from('venues')
          .select(`
            id,
            name,
            slug,
            image_url,
            capacity,
            city,
            state,
            shows!shows_venue_id_fkey(count)
          `)
          .not('capacity', 'is', null)
          .gt('capacity', 0)
          .order('capacity', { ascending: false })
          .limit(type === 'venue' ? limit : Math.floor(limit / 3));

        
        if (trendingVenues && trendingVenues.length > 0) {
          trendingVenues.forEach((venue) => {
            const showCount = venue.shows?.[0]?.count || 0;
            const searches = Math.round(showCount * 0.5);
            const views = showCount * 2;
            const interactions = showCount;

            // Calculate growth based on recent activity
            const growth = Math.min(30, Math.random() * 10 + interactions / 5);

            // Calculate score based on activity and capacity utilization
            const score =
              searches * 2 +
              views * 1.5 +
              interactions * 3 +
              (venue.capacity || 1000) * 0.01;

            trending.push({
              id: venue.id,
              type: 'venue',
              name: venue.name,
              slug: venue.slug,
              ...(venue.image_url && { imageUrl: venue.image_url }),
              score: Math.round(score),
              metrics: {
                searches,
                views,
                interactions,
                growth: Math.round(growth * 10) / 10,
              },
              timeframe,
            });
          });
        }
      } catch (err) {
        console.error('Error fetching trending venues:', err);
      }
    }

    // Sort by score and return top results
    const sortedTrending = trending
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const response = NextResponse.json({
      trending: sortedTrending,
      timeframe,
      type: type || 'all',
      total: sortedTrending.length,
      generatedAt: new Date().toISOString(),
    });

    // Add cache headers for better performance
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=300'
    );

    return response;
  } catch (error) {
    // Return error details for debugging
    return NextResponse.json({
      trending: [],
      timeframe,
      type: type || 'all',
      total: 0,
      generatedAt: new Date().toISOString(),
      error: 'Unable to fetch trending data',
      errorDetails: error instanceof Error ? error.message : String(error),
    });
  }
}
