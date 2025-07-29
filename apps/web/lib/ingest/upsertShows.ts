import { db } from "@repo/database";
import { shows } from "@repo/database";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { upsertVenue } from "./upsertVenue";

export async function upsertShows(rawShows: any[], artistId: string) {
  const upsertedShows: any[] = [];

  for (const show of rawShows) {
    try {
      // Skip if no venue information
      if (!show.venue) {
        console.warn(
          `Skipping show ${show.tm_event_id} - no venue information`,
        );
        continue;
      }

      // First, upsert the venue
      const venue = await upsertVenue(show.venue);

      // Skip if venue creation failed
      if (!venue) {
        console.warn(
          `Skipping show ${show.tm_event_id} - venue creation failed`,
        );
        continue;
      }

      // Check if show already exists
      const existingShow = await db
        .select()
        .from(shows)
        .where(eq(shows.ticketmasterId, show.tm_event_id))
        .limit(1);

      if (existingShow.length > 0) {
        // Update existing show
        await db
          .update(shows)
          .set({
            name: show.name,
            ...(show.event_date && {
              date: new Date(show.event_date).toISOString().split("T")[0],
            }),
            status: show.status,
            description: show.pleaseNote || show.info || null,
            updatedAt: new Date(),
          })
          .where(eq(shows.ticketmasterId, show.tm_event_id));

        upsertedShows.push(existingShow[0]);
      } else {
        // Create new show
        const newShow = {
          id: nanoid(),
          headlinerArtistId: artistId,
          venueId: venue.id,
          ticketmasterId: show.tm_event_id,
          name: show.name,
          slug: show.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, ""),
          ...(show.event_date && {
            date: new Date(show.event_date).toISOString().split("T")[0],
          }),
          status: show.status,
          description: show.pleaseNote || show.info || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.insert(shows).values(newShow);
        upsertedShows.push(newShow);
      }
    } catch (error) {
      console.error(`Failed to upsert show ${show.tm_event_id}:`, error);
      // Continue with other shows
    }
  }

  console.log(`Upserted ${upsertedShows.length} shows for artist ${artistId}`);
  return upsertedShows;
}
