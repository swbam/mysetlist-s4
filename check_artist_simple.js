const postgres = require('postgres');

const connectionString = "postgresql://postgres.yzwkimtdaabyjbpykquu:Bambseth1590@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require";
const sql = postgres(connectionString);

async function checkArtist() {
  try {
    // Check for Our Last Night artist
    const artistQuery = `
      SELECT id, name, slug, tm_attraction_id, spotify_id, import_status, 
             shows_synced_at, song_catalog_synced_at, created_at, last_full_sync_at
      FROM artists 
      WHERE name ILIKE '%our last night%' 
         OR slug LIKE '%our%last%night%' 
         OR tm_attraction_id = 'K8vZ917GtG0'
    `;
    
    const artists = await sql`${artistQuery}`;
    console.log('Found artists:', artists.length);
    
    if (artists.length === 0) {
      console.log('No "Our Last Night" artist found in database');
      await sql.end();
      return;
    }

    for (const artist of artists) {
      console.log('\n=== Artist Details ===');
      console.log('ID:', artist.id);
      console.log('Name:', artist.name);
      console.log('Slug:', artist.slug);
      console.log('TM Attraction ID:', artist.tm_attraction_id);
      console.log('Spotify ID:', artist.spotify_id);
      console.log('Import Status:', artist.import_status);
      console.log('Shows Synced At:', artist.shows_synced_at);
      console.log('Song Catalog Synced At:', artist.song_catalog_synced_at);
      console.log('Created At:', artist.created_at);
      console.log('Last Full Sync At:', artist.last_full_sync_at);

      // Check for shows
      const shows = await sql`
        SELECT COUNT(*) as count FROM shows WHERE artist_id = ${artist.id}
      `;
      console.log('\nShows count:', shows[0].count);

      if (parseInt(shows[0].count) > 0) {
        const sampleShows = await sql`
          SELECT id, tm_event_id, title, date, venue_name 
          FROM shows 
          WHERE artist_id = ${artist.id} 
          ORDER BY date DESC 
          LIMIT 3
        `;
        console.log('Sample shows:');
        sampleShows.forEach(show => {
          console.log(`  - ${show.title} at ${show.venue_name} on ${show.date}`);
        });
      }

      // Check for songs
      const songs = await sql`
        SELECT COUNT(*) as count FROM songs WHERE artist_id = ${artist.id}
      `;
      console.log('\nSongs count:', songs[0].count);

      if (parseInt(songs[0].count) > 0) {
        const sampleSongs = await sql`
          SELECT id, title, album_name, spotify_track_id 
          FROM songs 
          WHERE artist_id = ${artist.id} 
          ORDER BY created_at DESC 
          LIMIT 5
        `;
        console.log('Sample songs:');
        sampleSongs.forEach(song => {
          console.log(`  - ${song.title} (${song.album_name})`);
        });
      }
    }

    await sql.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkArtist();