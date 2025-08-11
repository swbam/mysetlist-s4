#!/usr/bin/env node
/**
 * Simple script to sync songs for top artists
 * Uses CommonJS to avoid top-level await issues
 */

require('dotenv').config();
const fetch = require('node-fetch');

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Top artists to sync songs for
const TOP_ARTISTS = [
  { name: 'Taylor Swift', spotifyId: '06HL4z0CvFAxyc27GXpf02' },
  { name: 'Drake', spotifyId: '3TVXtAsR1Inumwj472S9r4' },
  { name: 'Bad Bunny', spotifyId: '4q3ewBCX7sLwd24euuV69X' },
  { name: 'The Weeknd', spotifyId: '1Xyo4u8uXC1ZmMpatF05PJ' },
  { name: 'Post Malone', spotifyId: '246dkjvS1zLTtiykXe5h60' },
];

async function getSpotifyToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
}

async function getArtistTopTracks(spotifyId, token) {
  const response = await fetch(
    `https://api.spotify.com/v1/artists/${spotifyId}/top-tracks?market=US`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();
  return data.tracks || [];
}

async function syncSongsToDatabase(artistName, tracks) {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // First, get or create the artist
  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('id')
    .ilike('name', artistName)
    .single();

  if (artistError || !artist) {
    console.log(`  ⚠️  Artist ${artistName} not found in database`);
    return;
  }

  const artistId = artist.id;
  console.log(`  🎤 Found artist ${artistName} (ID: ${artistId})`);

  // Insert songs
  for (const track of tracks) {
    // Check if song exists
    const { data: existingSong } = await supabase
      .from('songs')
      .select('id')
      .eq('spotify_id', track.id)
      .single();

    let songId;
    
    if (!existingSong) {
      // Create new song
      const { data: newSong, error: songError } = await supabase
        .from('songs')
        .insert({
          title: track.name,
          artist: track.artists[0]?.name || 'Unknown Artist', // Add artist name
          spotify_id: track.id,
          duration_ms: track.duration_ms,
          preview_url: track.preview_url,
          // album_name: track.album.name, // Column doesn't exist
          // album_image_url: track.album.images[0]?.url, // Column doesn't exist yet
          popularity: track.popularity,
          external_urls: track.external_urls.spotify,
        })
        .select('id')
        .single();

      if (songError) {
        console.log(`    ❌ Error creating song ${track.name}:`, songError.message);
        continue;
      }

      songId = newSong.id;
      console.log(`    ✅ Created song: ${track.name}`);
    } else {
      songId = existingSong.id;
      console.log(`    ⏭️  Song already exists: ${track.name}`);
    }

    // Link song to artist
    const { error: linkError } = await supabase
      .from('artist_songs')
      .upsert({
        artist_id: artistId,
        song_id: songId,
      }, {
        onConflict: 'artist_id,song_id'
      });

    if (linkError && !linkError.message.includes('duplicate')) {
      console.log(`    ⚠️  Error linking song to artist:`, linkError.message);
    }
  }
}

async function main() {
  console.log('🎵 Starting song sync for top artists...\n');

  try {
    // Get Spotify token
    console.log('🔐 Getting Spotify access token...');
    const token = await getSpotifyToken();
    console.log('✅ Got Spotify token\n');

    // Sync each artist
    for (const artist of TOP_ARTISTS) {
      console.log(`\n📀 Syncing songs for ${artist.name}...`);
      
      try {
        // Get top tracks from Spotify
        const tracks = await getArtistTopTracks(artist.spotifyId, token);
        console.log(`  📊 Found ${tracks.length} top tracks`);

        // Save to database
        await syncSongsToDatabase(artist.name, tracks);
        
        console.log(`  ✅ Completed sync for ${artist.name}`);
      } catch (error) {
        console.error(`  ❌ Error syncing ${artist.name}:`, error.message);
      }

      // Rate limit delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n\n✅ Song sync completed!');
    console.log('🎉 Artists should now have songs in their catalogs for voting!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();