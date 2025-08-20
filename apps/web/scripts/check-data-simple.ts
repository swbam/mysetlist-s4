#!/usr/bin/env tsx

import { db, sql } from "./db-client";

async function checkData() {
  console.log("Checking database data...\n");

  try {
    // Check artists
    const artists = await db.execute(sql`
      SELECT name, slug, popularity, trending_score
      FROM artists 
      ORDER BY popularity DESC NULLS LAST
      LIMIT 5
    `);
    console.log(`Artists: ${artists.length} found`);
    if (artists.length > 0) {
      console.log("Sample artists:");
      artists.forEach((artist) => {
        console.log(
          `  - ${artist.name} (slug: ${artist.slug}, popularity: ${artist.popularity}, trending: ${artist.trending_score})`,
        );
      });
    }

    // Check shows
    const shows = await db.execute(sql`
      SELECT COUNT(*) as count FROM shows
    `);
    console.log(`\nShows: ${shows[0]?.count || 0} total`);

    // Check venues
    const venues = await db.execute(sql`
      SELECT COUNT(*) as count FROM venues
    `);
    console.log(`Venues: ${venues[0]?.count || 0} total`);

    console.log("\nDatabase check complete!");
  } catch (error) {
    console.error("Error checking data:", error);
  } finally {
    process.exit(0);
  }
}

checkData();
