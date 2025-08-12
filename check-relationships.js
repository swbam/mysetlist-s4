#!/usr/bin/env node
/**
 * Check venue-show relationships in database
 */

require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkRelationships() {
  console.log('🔍 Checking venue-show relationships...\n');

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Check shows with venue_id
    console.log('🎤 Checking shows with venue relationships...');
    const { data: showsWithVenues } = await supabase
      .from('shows')
      .select('id, name, venue_id, ticketmaster_id')
      .not('venue_id', 'is', null)
      .limit(5);

    console.log(`  ✅ Found ${showsWithVenues?.length || 0} shows with venue_id:`);
    showsWithVenues?.forEach(show => {
      console.log(`    🎵 ${show.name} (venue_id: ${show.venue_id})`);
    });

    // Check shows without venue_id
    const { data: showsWithoutVenues } = await supabase
      .from('shows')
      .select('id, name, venue_id')
      .is('venue_id', null)
      .limit(5);

    console.log(`\n  ⚠️  Found ${showsWithoutVenues?.length || 0} shows WITHOUT venue_id (showing 5):`);
    showsWithoutVenues?.forEach(show => {
      console.log(`    🎵 ${show.name}`);
    });

    // Check venues with ticketmaster_id
    console.log('\n🏟️  Checking venues with Ticketmaster IDs...');
    const { data: venuesWithTM } = await supabase
      .from('venues')
      .select('id, name, ticketmaster_id')
      .not('ticketmaster_id', 'is', null)
      .limit(5);

    console.log(`  ✅ Found ${venuesWithTM?.length || 0} venues with ticketmaster_id:`);
    venuesWithTM?.forEach(venue => {
      console.log(`    🏟️  ${venue.name} (TM ID: ${venue.ticketmaster_id})`);
    });

    // Get counts
    const { count: totalShows } = await supabase
      .from('shows')
      .select('*', { count: 'exact', head: true });

    const { count: showsWithVenueCount } = await supabase
      .from('shows')
      .select('*', { count: 'exact', head: true })
      .not('venue_id', 'is', null);

    const { count: totalVenues } = await supabase
      .from('venues')
      .select('*', { count: 'exact', head: true });

    console.log('\n📊 Summary:');
    console.log(`  🎤 Total Shows: ${totalShows}`);
    console.log(`  🔗 Shows with venues: ${showsWithVenueCount} (${Math.round((showsWithVenueCount/totalShows)*100)}%)`);
    console.log(`  🏟️  Total Venues: ${totalVenues}`);

    if (showsWithVenueCount === 0) {
      console.log('\n❌ ISSUE: No shows are linked to venues!');
      console.log('   This suggests the venue linking in the sync script failed.');
    } else {
      console.log('\n✅ Some shows are properly linked to venues.');
    }

  } catch (error) {
    console.error('❌ Error checking relationships:', error);
  }
}

checkRelationships();