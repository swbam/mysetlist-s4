#!/usr/bin/env node

// Test import timing coordination
require('dotenv').config({ path: '.env.local' });

async function testImportTiming() {
  try {
    console.log('⏰ Testing import timing coordination...\n');

    // Search for a fresh artist
    console.log('1. 🔍 Searching for fresh artist...');
    const searchResponse = await fetch('http://localhost:3001/api/search?q=Adele&limit=3');
    
    if (!searchResponse.ok) {
      console.log('❌ Search failed');
      return;
    }
    
    const searchData = await searchResponse.json();
    if (!searchData.results || searchData.results.length === 0) {
      console.log('❌ No results found');
      return;
    }
    
    const artist = searchData.results[0];
    const tmAttractionId = artist.metadata.externalId;
    console.log(`   ✅ Found: ${artist.name} (${tmAttractionId})`);

    // Start import and monitor timing
    console.log('\n2. 📥 Starting import with timing monitoring...');
    const startTime = Date.now();
    
    const importResponse = await fetch('http://localhost:3001/api/artists/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmAttractionId })
    });
    
    if (!importResponse.ok) {
      console.log('❌ Import failed:', await importResponse.text());
      return;
    }
    
    const importData = await importResponse.json();
    const importTime = Date.now() - startTime;
    console.log(`   ✅ Import API completed in ${importTime}ms`);
    console.log(`   Artist ID: ${importData.artistId}`);
    console.log(`   Artist slug: ${importData.slug}`);

    // Wait and monitor background import progress
    console.log('\n3. ⏳ Monitoring background import progress...');
    
    for (let i = 0; i < 20; i++) { // Monitor for 20 seconds
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      // Check import status
      const statusResponse = await fetch(`http://localhost:3001/api/artists/${importData.artistId}/status`);
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        console.log(`   [${i+1}s] Stage: ${status.stage} (${status.percentage}%) - ${status.message}`);
        
        if (status.stage === 'completed') {
          console.log(`   🎉 Import completed after ${i+1} seconds!`);
          break;
        }
        
        if (status.stage === 'failed') {
          console.log(`   ❌ Import failed after ${i+1} seconds: ${status.message}`);
          break;
        }
      } else {
        console.log(`   [${i+1}s] Status check failed`);
      }
    }

    // Test final functionality
    console.log('\n4. 🧪 Testing final functionality...');
    
    // Test shows
    const showsResponse = await fetch(`http://localhost:3001/api/artists/${importData.artistId}/shows`);
    if (showsResponse.ok) {
      const shows = await showsResponse.json();
      console.log(`   Shows: ✅ (${shows.length} imported)`);
    } else {
      console.log(`   Shows: ❌`);
    }
    
    // Test songs  
    const songsResponse = await fetch(`http://localhost:3001/api/artists/${importData.artistId}/songs?limit=5`);
    if (songsResponse.ok) {
      const songsData = await songsResponse.json();
      const songCount = songsData.songs?.length || 0;
      console.log(`   Songs: ${songCount > 0 ? '✅' : '⚠️'} (${songCount} imported)`);
      
      if (songCount > 0) {
        console.log(`   🎵 Top song: ${songsData.songs[0].title}`);
      }
    } else {
      console.log(`   Songs: ❌`);
    }

    console.log('\n✅ TIMING TEST COMPLETE');

  } catch (error) {
    console.error('Error:', error);
  }
}

testImportTiming();
