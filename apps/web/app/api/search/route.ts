import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '~/lib/supabase/server';
import { TicketmasterClient } from '@repo/external-apis';

// Initialize Ticketmaster client lazily to avoid errors when API key is missing
let ticketmaster: TicketmasterClient | null = null;

function getTicketmasterClient() {
  if (!ticketmaster && process.env.TICKETMASTER_API_KEY) {
    try {
      ticketmaster = new TicketmasterClient({});
    } catch (error) {
      console.error('Failed to initialize Ticketmaster client:', error);
    }
  }
  return ticketmaster;
}

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
      // Fallback to admin client for server-side requests
      try {
        const { createSupabaseAdminClient } = await import('@repo/database');
        supabase = createSupabaseAdminClient();
      } catch (fallbackError) {
        console.error('Fallback client also failed:', fallbackError);
        return NextResponse.json({ 
          error: 'Database connection failed',
          message: 'Unable to connect to the database'
        }, { status: 500 });
      }
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

      // Add Ticketmaster artists only if API key is available
      const ticketmasterClient = getTicketmasterClient();
      if (results.length < limit && ticketmasterClient) {
        try {
          const ticketmasterResponse = await ticketmasterClient.searchAttractions({
            keyword: query,
            size: limit - results.length,
            classificationName: ['music'],
            sort: 'relevance,desc'
          });
          const ticketmasterArtists = ticketmasterResponse?._embedded?.attractions || [];
          
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
          headliner_artist_id,
          venue_id
        `)
        .ilike('name', `%${query}%`)
        .order('show_date', { ascending: true })
        .limit(Math.min(limit, 3));

      // Apply date filters
      if (dateFrom) {
        showsQuery = showsQuery.gte('show_date', dateFrom);
      }
      if (dateTo) {
        showsQuery = showsQuery.lte('show_date', dateTo);
      }

      // Apply location filter - simplified for now
      // TODO: Implement location filter with venue join

      const { data: shows, error: showsError } = await showsQuery;

      if (showsError) {
        console.warn('Shows search error:', showsError);
      }

      if (shows && shows.length > 0) {
        // Fetch artist and venue details for the shows
        const artistIds = [...new Set(shows.map(s => s.headliner_artist_id).filter(Boolean))];
        const venueIds = [...new Set(shows.map(s => s.venue_id).filter(Boolean))];
        
        const [artistsData, venuesData] = await Promise.all([
          artistIds.length > 0 ? supabase.from('artists').select('id, name, image_url').in('id', artistIds) : { data: [] },
          venueIds.length > 0 ? supabase.from('venues').select('id, name, city, state, country').in('id', venueIds) : { data: [] }
        ]);
        
        const artistsMap = new Map((artistsData.data || []).map(a => [a.id, a]));
        const venuesMap = new Map((venuesData.data || []).map(v => [v.id, v]));
        
        results.push(
          ...shows.map((show): SearchResult => {
            const artist = show.headliner_artist_id ? artistsMap.get(show.headliner_artist_id) : null;
            const venue = show.venue_id ? venuesMap.get(show.venue_id) : null;
            return {
              id: show.id,
              type: 'show',
              title: show.name || (artist ? `${artist.name} Live` : 'Unknown Show'),
              subtitle: venue ? `${venue.name}, ${venue.city} • ${new Date(show.show_date).toLocaleDateString()}` : new Date(show.show_date).toLocaleDateString(),
              imageUrl: artist?.image_url,
              slug: show.slug,
              date: show.show_date,
              artistName: artist?.name,
              venueName: venue?.name,
              location: venue ? `${venue.city}, ${venue.state || venue.country}` : 'Unknown Location',
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

      const { data: venues, error: venuesError } = await venuesQuery;

      if (venuesError) {
        console.warn('Venues search error:', venuesError);
      }

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
      const { data: songs, error: songsError } = await supabase
        .from('songs')
        .select(`
          id,
          title,
          artist,
          album,
          spotify_id,
          duration_ms,
          popularity
        `)
        .ilike('title', `%${query}%`)
        .order('popularity', { ascending: false })
        .limit(Math.min(limit, 2));

      if (songsError) {
        console.warn('Songs search error:', songsError);
      }

      if (songs) {
        results.push(
          ...songs.map((song): SearchResult => {
            return {
              id: song.id,
              type: 'song',
              title: song.title,
              subtitle: song.artist ? `by ${song.artist}` : 'Unknown Artist',
              imageUrl: undefined,
              artistName: song.artist || 'Unknown Artist',
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
    // Return empty results instead of error to prevent UI issues
    return NextResponse.json({ 
      results: [],
      error: 'Search temporarily unavailable',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 }); // Return 200 with empty results to prevent client errors
  }
}
