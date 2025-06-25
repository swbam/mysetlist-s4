import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TicketmasterClient } from '@repo/external-apis';

interface SearchSuggestion {
  id: string;
  type: 'artist' | 'show' | 'venue' | 'genre' | 'location' | 'trending';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  metadata?: {
    popularity?: number;
    upcomingShows?: number;
    followerCount?: number;
    capacity?: number;
    showDate?: string;
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '8');

  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const supabase = createClient();
    const suggestions: SearchSuggestion[] = [];

    // Search artists
    const { data: artists } = await supabase
      .from('artists')
      .select('id, name, slug, image_url, popularity, followers')
      .ilike('name', `%${query}%`)
      .order('popularity', { ascending: false })
      .limit(3);

    if (artists) {
      artists.forEach(artist => {
        suggestions.push({
          id: `artist-${artist.id}`,
          type: 'artist',
          title: artist.name,
          subtitle: 'Artist',
          imageUrl: artist.image_url,
          metadata: {
            popularity: artist.popularity,
            followerCount: artist.followers,
          },
        });
      });
    }

    // Search shows
    const { data: shows } = await supabase
      .from('shows')
      .select(`
        id,
        slug,
        name,
        date,
        artist:artists(name),
        venue:venues(name, city, state)
      `)
      .or(`name.ilike.%${query}%,artists.name.ilike.%${query}%`)
      .eq('status', 'confirmed')
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(2);

    if (shows) {
      shows.forEach(show => {
        suggestions.push({
          id: `show-${show.id}`,
          type: 'show',
          title: show.name || `${show.artist?.name} Concert`,
          subtitle: `${show.venue?.name} • ${show.venue?.city}, ${show.venue?.state}`,
          metadata: {
            showDate: new Date(show.date).toLocaleDateString(),
          },
        });
      });
    }

    // Search venues
    const { data: venues } = await supabase
      .from('venues')
      .select('id, name, slug, city, state, capacity')
      .or(`name.ilike.%${query}%,city.ilike.%${query}%`)
      .limit(2);

    if (venues) {
      venues.forEach(venue => {
        suggestions.push({
          id: `venue-${venue.id}`,
          type: 'venue',
          title: venue.name,
          subtitle: `${venue.city}, ${venue.state}`,
          metadata: {
            capacity: venue.capacity,
          },
        });
      });
    }

    // Add popular genres that match
    const POPULAR_GENRES = [
      'Rock', 'Pop', 'Hip-Hop', 'Electronic', 'Jazz', 'Blues', 'Country', 
      'Classical', 'Folk', 'Reggae', 'Metal', 'Punk', 'R&B', 'Soul',
      'Alternative', 'Indie', 'World', 'Latin', 'Funk', 'Gospel'
    ];

    const matchingGenres = POPULAR_GENRES.filter(genre => 
      genre.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 2);

    matchingGenres.forEach((genre, index) => {
      suggestions.push({
        id: `genre-${index}`,
        type: 'genre',
        title: genre,
        subtitle: 'Music genre',
      });
    });

    // Add trending suggestions if we have few results
    if (suggestions.length < limit) {
      try {
        const trendingResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/trending?limit=3&type=combined`,
          { 
            headers: { 'User-Agent': 'MySetlist/1.0' },
            next: { revalidate: 300 } // Cache for 5 minutes
          }
        );

        if (trendingResponse.ok) {
          const trendingData = await trendingResponse.json();
          const trending = trendingData.data?.slice(0, 2) || [];

          trending.forEach((item: any) => {
            if (item.name.toLowerCase().includes(query.toLowerCase())) {
              suggestions.push({
                id: `trending-${item.id}`,
                type: 'trending',
                title: item.name,
                subtitle: `Trending ${item.type}`,
                imageUrl: item.image_url,
                metadata: {
                  popularity: item.score,
                },
              });
            }
          });
        }
      } catch (error) {
        console.error('Failed to fetch trending suggestions:', error);
      }
    }

    // Sort suggestions by relevance (exact matches first, then by popularity/score)
    suggestions.sort((a, b) => {
      const aExact = a.title.toLowerCase() === query.toLowerCase();
      const bExact = b.title.toLowerCase() === query.toLowerCase();
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      const aStarts = a.title.toLowerCase().startsWith(query.toLowerCase());
      const bStarts = b.title.toLowerCase().startsWith(query.toLowerCase());
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      // Sort by popularity/score within same relevance level
      const aScore = a.metadata?.popularity || 0;
      const bScore = b.metadata?.popularity || 0;
      return bScore - aScore;
    });

    return NextResponse.json({ 
      suggestions: suggestions.slice(0, limit),
      query 
    });
  } catch (error) {
    console.error('Search suggestions failed:', error);
    return NextResponse.json({ 
      suggestions: [],
      error: 'Failed to fetch suggestions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}