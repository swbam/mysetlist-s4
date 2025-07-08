const {
  SpotifyClient,
} = require('./packages/external-apis/dist/clients/spotify');

async function testSpotify() {
  try {
    console.log('Testing Spotify API...');

    const client = new SpotifyClient({});
    console.log('Client created, authenticating...');

    await client.authenticate();
    console.log('Authenticated successfully!');

    const results = await client.searchArtists('The Beatles', 1);
    console.log('Search results:', JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

testSpotify();
