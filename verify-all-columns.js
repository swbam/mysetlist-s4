const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyColumns() {
  // Check artists columns
  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('*')
    .limit(1);
    
  if (artistError) {
    console.error('Error fetching artist:', artistError);
  } else if (artist && artist.length > 0) {
    console.log('Artists table columns:');
    const artistCols = Object.keys(artist[0]);
    console.log(artistCols.join(', '));
    console.log('Has previous_followers?', artistCols.includes('previous_followers'));
  }
  
  // Check shows columns
  const { data: show, error: showError } = await supabase
    .from('shows')
    .select('*')
    .limit(1);
    
  if (showError) {
    console.error('Error fetching show:', showError);
  } else if (show && show.length > 0) {
    console.log('\nShows table columns:');
    const showCols = Object.keys(show[0]);
    console.log(showCols.join(', '));
    console.log('Has previous_vote_count?', showCols.includes('previous_vote_count'));
  }
}

verifyColumns().catch(console.error);