const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Use direct connection URL
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Missing database connection string');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Supabase connections
  }
});

async function applyMigration() {
  let client;
  try {
    client = await pool.connect();
    
    // Read the migration SQL
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250811_create_user_follows_artists.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying migration: user_follows_artists table...');
    
    // Execute the SQL
    await client.query(sql);
    
    console.log('✅ Migration applied successfully!');
    
    // Verify the table was created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_follows_artists'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Table user_follows_artists verified in database');
    }
    
  } catch (error) {
    console.error('Error applying migration:', error.message);
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Table or objects already exist - this is OK');
    } else {
      throw error;
    }
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

applyMigration().catch(console.error);