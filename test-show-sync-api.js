// Test the show sync API endpoint
import fetch from 'node-fetch';
import { config } from 'dotenv';

config();

async function testShowSyncAPI() {
  console.log("Testing show sync API endpoint...");

  const cronSecret = process.env.CRON_SECRET;
  console.log("CRON_SECRET present:", !!cronSecret);

  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is missing!");
    return;
  }

  try {
    const baseUrl = 'http://localhost:3001'; // Assuming dev server is running
    
    // Test 1: General show sync for a specific city
    console.log("\n=== Test 1: General show sync for New York ===");
    
    const generalSyncUrl = `${baseUrl}/api/sync/shows?city=New York&stateCode=NY&size=5`;
    const generalSyncResponse = await fetch(generalSyncUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log("General sync status:", generalSyncResponse.status);
    const generalSyncResult = await generalSyncResponse.json();
    console.log("General sync result:", JSON.stringify(generalSyncResult, null, 2));

    // Test 2: Test with a general keyword search for popular artists
    console.log("\n=== Test 2: General show sync for Taylor Swift ===");
    
    const keywordSyncUrl = `${baseUrl}/api/sync/shows?keyword=Taylor Swift&size=3`;
    const keywordSyncResponse = await fetch(keywordSyncUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log("Keyword sync status:", keywordSyncResponse.status);
    const keywordSyncResult = await keywordSyncResponse.json();
    console.log("Keyword sync result:", JSON.stringify(keywordSyncResult, null, 2));

    // Test 3: Check if any shows were created by querying the shows API
    console.log("\n=== Test 3: Check created shows ===");
    
    const showsUrl = `${baseUrl}/api/shows`;
    const showsResponse = await fetch(showsUrl);
    
    if (showsResponse.ok) {
      const showsResult = await showsResponse.json();
      console.log("Shows in database:", showsResult.shows?.length || 0);
      
      if (showsResult.shows?.length > 0) {
        console.log("Sample show:", JSON.stringify(showsResult.shows[0], null, 2));
      }
    } else {
      console.log("Shows API status:", showsResponse.status);
    }

  } catch (error) {
    console.error("Test failed:", error.message);
    console.error("Stack:", error.stack);
  }
}

testShowSyncAPI();