#!/usr/bin/env tsx

/**
 * Cleanup Test Data Script
 * Removes test import data to allow clean testing of import orchestration
 */

import { db } from '@repo/database';
import { artists, venues, shows, songs, artistSongs, importStatus } from '@repo/database';
import { eq, like } from 'drizzle-orm';

async function cleanupTestData() {
  console.log('🧹 Cleaning up test import data...');
  
  try {
    // Clean up artists that were created for testing (have tmp slug or specific test IDs)
    const testArtists = await db
      .select()
      .from(artists)
      .where(like(artists.slug, 'tm-%'));
    
    console.log(`Found ${testArtists.length} test artists to clean up`);
    
    for (const artist of testArtists) {
      console.log(`Cleaning up artist: ${artist.name} (${artist.slug})`);
      
      // Delete artist-song relationships
      await db.delete(artistSongs).where(eq(artistSongs.artistId, artist.id));
      
      // Delete import status
      await db.delete(importStatus).where(eq(importStatus.artistId, artist.id));
      
      // Delete shows for this artist
      const deletedShows = await db
        .delete(shows)
        .where(eq(shows.headlinerArtistId, artist.id))
        .returning();
      
      console.log(`  Deleted ${deletedShows.length} shows`);
      
      // Delete the artist
      await db.delete(artists).where(eq(artists.id, artist.id));
    }
    
    // Clean up orphaned venues (venues with no shows)
    const allVenues = await db.select({ id: venues.id, name: venues.name }).from(venues);
    let orphanedVenues = 0;
    
    for (const venue of allVenues) {
      const showCount = await db
        .select()
        .from(shows)
        .where(eq(shows.venueId, venue.id))
        .limit(1);
        
      if (showCount.length === 0) {
        await db.delete(venues).where(eq(venues.id, venue.id));
        orphanedVenues++;
      }
    }
    
    console.log(`Cleaned up ${orphanedVenues} orphaned venues`);
    
    // Clean up orphaned songs (songs with no artist relationships)
    const allSongs = await db.select({ id: songs.id, name: songs.name }).from(songs);
    let orphanedSongs = 0;
    
    for (const song of allSongs) {
      const artistRelationships = await db
        .select()
        .from(artistSongs)
        .where(eq(artistSongs.songId, song.id))
        .limit(1);
        
      if (artistRelationships.length === 0) {
        await db.delete(songs).where(eq(songs.id, song.id));
        orphanedSongs++;
      }
    }
    
    console.log(`Cleaned up ${orphanedSongs} orphaned songs`);
    
    console.log('✅ Test data cleanup completed successfully');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  cleanupTestData().then(() => process.exit(0));
}

export { cleanupTestData };