import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function populateTrendingData() {
  console.log("Starting to populate trending data...");
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables");
    console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "Set" : "Missing");
    console.error("SUPABASE_SERVICE_ROLE_KEY:", supabaseKey ? "Set" : "Missing");
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // First, get all artists
    const { data: artists, error: fetchError } = await supabase
      .from("artists")
      .select("id, name, popularity, followers, follower_count")
      .limit(1000);
    
    if (fetchError) {
      console.error("Error fetching artists:", fetchError);
      return;
    }
    
    console.log(`Found ${artists?.length || 0} artists to update`);
    
    if (!artists || artists.length === 0) {
      console.log("No artists found in database");
      return;
    }
    
    // Update each artist with a trending score
    let updatedCount = 0;
    for (const artist of artists) {
      const popularity = artist.popularity || 0;
      const followers = artist.followers || artist.follower_count || 0;
      
      // Calculate trending score based on popularity and followers
      let trendingScore = popularity * 10;
      
      if (followers > 1000000) {
        trendingScore += 100;
      } else if (followers > 100000) {
        trendingScore += 50;
      } else {
        trendingScore += 10;
      }
      
      // Add some randomness for variation
      trendingScore += Math.random() * 50;
      
      // Calculate growth rate (random for now)
      const growthRate = (Math.random() * 0.4) - 0.1;
      
      // Update the artist
      const { error: updateError } = await supabase
        .from("artists")
        .update({
          trending_score: Math.max(0, trendingScore),
          growth_rate: growthRate,
          last_trending_update: new Date().toISOString(),
        })
        .eq("id", artist.id);
      
      if (updateError) {
        console.error(`Error updating artist ${artist.name}:`, updateError);
      } else {
        updatedCount++;
        if (updatedCount % 10 === 0) {
          console.log(`Updated ${updatedCount} artists...`);
        }
      }
    }
    
    console.log(`\n✅ Successfully updated ${updatedCount} artists with trending scores`);
    
    // Now update shows with trending scores
    const { data: shows, error: showsFetchError } = await supabase
      .from("shows")
      .select("id, view_count, attendee_count, vote_count, date")
      .limit(1000);
    
    if (showsFetchError) {
      console.error("Error fetching shows:", showsFetchError);
      return;
    }
    
    console.log(`\nFound ${shows?.length || 0} shows to update`);
    
    if (shows && shows.length > 0) {
      let showsUpdated = 0;
      
      for (const show of shows) {
        const viewCount = show.view_count || 0;
        const attendeeCount = show.attendee_count || 0;
        const voteCount = show.vote_count || 0;
        
        // Calculate trending score for shows
        let showTrendingScore = 
          viewCount * 0.1 +
          attendeeCount * 0.2 +
          voteCount * 2;
        
        // Boost upcoming shows
        const showDate = new Date(show.date);
        const now = new Date();
        const daysUntilShow = Math.floor((showDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilShow > 0 && daysUntilShow < 30) {
          showTrendingScore += 50;
        }
        
        // Add some randomness
        showTrendingScore += Math.random() * 20;
        
        // Update the show
        const { error: showUpdateError } = await supabase
          .from("shows")
          .update({
            trending_score: Math.max(0, showTrendingScore),
            updated_at: new Date().toISOString(),
          })
          .eq("id", show.id);
        
        if (showUpdateError) {
          console.error(`Error updating show:`, showUpdateError);
        } else {
          showsUpdated++;
          if (showsUpdated % 10 === 0) {
            console.log(`Updated ${showsUpdated} shows...`);
          }
        }
      }
      
      console.log(`✅ Successfully updated ${showsUpdated} shows with trending scores`);
    }
    
    // Verify the updates
    const { data: verifyData, error: verifyError } = await supabase
      .from("artists")
      .select("id")
      .gt("trending_score", 0)
      .limit(5);
    
    if (!verifyError && verifyData) {
      console.log(`\n✅ Verification: Found ${verifyData.length} artists with trending scores > 0`);
    }
    
  } catch (error) {
    console.error("Unexpected error:", error);
  }
  
  console.log("\n🎉 Trending data population complete!");
  process.exit(0);
}

// Run the script
populateTrendingData().catch(console.error);
