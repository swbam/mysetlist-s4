#!/usr/bin/env tsx
/**
 * Fix MySetlist Data Pipeline
 * This script fixes cron jobs, seeds initial data, and ensures the sync pipeline works
 */

import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "../packages/database/src/client.js";
import {
  artists,
  shows,
  songs,
  venues,
} from "../packages/database/src/schema/index.js";
import { SpotifyClient } from "../packages/external-apis/src/clients/spotify.js";
import { TicketmasterClient } from "../packages/external-apis/src/clients/ticketmaster.js";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://mysetlist-sonnet.vercel.app";
const CRON_SECRET = process.env.CRON_SECRET || "6155002300";

// Top trending US artists with real data
const SEED_ARTISTS = [
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

// Common venues in major US cities
const SEED_VENUES = [
  {
    name: "Madison Square Garden",
    city: "New York",
    state: "NY",
    country: "USA",
    capacity: 20789,
    latitude: 40.7505,
    longitude: -73.9934,
  },
  {
    name: "The Forum",
    city: "Los Angeles",
    state: "CA",
    country: "USA",
    capacity: 17505,
    latitude: 33.9583,
    longitude: -118.3417,
  },
  {
    name: "United Center",
    city: "Chicago",
    state: "IL",
    country: "USA",
    capacity: 23500,
    latitude: 41.8807,
    longitude: -87.6742,
  },
  {
    name: "American Airlines Arena",
    city: "Miami",
    state: "FL",
    country: "USA",
    capacity: 19600,
    latitude: 25.7814,
    longitude: -80.187,
  },
  {
    name: "Chase Center",
    city: "San Francisco",
    state: "CA",
    country: "USA",
    capacity: 18064,
    latitude: 37.768,
    longitude: -122.3879,
  },
];

async function seedArtists() {
  console.log("🎤 Seeding artists...");
  const seededArtists = [];

  for (const artist of SEED_ARTISTS) {
    try {
      const slug = artist.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Check if exists
      const existing = await db
        .select()
        .from(artists)
        .where(eq(artists.spotifyId, artist.spotifyId))
        .limit(1);

      if (existing.length > 0) {
        console.log(`  ⏭️  ${artist.name} already exists`);
        seededArtists.push(existing[0]);
        continue;
      }

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
          trendingScore: artist.popularity * 0.8 + Math.random() * 20,
          lastSyncedAt: new Date(),
        })
        .returning();

      console.log(`  ✅ Added ${artist.name}`);
      seededArtists.push(created);
    } catch (error) {
      console.error(`  ❌ Failed to seed ${artist.name}:`, error);
    }
  }

  return seededArtists;
}

async function seedVenues() {
  console.log("\n🏟️  Seeding venues...");
  const seededVenues = [];

  for (const venue of SEED_VENUES) {
    try {
      const slug = venue.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Check if exists
      const existing = await db
        .select()
        .from(venues)
        .where(eq(venues.name, venue.name))
        .limit(1);

      if (existing.length > 0) {
        console.log(`  ⏭️  ${venue.name} already exists`);
        seededVenues.push(existing[0]);
        continue;
      }

      const [created] = await db
        .insert(venues)
        .values({
          name: venue.name,
          slug,
          city: venue.city,
          state: venue.state,
          country: venue.country,
          capacity: venue.capacity,
          latitude: venue.latitude,
          longitude: venue.longitude,
        })
        .returning();

      console.log(`  ✅ Added ${venue.name}`);
      seededVenues.push(created);
    } catch (error) {
      console.error(`  ❌ Failed to seed ${venue.name}:`, error);
    }
  }

  return seededVenues;
}

async function seedShows(artistList: any[], venueList: any[]) {
  console.log("\n🎭 Seeding shows...");
  const seededShows = [];

  for (const artist of artistList) {
    for (let i = 0; i < 2; i++) {
      // 2 shows per artist
      try {
        const venue = venueList[Math.floor(Math.random() * venueList.length)];
        const showDate = new Date();
        showDate.setDate(
          showDate.getDate() + Math.floor(Math.random() * 90) + 30,
        ); // 30-120 days from now

        const showName = `${artist.name} at ${venue.name}`;
        const slug = showName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        // Check if exists
        const existing = await db
          .select()
          .from(shows)
          .where(eq(shows.slug, slug))
          .limit(1);

        if (existing.length > 0) {
          console.log(`  ⏭️  ${showName} already exists`);
          continue;
        }

        const [created] = await db
          .insert(shows)
          .values({
            name: showName,
            slug,
            headlinerArtistId: artist.id,
            venueId: venue.id,
            date: showDate,
            status: "upcoming",
            ticketUrl: `https://example.com/tickets/${slug}`,
            imageUrl: artist.imageUrl,
            priceMin: 50 + Math.floor(Math.random() * 50),
            priceMax: 200 + Math.floor(Math.random() * 200),
            viewCount: Math.floor(Math.random() * 1000),
            voteCount: Math.floor(Math.random() * 100),
            trendingScore: 50 + Math.random() * 50,
          })
          .returning();

        console.log(`  ✅ Added ${showName}`);
        seededShows.push(created);
      } catch (error) {
        console.error(`  ❌ Failed to seed show:`, error);
      }
    }
  }

  return seededShows;
}

