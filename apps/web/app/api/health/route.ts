import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Enhanced health check endpoint for deployment validation
 * Provides comprehensive system status including database, auth, and API integrations
 */
export async function GET() {
  const startTime = Date.now();
  
  try {
    // Basic system info
    const systemInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      deployment: {
        vercel: {
          url: process.env.VERCEL_URL,
          region: process.env.VERCEL_REGION,
          branch: process.env.VERCEL_GIT_COMMIT_REF,
          commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
        },
      },
    };

    // Database health check
    const dbHealth = await checkDatabase();
    
    // Auth health check
    const authHealth = await checkAuth();
    
    // API integrations health check
    const apiHealth = await checkAPIIntegrations();
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Overall health status
    const allHealthy = dbHealth.healthy && authHealth.healthy && apiHealth.healthy;
    
    const response = {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      system: systemInfo,
      services: {
        database: dbHealth,
        auth: authHealth,
        apis: apiHealth,
      },
      uptime: process.uptime(),
    };

    return NextResponse.json(response, { 
      status: allHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    const errorResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined,
      },
      responseTime: `${Date.now() - startTime}ms`,
    };

    return NextResponse.json(errorResponse, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  }
}

async function checkDatabase(): Promise<{ healthy: boolean; message: string; responseTime?: string }> {
  const startTime = Date.now();
  
  try {
    // Check if we have database connection
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { 
        healthy: false, 
        message: 'Database configuration missing',
      };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Simple query to test database connectivity
    const { data, error } = await supabase
      .from('artists')
      .select('id')
      .limit(1);

    if (error) {
      return { 
        healthy: false, 
        message: `Database query failed: ${error.message}`,
        responseTime: `${Date.now() - startTime}ms`,
      };
    }

    return { 
      healthy: true, 
      message: 'Database connection successful',
      responseTime: `${Date.now() - startTime}ms`,
    };

  } catch (error) {
    return { 
      healthy: false, 
      message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: `${Date.now() - startTime}ms`,
    };
  }
}

async function checkAuth(): Promise<{ healthy: boolean; message: string; responseTime?: string }> {
  const startTime = Date.now();
  
  try {
    // Check if we have auth configuration
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return { 
        healthy: false, 
        message: 'Auth configuration missing',
      };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Test auth service by checking session
    const { data, error } = await supabase.auth.getSession();
    
    // This should not error even if no session exists
    if (error) {
      return { 
        healthy: false, 
        message: `Auth service error: ${error.message}`,
        responseTime: `${Date.now() - startTime}ms`,
      };
    }

    return { 
      healthy: true, 
      message: 'Auth service operational',
      responseTime: `${Date.now() - startTime}ms`,
    };

  } catch (error) {
    return { 
      healthy: false, 
      message: `Auth check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: `${Date.now() - startTime}ms`,
    };
  }
}

async function checkAPIIntegrations(): Promise<{ healthy: boolean; message: string; details?: any; responseTime?: string }> {
  const startTime = Date.now();
  
  try {
    const checks = {
      spotify: await checkSpotifyAPI(),
      ticketmaster: await checkTicketmasterAPI(),
    };

    const allHealthy = Object.values(checks).every(check => check.healthy);
    
    return {
      healthy: allHealthy,
      message: allHealthy ? 'All API integrations healthy' : 'Some API integrations failing',
      details: checks,
      responseTime: `${Date.now() - startTime}ms`,
    };

  } catch (error) {
    return { 
      healthy: false, 
      message: `API integration check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: `${Date.now() - startTime}ms`,
    };
  }
}

async function checkSpotifyAPI(): Promise<{ healthy: boolean; message: string }> {
  try {
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      return { healthy: false, message: 'Spotify credentials missing' };
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      return { healthy: false, message: `Spotify API error: ${response.status}` };
    }

    return { healthy: true, message: 'Spotify API accessible' };

  } catch (error) {
    return { 
      healthy: false, 
      message: `Spotify check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function checkTicketmasterAPI(): Promise<{ healthy: boolean; message: string }> {
  try {
    if (!process.env.TICKETMASTER_API_KEY) {
      return { healthy: false, message: 'Ticketmaster API key missing' };
    }

    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${process.env.TICKETMASTER_API_KEY}&size=1`
    );

    if (!response.ok) {
      return { healthy: false, message: `Ticketmaster API error: ${response.status}` };
    }

    return { healthy: true, message: 'Ticketmaster API accessible' };

  } catch (error) {
    return { 
      healthy: false, 
      message: `Ticketmaster check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}