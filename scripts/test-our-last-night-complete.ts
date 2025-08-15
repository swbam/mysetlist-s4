#!/usr/bin/env tsx
import 'dotenv/config';

import { artists, db, shows, setlists, setlistSongs, songs, artistSongs } from "@repo/database";
import { SetlistFmClient, SetlistSyncService, TicketmasterClient } from "@repo/external-apis";
import { eq, ilike, and, desc, sql } from "drizzle-orm";

async function testOurLastNightComplete() {
  console.log("=== COMPLETE OUR LAST NIGHT TEST ===\n");

  // 1. Find Our Last Night
  console.log("1. Finding Our Last Night in database...");
  const [ourLastNight] = await db
    .select()
    .from(artists)
    .where(ilike(artists.name, "%our last night%"))
    .limit(1);

  if (!ourLastNight) {
    console.log("❌ Our Last Night not found");
    return;
  }

  console.log(`✅ Found: ${ourLastNight.name} (ID: ${ourLastNight.id})`);
  console.log(`   Missing Ticketmaster ID: ${!ourLastNight.ticketmasterId}`);

  // 2. Add Ticketmaster ID if missing
  if (!ourLastNight.ticketmasterId) {
    console.log("\n2. Adding Ticketmaster ID...");
    const tmClient = new TicketmasterClient({
      apiKey: process.env.TICKETMASTER_API_KEY || "",
    });

    try {
      const tmResult = await tmClient.searchAttractions({
        keyword: "Our Last Night",
        size: 1,
      });

      if (tmResult._embedded?.attractions?.[0]) {
        const attraction = tmResult._embedded.attractions[0];
        await db
          .update(artists)
          .set({
            ticketmasterId: attraction.id,
            updatedAt: new Date(),
          })
          .where(eq(artists.id, ourLastNight.id));
        console.log(`   ✅ Added Ticketmaster ID: ${attraction.id}`);
      }
    } catch (error) {
      console.error("   ❌ Failed to get Ticketmaster ID:", error);
    }
  }

  // 3. Search for past setlists with actual songs
  console.log("\n3. Searching for past Our Last Night setlists with songs...");
  const setlistFmClient = new SetlistFmClient({
    apiKey: process.env.SETLISTFM_API_KEY || "",
  });

  const setlistResults = await setlistFmClient.searchSetlists({
    artistName: "Our Last Night",
    maxResults: 20,
  });

  // Find a setlist with songs
  let setlistWithSongs = null;
  for (const setlist of setlistResults.setlist) {
    const songCount = setlist.sets.set.reduce((acc, set) => acc + set.song.length, 0);
    if (songCount > 0) {
      setlistWithSongs = setlist;
      break;
    }
  }

  if (!setlistWithSongs) {
    console.log("   ❌ No setlists found with songs");
    return;
  }

  const songCount = setlistWithSongs.sets.set.reduce((acc, set) => acc + set.song.length, 0);
  console.log(`   ✅ Found setlist from ${setlistWithSongs.eventDate} with ${songCount} songs`);
  console.log(`   Venue: ${setlistWithSongs.venue.name}, ${setlistWithSongs.venue.city.name}`);
  
  // Show first 5 songs
  const firstSongs = setlistWithSongs.sets.set[0]?.song.slice(0, 5).map(s => s.name) || [];
  console.log(`   First songs: ${firstSongs.join(", ")}`);

  // 4. Sync this setlist
  console.log("\n4. Syncing setlist to database...");
  const syncService = new SetlistSyncService();
  
  try {
    await syncService.syncSetlistFromSetlistFm(setlistWithSongs);
    console.log("   ✅ Setlist sync completed");
  } catch (error) {
    console.error("   ❌ Sync error:", error);
  }

  // 5. Verify the sync worked
  console.log("\n5. Verifying sync results...");
  
  // Check if show was created
  const showDate = setlistWithSongs.eventDate.split('-').reverse().join('-');
  const [show] = await db
    .select()
    .from(shows)
    .where(
      and(
        eq(shows.headlinerArtistId, ourLastNight.id),
        eq(shows.date, showDate)
      )
    )
    .limit(1);

  if (show) {
    console.log(`   ✅ Show found: ${show.name} (ID: ${show.id})`);
    
    // Check setlist
    const [setlist] = await db
      .select()
      .from(setlists)
      .where(eq(setlists.showId, show.id))
      .limit(1);

    if (setlist) {
      console.log(`   ✅ Setlist found (ID: ${setlist.id})`);
      
      // Check setlist songs
      const setlistSongsList = await db
        .select({
          songName: songs.name,
          position: setlistSongs.position,
        })
        .from(setlistSongs)
        .innerJoin(songs, eq(setlistSongs.songId, songs.id))
        .where(eq(setlistSongs.setlistId, setlist.id))
        .orderBy(setlistSongs.position);

      console.log(`   ✅ Setlist has ${setlistSongsList.length} songs`);
      if (setlistSongsList.length > 0) {
        console.log("   Sample songs in setlist:");
        setlistSongsList.slice(0, 5).forEach(s => {
          console.log(`     ${s.position}. ${s.songName}`);
        });
      }
    } else {
      console.log("   ❌ No setlist found for show");
    }
  } else {
    console.log("   ❌ Show not created");
  }

  // 6. Check artist song catalog
  console.log("\n6. Checking Our Last Night song catalog...");
  const songCatalog = await db
    .select({
      songName: songs.name,
      spotifyId: songs.spotifyId,
    })
    .from(artistSongs)
    .innerJoin(songs, eq(artistSongs.songId, songs.id))
    .where(eq(artistSongs.artistId, ourLastNight.id))
    .limit(10);

  console.log(`   Artist has ${songCatalog.length} songs in catalog`);
  if (songCatalog.length > 0) {
    console.log("   Sample songs:");
    songCatalog.slice(0, 5).forEach(s => {
      console.log(`     - ${s.songName} ${s.spotifyId ? '✓' : '(no Spotify ID)'}`);
    });
  }

  // 7. Check all Our Last Night shows
  console.log("\n7. All Our Last Night shows in database:");
  const allShows = await db
    .select()
    .from(shows)
    .where(eq(shows.headlinerArtistId, ourLastNight.id))
    .orderBy(desc(shows.date))
    .limit(5);

  console.log(`   Total shows: ${allShows.length}`);
  allShows.forEach(show => {
    console.log(`   - ${show.date}: ${show.name} (${show.status})`);
  });

  // 8. Final statistics
  console.log("\n8. Final Database Statistics for Our Last Night:");
  const stats = await db.execute(sql`
    SELECT 
      (SELECT COUNT(*) FROM shows WHERE headliner_artist_id = ${ourLastNight.id}) as total_shows,
      (SELECT COUNT(DISTINCT sl.id) FROM setlists sl 
       JOIN shows s ON sl.show_id = s.id 
       WHERE s.headliner_artist_id = ${ourLastNight.id}) as total_setlists,
      (SELECT COUNT(DISTINCT song_id) FROM artist_songs WHERE artist_id = ${ourLastNight.id}) as total_songs
  `);

  const result = stats[0] as any;
  console.log(`   Total Shows: ${result.total_shows}`);
  console.log(`   Total Setlists: ${result.total_setlists}`);
  console.log(`   Total Songs in Catalog: ${result.total_songs}`);

  console.log("\n=== TEST COMPLETE ===");
  process.exit(0);
}

testOurLastNightComplete().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});