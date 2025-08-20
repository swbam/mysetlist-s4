# External API Clients

Robust API client implementations for the MySetlist concert setlist application. All clients extend the `BaseApiClient` for consistent error handling, retry logic, rate limiting, and circuit breaker patterns.

## Overview

### Base Client Features

- **Retry Logic**: Exponential backoff with jitter for failed requests
- **Rate Limiting**: Token bucket algorithm with configurable rates
- **Circuit Breaker**: Automatic failure detection and recovery
- **Health Monitoring**: Built-in metrics and health checks
- **Error Handling**: Comprehensive error classification and recovery

### Supported APIs

| Service | Client Class | Purpose |
|---------|-------------|---------|
| Spotify | `SpotifyApiClient` | Artist data, albums, tracks, audio features |
| Ticketmaster | `TicketmasterApiClient` | Concert events, venues, attractions |
| Setlist.fm | `SetlistFmClient` | Concert setlists, song data |

## Quick Start

```typescript
import { 
  SpotifyApiClient, 
  TicketmasterApiClient, 
  SetlistFmClient 
} from './adapters';

// Initialize clients (uses environment variables automatically)
const spotify = new SpotifyApiClient();
const ticketmaster = new TicketmasterApiClient();
const setlistfm = new SetlistFmClient();

// Test connectivity
const [spotifyTest, ticketmasterTest, setlistfmTest] = await Promise.all([
  spotify.testConnection(),
  ticketmaster.testConnection(),
  setlistfm.testConnection()
]);

console.log('API Status:', {
  spotify: spotifyTest.success,
  ticketmaster: ticketmasterTest.success,
  setlistfm: setlistfmTest.success
});
```

## Environment Variables

Required environment variables:

```bash
# Spotify Web API
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Ticketmaster Discovery API  
TICKETMASTER_API_KEY=your_ticketmaster_api_key

# Setlist.fm API
SETLISTFM_API_KEY=your_setlistfm_api_key
```

## Usage Examples

### Spotify Client

```typescript
import { SpotifyApiClient } from './adapters';

const spotify = new SpotifyApiClient();

// Search for artists
const { data: searchResults } = await spotify.searchArtists('Taylor Swift');
const artist = searchResults.artists.items[0];

// Get artist's albums with pagination
const albums = [];
for await (const albumBatch of spotify.iterateArtistAlbums(artist.id)) {
  albums.push(...albumBatch);
}

// Get track details in batches
const trackIds = albums.flatMap(album => album.tracks?.items?.map(t => t.id) || []);
const { data: trackDetails } = await spotify.getTracks(trackIds);

// Get audio features (if available)
const { data: audioFeatures } = await spotify.getAudioFeatures(trackIds);
```

### Ticketmaster Client

```typescript
import { TicketmasterApiClient } from './adapters';

const ticketmaster = new TicketmasterApiClient();

// Search for attractions (artists)
const { data: searchResults } = await ticketmaster.searchAttractions({
  keyword: 'Taylor Swift',
  classificationName: 'Music'
});

const attraction = searchResults._embedded?.attractions?.[0];
if (attraction) {
  // Get all events for this attraction
  const events = [];
  for await (const eventBatch of ticketmaster.iterateAttractionEvents(attraction.id)) {
    events.push(...eventBatch);
  }
  
  console.log(`Found ${events.length} events for ${attraction.name}`);
}
```

### Setlist.fm Client

```typescript
import { SetlistFmClient } from './adapters';

const setlistfm = new SetlistFmClient();

// Search for artists
const { data: artistResults } = await setlistfm.searchArtists('Taylor Swift');
const artist = artistResults.artist?.[0];

if (artist) {
  // Get all setlists for this artist
  const setlists = [];
  for await (const setlistBatch of setlistfm.iterateArtistSetlists(artist.mbid)) {
    setlists.push(...setlistBatch);
  }
  
  // Extract unique songs
  const uniqueSongs = setlistfm.getUniqueSongs(setlists);
  
  // Get statistics
  const stats = setlistfm.getSetlistStats(setlists);
  console.log(`Artist has ${stats.totalSetlists} setlists with ${stats.uniqueSongs} unique songs`);
}
```

