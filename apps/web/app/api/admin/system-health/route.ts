import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  uptime?: number;
  lastCheck: Date;
  metadata?: any;
}

async function checkDatabaseHealth(supabase: any): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    await supabase.from('users').select('id').limit(1);
    const responseTime = Date.now() - startTime;
    
    return {
      service: 'Database',
      status: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'degraded' : 'down',
      responseTime,
      uptime: 99.9,
      lastCheck: new Date()
    };
  } catch (error) {
    return {
      service: 'Database',
      status: 'down',
      responseTime: Date.now() - startTime,
      lastCheck: new Date(),
      metadata: { error: error.message }
    };
  }
}

async function checkExternalAPIs(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];
  
  // Spotify API check
  const spotifyStart = Date.now();
  try {
    const response = await fetch('https://api.spotify.com/v1/browse/featured-playlists?limit=1', {
      headers: {
        'Authorization': `Bearer ${process.env.SPOTIFY_ACCESS_TOKEN || 'dummy'}`,
      }
    });
    
    const spotifyTime = Date.now() - spotifyStart;
    checks.push({
      service: 'Spotify API',
      status: response.ok ? (spotifyTime < 1000 ? 'healthy' : 'degraded') : 'down',
      responseTime: spotifyTime,
      lastCheck: new Date(),
      metadata: { statusCode: response.status }
    });
  } catch (error) {
    checks.push({
      service: 'Spotify API',
      status: 'down',
      responseTime: Date.now() - spotifyStart,
      lastCheck: new Date(),
      metadata: { error: error.message }
    });
  }

  // Ticketmaster API check
  const tmStart = Date.now();
  try {
    const response = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?size=1&apikey=${process.env.TICKETMASTER_API_KEY || 'dummy'}`);
    
    const tmTime = Date.now() - tmStart;
    checks.push({
      service: 'Ticketmaster API',
      status: response.ok ? (tmTime < 1000 ? 'healthy' : 'degraded') : 'down',
      responseTime: tmTime,
      lastCheck: new Date(),
      metadata: { statusCode: response.status }
    });
  } catch (error) {
    checks.push({
      service: 'Ticketmaster API',
      status: 'down',
      responseTime: Date.now() - tmStart,
      lastCheck: new Date(),
      metadata: { error: error.message }
    });
  }

  return checks;
}

async function checkAuthService(supabase: any): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Try to get current user (should work even if no user is authenticated)
    await supabase.auth.getUser();
    const responseTime = Date.now() - startTime;
    
    return {
      service: 'Authentication',
      status: responseTime < 200 ? 'healthy' : 'degraded',
      responseTime,
      uptime: 100,
      lastCheck: new Date()
    };
  } catch (error) {
    return {
      service: 'Authentication',
      status: 'down',
      responseTime: Date.now() - startTime,
      lastCheck: new Date(),
      metadata: { error: error.message }
    };
  }
}

async function getSystemMetrics() {
  // In a real implementation, these would come from actual monitoring tools
  // like CloudWatch, Datadog, New Relic, etc.
  return {
    cpuUsage: Math.floor(Math.random() * 50) + 20, // 20-70%
    memoryUsage: Math.floor(Math.random() * 40) + 30, // 30-70%
    diskUsage: Math.floor(Math.random() * 30) + 15, // 15-45%
    apiResponseTime: Math.floor(Math.random() * 100) + 100, // 100-200ms
    activeConnections: Math.floor(Math.random() * 50) + 20, // 20-70
    requestsPerMinute: Math.floor(Math.random() * 500) + 500, // 500-1000
    errorRate: (Math.random() * 0.05).toFixed(3), // 0-5%
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check admin authorization
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || (userData.role !== 'admin' && userData.role !== 'moderator')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Perform health checks in parallel
    const [
      databaseHealth,
      authHealth,
      externalAPIs,
      systemMetrics
    ] = await Promise.all([
      checkDatabaseHealth(supabase),
      checkAuthService(supabase),
      checkExternalAPIs(),
      getSystemMetrics()
    ]);

    const allServices = [databaseHealth, authHealth, ...externalAPIs];
    
    // Calculate overall system status
    const healthyServices = allServices.filter(s => s.status === 'healthy').length;
    const degradedServices = allServices.filter(s => s.status === 'degraded').length;
    const downServices = allServices.filter(s => s.status === 'down').length;

    let overallStatus: 'healthy' | 'degraded' | 'down';
    if (downServices > 0) {
      overallStatus = 'down';
    } else if (degradedServices > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    // Store health check results in database for historical tracking
    try {
      for (const service of allServices) {
        await supabase
          .from('system_health')
          .upsert({
            service_name: service.service,
            status: service.status,
            response_time: service.responseTime,
            metadata: service.metadata || {},
            last_check: service.lastCheck.toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'service_name'
          });
      }
    } catch (error) {
      console.error('Failed to store health check results:', error);
    }

    const healthReport = {
      overall: {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        summary: {
          total: allServices.length,
          healthy: healthyServices,
          degraded: degradedServices,
          down: downServices
        }
      },
      services: allServices,
      metrics: systemMetrics,
      alerts: [
        ...(degradedServices > 0 ? [{
          level: 'warning',
          message: `${degradedServices} service(s) experiencing degraded performance`,
          services: allServices.filter(s => s.status === 'degraded').map(s => s.service)
        }] : []),
        ...(downServices > 0 ? [{
          level: 'critical',
          message: `${downServices} service(s) are down`,
          services: allServices.filter(s => s.status === 'down').map(s => s.service)
        }] : [])
      ]
    };

    return NextResponse.json(healthReport);

  } catch (error) {
    console.error('Error in system health check:', error);
    return NextResponse.json(
      { error: 'Failed to perform health check' },
      { status: 500 }
    );
  }
}