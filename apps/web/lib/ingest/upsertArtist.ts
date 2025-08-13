import { db } from "@repo/database";
import { artists } from "@repo/database";
import { TicketmasterClient } from "@repo/external-apis";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

async function fetchAttraction(tmId: string) {
  const tmClient = new TicketmasterClient({
    apiKey: process.env["TICKETMASTER_API_KEY"] || "",
  });
  return await tmClient.getAttraction(tmId);
}

export async function upsertArtist(tmId: string) {
  // Fetch artist data from Ticketmaster
  const attraction = await fetchAttraction(tmId);

  // Check if artist already exists by Ticketmaster ID
  const existingArtist = await db
    .select()
    .from(artists)
    .where(eq(artists.ticketmasterId, tmId))
    .limit(1);

  if (existingArtist.length > 0) {
    // Update existing artist
    await db
      .update(artists)
      .set({
        name: attraction.name,
        imageUrl: attraction.images?.[0]?.url || null,
        smallImageUrl:
          attraction.images?.find((img: any) => img.width < 500)?.url || null,
        genres: JSON.stringify(extractGenres(attraction)),
        updatedAt: new Date(),
      })
      .where(eq(artists.ticketmasterId, tmId));

    return existingArtist[0];
  }

  // Create new artist
  const slug = generateSlug(attraction.name);
  const newArtist = {
    id: nanoid(),
    name: attraction.name,
    slug,
    ticketmasterId: tmId,
    mbid: null,
    imageUrl: attraction.images?.[0]?.url || null,
    smallImageUrl:
      attraction.images?.find((img: any) => img.width < 500)?.url || null,
    genres: JSON.stringify(extractGenres(attraction)),
    verified: false,
    popularity: 0,
    followers: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(artists).values(newArtist);

  return newArtist;
}

function extractGenres(attraction: any): string[] {
  const genres: string[] = [];

  if (attraction.classifications) {
    for (const classification of attraction.classifications) {
      if (
        classification.genre?.name &&
        classification.genre.name !== "Undefined"
      ) {
        genres.push(classification.genre.name);
      }
      if (
        classification.subGenre?.name &&
        classification.subGenre.name !== "Undefined"
      ) {
        genres.push(classification.subGenre.name);
      }
    }
  }

  // Remove duplicates
  return [...new Set(genres)];
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
