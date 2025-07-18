import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkData() {
  const tables = [
    { name: 'artists', orderBy: 'trending_score' },
    { name: 'shows', orderBy: 'date' },
    { name: 'venues', orderBy: 'name' },
    { name: 'songs', orderBy: 'title' },
    { name: 'setlists', orderBy: 'created_at' },
    { name: 'users', orderBy: 'created_at' }
  ];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table.name)
        .select('*', { count: 'exact' })
        .limit(5);
        
      if (error) {
        console.log(`\n${table.name}: ERROR - ${error.message}`);
      } else {
        console.log(`\n${table.name}: ${count} total records`);
        if (data && data.length > 0) {
          console.log('Sample data:', JSON.stringify(data[0], null, 2).substring(0, 200) + '...');
        }
      }
    } catch (e) {
      console.log(`\n${table.name}: ERROR - ${e.message}`);
    }
  }
}

checkData();