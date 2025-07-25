import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '~/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const country = searchParams.get('country');
    const type = searchParams.get('type');
    const sort = searchParams.get('sort') || 'popular'; // popular, capacity, alphabetical

    const supabase = createServiceClient();

    // Build query
    let query = supabase
      .from('venues')
      .select(`
        *,
        shows!shows_venue_id_fkey(count)
      `, { count: 'exact' })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (city) {
      query = query.ilike('city', `%${city}%`);
    }
    if (state) {
      query = query.eq('state', state);
    }
    if (country) {
      query = query.eq('country', country);
    }
    if (type) {
      query = query.eq('venue_type', type);
    }

    // Apply sorting
    switch (sort) {
      case 'popular':
        // Sort by number of upcoming shows
        query = query.order('shows', { ascending: false });
        break;
      case 'capacity':
        query = query.order('capacity', { ascending: false });
        break;
      case 'alphabetical':
        query = query.order('name', { ascending: true });
        break;
      case 'recent':
        query = query.order('created_at', { ascending: false });
        break;
      default:
        query = query.order('name', { ascending: true });
    }

    const { data: venues, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get upcoming show counts for each venue
    const venueIds = venues?.map(v => v.id) || [];
    let upcomingShowsCounts: any = {};

    if (venueIds.length > 0) {
      const { data: showCounts } = await supabase
        .from('shows')
        .select('venue_id')
        .in('venue_id', venueIds)
        .eq('status', 'upcoming');

      // Count shows per venue
      showCounts?.forEach(show => {
        upcomingShowsCounts[show.venue_id] = (upcomingShowsCounts[show.venue_id] || 0) + 1;
      });
    }

    // Transform venues data
    const transformedVenues = (venues || []).map((venue) => ({
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
      venueType: venue.venue_type,
      address: venue.address,
      city: venue.city,
      state: venue.state,
      country: venue.country,
      postalCode: venue.postal_code,
      capacity: venue.capacity,
      website: venue.website,
      imageUrl: venue.image_url,
      latitude: venue.latitude,
      longitude: venue.longitude,
      timezone: venue.timezone,
      ticketmasterId: venue.ticketmaster_id,
      upcomingShows: upcomingShowsCounts[venue.id] || 0,
      amenities: venue.amenities,
      createdAt: venue.created_at,
      updatedAt: venue.updated_at,
    }));

    const response = NextResponse.json({
      venues: transformedVenues,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      success: true,
    });

    // Set cache headers
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');

    return response;
  } catch (error) {
    console.error('Venues API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch venues',
        message: error instanceof Error ? error.message : 'Unknown error',
        venues: [],
        success: false,
      },
      { status: 500 }
    );
  }
}