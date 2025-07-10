const { db } = require('./packages/database/src/client');
const { artists } = require('./packages/database/src/schema');
const { ilike } = require('drizzle-orm');

async function testDatabaseConnection() {
  try {
    // Test basic connection
    const artistCount = await db.select().from(artists).limit(5);

    if (artistCount.length > 0) {
    }

    // Test search functionality
    const searchResults = await db
      .select()
      .from(artists)
      .where(ilike(artists.name, '%coldplay%'))
      .limit(5);
    if (searchResults.length > 0) {
    }
  } catch (_error) {}
}

testDatabaseConnection()
  .then(() => {
    process.exit(0);
  })
  .catch((_error) => {
    process.exit(1);
  });
