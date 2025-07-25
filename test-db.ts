import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection...\n');
  
  // Check environment variables
  console.log('Environment Check:');
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.log('SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('');
  
  try {
    // Try to import the database module
    console.log('🔄 Importing database module...');
    const dbModule = await import('./packages/database/src/client');
    console.log('✅ Database module imported successfully');
    console.log('Available exports:', Object.keys(dbModule));
    console.log('');
    
    const { db, sql } = dbModule;
    
    if (!db) {
      console.error('❌ Database instance is null');
      return;
    }
    
    console.log('🔄 Testing basic query...');
    const result = await db.execute(sql`SELECT current_database(), version()`);
    console.log('✅ Basic query successful');
    console.log('Database:', result[0]?.current_database);
    console.log('Version:', result[0]?.version?.split(' ')[0]);
    console.log('');
    
    // Check for tables
    console.log('🔄 Checking for tables...');
    const tables = await db.execute(sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log(`✅ Found ${tables.length} tables:`);
    tables.forEach((table: any, index: number) => {
      console.log(`  ${index + 1}. ${table.tablename}`);
    });
    
    if (tables.length === 0) {
      console.log('⚠️  No tables found - database may need migrations');
    }
    
    console.log('\n✅ Database connection test completed successfully!');
    
  } catch (error: any) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
    if (error.detail) console.error('Detail:', error.detail);
    if (error.hint) console.error('Hint:', error.hint);
    if (error.stack) console.error('Stack:', error.stack);
  }
}

testDatabaseConnection().catch(console.error);