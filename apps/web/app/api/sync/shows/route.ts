import { db } from '@repo/database';
import { artists, showArtists, shows, venues } from '@repo/database';
import { ticketmaster } from '@repo/external-apis';
import { and, desc, eq, gte } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

// POST /api/sync/shows
// Body: { artistId: string, ticketmasterId?: string }
// Syncs all shows for a given artist
export async function POST(request: NextRequest) {
  try {
    const { artistId, ticketmasterId } = await request.json();

    if (!artistId) {
      return NextResponse.json(
        { error: 'Artist ID required' },
        { status: 400 }
      );
    }

    // Verify artist exists
    const artist = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (!artist.length) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    const artistData = artist[0];

    // Check if sync is needed (last synced < 4 hours ago)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const needsSync =
      !artistData.lastSyncedAt ||
      new Date(artistData.lastSyncedAt) < fourHoursAgo;

    // Check for existing shows
    const existingShows = await db
      .select()
      .from(shows)
      .where(
        and(
          eq(shows.headlinerArtistId, artistId),
          gte(shows.date, new Date().toISOString().split('T')[0]!)
        )
      )
      .orderBy(desc(shows.date));

    // If artist was recently synced and has shows, return cached results
    if (!needsSync && existingShows.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Using cached shows (synced recently)',
        artist: artistData,
        showsCount: existingShows.length,
        shows: existingShows,
        cached: true,
      });
    }

    const tmId = ticketmasterId || artistData?.ticketmasterId;
    
    if (!tmId) {
      // If no Ticketmaster ID, create sample shows as fallback
      const sampleShows = await createSampleShows(artistId, artistData);
      return NextResponse.json({
        success: true,
        message: 'Created sample shows (no Ticketmaster ID)',
        artist: artistData,
        showsCount: sampleShows.length,
        shows: sampleShows,
        fallback: true,
      });
    }

    // Sync with Ticketmaster API
    let syncResult;
    try {
      console.log(`[Shows Sync] Fetching shows for artist ${artistData.name} (${tmId})`);
      syncResult = await ticketmaster.getArtistEvents(tmId);
    } catch (apiError) {
      console.error('[Shows Sync] Ticketmaster API error:', apiError);
      
      // Fallback to sample shows on API failure
      const sampleShows = await createSampleShows(artistId, artistData);
      return NextResponse.json({
        success: true,
        message: 'Created sample shows (API error)',
        artist: artistData,
        showsCount: sampleShows.length,
        shows: sampleShows,
        fallback: true,
      });
    }

    const syncedShows: any[] = [];
    const finalShows: any[] = [];

    // Process each show from Ticketmaster
    if (syncResult?.results?._embedded?.events) {
      for (const event of syncResult.results._embedded.events) {
        try {
          // Get or create venue
          let venueData = await getOrCreateVenue(event._embedded?.venues?.[0]);
          
          const showData = {
            headlinerArtistId: artistId,
            venueId: venueData.id,
            name: event.name || `${artistData.name} Live`,
            slug: `${artistData.slug}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            date: event.dates?.start?.localDate || new Date().toISOString().split('T')[0],
            status: determineShowStatus(event),
            description: event.info || `Live performance by ${artistData.name}`,
            ticketmasterId: event.id,
            url: event.url,
          };

          const insertedShow = await db.insert(shows).values(showData).returning();
          
          // Create show-artist relationship
          if (insertedShow[0]) {
            await db.insert(showArtists).values({
              showId: insertedShow[0].id,
              artistId: artistId,
              orderIndex: 0,
              setLength: 90,
              isHeadliner: true,
            });
            
            syncedShows.push(insertedShow[0]);
            finalShows.push(insertedShow[0]);
          }
        } catch (showError) {
          console.error('[Shows Sync] Error processing show:', showError);
          continue;
        }
      }
    }

    // If no shows were synced, create sample shows
    if (finalShows.length === 0) {
      const sampleShows = await createSampleShows(artistId, artistData);
      finalShows.push(...sampleShows);
    }

    // Update artist's last sync timestamp
    await db
      .update(artists)
      .set({
        lastSyncedAt: new Date(),
        showsCount: finalShows.length,
      })
      .where(eq(artists.id, artistId));

    return NextResponse.json({
      success: true,
      message: 'Shows sync completed',
      artist: artistData,
      showsCount: finalShows.length,
      shows: finalShows,
      synced: true,
      syncResult: syncResult?.results || null,
    });

  } catch (error) {
    console.error('[Shows Sync] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync shows',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to create sample shows
async function createSampleShows(artistId: string, artistData: any) {
  // Get or create a sample venue
  let sampleVenue = await db
    .select()
    .from(venues)
    .where(eq(venues.name, 'Sample Venue'))
    .limit(1);

  if (!sampleVenue.length) {
    const newVenue = await db
      .insert(venues)
      .values({
        name: 'Sample Venue',
        slug: 'sample-venue',
        city: 'TBA',
        country: 'United States',
      } as any)
      .returning();
    sampleVenue = newVenue;
  }

  const venueData = sampleVenue[0];
  
  // Create one sample show for demo purposes
  const sampleShow = {
    headlinerArtistId: artistId,
    venueId: venueData.id,
    name: `${artistData.name} Live`,
    slug: `${artistData.slug}-live-${Date.now()}`,
    date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0], // 30 days from now
    status: 'upcoming' as const,
    description: `Upcoming show for ${artistData.name}`,
  };
  
  const insertedShows = await db.insert(shows).values(sampleShow).returning();
  
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

// Helper function to get or create venue
async function getOrCreateVenue(venueData: any) {
  if (!venueData) {
    // Return default venue
    let defaultVenue = await db
      .select()
      .from(venues)
      .where(eq(venues.name, 'TBA Venue'))
      .limit(1);

    if (!defaultVenue.length) {
      const newVenue = await db
        .insert(venues)
        .values({
          name: 'TBA Venue',
          slug: 'tba-venue',
          city: 'TBA',
          country: 'United States',
        } as any)
        .returning();
      defaultVenue = newVenue;
    }
    
    return defaultVenue[0];
  }

  // Try to find existing venue
  const existingVenue = await db
    .select()
    .from(venues)
    .where(eq(venues.ticketmasterId, venueData.id))
    .limit(1);

  if (existingVenue.length) {
    return existingVenue[0];
  }

  // Create new venue
  const newVenue = await db
    .insert(venues)
    .values({
      name: venueData.name || 'Unknown Venue',
      slug: (venueData.name || 'unknown-venue').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      city: venueData.city?.name || 'Unknown',
      state: venueData.state?.name || null,
      country: venueData.country?.name || 'Unknown',
      ticketmasterId: venueData.id,
      address: venueData.address?.line1 || null,
    } as any)
    .returning();

  return newVenue[0];
}

// Helper function to determine show status
function determineShowStatus(event: any): 'upcoming' | 'completed' | 'cancelled' {
  const eventDate = new Date(event.dates?.start?.localDate || new Date());
  const now = new Date();
  
  if (event.dates?.status?.code === 'cancelled') {
    return 'cancelled';
  }
  
  return eventDate > now ? 'upcoming' : 'completed';
}