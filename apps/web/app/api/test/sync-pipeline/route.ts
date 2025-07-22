import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '~/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const artistName = searchParams.get('artist') || 'Taylor Swift';
    
    const supabase = await createServiceClient();
    
    // Test 1: Check if artist exists
    const { data: existingArtist, error: searchError } = await supabase
      .from('artists')
      .select('id, name, slug, spotify_id, ticketmaster_id, last_synced_at')
      .ilike('name', artistName)
      .single();
    
    if (searchError && searchError.code !== 'PGRST116') {
      throw searchError;
    }
    
    // Test 2: Check sync endpoint availability
    const syncEndpointTest = await fetch(`${process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3001'}/api/sync/unified-pipeline`);
    const syncStatus = {
      available: syncEndpointTest.ok,
      status: syncEndpointTest.status,
    };
    
    // Test 3: Check API keys configuration
    const apiKeys = {
      spotify: !!process.env['SPOTIFY_CLIENT_ID'] && !!process.env['SPOTIFY_CLIENT_SECRET'],
      ticketmaster: !!process.env['TICKETMASTER_API_KEY'],
      setlistfm: !!process.env['SETLISTFM_API_KEY'],
    };
    
    // Test 4: If artist exists, check related data
    let relatedData = null;
    if (existingArtist) {
      const [showsResult, songsResult] = await Promise.all([
        supabase
          .from('shows')
          .select('id', { count: 'exact', head: true })
          .eq('headliner_artist_id', existingArtist.id),
        supabase
          .from('artist_songs')
          .select('id', { count: 'exact', head: true })
          .eq('artist_id', existingArtist.id),
      ]);
      
      relatedData = {
        showCount: showsResult.count || 0,
        songCount: songsResult.count || 0,
      };
    }
    
    // Test 5: Database connection health
    const { data: dbTest, error: dbError } = await supabase
      .from('artists')
      .select('count')
      .limit(1);
    
    const dbHealthy = !dbError && !!dbTest;
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        database: {
          healthy: dbHealthy,
          error: dbError?.message || null,
        },
        artist: {
          searched: artistName,
          found: !!existingArtist,
          data: existingArtist || null,
          relatedData,
        },
        syncEndpoint: syncStatus,
        apiKeys,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          appUrl: process.env['NEXT_PUBLIC_APP_URL'] || 'not set',
        },
      },
      recommendations: {
        needsSync: existingArtist && !existingArtist.last_synced_at,
        missingArtist: !existingArtist,
        missingApiKeys: Object.entries(apiKeys)
          .filter(([_, value]) => !value)
          .map(([key]) => key),
      },
    });
  } catch (error) {
    console.error('Sync pipeline test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Sync pipeline test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}