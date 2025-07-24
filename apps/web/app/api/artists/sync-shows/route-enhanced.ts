import { db } from '@repo/database';
import { artists, showArtists, shows, venues } from '@repo/database';
import { TicketmasterClient } from '@repo/external-apis';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

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

    // Get artist from database
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId as string))
      .limit(1);

    if (!artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    // If no Ticketmaster ID, create sample shows
    if (!artist.ticketmasterId) {
      // Create sample shows as fallback
      const sampleShows = await createSampleShows(artistId, artist);
      
      // Update artist's last sync timestamp
      await db
        .update(artists)
        .set({
          updatedAt: new Date(),
          lastSyncedAt: new Date(),
        })
        .where(eq(artists.id, artistId));

      return NextResponse.json({
        success: true,
        message: 'Created sample shows (no Ticketmaster ID)',
        showsCount: sampleShows.length,
        shows: sampleShows,
      });
    }

    try {
      // Initialize Ticketmaster client and fetch shows
      const ticketmasterClient = new TicketmasterClient({
        apiKey: process.env.TICKETMASTER_API_KEY!,
      });
      
      const tmShows = await ticketmasterClient.searchEvents({
        attractionId: artist.ticketmasterId,
        size: 50,
        sort: 'date,asc',
      });

      if (!tmShows || tmShows.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No upcoming shows found on Ticketmaster',
          showsCount: 0,
          shows: [],
        });
      }

      const syncedShows = [];
      
      for (const tmShow of tmShows) {
        // Check if show already exists
        const existingShow = await db
          .select()
          .from(shows)
          .where(eq(shows.ticketmasterId, tmShow.id))
          .limit(1);

        if (existingShow.length > 0 && existingShow[0]) {
          syncedShows.push(existingShow[0]);
          continue;
        }

        // Get or create venue
        let venueId: string | null = null;
        if (tmShow._embedded?.venues?.[0]) {
          const tmVenue = tmShow._embedded.venues[0];
          venueId = await getOrCreateVenue(tmVenue);
        }

        // Create show
        const showData = {
          ticketmasterId: tmShow.id,
          headlinerArtistId: artistId,
          venueId,
          name: tmShow.name,
          slug: generateSlug(tmShow.name),
          date: tmShow.dates.start.localDate,
          startTime: tmShow.dates.start.localTime || '20:00',
          doorsTime: tmShow.dates.doorsTimes?.[0]?.localTime || '19:00',
          status: mapTicketmasterStatus(tmShow.dates.status?.code),
          description: tmShow.info || tmShow.pleaseNote || null,
          ticketUrl: tmShow.url,
          minPrice: tmShow.priceRanges?.[0]?.min || null,
          maxPrice: tmShow.priceRanges?.[0]?.max || null,
          currency: tmShow.priceRanges?.[0]?.currency || 'USD',
          imageUrl: tmShow.images?.[0]?.url || null,
          seatmapUrl: tmShow.seatmap?.staticUrl || null,
        };

        const insertResult = await db
          .insert(shows)
          .values(showData as any)
          .returning();
        
        const insertedShow = insertResult[0];
        
        if (!insertedShow) {
          console.error('Failed to insert show');
          continue;
        }

        // Create show-artist relationship
        await db.insert(showArtists).values({
          showId: insertedShow.id,
          artistId: artistId,
          orderIndex: 0,
          setLength: 90,
          isHeadliner: true,
        });

        syncedShows.push(insertedShow);
      }

      // Update artist's last sync timestamp
      await db
        .update(artists)
        .set({
          updatedAt: new Date(),
          lastSyncedAt: new Date(),
        })
        .where(eq(artists.id, artistId));

      return NextResponse.json({
        success: true,
        message: 'Shows sync completed',
        showsCount: syncedShows.length,
        shows: syncedShows,
      });
    } catch (apiError) {
      console.error('Ticketmaster API error:', apiError);
      // Fall back to sample shows if API fails
      const sampleShows = await createSampleShows(artistId, artist);
      return NextResponse.json({
        success: true,
        message: 'Created sample shows (API error)',
        showsCount: sampleShows.length,
        shows: sampleShows,
      });
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

// Helper function to get or create venue
async function getOrCreateVenue(tmVenue: any): Promise<string> {
  // Check if venue exists
  const existingVenue = await db
    .select()
    .from(venues)
    .where(eq(venues.ticketmasterId, tmVenue.id))
    .limit(1);

  if (existingVenue.length > 0) {
    return existingVenue[0]!.id;
  }

  // Create venue
  const [newVenue] = await db
    .insert(venues)
    .values({
      ticketmasterId: tmVenue.id,
      name: tmVenue.name,
      slug: generateSlug(tmVenue.name),
      address: tmVenue.address?.line1 || null,
      city: tmVenue.city?.name || 'Unknown',
      state: tmVenue.state?.stateCode || null,
      country: tmVenue.country?.name || 'Unknown',
      postalCode: tmVenue.postalCode || null,
      latitude: tmVenue.location?.latitude ? parseFloat(tmVenue.location.latitude) : null,
      longitude: tmVenue.location?.longitude ? parseFloat(tmVenue.location.longitude) : null,
      timezone: tmVenue.timezone || null,
      website: tmVenue.url || null,
      parkingInfo: tmVenue.parkingDetail || null,
      accessibilityInfo: tmVenue.accessibleSeatingDetail || null,
      generalRules: tmVenue.generalInfo?.generalRule || null,
      childRules: tmVenue.generalInfo?.childRule || null,
    } as any)
    .returning();

  return newVenue.id;
}

// Helper function to generate slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

// Helper function to map Ticketmaster status
function mapTicketmasterStatus(tmStatus?: string): 'upcoming' | 'cancelled' | 'postponed' | 'completed' {
  switch (tmStatus) {
    case 'onsale':
    case 'offsale':
      return 'upcoming';
    case 'cancelled':
      return 'cancelled';
    case 'postponed':
      return 'postponed';
    default:
      return 'upcoming';
  }
}

// Helper function to create sample shows
async function createSampleShows(artistId: string, artistData: any) {
  // Get or create sample venue
  let sampleVenue = await db
    .select()
    .from(venues)
    .where(eq(venues.slug, 'sample-venue'))
    .limit(1);

  if (!sampleVenue.length) {
    const [newVenue] = await db
      .insert(venues)
      .values({
        name: 'Sample Venue',
        slug: 'sample-venue',
        address: '123 Main St',
        city: 'Los Angeles',
        state: 'CA',
        country: 'United States',
        postalCode: '90001',
        latitude: 34.0522,
        longitude: -118.2437,
        capacity: 5000,
      } as any)
      .returning();
    sampleVenue = [newVenue];
  }

  const venueData = sampleVenue[0];
  
  // Create sample shows
  const sampleShows = [
    {
      headlinerArtistId: artistId,
      venueId: venueData!.id,
      name: `${artistData.name} Live in Concert`,
      slug: `${artistData.slug}-live-${Date.now()}`,
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      startTime: '20:00',
      doorsTime: '19:00',
      status: 'upcoming' as const,
      description: `Don't miss ${artistData.name} performing live!`,
      ticketUrl: 'https://example.com/tickets',
      minPrice: 45,
      maxPrice: 125,
      currency: 'USD',
    },
    {
      headlinerArtistId: artistId,
      venueId: venueData!.id,
      name: `${artistData.name} Summer Tour`,
      slug: `${artistData.slug}-summer-tour-${Date.now()}`,
      date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      startTime: '21:00',
      doorsTime: '20:00',
      status: 'upcoming' as const,
      description: `Experience ${artistData.name} on their summer tour!`,
      ticketUrl: 'https://example.com/tickets',
      minPrice: 55,
      maxPrice: 150,
      currency: 'USD',
    },
  ];

  const insertedShows = await db
    .insert(shows)
    .values(sampleShows as any)
    .returning();

  // Create show-artist relationships
  for (const show of insertedShows) {
    await db.insert(showArtists).values({
      showId: show.id,
      artistId: artistId,
      orderIndex: 0,
      setLength: 90,
      isHeadliner: true,
    });
  }

  return insertedShows;
}