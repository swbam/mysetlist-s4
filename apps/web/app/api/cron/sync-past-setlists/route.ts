import { NextResponse } from "next/server";
import { db, shows, artists, venues } from "@repo/database";
import { SetlistFmClient } from "@repo/external-apis";
import { and, lte, gte, eq } from "drizzle-orm";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env["CRON_SECRET"]}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const setlistFmClient = new SetlistFmClient({
    apiKey: process.env["SETLISTFM_API_KEY"]!,
  });

  // Get recent shows with explicit joins
  const recentShows = await db
    .select({
      id: shows.id,
      date: shows.date,
      setlistFmId: shows.setlistFmId,
      headlinerArtist: {
        id: artists.id,
        name: artists.name,
      },
      venue: {
        id: venues.id,
        name: venues.name,
      },
    })
    .from(shows)
    .leftJoin(artists, eq(shows.headlinerArtistId, artists.id))
    .leftJoin(venues, eq(shows.venueId, venues.id))
    .where(
      and(
        lte(shows.date, new Date().toISOString()),
        gte(
          shows.date,
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        ),
      ),
    );

  for (const show of recentShows) {
    if (!show.headlinerArtist || !show.venue) continue;
    
    const setlist = await setlistFmClient.searchSetlists({
      artistName: show.headlinerArtist.name,
      venueName: show.venue?.name,
      date: new Date(show.date!).toISOString().split("T")[0],
    });

    if (setlist.setlist?.[0]) {
      // TODO: Implement importActualSetlist
      // await importActualSetlist(show.id, setlist.setlist[0]);

      await db
        .update(shows)
        .set({
          status: "completed",
          setlistFmId: setlist.setlist[0].id,
        })
        .where(eq(shows.id, show.id));
    }
  }

  return NextResponse.json({ success: true });
}
