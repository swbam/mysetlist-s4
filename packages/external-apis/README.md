# External APIs Package

This package provides integrations with external APIs for the MySetlist application:
- **Spotify API**: Artist data, tracks, albums, and music information
- **Ticketmaster API**: Venue and show/event information
- **Setlist.fm API**: Historical setlist data

## Features

- ✅ Rate limiting to respect API quotas
- ✅ Redis caching with memory fallback
- ✅ Automatic retries and error handling
- ✅ TypeScript support with full type definitions
- ✅ Sync services for database population
- ✅ CLI for manual sync operations

## Setup

1. Ensure environment variables are set:
```env
# Spotify
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret

# Ticketmaster
TICKETMASTER_API_KEY=your_api_key

# Setlist.fm
SETLIST_FM_API_KEY=your_api_key

# Redis (optional, for caching)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

2. Install dependencies:
```bash
pnpm install
```

## Usage

### Direct API Client Usage

```typescript
import { spotify, ticketmaster, setlistfm } from '@repo/external-apis';

// Spotify
await spotify.authenticate();
const artist = await spotify.getArtist('artistId');
const topTracks = await spotify.getArtistTopTracks('artistId');

// Ticketmaster
const events = await ticketmaster.searchEvents({ city: 'New York' });
const venue = await ticketmaster.getVenue('venueId');

// Setlist.fm
const setlists = await setlistfm.searchSetlists({ artistName: 'Radiohead' });
```

### Sync Services

```typescript
import { SyncScheduler } from '@repo/external-apis';

const scheduler = new SyncScheduler();

// Run initial sync
await scheduler.runInitialSync();

// Sync by location
await scheduler.syncByLocation('San Francisco', 'CA');

// Sync artist data
await scheduler.syncArtistData('Taylor Swift');
```

### CLI Commands

```bash
# Run initial sync
pnpm sync:initial

# Run daily sync
pnpm sync:daily

# Sync specific location
pnpm sync:location -c "New York" -s "NY"

# Sync specific artist
pnpm sync:artist -n "The Beatles"

# Custom sync
pnpm tsx src/cli.ts custom --venues --shows -c "Austin" -s "TX"
```

## API Clients

### SpotifyClient
- `authenticate()`: Get access token
- `searchArtists(query, limit)`: Search for artists
- `getArtist(artistId)`: Get artist details
- `getArtistTopTracks(artistId, market)`: Get top tracks
- `getArtistAlbums(artistId, options)`: Get albums
- `searchTracks(query, limit)`: Search for tracks

### TicketmasterClient
- `searchEvents(options)`: Search for events
- `getEvent(eventId)`: Get event details
- `searchVenues(options)`: Search for venues
- `getVenue(venueId)`: Get venue details
- `searchAttractions(options)`: Search for attractions
- `getAttraction(attractionId)`: Get attraction details

### SetlistFmClient
- `searchSetlists(options)`: Search for setlists
- `getSetlist(setlistId)`: Get setlist details
- `getArtistSetlists(artistMbid, page)`: Get artist's setlists
- `getVenueSetlists(venueId, page)`: Get venue's setlists
- `searchArtists(artistName, page)`: Search for artists
- `searchVenues(options)`: Search for venues

## Rate Limiting

Each API has different rate limits:
- **Spotify**: 100 requests per minute
- **Ticketmaster**: 5000 requests per day
- **Setlist.fm**: 1 request per second

The clients automatically handle rate limiting using Redis (or memory fallback).

## Caching

Responses are cached to reduce API calls:
- Artist data: 1 hour
- Venue data: 1 hour
- Event/show data: 15-30 minutes
- Search results: 30 minutes

## Error Handling

The clients provide specific error types:
- `APIError`: General API errors with status codes
- `RateLimitError`: Rate limit exceeded errors

## Development

Run tests:
```bash
pnpm test
```

Type checking:
```bash
pnpm typecheck
```

## Examples

See the `examples/` directory for detailed usage examples.