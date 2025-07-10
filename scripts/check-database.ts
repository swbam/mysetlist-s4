import { artists, db, shows, venues } from '@repo/database';

async function checkDatabase() {
  try {
    // Check artists
    const artistsData = await db.select().from(artists).limit(5);
    if (artistsData.length > 0) {
    }

    // Check shows
    const showsData = await db.select().from(shows).limit(5);
    if (showsData.length > 0) {
    }

    // Check venues
    const venuesData = await db.select().from(venues).limit(5);
    if (venuesData.length > 0) {
    }

    process.exit(0);
  } catch (_error) {
    process.exit(1);
  }
}

checkDatabase();
