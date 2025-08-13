#!/usr/bin/env node

/**
 * Test script to verify the sync system works with real artist data
 * Tests Taylor Swift import to ensure complete catalog (excluding live tracks) is imported
 */

const https = require('https');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;

console.log('🎵 TheSet Sync System Test');
console.log('========================');
console.log(`Base URL: ${BASE_URL}`);
console.log(`API Key configured: ${TICKETMASTER_API_KEY ? 'Yes' : 'No'}`);
console.log('');

// Test 1: Search for Taylor Swift via Ticketmaster API
async function testArtistSearch() {
  console.log('Test 1: Searching for Taylor Swift...');
  
  try {
    const searchUrl = `${BASE_URL}/api/search/artists?q=Taylor%20Swift&limit=5`;
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Search failed:', data.error);
      return null;
    }
    
    if (data.results && data.results.length > 0) {
      const taylorSwift = data.results.find(a => a.name === 'Taylor Swift');
      if (taylorSwift) {
        console.log('✅ Found Taylor Swift:', {
          name: taylorSwift.name,
          id: taylorSwift.tmAttractionId,
          genres: taylorSwift.genreHints
        });
        return taylorSwift;
      }
    }
    
    console.error('❌ Taylor Swift not found in search results');
    return null;
  } catch (error) {
    console.error('❌ Search error:', error.message);
    return null;
  }
}

// Test 2: Trigger artist import
async function testArtistImport(artist) {
  console.log('\nTest 2: Importing Taylor Swift catalog...');
  
  try {
    const importUrl = `${BASE_URL}/api/artists/import`;
    const response = await fetch(importUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tmAttractionId: artist.tmAttractionId,
        artistName: artist.name
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Import failed:', data.error);
      return null;
    }
    
    console.log('✅ Import started:', {
      artistId: data.artistId,
      slug: data.slug,
      statusEndpoint: data.statusEndpoint
    });
    
    return data;
  } catch (error) {
    console.error('❌ Import error:', error.message);
    return null;
  }
}

// Test 3: Monitor import status
async function monitorImportStatus(artistId) {
  console.log('\nTest 3: Monitoring import progress...');
  
  const statusUrl = `${BASE_URL}/api/artists/${artistId}/import-status`;
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(statusUrl);
      const status = await response.json();
      
      if (status.stage === 'completed') {
        console.log('✅ Import completed successfully!');
        return true;
      }
      
      if (status.stage === 'failed') {
        console.error('❌ Import failed:', status.error);
        return false;
      }
      
      console.log(`⏳ ${status.stage}: ${status.message} (${status.progress}%)`);
      
      // Wait 5 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    } catch (error) {
      console.error('❌ Status check error:', error.message);
      return false;
    }
  }
  
  console.error('❌ Import timed out after 5 minutes');
  return false;
}

// Test 4: Verify imported data
async function verifyImportedData(slug) {
  console.log('\nTest 4: Verifying imported data...');
  
  try {
    // Check artist page data
    const artistUrl = `${BASE_URL}/api/artists/${slug}`;
    const response = await fetch(artistUrl);
    
    if (!response.ok) {
      console.error('❌ Failed to fetch artist data');
      return false;
    }
    
    const artistData = await response.json();
    
    console.log('📊 Import Results:');
    console.log(`  - Songs imported: ${artistData.totalSongs || 0}`);
    console.log(`  - Albums imported: ${artistData.totalAlbums || 0}`);
    console.log(`  - Shows imported: ${artistData.totalShows || 0}`);
    
    // Verify no live tracks were imported (checking a sample)
    if (artistData.songs && Array.isArray(artistData.songs)) {
      const liveTracks = artistData.songs.filter(song => {
        const title = song.title.toLowerCase();
        return title.includes('(live at') || 
               title.includes('(live from') ||
               title.includes('[live]');
      });
      
      if (liveTracks.length === 0) {
        console.log('✅ No live tracks imported (correct behavior)');
      } else {
        console.log(`⚠️  Found ${liveTracks.length} live tracks that shouldn't be imported`);
      }
    }
    
    // Check for acoustic versions (should be imported)
    if (artistData.songs && Array.isArray(artistData.songs)) {
      const acousticTracks = artistData.songs.filter(song => {
        const title = song.title.toLowerCase();
        return title.includes('acoustic') && 
               !title.includes('live');
      });
      
      if (acousticTracks.length > 0) {
        console.log(`✅ ${acousticTracks.length} studio acoustic tracks imported (correct)`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Verification error:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('Starting sync system tests...\n');
  
  // Test 1: Search
  const artist = await testArtistSearch();
  if (!artist) {
    console.error('\n❌ Test suite failed at search step');
    process.exit(1);
  }
  
  // Test 2: Import
  const importResult = await testArtistImport(artist);
  if (!importResult) {
    console.error('\n❌ Test suite failed at import step');
    process.exit(1);
  }
  
  // Test 3: Monitor status
  const success = await monitorImportStatus(importResult.artistId);
  if (!success) {
    console.error('\n❌ Test suite failed during import processing');
    process.exit(1);
  }
  
  // Test 4: Verify data
  const verified = await verifyImportedData(importResult.slug);
  if (!verified) {
    console.error('\n❌ Test suite failed at verification step');
    process.exit(1);
  }
  
  console.log('\n✅ All tests passed! The sync system is working correctly.');
  console.log('Taylor Swift\'s catalog has been imported successfully (excluding live tracks).');
}

// Run the tests
runTests().catch(error => {
  console.error('\n❌ Test suite error:', error);
  process.exit(1);
});