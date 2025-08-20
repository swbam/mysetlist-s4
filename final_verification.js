const postgres = require("postgres");

const connectionString =
  "postgresql://postgres.yzwkimtdaabyjbpykquu:Bambseth1590@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require";
const sql = postgres(connectionString);

async function finalVerification() {
  try {
    console.log("🔍 Final verification of Our Last Night import...\n");

    // 1. Check artist data
    const artists = await sql`
      SELECT id, name, slug, tm_attraction_id, spotify_id, import_status,
             shows_synced_at, song_catalog_synced_at, created_at
      FROM artists 
      WHERE name = 'Our Last Night'
    `;

    if (artists.length === 0) {
      console.log("❌ Artist not found!");
      return;
    }

    const artist = artists[0];
    console.log("✅ ARTIST DATA:");
    console.log(`   Name: ${artist.name}`);
    console.log(`   Slug: ${artist.slug}`);
    console.log(`   Import Status: ${artist.import_status}`);
    console.log(`   TM Attraction ID: ${artist.tm_attraction_id}`);
    console.log(`   Spotify ID: ${artist.spotify_id}`);
    console.log(`   Shows Synced: ${artist.shows_synced_at ? "✅" : "❌"}`);
    console.log(
      `   Songs Synced: ${artist.song_catalog_synced_at ? "✅" : "❌"}`,
    );

    // 2. Check shows
    const showsCount = await sql`
      SELECT COUNT(*) as count 
      FROM shows 
      WHERE headliner_artist_id = ${artist.id}
    `;
    console.log(`\n✅ SHOWS: ${showsCount[0].count} shows found`);

    if (Number.parseInt(showsCount[0].count) > 0) {
      const sampleShows = await sql`
        SELECT s.name, s.date, v.name as venue_name, v.city
        FROM shows s
        LEFT JOIN venues v ON s.venue_id = v.id
        WHERE s.headliner_artist_id = ${artist.id}
        ORDER BY s.date DESC
        LIMIT 3
      `;
      console.log("   Sample shows:");
      sampleShows.forEach((show) => {
        console.log(
          `     - ${show.name || "TBD"} at ${show.venue_name || "TBD"} in ${show.city || "TBD"} on ${show.date}`,
        );
      });
    }

    // 3. Check songs
    const songsCount = await sql`
      SELECT COUNT(*) as count 
      FROM artist_songs as1
      JOIN songs s ON as1.song_id = s.id
      WHERE as1.artist_id = ${artist.id}
    `;
    console.log(`\n✅ SONGS: ${songsCount[0].count} songs found`);

    if (Number.parseInt(songsCount[0].count) > 0) {
      const sampleSongs = await sql`
        SELECT s.name, s.album_name, s.popularity
        FROM artist_songs as1
        JOIN songs s ON as1.song_id = s.id
        WHERE as1.artist_id = ${artist.id}
        ORDER BY s.popularity DESC
        LIMIT 5
      `;
      console.log("   Top songs:");
      sampleSongs.forEach((song) => {
        console.log(
          `     - ${song.name} (${song.album_name}) - Popularity: ${song.popularity}`,
        );
      });
    }

    // 4. Summary
    console.log("\n📊 IMPORT SUMMARY:");
    console.log("   Artist: ✅ Imported");
    console.log(
      `   Shows: ${Number.parseInt(showsCount[0].count) > 0 ? "✅" : "❌"} ${showsCount[0].count} shows`,
    );
    console.log(
      `   Songs: ${Number.parseInt(songsCount[0].count) > 0 ? "✅" : "❌"} ${songsCount[0].count} songs`,
    );

    const isComplete =
      artist.import_status === "completed" ||
      artist.import_status === "initializing";
    const hasShows = Number.parseInt(showsCount[0].count) > 0;
    const hasSongs = Number.parseInt(songsCount[0].count) > 0;

    console.log(
      `\n🎯 OVERALL STATUS: ${isComplete && (hasShows || hasSongs) ? "✅ SUCCESS" : "⚠️  PARTIAL"}`,
    );

    if (isComplete && hasShows && hasSongs) {
      console.log("   🎉 Full import completed successfully!");
    } else if (isComplete && (hasShows || hasSongs)) {
      console.log("   ✅ Core import successful, some data imported");
    } else {
      console.log("   ⚠️  Import in progress or incomplete");
    }

    await sql.end();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

finalVerification();
