import { createServiceClient } from '~/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createServiceClient();
    
    // Simple test query
    const { data, error } = await supabase
      .from('artists')
      .select('id, name')
      .limit(1);
    
    if (error) {
      return NextResponse.json({
        success: false,
        message: 'Supabase query failed',
        error: error.message,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Supabase connection works',
      data,
    });
  } catch (error) {
    console.error('Supabase test error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Supabase connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}