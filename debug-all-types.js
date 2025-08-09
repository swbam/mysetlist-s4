// Debug all types query
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function debugAllTypes() {
  console.log('🔍 Testing all types query...');

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const trending = [];
    const limit = 5;

    // Test artists
    console.log('\n📊 Testing artists...');
    const { data: trendingArtists, error: artistError } = await supabase
      .from("artists")
      .select("id, name, slug, image_url, popularity, followers, follower_count, monthly_listeners, trending_score")
      .order("trending_score", { ascending: false, nullsLast: true })
      .order("popularity", { ascending: false, nullsLast: true })
      .limit(Math.ceil(limit / 3));

    if (artistError) {
      console.error('❌ Artist error:', artistError);
    } else {
      console.log(`✅ Found ${trendingArtists.length} artists`);
      console.log('First artist:', trendingArtists[0]?.name);
    }

    // Test shows
    console.log('\n📊 Testing shows...');
    const { data: trendingShows, error: showError } = await supabase
      .from("shows")
      .select(`
        id, name, slug, view_count, vote_count, attendee_count, setlist_count, trending_score, date,
        headliner_artist:artists!shows_headliner_artist_id_fkey(name, image_url)
      `)
      .order("trending_score", { ascending: false, nullsLast: true })
      .order("attendee_count", { ascending: false, nullsLast: true })
      .limit(Math.ceil(limit / 3));

    if (showError) {
      console.error('❌ Show error:', showError);
    } else {
      console.log(`✅ Found ${trendingShows.length} shows`);
      console.log('First show:', trendingShows[0]?.name);
    }

    // Test venues
    console.log('\n📊 Testing venues...');
    const { data: trendingVenues, error: venueError } = await supabase
      .from("venues")
      .select("id, name, slug, image_url, capacity, city, state")
      .not("capacity", "is", null)
      .gt("capacity", 0)
      .order("capacity", { ascending: false })
      .limit(Math.floor(limit / 3));

    if (venueError) {
      console.error('❌ Venue error:', venueError);
    } else {
      console.log(`✅ Found ${trendingVenues.length} venues`);
      console.log('First venue:', trendingVenues[0]?.name);
    }

  } catch (error) {
    console.error('❌ Connection error:', error);
  }
}

debugAllTypes();