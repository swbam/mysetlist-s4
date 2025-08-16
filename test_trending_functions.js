const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTrendingFunctions() {
  try {
    console.log('Testing trending score functions...');
    
    // Test update_trending_scores function
    console.log('\n1. Testing update_trending_scores()...');
    const { data: updateResult, error: updateError } = await supabase
      .rpc('update_trending_scores');
    
    if (updateError) {
      console.error('Error calling update_trending_scores:', updateError);
    } else {
      console.log('update_trending_scores result:', updateResult);
    }

    // Test refresh_trending_data function if it exists
    console.log('\n2. Testing refresh_trending_data()...');
    const { data: refreshResult, error: refreshError } = await supabase
      .rpc('refresh_trending_data');
    
    if (refreshError) {
      console.error('Error calling refresh_trending_data:', refreshError);
    } else {
      console.log('refresh_trending_data result:', refreshResult);
    }

    // Check trending scores after function calls
    console.log('\n3. Checking trending scores after function calls...');
    const { data: afterUpdate, error: afterError } = await supabase
      .from('artists')
      .select('id, name, trending_score, popularity, follower_count')
      .gt('trending_score', 0)
      .order('trending_score', { ascending: false })
      .limit(10);
    
    if (afterError) {
      console.error('Error querying after update:', afterError);
    } else {
      console.log('Artists with trending scores after update:', afterUpdate);
    }

    // Check if functions exist
    console.log('\n4. Checking available functions...');
    const { data: functions, error: funcError } = await supabase
      .from('pg_proc')
      .select('proname')
      .ilike('proname', '%trending%');
    
    if (!funcError && functions) {
      console.log('Available trending functions:', functions.map(f => f.proname));
    }

  } catch (error) {
    console.error('Function test failed:', error);
  }
}

testTrendingFunctions();
