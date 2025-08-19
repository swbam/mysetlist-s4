import { NextResponse } from "next/server";
import { db, shows } from "@repo/database";
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

  const recentShows = await db.query.shows.findMany({
    where: and(
      lte(shows.date, new Date()),
      gte(
        shows.date,
        new Date(Date.now() - 7 * 86_400_000),
      ),
    ),
    with: {
      headlinerArtist: true,
      venue: true,
    },
  });

  for (const show of recentShows) {
    const setlist = await setlistFmClient.searchSetlists({
      artistName: show.headlinerArtist.name,
      venueName: show.venue?.name,
      date: new Date(show.date!).toISOString().split("T")[0],
    });

    if (setlist.setlist?.[0]) {
      // Import actual setlist for the show
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { importActualSetlist } = await import("~/lib/import-actual-setlist");
      await importActualSetlist(show.id, setlist.setlist[0] as any);

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
