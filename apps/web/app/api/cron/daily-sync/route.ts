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
    
    // Call Supabase edge function for scheduled sync
    const { data, error } = await supabase.functions.invoke('scheduled-sync', {
      body: { type: 'daily' }
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Daily sync completed',
      timestamp: new Date().toISOString(),
      results: data
    });
  } catch (error) {
    console.error('Daily sync cron error:', error);
    return NextResponse.json(
      { error: 'Daily sync failed', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}