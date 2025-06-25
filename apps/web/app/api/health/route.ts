import { NextRequest, NextResponse } from 'next/server';
import { db, artists } from '@repo/database';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { SpotifyClient, TicketmasterClient, SetlistFmClient } from '@repo/external-apis';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {} as any,
    environment: {
      hasSpotifyCredentials: !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
      hasTicketmasterKey: !!process.env.TICKETMASTER_API_KEY,
      hasSetlistFmKey: !!process.env.SETLISTFM_API_KEY,
      hasDatabase: !!process.env.DATABASE_URL,
      hasSupabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasCronSecret: !!process.env.CRON_SECRET,
    },
    version: process.env.npm_package_version || 'unknown',
  };
  
  try {
    logger.debug('Health check started', {
      action: 'health-check',
      timestamp: health.timestamp,
    });

    // Test database connection
    try {
      const dbStart = Date.now();
      await db.select().from(artists).limit(1);
      health.services.database = {
        status: 'ok',
        responseTime: Date.now() - dbStart,
        message: 'Database connection successful'
      };
    } catch (error) {
      health.services.database = {
        status: 'error',
        message: `Database connection failed: ${error.message}`
      };
      health.status = 'degraded';
    }

    // Test Spotify API
    if (health.environment.hasSpotifyCredentials) {
      try {
        const spotifyStart = Date.now();
        const spotifyClient = new SpotifyClient({});
        await spotifyClient.authenticate();
        
        // Try a simple search
        await spotifyClient.searchArtists('test', 1);
        
        health.services.spotify = {
          status: 'ok',
          responseTime: Date.now() - spotifyStart,
          message: 'Spotify API connection successful'
        };
      } catch (error) {
        health.services.spotify = {
          status: 'error',
          message: `Spotify API failed: ${error.message}`
        };
        health.status = 'degraded';
      }
    } else {
      health.services.spotify = {
        status: 'disabled',
        message: 'Spotify credentials not configured'
      };
    }

    // Test Ticketmaster API
    if (health.environment.hasTicketmasterKey) {
      try {
        const tmStart = Date.now();
        const tmClient = new TicketmasterClient({});
        
        // Try a simple search
        await tmClient.searchEvents({ 
          keyword: 'music',
          size: 1
        });
        
        health.services.ticketmaster = {
          status: 'ok',
          responseTime: Date.now() - tmStart,
          message: 'Ticketmaster API connection successful'
        };
      } catch (error) {
        health.services.ticketmaster = {
          status: 'error',
          message: `Ticketmaster API failed: ${error.message}`
        };
        health.status = 'degraded';
      }
    } else {
      health.services.ticketmaster = {
        status: 'disabled',
        message: 'Ticketmaster API key not configured'
      };
    }

    // Test Setlist.fm API
    if (health.environment.hasSetlistFmKey) {
      try {
        const setlistStart = Date.now();
        const setlistClient = new SetlistFmClient({});
        
        // Try a simple search
        await setlistClient.searchArtists('test', 1);
        
        health.services.setlistfm = {
          status: 'ok',
          responseTime: Date.now() - setlistStart,
          message: 'Setlist.fm API connection successful'
        };
      } catch (error) {
        health.services.setlistfm = {
          status: 'error',
          message: `Setlist.fm API failed: ${error.message}`
        };
        health.status = 'degraded';
      }
    } else {
      health.services.setlistfm = {
        status: 'disabled',
        message: 'Setlist.fm API key not configured'
      };
    }

    // Determine overall health
    const failedServices = Object.values(health.services).filter(
      (service: any) => service.status === 'error'
    ).length;
    
    if (failedServices > 0) {
      health.status = failedServices > 2 ? 'critical' : 'degraded';
    }

    const duration = Date.now() - startTime;

    logger.info('Health check completed', {
      action: 'health-check',
      duration,
      status: health.status,
      failedServices,
    });

    // Return appropriate HTTP status
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 207 : 503;

    return NextResponse.json(health, { status: statusCode });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Health check failed', error, {
      action: 'health-check-error',
      duration,
    });
    
    return NextResponse.json(
      {
        status: 'critical',
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
      },
      { status: 503 }
    );
  }
}