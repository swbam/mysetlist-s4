import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '~/lib/supabase/server';
import { TicketmasterClient } from '@repo/external-apis';

const ticketmaster = new TicketmasterClient();

interface SearchResult {
  id: string;
  type: 'artist' | 'show' | 'venue' | 'song';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  slug?: string;
  verified?: boolean;
  popularity?: number;
  source: 'database' | 'ticketmaster';
  date?: string;
  location?: string;
  artistName?: string;
  venueName?: string;
  ticketmasterId?: string;
  externalUrls?: any;
  requiresSync?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = Number.parseInt(searchParams.get('limit') || '8', 10);
    const types = searchParams.get('types')?.split(',') || ['artist', 'show', 'venue', 'song'];
    const location = searchParams.get('location') || '';
    const genre = searchParams.get('genre') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    let supabase;
    try {
      supabase = await createClient();
    } catch (error) {
      console.error('Failed to create Supabase client:', error);
      return NextResponse.json({ 
        error: 'Database connection failed',
        message: 'Unable to connect to the database'
      }, { status: 500 });
    }
    const results: SearchResult[] = [];

    // Search Artists
    if (types.includes('artist')) {
      const { data: artists } = await supabase
        .from('artists')
        .select('id, name, slug, image_url, genres, verified, popularity')
        .ilike('name', `%${query}%`)
        .order('popularity', { ascending: false })
        .limit(Math.min(limit, 3));

      if (artists) {
        results.push(
          ...artists.map((artist): SearchResult => ({
            id: artist.id,
            type: 'artist',
            title: artist.name,
            subtitle: artist.genres && Array.isArray(artist.genres) ? artist.genres.slice(0, 2).join(', ') : 'Artist',
            imageUrl: artist.image_url,
            slug: artist.slug,
            verified: artist.verified,
            popularity: artist.popularity,
            source: 'database',
          }))
        );
      }

      // Add Ticketmaster artists
      if (results.length < limit) {
        try {
          const ticketmasterResponse = await ticketmaster.searchAttractions({
            keyword: query,
            size: limit - results.length,
            classificationName: ['music'],
            sort: 'relevance,desc'
          });
          const ticketmasterArtists = ticketmasterResponse._embedded?.attractions || [];
          
          for (const attraction of ticketmasterArtists) {
            const existsInResults = results.some(r => 
              r.title.toLowerCase() === attraction.name.toLowerCase()
            );
            
            if (!existsInResults) {
              results.push({
                id: attraction.id,
                type: 'artist',
                title: attraction.name,
                subtitle: attraction.classifications?.[0]?.genre?.name || 'Artist',
                imageUrl: attraction.images?.[0]?.url || null,
                slug: null,
                verified: false,
                popularity: 0,
                source: 'ticketmaster',
                ticketmasterId: attraction.id,
                externalUrls: attraction.externalLinks,
                requiresSync: true,
              });
            }
          }
        } catch (error) {
          console.warn('Ticketmaster search failed:', error);
        }
      }
    }

    // Search Shows
    if (types.includes('show')) {
      let showsQuery = supabase
        .from('shows')
        .select(`
          id,
          slug,
          show_date,
          name,
          status,
          artists!inner(id, name, image_url),
          venues!inner(id, name, city, state, country)
        `)
        .or(`name.ilike.%${query}%,artists.name.ilike.%${query}%`)
        .eq('status', 'upcoming')
        .order('show_date', { ascending: true })
        .limit(Math.min(limit, 3));

      // Apply date filters
      if (dateFrom) {
        showsQuery = showsQuery.gte('show_date', dateFrom);
      }
      if (dateTo) {
        showsQuery = showsQuery.lte('show_date', dateTo);
      }

      // Apply location filter
      if (location) {
        showsQuery = showsQuery.or(`venues.city.ilike.%${location}%,venues.state.ilike.%${location}%,venues.country.ilike.%${location}%`);
      }

      const { data: shows } = await showsQuery;

      if (shows) {
        results.push(
          ...shows.map((show): SearchResult => {
            const artist = Array.isArray(show.artists) ? show.artists[0] : show.artists;
            const venue = Array.isArray(show.venues) ? show.venues[0] : show.venues;
            return {
              id: show.id,
              type: 'show',
              title: show.name || `${artist?.name} Live`,
              subtitle: `${venue?.name}, ${venue?.city} • ${new Date(show.show_date).toLocaleDateString()}`,
              imageUrl: artist?.image_url,
              slug: show.slug,
              date: show.show_date,
              artistName: artist?.name,
              venueName: venue?.name,
              location: `${venue?.city}, ${venue?.state || venue?.country}`,
              source: 'database',
            };
          })
        );
      }
    }

    // Search Venues
    if (types.includes('venue')) {
      let venuesQuery = supabase
        .from('venues')
        .select('id, slug, name, city, state, country, capacity')
        .or(`name.ilike.%${query}%,city.ilike.%${query}%`)
        .order('capacity', { ascending: false })
        .limit(Math.min(limit, 2));

      // Apply location filter
      if (location) {
        venuesQuery = venuesQuery.or(`city.ilike.%${location}%,state.ilike.%${location}%,country.ilike.%${location}%`);
      }

      const { data: venues } = await venuesQuery;

      if (venues) {
        results.push(
          ...venues.map((venue): SearchResult => ({
            id: venue.id,
            type: 'venue',
            title: venue.name,
            subtitle: `${venue.city}, ${venue.state || venue.country}${venue.capacity ? ` • Capacity: ${venue.capacity}` : ''}`,
            slug: venue.slug,
            location: `${venue.city}, ${venue.state || venue.country}`,
            source: 'database',
          }))
        );
      }
    }

    // Search Songs
    if (types.includes('song')) {
      const { data: songs } = await supabase
        .from('songs')
        .select(`
          id,
          title,
          artists!inner(id, name, image_url)
        `)
        .or(`title.ilike.%${query}%,artists.name.ilike.%${query}%`)
        .order('popularity', { ascending: false })
        .limit(Math.min(limit, 2));

      if (songs) {
        results.push(
          ...songs.map((song): SearchResult => {
            const artist = Array.isArray(song.artists) ? song.artists[0] : song.artists;
            return {
              id: song.id,
              type: 'song',
              title: song.title,
              subtitle: `by ${artist?.name}`,
              imageUrl: artist?.image_url,
              artistName: artist?.name,
              source: 'database',
            };
          })
        );
      }
    }

    // Sort results by relevance and type priority
    const sortedResults = results.sort((a, b) => {
      // Type priority: artists first, then shows, venues, songs
      const typePriority = { artist: 4, show: 3, venue: 2, song: 1 };
      const aPriority = typePriority[a.type] || 0;
      const bPriority = typePriority[b.type] || 0;
      
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      // Verified/database results first
      if (a.verified && !b.verified) return -1;
      if (!a.verified && b.verified) return 1;
      
      // Exact match
      const aExact = a.title.toLowerCase() === query.toLowerCase() ? 1 : 0;
      const bExact = b.title.toLowerCase() === query.toLowerCase() ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      
      // Popularity
      return (b.popularity || 0) - (a.popularity || 0);
    });

    return NextResponse.json({ 
      results: sortedResults.slice(0, limit),
      total: sortedResults.length,
      query,
      filters: {
        types,
        location,
        genre,
        dateFrom,
        dateTo,
      },
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
