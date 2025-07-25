import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '~/lib/supabase/server';
import { parseGenres } from '~/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    const genre = searchParams.get('genre');
    const sort = searchParams.get('sort') || 'trending'; // trending, popular, alphabetical

    const supabase = createServiceClient();

    // Build query
    let query = supabase
      .from('artists')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1);

    // Filter by genre if provided
    if (genre) {
      query = query.contains('genres', [genre]);
    }

    // Apply sorting
    switch (sort) {
      case 'trending':
        query = query
          .order('trending_score', { ascending: false })
          .order('popularity', { ascending: false });
        break;
      case 'popular':
        query = query
          .order('popularity', { ascending: false })
          .order('followers', { ascending: false });
        break;
      case 'alphabetical':
        query = query.order('name', { ascending: true });
        break;
      case 'recent':
        query = query.order('created_at', { ascending: false });
        break;
      default:
        query = query
          .order('trending_score', { ascending: false })
          .order('popularity', { ascending: false });
    }

    const { data: artists, error, count } = await query;

    if (error) {
      throw error;
    }

    // Transform artists data
    const transformedArtists = (artists || []).map((artist) => ({
      id: artist.id,
      name: artist.name,
      slug: artist.slug,
      genres: parseGenres(artist.genres),
      imageUrl: artist.image_url,
      smallImageUrl: artist.small_image_url,
      followers: artist.followers || 0,
      popularity: artist.popularity || 0,
      trendingScore: artist.trending_score || 0,
      verified: artist.verified || false,
      bio: artist.bio,
      spotifyId: artist.spotify_id,
      ticketmasterId: artist.ticketmaster_id,
      totalShows: artist.total_shows || 0,
      upcomingShows: artist.upcoming_shows || 0,
      lastSyncedAt: artist.last_synced_at,
      createdAt: artist.created_at,
      updatedAt: artist.updated_at,
    }));

    const response = NextResponse.json({
      artists: transformedArtists,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      success: true,
    });

    // Set cache headers
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');

    return response;
  } catch (error) {
    console.error('Artists API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch artists',
        message: error instanceof Error ? error.message : 'Unknown error',
        artists: [],
        success: false,
      },
      { status: 500 }
    );
  }
}