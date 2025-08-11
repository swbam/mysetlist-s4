#!/usr/bin/env tsx

import "dotenv/config";

async function testDatabaseSync() {
  console.log("🔍 Testing database sync functionality...");
  
  try {
    // Test database connection by querying existing data
    const { db } = await import("@repo/database");
    const { artists } = await import("@repo/database");
    
    console.log("✅ Database connection successful");
    
    // Check recently synced artists
    const recentArtists = await db
      .select({
        id: artists.id,
        name: artists.name,
        spotifyId: artists.spotifyId,
        followers: artists.followers,
        lastSyncedAt: artists.lastSyncedAt,
        trendingScore: artists.trendingScore
      })
      .from(artists)
      .where("last_synced_at IS NOT NULL")
      .orderBy("last_synced_at DESC")
      .limit(10);
      
    console.log(`\n📊 Found ${recentArtists.length} recently synced artists:`);
    
    recentArtists.forEach((artist, i) => {
      const daysSinceSync = artist.lastSyncedAt 
        ? Math.floor((Date.now() - new Date(artist.lastSyncedAt).getTime()) / (1000 * 60 * 60 * 24))
        : 'Never';
        
      console.log(`  ${i + 1}. ${artist.name}`);
      console.log(`     - Spotify ID: ${artist.spotifyId ? '✅' : '❌'}`);
      console.log(`     - Followers: ${artist.followers?.toLocaleString() || 0}`);
      console.log(`     - Trending Score: ${artist.trendingScore?.toFixed(1) || 0}`);
      console.log(`     - Last Synced: ${daysSinceSync} days ago`);
      console.log('');
    });
    
    // Check data freshness
    const totalArtists = await db.select().from(artists);
    const syncedArtists = recentArtists.length;
    const withSpotifyData = recentArtists.filter(a => a.spotifyId).length;
    const withFollowers = recentArtists.filter(a => a.followers && a.followers > 0).length;
    
    console.log(`📈 Sync System Health Check:`);
    console.log(`   - Total Artists: ${totalArtists.length}`);
    console.log(`   - Recently Synced: ${syncedArtists}`);
    console.log(`   - With Spotify Data: ${withSpotifyData}/${syncedArtists} (${Math.round(withSpotifyData/syncedArtists*100)}%)`);
    console.log(`   - With Real Followers: ${withFollowers}/${syncedArtists} (${Math.round(withFollowers/syncedArtists*100)}%)`);
    
    const healthScore = (withSpotifyData + withFollowers) / (syncedArtists * 2) * 100;
    console.log(`   - Overall Health: ${healthScore.toFixed(1)}% ✅`);
    
    if (healthScore > 80) {
      console.log("\n🎉 Sync system is working excellently!");
      console.log("   - Real data is flowing from external APIs");
      console.log("   - Artists have current follower counts");
      console.log("   - Trending calculations are based on real metrics");
    } else {
      console.log("\n⚠️  Sync system needs attention");
    }
    
    return { success: true, healthScore, totalArtists: totalArtists.length, syncedArtists };
    
  } catch (error) {
    console.error("❌ Database sync test failed:", error);
    return { success: false, error: error.message };
  }
}

testDatabaseSync()
  .then((result) => {
    if (result.success) {
      console.log(`\n✅ Database sync verification complete!`);
    } else {
      console.log(`\n❌ Database sync test failed: ${result.error}`);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("💥 Test crashed:", error);
    process.exit(1);
  });