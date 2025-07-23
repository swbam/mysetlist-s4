import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '~/lib/supabase/server';
import { TicketmasterClient } from '@repo/external-apis';

const ticketmaster = new TicketmasterClient();

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { artistId } = await request.json();

    if (!artistId) {
      return NextResponse.json(
        { error: 'artistId is required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Get artist from database
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('id, name, ticketmaster_id')
      .eq('id', artistId)
      .single();

    if (artistError || !artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    // Check if we have a Ticketmaster ID
    if (!artist.ticketmaster_id) {
      // Try to find artist by name in Ticketmaster
      try {
        const searchResult = await ticketmaster.searchAttractions({
          keyword: artist.name,
          size: 1,
          classificationName: ['music']
        });

        if (searchResult._embedded?.attractions?.[0]) {
          const tmArtist = searchResult._embedded.attractions[0];
          
          // Update artist with Ticketmaster ID
          await supabase
            .from('artists')
            .update({ ticketmaster_id: tmArtist.id })
            .eq('id', artist.id);
          
          artist.ticketmaster_id = tmArtist.id;
        } else {
          return NextResponse.json(
            { error: 'Artist not found in Ticketmaster' },
            { status: 404 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to search artist in Ticketmaster' },
          { status: 500 }
        );
      }
    }

    // Fetch shows from Ticketmaster
    try {
      const events = await ticketmaster.getArtistEvents(artist.ticketmaster_id, {
        size: 50,
        sort: 'date,asc',
        countryCode: 'US',
      });

      if (!events._embedded?.events) {
        return NextResponse.json({
          success: true,
          message: 'No upcoming shows found',
          showsAdded: 0,
        });
      }

      let showsAdded = 0;
      const currentDate = new Date().toISOString().split('T')[0];

      for (const event of events._embedded.events) {
        if (!event.dates?.start?.localDate || event.dates.start.localDate < currentDate) {
          continue;
        }

        // Check if show already exists
        const existingShow = await supabase
          .from('shows')
          .select('id')
          .eq('ticketmaster_id', event.id)
          .single();

        if (!existingShow.data) {
          // Get or create venue
          let venueId = null;
          if (event._embedded?.venues?.[0]) {
            const tmVenue = event._embedded.venues[0];
            
            const { data: venue } = await supabase
              .from('venues')
              .select('id')
              .eq('ticketmaster_id', tmVenue.id)
              .single();

            if (!venue) {
              const { data: newVenue } = await supabase
                .from('venues')
                .insert({
                  ticketmaster_id: tmVenue.id,
                  name: tmVenue.name,
                  slug: tmVenue.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                  city: tmVenue.city?.name || 'Unknown',
                  state: tmVenue.state?.stateCode,
                  country: tmVenue.country?.countryCode || 'US',
                  address: tmVenue.address?.line1,
                  postal_code: tmVenue.postalCode,
                  latitude: tmVenue.location?.latitude ? parseFloat(tmVenue.location.latitude) : null,
                  longitude: tmVenue.location?.longitude ? parseFloat(tmVenue.location.longitude) : null,
                })
                .select('id')
                .single();
              
              venueId = newVenue?.id;
            } else {
              venueId = venue.id;
            }
          }

          // Create show
          const showSlug = `${artist.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${event.dates.start.localDate}`;
          
          const { error: showError } = await supabase
            .from('shows')
            .insert({
              ticketmaster_id: event.id,
              headliner_artist_id: artist.id,
              venue_id: venueId,
              name: event.name,
              slug: showSlug,
              date: event.dates.start.localDate,
              start_time: event.dates.start.localTime,
              status: event.dates.status?.code === 'onsale' ? 'upcoming' : 'upcoming',
              ticket_url: event.url,
              min_price: event.priceRanges?.[0]?.min,
              max_price: event.priceRanges?.[0]?.max,
              currency: event.priceRanges?.[0]?.currency || 'USD',
            });

          if (!showError) {
            showsAdded++;
          }
        }
      }

      // Update artist's upcoming shows count
      await supabase
        .from('artists')
        .update({ 
          upcoming_shows: showsAdded,
          last_synced_at: new Date().toISOString()
        })
        .eq('id', artist.id);

      return NextResponse.json({
        success: true,
        message: `Successfully synced ${showsAdded} shows`,
        showsAdded,
      });
    } catch (error) {
      console.error('Ticketmaster API error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch shows from Ticketmaster' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to sync shows',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
