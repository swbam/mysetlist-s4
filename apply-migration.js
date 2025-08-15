#!/usr/bin/env node

/**
 * Emergency migration script to apply GROK.md schema updates
 * Bypasses Drizzle and applies SQL directly to fix the schema
 */

const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Disable SSL verification for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function applyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Connecting to database...');
    const client = await pool.connect();
    
    console.log('📖 Reading migration file...');
    const migrationSQL = fs.readFileSync('./packages/database/migrations/0012_grok_schema_updates.sql', 'utf8');
    
    console.log('🚀 Applying GROK.md schema migration...');
    await client.query(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    
    // Test a few key queries to ensure schema is correct
    console.log('🧪 Testing schema changes...');
    
    const testQueries = [
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'artists' AND column_name = 'tm_attraction_id'",
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'import_status' AND column_name = 'progress'",
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'tm_venue_id'"
    ];
    
    for (const query of testQueries) {
      const result = await client.query(query);
      if (result.rows.length > 0) {
        console.log(`✅ ${result.rows[0].column_name} column exists`);
      }
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

applyMigration().catch(console.error);