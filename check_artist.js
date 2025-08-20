const { drizzle } = require("drizzle-orm/postgres-js");
const postgres = require("postgres");
const { artists } = require("./packages/database/src/schema");
const { ilike, eq, or } = require("drizzle-orm");

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres.yzwkimtdaabyjbpykquu:Bambseth1590@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
const sql = postgres(connectionString);
const db = drizzle(sql);

async function checkArtist() {
  try {
    const ourLastNightArtists = await db
      .select()
      .from(artists)
      .where(
        or(
          ilike(artists.name, "%our last night%"),
          ilike(artists.slug, "%our%last%night%"),
          eq(artists.tmAttractionId, "K8vZ917GtG0"),
        ),
      );

    console.log("Found artists:", JSON.stringify(ourLastNightArtists, null, 2));

    if (ourLastNightArtists.length > 0) {
      const artist = ourLastNightArtists[0];
      console.log("\nArtist details:");
      console.log("ID:", artist.id);
      console.log("Name:", artist.name);
      console.log("Slug:", artist.slug);
      console.log("TM Attraction ID:", artist.tmAttractionId);
      console.log("Spotify ID:", artist.spotifyId);
      console.log("Import Status:", artist.importStatus);
      console.log("Shows Synced At:", artist.showsSyncedAt);
      console.log("Song Catalog Synced At:", artist.songCatalogSyncedAt);

      // Check for shows
      const { shows } = require("./packages/database/src/schema");
      const artistShows = await db
        .select()
        .from(shows)
        .where(eq(shows.artistId, artist.id))
        .limit(5);

      console.log("\nShows count:", artistShows.length);
      if (artistShows.length > 0) {
        console.log("Sample shows:", JSON.stringify(artistShows, null, 2));
      }

      // Check for songs
      const { songs } = require("./packages/database/src/schema");
      const artistSongs = await db
        .select()
        .from(songs)
        .where(eq(songs.artistId, artist.id))
        .limit(5);

      console.log("\nSongs count:", artistSongs.length);
      if (artistSongs.length > 0) {
        console.log("Sample songs:", JSON.stringify(artistSongs, null, 2));
      }
    }

    await sql.end();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkArtist();
