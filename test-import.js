// Test the complete artist import flow
const fetch = require('node-fetch');

async function testCompleteImport() {
  console.log('🚀 Testing Complete Artist Import Flow\n');
  
  // Test with Metallica - a well-known artist with active tours
  const artistData = {
    ticketmasterId: 'K8vZ9174v77', // Metallica's real Ticketmaster ID
    artistName: 'Metallica'
  };

  try {
    // Step 1: Import artist
    console.log('1️⃣ Importing artist...');
    const importResponse = await fetch('http://localhost:3001/api/artists/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(artistData)
    });

    const importResult = await importResponse.json();
    console.log('✅ Artist imported:', importResult);

    if (!importResult.artistId) {
      throw new Error('Artist ID not returned from import');
    }

    // Wait a bit for import to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Trigger full sync orchestration
    console.log('\n2️⃣ Triggering full sync orchestration...');
    const syncResponse = await fetch('http://localhost:3001/api/sync/orchestration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        artistId: importResult.artistId,
        syncSongs: true,
        syncShows: true,
        syncSetlists: true
      })
    });

    const syncResult = await syncResponse.json();
    console.log('✅ Sync orchestration triggered:', syncResult);

    // Wait for sync to complete
    console.log('\n⏳ Waiting for sync to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 3: Verify data was imported
    console.log('\n3️⃣ Verifying imported data...');
    
    // Check artist details
    const artistResponse = await fetch(`http://localhost:3001/api/artists/${importResult.artistId}`);
    const artist = await artistResponse.json();
    console.log('\n📊 Artist Data:');
    console.log('  - Name:', artist.name);
    console.log('  - Ticketmaster ID:', artist.ticketmasterId);
    console.log('  - Spotify ID:', artist.spotifyId);
    console.log('  - Setlist.fm MBID:', artist.mbid);

    // Check songs
    const songsResponse = await fetch(`http://localhost:3001/api/artists/${importResult.artistId}/songs`);
    const songs = await songsResponse.json();
    console.log('\n🎵 Songs imported:', songs.length);
    if (songs.length > 0) {
      console.log('  Sample songs:', songs.slice(0, 5).map(s => s.title).join(', '));
    }

    // Check shows
    const showsResponse = await fetch(`http://localhost:3001/api/artists/${importResult.artistId}/shows`);
    const shows = await showsResponse.json();
    console.log('\n🎤 Shows imported:', shows.length);
    if (shows.length > 0) {
      console.log('  Sample shows:', shows.slice(0, 3).map(s => `${s.name} at ${s.venueName}`).join(', '));
    }

    // Check setlists
    const setlistsResponse = await fetch(`http://localhost:3001/api/artists/${importResult.artistId}/setlists`);
    const setlists = await setlistsResponse.json();
    console.log('\n📝 Setlists created:', setlists.length);

    console.log('\n✅ Complete import flow test finished successfully!');
    console.log('\n📈 Summary:');
    console.log(`  - Artist: ${artist.name}`);
    console.log(`  - Songs: ${songs.length}`);
    console.log(`  - Shows: ${shows.length}`);
    console.log(`  - Setlists: ${setlists.length}`);
    console.log(`  - All IDs properly saved: ${artist.ticketmasterId && artist.spotifyId ? '✅' : '❌'}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testCompleteImport();