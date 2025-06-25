import { NextRequest, NextResponse } from 'next/server';
import { TicketmasterClient, SpotifyClient } from '@repo/external-apis';
import { createClient } from '@supabase/supabase-js';

interface SearchFilters {
  dateFrom?: string;
  dateTo?: string;
  location?: string;
  genre?: string;
  priceMin?: number;
  priceMax?: number;
  radius?: number;
  sortBy?: 'relevance' | 'date' | 'popularity' | 'alphabetical';
}

interface SearchResult {
  id: string;
  type: 'artist' | 'show' | 'venue';
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  slug: string;
  verified?: boolean;
  popularity?: number;
  genres?: string[];
  showCount?: number;
  followerCount?: number;
  date?: string;
  venue?: {
    name: string;
    city: string;
    state: string;
  };
  artist?: {
    name: string;
    slug: string;
  };
  capacity?: number;
  price?: {
    min: number;
    max: number;
    currency: string;
  };
}

interface ComprehensiveSearchResponse {
  artists: SearchResult[];
  shows: SearchResult[];
  venues: SearchResult[];
  total: number;
  query: string;
  filters: SearchFilters;
  suggestions?: string[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '10');
  const category = searchParams.get('category') || 'all';
  
  // Extract filters
  const filters: SearchFilters = {
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    location: searchParams.get('location') || undefined,
    genre: searchParams.get('genre') || undefined,
    priceMin: searchParams.get('priceMin') ? parseInt(searchParams.get('priceMin')!) : undefined,
    priceMax: searchParams.get('priceMax') ? parseInt(searchParams.get('priceMax')!) : undefined,
    radius: searchParams.get('radius') ? parseInt(searchParams.get('radius')!) : undefined,
    sortBy: (searchParams.get('sortBy') as SearchFilters['sortBy']) || 'relevance',
  };

  if (!query || query.length < 2) {
    return NextResponse.json({ 
      artists: [], 
      shows: [], 
      venues: [], 
      total: 0, 
      query: '', 
      filters 
    });
  }

