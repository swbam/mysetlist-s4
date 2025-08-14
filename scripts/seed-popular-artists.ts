#!/usr/bin/env tsx
/**
 * Seed script to populate database with popular artists
 * Run with: pnpm tsx scripts/seed-popular-artists.ts
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const POPULAR_ARTISTS = [
  { name: "Taylor Swift", tmAttractionId: "K8vZ9175Tr0" },
  { name: "Drake", tmAttractionId: "K8vZ917G-b0" },
  { name: "The Weeknd", tmAttractionId: "K8vZ9174R87" },
  { name: "Bad Bunny", tmAttractionId: "K8vZ917KNC7" },
  { name: "Beyoncé", tmAttractionId: "K8vZ9171ob7" },
  { name: "Post Malone", tmAttractionId: "K8vZ917oYb0" },
  { name: "Dua Lipa", tmAttractionId: "K8vZ917G-x0" },
  { name: "Ed Sheeran", tmAttractionId: "K8vZ9171PP0" },
  { name: "Bruno Mars", tmAttractionId: "K8vZ9171Ad7" },
  { name: "Olivia Rodrigo", tmAttractionId: "K8vZ917qpe7" }
];

async function seedArtists() {
  console.log("🌱 Starting artist seed...");
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  const importUrl = `${baseUrl}/api/artists/import`;
  
  for (const artist of POPULAR_ARTISTS) {
    try {
      console.log(`\n📥 Importing ${artist.name}...`);
      
      const response = await fetch(importUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tmAttractionId: artist.tmAttractionId,
          name: artist.name,
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`❌ Failed to import ${artist.name}: ${error}`);
        continue;
      }
      
      const result = await response.json();
      
      if (result.alreadyExists) {
        console.log(`✅ ${artist.name} already exists (ID: ${result.artistId})`);
      } else {
        console.log(`✅ ${artist.name} imported successfully!`);
        console.log(`   - Artist ID: ${result.artistId}`);
        console.log(`   - Songs: ${result.totalSongs || 0}`);
        console.log(`   - Shows: ${result.totalShows || 0}`);
        console.log(`   - Import time: ${result.importDuration}ms`);
      }
      
      // Wait a bit between imports to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Error importing ${artist.name}:`, error);
    }
  }
  
  console.log("\n✨ Artist seeding complete!");
  
  process.exit(0);
}

// Run the seed
seedArtists().catch((error) => {
  console.error("Fatal error during seeding:", error);
  process.exit(1);
});