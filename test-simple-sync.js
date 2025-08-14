// Simple test to trigger show sync directly
const fetch = require('node-fetch');
require('dotenv').config();

async function testSimpleSync() {
  console.log("Testing simple show sync...");

  const cronSecret = process.env.CRON_SECRET;
  console.log("CRON_SECRET present:", !!cronSecret);

  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is missing!");
    return;
  }

  try {
    const baseUrl = 'http://localhost:3001';
    
    // Very simple test with a small size limit
    console.log("Testing general show sync with size limit...");
    
    const syncUrl = `${baseUrl}/api/sync/shows?keyword=concert&size=2&classificationName=music`;
    
    console.log("Making request to:", syncUrl);
    
    const response = await fetch(syncUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });
    
    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers));
    
    if (response.ok) {
      const result = await response.json();
      console.log("Sync result:", JSON.stringify(result, null, 2));
    } else {
      const error = await response.text();
      console.error("Sync error:", error);
    }

  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

testSimpleSync();