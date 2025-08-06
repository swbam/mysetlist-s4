// Quick script to check existing data
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  console.log('🔍 Checking existing data...');

  try {
    // Check artists
    const { data: artists, error: artistsError } = await supabase
      .from('artists')
      .select('id, name, slug, trending_score, popularity')
      .limit(10);

    if (artistsError) {
      console.error('❌ Error fetching artists:', artistsError);
    } else {
      console.log(`✅ Found ${artists.length} artists:`);
      artists.forEach(artist => {
        console.log(`  - ${artist.name} (trending: ${artist.trending_score || 0}, popularity: ${artist.popularity || 0})`);
      });
    }

    // Check venues
    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('id, name, slug, capacity, total_shows')
      .limit(10);

    if (venuesError) {
      console.error('❌ Error fetching venues:', venuesError);
    } else {
      console.log(`✅ Found ${venues.length} venues:`);
      venues.forEach(venue => {
        console.log(`  - ${venue.name} (capacity: ${venue.capacity || 0}, shows: ${venue.total_shows || 0})`);
      });
    }

    // Check shows
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select('id, name, slug, trending_score, vote_count')
      .limit(10);

    if (showsError) {
      console.error('❌ Error fetching shows:', showsError);
    } else {
      console.log(`✅ Found ${shows.length} shows:`);
      shows.forEach(show => {
        console.log(`  - ${show.name} (trending: ${show.trending_score || 0}, votes: ${show.vote_count || 0})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkData();