import { db } from '@repo/database';
import { artists, showArtists, shows, venues } from '@repo/database';
import { and, desc, eq, gte } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

// POST /api/sync/shows
// Body: { artistId: string }
// Syncs all shows for a given artist
export async function POST(request: NextRequest) {
  try {
    const { artistId } = await request.json();

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

    // For now, we'll create sample shows data
    // In production, this would call Ticketmaster API or other show data sources
    const currentDate = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(currentDate.getFullYear() + 1);

    // Check for existing shows to avoid duplicates
    const existingShows = await db
      .select()
      .from(shows)
      .where(
        and(
          eq(shows.headlinerArtistId, artistId),
          gte(shows.date, currentDate.toISOString().split('T')[0]!)
        )
      )
      .orderBy(desc(shows.date));

    // If artist already has upcoming shows, don't create sample data
    if (existingShows.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Shows already synced',
        artist: artistData,
        showsCount: existingShows.length,
        shows: existingShows,
      });
    }

    // Create sample venue if needed
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
          address: '123 Main St',
          city: 'Los Angeles',
          state: 'CA',
          country: 'United States',
          postalCode: '90001',
          latitude: 34.0522,
          longitude: -118.2437,
          capacity: 5000,
          website: 'https://example.com',
          phoneNumber: '555-0123',
          parkingInfo: 'Parking available on site',
          accessibilityInfo: 'Wheelchair accessible',
          generalRules: 'No outside food or drinks',
          childRules: 'All ages welcome',
          cameraPolicy: 'No professional cameras',
          bagPolicy: 'Small bags allowed',
        } as any)
        .returning();
      sampleVenue = newVenue;
    }

    const venueData = sampleVenue[0];
    
    if (!venueData) {
      throw new Error('Failed to create or find venue');
    }

    // Create sample shows for the artist
    const sampleShows = [
      {
        headlinerArtistId: artistId,
        venueId: venueData.id,
        name: `${artistData!.name} Live`,
        slug: `${artistData!.slug}-live-${Date.now()}`,
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0], // 30 days from now
        startTime: '20:00',
        doorsTime: '19:00',
        status: 'upcoming' as const,
        description: `Don't miss ${artistData!.name} performing live!`,
        ticketUrl: 'https://example.com/tickets',
        minPrice: 45,
        maxPrice: 125,
        currency: 'USD',
      },
      {
        headlinerArtistId: artistId,
        venueId: venueData.id,
        name: `${artistData!.name} Summer Tour`,
        slug: `${artistData!.slug}-summer-tour-${Date.now()}`,
        date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0], // 60 days from now
        startTime: '21:00',
        doorsTime: '20:00',
        status: 'upcoming' as const,
        description: `${artistData!.name} brings their summer tour to town!`,
        ticketUrl: 'https://example.com/tickets',
        minPrice: 55,
        maxPrice: 150,
        currency: 'USD',
      },
    ];

    // Insert shows
    const insertedShows = await db
      .insert(shows)
      .values(sampleShows as any)
      .returning();

    // Create show-artist relationships
    const showArtistRelations = insertedShows.map((show, _index) => ({
      showId: show.id,
      artistId: artistId,
      orderIndex: 0, // Headliner
      setLength: 90, // 90 minutes
      isHeadliner: true,
    }));

    await db.insert(showArtists).values(showArtistRelations);

    // Update artist's last sync timestamp
    await db
      .update(artists)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(artists.id, artistId));

    return NextResponse.json({
      success: true,
      message: 'Shows sync completed',
      artist: artistData,
      showsCount: insertedShows.length,
      shows: insertedShows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Shows sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
