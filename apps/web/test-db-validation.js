#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Test database connection
async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseKey);
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Test 1: Check database connection
    console.log('1. Testing basic connection...');
    const { data: test, error: testError } = await supabase
      .from('artists')
      .select('*', { count: 'exact', head: true });
    
    if (testError) {
      console.error('❌ Database connection failed:', testError.message);
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // Test 2: Check table structure
    console.log('\n2. Checking table structure...');
    const { data: tables, error: tableError } = await supabase.rpc('get_table_names');
    
    if (tableError) {
      console.log('⚠️  Could not get table names via RPC, trying direct query...');
      
      // Alternative: Check if specific tables exist
      const testTables = ['artists', 'shows', 'venues', 'songs', 'setlists', 'votes'];
      for (const table of testTables) {
        try {
          const { data, error } = await supabase.from(table).select('*').limit(1);
          if (error) {
            console.log(`❌ Table "${table}" not accessible:`, error.message);
          } else {
            console.log(`✅ Table "${table}" exists and is accessible`);
          }
        } catch (err) {
          console.log(`❌ Error testing table "${table}":`, err.message);
        }
      }
    } else {
      console.log('✅ Tables accessible via RPC');
    }
    
    // Test 3: Test API endpoints
    console.log('\n3. Testing API endpoints...');
    const baseUrl = 'http://localhost:3001';
    
    try {
      const healthResponse = await fetch(`${baseUrl}/api/health`);
      console.log('Health API status:', healthResponse.status);
      
      const trendingResponse = await fetch(`${baseUrl}/api/trending/artists`);
      console.log('Trending artists API status:', trendingResponse.status);
      
      if (trendingResponse.ok) {
        const trendingData = await trendingResponse.json();
        console.log('✅ Trending API working, returned:', trendingData.artists?.length || 0, 'artists');
      } else {
        const errorText = await trendingResponse.text();
        console.log('❌ Trending API error:', errorText);
      }
      
      const searchResponse = await fetch(`${baseUrl}/api/search/suggestions?q=test`);
      console.log('Search suggestions API status:', searchResponse.status);
      
    } catch (apiError) {
      console.log('❌ API endpoints not accessible:', apiError.message);
    }
    
    // Test 4: Check for data existence
    console.log('\n4. Checking data existence...');
    
    const { data: artistCount } = await supabase
      .from('artists')
      .select('*', { count: 'exact' });
    
    const { data: showCount } = await supabase
      .from('shows')
      .select('*', { count: 'exact' });
    
    const { data: venueCount } = await supabase
      .from('venues')
      .select('*', { count: 'exact' });
    
    console.log('📊 Data Summary:');
    console.log(`  - Artists: ${artistCount?.length || 0}`);
    console.log(`  - Shows: ${showCount?.length || 0}`);
    console.log(`  - Venues: ${venueCount?.length || 0}`);
    
    console.log('\n✅ Database validation completed successfully!');
    
  } catch (error) {
    console.error('❌ Database validation failed:', error.message);
  }
}

// Run the test
testDatabaseConnection().catch(console.error);