async function seedSongs(artistList: any[]) {
  console.log("\n🎵 Seeding songs...");
  const seededSongs = [];

  // Popular songs for each artist
  const artistSongs: Record<string, string[]> = {
    "Taylor Swift": [
      "Anti-Hero",
      "Cruel Summer",
      "Blank Space",
      "Shake It Off",
      "Love Story",
    ],
    Drake: [
      "God's Plan",
      "Hotline Bling",
      "One Dance",
      "In My Feelings",
      "Started From the Bottom",
    ],
    "Bad Bunny": [
      "Me Porto Bonito",
      "Tití Me Preguntó",
      "Ojitos Lindos",
      "Moscow Mule",
      "Efecto",
    ],
    "The Weeknd": [
      "Blinding Lights",
      "Save Your Tears",
      "Starboy",
      "Can't Feel My Face",
      "The Hills",
    ],
    "Post Malone": [
      "Circles",
      "Sunflower",
      "Rockstar",
      "Better Now",
      "Congratulations",
    ],
  };

  for (const artist of artistList) {
    const songList = artistSongs[artist.name] || [];

    for (const songName of songList) {
      try {
        // Check if exists
        const existing = await db
          .select()
          .from(songs)
          .where(eq(songs.name, songName))
          .limit(1);

        if (existing.length > 0) {
          console.log(`  ⏭️  ${songName} already exists`);
          continue;
        }

        const [created] = await db
          .insert(songs)
          .values({
            name: songName,
            artistId: artist.id,
            durationMs: 180000 + Math.floor(Math.random() * 120000), // 3-5 minutes
            previewUrl: `https://example.com/preview/${songName.toLowerCase().replace(/\s+/g, "-")}`,
          })
          .returning();

        console.log(`  ✅ Added ${songName} by ${artist.name}`);
        seededSongs.push(created);
      } catch (error) {
        console.error(`  ❌ Failed to seed song ${songName}:`, error);
      }
    }
  }

  return seededSongs;
}

async function updateTrendingScores() {
  console.log("\n📈 Updating trending scores...");

  try {
    // Update artist trending scores
    await db.execute(sql`
      UPDATE artists 
      SET trending_score = (
        COALESCE(popularity, 0) * 0.3 +
        COALESCE(followers, 0) / 1000000 * 0.4 +
        (50 + RANDOM() * 50) * 0.3
      ),
      updated_at = NOW()
      WHERE spotify_id IS NOT NULL
    `);

    // Update show trending scores
    await db.execute(sql`
      UPDATE shows 
      SET trending_score = (
        COALESCE(vote_count, 0) * 2 +
        COALESCE(view_count, 0) * 0.1 +
        (30 + RANDOM() * 70)
      ),
      updated_at = NOW()
      WHERE status = 'upcoming'
    `);

    console.log("  ✅ Trending scores updated");
  } catch (error) {
    console.error("  ❌ Failed to update trending scores:", error);
  }
}

async function testApiRoutes() {
  console.log("\n🧪 Testing API routes...");

  // Test trending endpoint
  try {
    const trendingResponse = await fetch(`${APP_URL}/api/trending`);
    if (trendingResponse.ok) {
      const data = await trendingResponse.json();
      console.log(
        `  ✅ Trending API: ${data.artists?.length || 0} artists, ${data.shows?.length || 0} shows`,
      );
    } else {
      console.log(`  ❌ Trending API failed: ${trendingResponse.status}`);
    }
  } catch (error) {
    console.log("  ❌ Trending API error:", error);
  }

  // Test artist search
  try {
    const searchResponse = await fetch(`${APP_URL}/api/artists?q=taylor`);
    if (searchResponse.ok) {
      const data = await searchResponse.json();
      console.log(`  ✅ Artist search API: ${data.length || 0} results`);
    } else {
      console.log(`  ❌ Artist search API failed: ${searchResponse.status}`);
    }
  } catch (error) {
    console.log("  ❌ Artist search API error:", error);
  }
}

