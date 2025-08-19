// Direct artist import test bypassing potential Redis issues
const postgres = require('postgres');

const connectionString = "postgresql://postgres.yzwkimtdaabyjbpykquu:Bambseth1590@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require";
const sql = postgres(connectionString);

async function directImportTest() {
  try {
    console.log('Starting direct import test for Our Last Night...');
    
    // Step 1: Test Ticketmaster API call
    const apiKey = 'k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b';
    const tmAttractionId = 'K8vZ917GtG0';
    
    const response = await fetch(`https://app.ticketmaster.com/discovery/v2/attractions/${tmAttractionId}.json?apikey=${apiKey}`);
    const attraction = await response.json();
    
    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.status}`);
    }
    
    console.log('✓ Ticketmaster API call successful');
    console.log('  Name:', attraction.name);
    
    // Step 2: Extract data like the orchestrator does
    const slug = attraction.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    const spotifyUrl = attraction.externalLinks?.spotify?.[0]?.url;
    const spotifyId = spotifyUrl ? spotifyUrl.split('/').pop() : null;
    
    const mbid = attraction.externalLinks?.musicbrainz?.[0]?.id || null;
    
    const genres = attraction.classifications?.map(c => 
      [c.genre?.name, c.subGenre?.name]
        .filter(Boolean)
        .join(', ')
    ).filter(Boolean) || [];
    
    const imageUrl = attraction.images?.find(img => img.width && img.width >= 500)?.url ||
                     attraction.images?.[0]?.url || null;
    const smallImageUrl = attraction.images?.find(img => img.width && img.width < 500)?.url || imageUrl;
    
    console.log('✓ Data extraction successful');
    console.log('  Slug:', slug);
    console.log('  Spotify ID:', spotifyId);
    console.log('  MusicBrainz ID:', mbid);
    
    // Step 3: Test database insertion
    console.log('Testing database insertion...');
    
    const insertResult = await sql`
      INSERT INTO artists (
        tm_attraction_id, name, slug, spotify_id, mbid, 
        image_url, small_image_url, genres, import_status
      ) VALUES (
        ${tmAttractionId}, ${attraction.name}, ${slug}, ${spotifyId}, ${mbid},
        ${imageUrl}, ${smallImageUrl}, ${JSON.stringify(genres)}, 'initializing'
      )
      ON CONFLICT (tm_attraction_id) 
      DO UPDATE SET 
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        spotify_id = EXCLUDED.spotify_id,
        mbid = EXCLUDED.mbid,
        image_url = EXCLUDED.image_url,
        small_image_url = EXCLUDED.small_image_url,
        genres = EXCLUDED.genres,
        import_status = 'initializing',
        updated_at = NOW()
      RETURNING id, name, slug
    `;
    
    if (insertResult.length > 0) {
      console.log('✓ Database insertion successful');
      console.log('  Artist ID:', insertResult[0].id);
      console.log('  Name:', insertResult[0].name);
      console.log('  Slug:', insertResult[0].slug);
      
      // Step 4: Verify the insert
      const verifyResult = await sql`
        SELECT id, name, slug, tm_attraction_id, spotify_id, import_status
        FROM artists 
        WHERE tm_attraction_id = ${tmAttractionId}
      `;
      
      console.log('✓ Database verification successful');
      console.log('  Found', verifyResult.length, 'artist(s)');
      verifyResult.forEach(artist => {
        console.log(`    ${artist.name} (${artist.import_status})`);
      });
      
    } else {
      console.log('✗ Database insertion failed - no rows returned');
    }
    
    await sql.end();
    console.log('\nDirect import test completed successfully!');
    
  } catch (error) {
    console.error('Direct import test failed:', error);
    try {
      await sql.end();
    } catch {}
    process.exit(1);
  }
}

directImportTest();