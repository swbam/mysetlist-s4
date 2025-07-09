const { db } = require('./packages/database/src/client');
const { artists } = require('./packages/database/src/schema');
const { ilike } = require('drizzle-orm');

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const artistCount = await db.select().from(artists).limit(5);
    console.log('Artists found:', artistCount.length);
    
    if (artistCount.length > 0) {
      console.log('Sample artist:', artistCount[0]);
    }
    
    // Test search functionality
    const searchResults = await db.select().from(artists).where(
      ilike(artists.name, '%coldplay%')
    ).limit(5);
    
    console.log('Search results for "coldplay":', searchResults.length);
    if (searchResults.length > 0) {
      console.log('Coldplay results:', searchResults.map(a => ({ name: a.name, id: a.id })));
    }
    
    console.log('Database connection successful!');
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

testDatabaseConnection().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});