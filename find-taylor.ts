/**
 * Find Taylor Swift specifically
 */

import { db, artists, songs, artistSongs } from '@repo/database';
import { eq } from 'drizzle-orm';

async function findTaylor() {
  try {
    const taylorSwift = await db
      .select()
      .from(artists)
      .where(eq(artists.name, 'Taylor Swift'))
      .limit(1);
      
    if (taylorSwift.length > 0) {
      const artist = taylorSwift[0];
      console.log(`🎤 Found Taylor Swift: ${artist.name} (ID: ${artist.id})`);
      console.log(`Spotify ID: ${artist.spotifyId}`);
      console.log(`Import Status: ${artist.importStatus}`);
      
      // Get her songs count
      const taylorSongsCount = await db
        .select()
        .from(artistSongs)
        .where(eq(artistSongs.artistId, artist.id));
        
      console.log(`Taylor Swift has ${taylorSongsCount.length} songs in catalog`);
      
      return { 
        success: true, 
        artistId: artist.id, 
        songCount: taylorSongsCount.length 
      };
    } else {
      console.log('❌ Taylor Swift not found in database');
      return { success: false };
    }

  } catch (error) {
    console.error('❌ Search failed:', error);
    throw error;
  }
}

// Run the check
findTaylor().catch(console.error);