  try {
    console.log(`🔍 Comprehensive search for: "${query}" with filters:`, filters);
    
    // Use service role for database access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const ticketmasterClient = new TicketmasterClient({});
    
    let artists: SearchResult[] = [];
    let shows: SearchResult[] = [];
    let venues: SearchResult[] = [];

    // Search artists (from both local DB and Ticketmaster)
    if (category === 'all' || category === 'artists') {
      try {
        // Search local artists first
        let artistQuery = supabase
          .from('artists')
          .select('id, name, slug, image_url, popularity, genres, followers, external_ids')
          .ilike('name', `%${query}%`)
          .limit(limit);

        if (filters.genre) {
          artistQuery = artistQuery.ilike('genres', `%${filters.genre}%`);
        }

        const { data: localArtists } = await artistQuery;

        if (localArtists) {
          artists = localArtists.map(artist => ({
            id: artist.id,
            type: 'artist' as const,
            title: artist.name,
            subtitle: artist.genres || 'Artist',
            imageUrl: artist.image_url,
            slug: artist.slug,
            verified: true,
            popularity: artist.popularity || 50,
            genres: artist.genres ? [artist.genres] : [],
            followerCount: artist.followers || 0,
          }));
        }

        // If we need more results, search Ticketmaster
        if (artists.length < limit) {
          const tmResponse = await ticketmasterClient.searchAttractions({
            keyword: query,
            size: limit - artists.length,
            classificationName: 'Music',
            sort: filters.sortBy === 'relevance' ? 'relevance,desc' : 'name,asc',
            genreId: filters.genre || undefined,
          });

          if (tmResponse._embedded?.attractions) {
            const tmArtists = tmResponse._embedded.attractions.map(attraction => ({
              id: attraction.id,
              type: 'artist' as const,
              title: attraction.name,
              subtitle: attraction.classifications?.[0]?.genre?.name || 'Artist',
              imageUrl: attraction.images?.[0]?.url || null,
              slug: generateSlug(attraction.name),
              verified: false,
              genres: attraction.classifications?.map(c => c.genre?.name).filter(Boolean) || [],
            }));
            
            artists = [...artists, ...tmArtists];
          }
        }
      } catch (error) {
        console.error('Artist search error:', error);
      }
    }

    // Search shows
    if (category === 'all' || category === 'shows') {
      try {
        let showQuery = supabase
          .from('shows')
          .select(`
            id,
            slug,
            name,
            date,
            status,
            ticketmaster_url,
            artist:artists(name, slug),
            venue:venues(name, slug, city, state)
          `)
          .or(`name.ilike.%${query}%,artists.name.ilike.%${query}%`)
          .eq('status', 'confirmed')
          .limit(limit);

        if (filters.dateFrom) {
          showQuery = showQuery.gte('date', filters.dateFrom);
        }
        if (filters.dateTo) {
          showQuery = showQuery.lte('date', filters.dateTo);
        }
        if (filters.location) {
          showQuery = showQuery.or(`venues.city.ilike.%${filters.location}%,venues.state.ilike.%${filters.location}%`);
        }

        const { data: localShows } = await showQuery;

        if (localShows) {
          shows = localShows.map(show => ({
            id: show.id,
            type: 'show' as const,
            title: show.name || `${show.artist?.name} Concert`,
            subtitle: `${show.venue?.name} • ${show.venue?.city}, ${show.venue?.state}`,
            slug: show.slug,
            verified: true,
            date: show.date,
            venue: show.venue ? {
              name: show.venue.name,
              city: show.venue.city,
              state: show.venue.state,
            } : undefined,
            artist: show.artist ? {
              name: show.artist.name,
              slug: show.artist.slug,
            } : undefined,
          }));
        }

        // Search Ticketmaster for additional shows
        if (shows.length < limit) {
          try {
            const tmEventsResponse = await ticketmasterClient.searchEvents({
              keyword: query,
              size: limit - shows.length,
              classificationName: 'Music',
              sort: filters.sortBy === 'date' ? 'date,asc' : 'relevance,desc',
              startDateTime: filters.dateFrom ? `${filters.dateFrom}T00:00:00Z` : undefined,
              endDateTime: filters.dateTo ? `${filters.dateTo}T23:59:59Z` : undefined,
              city: filters.location || undefined,
              radius: filters.radius || undefined,
            });

            if (tmEventsResponse._embedded?.events) {
              const tmShows = tmEventsResponse._embedded.events.map(event => ({
                id: event.id,
                type: 'show' as const,
                title: event.name,
                subtitle: `${event._embedded?.venues?.[0]?.name} • ${event._embedded?.venues?.[0]?.city?.name}`,
                slug: generateSlug(event.name),
                verified: false,
                date: event.dates?.start?.localDate,
                imageUrl: event.images?.[0]?.url,
                venue: event._embedded?.venues?.[0] ? {
                  name: event._embedded.venues[0].name,
                  city: event._embedded.venues[0].city?.name || '',
                  state: event._embedded.venues[0].state?.stateCode || '',
                } : undefined,
                price: event.priceRanges?.[0] ? {
                  min: event.priceRanges[0].min,
                  max: event.priceRanges[0].max,
                  currency: event.priceRanges[0].currency,
                } : undefined,
              }));
              
              shows = [...shows, ...tmShows];
            }
          } catch (tmError) {
            console.error('Ticketmaster events search error:', tmError);
          }
        }
      } catch (error) {
        console.error('Shows search error:', error);
      }
    }

    // Search venues
    if (category === 'all' || category === 'venues') {
      try {
        let venueQuery = supabase
          .from('venues')
          .select('id, name, slug, city, state, capacity, show_count')
          .or(`name.ilike.%${query}%,city.ilike.%${query}%`)
          .limit(limit);

        if (filters.location) {
          venueQuery = venueQuery.or(`city.ilike.%${filters.location}%,state.ilike.%${filters.location}%`);
        }

        const { data: localVenues } = await venueQuery;

        if (localVenues) {
          venues = localVenues.map(venue => ({
            id: venue.id,
            type: 'venue' as const,
            title: venue.name,
            subtitle: `${venue.city}, ${venue.state}`,
            slug: venue.slug,
            verified: true,
            capacity: venue.capacity,
            showCount: venue.show_count,
          }));
        }

        // Search Ticketmaster for additional venues
        if (venues.length < limit) {
          try {
            const tmVenuesResponse = await ticketmasterClient.searchVenues({
              keyword: query,
              size: limit - venues.length,
              sort: 'name,asc',
              city: filters.location || undefined,
            });

            if (tmVenuesResponse._embedded?.venues) {
              const tmVenues = tmVenuesResponse._embedded.venues.map(venue => ({
                id: venue.id,
                type: 'venue' as const,
                title: venue.name,
                subtitle: `${venue.city?.name}, ${venue.state?.stateCode}`,
                slug: generateSlug(venue.name),
                verified: false,
                capacity: venue.capacity || undefined,
              }));
              
              venues = [...venues, ...tmVenues];
            }
          } catch (tmError) {
            console.error('Ticketmaster venues search error:', tmError);
          }
        }
      } catch (error) {
        console.error('Venues search error:', error);
      }
    }

    // Apply sorting
    const sortResults = (results: SearchResult[]) => {
      switch (filters.sortBy) {
        case 'alphabetical':
          return results.sort((a, b) => a.title.localeCompare(b.title));
        case 'popularity':
          return results.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        case 'date':
          return results.sort((a, b) => {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          });
        default:
          return results; // relevance is default from search
      }
    };

    artists = sortResults(artists).slice(0, limit);
    shows = sortResults(shows).slice(0, limit);
    venues = sortResults(venues).slice(0, limit);

    // Generate search suggestions
    const suggestions = generateSearchSuggestions(query, artists, shows, venues);

    const response: ComprehensiveSearchResponse = {
      artists,
      shows,
      venues,
      total: artists.length + shows.length + venues.length,
      query,
      filters,
      suggestions,
    };

    console.log(`✅ Found ${response.total} results for "${query}"`);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Comprehensive search failed:', error);
    return NextResponse.json({ 
      artists: [],
      shows: [],
      venues: [],
      total: 0,
      query,
      filters,
      error: 'Search failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function generateSearchSuggestions(
  query: string, 
  artists: SearchResult[], 
  shows: SearchResult[], 
  venues: SearchResult[]
): string[] {
  const suggestions: string[] = [];
  
  // Add similar artist names
  artists.forEach(artist => {
    if (artist.title.toLowerCase() !== query.toLowerCase()) {
      suggestions.push(artist.title);
    }
    // Add genres as suggestions
    artist.genres?.forEach(genre => {
      if (genre.toLowerCase().includes(query.toLowerCase()) && !suggestions.includes(genre)) {
        suggestions.push(genre);
      }
    });
  });
  
  // Add venue cities as location suggestions
  venues.forEach(venue => {
    const location = venue.subtitle;
    if (location && !suggestions.includes(location)) {
      suggestions.push(location);
    }
  });
  
  // Add show-based suggestions
  shows.forEach(show => {
    if (show.venue?.city && !suggestions.some(s => s.includes(show.venue!.city))) {
      suggestions.push(`${show.venue.city}, ${show.venue.state}`);
    }
  });
  
  // Return unique suggestions, limited to 5
  return [...new Set(suggestions)].slice(0, 5);
}