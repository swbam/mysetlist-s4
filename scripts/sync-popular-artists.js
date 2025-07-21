#!/usr/bin/env node

async function syncPopularArtists() {
  try {
    const response = await fetch('http://localhost:3001/api/artists/sync', {
      method: 'GET',
    });

    if (!response.ok) {
      const _text = await response.text();
      process.exit(1);
    }

    const _data = await response.json();
  } catch (_err) {
    process.exit(1);
  }
}

syncPopularArtists();
