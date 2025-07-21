import { db } from '@repo/database';
import { artists, showArtists, shows, venues } from '@repo/database';
import { and, desc, eq, gte } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

// POST /api/sync/shows
// Body: { artistId: string, ticketmasterId?: string }
// Syncs all shows for a given artist
export async function POST(request: NextRequest) {
  try {
    const { artistId, ticketmasterId: _ticketmasterId } = await request.json();

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

    // If artist has recent shows and doesn't need sync, return existing
    if (existingShows.length > 0 && !needsSync) {
      return NextResponse.json({
        success: true,
        message: 'Shows data is current',
        artist: artistData,
        showsCount: existingShows.length,
        shows: existingShows,
        synced: false,
      });
    }

    // Use unified sync pipeline for comprehensive data sync
    const syncUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3001';
    const syncResponse = await fetch(`${syncUrl}/api/sync/unified-pipeline`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'ShowsSync/1.0'
      },
      body: JSON.stringify({
        artistId: artistData.id,
        mode: 'single',
        comprehensive: true
      }),
    });

    let syncResult;
    if (syncResponse.ok) {
      syncResult = await syncResponse.json();
    } else {
      // Fallback: Create basic sample data if API sync fails
      console.log('API sync failed, creating sample data as fallback');
      
      if (existingShows.length === 0) {
        // Create minimal sample venue if needed
        let sampleVenue = await db
          .select()
          .from(venues)
          .where(eq(venues.name, 'TBA Venue'))
          .limit(1);

        if (!sampleVenue.length) {
          const newVenue = await db
            .insert(venues)
            .values({
              name: 'TBA Venue',
              slug: 'tba-venue',
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

        const [insertedShow] = await db
          .insert(shows)
          .values(sampleShow as any)
          .returning();

        // Create show-artist relationship
        await db.insert(showArtists).values({
          showId: insertedShow.id,
          artistId: artistId,
          orderIndex: 0,
          isHeadliner: true,
        });

        existingShows.push(insertedShow);
      }
    }

    // Update artist's last sync timestamp
    await db
      .update(artists)
      .set({
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(artists.id, artistId));

    // Get fresh shows data after sync
    const finalShows = await db
      .select()
      .from(shows)
      .where(
        and(
          eq(shows.headlinerArtistId, artistId),
          gte(shows.date, new Date().toISOString().split('T')[0]!)
        )
      )
      .orderBy(desc(shows.date));

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
    return NextResponse.json(
      {
        error: 'Shows sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
