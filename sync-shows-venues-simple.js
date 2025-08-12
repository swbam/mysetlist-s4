#!/usr/bin/env node
/**
 * Simple script to sync shows and venues from Ticketmaster API
 * Directly inserts into Supabase using database client
 */

require('dotenv').config();

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Top cities to sync shows and venues for
const CITIES_TO_SYNC = [
  { name: 'New York', state: 'NY' },
  { name: 'Los Angeles', state: 'CA' },
  { name: 'Chicago', state: 'IL' },
  { name: 'Nashville', state: 'TN' },
  { name: 'Austin', state: 'TX' },
];

// Function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Generate slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Fetch from Ticketmaster API
async function fetchFromTicketmaster(endpoint) {
  if (!TICKETMASTER_API_KEY) {
    throw new Error('TICKETMASTER_API_KEY environment variable is required');
  }

  const url = `https://app.ticketmaster.com/discovery/v2${endpoint}&apikey=${TICKETMASTER_API_KEY}`;
  console.log(`  📡 Fetching: ${endpoint.substring(0, 100)}...`);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 429) {
        console.log('  ⏳ Rate limited, waiting 10 seconds...');
        await delay(10000);
        return fetchFromTicketmaster(endpoint);
      }
      throw new Error(`Ticketmaster API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`  ❌ Error fetching data:`, error.message);
    return null;
  }
}

// Initialize Supabase client
function getSupabaseClient() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(SUPABASE_URL, SERVICE_KEY);
}

// Sync venues for a city
async function syncVenuesForCity(cityData) {
  console.log(`\n🏟️  Syncing venues for ${cityData.name}, ${cityData.state}...`);
  
  const endpoint = `/venues.json?city=${encodeURIComponent(cityData.name)}&stateCode=${cityData.state}&size=50&sort=name,asc`;
  const data = await fetchFromTicketmaster(endpoint);
  
  if (!data?._embedded?.venues) {
    console.log(`  📍 No venues found for ${cityData.name}`);
    return 0;
  }
  
  const venues = data._embedded.venues;
  console.log(`  🏟️  Found ${venues.length} venues`);
  
  const supabase = getSupabaseClient();
  let venuesInserted = 0;
  
  for (const venue of venues) {
    try {
      // Check if venue already exists
      const { data: existingVenue } = await supabase
        .from('venues')
        .select('id')
        .eq('ticketmaster_id', venue.id)
        .single();
      
      if (existingVenue) {
        console.log(`    ⏭️  Venue already exists: ${venue.name}`);
        continue;
      }
      
      // Insert new venue
      const venueData = {
        name: venue.name,
        slug: generateSlug(venue.name),
        ticketmaster_id: venue.id,
        address: venue.address?.line1 || null,
        city: venue.city?.name || cityData.name,
        state: venue.state?.name || cityData.state,
        country: venue.country?.name || 'United States',
        postal_code: venue.postalCode || null,
        latitude: venue.location?.latitude ? parseFloat(venue.location.latitude) : null,
        longitude: venue.location?.longitude ? parseFloat(venue.location.longitude) : null,
        timezone: venue.timezone || 'America/New_York',
        capacity: venue.capacity || null,
        venue_type: venue.type || null,
        phone_number: venue.phoneNumber || null,
        website: venue.url || null,
        image_url: venue.images?.[0]?.url || null,
        description: venue.generalInfo?.generalRule || null,
        amenities: JSON.stringify(venue.generalInfo || {}),
      };
      
      const { error } = await supabase
        .from('venues')
        .insert(venueData);
      
      if (error) {
        console.log(`    ❌ Error inserting venue ${venue.name}:`, error.message);
      } else {
        console.log(`    ✅ Inserted venue: ${venue.name}`);
        venuesInserted++;
      }
      
    } catch (error) {
      console.log(`    ❌ Error processing venue ${venue.name}:`, error.message);
    }
    
    // Small delay between insertions
    await delay(100);
  }
  
  console.log(`  📊 Inserted ${venuesInserted} new venues for ${cityData.name}`);
  return venuesInserted;
}

// Sync shows for a city
async function syncShowsForCity(cityData) {
  console.log(`\n🎤 Syncing shows for ${cityData.name}, ${cityData.state}...`);
  
  // Calculate date range (next 3 months)
  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const endpoint = `/events.json?city=${encodeURIComponent(cityData.name)}&stateCode=${cityData.state}&classificationName=Music&startDateTime=${startDate}T00:00:00Z&endDateTime=${endDate}T23:59:59Z&size=100&sort=date,asc`;
  const data = await fetchFromTicketmaster(endpoint);
  
  if (!data?._embedded?.events) {
    console.log(`  🎵 No shows found for ${cityData.name}`);
    return 0;
  }
  
  const events = data._embedded.events;
  console.log(`  🎤 Found ${events.length} shows`);
  
  const supabase = getSupabaseClient();
  let showsInserted = 0;
  
  for (const event of events) {
    try {
      // Check if show already exists
      const { data: existingShow } = await supabase
        .from('shows')
        .select('id')
        .eq('ticketmaster_id', event.id)
        .single();
      
      if (existingShow) {
        console.log(`    ⏭️  Show already exists: ${event.name}`);
        continue;
      }
      
      // Get the main artist/attraction
      const mainAttraction = event._embedded?.attractions?.[0];
      if (!mainAttraction) {
        console.log(`    ⚠️  No artist found for event: ${event.name}`);
        continue;
      }
      
      // Find or create artist in database
      let artistId = null;
      const { data: existingArtist } = await supabase
        .from('artists')
        .select('id')
        .ilike('name', mainAttraction.name)
        .single();
      
      if (existingArtist) {
        artistId = existingArtist.id;
      } else {
        // Create basic artist entry
        const { data: newArtist, error: artistError } = await supabase
          .from('artists')
          .insert({
            name: mainAttraction.name,
            slug: generateSlug(mainAttraction.name),
            genres: JSON.stringify([]),
            popularity: 0,
            followers: 0,
          })
          .select('id')
          .single();
        
        if (artistError) {
          console.log(`    ❌ Error creating artist ${mainAttraction.name}:`, artistError.message);
          continue;
        }
        
        artistId = newArtist.id;
        console.log(`    ✅ Created new artist: ${mainAttraction.name}`);
      }
      
      // Find venue in database
      let venueId = null;
      const venue = event._embedded?.venues?.[0];
      if (venue) {
        const { data: existingVenue } = await supabase
          .from('venues')
          .select('id')
          .eq('ticketmaster_id', venue.id)
          .single();
        
        if (existingVenue) {
          venueId = existingVenue.id;
        }
      }
      
      // Create show entry
      const showDate = new Date(event.dates.start.localDate);
      const showData = {
        headliner_artist_id: artistId,
        venue_id: venueId,
        name: event.name,
        slug: generateSlug(event.name) + '-' + event.dates.start.localDate,
        date: event.dates.start.localDate,
        start_time: event.dates.start.localTime || null,
        status: 'upcoming',
        ticket_url: event.url || null,
        min_price: event.priceRanges?.[0]?.min ? Math.round(event.priceRanges[0].min * 100) : null, // Store as cents
        max_price: event.priceRanges?.[0]?.max ? Math.round(event.priceRanges[0].max * 100) : null, // Store as cents
        currency: event.priceRanges?.[0]?.currency || 'USD',
        ticketmaster_id: event.id,
      };
      
      const { error } = await supabase
        .from('shows')
        .insert(showData);
      
      if (error) {
        console.log(`    ❌ Error inserting show ${event.name}:`, error.message);
      } else {
        console.log(`    ✅ Inserted show: ${event.name} (${event.dates.start.localDate})`);
        showsInserted++;
      }
      
    } catch (error) {
      console.log(`    ❌ Error processing show ${event.name}:`, error.message);
    }
    
    // Small delay between insertions
    await delay(100);
  }
  
  console.log(`  📊 Inserted ${showsInserted} new shows for ${cityData.name}`);
  return showsInserted;
}

async function main() {
  console.log('🎪 Starting shows and venues sync...\n');
  
  if (!TICKETMASTER_API_KEY) {
    console.error('❌ TICKETMASTER_API_KEY environment variable is required');
    process.exit(1);
  }
  
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Supabase configuration is required (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
    process.exit(1);
  }
  
  console.log('🔑 Using Ticketmaster API key:', TICKETMASTER_API_KEY.substring(0, 10) + '...');
  console.log('🔑 Using Supabase URL:', SUPABASE_URL);
  
  let totalVenues = 0;
  let totalShows = 0;
  
  try {
    // Sync venues and shows for each city
    for (const city of CITIES_TO_SYNC) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🌆 Processing ${city.name}, ${city.state}`);
      console.log(`${'='.repeat(60)}`);
      
      // Sync venues first
      try {
        const venueCount = await syncVenuesForCity(city);
        totalVenues += venueCount;
      } catch (error) {
        console.error(`❌ Failed to sync venues for ${city.name}:`, error.message);
      }
      
      // Wait between venue and show sync
      await delay(3000);
      
      // Sync shows
      try {
        const showCount = await syncShowsForCity(city);
        totalShows += showCount;
      } catch (error) {
        console.error(`❌ Failed to sync shows for ${city.name}:`, error.message);
      }
      
      // Rate limit between cities
      console.log('  ⏳ Waiting 5 seconds before next city...');
      await delay(5000);
    }
    
    console.log('\n\n✅ Sync completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`  🏟️  Total venues inserted: ${totalVenues}`);
    console.log(`  🎤 Total shows inserted: ${totalShows}`);
    console.log('\n🎉 Real venue and show data is now available in the app!');
    console.log('\n📋 Next steps:');
    console.log('  1. Visit /venues to see the imported venues');
    console.log('  2. Visit /shows to see the imported shows');
    console.log('  3. Check individual show pages for voting functionality');
    
  } catch (error) {
    console.error('❌ Fatal error during sync:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Sync interrupted by user');
  process.exit(0);
});

main();