import { NextResponse } from 'next/server';
import { createClient } from '~/lib/supabase/server';
import { db } from '@repo/database';
import { artists, shows, venues } from '@repo/database';
import { sql } from 'drizzle-orm';

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercelUrl: process.env.VERCEL_URL,
    tests: {
      envVars: {
        status: 'pending',
        details: {} as any,
      },
      supabaseClient: {
        status: 'pending',
        details: {} as any,
      },
      drizzleConnection: {
        status: 'pending',
        details: {} as any,
      },
      dataCheck: {
        status: 'pending',
        details: {} as any,
      },
    },
  };

  // Test 1: Check environment variables
  try {
    results.tests.envVars.details = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      DATABASE_URL: !!process.env.DATABASE_URL,
      SPOTIFY_CLIENT_ID: !!process.env.SPOTIFY_CLIENT_ID,
      TICKETMASTER_API_KEY: !!process.env.TICKETMASTER_API_KEY,
      CRON_SECRET: !!process.env.CRON_SECRET,
    };
    const allEnvVarsSet = Object.values(results.tests.envVars.details).every(v => v === true);
    results.tests.envVars.status = allEnvVarsSet ? 'success' : 'warning';
  } catch (error) {
    results.tests.envVars.status = 'error';
    results.tests.envVars.details = { error: error instanceof Error ? error.message : 'Unknown error' };
  }

  // Test 2: Supabase client connection
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from('artists')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    results.tests.supabaseClient.status = 'success';
    results.tests.supabaseClient.details = {
      artistCount: count,
      connection: 'successful',
    };
  } catch (error) {
    results.tests.supabaseClient.status = 'error';
    results.tests.supabaseClient.details = { 
      error: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    };
  }

  // Test 3: Drizzle ORM connection
  try {
    const testQuery = await db.execute(sql`SELECT 1 as test`);
    const artistCount = await db.select({ count: sql<number>`COUNT(*)::int` }).from(artists);
    const showCount = await db.select({ count: sql<number>`COUNT(*)::int` }).from(shows);
    const venueCount = await db.select({ count: sql<number>`COUNT(*)::int` }).from(venues);
    
    results.tests.drizzleConnection.status = 'success';
    results.tests.drizzleConnection.details = {
      connection: 'successful',
      artistCount: artistCount[0]?.count || 0,
      showCount: showCount[0]?.count || 0,
      venueCount: venueCount[0]?.count || 0,
    };
  } catch (error) {
    results.tests.drizzleConnection.status = 'error';
    results.tests.drizzleConnection.details = { 
      error: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Check DATABASE_URL environment variable'
    };
  }

  // Test 4: Data availability check
  try {
    const supabase = await createClient();
    
    // Check for trending artists
    const { data: trendingArtists } = await supabase
      .from('artists')
      .select('name, trending_score')
      .order('trending_score', { ascending: false })
      .limit(5);
    
    // Check for upcoming shows
    const { data: upcomingShows } = await supabase
      .from('shows')
      .select('name, date')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(5);
    
    results.tests.dataCheck.status = 'success';
    results.tests.dataCheck.details = {
      hasTrendingArtists: (trendingArtists?.length || 0) > 0,
      hasUpcomingShows: (upcomingShows?.length || 0) > 0,
      sampleTrendingArtists: trendingArtists?.slice(0, 3).map(a => a.name),
      sampleUpcomingShows: upcomingShows?.slice(0, 3).map(s => ({ name: s.name, date: s.date })),
    };
  } catch (error) {
    results.tests.dataCheck.status = 'error';
    results.tests.dataCheck.details = { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }

  // Determine overall status
  const allTestsPassed = Object.values(results.tests).every(test => 
    test.status === 'success' || test.status === 'warning'
  );

  return NextResponse.json({
    ...results,
    overallStatus: allTestsPassed ? 'ready' : 'issues-detected',
    recommendation: allTestsPassed 
      ? 'App is ready for production!' 
      : 'Please check the failed tests and add missing environment variables to Vercel',
  }, {
    status: allTestsPassed ? 200 : 503,
  });
}