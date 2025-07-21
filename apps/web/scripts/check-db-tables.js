import { createSupabaseAdminClient } from '@repo/database';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createSupabaseAdminClient();

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