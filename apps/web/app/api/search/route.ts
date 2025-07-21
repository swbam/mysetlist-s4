import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '~/lib/supabase/server';
import { TicketmasterClient } from '@repo/external-apis';

const ticketmaster = new TicketmasterClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = Number.parseInt(searchParams.get('limit') || '8', 10);

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const supabase = createServiceClient();
    const results: any[] = [];

    // First, search existing artists in database for instant results
    const { data: existingArtists } = await supabase
      .from('artists')
      .select('id, name, slug, image_url, genres, verified, popularity')
      .ilike('name', `%${query}%`)
      .eq('verified', true)
      .order('popularity', { ascending: false })
      .limit(Math.min(limit, 5));

    if (existingArtists) {
      results.push(
        ...existingArtists.map((artist) => ({
          id: artist.id,
          type: 'artist' as const,
          title: artist.name,
          subtitle: artist.genres ? JSON.parse(artist.genres).slice(0, 2).join(', ') : 'Artist',
          imageUrl: artist.image_url,
          slug: artist.slug,
          verified: true,
          popularity: artist.popularity,
          source: 'database',
        }))
      );
    }

    // Then search Ticketmaster for additional artists
    const ticketmasterResponse = await ticketmaster.searchAttractions({
      keyword: query,
      size: limit - results.length,
      classificationName: ['music'],
      sort: 'relevance,desc'
    });
    const ticketmasterArtists = ticketmasterResponse._embedded?.attractions || [];
    
    for (const attraction of ticketmasterArtists) {
      // Skip if we already have this artist
      const existsInResults = results.some(r => 
        r.title.toLowerCase() === attraction.name.toLowerCase()
      );
      
      if (!existsInResults) {
        results.push({
          id: attraction.id,
          type: 'artist' as const,
          title: attraction.name,
          subtitle: attraction.classifications?.[0]?.genre?.name || 'Artist',
          imageUrl: attraction.images?.[0]?.url || null,
          slug: null, // Will be generated on import
          verified: false,
          popularity: 0,
          source: 'ticketmaster',
          ticketmasterId: attraction.id,
          externalUrls: attraction.externalLinks,
        });
      }
    }

    // Sort results: verified database artists first, then by relevance
    const sortedResults = results.sort((a, b) => {
      // Verified artists first
      if (a.verified && !b.verified) return -1;
      if (!a.verified && b.verified) return 1;
      
      // Then by exact match
      const aExact = a.title.toLowerCase() === query.toLowerCase() ? 1 : 0;
      const bExact = b.title.toLowerCase() === query.toLowerCase() ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      
      // Then by popularity for database artists
      if (a.source === 'database' && b.source === 'database') {
        return (b.popularity || 0) - (a.popularity || 0);
      }
      
      return 0;
    });

    return NextResponse.json({ 
      results: sortedResults.slice(0, limit),
      total: sortedResults.length,
      query,
      searchType: 'artist-only',
      sources: {
        database: results.filter(r => r.source === 'database').length,
        ticketmaster: results.filter(r => r.source === 'ticketmaster').length,
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ 
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
