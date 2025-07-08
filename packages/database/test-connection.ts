#!/usr/bin/env node

import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function testConnection() {
  console.log('🔍 Testing database connection...\n');

  // Check environment
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ DATABASE_URL is not set in environment variables');
    console.log('Please create a .env.local file with your database credentials');
    process.exit(1);
  }

  // Mask password in URL for logging
  const maskedUrl = dbUrl.replace(/:([^@]+)@/, ':****@');
  console.log(`📋 Database URL: ${maskedUrl}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);

  try {
    // Create a test connection
    console.log('🔌 Attempting to connect...');
    const sql = postgres(dbUrl, {
      max: 1,
      ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
      onnotice: () => {}, // Suppress notices
    });

    // Test basic connectivity
    const result = await sql`SELECT version(), current_database(), current_user`;
    console.log('✅ Connected successfully!\n');
    console.log('Database info:');
    console.log(`  Version: ${result[0].version}`);
    console.log(`  Database: ${result[0].current_database}`);
    console.log(`  User: ${result[0].current_user}\n`);

    // Check for tables
    const tables = await sql`
      SELECT count(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log(`📊 Found ${tables[0].count} tables in public schema`);

    // Test specific tables
    const criticalTables = ['artists', 'shows', 'venues', 'users', 'setlists'];
    console.log('\n🔍 Checking critical tables:');
    
    for (const table of criticalTables) {
      try {
        const exists = await sql`
          SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${table}
          ) as exists
        `;
        console.log(`  ${exists[0].exists ? '✅' : '❌'} ${table}`);
      } catch (error) {
        console.log(`  ❌ ${table} (error checking)`);
      }
    }

    // Close connection
    await sql.end();
    console.log('\n✅ All tests passed! Database is properly configured.');

  } catch (error: any) {
    console.error('\n❌ Connection failed!\n');
    console.error('Error details:');
    console.error(`  Code: ${error.code || 'N/A'}`);
    console.error(`  Message: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Suggestion: Make sure your database server is running');
    } else if (error.code === '28P01' || error.message.includes('password')) {
      console.error('\n💡 Suggestion: Check your database credentials');
    } else if (error.code === '3D000') {
      console.error('\n💡 Suggestion: The specified database does not exist');
    }
    
    process.exit(1);
  }
}

// Run the test
testConnection().catch(console.error);