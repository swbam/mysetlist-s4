import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDataRendering() {
  console.log('Testing data rendering issues...\n');

  // Test trending artists query
  console.log('1. Testing trending artists query:');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const { data: trendingArtists, error } = await supabase
      .from('artists')
      .select('id, name, slug, image_url, genres, verified, trending_score')
      .gt('trending_score', 0)
      .order('trending_score', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching trending artists:', error);
    } else {
      console.log(`Found ${trendingArtists?.length || 0} trending artists`);
      if (trendingArtists?.length > 0) {
        console.log('Sample artist:', trendingArtists[0]);
      }
    }
  } catch (e) {
    console.error('Exception:', e);
  }

  // Test popular artists query
  console.log('\n2. Testing popular artists query:');
  try {
    const { data: popularArtists, error } = await supabase
      .from('artists')
      .select('*')
      .eq('verified', true)
      .order('trending_score', { ascending: false })
      .limit(8);

    if (error) {
      console.error('Error fetching popular artists:', error);
    } else {
      console.log(`Found ${popularArtists?.length || 0} popular artists`);
    }
  } catch (e) {
    console.error('Exception:', e);
  }

  // Test shows with upcoming dates
  console.log('\n3. Testing upcoming shows:');
  try {
    const { data: upcomingShows, error } = await supabase
      .from('shows')
      .select('*')
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(5);

    if (error) {
      console.error('Error fetching upcoming shows:', error);
    } else {
      console.log(`Found ${upcomingShows?.length || 0} upcoming shows`);
      if (upcomingShows?.length > 0) {
        console.log('Next show date:', upcomingShows[0].date);
      }
    }
  } catch (e) {
    console.error('Exception:', e);
  }

  // Check environment variables
  console.log('\n4. Environment check:');
  console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
  console.log('POSTGRES_URL present:', !!process.env.POSTGRES_URL);
  console.log('SUPABASE_URL present:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('NODE_ENV:', process.env.NODE_ENV);
}

testDataRendering();