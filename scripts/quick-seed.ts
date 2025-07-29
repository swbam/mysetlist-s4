#!/usr/bin/env tsx
/**
 * Quick seed script that works with current database schema
 * Focuses on essential data to make the app functional
 */

import { artists, db, showArtists, shows, songs, venues } from "@repo/database";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const seedArtists = [
  {
    name: "Taylor Swift",
    spotifyId: "06HL4z0CvFAxyc27GXpf02",
    genres: ["pop", "country"],
    popularity: 100,
    followers: 95000000,
    imageUrl:
      "https://i.scdn.co/image/ab6761610000e5ebe672b5f553298dcdccb0e676",
  },
  {
    name: "Drake",
    spotifyId: "3TVXtAsR1Inumwj472S9r4",
    genres: ["hip hop", "rap"],
    popularity: 95,
    followers: 88000000,
    imageUrl:
      "https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9",
  },
  {
    name: "The Weeknd",
    spotifyId: "1Xyo4u8uXC1ZmMpatF05PJ",
    genres: ["r&b", "pop"],
    popularity: 94,
    followers: 92000000,
    imageUrl:
      "https://i.scdn.co/image/ab6761610000e5eb214f3cf1cbe7139c1e26ffbb",
  },
];

const seedVenues = [
  {
    name: "Madison Square Garden",
    city: "New York",
    state: "NY",
    country: "United States",
    capacity: 20000,
  },
  {
    name: "The Forum",
    city: "Los Angeles",
    state: "CA",
    country: "United States",
    capacity: 17500,
  },
  {
    name: "United Center",
    city: "Chicago",
    state: "IL",
    country: "United States",
    capacity: 23500,
  },
];

async function main() {
  console.log("🌱 Quick seeding database...\n");

  try {
    // Seed artists
    console.log("🎤 Seeding artists...");
    const insertedArtists = [];

    for (const artist of seedArtists) {
      const [inserted] = await db
        .insert(artists)
        .values({
          ...artist,
          slug: slugify(artist.name),
          genres: JSON.stringify(artist.genres),
          verified: true,
          trendingScore: artist.popularity,
        })
        .onConflictDoUpdate({
          target: artists.spotifyId,
          set: {
            popularity: artist.popularity,
            followers: artist.followers,
            trendingScore: artist.popularity,
            updatedAt: new Date(),
          },
        })
        .returning();

      if (inserted) {
        insertedArtists.push(inserted);
        console.log(`  ✅ ${artist.name}`);
      }
    }

    // Seed venues
    console.log("\n🏛️  Seeding venues...");
    const insertedVenues = [];

    for (const venue of seedVenues) {
      const [inserted] = await db
        .insert(venues)
        .values({
          ...venue,
          slug: slugify(venue.name),
          timezone: "America/New_York",
        })
        .onConflictDoUpdate({
          target: venues.slug,
          set: {
            capacity: venue.capacity,
            updatedAt: new Date(),
          },
        })
        .returning();

      if (inserted) {
        insertedVenues.push(inserted);
        console.log(`  ✅ ${venue.name}`);
      }
    }

    // Seed shows
    console.log("\n🎭 Seeding shows...");
    let showCount = 0;

    for (const artist of insertedArtists) {
      for (const venue of insertedVenues) {
        // Create a show 30-60 days in the future
        const daysInFuture = 30 + Math.floor(Math.random() * 30);
        const showDate = new Date();
        showDate.setDate(showDate.getDate() + daysInFuture);

        const [show] = await db
          .insert(shows)
          .values({
            name: `${artist.name} at ${venue.name}`,
            slug: slugify(
              `${artist.name}-${venue.name}-${showDate.toISOString().split("T")[0]}`,
            ),
            date: showDate.toISOString().split("T")[0],
            venueId: venue.id,
            status: "upcoming",
            minPrice: 50 + Math.floor(Math.random() * 100),
            maxPrice: 200 + Math.floor(Math.random() * 300),
            trendingScore: 50 + Math.floor(Math.random() * 50),
          })
          .onConflictDoNothing()
          .returning();

        if (show) {
          // Link artist to show
          await db
            .insert(showArtists)
            .values({
              showId: show.id,
              artistId: artist.id,
              orderIndex: 0,
              isHeadliner: true,
            })
            .onConflictDoNothing();

          showCount++;
        }
      }
    }
    console.log(`  ✅ Created ${showCount} shows`);

    // Seed some popular songs
    console.log("\n🎵 Seeding songs...");
    const songTitles = [
      "Anti-Hero",
      "Cruel Summer",
      "Love Story",
      "Shake It Off",
      "Blank Space",
      "God's Plan",
      "One Dance",
      "Hotline Bling",
      "In My Feelings",
      "Nice For What",
      "Blinding Lights",
      "Save Your Tears",
      "Starboy",
      "The Hills",
      "Can't Feel My Face",
    ];

    let songCount = 0;
    for (let i = 0; i < songTitles.length; i++) {
      const artistIndex = Math.floor(i / 5);
      const artist = insertedArtists[artistIndex];

      if (artist) {
        await db
          .insert(songs)
          .values({
            title: songTitles[i],
            artist: artist.name,
            artistId: artist.id,
            popularity: 70 + Math.floor(Math.random() * 30),
            durationMs: 180000 + Math.floor(Math.random() * 120000),
          })
          .onConflictDoNothing();

        songCount++;
      }
    }
    console.log(`  ✅ Created ${songCount} songs`);

    // Update trending scores
    console.log("\n📈 Updating trending scores...");
    await db.execute(`
      UPDATE artists 
      SET trending_score = GREATEST(
        COALESCE(popularity, 0) * 0.5 +
        COALESCE(followers, 0) / 1000000 * 0.5,
        50
      )
      WHERE spotify_id IS NOT NULL
    `);

    await db.execute(`
      UPDATE shows 
      SET trending_score = GREATEST(
        COALESCE(trending_score, 0),
        50 + RANDOM() * 50
      )
      WHERE status = 'upcoming'
    `);

    console.log("\n✅ Quick seed completed successfully!");

    // Show summary
    const [artistCount] = await db.execute(
      `SELECT COUNT(*) as count FROM artists`,
    );
    const [showCount2] = await db.execute(
      `SELECT COUNT(*) as count FROM shows`,
    );
    const [venueCount] = await db.execute(
      `SELECT COUNT(*) as count FROM venues`,
    );
    const [songCount2] = await db.execute(
      `SELECT COUNT(*) as count FROM songs`,
    );

    console.log("\n📊 Database Summary:");
    console.log(`  Artists: ${artistCount.rows[0].count}`);
    console.log(`  Shows: ${showCount2.rows[0].count}`);
    console.log(`  Venues: ${venueCount.rows[0].count}`);
    console.log(`  Songs: ${songCount2.rows[0].count}`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

main();
