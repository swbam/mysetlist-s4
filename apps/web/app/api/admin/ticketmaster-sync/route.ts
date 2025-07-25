import type { SupabaseClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '~/lib/api/supabase/server';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// Type definitions
interface SyncRequest {
  action:
    | 'sync_upcoming_shows'
    | 'sync_venue_info'
    | 'sync_artist_shows'
    | 'update_show_status';
  options?: SyncOptions;
}

interface SyncOptions {
  location?: string;
  limit?: number;
  genres?: string[];
  venue_ids?: string[];
  artist_id?: string;
  status?: string;
}

interface UserData {
  role: 'admin' | 'moderator' | 'user';
}

interface VenueData {
  id: string;
  name: string;
  city: string;
  state: string;
}

interface ArtistData {
  id: string;
  name: string;
}

interface ShowData {
  id?: string;
  ticketmaster_id: string;
  title: string;
  date: string;
  time: string;
  status: string;
  ticket_url: string;
  price_range_min: number;
  price_range_max: number;
  venue_name: string;
  artist_name: string;
  artist_id?: string;
}

interface VenueUpdateData {
  ticketmaster_id: string;
  capacity: number;
  latitude: number;
  longitude: number;
  website: string;
  phone: string;
}

interface SyncLogData {
  sync_type: string;
  user_id: string;
  results: Record<string, number>;
}


export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or moderator
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single<UserData>();

    if (
      userError ||
      !userData ||
      (userData.role !== 'admin' && userData.role !== 'moderator')
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const requestData = (await request.json()) as SyncRequest;
    const { action, options } = requestData;

    switch (action) {
      case 'sync_upcoming_shows':
        return await syncUpcomingShows(supabase, options || {}, user.id);

      case 'sync_venue_info':
        return await syncVenueInfo(supabase, options || {}, user.id);

      case 'sync_artist_shows': {
        if (!options?.artist_id) {
          return NextResponse.json(
            { error: 'Artist ID is required' },
            { status: 400 }
          );
        }
        return await syncArtistShows(supabase, options, user.id);
      }

      case 'update_show_status':
        return await updateShowStatuses(supabase, options || {}, user.id);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Sync operation failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

async function syncUpcomingShows(
  supabase: SupabaseClient,
  options: SyncOptions,
  userId: string
) {
  const {
    limit = 100,
  } = options;
  // Mock Ticketmaster API call - in real implementation, use actual API
  const mockShows = generateMockShows(limit);

  let createdShows = 0;
  let updatedShows = 0;
  let skippedShows = 0;

  for (const showData of mockShows) {
    try {
      // Check if show already exists
      const { data: existingShow, error: existingShowError } = await supabase
        .from('shows')
        .select('id')
        .eq('ticketmaster_id', showData.ticketmaster_id)
        .single<{ id: string }>();

      if (!existingShowError && existingShow) {
        // Update existing show
        const { error: updateError } = await supabase
          .from('shows')
          .update({
            title: showData.title,
            date: showData.date,
            time: showData.time,
            status: showData.status,
            ticket_url: showData.ticket_url,
            price_range_min: showData.price_range_min,
            price_range_max: showData.price_range_max,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingShow.id);

        if (updateError) {
          throw updateError;
        }
        updatedShows++;
      } else {
        // Create new show
        const { error } = await supabase.from('shows').insert({
          ...showData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) {
          skippedShows++;
        } else {
          createdShows++;
        }
      }
    } catch (_error) {
      skippedShows++;
    }
  }

  // Log sync operation
  await logSyncOperation(supabase, {
    sync_type: 'ticketmaster_shows',
    user_id: userId,
    results: {
      created: createdShows,
      updated: updatedShows,
      skipped: skippedShows,
    },
  });

  return NextResponse.json({
    success: true,
    message: `Sync completed: ${createdShows} created, ${updatedShows} updated, ${skippedShows} skipped`,
    results: {
      created: createdShows,
      updated: updatedShows,
      skipped: skippedShows,
    },
  });
}

async function syncVenueInfo(
  supabase: SupabaseClient,
  options: SyncOptions,
  userId: string
) {
  const { venue_ids = [] } = options;
  let updatedVenues = 0;
  let failedVenues = 0;

  // Get venues that need updating
  const query = supabase
    .from('venues')
    .select('id, name, city, state')
    .is('ticketmaster_id', null);

  if (venue_ids.length > 0) {
    query.in('id', venue_ids);
  }

  const { data: venues, error: venuesError } = await query;

  if (venuesError) {
    throw venuesError;
  }

  for (const venue of venues || []) {
    try {
      // Mock Ticketmaster venue lookup
      const venueData = generateMockVenueData(venue);

      const { error: updateError } = await supabase
        .from('venues')
        .update({
          ticketmaster_id: venueData.ticketmaster_id,
          capacity: venueData.capacity,
          latitude: venueData.latitude,
          longitude: venueData.longitude,
          website: venueData.website,
          phone: venueData.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', venue.id);

      if (updateError) {
        throw updateError;
      }
      updatedVenues++;
    } catch (_error) {
      failedVenues++;
    }
  }

  // Log sync operation
  await logSyncOperation(supabase, {
    sync_type: 'ticketmaster_venues',
    user_id: userId,
    results: {
      updated: updatedVenues,
      failed: failedVenues,
    },
  });

  return NextResponse.json({
    success: true,
    message: `Venue sync completed: ${updatedVenues} updated, ${failedVenues} failed`,
    results: {
      updated: updatedVenues,
      failed: failedVenues,
    },
  });
}

async function syncArtistShows(
  supabase: SupabaseClient,
  options: SyncOptions,
  _userId: string
) {
  const { artist_id, limit = 50 } = options;

  if (!artist_id) {
    throw new Error('Artist ID is required');
  }
  // Get artist info
  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('id, name')
    .eq('id', artist_id)
    .single<ArtistData>();

  if (artistError || !artist) {
    return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
  }

  // Mock Ticketmaster artist shows lookup
  const artistShows = generateMockArtistShows(artist, limit);

  let createdShows = 0;
  let updatedShows = 0;

  for (const showData of artistShows) {
    try {
      const { data: existingShow, error: existingShowError } = await supabase
        .from('shows')
        .select('id')
        .eq('ticketmaster_id', showData.ticketmaster_id)
        .single<{ id: string }>();

      if (!existingShowError && existingShow) {
        const { error: updateError } = await supabase
          .from('shows')
          .update({
            ...showData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingShow.id);

        if (updateError) {
          throw updateError;
        }
        updatedShows++;
      } else {
        const { error: insertError } = await supabase.from('shows').insert({
          ...showData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (insertError) {
          throw insertError;
        }
        createdShows++;
      }
    } catch (_error) {}
  }

  return NextResponse.json({
    success: true,
    message: `Artist shows sync completed: ${createdShows} created, ${updatedShows} updated`,
    results: {
      created: createdShows,
      updated: updatedShows,
    },
  });
}

async function updateShowStatuses(
  supabase: SupabaseClient,
  _options: SyncOptions,
  _userId: string
) {
  const now = new Date();
  let updatedShows = 0;

  // Update shows that have passed to 'completed' status
  const { data: pastShows, error: pastShowsError } = await supabase
    .from('shows')
    .update({ status: 'completed', updated_at: now.toISOString() })
    .lt('date', now.toISOString().split('T')[0])
    .eq('status', 'upcoming')
    .select('id');

  if (pastShowsError) {
    throw pastShowsError;
  }
  updatedShows += pastShows?.length || 0;

  // Update shows happening today to 'in_progress' status if they have a time
  const today = now.toISOString().split('T')[0];
  const { data: todayShows, error: todayShowsError } = await supabase
    .from('shows')
    .update({ status: 'in_progress', updated_at: now.toISOString() })
    .eq('date', today)
    .eq('status', 'upcoming')
    .not('time', 'is', null)
    .select('id');

  if (todayShowsError) {
    throw todayShowsError;
  }
  updatedShows += todayShows?.length || 0;

  return NextResponse.json({
    success: true,
    message: `Updated ${updatedShows} show statuses`,
    results: {
      updated: updatedShows,
    },
  });
}

// Mock data generators for demonstration
function generateMockShows(count: number): ShowData[] {
  const shows: ShowData[] = [];
  const artists = [
    'The Killers',
    'Coldplay',
    'Imagine Dragons',
    'Arctic Monkeys',
    'Red Hot Chili Peppers',
  ];
  const venues = [
    'Madison Square Garden',
    'Wembley Stadium',
    'Hollywood Bowl',
    'Red Rocks',
    'Royal Albert Hall',
  ];

  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * 180)); // Next 6 months

    shows.push({
      ticketmaster_id: `TM_${Date.now()}_${i}`,
      title: `${artists[Math.floor(Math.random() * artists.length)]} World Tour`,
      date: date.toISOString().split('T')[0]!,
      time: `${19 + Math.floor(Math.random() * 3)}:00`,
      status: 'upcoming',
      ticket_url: `https://ticketmaster.com/event/${Date.now()}_${i}`,
      price_range_min: 50 + Math.floor(Math.random() * 100),
      price_range_max: 150 + Math.floor(Math.random() * 200),
      venue_name: venues[Math.floor(Math.random() * venues.length)]!,
      artist_name: artists[Math.floor(Math.random() * artists.length)]!,
    });
  }

  return shows;
}

function generateMockVenueData(venue: VenueData): VenueUpdateData {
  return {
    ticketmaster_id: `TM_VENUE_${Date.now()}_${venue.id}`,
    capacity: 1000 + Math.floor(Math.random() * 49000), // 1K to 50K capacity
    latitude: 40.7589 + (Math.random() - 0.5) * 10, // Around NYC with variation
    longitude: -73.9851 + (Math.random() - 0.5) * 10,
    website: `https://${venue.name.toLowerCase().replace(/\s+/g, '')}.com`,
    phone: `+1-555-${Math.floor(Math.random() * 9000 + 1000)}`,
  };
}

function generateMockArtistShows(
  artist: ArtistData,
  count: number
): ShowData[] {
  const shows: ShowData[] = [];
  const venues = [
    'Madison Square Garden',
    'Staples Center',
    'TD Garden',
    'United Center',
  ];

  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * 365));

    shows.push({
      ticketmaster_id: `TM_${artist.id}_${Date.now()}_${i}`,
      title: `${artist.name} Live`,
      date: date.toISOString().split('T')[0]!,
      time: '20:00',
      status: 'upcoming',
      artist_id: artist.id,
      venue_name: venues[Math.floor(Math.random() * venues.length)]!,
      artist_name: artist.name,
      ticket_url: `https://ticketmaster.com/event/${artist.id}_${Date.now()}_${i}`,
      price_range_min: 50 + Math.floor(Math.random() * 100),
      price_range_max: 150 + Math.floor(Math.random() * 200),
    });
  }

  return shows;
}

async function logSyncOperation(
  supabase: SupabaseClient,
  operation: SyncLogData
): Promise<void> {
  const { error } = await supabase.from('sync_logs').insert({
    sync_type: operation.sync_type,
    initiated_by: operation.user_id,
    results: operation.results,
    created_at: new Date().toISOString(),
  });

  if (error) {
  }
}
