#!/usr/bin/env tsx

import "dotenv/config";
import { ingestArtistPipelineEnhanced } from "./apps/web/lib/ingest/artistPipelineEnhanced";

async function testSyncPipeline() {
  console.log("🧪 Testing sync pipeline with sample artist...");
  
  try {
    // Test with a known Ticketmaster ID (this would need to be a real one)
    // For demo purposes, let's use a mock ID - in real use you'd get this from Ticketmaster API
    const sampleTmId = "K8vZ9171ob7"; // This might be a real TM ID
    
    console.log(`Testing with Ticketmaster ID: ${sampleTmId}`);
    
    const result = await ingestArtistPipelineEnhanced(sampleTmId);
    
    console.log("✅ Sync pipeline test results:");
    console.log("- Success:", result.success);
    console.log("- Artist ID:", result.artistId);
    console.log("- Artist Name:", result.artistName);
    console.log("- Spotify ID:", result.spotifyId);
    console.log("- Popularity:", result.popularity);
    console.log("- Followers:", result.followers);
    
    return true;
  } catch (error) {
    console.error("❌ Sync pipeline test failed:");
    console.error(error);
    return false;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testSyncPipeline()
    .then((success) => {
      console.log(success ? "🎉 Test completed successfully!" : "💥 Test failed!");
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("💥 Test crashed:", error);
      process.exit(1);
    });
}

export { testSyncPipeline };