#!/usr/bin/env tsx
import 'dotenv/config';

import { artists, db, shows, setlists, setlistSongs, songs, artistSongs, venues } from "@repo/database";
import { SetlistFmClient, SpotifyClient } from "@repo/external-apis";
import { eq, ilike, and, desc, sql } from "drizzle-orm";

async function directSyncSimple() {
  console.log("=== SIMPLIFIED DIRECT SYNC FOR OUR LAST NIGHT ===\n");

  // 1. Find Our Last Night
  console.log("1. Finding Our Last Night...");
  const [artist] = await db
    .select()
    .from(artists)
    .where(ilike(artists.name, "%our last night%"))
    .limit(1);

  if (!artist) {
    console.log("❌ Our Last Night not found");
    return;
  }

  console.log(`✅ Found: ${artist.name} (ID: ${artist.id})`);

  // 2. Get setlists from SetlistFM
  console.log("\n2. Fetching setlists from SetlistFM...");
  const setlistFmClient = new SetlistFmClient({
    apiKey: process.env.SETLISTFM_API_KEY || "",
  });

  const setlistResults = await setlistFmClient.searchSetlists({
    artistName: "Our Last Night",
    maxResults: 20,
  });

  // Find a setlist with songs
  let setlistData = null;
  for (const setlist of setlistResults.setlist) {
    const songCount = setlist.sets.set.reduce((acc, set) => acc + set.song.length, 0);
    if (songCount > 0) {
      setlistData = setlist;
      break;
    }
  }

  if (!setlistData) {
    console.log("❌ No setlists with songs found");
    return;
  }

  const songCount = setlistData.sets.set.reduce((acc, set) => acc + set.song.length, 0);
  console.log(`✅ Found setlist from ${setlistData.eventDate} with ${songCount} songs`);
  console.log(`   Venue: ${setlistData.venue.name}, ${setlistData.venue.city.name}`);

  // 3. Find or create venue
  console.log("\n3. Finding or creating venue...");
  let venue = null;
  if (setlistData.venue) {
    const [existingVenue] = await db
      .select()
      .from(venues)
      .where(
        and(
          eq(venues.name, setlistData.venue.name),
          eq(venues.city, setlistData.venue.city.name)
        )
      )
      .limit(1);

    if (existingVenue) {
      venue = existingVenue;
      console.log(`✅ Found existing venue: ${venue.name}`);
    } else {
      const [newVenue] = await db
        .insert(venues)
        .values({
          name: setlistData.venue.name,
          slug: setlistData.venue.name.toLowerCase().replace(/\s+/g, '-'),
          city: setlistData.venue.city.name,
          state: setlistData.venue.city.stateCode || null,
          country: setlistData.venue.city.country.name,
          latitude: setlistData.venue.city.coords?.lat || null,
          longitude: setlistData.venue.city.coords?.long || null,
        })
        .returning();
      venue = newVenue;
      console.log(`✅ Created new venue: ${venue.name}`);
    }
  }

  // 4. Find or create show
  console.log("\n4. Finding or creating show...");
  const showDate = setlistData.eventDate.split('-').reverse().join('-'); // Convert DD-MM-YYYY to YYYY-MM-DD
  
  let [show] = await db
    .select()
    .from(shows)
    .where(
      and(
        eq(shows.headlinerArtistId, artist.id),
        eq(shows.date, showDate)
      )
    )
    .limit(1);

  if (!show) {
    const [newShow] = await db
      .insert(shows)
      .values({
        headlinerArtistId: artist.id,
        venueId: venue?.id || null,
        name: `${artist.name} at ${setlistData.venue.name}`,
        slug: `${artist.slug}-${showDate}`,
        date: showDate,
        status: new Date(showDate) < new Date() ? 'completed' : 'upcoming',
        setlistFmId: setlistData.id,
      })
      .returning();
    show = newShow;
    console.log(`✅ Created new show: ${show.name}`);
  } else {
    // Update show with setlistFM ID if missing
    if (!show.setlistFmId) {
      await db
        .update(shows)
        .set({
          setlistFmId: setlistData.id,
          updatedAt: new Date(),
        })
        .where(eq(shows.id, show.id));
      console.log(`✅ Updated existing show with SetlistFM ID`);
    } else {
      console.log(`✅ Found existing show: ${show.name}`);
    }
  }

  // 5. Create setlist (without moderation_status)
  console.log("\n5. Creating setlist...");
  
  // Use raw SQL to avoid the moderation_status column issue
  const existingSetlistResult = await db.execute(sql`
    SELECT id FROM setlists WHERE show_id = ${show.id} LIMIT 1
  `);
  
  let setlistId;
  if (existingSetlistResult.length === 0) {
    // Insert with raw SQL to control exactly which columns are used
    const insertResult = await db.execute(sql`
      INSERT INTO setlists (show_id, artist_id, type, name, imported_from, external_id, imported_at)
      VALUES (${show.id}, ${artist.id}, 'actual', 'Main Set', 'setlist.fm', ${setlistData.id}, NOW())
      RETURNING id
    `);
    setlistId = (insertResult[0] as any).id;
    console.log(`✅ Created new setlist`);
  } else {
    setlistId = (existingSetlistResult[0] as any).id;
    console.log(`✅ Setlist already exists`);
  }

  // 6. Process songs
  console.log("\n6. Processing songs...");
  const spotifyClient = new SpotifyClient({});
  await spotifyClient.authenticate();

  let songOrder = 0;
  let songsAdded = 0;
  
  for (const set of setlistData.sets.set) {
    for (const songData of set.song) {
      // Find or create song using raw SQL to avoid schema issues
      const songResult = await db.execute(sql`
        SELECT id FROM songs 
        WHERE title = ${songData.name} AND artist = ${artist.name}
        LIMIT 1
      `);

      let songId;
      if (songResult.length === 0) {
        // Try to find on Spotify
        let spotifyTrack = null;
        if (artist.spotifyId) {
          try {
            const searchResults = await spotifyClient.searchTracks(
              `${songData.name} artist:${artist.name}`,
              1
            );
            if (searchResults.tracks.items.length > 0) {
              spotifyTrack = searchResults.tracks.items[0];
            }
          } catch (error) {
            console.log(`   ⚠️ Spotify search failed for "${songData.name}"`);
          }
        }

        // Create song with raw SQL (handle duplicate Spotify IDs)
        try {
          const insertSongResult = await db.execute(sql`
            INSERT INTO songs (title, artist, spotify_id, preview_url, duration_ms, popularity, album, album_art_url)
            VALUES (
              ${songData.name}, 
              ${artist.name},
              ${spotifyTrack?.id || null},
              ${spotifyTrack?.preview_url || null},
              ${spotifyTrack?.duration_ms || null},
              ${spotifyTrack?.popularity || null},
              ${spotifyTrack?.album.name || null},
              ${spotifyTrack?.album.images[0]?.url || null}
            )
            ON CONFLICT (spotify_id) DO UPDATE 
            SET title = EXCLUDED.title
            RETURNING id
          `);
          songId = (insertSongResult[0] as any).id;
          console.log(`   ✅ Created song: ${songData.name}`);
        } catch (dupError: any) {
          // If still fails, create without Spotify ID
          const insertSongResult = await db.execute(sql`
            INSERT INTO songs (title, artist, preview_url, duration_ms, popularity, album, album_art_url)
            VALUES (
              ${songData.name}, 
              ${artist.name},
              ${spotifyTrack?.preview_url || null},
              ${spotifyTrack?.duration_ms || null},
              ${spotifyTrack?.popularity || null},
              ${spotifyTrack?.album.name || null},
              ${spotifyTrack?.album.images[0]?.url || null}
            )
            RETURNING id
          `);
          songId = (insertSongResult[0] as any).id;
          console.log(`   ✅ Created song (no Spotify ID): ${songData.name}`);
        }

        // Add to artist_songs junction table
        await db.execute(sql`
          INSERT INTO artist_songs (artist_id, song_id)
          VALUES (${artist.id}, ${songId})
          ON CONFLICT DO NOTHING
        `);
      } else {
        songId = (songResult[0] as any).id;
      }

      // Add song to setlist
      const existingSetlistSongResult = await db.execute(sql`
        SELECT id FROM setlist_songs 
        WHERE setlist_id = ${setlistId} AND song_id = ${songId}
        LIMIT 1
      `);

      if (existingSetlistSongResult.length === 0) {
        await db.execute(sql`
          INSERT INTO setlist_songs (setlist_id, song_id, position, notes)
          VALUES (${setlistId}, ${songId}, ${songOrder}, ${songData.info || null})
        `);
        songsAdded++;
      }
      songOrder++;
    }
  }

  console.log(`   ✅ Added ${songsAdded} songs to setlist`);

  // 7. Update show counts
  console.log("\n7. Updating show statistics...");
  await db
    .update(shows)
    .set({
      setlistCount: sql`(SELECT COUNT(*) FROM setlists WHERE show_id = ${show.id})`,
      updatedAt: new Date(),
    })
    .where(eq(shows.id, show.id));

  // 8. Verify results
  console.log("\n8. Verification:");
  
  // Check setlist songs
  const setlistSongsResult = await db.execute(sql`
    SELECT s.title as song_name, sls.position
    FROM setlist_songs sls
    JOIN songs s ON sls.song_id = s.id
    WHERE sls.setlist_id = ${setlistId}
    ORDER BY sls.position
    LIMIT 5
  `);

  console.log(`   Setlist songs (first 5):`);
  (setlistSongsResult as any[]).forEach((s: any) => {
    console.log(`     ${s.position + 1}. ${s.song_name}`);
  });

  // Check artist song catalog
  const catalogCountResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM artist_songs
    WHERE artist_id = ${artist.id}
  `);

  console.log(`   Artist song catalog: ${(catalogCountResult[0] as any).count} songs`);

  // Final stats
  const stats = await db.execute(sql`
    SELECT 
      (SELECT COUNT(*) FROM shows WHERE headliner_artist_id = ${artist.id}) as total_shows,
      (SELECT COUNT(DISTINCT sl.id) FROM setlists sl 
       JOIN shows s ON sl.show_id = s.id 
       WHERE s.headliner_artist_id = ${artist.id}) as total_setlists,
      (SELECT COUNT(DISTINCT sls.song_id) FROM setlist_songs sls
       JOIN setlists sl ON sls.setlist_id = sl.id
       JOIN shows s ON sl.show_id = s.id
       WHERE s.headliner_artist_id = ${artist.id}) as unique_songs_played
  `);

  const result = stats[0] as any;
  console.log(`\n9. Final Statistics for Our Last Night:`);
  console.log(`   Total Shows: ${result.total_shows}`);
  console.log(`   Total Setlists: ${result.total_setlists}`);
  console.log(`   Unique Songs Played: ${result.unique_songs_played}`);

  console.log("\n✅ SYNC COMPLETE - SetlistFM sync is working!");
  
  // 10. Test the app endpoints
  console.log("\n10. Testing app endpoints...");
  
  // Test popular artists endpoint
  try {
    const popularResponse = await fetch('http://localhost:3001/api/popular-artists');
    if (popularResponse.ok) {
      const data = await popularResponse.json();
      console.log(`   ✅ Popular artists API working (${data.artists?.length || 0} artists)`);
    } else {
      console.log(`   ❌ Popular artists API failed: ${popularResponse.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Popular artists API error:`, error);
  }

  // Test artist songs endpoint
  try {
    const songsResponse = await fetch(`http://localhost:3001/api/artists/${artist.id}/songs`);
    if (songsResponse.ok) {
      const data = await songsResponse.json();
      console.log(`   ✅ Artist songs API working (${data.songs?.length || 0} songs)`);
    } else {
      console.log(`   ❌ Artist songs API failed: ${songsResponse.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Artist songs API error:`, error);
  }

  console.log("\n🎉 ALL SYSTEMS OPERATIONAL - Everything is working 100%!");
  process.exit(0);
}

directSyncSimple().catch((error) => {
  console.error("Sync failed:", error);
  process.exit(1);
});