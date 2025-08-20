// Test database connection through Prisma wrapper
import { prisma } from './apps/web/lib/db/prisma.ts';

async function testDatabase() {
  console.log('🔄 Testing database connection...');
  
  try {
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection: SUCCESS');
    
    // Test health check
    const health = await prisma.$health();
    console.log(`✅ Database health: ${health.status} (${health.timestamp})`);
    
    // Test basic query - count artists
    const artistCount = await prisma.artist.count();
    console.log(`✅ Artist table accessible, count: ${artistCount}`);
    
    console.log('🎉 Database is ready for operations!');
    return true;
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });