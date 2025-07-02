import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient();
    
    // Call Supabase edge function for health check
    const { data, error } = await supabase.functions.invoke('health-check', {
      body: {}
    });

    if (error) {
      throw error;
    }

    // If health check indicates issues, trigger alerts
    if (data?.status === 'unhealthy') {
      await triggerHealthAlert(supabase, data);
    }

    return NextResponse.json({
      success: true,
      message: 'Health check completed',
      timestamp: new Date().toISOString(),
      health: data
    });
  } catch (error) {
    console.error('Health check cron error:', error);
    
    // Trigger critical alert for health check failure
    try {
      const supabase = createClient();
      await triggerHealthAlert(supabase, {
        status: 'critical',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } catch (alertError) {
      console.error('Error triggering health alert:', alertError);
    }

    return NextResponse.json(
      { error: 'Health check failed', details: error.message },
      { status: 500 }
    );
  }
}

async function triggerHealthAlert(supabase: any, healthData: any) {
  try {
    // Log health issue
    await supabase
      .from('health_alerts')
      .insert({
        alert_type: healthData.status === 'critical' ? 'critical' : 'warning',
        message: `System health check failed: ${healthData.status}`,
        details: healthData,
        created_at: new Date().toISOString(),
        resolved: false
      });

    // If we have email notifications setup, send alert
    if (process.env.RESEND_API_KEY && healthData.status === 'critical') {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'alerts@mysetlist.app',
          to: 'admin@mysetlist.app',
          subject: 'MySetlist Critical Health Alert',
          html: `
            <h2>Critical System Health Alert</h2>
            <p>MySetlist system health check has failed.</p>
            <p><strong>Status:</strong> ${healthData.status}</p>
            <p><strong>Time:</strong> ${healthData.timestamp}</p>
            <p><strong>Details:</strong> ${JSON.stringify(healthData, null, 2)}</p>
            <p>Please investigate immediately.</p>
          `,
        }),
      });
    }
  } catch (error) {
    console.error('Error triggering health alert:', error);
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}