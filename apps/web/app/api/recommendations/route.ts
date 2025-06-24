import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  getPersonalizedRecommendations,
  getRecommendedShows,
  getRecommendedArtists,
  getRecommendedVenues,
  RecommendationConfig 
} from '@/lib/recommendations';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as 'shows' | 'artists' | 'venues' | 'all' | null;
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeUpcoming = searchParams.get('includeUpcoming') !== 'false';
    const includePast = searchParams.get('includePast') === 'true';
    
    const config: RecommendationConfig = {
      limit,
      includeUpcoming,
      includePast,
    };
    
    // Add location if provided
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const maxDistance = searchParams.get('maxDistance');
    
    if (lat && lng) {
      config.userLocation = {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      };
      
      if (maxDistance) {
        config.maxDistance = parseInt(maxDistance);
      }
    }
    
    let data;
    
    switch (type) {
      case 'shows':
        data = await getRecommendedShows(user.id, config);
        break;
      case 'artists':
        data = await getRecommendedArtists(user.id, config);
        break;
      case 'venues':
        data = await getRecommendedVenues(user.id, config);
        break;
      case 'all':
      default:
        data = await getPersonalizedRecommendations(user.id, config);
        break;
    }
    
    return NextResponse.json({
      userId: user.id,
      type: type || 'all',
      config,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}