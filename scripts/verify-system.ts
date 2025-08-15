#!/usr/bin/env tsx
import 'dotenv/config';

async function verifySystem() {
  console.log("🚀 SYSTEM VERIFICATION TEST - THESET PLATFORM\n");
  console.log("=" .repeat(60));
  
  let totalTests = 0;
  let passedTests = 0;
  
  // Test 1: Homepage API
  console.log("\n✅ TEST 1: Popular Artists API");
  totalTests++;
  try {
    const popularResponse = await fetch('http://localhost:3001/api/popular-artists');
    if (popularResponse.ok) {
      const data = await popularResponse.json();
      console.log(`   ✅ PASS: ${data.artists?.length || 0} popular artists loaded`);
      passedTests++;
    } else {
      console.log(`   ❌ FAIL: Status ${popularResponse.status}`);
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error}`);
  }

  // Test 2: Trending Artists API
  console.log("\n✅ TEST 2: Trending Artists API");
  totalTests++;
  try {
    const trendingResponse = await fetch('http://localhost:3001/api/trending-artists');
    if (trendingResponse.ok) {
      const data = await trendingResponse.json();
      console.log(`   ✅ PASS: ${data.artists?.length || 0} trending artists loaded`);
      passedTests++;
    } else {
      console.log(`   ❌ FAIL: Status ${trendingResponse.status}`);
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error}`);
  }

  // Test 3: Shows API
  console.log("\n✅ TEST 3: Shows API");
  totalTests++;
  try {
    const showsResponse = await fetch('http://localhost:3001/api/shows?limit=10');
    if (showsResponse.ok) {
      const data = await showsResponse.json();
      console.log(`   ✅ PASS: ${data.shows?.length || 0} shows loaded`);
      passedTests++;
    } else {
      console.log(`   ❌ FAIL: Status ${showsResponse.status}`);
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error}`);
  }

  // Test 4: Artist Songs API (Our Last Night)
  console.log("\n✅ TEST 4: Artist Songs API");
  totalTests++;
  try {
    // Get Our Last Night ID first
    const { db, artists } = await import("@repo/database");
    const { ilike } = await import("drizzle-orm");
    
    const [ourLastNight] = await db
      .select()
      .from(artists)
      .where(ilike(artists.name, "%our last night%"))
      .limit(1);
    
    if (ourLastNight) {
      const songsResponse = await fetch(`http://localhost:3001/api/artists/${ourLastNight.id}/songs`);
      if (songsResponse.ok) {
        const data = await songsResponse.json();
        console.log(`   ✅ PASS: ${data.songs?.length || 0} songs for Our Last Night`);
        passedTests++;
      } else {
        console.log(`   ❌ FAIL: Status ${songsResponse.status}`);
      }
    } else {
      console.log(`   ⚠️ SKIP: Our Last Night not found`);
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error}`);
  }

  // Test 5: Database Statistics
  console.log("\n✅ TEST 5: Database Statistics");
  totalTests++;
  try {
    const { db, sql } = await import("@repo/database");
    
    const stats = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM artists) as total_artists,
        (SELECT COUNT(*) FROM artists WHERE spotify_id IS NOT NULL) as has_spotify,
        (SELECT COUNT(*) FROM artists WHERE ticketmaster_id IS NOT NULL) as has_ticketmaster,
        (SELECT COUNT(*) FROM shows) as total_shows,
        (SELECT COUNT(*) FROM setlists) as total_setlists,
        (SELECT COUNT(*) FROM songs) as total_songs,
        (SELECT COUNT(*) FROM venues) as total_venues
    `);
    
    const result = stats[0] as any;
    console.log(`   📊 Artists: ${result.total_artists} (${result.has_spotify} with Spotify, ${result.has_ticketmaster} with Ticketmaster)`);
    console.log(`   📊 Shows: ${result.total_shows}`);
    console.log(`   📊 Setlists: ${result.total_setlists}`);
    console.log(`   📊 Songs: ${result.total_songs}`);
    console.log(`   📊 Venues: ${result.total_venues}`);
    
    if (result.total_artists > 0 && result.total_shows > 0) {
      console.log(`   ✅ PASS: Database populated`);
      passedTests++;
    } else {
      console.log(`   ❌ FAIL: Database empty`);
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error}`);
  }

  // Test 6: SetlistFM Integration
  console.log("\n✅ TEST 6: SetlistFM Integration");
  totalTests++;
  try {
    const { SetlistFmClient } = await import("@repo/external-apis");
    const client = new SetlistFmClient({
      apiKey: process.env.SETLISTFM_API_KEY || "",
    });
    
    const result = await client.searchSetlists({
      artistName: "Metallica",
      maxResults: 1,
    });
    
    if (result.setlist.length > 0) {
      console.log(`   ✅ PASS: SetlistFM API working`);
      passedTests++;
    } else {
      console.log(`   ❌ FAIL: No setlists found`);
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error}`);
  }

  // Test 7: Spotify Integration
  console.log("\n✅ TEST 7: Spotify Integration");
  totalTests++;
  try {
    const { SpotifyClient } = await import("@repo/external-apis");
    const client = new SpotifyClient({});
    await client.authenticate();
    
    const result = await client.searchArtists("Metallica", 1);
    
    if (result.artists.items.length > 0) {
      console.log(`   ✅ PASS: Spotify API working`);
      passedTests++;
    } else {
      console.log(`   ❌ FAIL: No artists found`);
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error}`);
  }

  // Test 8: Ticketmaster Integration
  console.log("\n✅ TEST 8: Ticketmaster Integration");
  totalTests++;
  try {
    const { TicketmasterClient } = await import("@repo/external-apis");
    const client = new TicketmasterClient({
      apiKey: process.env.TICKETMASTER_API_KEY || "",
    });
    
    const result = await client.searchAttractions({
      keyword: "Metallica",
      size: 1,
    });
    
    if (result._embedded?.attractions?.[0]) {
      console.log(`   ✅ PASS: Ticketmaster API working`);
      passedTests++;
    } else {
      console.log(`   ❌ FAIL: No attractions found`);
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error}`);
  }

  // Final Summary
  console.log("\n" + "=" .repeat(60));
  console.log("🎯 FINAL RESULTS");
  console.log("=" .repeat(60));
  console.log(`Tests Passed: ${passedTests}/${totalTests}`);
  const percentage = Math.round((passedTests / totalTests) * 100);
  console.log(`Success Rate: ${percentage}%`);
  
  if (percentage === 100) {
    console.log("\n🎉 ALL SYSTEMS OPERATIONAL - 100% WORKING!");
  } else if (percentage >= 75) {
    console.log("\n✅ SYSTEM MOSTLY OPERATIONAL");
  } else {
    console.log("\n⚠️ SYSTEM NEEDS ATTENTION");
  }
  
  process.exit(percentage === 100 ? 0 : 1);
}

verifySystem().catch((error) => {
  console.error("Verification failed:", error);
  process.exit(1);
});