import { db } from "@repo/database";
import { artists, shows, songs, setlists } from "@repo/database/schema";
import { desc } from "drizzle-orm";

async function checkDatabase() {
  console.log("Checking database contents...\n");

  // Check artists
  const topArtists = await db
    .select()
    .from(artists)
    .orderBy(desc(artists.trendingScore))
    .limit(10);
  
  console.log(`Total artists with trending scores: ${topArtists.length}`);
  console.log("Top artists:");
  topArtists.forEach(artist => {
    console.log(`  - ${artist.name} (slug: ${artist.slug}, score: ${artist.trendingScore})`);
  });

  // Check shows  
  const recentShows = await db
    .select()
    .from(shows)
    .orderBy(desc(shows.date))
    .limit(5);
  
  console.log(`\nRecent shows: ${recentShows.length}`);

  // Check songs
  const songsCount = await db.select().from(songs).limit(1);
  console.log(`\nSongs in database: ${songsCount.length > 0 ? "Yes" : "No"}`);

  // Check setlists
  const setlistsCount = await db.select().from(setlists).limit(1);
  console.log(`Setlists in database: ${setlistsCount.length > 0 ? "Yes" : "No"}`);

  process.exit(0);
}

checkDatabase().catch(console.error);