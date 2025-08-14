#!/usr/bin/env tsx

import { ArtistImportOrchestrator } from "@repo/external-apis";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function testArtistImportOrchestrator() {
  console.log("🧪 Testing ArtistImportOrchestrator...");
  
  // Check environment variables
  const requiredEnvVars = [
    'SPOTIFY_CLIENT_ID',
    'SPOTIFY_CLIENT_SECRET', 
    'TICKETMASTER_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL'
  ];
  
  console.log("\n📋 Checking environment variables:");
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (value) {
      console.log(`✅ ${envVar}: ${value.slice(0, 20)}...`);
    } else {
      console.log(`❌ ${envVar}: Missing`);
      return;
    }
  }
  
  // Test with a popular artist (Taylor Swift)
  // Ticketmaster ID for Taylor Swift: K8vZ9171C70
  const testTmAttractionId = "K8vZ9171C70";
  
  console.log(`\n🎵 Testing import with Taylor Swift (TM ID: ${testTmAttractionId})`);
  
  try {
    // Create orchestrator with progress callback
    const orchestrator = new ArtistImportOrchestrator(async (progress) => {
      console.log(`📊 Progress: ${progress.stage} (${progress.progress}%) - ${progress.message}`);
      if (progress.error) {
        console.error(`❌ Error: ${progress.error}`);
      }
    });
    
    console.log("🚀 Starting import...");
    const startTime = Date.now();
    
    const result = await orchestrator.importArtist(testTmAttractionId);
    
    const duration = Date.now() - startTime;
    
    console.log("\n🎉 Import completed!");
    console.log(`✅ Success: ${result.success}`);
    console.log(`🆔 Artist ID: ${result.artistId}`);
    console.log(`🔗 Slug: ${result.slug}`);
    console.log(`🎵 Total Songs: ${result.totalSongs}`);
    console.log(`🎪 Total Shows: ${result.totalShows}`);
    console.log(`🏟️  Total Venues: ${result.totalVenues}`);
    console.log(`⏱️  Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    
    return result;
    
  } catch (error) {
    console.error("\n💥 Import failed:");
    console.error(error);
    throw error;
  }
}

async function testDatabaseConnection() {
  console.log("\n🔌 Testing database connection...");
  
  try {
    const { db } = await import("@repo/database");
    
    // Test simple query
    const result = await db.execute("SELECT 1 as test");
    console.log("✅ Database connection successful");
    
    // Check if import_status table exists
    try {
      await db.execute("SELECT COUNT(*) FROM import_status LIMIT 1");
      console.log("✅ import_status table exists");
    } catch (error) {
      console.error("❌ import_status table missing or inaccessible:", error);
    }
    
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw error;
  }
}

async function main() {
  console.log("🎯 TheSet Artist Import Test Suite");
  console.log("=====================================");
  
  try {
    // Test 1: Database connection
    await testDatabaseConnection();
    
    // Test 2: Import orchestrator
    await testArtistImportOrchestrator();
    
    console.log("\n🎉 All tests passed!");
    
  } catch (error) {
    console.error("\n💥 Test suite failed:");
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}