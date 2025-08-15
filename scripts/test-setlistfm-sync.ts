#!/usr/bin/env tsx
import 'dotenv/config';

import { artists, db, shows, setlists, setlistSongs, songs, venues } from "@repo/database";
import { SetlistFmClient, SetlistSyncService } from "@repo/external-apis";
import { eq, ilike, isNull, sql } from "drizzle-orm";

async function testSetlistFMSync() {
  console.log("=== TESTING SETLISTFM SYNC ===\n");

  // 1. Find Our Last Night
  console.log("1. Searching for 'Our Last Night' artist...");
  const ourLastNight = await db
    .select()
    .from(artists)
    .where(ilike(artists.name, "%our last night%"))
    .limit(1);

  if (ourLastNight.length === 0) {
    console.log("❌ Our Last Night not found in database. Let's check all artists...");
    const allArtists = await db
      .select({ name: artists.name, slug: artists.slug })
      .from(artists)
      .limit(10);
    console.log("Sample artists in DB:", allArtists);
    return;
  }

  const artist = ourLastNight[0];
  console.log(`✅ Found artist: ${artist.name} (ID: ${artist.id})`);
  console.log(`   Slug: ${artist.slug}`);
  console.log(`   Spotify ID: ${artist.spotifyId || "NULL"}`);
  console.log(`   Ticketmaster ID: ${artist.ticketmasterId || "NULL"}`);
  console.log(`   SetlistFM ID: ${artist.setlistfmId || "NULL"}`);
  console.log(`   Image URL: ${artist.imageUrl || "NULL"}`);
  console.log(`   Genres: ${artist.genres || "NULL"}`);
  console.log(`   Popularity: ${artist.popularity || "NULL"}`);

  // 2. Test SetlistFM API
  console.log("\n2. Testing SetlistFM API for Our Last Night...");
  const setlistFmClient = new SetlistFmClient({
    apiKey: process.env.SETLISTFM_API_KEY || "",
  });

  try {
    const setlistResults = await setlistFmClient.searchSetlists({
      artistName: artist.name,
      maxResults: 5,
    });

    console.log(`   Found ${setlistResults.setlist.length} setlists on SetlistFM`);
    
    if (setlistResults.setlist.length > 0) {
      const latestSetlist = setlistResults.setlist[0];
      console.log(`   Latest show: ${latestSetlist?.eventDate} at ${latestSetlist?.venue.name}`);
      console.log(`   Songs played: ${latestSetlist?.sets.set.reduce((acc, set) => acc + set.song.length, 0)}`);
      
      // 3. Sync this setlist
      console.log("\n3. Syncing setlist to database...");
      const syncService = new SetlistSyncService();
      await syncService.syncSetlistFromSetlistFm(latestSetlist!);
      console.log("✅ Setlist synced successfully");
    }
  } catch (error) {
    console.error("❌ SetlistFM API error:", error);
  }

  // 4. Check for blank fields in database
  console.log("\n4. Checking for blank/null fields in artists table...");
  const artistsWithNulls = await db
    .select({
      id: artists.id,
      name: artists.name,
      hasSpotifyId: sql<boolean>`${artists.spotifyId} IS NOT NULL`,
      hasTicketmasterId: sql<boolean>`${artists.ticketmasterId} IS NOT NULL`,
      hasImageUrl: sql<boolean>`${artists.imageUrl} IS NOT NULL`,
      hasGenres: sql<boolean>`${artists.genres} IS NOT NULL`,
      hasPopularity: sql<boolean>`${artists.popularity} IS NOT NULL`,
      hasSlug: sql<boolean>`${artists.slug} IS NOT NULL`,
    })
    .from(artists)
    .limit(20);

  const nullCounts = {
    spotifyId: 0,
    ticketmasterId: 0,
    imageUrl: 0,
    genres: 0,
    popularity: 0,
    slug: 0,
  };

  for (const artist of artistsWithNulls) {
    if (!artist.hasSpotifyId) nullCounts.spotifyId++;
    if (!artist.hasTicketmasterId) nullCounts.ticketmasterId++;
    if (!artist.hasImageUrl) nullCounts.imageUrl++;
    if (!artist.hasGenres) nullCounts.genres++;
    if (!artist.hasPopularity) nullCounts.popularity++;
    if (!artist.hasSlug) nullCounts.slug++;
  }

  console.log("   NULL field counts (out of 20 sample artists):");
  console.log(`   - Spotify ID: ${nullCounts.spotifyId}`);
  console.log(`   - Ticketmaster ID: ${nullCounts.ticketmasterId}`);
  console.log(`   - Image URL: ${nullCounts.imageUrl}`);
  console.log(`   - Genres: ${nullCounts.genres}`);
  console.log(`   - Popularity: ${nullCounts.popularity}`);
  console.log(`   - Slug: ${nullCounts.slug}`);

  // 5. Check shows with null fields
  console.log("\n5. Checking for blank/null fields in shows table...");
  const showsWithNulls = await db
    .select({
      id: shows.id,
      name: shows.name,
      hasSlug: sql<boolean>`${shows.slug} IS NOT NULL`,
      hasDate: sql<boolean>`${shows.date} IS NOT NULL`,
      hasVenueId: sql<boolean>`${shows.venueId} IS NOT NULL`,
      hasHeadlinerId: sql<boolean>`${shows.headlinerArtistId} IS NOT NULL`,
      hasStatus: sql<boolean>`${shows.status} IS NOT NULL`,
    })
    .from(shows)
    .limit(20);

  const showNullCounts = {
    slug: 0,
    date: 0,
    venueId: 0,
    headlinerId: 0,
    status: 0,
  };

  for (const show of showsWithNulls) {
    if (!show.hasSlug) showNullCounts.slug++;
    if (!show.hasDate) showNullCounts.date++;
    if (!show.hasVenueId) showNullCounts.venueId++;
    if (!show.hasHeadlinerId) showNullCounts.headlinerId++;
    if (!show.hasStatus) showNullCounts.status++;
  }

  console.log("   NULL field counts (out of 20 sample shows):");
  console.log(`   - Slug: ${showNullCounts.slug}`);
  console.log(`   - Date: ${showNullCounts.date}`);
  console.log(`   - Venue ID: ${showNullCounts.venueId}`);
  console.log(`   - Headliner Artist ID: ${showNullCounts.headlinerId}`);
  console.log(`   - Status: ${showNullCounts.status}`);

  // 6. Get total counts
  console.log("\n6. Database Statistics:");
  const [artistCount] = await db.select({ count: sql<number>`count(*)` }).from(artists);
  const [showCount] = await db.select({ count: sql<number>`count(*)` }).from(shows);
  const [venueCount] = await db.select({ count: sql<number>`count(*)` }).from(venues);
  const [songCount] = await db.select({ count: sql<number>`count(*)` }).from(songs);
  const [setlistCount] = await db.select({ count: sql<number>`count(*)` }).from(setlists);

  console.log(`   Total Artists: ${artistCount.count}`);
  console.log(`   Total Shows: ${showCount.count}`);
  console.log(`   Total Venues: ${venueCount.count}`);
  console.log(`   Total Songs: ${songCount.count}`);
  console.log(`   Total Setlists: ${setlistCount.count}`);

  console.log("\n=== TEST COMPLETE ===");
  process.exit(0);
}

testSetlistFMSync().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});