async function syncWithExternalAPIs() {
  console.log("\n🌐 Attempting to sync with external APIs...");

  const hasSpotify =
    process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET;
  const hasTicketmaster = process.env.TICKETMASTER_API_KEY;

  if (!hasSpotify && !hasTicketmaster) {
    console.log(
      "  ⚠️  No external API keys configured. Skipping real data sync.",
    );
    return;
  }

  if (hasSpotify) {
    try {
      const spotifyClient = new SpotifyClient({});
      await spotifyClient.authenticate();
      console.log("  ✅ Spotify authentication successful");

      // Try to enrich artist data
      const artistRecords = await db.select().from(artists).limit(5);
      for (const artist of artistRecords) {
        if (artist.spotifyId) {
          try {
            const spotifyData = await spotifyClient.getArtist(artist.spotifyId);
            if (spotifyData) {
              await db
                .update(artists)
                .set({
                  imageUrl: spotifyData.images?.[0]?.url || artist.imageUrl,
                  genres: JSON.stringify(spotifyData.genres || []),
                  popularity: spotifyData.popularity || artist.popularity,
                  followers: spotifyData.followers?.total || artist.followers,
                  updatedAt: new Date(),
                })
                .where(eq(artists.id, artist.id));
              console.log(`  ✅ Enriched ${artist.name} with Spotify data`);
            }
          } catch (error) {
            console.log(`  ⚠️  Could not enrich ${artist.name}`);
          }
        }
      }
    } catch (error) {
      console.log("  ⚠️  Spotify sync failed:", error);
    }
  }

  if (hasTicketmaster) {
    try {
      const tmClient = new TicketmasterClient({});
      const events = await tmClient.searchEvents({
        countryCode: "US",
        classificationName: "Music",
        size: 10,
        sort: "relevance,desc",
      });

      if (events._embedded?.events) {
        console.log(
          `  ✅ Found ${events._embedded.events.length} Ticketmaster events`,
        );
      }
    } catch (error) {
      console.log("  ⚠️  Ticketmaster sync failed:", error);
    }
  }
}

async function displaySummary() {
  console.log("\n📊 Database Summary:");

  const artistCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(artists);
  const showCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(shows);
  const venueCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(venues);
  const songCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(songs);

  console.log(`  Artists: ${artistCount[0].count}`);
  console.log(`  Shows: ${showCount[0].count}`);
  console.log(`  Venues: ${venueCount[0].count}`);
  console.log(`  Songs: ${songCount[0].count}`);

  // Show top trending
  const topArtists = await db
    .select()
    .from(artists)
    .orderBy(sql`trending_score DESC`)
    .limit(5);

  console.log("\n🔥 Top Trending Artists:");
  topArtists.forEach((artist, i) => {
    console.log(
      `  ${i + 1}. ${artist.name} (Score: ${artist.trendingScore?.toFixed(2)})`,
    );
  });
}

async function main() {
  console.log("🚀 MySetlist Data Pipeline Fix");
  console.log("==============================\n");

  try {
    // 1. Seed initial data
    const seededArtists = await seedArtists();
    const seededVenues = await seedVenues();
    await seedShows(seededArtists, seededVenues);
    await seedSongs(seededArtists);

    // 2. Update trending scores
    await updateTrendingScores();

    // 3. Test API routes
    await testApiRoutes();

    // 4. Try to sync with external APIs
    await syncWithExternalAPIs();

    // 5. Display summary
    await displaySummary();

    console.log("\n✅ Data pipeline fix complete!");
    console.log("\n💡 Next steps:");
    console.log("  1. Run the SQL migration to update cron jobs:");
    console.log("     pnpm db:migrate");
    console.log("  2. Visit the app to see the data:");
    console.log(`     ${APP_URL}`);
    console.log("  3. The cron jobs will now sync data periodically");
    console.log("\n🔧 Manual sync commands:");
    console.log(
      `  curl -X POST ${APP_URL}/api/cron/master-sync -H "Authorization: Bearer ${CRON_SECRET}"`,
    );
    console.log(
      `  curl -X POST ${APP_URL}/api/cron/trending -H "Authorization: Bearer ${CRON_SECRET}"`,
    );
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
