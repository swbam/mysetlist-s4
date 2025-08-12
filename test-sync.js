// Test sync orchestration for Metallica
const fetch = require('node-fetch');

async function testSync() {
  const artistId = '609416b2-e4f4-41e1-9e17-3cffd351ab48'; // Metallica's ID from database
  
  console.log('🎸 Testing Sync Orchestration for Metallica\n');
  
  try {
    // Trigger full sync orchestration
    console.log('1️⃣ Triggering sync orchestration...');
    const syncResponse = await fetch('http://localhost:3001/api/sync/orchestration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        artistId: artistId,
        syncSongs: true,
        syncShows: true, 
        syncSetlists: true
      })
    });

    const syncResult = await syncResponse.json();
    console.log('Sync response:', syncResult);

    // Wait for sync to complete
    console.log('\n⏳ Waiting for sync to complete (10 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Verify imported data directly from database
    console.log('\n2️⃣ Checking database for imported data...\n');
    
    // Use direct database queries
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });
    
    await client.connect();
    
    // Check artist
    const artistResult = await client.query(
      'SELECT name, ticketmaster_id, spotify_id, mbid FROM artists WHERE id = $1',
      [artistId]
    );
    console.log('📊 Artist:', artistResult.rows[0]);
    
    // Check songs
    const songsResult = await client.query(
      `SELECT COUNT(*) as count FROM songs s 
       JOIN artist_songs ars ON s.id = ars.song_id 
       WHERE ars.artist_id = $1`,
      [artistId]
    );
    console.log('\n🎵 Songs imported:', songsResult.rows[0].count);
    
    // Get sample songs
    const sampleSongs = await client.query(
      `SELECT s.title, s.album FROM songs s 
       JOIN artist_songs ars ON s.id = ars.song_id 
       WHERE ars.artist_id = $1 
       LIMIT 5`,
      [artistId]
    );
    if (sampleSongs.rows.length > 0) {
      console.log('Sample songs:');
      sampleSongs.rows.forEach(song => {
        console.log(`  - ${song.title} (${song.album})`);
      });
    }
    
    // Check shows
    const showsResult = await client.query(
      'SELECT COUNT(*) as count FROM shows WHERE headliner_artist_id = $1',
      [artistId]
    );
    console.log('\n🎤 Shows imported:', showsResult.rows[0].count);
    
    // Get sample shows
    const sampleShows = await client.query(
      `SELECT s.name, v.name as venue_name, s.date 
       FROM shows s 
       LEFT JOIN venues v ON s.venue_id = v.id 
       WHERE s.headliner_artist_id = $1 
       LIMIT 3`,
      [artistId]
    );
    if (sampleShows.rows.length > 0) {
      console.log('Sample shows:');
      sampleShows.rows.forEach(show => {
        console.log(`  - ${show.name} at ${show.venue_name} on ${show.date}`);
      });
    }
    
    // Check setlists
    const setlistsResult = await client.query(
      `SELECT COUNT(*) as count FROM setlists sl 
       JOIN shows s ON sl.show_id = s.id 
       WHERE s.headliner_artist_id = $1`,
      [artistId]
    );
    console.log('\n📝 Setlists created:', setlistsResult.rows[0].count);
    
    // Get setlist details
    const setlistDetails = await client.query(
      `SELECT sl.name, sl.type, COUNT(sls.id) as song_count
       FROM setlists sl 
       JOIN shows s ON sl.show_id = s.id
       LEFT JOIN setlist_songs sls ON sl.id = sls.setlist_id
       WHERE s.headliner_artist_id = $1
       GROUP BY sl.id, sl.name, sl.type
       LIMIT 3`,
      [artistId]
    );
    if (setlistDetails.rows.length > 0) {
      console.log('Sample setlists:');
      setlistDetails.rows.forEach(setlist => {
        console.log(`  - ${setlist.name} (${setlist.type}) with ${setlist.song_count} songs`);
      });
    }
    
    await client.end();
    
    console.log('\n✅ Sync test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Run the test
testSync();