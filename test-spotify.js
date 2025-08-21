#!/usr/bin/env node

// Test Spotify client authentication and search
require('dotenv').config({ path: '.env.local' });

async function testSpotify() {
  try {
    console.log('🎵 Testing Spotify client authentication and search...\n');

    // Test direct Spotify authentication
    console.log('1. Testing Spotify authentication...');
    
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.log('❌ Spotify credentials missing');
      return;
    }
    
    console.log('✅ Spotify credentials found');
    
    // Test authentication
    const authResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('✅ Spotify authentication successful');
      
      // Test artist search
      console.log('\n2. Testing Spotify artist search...');
      const searchResponse = await fetch('https://api.spotify.com/v1/search?q=Coldplay&type=artist&limit=5', {
        headers: {
          'Authorization': `Bearer ${authData.access_token}`
        }
      });
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const artists = searchData.artists?.items || [];
        console.log(`✅ Spotify search works! Found ${artists.length} artists`);
        
        if (artists.length > 0) {
          const coldplay = artists.find(artist => artist.name === 'Coldplay');
          if (coldplay) {
            console.log(`✅ Found Coldplay: ${coldplay.name} (${coldplay.id})`);
            console.log(`   Popularity: ${coldplay.popularity}`);
            console.log(`   Followers: ${coldplay.followers.total}`);
            console.log(`   Genres: ${coldplay.genres.join(', ')}`);
            
            // Test getting albums
            console.log('\n3. Testing Spotify albums...');
            const albumsResponse = await fetch(`https://api.spotify.com/v1/artists/${coldplay.id}/albums?include_groups=album&market=US&limit=5`, {
              headers: {
                'Authorization': `Bearer ${authData.access_token}`
              }
            });
            
            if (albumsResponse.ok) {
              const albumsData = await albumsResponse.json();
              const albums = albumsData.items || [];
              console.log(`✅ Found ${albums.length} albums`);
              
              if (albums.length > 0) {
                console.log(`   Latest album: ${albums[0].name} (${albums[0].release_date})`);
              }
            } else {
              console.log('❌ Albums fetch failed');
            }
          } else {
            console.log('⚠️  Coldplay not found in search results');
          }
        }
      } else {
        console.log('❌ Spotify search failed:', searchResponse.status);
      }
    } else {
      console.log('❌ Spotify authentication failed:', authResponse.status);
      const errorText = await authResponse.text();
      console.log('Error details:', errorText);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testSpotify();
