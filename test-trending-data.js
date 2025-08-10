#!/usr/bin/env node

const postgres = require("postgres");

const databaseUrl = process.env.DATABASE_URL;
console.log("Database URL configured:", !!databaseUrl);

if (!databaseUrl) {
  console.error("DATABASE_URL not found in environment");
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  ssl: "require",
  prepare: false,
});

async function checkTrendingData() {
  try {
    console.log("\n=== Checking Artists Table ===");
    const artists = await sql`
      SELECT id, name, trending_score, popularity, followers, follower_count
      FROM artists
      ORDER BY trending_score DESC NULLS LAST
      LIMIT 10
    `;

    console.log("Total artists with data:", artists.length);
    artists.forEach((artist, i) => {
      console.log(
        `${i + 1}. ${artist.name}: trending_score=${artist.trending_score}, popularity=${artist.popularity}`,
      );
    });

    console.log("\n=== Checking Shows Table ===");
    const shows = await sql`
      SELECT id, name, trending_score, view_count, vote_count, attendee_count
      FROM shows
      ORDER BY trending_score DESC NULLS LAST
      LIMIT 10
    `;

    console.log("Total shows with data:", shows.length);
    shows.forEach((show, i) => {
      console.log(
        `${i + 1}. ${show.name}: trending_score=${show.trending_score}, views=${show.view_count}`,
      );
    });

    console.log("\n=== Checking Venues Table ===");
    const venues = await sql`
      SELECT id, name, capacity, city, state
      FROM venues
      WHERE capacity > 0
      ORDER BY capacity DESC
      LIMIT 10
    `;

    console.log("Total venues with data:", venues.length);
    venues.forEach((venue, i) => {
      console.log(
        `${i + 1}. ${venue.name} (${venue.city}): capacity=${venue.capacity}`,
      );
    });
  } catch (error) {
    console.error("Database error:", error.message);
    console.error("Full error:", error);
  } finally {
    await sql.end();
  }
}

checkTrendingData();
