const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTrendingScores() {
  try {
    console.log('Fixing trending scores for all artists...');
    
    // First, let's update trending scores directly in the artists table
    console.log('\n1. Updating trending scores based on popularity and followers...');
    
    const { data: updateResult, error: updateError } = await supabase
      .from('artists')
      .update({
        trending_score: 
          (
            // Base calculation using available fields
            `COALESCE(popularity, 0) * 0.4 + 
             COALESCE(follower_count, 0) * 0.3 + 
             COALESCE(followers, 0) * 0.0001 + 
             CASE WHEN last_synced_at > NOW() - INTERVAL '30 days' THEN 10 ELSE 0 END`
          )
      })
      .gte('popularity', 0); // Update all artists with popularity data
    
    if (updateError) {
      console.error('Direct update failed:', updateError);
      
      // Try a simpler approach with SQL
      console.log('\n2. Trying SQL approach...');
      const { data: sqlResult, error: sqlError } = await supabase
        .rpc('sql', {
          query: `
            UPDATE artists 
            SET trending_score = (
              COALESCE(popularity, 0) * 0.4 + 
              COALESCE(follower_count, 0) * 0.3 + 
              COALESCE(followers, 0) * 0.0001 + 
              CASE WHEN last_synced_at > NOW() - INTERVAL '30 days' THEN 10 ELSE 0 END
            )
            WHERE id IS NOT NULL;
          `
        });
      
      if (sqlError) {
        console.error('SQL update failed:', sqlError);
        
        // Try updating artists one by one for top artists
        console.log('\n3. Updating artists individually...');
        const { data: artists, error: fetchError } = await supabase
          .from('artists')
          .select('id, name, popularity, follower_count, followers, last_synced_at')
          .order('popularity', { ascending: false })
          .limit(50);
        
        if (!fetchError && artists) {
          for (const artist of artists) {
            const trendingScore = 
              (artist.popularity || 0) * 0.4 + 
              (artist.follower_count || 0) * 0.3 + 
              (artist.followers || 0) * 0.0001 + 
              (artist.last_synced_at && new Date(artist.last_synced_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) ? 10 : 0);
            
            const { error: individualError } = await supabase
              .from('artists')
              .update({ trending_score: trendingScore })
              .eq('id', artist.id);
            
            if (!individualError) {
              console.log(`Updated ${artist.name}: ${trendingScore}`);
            }
          }
        }
      } else {
        console.log('SQL update succeeded:', sqlResult);
      }
    } else {
      console.log('Direct update succeeded');
    }

    // Check results
    console.log('\n4. Checking updated trending scores...');
    const { data: updated, error: checkError } = await supabase
      .from('artists')
      .select('id, name, trending_score, popularity, follower_count')
      .gt('trending_score', 0)
      .order('trending_score', { ascending: false })
      .limit(20);
    
    if (!checkError && updated) {
      console.log('Artists with updated trending scores:', updated);
    }

  } catch (error) {
    console.error('Fix trending scores failed:', error);
  }
}

fixTrendingScores();
