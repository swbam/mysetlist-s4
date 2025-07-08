import { artists, db, shows, venues } from '@repo/database';

async function checkDatabase() {
  console.log('Checking database for data...\n');

  try {
    // Check artists
    const artistsData = await db.select().from(artists).limit(5);
    console.log(`Artists found: ${artistsData.length}`);
    if (artistsData.length > 0) {
      console.log('Sample artist:', {
        name: artistsData[0].name,
        slug: artistsData[0].slug,
        id: artistsData[0].id,
      });
    }

    // Check shows
    const showsData = await db.select().from(shows).limit(5);
    console.log(`\nShows found: ${showsData.length}`);
    if (showsData.length > 0) {
      console.log('Sample show:', {
        name: showsData[0].name,
        slug: showsData[0].slug,
        date: showsData[0].date,
        id: showsData[0].id,
      });
    }

    // Check venues
    const venuesData = await db.select().from(venues).limit(5);
    console.log(`\nVenues found: ${venuesData.length}`);
    if (venuesData.length > 0) {
      console.log('Sample venue:', {
        name: venuesData[0].name,
        city: venuesData[0].city,
        id: venuesData[0].id,
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking database:', error);
    process.exit(1);
  }
}

checkDatabase();
