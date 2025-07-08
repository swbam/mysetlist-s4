import { createServiceClient } from '@/lib/api/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const CRON_SECRET = process.env['CRON_SECRET'];

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    // Call Supabase edge function for database backup
    const { data, error } = await supabase.functions.invoke('backup-database', {
      body: {
        type: 'incremental',
        format: 'json',
      },
    });

    if (error) {
      throw error;
    }

    // Log backup completion
    const { error: logError } = await supabase.from('backup_logs').insert({
      backup_type: 'incremental',
      status: 'completed',
      record_count: data?.metadata?.recordCount || 0,
      backup_size_mb: data?.metadata?.size || 0,
      created_at: new Date().toISOString(),
    });

    if (logError) {
      console.error('Error logging backup:', logError);
    }

    return NextResponse.json({
      success: true,
      message: 'Weekly backup completed',
      timestamp: new Date().toISOString(),
      backup: {
        type: 'incremental',
        recordCount: data?.metadata?.recordCount || 0,
        tables: data?.metadata?.tables || [],
      },
    });
  } catch (error) {
    console.error('Backup cron error:', error);

    // Log backup failure
    try {
      const supabase = await createServiceClient();
      await supabase.from('backup_logs').insert({
        backup_type: 'incremental',
        status: 'failed',
        error_message: error instanceof Error ? error.message : String(error),
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Error logging backup failure:', logError);
    }

    return NextResponse.json(
      {
        error: 'Backup failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
