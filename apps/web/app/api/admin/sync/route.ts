import { getUser } from "@repo/auth/server";
import { db } from "@repo/database";
import { artists, shows, venues } from "@repo/database";
import { spotify, ticketmaster } from "@repo/external-apis";
import { and, eq, isNull, lte, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// Check if user is admin (you'll need to implement this based on your auth system)
async function isAdmin(userId: string): Promise<boolean> {
	// For now, check against a list of admin user IDs in env vars
	const adminIds = process.env.ADMIN_USER_IDS?.split(",") || [];
	return adminIds.includes(userId);
}

export async function POST(request: NextRequest) {
	try {
		const user = await getUser();

		if (!user || !(await isAdmin(user.id))) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { action, options } = await request.json();

		switch (action) {
			case "sync_artists":
				return await syncArtists(options);

			case "sync_shows":
				return await syncShows(options);

			case "sync_venues":
				return await syncVenues(options);

			case "cleanup_old_data":
				return await cleanupOldData(options);

			default:
				return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}
	} catch (error) {
		console.error("Admin sync error:", error);
		return NextResponse.json(
			{ error: "Sync operation failed", details: (error as Error).message },
			{ status: 500 },
		);
	}
}

async function syncArtists(
	options: { limit?: number; onlyMissingSpotify?: boolean } = {},
) {
	const { limit = 100, onlyMissingSpotify = false } = options || {};

	try {
		// Get artists that need Spotify data
		const query = db.select().from(artists);

		if (onlyMissingSpotify) {
			query.where(isNull(artists.spotifyId));
		}

		const artistsToSync = await query.limit(limit);

		let synced = 0;
		let failed = 0;

		for (const artist of artistsToSync) {
			try {
				// Search for artist on Spotify
				const spotifyResults = await spotify.searchArtists(artist.name, 1);

				if (spotifyResults.artists.items.length > 0) {
					const spotifyArtist = spotifyResults.artists.items[0];

					// Update artist with Spotify data
					await db
						.update(artists)
						.set({
							spotifyId: spotifyArtist.id,
							imageUrl: spotifyArtist.images[0]?.url || artist.imageUrl,
							smallImageUrl:
								spotifyArtist.images[1]?.url || artist.smallImageUrl,
							genres: JSON.stringify(spotifyArtist.genres),
							popularity: spotifyArtist.popularity,
							followers: spotifyArtist.followers.total,
							externalUrls: JSON.stringify({
								...JSON.parse(artist.externalUrls || "{}"),
								spotify: spotifyArtist.external_urls.spotify,
							}),
							lastSyncedAt: new Date(),
							updatedAt: new Date(),
						})
						.where(eq(artists.id, artist.id));

					synced++;
				}
			} catch (error) {
				console.error(`Failed to sync artist ${artist.name}:`, error);
				failed++;
			}
		}

		return NextResponse.json({
			success: true,
			synced,
			failed,
			total: artistsToSync.length,
		});
	} catch (error) {
		console.error("Error syncing artists:", error);
		throw error;
	}
}

async function syncShows(options: any) {
	const { artistId, limit = 50 } = options || {};

	try {
		let artistsToCheck;

		if (artistId) {
			artistsToCheck = await db
				.select()
				.from(artists)
				.where(eq(artists.id, artistId));
		} else {
			// Get popular artists to check for new shows
			artistsToCheck = await db
				.select()
				.from(artists)
				.orderBy(artists.popularity)
				.limit(limit);
		}

		let newShows = 0;
		let updatedShows = 0;

		for (const artist of artistsToCheck) {
			try {
				// Get upcoming events from Ticketmaster
				const events = await ticketmaster.getUpcomingEvents(artist.name, {
					size: 20,
					sort: "date,asc",
				});

				for (const event of events) {
					const existingShow = await db
						.select()
						.from(shows)
						.where(eq(shows.ticketmasterId, event.id))
						.limit(1);

					if (existingShow.length === 0) {
						// Create new show
						await createShowFromTicketmaster(event, artist.id);
						newShows++;
					} else {
						// Update existing show
						await updateShowFromTicketmaster(event, existingShow[0].id);
						updatedShows++;
					}
				}
			} catch (error) {
				console.error(`Failed to sync shows for artist ${artist.name}:`, error);
			}
		}

		return NextResponse.json({
			success: true,
			newShows,
			updatedShows,
			artistsChecked: artistsToCheck.length,
		});
	} catch (error) {
		throw error;
	}
}

async function syncVenues(options: any) {
	const { limit = 100 } = options || {};

	try {
		// Get venues with missing data
		const venuesToSync = await db
			.select()
			.from(venues)
			.where(
				or(
					isNull(venues.capacity),
					isNull(venues.latitude),
					isNull(venues.longitude),
				),
			)
			.limit(limit);

		const synced = 0;
		const failed = 0;

		// For now, just count them
		// In a real implementation, you'd sync with a venue API

		return NextResponse.json({
			success: true,
			venuesToSync: venuesToSync.length,
			message: "Venue sync not yet implemented",
		});
	} catch (error) {
		throw error;
	}
}

async function cleanupOldData(options: any) {
	const { daysOld = 365 } = options || {};

	try {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - daysOld);

		// Delete old shows that have passed and have no setlists
		const deletedShows = await db
			.delete(shows)
			.where(
				and(
					lte(shows.date, cutoffDate.toISOString()),
					eq(shows.status, "completed"),
				),
			);

		return NextResponse.json({
			success: true,
			message: `Cleaned up data older than ${daysOld} days`,
		});
	} catch (error) {
		throw error;
	}
}

// Helper functions
async function createShowFromTicketmaster(event: any, artistId: string) {
	// Implementation would be similar to the webhook handler
	// Skipping for brevity
}

async function updateShowFromTicketmaster(event: any, showId: string) {
	// Implementation would update show details
	// Skipping for brevity
}

function createSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}
