#!/usr/bin/env node
/**
 * Simple script to verify imported shows and venues data
 */

require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function verifyData() {
  console.log('🔍 Verifying imported data...\n');

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Check venues
    console.log('🏟️  Checking venues...');
    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('id, name, city, state, capacity')
      .order('created_at', { ascending: false })
      .limit(10);

    if (venuesError) {
      console.error('❌ Error fetching venues:', venuesError);
    } else {
      console.log(`  ✅ Found ${venues.length} venues (showing first 10):`);
      venues.forEach(venue => {
        console.log(`    📍 ${venue.name} - ${venue.city}, ${venue.state} (Cap: ${venue.capacity || 'N/A'})`);
      });
    }

    // Check shows
    console.log('\n🎤 Checking shows...');
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select(`
        id, name, date, status,
        artists:headliner_artist_id (name),
        venues:venue_id (name, city)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (showsError) {
      console.error('❌ Error fetching shows:', showsError);
    } else {
      console.log(`  ✅ Found ${shows.length} shows (showing first 10):`);
      shows.forEach(show => {
        const artist = show.artists?.name || 'Unknown Artist';
        const venue = show.venues ? `${show.venues.name}, ${show.venues.city}` : 'TBD';
        console.log(`    🎵 ${artist} - ${show.date} at ${venue}`);
      });
    }

    // Check artists
    console.log('\n🎭 Checking artists...');
    const { data: artists, error: artistsError } = await supabase
      .from('artists')
      .select('id, name, followers, popularity')
      .order('created_at', { ascending: false })
      .limit(10);

    if (artistsError) {
      console.error('❌ Error fetching artists:', artistsError);
    } else {
      console.log(`  ✅ Found ${artists.length} artists (showing first 10):`);
      artists.forEach(artist => {
        console.log(`    🎤 ${artist.name} (Followers: ${artist.followers || 0}, Popularity: ${artist.popularity || 0})`);
      });
    }

    // Get totals
    console.log('\n📊 Getting totals...');
    const { count: venueCount } = await supabase
      .from('venues')
      .select('*', { count: 'exact', head: true });
    
    const { count: showCount } = await supabase
      .from('shows')
      .select('*', { count: 'exact', head: true });
    
    const { count: artistCount } = await supabase
      .from('artists')
      .select('*', { count: 'exact', head: true });

    console.log(`  🏟️  Total Venues: ${venueCount}`);
    console.log(`  🎤 Total Shows: ${showCount}`);
    console.log(`  🎭 Total Artists: ${artistCount}`);

    console.log('\n✅ Data verification complete!');
    console.log('\n🎉 You should now be able to:');
    console.log('  1. Visit http://localhost:3001/venues to see imported venues');
    console.log('  2. Visit http://localhost:3001/shows to see imported shows');
    console.log('  3. Search for artists and find shows');
    console.log('  4. Click on individual shows to see voting interface');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

verifyData();