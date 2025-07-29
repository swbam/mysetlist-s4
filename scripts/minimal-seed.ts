#!/usr/bin/env tsx
/**
 * Minimal seed script using only basic columns
 */

import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres.yzwkimtdaabyjbpykquu:Bambseth1590@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require";

const sql = postgres(DATABASE_URL);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  console.log("🌱 Minimal database seeding...\n");

  try {
    // Seed artists
    console.log("🎤 Seeding artists...");
    const artistData = [
      {
        name: "Taylor Swift",
        spotify_id: "06HL4z0CvFAxyc27GXpf02",
        genres: JSON.stringify(["pop", "country"]),
        popularity: 100,
        followers: 95000000,
        image_url:
          "https://i.scdn.co/image/ab6761610000e5ebe672b5f553298dcdccb0e676",
      },
      {
        name: "Drake",
        spotify_id: "3TVXtAsR1Inumwj472S9r4",
        genres: JSON.stringify(["hip hop", "rap"]),
        popularity: 95,
        followers: 88000000,
        image_url:
          "https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9",
      },
      {
        name: "The Weeknd",
        spotify_id: "1Xyo4u8uXC1ZmMpatF05PJ",
        genres: JSON.stringify(["r&b", "pop"]),
        popularity: 94,
        followers: 92000000,
        image_url:
          "https://i.scdn.co/image/ab6761610000e5eb214f3cf1cbe7139c1e26ffbb",
      },
    ];

    for (const artist of artistData) {
      await sql`
        INSERT INTO artists (name, slug, spotify_id, genres, popularity, followers, image_url, verified, trending_score)
        VALUES (
          ${artist.name},
          ${slugify(artist.name)},
          ${artist.spotify_id},
          ${artist.genres},
          ${artist.popularity},
          ${artist.followers},
          ${artist.image_url},
          true,
          ${artist.popularity}
        )
        ON CONFLICT (spotify_id) DO UPDATE SET
          popularity = EXCLUDED.popularity,
          followers = EXCLUDED.followers,
          trending_score = EXCLUDED.trending_score,
          updated_at = NOW()
      `;
      console.log(`  ✅ ${artist.name}`);
    }

    // Seed venues
    console.log("\n🏛️  Seeding venues...");
    const venueData = [
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

    for (const venue of venueData) {
      await sql`
        INSERT INTO venues (name, slug, city, state, country, capacity, timezone)
        VALUES (
          ${venue.name},
          ${slugify(venue.name)},
          ${venue.city},
          ${venue.state},
          ${venue.country},
          ${venue.capacity},
          'America/New_York'
        )
        ON CONFLICT (slug) DO UPDATE SET
          capacity = EXCLUDED.capacity,
          updated_at = NOW()
      `;
      console.log(`  ✅ ${venue.name}`);
    }

    // Get artist and venue IDs
    const artistIds =
      await sql`SELECT id, name FROM artists WHERE spotify_id IS NOT NULL`;
    const venueIds = await sql`SELECT id, name FROM venues`;

    // Seed shows
    console.log("\n🎭 Seeding shows...");
    let showCount = 0;

    for (const artist of artistIds) {
      for (const venue of venueIds) {
        const daysInFuture = 30 + Math.floor(Math.random() * 30);
        const showDate = new Date();
        showDate.setDate(showDate.getDate() + daysInFuture);
        const dateStr = showDate.toISOString().split("T")[0];

        const showName = `${artist.name} at ${venue.name}`;
        const showSlug = slugify(`${artist.name}-${venue.name}-${dateStr}`);

        const [show] = await sql`
          INSERT INTO shows (name, slug, date, venue_id, headliner_artist_id, status, min_price, max_price, trending_score)
          VALUES (
            ${showName},
            ${showSlug},
            ${dateStr},
            ${venue.id},
            ${artist.id},
            'upcoming',
            ${50 + Math.floor(Math.random() * 100)},
            ${200 + Math.floor(Math.random() * 300)},
            ${50 + Math.floor(Math.random() * 50)}
          )
          ON CONFLICT (slug) DO NOTHING
          RETURNING id
        `;

        if (show) {
          // Link artist to show
          await sql`
            INSERT INTO show_artists (show_id, artist_id, order_index, is_headliner)
            VALUES (${show.id}, ${artist.id}, 0, true)
            ON CONFLICT DO NOTHING
          `;
          showCount++;
        }
      }
    }
    console.log(`  ✅ Created ${showCount} shows`);

    // Seed songs
    console.log("\n🎵 Seeding songs...");
    const songData = [
      { title: "Anti-Hero", artist: "Taylor Swift" },
      { title: "Cruel Summer", artist: "Taylor Swift" },
      { title: "Love Story", artist: "Taylor Swift" },
      { title: "God's Plan", artist: "Drake" },
      { title: "One Dance", artist: "Drake" },
      { title: "Hotline Bling", artist: "Drake" },
      { title: "Blinding Lights", artist: "The Weeknd" },
      { title: "Save Your Tears", artist: "The Weeknd" },
      { title: "Starboy", artist: "The Weeknd" },
    ];

    for (const song of songData) {
      await sql`
        INSERT INTO songs (title, artist, popularity, duration_ms)
        VALUES (
          ${song.title},
          ${song.artist},
          ${70 + Math.floor(Math.random() * 30)},
          ${180000 + Math.floor(Math.random() * 120000)}
        )
        ON CONFLICT DO NOTHING
      `;
    }
    console.log(`  ✅ Seeded songs`);

    // Update trending scores
    console.log("\n📈 Updating trending scores...");
    await sql`
      UPDATE artists 
      SET trending_score = GREATEST(
        COALESCE(popularity, 0) * 0.5 +
        COALESCE(followers, 0) / 1000000 * 0.5,
        50
      )
      WHERE spotify_id IS NOT NULL
    `;

    await sql`
      UPDATE shows 
      SET trending_score = GREATEST(
        COALESCE(trending_score, 0),
        50 + RANDOM() * 50
      )
      WHERE status = 'upcoming'
    `;

    // Show summary
    const [artistCount] = await sql`SELECT COUNT(*) as count FROM artists`;
    const [showCount2] = await sql`SELECT COUNT(*) as count FROM shows`;
    const [venueCount] = await sql`SELECT COUNT(*) as count FROM venues`;
    const [songCount] = await sql`SELECT COUNT(*) as count FROM songs`;

    console.log("\n✅ Minimal seed completed successfully!");
    console.log("\n📊 Database Summary:");
    console.log(`  Artists: ${artistCount.count}`);
    console.log(`  Shows: ${showCount2.count}`);
    console.log(`  Venues: ${venueCount.count}`);
    console.log(`  Songs: ${songCount.count}`);

    await sql.end();
  } catch (error) {
    console.error("❌ Seed failed:", error);
    await sql.end();
    process.exit(1);
  }
}

main();
