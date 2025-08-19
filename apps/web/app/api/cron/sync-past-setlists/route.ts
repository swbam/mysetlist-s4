import { NextResponse } from "next/server";
import { db } from "@repo/database";
import { shows, artists, venues, setlists, songs, setlistSongs } from "@repo/database";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { SetlistFmClient } from "@repo/external-apis/src/clients/setlistfm";
import { requireCronAuth } from "~/lib/api/auth-helpers";

export async function GET(request: Request) {
  try {
    await requireCronAuth();

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const recentShows = await db
      .select()
      .from(shows)
      .where(and(lte(shows.date, sql`'${now.toISOString().split("T")[0]}'` ), gte(shows.date, sql`'${sevenDaysAgo.toISOString().split("T")[0]}'`)));

    const setlistFmClient = new SetlistFmClient({
      apiKey: process.env.SETLISTFM_API_KEY!,
    });

    for (const show of recentShows) {
      const artist = await db.query.artists.findFirst({ where: eq(artists.id, show.headlinerArtistId!) });
      const venue = await db.query.venues.findFirst({ where: eq(venues.id, show.venueId!) });

      if (!artist || !venue) {
        continue;
      }

      const response = await setlistFmClient.searchSetlists({
        artistName: artist.name,
        venueName: venue.name,
        date: show.date!,
      });

      if (response.setlist && response.setlist.length > 0) {
        const setlist = response.setlist[0];
        const [newSetlist] = await db
          .insert(setlists)
          .values({
            showId: show.id,
            artistId: artist.id,
            type: "actual",
            externalId: setlist.id,
          })
          .returning();

        if (newSetlist) {
          for (const set of setlist.sets.set) {
            for (const song of set.song) {
              let dbSong = await db.query.songs.findFirst({ where: eq(songs.name, song.name) });
              if (!dbSong) {
                [dbSong] = await db.insert(songs).values({ name: song.name, artist: artist.name }).returning();
              }

              if (dbSong) {
                await db.insert(setlistSongs).values({
                  setlistId: newSetlist.id,
                  songId: dbSong.id,
                  position: 0,
                });
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to sync past setlists:", error);
    return NextResponse.json(
      { error: "Failed to sync past setlists" },
      { status: 500 }
    );
  }
}
