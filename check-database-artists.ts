/**
 * Quick check for artists in database
 */

import { db, artists, songs, artistSongs } from '@repo/database';
import { eq } from 'drizzle-orm';

async function checkDatabase() {
  console.log('📊 Checking database for artists and songs...\n');

  try {
    // Check artists
    const allArtists = await db.select().from(artists);
    console.log(`Found ${allArtists.length} artists in database:`);
    
    allArtists.forEach((artist, i) => {
      console.log(`  ${i + 1}. ${artist.name} (ID: ${artist.id}, Spotify: ${artist.spotifyId})`);
    });
    console.log('');

    // Check songs
    const allSongs = await db.select().from(songs).limit(5);
    console.log(`Sample of songs in database (first 5):`);
    
    allSongs.forEach((song, i) => {
      console.log(`  ${i + 1}. ${song.name} by ${song.artist} (ID: ${song.id})`);
    });
    console.log('');

    // Check relationships
    const relationships = await db.select().from(artistSongs).limit(5);
    console.log(`Sample artist-song relationships (first 5):`);
    
    relationships.forEach((rel, i) => {
      console.log(`  ${i + 1}. Artist ${rel.artistId} -> Song ${rel.songId}`);
    });
    console.log('');

    // Find Taylor Swift specifically
    const taylorSwift = await db
      .select()
      .from(artists)
      .where(eq(artists.name, 'Taylor Swift'))
      .limit(1);
      
    if (taylorSwift.length > 0) {
      const artist = taylorSwift[0];
      console.log(`🎤 Found Taylor Swift: ${artist.name} (ID: ${artist.id})`);
      
      // Get her songs
      const taylorSongs = await db
        .select({
          name: songs.name,
          popularity: songs.popularity,
        })
        .from(artistSongs)
        .innerJoin(songs, eq(artistSongs.songId, songs.id))
        .where(eq(artistSongs.artistId, artist.id))
        .limit(10);
        
      console.log(`Taylor Swift has ${taylorSongs.length} songs in catalog:`);
      taylorSongs.forEach((song, i) => {
        console.log(`  ${i + 1}. ${song.name} (Popularity: ${song.popularity})`);
      });
      
      return { 
        success: true, 
        artistId: artist.id, 
        songCount: taylorSongs.length 
      };
    } else {
      console.log('❌ Taylor Swift not found in database');
      return { success: false };
    }

  } catch (error) {
    console.error('❌ Database check failed:', error);
    throw error;
  }
}

// Run the check
checkDatabase().catch(console.error);