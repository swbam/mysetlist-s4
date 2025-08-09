// Debug supabase connection from API context
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function debugSupabase() {
  console.log('🔍 Testing Supabase connection from API context...');
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Service Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test with basic columns first
    const { data: trendingArtists, error } = await supabase
      .from("artists")
      .select(
        "id, name, slug, image_url, popularity, followers, follower_count, monthly_listeners, trending_score",
      )
      .order("trending_score", { ascending: false, nullsLast: true })
      .order("popularity", { ascending: false, nullsLast: true })
      .limit(5);

    if (error) {
      console.error('❌ Supabase error:', error);
    } else {
      console.log(`✅ Fetched ${trendingArtists.length} artists:`);
      trendingArtists.forEach(artist => {
        console.log(`  - ${artist.name} (trending: ${artist.trending_score}, popularity: ${artist.popularity})`);
      });

      // Process first artist like the API does
      if (trendingArtists.length > 0) {
        const artist = trendingArtists[0];
        const searches = Math.round((artist.popularity || 0) * 1.5);
        const views = artist.popularity || 0;
        const interactions = artist.follower_count || artist.followers || 0;
        const trendingScore = artist.trending_score || 0;
        
        console.log('\n📊 Processing first artist:');
        console.log(`  - Searches: ${searches}`);
        console.log(`  - Views: ${views}`);
        console.log(`  - Interactions: ${interactions}`);
        console.log(`  - Trending Score: ${trendingScore}`);
      }
    }

  } catch (error) {
    console.error('❌ Connection error:', error);
  }
}

debugSupabase();