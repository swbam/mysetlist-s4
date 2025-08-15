#!/usr/bin/env tsx
import 'dotenv/config';

import { artists, db, shows, setlists, songs, artistSongs } from "@repo/database";
import { SpotifyClient, TicketmasterClient } from "@repo/external-apis";
import { eq, isNull, isNotNull, and, sql } from "drizzle-orm";

async function fixMissingData() {
  console.log("=== FIXING MISSING DATA IN DATABASE ===\n");

  const spotifyClient = new SpotifyClient({});
  const ticketmasterClient = new TicketmasterClient({
    apiKey: process.env.TICKETMASTER_API_KEY || "",
  });

  // 1. Fix artists missing Ticketmaster IDs
  console.log("1. Fixing artists with Spotify ID but no Ticketmaster ID...");
  const artistsNeedingTM = await db
    .select()
    .from(artists)
    .where(
      and(
        isNotNull(artists.spotifyId),
        isNull(artists.ticketmasterId)
      )
    )
    .limit(20);

  console.log(`   Found ${artistsNeedingTM.length} artists needing Ticketmaster IDs`);

  let tmSuccessCount = 0;
  let tmErrorCount = 0;
  
  for (const artist of artistsNeedingTM.slice(0, 10)) {
    try {
      console.log(`   Searching Ticketmaster for: ${artist.name}`);
      
      // Add timeout wrapper for API call
      const tmPromise = ticketmasterClient.searchAttractions({
        keyword: artist.name,
        size: 1,
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Ticketmaster API timeout')), 5000)
      );
      
      const tmResult = await Promise.race([tmPromise, timeoutPromise]) as any;

      if (tmResult._embedded?.attractions?.[0]) {
        const attraction = tmResult._embedded.attractions[0];
        if (attraction.name.toLowerCase() === artist.name.toLowerCase() || 
            attraction.name.toLowerCase().includes(artist.name.toLowerCase()) ||
            artist.name.toLowerCase().includes(attraction.name.toLowerCase())) {
          await db
            .update(artists)
            .set({
              ticketmasterId: attraction.id,
              updatedAt: new Date(),
            })
            .where(eq(artists.id, artist.id));
          console.log(`   ✅ Updated ${artist.name} with TM ID: ${attraction.id}`);
          tmSuccessCount++;
        } else {
          console.log(`   ⚠️ Name mismatch: "${attraction.name}" vs "${artist.name}"`);
        }
      } else {
        console.log(`   ❌ No Ticketmaster match for ${artist.name}`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`   ❌ Error for ${artist.name}: ${error.message}`);
      tmErrorCount++;
      
      // Continue to next artist on error
      if (tmErrorCount > 3) {
        console.log(`   ⚠️ Too many Ticketmaster errors (${tmErrorCount}), skipping remaining...`);
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`   Ticketmaster update summary: ${tmSuccessCount} success, ${tmErrorCount} errors`);

  // 2. Fix artists missing Spotify IDs
  console.log("\n2. Fixing artists with Ticketmaster ID but no Spotify ID...");
  await spotifyClient.authenticate();
  
  const artistsNeedingSpotify = await db
    .select()
    .from(artists)
    .where(
      and(
        isNotNull(artists.ticketmasterId),
        isNull(artists.spotifyId)
      )
    )
    .limit(20);

  console.log(`   Found ${artistsNeedingSpotify.length} artists needing Spotify IDs`);

  let spotifySuccessCount = 0;
  let spotifyErrorCount = 0;
  
  for (const artist of artistsNeedingSpotify.slice(0, 10)) {
    try {
      console.log(`   Searching Spotify for: ${artist.name}`);
      const spotifyResult = await spotifyClient.searchArtists(artist.name, 1);

      if (spotifyResult.artists.items.length > 0) {
        const spotifyArtist = spotifyResult.artists.items[0]!;
        
        // Check for duplicate Spotify ID
        const existingWithSpotifyId = await db
          .select()
          .from(artists)
          .where(eq(artists.spotifyId, spotifyArtist.id))
          .limit(1);
        
        if (existingWithSpotifyId.length > 0 && existingWithSpotifyId[0]!.id !== artist.id) {
          console.log(`   ⚠️ Spotify ID ${spotifyArtist.id} already exists for ${existingWithSpotifyId[0]!.name}`);
          continue;
        }
        
        await db
          .update(artists)
          .set({
            spotifyId: spotifyArtist.id,
            imageUrl: spotifyArtist.images[0]?.url || artist.imageUrl,
            smallImageUrl: spotifyArtist.images[2]?.url || artist.smallImageUrl,
            genres: JSON.stringify(spotifyArtist.genres),
            popularity: spotifyArtist.popularity,
            followers: spotifyArtist.followers.total,
            updatedAt: new Date(),
          })
          .where(eq(artists.id, artist.id));
        console.log(`   ✅ Updated ${artist.name} with Spotify data`);
        spotifySuccessCount++;
      } else {
        console.log(`   ❌ No Spotify match for ${artist.name}`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`   ❌ Error for ${artist.name}: ${error.message}`);
      spotifyErrorCount++;
      
      if (spotifyErrorCount > 3) {
        console.log(`   ⚠️ Too many Spotify errors (${spotifyErrorCount}), skipping remaining...`);
        break;
      }
    }
  }
  
  console.log(`   Spotify update summary: ${spotifySuccessCount} success, ${spotifyErrorCount} errors`);

  // 3. Fix artists missing images
  console.log("\n3. Fixing artists with no image URL...");
  const artistsNeedingImages = await db
    .select()
    .from(artists)
    .where(
      and(
        isNotNull(artists.spotifyId),
        isNull(artists.imageUrl)
      )
    )
    .limit(10);

  console.log(`   Found ${artistsNeedingImages.length} artists needing images`);

  for (const artist of artistsNeedingImages) {
    try {
      if (artist.spotifyId) {
        const spotifyArtist = await spotifyClient.getArtist(artist.spotifyId);
        
        if (spotifyArtist.images && spotifyArtist.images.length > 0) {
          await db
            .update(artists)
            .set({
              imageUrl: spotifyArtist.images[0]?.url,
              smallImageUrl: spotifyArtist.images[2]?.url || spotifyArtist.images[0]?.url,
              updatedAt: new Date(),
            })
            .where(eq(artists.id, artist.id));
          console.log(`   ✅ Updated ${artist.name} with images`);
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`   ❌ Error for ${artist.name}:`, error);
    }
  }

  // 4. Database statistics after fixes
  console.log("\n4. Final Database Statistics:");
  const stats = await db.execute(sql`
    SELECT 
      (SELECT COUNT(*) FROM artists) as total_artists,
      (SELECT COUNT(*) FROM artists WHERE spotify_id IS NOT NULL) as has_spotify,
      (SELECT COUNT(*) FROM artists WHERE ticketmaster_id IS NOT NULL) as has_ticketmaster,
      (SELECT COUNT(*) FROM artists WHERE image_url IS NOT NULL) as has_image,
      (SELECT COUNT(*) FROM shows) as total_shows,
      (SELECT COUNT(*) FROM venues) as total_venues,
      (SELECT COUNT(*) FROM songs) as total_songs,
      (SELECT COUNT(*) FROM setlists) as total_setlists
  `);

  const result = stats[0] as any;
  console.log(`   Total Artists: ${result.total_artists}`);
  console.log(`   - With Spotify ID: ${result.has_spotify} (${Math.round(result.has_spotify / result.total_artists * 100)}%)`);
  console.log(`   - With Ticketmaster ID: ${result.has_ticketmaster} (${Math.round(result.has_ticketmaster / result.total_artists * 100)}%)`);
  console.log(`   - With Image: ${result.has_image} (${Math.round(result.has_image / result.total_artists * 100)}%)`);
  console.log(`   Total Shows: ${result.total_shows}`);
  console.log(`   Total Venues: ${result.total_venues}`);
  console.log(`   Total Songs: ${result.total_songs}`);
  console.log(`   Total Setlists: ${result.total_setlists}`);

  console.log("\n=== FIXES COMPLETE ===");
  process.exit(0);
}

fixMissingData().catch((error) => {
  console.error("Fix failed:", error);
  process.exit(1);
});