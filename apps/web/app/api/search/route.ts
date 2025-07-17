import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '~/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = Number.parseInt(searchParams.get('limit') || '10', 10);
    const type = searchParams.get('type') || 'all';
    const location = searchParams.get('location');
    const genre = searchParams.get('genre');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const supabase = createServiceClient();
    const results: any[] = [];

    // Search artists
    if (type === 'all' || type === 'artist') {
      let artistQuery = supabase
        .from('artists')
        .select('id, name, slug, image_url, genres')
        .ilike('name', `%${query}%`);

      if (genre) {
        artistQuery = artistQuery.ilike('genres', `%${genre}%`);
      }

      const { data: artists } = await artistQuery.limit(Math.ceil(limit / (type === 'all' ? 4 : 1)));

      if (artists) {
        results.push(
          ...artists.map((artist) => ({
            id: artist.id,
            type: 'artist' as const,
            title: artist.name,
            subtitle: artist.genres?.join(', '),
            imageUrl: artist.image_url,
            slug: artist.slug || artist.id,
            metadata: {
              genre: artist.genres?.split(',')[0]?.trim(),
            },
          }))
        );
      }
    }

    // Search shows
    if (type === 'all' || type === 'show') {
      let showQuery = supabase
        .from('shows')
        .select(`
          id, name, slug, date, start_time,
          venues!inner(name, city, state),
          artists!inner(name, image_url)
        `)
        .or(`name.ilike.%${query}%, artists.name.ilike.%${query}%`);

      if (location) {
        showQuery = showQuery.or(`venues.city.ilike.%${location}%, venues.state.ilike.%${location}%`);
      }

      if (startDate) {
        showQuery = showQuery.gte('date', startDate);
      }

      if (endDate) {
        showQuery = showQuery.lte('date', endDate);
      }

      const { data: shows } = await showQuery.limit(Math.ceil(limit / (type === 'all' ? 4 : 1)));

      if (shows) {
        results.push(
          ...shows.map((show: any) => ({
            id: show.id,
            type: 'show' as const,
            title: show.name,
            subtitle: `${show.artists?.name} at ${show.venues?.name}`,
            imageUrl: show.artists?.image_url,
            slug: show.slug || show.id,
            metadata: {
              date: new Date(show.date).toLocaleDateString(),
              location: `${show.venues?.city}, ${show.venues?.state}`,
            },
          }))
        );
      }
    }

    // Search venues
    if (type === 'all' || type === 'venue') {
      let venueQuery = supabase
        .from('venues')
        .select('id, name, slug, city, state, image_url')
        .ilike('name', `%${query}%`);

      if (location) {
        venueQuery = venueQuery.or(`city.ilike.%${location}%, state.ilike.%${location}%`);
      }

      const { data: venues } = await venueQuery.limit(Math.ceil(limit / (type === 'all' ? 4 : 1)));

      if (venues) {
        results.push(
          ...venues.map((venue) => ({
            id: venue.id,
            type: 'venue' as const,
            title: venue.name,
            subtitle: `${venue.city}, ${venue.state}`,
            imageUrl: venue.image_url,
            slug: venue.slug || venue.id,
            metadata: {
              location: `${venue.city}, ${venue.state}`,
            },
          }))
        );
      }
    }

    // Search songs (if requested)
    if (type === 'song') {
      let songQuery = supabase
        .from('songs')
        .select('id, title, artist, album, album_art_url')
        .or(`title.ilike.%${query}%, artist.ilike.%${query}%`);

      const { data: songs } = await songQuery.limit(limit);

      if (songs) {
        results.push(
          ...songs.map((song) => ({
            id: song.id,
            type: 'song' as const,
            title: song.title,
            subtitle: `${song.artist}${song.album ? ` • ${song.album}` : ''}`,
            imageUrl: song.album_art_url,
            slug: song.id,
          }))
        );
      }
    }

    // Sort results by relevance (exact matches first, then partial matches)
    const sortedResults = results.sort((a, b) => {
      const aExact = a.title.toLowerCase() === query.toLowerCase() ? 1 : 0;
      const bExact = b.title.toLowerCase() === query.toLowerCase() ? 1 : 0;
      return bExact - aExact;
    });

    return NextResponse.json({ 
      results: sortedResults.slice(0, limit),
      total: sortedResults.length,
      query,
      filters: { type, location, genre, startDate, endDate }
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
