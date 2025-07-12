import { type NextRequest, NextResponse } from 'next/server';
import {
  type RecommendationConfig,
  getPersonalizedRecommendations,
  getRecommendedArtists,
  getRecommendedShows,
  getRecommendedVenues,
} from '~/lib/recommendations';
import { 
  getMLRecommendations, 
  trackRecommendationPerformance,
  type MLRecommendationConfig 
} from '~/lib/recommendations/ml-engine';
import { createClient } from '~/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as
      | 'shows'
      | 'artists'
      | 'venues'
      | 'all'
      | null;
    const algorithm = searchParams.get('algorithm') as 
      | 'collaborative'
      | 'content'
      | 'hybrid'
      | 'matrix_factorization'
      | 'basic'
      | null;
    const limit = Number.parseInt(searchParams.get('limit') || '20');
    const includeUpcoming = searchParams.get('includeUpcoming') !== 'false';
    const includePast = searchParams.get('includePast') === 'true';
    const includeExplanations = searchParams.get('includeExplanations') === 'true';
    const diversityFactor = Number.parseFloat(searchParams.get('diversityFactor') || '0.3');
    const recencyWeight = Number.parseFloat(searchParams.get('recencyWeight') || '0.2');
    const minSimilarity = Number.parseFloat(searchParams.get('minSimilarity') || '0.3');

    // Add location if provided
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const maxDistance = searchParams.get('maxDistance');

    let data;

    // Use ML engine for advanced algorithms
    if (algorithm && algorithm !== 'basic') {
      const mlConfig: MLRecommendationConfig = {
        algorithm,
        limit,
        minSimilarity,
        includeExplanations,
        useRealTimeData: true,
        diversityFactor,
        recencyWeight
      };

      data = await getMLRecommendations(user.id, mlConfig);
    } else {
      // Use basic recommendation engine
      const config: RecommendationConfig = {
        limit,
        includeUpcoming,
        includePast,
      };

      if (lat && lng) {
        config.userLocation = {
          lat: Number.parseFloat(lat),
          lng: Number.parseFloat(lng),
        };

        if (maxDistance) {
          config.maxDistance = Number.parseInt(maxDistance);
        }
      }

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
        default:
          data = await getPersonalizedRecommendations(user.id, config);
          break;
      }
    }

    return NextResponse.json({
      userId: user.id,
      type: type || 'all',
      algorithm: algorithm || 'basic',
      config: algorithm && algorithm !== 'basic' ? {
        algorithm,
        limit,
        minSimilarity,
        includeExplanations,
        diversityFactor,
        recencyWeight
      } : {
        limit,
        includeUpcoming,
        includePast,
        userLocation: lat && lng ? { lat: Number.parseFloat(lat), lng: Number.parseFloat(lng) } : undefined,
        maxDistance: maxDistance ? Number.parseInt(maxDistance) : undefined
      },
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recommendationId, action, metadata } = body;

    if (!recommendationId || !action) {
      return NextResponse.json(
        { error: 'Missing recommendationId or action' },
        { status: 400 }
      );
    }

    if (!['view', 'click', 'convert'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be view, click, or convert' },
        { status: 400 }
      );
    }

    // Track the recommendation performance
    await trackRecommendationPerformance(
      user.id,
      recommendationId,
      action,
      metadata
    );

    return NextResponse.json({
      success: true,
      message: 'Recommendation interaction tracked',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Recommendation tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track recommendation' },
      { status: 500 }
    );
  }
}
