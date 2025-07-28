#!/usr/bin/env tsx
/**
 * Direct database seeding of top 5 US artists
 * Bypasses API endpoints and writes directly to database
 */

import "dotenv/config";
import { db } from "../packages/database/src/client.js";
import { artists } from "../packages/database/src/schema/artists.js";
import { eq } from "drizzle-orm";

// Top 5 trending US artists
const TOP_ARTISTS = [
  {
    name: "Taylor Swift",
    spotifyId: "06HL4z0CvFAxyc27GXpf02",
    imageUrl:
      "https://i.scdn.co/image/ab6761610000e5ebc26a9c0b4c1cd0d7991b3025",
    genres: ["pop", "country"],
    popularity: 100,
    followers: 95000000,
  },
  {
    name: "Drake",
    spotifyId: "3TVXtAsR1Inumwj472S9r4",
    imageUrl:
      "https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9",
    genres: ["canadian hip hop", "hip hop", "rap"],
    popularity: 95,
    followers: 75000000,
  },
  {
    name: "Bad Bunny",
    spotifyId: "4q3ewBCX7sLwd24euuV69X",
    imageUrl:
      "https://i.scdn.co/image/ab6761610000e5eb5b8dd29ea43fa2ad2e4ae709",
    genres: ["reggaeton", "trap latino", "urbano latino"],
    popularity: 96,
    followers: 70000000,
  },
  {
    name: "The Weeknd",
    spotifyId: "1Xyo4u8uXC1ZmMpatF05PJ",
    imageUrl:
      "https://i.scdn.co/image/ab6761610000e5eb1cb00f9b6bb7a75c4e36b7c1",
    genres: ["canadian contemporary r&b", "pop", "r&b"],
    popularity: 94,
    followers: 80000000,
  },
  {
    name: "Post Malone",
    spotifyId: "246dkjvS1zLTtiykXe5h60",
    imageUrl:
      "https://i.scdn.co/image/ab6761610000e5eb6a90eb593b18b52cf89beea7",
    genres: ["dfw rap", "melodic rap", "pop"],
    popularity: 91,
    followers: 65000000,
  },
];

async function seedArtist(artist: (typeof TOP_ARTISTS)[0]) {
  try {
    console.log(`🎤 Seeding ${artist.name}...`);

    // Generate slug
    const slug = artist.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if artist already exists
    const existingArtist = await db
      .select()
      .from(artists)
      .where(eq(artists.spotifyId, artist.spotifyId))
      .limit(1);

    let artistRecord;

    if (existingArtist.length > 0) {
      // Update existing artist
      console.log(`  📝 Updating existing artist...`);
      const [updated] = await db
        .update(artists)
        .set({
          name: artist.name,
          imageUrl: artist.imageUrl,
          genres: JSON.stringify(artist.genres),
          popularity: artist.popularity,
          followers: artist.followers,
          verified: true,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(artists.id, existingArtist[0].id))
        .returning();

      artistRecord = updated;
    } else {
      // Create new artist
      console.log(`  ✨ Creating new artist...`);
      const [created] = await db
        .insert(artists)
        .values({
          spotifyId: artist.spotifyId,
          name: artist.name,
          slug,
          imageUrl: artist.imageUrl,
          genres: JSON.stringify(artist.genres),
          popularity: artist.popularity,
          followers: artist.followers,
          verified: true,
          externalUrls: JSON.stringify({
            spotify: `https://open.spotify.com/artist/${artist.spotifyId}`,
          }),
          lastSyncedAt: new Date(),
        })
        .returning();

      artistRecord = created;
    }

    console.log(
      `✅ ${artist.name} seeded successfully (ID: ${artistRecord?.id})`,
    );
    return true;
  } catch (error) {
    console.error(`❌ Failed to seed ${artist.name}:`, error);
    return false;
  }
}

async function main() {
  console.log("🚀 Starting direct database seeding of top 5 US artists...\n");

  let successCount = 0;

  // Seed each artist
  for (const artist of TOP_ARTISTS) {
    const success = await seedArtist(artist);
    if (success) {
      successCount++;
    }
  }

  console.log(`\n✅ Seeded ${successCount}/${TOP_ARTISTS.length} artists`);

  if (successCount > 0) {
    console.log("\n🎉 Seed complete! You now have data for:");
    TOP_ARTISTS.forEach((artist) => {
      console.log(`  • ${artist.name}`);
    });
    console.log("\n💡 Next steps:");
    console.log("  1. Start the dev server: pnpm dev");
    console.log("  2. Visit http://localhost:3001/artists to see the artists");
    console.log(
      "  3. The sync system will fetch shows and songs in the background",
    );
  } else {
    console.log(
      "\n❌ Failed to seed any artists. Please check your database connection.",
    );
  }

  process.exit(0);
}

// Run the script
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
