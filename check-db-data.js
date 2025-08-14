const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yzwkimtdaabyjbpykquu.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTQ0NDY3MCwiZXhwIjoyMDQ1MDIwNjcwfQ.6lCBSPxerFdHqOIkTyKOoCtrrmgortHdMj85WeJVGHk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('=== Checking Artists Table ===');
  const { data: artists, error: artistsError } = await supabase
    .from('artists')
    .select('id, name, slug, trending_score')
    .limit(5);
    
  if (artistsError) {
    console.error('Artists error:', artistsError);
  } else {
    console.log(`Found ${artists?.length || 0} artists`);
    if (artists?.length > 0) {
      console.log('Sample artists:', artists);
    }
  }

  console.log('\n=== Checking Shows Table ===');
  const { data: shows, error: showsError } = await supabase
    .from('shows')
    .select('id, name, slug, trending_score, status, date')
    .limit(5);
    
  if (showsError) {
    console.error('Shows error:', showsError);
  } else {
    console.log(`Found ${shows?.length || 0} shows`);
    if (shows?.length > 0) {
      console.log('Sample shows:', shows);
    }
  }
  
  console.log('\n=== Checking Shows with Trending Scores ===');
  const { data: trendingShows, error: trendingError } = await supabase
    .from('shows')
    .select('id, name, slug, trending_score, status')
    .gt('trending_score', 0)
    .limit(5);
    
  if (trendingError) {
    console.error('Trending shows error:', trendingError);
  } else {
    console.log(`Found ${trendingShows?.length || 0} shows with trending scores`);
    if (trendingShows?.length > 0) {
      console.log('Trending shows:', trendingShows);
    }
  }

  console.log('\n=== Checking Venues Table ===');
  const { data: venues, error: venuesError } = await supabase
    .from('venues')
    .select('id, name, city, state')
    .limit(5);
    
  if (venuesError) {
    console.error('Venues error:', venuesError);
  } else {
    console.log(`Found ${venues?.length || 0} venues`);
    if (venues?.length > 0) {
      console.log('Sample venues:', venues);
    }
  }
}

checkDatabase().catch(console.error);