## Advanced Features

### Circuit Breaker

Automatically handles API failures:

```typescript
const client = new SpotifyApiClient();

// Get circuit breaker status
const metrics = client.getMetrics();
console.log('Circuit breaker state:', metrics.circuitBreaker.state);

// Manual reset if needed
if (metrics.circuitBreaker.state === 'open') {
  client.resetCircuitBreaker();
}
```

### Rate Limiting

Clients automatically handle rate limits:

```typescript
const client = new TicketmasterApiClient();

// Rate limiting is handled automatically
// Client will wait appropriately between requests
const events = await client.searchEvents({ keyword: 'concert' });
```

### Health Monitoring

Monitor API health:

```typescript
const clients = [
  new SpotifyApiClient(),
  new TicketmasterApiClient(),
  new SetlistFmClient()
];

const healthChecks = await Promise.all(
  clients.map(client => client.healthCheck())
);

healthChecks.forEach((health, index) => {
  console.log(`Client ${index}: ${health.healthy ? '✅' : '❌'} (${health.responseTime}ms)`);
});
```

## Testing

Run comprehensive tests:

```bash
# Run all API tests
npm run test:apis

# Or use the TypeScript runner
npx ts-node lib/services/adapters/run-tests.ts

# Or run with Node.js
node lib/services/adapters/run-api-tests.js
```

Test individual clients:

```typescript
import { 
  testSpotifyClient,
  testTicketmasterClient, 
  testSetlistFmClient 
} from './adapters';

// Test individual services
const spotifyResult = await testSpotifyClient();
const ticketmasterResult = await testTicketmasterClient();
const setlistfmResult = await testSetlistFmClient();
```

## Error Handling

All clients use consistent error handling:

```typescript
import { HttpError } from './adapters';

try {
  const client = new SpotifyApiClient();
  const result = await client.searchArtists('Taylor Swift');
} catch (error) {
  if (error instanceof HttpError) {
    console.error(`HTTP Error ${error.status}: ${error.message}`);
    
    if (error.status === 429) {
      console.log('Rate limit exceeded, client will automatically retry');
    } else if (error.status === 401) {
      console.log('Authentication failed, check API keys');
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Configuration

Customize client behavior:

```typescript
import { BaseApiClient, ApiClientConfig } from './adapters';

const customConfig: ApiClientConfig = {
  baseUrl: 'https://api.example.com',
  rateLimitConfig: {
    requestsPerSecond: 2,
    burstSize: 10
  },
  retryConfig: {
    tries: 5,
    baseDelay: 1000,
    maxDelay: 30000
  },
  circuitBreaker: {
    failureThreshold: 3,
    recoveryTimeout: 60000
  }
};

const customClient = new BaseApiClient(customConfig);
```

## Legacy Compatibility

Legacy function exports are maintained for backward compatibility:

```typescript
// Legacy imports still work
import { 
  getAccessToken,
  searchArtists,
  iterateEventsByAttraction 
} from './adapters';

// But new client classes are recommended
import { SpotifyApiClient, TicketmasterApiClient } from './adapters';
```

## Best Practices

1. **Initialize Once**: Create client instances once and reuse them
2. **Handle Errors**: Always wrap API calls in try-catch blocks  
3. **Monitor Health**: Regularly check client health and metrics
4. **Use Pagination**: Use iterator methods for large datasets
5. **Respect Rate Limits**: Clients handle this automatically, but be aware of limits
6. **Test Connectivity**: Run tests before production deployment

## Performance Tips

1. **Batch Operations**: Use batch methods like `getTracks()` instead of individual calls
2. **Parallel Requests**: Use `Promise.all()` for independent requests
3. **Streaming**: Use async generators for large datasets
4. **Caching**: Clients include built-in caching where appropriate

For more detailed examples, see the test files and integration tests in this directory.