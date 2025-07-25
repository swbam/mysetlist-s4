import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '~/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.toLowerCase().trim();
    const limit = Number.parseInt(searchParams.get('limit') || '8');

    if (!query || query.length < 2) {
      return NextResponse.json({
        suggestions: [],
        count: 0,
      });
    }

    const supabase = createServiceClient();

    // ARTIST-ONLY SEARCH as per PRD requirements
    // Core flow: Search artists → Click artist → Triggers data sync → View shows
    const { data: artists, error } = await supabase
      .from('artists')
      .select(`
        id,
        name,
        image_url,
        small_image_url,
        slug,
        followers,
        genres,
        verified
      `)
      .or(`name.ilike.%${query}%,genres.ilike.%${query}%`)
      .order('followers', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({
        suggestions: [],
        count: 0,
      });
    }

    const suggestions = (artists || []).map((artist: any) => ({
      type: 'artist' as const,
      id: artist.id,
      title: artist.name,
      subtitle: artist.genres
        ? JSON.parse(artist.genres).slice(0, 2).join(', ')
        : undefined,
      href: `/artists/${artist.slug}`,
      imageUrl: artist.small_image_url || artist.image_url,
      meta: `${artist.followers?.toLocaleString() || 0} followers`,
      verified: artist.verified,
      // This will trigger data sync when clicked
      requiresSync: true,
    }));

    return NextResponse.json({
      suggestions,
      count: suggestions.length,
      searchType: 'artists-only',
    });
  } catch (_error) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
