const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Environment variables missing:');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrendingData() {
  try {
    console.log('Checking artists with trending scores...');
    
    // Check basic artist count
    const { data: allArtists, error: allError } = await supabase
      .from('artists')
      .select('id, name, trending_score, popularity')
      .limit(5);
    
    if (allError) {
      console.error('Error querying all artists:', allError);
    } else {
      console.log('\nAll artists sample:', allArtists);
    }

    // Check artists with trending scores
    const { data: trendingArtists, error: trendingError } = await supabase
      .from('artists')
      .select('id, name, trending_score, popularity, follower_count')
      .gt('trending_score', 0)
      .order('trending_score', { ascending: false })
      .limit(10);
    
    if (trendingError) {
      console.error('Error querying trending artists:', trendingError);
    } else {
      console.log('\nTrending artists:', trendingArtists);
    }

    // Check total counts
    const { count: totalArtists } = await supabase
      .from('artists')
      .select('*', { count: 'exact', head: true });
    
    const { count: trendingCount } = await supabase
      .from('artists')
      .select('*', { count: 'exact', head: true })
      .gt('trending_score', 0);
    
    console.log('\nDatabase stats:');
    console.log('Total artists:', totalArtists);
    console.log('Artists with trending scores:', trendingCount);

    // Check cron job logs if available
    const { data: cronLogs, error: cronError } = await supabase
      .from('cron_logs')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(5);
    
    if (!cronError && cronLogs) {
      console.log('\nRecent cron job logs:', cronLogs);
    }

  } catch (error) {
    console.error('Database check failed:', error);
  }
}

checkTrendingData();
