import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  region: string;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime: number;
      error?: string;
    };
    external_apis: {
      spotify: {
        status: 'healthy' | 'unhealthy';
        responseTime: number;
        error?: string;
      };
      ticketmaster: {
        status: 'healthy' | 'unhealthy';
        responseTime: number;
        error?: string;
      };
      setlistfm: {
        status: 'healthy' | 'unhealthy';
        responseTime: number;
        error?: string;
      };
    };
    memory: {
      usage: number;
      limit: number;
      percentage: number;
    };
    disk: {
      usage: number;
      limit: number;
      percentage: number;
    };
  };
}

export async function GET(_request: NextRequest) {
  const start = Date.now();
  
  try {
    // Initialize health check result
    const healthCheck: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env['VERCEL_GIT_COMMIT_SHA'] || 'unknown',
      region: process.env['VERCEL_REGION'] || 'unknown',
      checks: {
        database: {
          status: 'healthy',
          responseTime: 0,
        },
        external_apis: {
          spotify: {
            status: 'healthy',
            responseTime: 0,
          },
          ticketmaster: {
            status: 'healthy',
            responseTime: 0,
          },
          setlistfm: {
            status: 'healthy',
            responseTime: 0,
          },
        },
        memory: {
          usage: 0,
          limit: 0,
          percentage: 0,
        },
        disk: {
          usage: 0,
          limit: 0,
          percentage: 0,
        },
      },
    };

    // Check database health
    try {
      const dbStart = Date.now();
      const supabase = createClient(
        process.env['NEXT_PUBLIC_SUPABASE_URL']!,
        process.env['SUPABASE_SERVICE_ROLE_KEY']!
      );
      
      const { data: _, error } = await supabase
        .from('users')
        .select('count')
        .limit(1)
        .single();

      healthCheck.checks.database.responseTime = Date.now() - dbStart;
      
      if (error) {
        healthCheck.checks.database.status = 'unhealthy';
        healthCheck.checks.database.error = error.message;
        healthCheck.status = 'degraded';
      }
    } catch (error) {
      healthCheck.checks.database.status = 'unhealthy';
      healthCheck.checks.database.error = error instanceof Error ? error.message : 'Unknown error';
      healthCheck.status = 'unhealthy';
    }

    // Check Spotify API health
    try {
      const spotifyStart = Date.now();
      const spotifyResponse = await fetch('https://api.spotify.com/v1/search?q=test&type=artist&limit=1', {
        headers: {
          'Authorization': `Bearer ${await getSpotifyToken()}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      
      healthCheck.checks.external_apis.spotify.responseTime = Date.now() - spotifyStart;
      
      if (!spotifyResponse.ok) {
        healthCheck.checks.external_apis.spotify.status = 'unhealthy';
        healthCheck.checks.external_apis.spotify.error = `HTTP ${spotifyResponse.status}`;
        healthCheck.status = 'degraded';
      }
    } catch (error) {
      healthCheck.checks.external_apis.spotify.status = 'unhealthy';
      healthCheck.checks.external_apis.spotify.error = error instanceof Error ? error.message : 'Unknown error';
      healthCheck.status = 'degraded';
    }

    // Check Ticketmaster API health
    try {
      const ticketmasterStart = Date.now();
      const ticketmasterResponse = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${process.env['TICKETMASTER_API_KEY']}&size=1`,
        {
          signal: AbortSignal.timeout(5000),
        }
      );
      
      healthCheck.checks.external_apis.ticketmaster.responseTime = Date.now() - ticketmasterStart;
      
      if (!ticketmasterResponse.ok) {
        healthCheck.checks.external_apis.ticketmaster.status = 'unhealthy';
        healthCheck.checks.external_apis.ticketmaster.error = `HTTP ${ticketmasterResponse.status}`;
        healthCheck.status = 'degraded';
      }
    } catch (error) {
      healthCheck.checks.external_apis.ticketmaster.status = 'unhealthy';
      healthCheck.checks.external_apis.ticketmaster.error = error instanceof Error ? error.message : 'Unknown error';
      healthCheck.status = 'degraded';
    }

    // Check SetlistFM API health
    try {
      const setlistfmStart = Date.now();
      const setlistfmResponse = await fetch(
        'https://api.setlist.fm/rest/1.0/search/setlists?artistName=test&p=1',
        {
          headers: {
            'x-api-key': process.env['SETLISTFM_API_KEY']!,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        }
      );
      
      healthCheck.checks.external_apis.setlistfm.responseTime = Date.now() - setlistfmStart;
      
      if (!setlistfmResponse.ok) {
        healthCheck.checks.external_apis.setlistfm.status = 'unhealthy';
        healthCheck.checks.external_apis.setlistfm.error = `HTTP ${setlistfmResponse.status}`;
        healthCheck.status = 'degraded';
      }
    } catch (error) {
      healthCheck.checks.external_apis.setlistfm.status = 'unhealthy';
      healthCheck.checks.external_apis.setlistfm.error = error instanceof Error ? error.message : 'Unknown error';
      healthCheck.status = 'degraded';
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    healthCheck.checks.memory = {
      usage: memoryUsage.rss,
      limit: memoryUsage.heapTotal,
      percentage: (memoryUsage.rss / memoryUsage.heapTotal) * 100,
    };

    // Check disk usage (simplified for serverless)
    healthCheck.checks.disk = {
      usage: 0,
      limit: 1000000000, // 1GB limit approximation
      percentage: 0,
    };

    // Track performance metrics
    const responseTime = Date.now() - start;
    // Using setTag instead of deprecated metrics API
    Sentry.setTag('health_check.response_time', responseTime);
    Sentry.setTag('health_check.status', healthCheck.status);
    Sentry.setTag('health_check.region', healthCheck.region);

    // Log health check results
    if (healthCheck.status === 'unhealthy') {
      Sentry.captureMessage(`Health check failed`, 'error');
    }

    return NextResponse.json(healthCheck, {
      status: healthCheck.status === 'healthy' ? 200 : 
              healthCheck.status === 'degraded' ? 207 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      uptime: process.uptime(),
      version: process.env['VERCEL_GIT_COMMIT_SHA'] || 'unknown',
      region: process.env['VERCEL_REGION'] || 'unknown',
    };

    Sentry.captureException(error, {
      tags: {
        component: 'health-check',
        critical: true,
      },
    });

    return NextResponse.json(errorResponse, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  }
}

async function getSpotifyToken(): Promise<string> {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(
        `${process.env['SPOTIFY_CLIENT_ID']}:${process.env['SPOTIFY_CLIENT_SECRET']}`
      ).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
}