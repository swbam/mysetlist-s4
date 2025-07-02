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
    
    // Call Supabase edge function for trending update
    const { data, error } = await supabase.functions.invoke('update-trending', {
      body: {}
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Trending scores updated',
      timestamp: new Date().toISOString(),
      results: data
    });
  } catch (error) {
    console.error('Trending update cron error:', error);
    return NextResponse.json(
      { error: 'Trending update failed', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}