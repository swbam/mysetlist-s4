import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '~/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = Number.parseInt(searchParams.get('limit') || '10', 10);

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const supabase = createServiceClient();

    // Search artists only (as per PRD requirements)
    const { data: artists } = await supabase
      .from('artists')
      .select('id, name, slug, image_url, genres')
      .ilike('name', `%${query}%`)
      .limit(limit);

    // Format results - artists only
    const results = [];

    if (artists) {
      results.push(
        ...artists.map((artist) => ({
          id: artist.id,
          type: 'artist' as const,
          title: artist.name,
          subtitle: artist.genres?.join(', '),
          imageUrl: artist.image_url,
          slug: artist.slug || artist.id,
        }))
      );
    }

    return NextResponse.json({ results });
  } catch (_error) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
