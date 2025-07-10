import { SpotifyClient } from './packages/external-apis/index.ts';

async function testSpotify() {
  try {
    const client = new SpotifyClient({});

    await client.authenticate();

    const _results = await client.searchArtists('The Beatles', 1);
  } catch (_error) {}
}

testSpotify();
