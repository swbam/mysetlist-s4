#!/usr/bin/env tsx
import 'dotenv/config';

import { artists, db, shows, setlists, setlistSongs, songs, artistSongs, venues } from "@repo/database";
import { SetlistFmClient, SetlistSyncService, SpotifyClient } from "@repo/external-apis";
import { eq, ilike, and, desc, sql } from "drizzle-orm";

async function directSyncOurLastNight() {
  console.log("=== DIRECT SYNC FOR OUR LAST NIGHT ===\n");

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

  // 5. Create setlist
  console.log("\n5. Creating setlist...");
  const [existingSetlist] = await db
    .select()
    .from(setlists)
    .where(eq(setlists.showId, show.id))
    .limit(1);

  let setlist = existingSetlist;
  if (!existingSetlist) {
    const [newSetlist] = await db
      .insert(setlists)
      .values({
        showId: show.id,
        artistId: artist.id,
        type: "actual" as const,
        name: "Main Set",
        importedFrom: "setlist.fm",
        externalId: setlistData.id,
        importedAt: new Date(),
      })
      .returning();
    setlist = newSetlist;
    console.log(`✅ Created new setlist`);
  } else {
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
      // Find or create song
      let [song] = await db
        .select()
        .from(songs)
        .where(
          and(
            eq(songs.title, songData.name),
            eq(songs.artist, artist.name)
          )
        )
        .limit(1);

      if (!song) {
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

        // Create song
        const [newSong] = await db
          .insert(songs)
          .values({
            title: songData.name,
            artist: artist.name,
            spotifyId: spotifyTrack?.id || null,
            previewUrl: spotifyTrack?.preview_url || null,
            durationMs: spotifyTrack?.duration_ms || null,
            popularity: spotifyTrack?.popularity || null,
            album: spotifyTrack?.album.name || null,
            albumArtUrl: spotifyTrack?.album.images[0]?.url || null,
          })
          .returning();
        song = newSong;
        console.log(`   ✅ Created song: ${song.title}`);

        // Add to artist_songs junction table
        await db
          .insert(artistSongs)
          .values({
            artistId: artist.id,
            songId: song.id,
          })
          .onConflictDoNothing();
      }

      // Add song to setlist
      const [existingSetlistSong] = await db
        .select()
        .from(setlistSongs)
        .where(
          and(
            eq(setlistSongs.setlistId, setlist.id),
            eq(setlistSongs.songId, song.id)
          )
        )
        .limit(1);

      if (!existingSetlistSong) {
        await db
          .insert(setlistSongs)
          .values({
            setlistId: setlist.id,
            songId: song.id,
            position: songOrder++,
            notes: songData.info || null,
          });
        songsAdded++;
      }
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
  const setlistSongsList = await db
    .select({
      songName: songs.title,
      position: setlistSongs.position,
    })
    .from(setlistSongs)
    .innerJoin(songs, eq(setlistSongs.songId, songs.id))
    .where(eq(setlistSongs.setlistId, setlist.id))
    .orderBy(setlistSongs.position)
    .limit(5);

  console.log(`   Setlist songs (first 5):`);
  setlistSongsList.forEach(s => {
    console.log(`     ${s.position + 1}. ${s.songName}`);
  });

  // Check artist song catalog
  const catalogCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(artistSongs)
    .where(eq(artistSongs.artistId, artist.id));

  console.log(`   Artist song catalog: ${catalogCount[0].count} songs`);

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

  console.log("\n✅ SYNC COMPLETE - Everything is working!");
  process.exit(0);
}

directSyncOurLastNight().catch((error) => {
  console.error("Sync failed:", error);
  process.exit(1);
});