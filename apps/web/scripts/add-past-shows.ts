#!/usr/bin/env tsx

import { db, sql } from "./db-client";

async function addPastShows() {
  console.log("Adding some past shows for better testing...\n");

  try {
    // Add past shows for better test coverage
    await db.execute(sql`
      WITH artist_venue_combinations AS (
        SELECT 
          a.id as artist_id,
          v.id as venue_id,
          a.name as artist_name,
          v.name as venue_name,
          a.popularity
        FROM artists a
        CROSS JOIN venues v
        LIMIT 15
      )
      INSERT INTO shows (
        headliner_artist_id, venue_id, name, slug, date, 
        status, trending_score, vote_count, view_count, created_at
      )
      SELECT 
        artist_id,
        venue_id,
        artist_name || ' World Tour - ' || venue_name,
        LOWER(REPLACE(artist_name || '-world-tour-' || venue_name || '-2023', ' ', '-')),
        CURRENT_DATE - INTERVAL '30 days' - (RANDOM() * INTERVAL '200 days'),
        'completed'::show_status,
        popularity * (0.2 + RANDOM() * 0.3),
        FLOOR(popularity * (5 + RANDOM() * 25)),
        FLOOR(popularity * (50 + RANDOM() * 200)),
        NOW() - (RANDOM() * INTERVAL '200 days')
      FROM artist_venue_combinations;
    `);

    console.log("Past shows added successfully!");
    
    // Check the results
    const totalShows = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE date >= CURRENT_DATE) as upcoming,
        COUNT(*) FILTER (WHERE date < CURRENT_DATE) as past
      FROM shows
    `);

    const counts = totalShows[0];
    console.log(`\nShow counts: ${counts.total} total (${counts.upcoming} upcoming, ${counts.past} past)`);

  } catch (error) {
    console.error("Error adding past shows:", error);
  } finally {
    process.exit(0);
  }
}

addPastShows();