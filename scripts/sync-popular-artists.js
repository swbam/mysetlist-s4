#!/usr/bin/env node

async function syncPopularArtists() {
  console.log('🎵 Syncing popular artists...');

  try {
    const response = await fetch('http://localhost:3000/api/artists/sync', {
      method: 'GET',
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('❌ Error:', response.status, text.substring(0, 200));
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ Success:', data);
  } catch (err) {
    console.error('❌ Failed:', err);
    process.exit(1);
  }
}

syncPopularArtists();
