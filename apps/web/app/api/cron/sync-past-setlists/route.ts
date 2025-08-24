import { NextResponse } from "next/server";
import { db, shows, artists, venues, songs, setlists, setlistSongs } from "@repo/database";
import { and, gte, lte, sql, eq } from "drizzle-orm";
import { SetlistFmClient } from "@repo/external-apis/src/clients/setlistfm";
import { requireCronAuth } from "~/lib/api/auth-helpers";

export async function GET(_request: Request) {
	try {
		await requireCronAuth();

		const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
		const now = new Date();

		const recentShows = await db
			.select()
			.from(shows)
			.where(and(lte(shows.date, sql`'${now.toISOString().split("T")[0]}'` ), gte(shows.date, sql`'${sevenDaysAgo.toISOString().split("T")[0]}'`)));

		const setlistFmClient = new SetlistFmClient({
			apiKey: process.env['SETLISTFM_API_KEY']!,
		});

		for (const show of recentShows) {
			const [artist] = await db
				.select()
				.from(artists)
				.where(eq(artists.id, show.headlinerArtistId!))
				.limit(1);
			const [venue] = await db
				.select()
				.from(venues)
				.where(eq(venues.id, show.venueId!))
				.limit(1);

			if (!artist || !venue) {
				continue;
			}

			const response = await setlistFmClient.searchSetlists({
				artistName: artist.name,
				venueName: venue.name,
				date: show.date!,
			});

			const setlist = response.setlist?.[0];
			if (setlist && setlist.id) {
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
					const sets = Array.isArray(setlist.sets?.set) ? setlist.sets.set : [];
					for (const set of sets) {
						const songsInSet = Array.isArray(set.song) ? set.song : [];
						for (const song of songsInSet) {
							let [dbSong] = await db
								.select()
								.from(songs)
								.where(eq(songs.name, song.name))
								.limit(1);
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
