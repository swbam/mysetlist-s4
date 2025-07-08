import { db } from '@repo/database';
import { sendEmailNotification } from '@/actions/email-notifications';
import { type NextRequest, NextResponse } from 'next/server';

const CRON_SECRET = process.env['CRON_SECRET'];

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  database: { status: string; responseTime?: number; error?: string };
  api: { status: string; responseTime?: number; error?: string };
  timestamp: string;
}

async function checkDatabaseHealth() {
  const startTime = Date.now();
  try {
    // Simple database query to check connectivity
    await db.execute('SELECT 1');
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

async function checkApiHealth() {
  const startTime = Date.now();
  try {
    // Check if API endpoints are responsive
    const response = await fetch(`${process.env['NEXT_PUBLIC_APP_URL']}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return {
        status: 'healthy',
        responseTime,
      };
    } else {
      return {
        status: 'degraded',
        responseTime,
        error: `API returned status ${response.status}`,
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown API error',
    };
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🏥 Starting health check...');
    
    // Run health checks
    const [databaseHealth, apiHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkApiHealth(),
    ]);
    
    // Determine overall health status
    let overallStatus: HealthCheckResult['status'] = 'healthy';
    
    if (databaseHealth.status === 'unhealthy' || apiHealth.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (databaseHealth.status === 'degraded' || apiHealth.status === 'degraded') {
      overallStatus = 'degraded';
    }
    
    const healthData: HealthCheckResult = {
      status: overallStatus,
      database: databaseHealth,
      api: apiHealth,
      timestamp: new Date().toISOString(),
    };
    
    // Trigger alerts if unhealthy
    if (overallStatus === 'unhealthy' || overallStatus === 'critical') {
      await triggerHealthAlert(healthData);
    }
    
    console.log('✅ Health check completed:', healthData);
    
    return NextResponse.json({
      success: true,
      message: 'Health check completed',
      ...healthData,
    });
  } catch (error) {
    console.error('Health check cron error:', error);
    
    // Trigger critical alert
    const criticalHealth: HealthCheckResult = {
      status: 'critical',
      database: { status: 'unknown', error: 'Health check failed' },
      api: { status: 'unknown', error: 'Health check failed' },
      timestamp: new Date().toISOString(),
    };
    
    await triggerHealthAlert(criticalHealth);
    
    return NextResponse.json(
      {
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function triggerHealthAlert(healthData: HealthCheckResult) {
  try {
    // Log health issue to console
    console.error('🚨 Health Alert:', healthData);

    // If we have email notifications setup, send alert
    if (process.env['RESEND_TOKEN'] && (healthData.status === 'critical' || healthData.status === 'unhealthy')) {
      const adminEmail = process.env['ADMIN_EMAIL'] || 'admin@mysetlist.app';
      
      await sendEmailNotification({
        to: adminEmail,
        subject: `MySetlist ${healthData.status === 'critical' ? 'CRITICAL' : 'Health'} Alert`,
        content: `
          <h2>${healthData.status === 'critical' ? 'Critical' : 'System'} Health Alert</h2>
          <p>MySetlist system health check has detected issues.</p>
          
          <h3>Status: ${healthData.status.toUpperCase()}</h3>
          
          <h3>Database Health:</h3>
          <ul>
            <li>Status: ${healthData.database.status}</li>
            ${healthData.database.responseTime ? `<li>Response Time: ${healthData.database.responseTime}ms</li>` : ''}
            ${healthData.database.error ? `<li>Error: ${healthData.database.error}</li>` : ''}
          </ul>
          
          <h3>API Health:</h3>
          <ul>
            <li>Status: ${healthData.api.status}</li>
            ${healthData.api.responseTime ? `<li>Response Time: ${healthData.api.responseTime}ms</li>` : ''}
            ${healthData.api.error ? `<li>Error: ${healthData.api.error}</li>` : ''}
          </ul>
          
          <p><strong>Time:</strong> ${healthData.timestamp}</p>
          <p>Please investigate immediately.</p>
        `,
      });
    }
  } catch (error) {
    console.error('Error triggering health alert:', error);
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
