import { artists, db, shows, venues } from "@repo/database";
import { SetlistSyncService } from "@repo/external-apis/src/services/setlist-sync";
import { eq, and, ilike } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { artistName, setlistFmData, showId } = body;

    if (!artistName && !showId) {
      return NextResponse.json(
        { error: "Either artistName or showId is required" },
        { status: 400 }
      );
    }

    const syncService = new SetlistSyncService();

    // If we have setlistFM data directly, sync it
    if (setlistFmData) {
      // Find or create artist
      let artist = await db
        .select()
        .from(artists)
        .where(ilike(artists.name, artistName))
        .limit(1);

      if (artist.length === 0) {
        // Create artist if doesn't exist
        const result = await db
          .insert(artists)
          .values({
            name: artistName,
            slug: artistName.toLowerCase().replace(/\s+/g, '-'),
          })
          .returning();
        artist = result;
      }

      if (artist[0]) {
        // Find or create venue
        let venue = null;
        if (setlistFmData.venue) {
          const venueResult = await db
            .select()
            .from(venues)
            .where(
              and(
                eq(venues.name, setlistFmData.venue.name),
                eq(venues.city, setlistFmData.venue.city.name)
              )
            )
            .limit(1);

          if (venueResult.length === 0) {
            // Create venue
            const newVenue = await db
              .insert(venues)
              .values({
                name: setlistFmData.venue.name,
                slug: setlistFmData.venue.name.toLowerCase().replace(/\s+/g, '-'),
                city: setlistFmData.venue.city.name,
                state: setlistFmData.venue.city.stateCode || null,
                country: setlistFmData.venue.city.country.name,
                latitude: setlistFmData.venue.city.coords?.lat || null,
                longitude: setlistFmData.venue.city.coords?.long || null,
              })
              .returning();
            venue = newVenue[0];
          } else {
            venue = venueResult[0];
          }
        }

        // Find or create show
        const showDate = setlistFmData.eventDate.split('-').reverse().join('-'); // Convert DD-MM-YYYY to YYYY-MM-DD
        
        let show = await db
          .select()
          .from(shows)
          .where(
            and(
              eq(shows.headlinerArtistId, artist[0].id),
              eq(shows.date, showDate)
            )
          )
          .limit(1);

        if (show.length === 0) {
          // Create show
          const newShow = await db
            .insert(shows)
            .values({
              headlinerArtistId: artist[0].id,
              venueId: venue?.id || null,
              name: `${artistName} at ${setlistFmData.venue.name}`,
              slug: `${artistName.toLowerCase().replace(/\s+/g, '-')}-${showDate}`,
              date: showDate,
              status: new Date(showDate) < new Date() ? 'completed' : 'upcoming',
              setlistFmId: setlistFmData.id,
            })
            .returning();
          show = newShow;
        } else {
          // Update show with setlistFM ID
          await db
            .update(shows)
            .set({
              setlistFmId: setlistFmData.id,
              updatedAt: new Date(),
            })
            .where(eq(shows.id, show[0]!.id));
        }

        // Sync the actual setlist
        if (show[0]) {
          await syncService.syncSetlistFromSetlistFm(setlistFmData);
          
          return NextResponse.json({
            success: true,
            showId: show[0].id,
            artistId: artist[0].id,
            message: "Setlist synced successfully",
          });
        }
      }
    }

    // If we just have a showId, sync by that
    if (showId) {
      await syncService.syncSetlistByShowId(showId);
      return NextResponse.json({
        success: true,
        showId,
        message: "Setlist sync initiated",
      });
    }

    return NextResponse.json(
      { error: "Unable to sync setlist" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Setlist sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync setlist", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}