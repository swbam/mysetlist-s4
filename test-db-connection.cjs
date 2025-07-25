#!/usr/bin/env node

// Simple database connection test
const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log('🔍 Testing Database Connection...\n');
  
  // Check environment variables
  console.log('Environment Check:');
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('');
  
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }
  
  // Mask the password in the URL for logging
  const maskedUrl = connectionString.replace(/:([^@]+)@/, ':****@');
  console.log('Connection String:', maskedUrl);
  console.log('');
  
  let sql;
  
  try {
    // Create connection
    sql = postgres(connectionString, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: 'require',
      prepare: false,
    });
    
    console.log('✅ Connection object created');
    
    // Test basic query
    console.log('🔄 Testing basic query...');
    const result = await sql`SELECT current_database(), version()`;
    console.log('✅ Basic query successful');
    console.log('Database:', result[0].current_database);
    console.log('Version:', result[0].version.split(' ')[0]);
    console.log('');
    
    // Check for tables
    console.log('🔄 Checking for tables...');
    const tables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `;
    
    console.log(`✅ Found ${tables.length} tables:`);
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table.tablename}`);
    });
    
    if (tables.length === 0) {
      console.log('⚠️  No tables found - database may need migrations');
    }
    
    console.log('\n✅ Database connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
    if (error.detail) console.error('Detail:', error.detail);
    if (error.hint) console.error('Hint:', error.hint);
    process.exit(1);
  } finally {
    if (sql) {
      await sql.end();
    }
  }
}

testConnection().catch(console.error);
