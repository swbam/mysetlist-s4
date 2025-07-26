import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@repo/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || 'taylor';

    const supabase = createSupabaseAdminClient();
    
    const { data: artists, error } = await supabase
      .from('artists')
      .select('id, name, slug, image_url')
      .ilike('name', `%${query}%`)
      .limit(5);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      query,
      artists: artists || [],
      total: artists?.length || 0
    });
  } catch (error) {
    console.error('Test search error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      artists: [],
      total: 0
    }, { status: 500 });
  }
}