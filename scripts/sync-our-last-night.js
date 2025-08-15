#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });

const SETLISTFM_API_KEY = process.env.SETLISTFM_API_KEY;

async function testSetlistFMAPI() {
  console.log("=== TESTING SETLISTFM API FOR OUR LAST NIGHT ===\n");
  
  const baseURL = 'https://api.setlist.fm/rest/1.0';
  
  // Search for Our Last Night setlists
  const response = await fetch(`${baseURL}/search/setlists?artistName=Our Last Night&p=1`, {
    headers: {
      'Accept': 'application/json',
      'x-api-key': SETLISTFM_API_KEY
    }
  });
  
  if (!response.ok) {
    console.error(`API Error: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.error(text);
    return;
  }
  
  const data = await response.json();
  console.log(`Found ${data.total} total setlists for Our Last Night`);
  console.log(`Showing first ${data.setlist.length} results:\n`);
  
  for (const setlist of data.setlist.slice(0, 5)) {
    console.log(`Date: ${setlist.eventDate}`);
    console.log(`Venue: ${setlist.venue.name}, ${setlist.venue.city.name}, ${setlist.venue.city.stateCode || setlist.venue.city.country.code}`);
    
    let totalSongs = 0;
    for (const set of setlist.sets.set) {
      totalSongs += set.song.length;
    }
    console.log(`Songs: ${totalSongs}`);
    
    if (setlist.sets.set[0] && setlist.sets.set[0].song.length > 0) {
      console.log(`Sample songs: ${setlist.sets.set[0].song.slice(0, 3).map(s => s.name).join(', ')}`);
    }
    
    console.log('---');
  }
  
  // Now let's sync the most recent one
  if (data.setlist.length > 0) {
    console.log("\n=== SYNCING LATEST SETLIST ===");
    const latestSetlist = data.setlist[0];
    
    // Call our API to sync this setlist
    const syncResponse = await fetch('http://localhost:3001/api/setlists/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        artistName: 'Our Last Night',
        setlistFmData: latestSetlist
      })
    });
    
    if (syncResponse.ok) {
      const result = await syncResponse.json();
      console.log("✅ Sync successful:", result);
    } else {
      console.error("❌ Sync failed:", syncResponse.status, await syncResponse.text());
    }
  }
}

testSetlistFMAPI().catch(console.error);