import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';

interface DashboardMetrics {
  timestamp: string;
  uptime: number;
  performance: {
    response_time_avg: number;
    error_rate: number;
    throughput: number;
    success_rate: number;
  };
  infrastructure: {
    memory_usage: number;
    cpu_usage: number;
    database_connections: number;
    cache_hit_rate: number;
  };
  business: {
    active_users: number;
    api_calls_24h: number;
    searches_24h: number;
    votes_24h: number;
  };
  alerts: Array<{
    id: string;
    level: 'warning' | 'error' | 'critical';
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
  external_apis: {
    spotify: {
      status: 'operational' | 'degraded' | 'down';
      response_time: number;
      error_rate: number;
    };
    ticketmaster: {
      status: 'operational' | 'degraded' | 'down';
      response_time: number;
      error_rate: number;
    };
    setlistfm: {
      status: 'operational' | 'degraded' | 'down';
      response_time: number;
      error_rate: number;
    };
  };
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = createClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['SUPABASE_SERVICE_ROLE_KEY']!
    );

    // Get performance metrics
    const performanceMetrics = await getPerformanceMetrics();
    
    // Get infrastructure metrics
    const infrastructureMetrics = await getInfrastructureMetrics();
    
    // Get business metrics
    const businessMetrics = await getBusinessMetrics(supabase);
    
    // Get external API status
    const externalAPIStatus = await getExternalAPIStatus();
    
    // Get active alerts
    const alerts = await getActiveAlerts();

    const dashboard: DashboardMetrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      performance: performanceMetrics,
      infrastructure: infrastructureMetrics,
      business: businessMetrics,
      alerts,
      external_apis: externalAPIStatus,
    };

    // Track dashboard access
    Sentry.addBreadcrumb({
      category: 'monitoring',
      message: 'Dashboard accessed',
      level: 'info',
    });

    return NextResponse.json(dashboard, {
      headers: {
        'Cache-Control': 'no-cache, max-age=30',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        component: 'monitoring-dashboard',
        critical: true,
      },
    });

    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}

async function getPerformanceMetrics() {
  // Mock implementation - in production, integrate with actual metrics
  return {
    response_time_avg: Math.random() * 500 + 200, // 200-700ms
    error_rate: Math.random() * 0.05, // 0-5%
    throughput: Math.random() * 1000 + 500, // 500-1500 req/min
    success_rate: 0.95 + Math.random() * 0.05, // 95-100%
  };
}

async function getInfrastructureMetrics() {
  const memoryUsage = process.memoryUsage();
  
  return {
    memory_usage: (memoryUsage.rss / 1024 / 1024), // MB
    cpu_usage: Math.random() * 80 + 10, // 10-90%
    database_connections: Math.floor(Math.random() * 20 + 5), // 5-25 connections
    cache_hit_rate: 0.8 + Math.random() * 0.2, // 80-100%
  };
}

async function getBusinessMetrics(supabase: any) {
  try {
    // Get active users in last 24 hours
    const { data: activeUsers } = await supabase
      .from('users')
      .select('count')
      .gte('last_sign_in_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Get API calls in last 24 hours (mock)
    const apiCalls24h = Math.floor(Math.random() * 50000 + 10000);

    // Get searches in last 24 hours (mock)
    const searches24h = Math.floor(Math.random() * 5000 + 1000);

    // Get votes in last 24 hours
    const { data: votes } = await supabase
      .from('votes')
      .select('count')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return {
      active_users: activeUsers?.length || 0,
      api_calls_24h: apiCalls24h,
      searches_24h: searches24h,
      votes_24h: votes?.length || 0,
    };
  } catch (error) {
    console.error('Error fetching business metrics:', error);
    return {
      active_users: 0,
      api_calls_24h: 0,
      searches_24h: 0,
      votes_24h: 0,
    };
  }
}

async function getExternalAPIStatus(): Promise<{
  spotify: { status: 'operational' | 'degraded' | 'down'; response_time: number; error_rate: number; };
  ticketmaster: { status: 'operational' | 'degraded' | 'down'; response_time: number; error_rate: number; };
  setlistfm: { status: 'operational' | 'degraded' | 'down'; response_time: number; error_rate: number; };
}> {
  const checkAPI = async (url: string, headers: any = {}): Promise<{ status: 'operational' | 'degraded' | 'down'; response_time: number; error_rate: number; }> => {
    try {
      const start = Date.now();
      const response = await fetch(url, { 
        headers,
        signal: AbortSignal.timeout(5000)
      });
      const responseTime = Date.now() - start;
      
      return {
        status: response.ok ? 'operational' : 'degraded',
        response_time: responseTime,
        error_rate: response.ok ? 0 : 1,
      };
    } catch (error) {
      return {
        status: 'down' as const,
        response_time: 0,
        error_rate: 1,
      };
    }
  };

  // Get Spotify token first
  let spotifyToken = '';
  try {
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env['SPOTIFY_CLIENT_ID']}:${process.env['SPOTIFY_CLIENT_SECRET']}`
        ).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });
    const tokenData = await tokenResponse.json();
    spotifyToken = tokenData.access_token;
  } catch (error) {
    console.error('Failed to get Spotify token:', error);
  }

  const [spotify, ticketmaster, setlistfm] = await Promise.all([
    checkAPI('https://api.spotify.com/v1/search?q=test&type=artist&limit=1', {
      'Authorization': `Bearer ${spotifyToken}`,
    }),
    checkAPI(`https://app.ticketmaster.com/discovery/v2/events.json?apikey=${process.env['TICKETMASTER_API_KEY']}&size=1`),
    checkAPI('https://api.setlist.fm/rest/1.0/search/setlists?artistName=test&p=1', {
      'x-api-key': process.env['SETLISTFM_API_KEY']!,
      'Accept': 'application/json',
    }),
  ]);

  return {
    spotify,
    ticketmaster,
    setlistfm,
  };
}

async function getActiveAlerts() {
  // Mock implementation - in production, integrate with actual alerting system
  const alerts: any[] = [];
  
  // Memory usage alert
  const memoryUsage = process.memoryUsage();
  if (memoryUsage.rss > 512 * 1024 * 1024) { // 512MB
    alerts.push({
      id: 'memory-high',
      level: 'warning' as const,
      message: `High memory usage: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`,
      timestamp: new Date().toISOString(),
      resolved: false,
    });
  }

  // Response time alert
  const responseTime = Math.random() * 1000;
  if (responseTime > 800) {
    alerts.push({
      id: 'response-time-high',
      level: 'error' as const,
      message: `High response time: ${responseTime.toFixed(2)}ms`,
      timestamp: new Date().toISOString(),
      resolved: false,
    });
  }

  return alerts;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, alertId } = body;

    if (action === 'resolve' && alertId) {
      // Mock alert resolution
      Sentry.addBreadcrumb({
        category: 'monitoring',
        message: `Alert resolved: ${alertId}`,
        level: 'info',
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}