import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

async function applyNewMigrations() {
  console.log('🚀 Applying new migrations...');

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const migrations = [
    '0018_add_artist_songs_table.sql',
    '0019_add_mbid_to_artists.sql',
  ];

  for (const migrationFile of migrations) {
    const migrationPath = path.join(
      __dirname,
      '..',
      'migrations',
      migrationFile
    );

    if (fs.existsSync(migrationPath)) {
      console.log(`📝 Running migration: ${migrationFile}`);

      try {
        const sql = fs.readFileSync(migrationPath, 'utf8');
        const { error } = await supabase.rpc('exec_sql', { sql });

        if (error) {
          console.error(`❌ Migration ${migrationFile} failed:`, error);
        } else {
          console.log(`✅ Migration ${migrationFile} completed successfully`);
        }
      } catch (error) {
        console.error(
          `❌ Error reading or applying migration ${migrationFile}:`,
          error
        );
      }
    } else {
      console.log(`⚠️  Migration file not found: ${migrationFile}`);
    }
  }

  console.log('✨ Migration process completed');
}

applyNewMigrations().catch(console.error);
