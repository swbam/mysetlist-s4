#!/usr/bin/env node

import path from 'node:path';
import * as dotenv from 'dotenv';
import postgres from 'postgres';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function testConnection() {
  // Check environment
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    process.exit(1);
  }

  // Mask password in URL for logging
  const _maskedUrl = dbUrl.replace(/:([^@]+)@/, ':****@');

  try {
    const sql = postgres(dbUrl, {
      max: 1,
      ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
      onnotice: () => {}, // Suppress notices
    });

    // Test basic connectivity
    const _result =
      await sql`SELECT version(), current_database(), current_user`;

    // Check for tables
    const _tables = await sql`
      SELECT count(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    // Test specific tables
    const criticalTables = ['artists', 'shows', 'venues', 'users', 'setlists'];

    for (const table of criticalTables) {
      try {
        const _exists = await sql`
          SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${table}
          ) as exists
        `;
      } catch (_error) {}
    }

    // Close connection
    await sql.end();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
    } else if (error.code === '28P01' || error.message.includes('password')) {
    } else if (error.code === '3D000') {
    }

    process.exit(1);
  }
}

// Run the test
testConnection().catch(console.error);
