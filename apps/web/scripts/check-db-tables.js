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

async function checkTables() {
  // Try to query a few tables to see what exists
  const tables = ['artists', 'shows', 'venues', 'songs', 'setlists', 'users'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
        
      if (error) {
        console.log(`Table ${table}: NOT FOUND - ${error.message}`);
      } else {
        console.log(`Table ${table}: EXISTS`);
      }
    } catch (e) {
      console.log(`Table ${table}: ERROR - ${e.message}`);
    }
  }
}

checkTables();