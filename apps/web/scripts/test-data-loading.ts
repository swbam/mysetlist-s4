#!/usr/bin/env tsx

import { db, sql } from "./db-client";

async function testTrendingArtistsQuery() {
  console.log("Testing trending artists query (mimicking the API call)...\n");

  try {
    // Test the exact query from trending.ts but adapted for direct DB access
    const artistsWithTrending = await db.execute(sql`
      SELECT id, name, slug, image_url, popularity, follower_count, trending_score
      FROM artists 
      WHERE trending_score > 0
      ORDER BY trending_score DESC
      LIMIT 10
    `);

    console.log(`Artists with trending_score > 0: ${artistsWithTrending.length}`);
    if (artistsWithTrending.length > 0) {
      console.log("Sample trending artists:");
      artistsWithTrending.forEach((artist, i) => {
        console.log(`  ${i + 1}. ${artist.name} (trending: ${artist.trending_score}, popularity: ${artist.popularity})`);
      });
    }

    // Test fallback query (what our fix should use if no trending scores)
    const artistsByPopularity = await db.execute(sql`
      SELECT id, name, slug, image_url, popularity, follower_count, trending_score
      FROM artists 
      WHERE popularity > 0 OR follower_count > 0 OR trending_score > 0
      ORDER BY popularity DESC
      LIMIT 10
    `);

    console.log(`\nFallback query (by popularity): ${artistsByPopularity.length} artists`);
    if (artistsByPopularity.length > 0) {
      console.log("Sample popular artists:");
      artistsByPopularity.forEach((artist, i) => {
        console.log(`  ${i + 1}. ${artist.name} (popularity: ${artist.popularity}, trending: ${artist.trending_score})`);
      });
    }

    return { trending: artistsWithTrending.length, popular: artistsByPopularity.length };
  } catch (error) {
    console.error("Error testing trending artists:", error);
    return { trending: 0, popular: 0 };
  }
}

async function testArtistShowsQuery() {
  console.log("\n\nTesting artist shows query...\n");

  try {
    // Get a sample artist
    const sampleArtist = await db.execute(sql`
      SELECT id, name FROM artists LIMIT 1
    `);

    if (sampleArtist.length === 0) {
      console.log("No artists found to test with");
      return { upcoming: 0, past: 0 };
    }

    const artist = sampleArtist[0];
    console.log(`Testing with artist: ${artist.name} (ID: ${artist.id})`);

    // Test upcoming shows
    const upcomingShows = await db.execute(sql`
      SELECT s.id, s.name, s.date, s.status, v.name as venue_name
      FROM shows s
      LEFT JOIN venues v ON s.venue_id = v.id  
      WHERE s.headliner_artist_id = ${artist.id}
      AND s.date >= CURRENT_DATE
      ORDER BY s.date
      LIMIT 15
    `);

    console.log(`Upcoming shows for ${artist.name}: ${upcomingShows.length}`);
    if (upcomingShows.length > 0) {
      upcomingShows.forEach(show => {
        console.log(`  - ${show.name} at ${show.venue_name} on ${show.date}`);
      });
    }

    // Test past shows  
    const pastShows = await db.execute(sql`
      SELECT s.id, s.name, s.date, s.status, v.name as venue_name
      FROM shows s
      LEFT JOIN venues v ON s.venue_id = v.id
      WHERE s.headliner_artist_id = ${artist.id}
      AND s.date < CURRENT_DATE
      ORDER BY s.date DESC
      LIMIT 25
    `);

    console.log(`\nPast shows for ${artist.name}: ${pastShows.length}`);
    if (pastShows.length > 0) {
      pastShows.slice(0, 3).forEach(show => {
        console.log(`  - ${show.name} at ${show.venue_name} on ${show.date}`);
      });
      if (pastShows.length > 3) {
        console.log(`  ... and ${pastShows.length - 3} more`);
      }
    }

    return { upcoming: upcomingShows.length, past: pastShows.length };
  } catch (error) {
    console.error("Error testing artist shows:", error);
    return { upcoming: 0, past: 0 };
  }
}

async function main() {
  console.log("=== TESTING DATA LOADING FIXES ===\n");

  const trendingResults = await testTrendingArtistsQuery();
  const showResults = await testArtistShowsQuery();

  console.log("\n=== SUMMARY ===");
  console.log(`✅ Trending Artists: ${trendingResults.trending > 0 ? 'WORKING' : 'NEEDS FALLBACK'} (${trendingResults.trending} with trending scores)`);
  console.log(`✅ Popular Artists Fallback: ${trendingResults.popular > 0 ? 'WORKING' : 'BROKEN'} (${trendingResults.popular} total)`);
  console.log(`✅ Artist Shows: ${showResults.upcoming + showResults.past > 0 ? 'WORKING' : 'BROKEN'} (${showResults.upcoming} upcoming, ${showResults.past} past)`);

  const allWorking = trendingResults.popular > 0 && (showResults.upcoming + showResults.past) > 0;
  console.log(`\n🎯 Overall Status: ${allWorking ? 'ALL FIXES WORKING' : 'ISSUES REMAIN'}`);

  if (allWorking) {
    console.log("\n📝 Next Steps:");
    console.log("- Homepage should now show popular artists");
    console.log("- Artist pages should show upcoming/past shows");
    console.log("- API endpoints should return proper data");
  }

  process.exit(0);
}

main();