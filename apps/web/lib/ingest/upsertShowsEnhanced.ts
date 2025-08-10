import { db } from "@repo/database";
import { shows } from "@repo/database";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function upsertShowsEnhanced(rawShows: any[], artistId: string) {
  console.log(
    `🎪 Starting to upsert ${rawShows.length} shows for artist ${artistId}`,
  );
  const upsertedShows: any[] = [];

  for (const show of rawShows) {
    try {
      // Check if show already exists
      const existingShow = await db
        .select()
        .from(shows)
        .where(eq(shows.ticketmasterId, show.ticketmasterId))
        .limit(1);

      if (existingShow.length > 0) {
        console.log(`⚡ Updating existing show: ${show.name}`);
        // Update existing show with comprehensive data
        const updateData: any = {
          name: show.name,
          date: show.date,
          time: show.time,
          url: show.url,
          info: show.info,
          pleaseNote: show.pleaseNote,
          priceRanges: show.priceRanges,
          seatMap: show.seatMap,
          accessibility: show.accessibility,
          ticketLimit: show.ticketLimit,
          ageRestrictions: show.ageRestrictions,
          sales: show.sales,
          status: show.status,
          images: show.images,
          updatedAt: new Date(),
        };

        await db
          .update(shows)
          .set(updateData)
          .where(eq(shows.ticketmasterId, show.ticketmasterId));

        upsertedShows.push(existingShow[0]);
      } else {
        console.log(`✨ Creating new show: ${show.name}`);
        // Create new show with all available fields
        const slug = await generateUniqueShowSlug(show.name, show.date);

        const newShow: any = {
          id: nanoid(),
          headlinerArtistId: artistId,
          venueId: show.venueId,
          ticketmasterId: show.ticketmasterId,
          name: show.name,
          slug: slug,
          date: show.date,
          time: show.time,
          url: show.url,
          info: show.info,
          pleaseNote: show.pleaseNote,
          priceRanges: show.priceRanges,
          seatMap: show.seatMap,
          accessibility: show.accessibility,
          ticketLimit: show.ticketLimit,
          ageRestrictions: show.ageRestrictions,
          sales: show.sales,
          status: show.status || "onsale",
          images: show.images,
          trendingScore: 0,
          viewCount: 0,
          voteCount: 0,
          setlistCount: 0,
          isFeatured: false,
          hasSetlist: false,
          setlistComplete: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.insert(shows).values(newShow);
        upsertedShows.push(newShow);
      }
    } catch (error) {
      console.error(
        `❌ Failed to upsert show ${show.ticketmasterId || show.name}:`,
        error,
      );
      // Continue with other shows
    }
  }

  console.log(
    `✅ Successfully upserted ${upsertedShows.length} shows for artist ${artistId}`,
  );
  return upsertedShows;
}

// Generate unique slug for shows
async function generateUniqueShowSlug(
  name: string,
  date: string,
): Promise<string> {
  const baseSlug = `${name}-${date}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db
      .select()
      .from(shows)
      .where(eq(shows.slug, slug))
      .limit(1);

    if (existing.length === 0) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// Export enhanced function as main export
export { upsertShowsEnhanced as upsertShows };
