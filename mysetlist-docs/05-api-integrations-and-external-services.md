# MySetlist - API Integrations & External Services

## Table of Contents
1. [External APIs Overview](#external-apis-overview)
2. [Next-Forge External APIs Package](#next-forge-external-apis-package)
3. [Spotify API Integration](#spotify-api-integration)
4. [Ticketmaster API Integration](#ticketmaster-api-integration)
5. [Setlist.fm API Integration](#setlistfm-api-integration)
6. [Data Synchronization Strategy](#data-synchronization-strategy)
7. [Rate Limiting & Caching](#rate-limiting--caching)
8. [Error Handling & Resilience](#error-handling--resilience)

## External APIs Overview

MySetlist integrates with multiple external APIs to provide comprehensive music data. The integration follows Next-Forge's package structure with a dedicated external-apis package that handles all third-party service interactions.

### API Service Architecture
```
┌─────────────────────────────────────────────────────────┐
│                MySetlist Application                        │
├─────────────────────────────────────────────────────────┤
│  @repo/external-apis Package                            │
│  ├── Spotify API     ├── Ticketmaster  ├── Setlist.fm  │
│  ├── Rate Limiting   ├── Caching       ├── Sync Jobs   │
│  └── Error Handling  └── Data Mapping  └── Webhooks    │
├─────────────────────────────────────────────────────────┤
│  External Services                                      │
│  ├── Spotify         ├── Ticketmaster  ├── Setlist.fm  │
│  ├── Rate: 100/min   ├── Rate: Varies  ├── Rate: 1/sec │
│  └── Auth: OAuth     └── Auth: API Key └── Auth: None   │
└─────────────────────────────────────────────────────────┘
```

### Integration Benefits
- **Rich Music Data**: Comprehensive artist information from Spotify
- **Live Event Data**: Real-time show and venue information from Ticketmaster
- **Historical Setlists**: Community-driven setlist data from Setlist.fm
- **Data Enrichment**: Cross-reference data for accuracy and completeness

## Next-Forge External APIs Package

### Package Structure
```
packages/external-apis/
├── src/
│   ├── clients/
│   │   ├── spotify.ts        # Spotify API client
│   │   ├── ticketmaster.ts   # Ticketmaster client
│   │   ├── setlistfm.ts      # Setlist.fm client
│   │   └── base.ts           # Base client with common features
│   ├── services/
│   │   ├── artist-sync.ts    # Artist data synchronization
│   │   ├── show-sync.ts      # Show data synchronization
│   │   ├── venue-sync.ts     # Venue data synchronization
│   │   └── setlist-sync.ts   # Setlist data synchronization
│   ├── types/
│   │   ├── spotify.ts        # Spotify API types
│   │   ├── ticketmaster.ts   # Ticketmaster types
│   │   ├── setlistfm.ts      # Setlist.fm types
│   │   └── common.ts         # Common API types
│   ├── utils/
│   │   ├── rate-limiter.ts   # Rate limiting utilities
│   │   ├── cache.ts          # Caching layer
│   │   ├── mapping.ts        # Data transformation
│   │   └── validation.ts     # API response validation
│   ├── jobs/
│   │   ├── sync-scheduler.ts # Scheduled sync jobs
│   │   └── queue.ts          # Job queue management
│   └── index.ts              # Package exports
├── package.json
└── tsconfig.json
```

### Base API Client
```typescript
// packages/external-apis/src/clients/base.ts
import { Redis } from '@upstash/redis';

export interface APIClientConfig {
  baseURL: string;
  apiKey?: string;
  rateLimit?: {
    requests: number;
    window: number; // seconds
  };
  cache?: {
    defaultTTL: number; // seconds
  };
}

export abstract class BaseAPIClient {
  protected baseURL: string;
  protected apiKey?: string;
  protected rateLimit?: { requests: number; window: number };
  protected cache: Redis;

  constructor(config: APIClientConfig) {
    this.baseURL = config.baseURL;
    this.apiKey = config.apiKey;
    this.rateLimit = config.rateLimit;
    this.cache = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheKey?: string,
    cacheTTL?: number
  ): Promise<T> {
    // Check cache first
    if (cacheKey) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return cached as T;
      }
    }

    // Check rate limits
    if (this.rateLimit) {
      await this.checkRateLimit();
    }

    const url = new URL(endpoint, this.baseURL);
    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new APIError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        endpoint
      );
    }

    const data = await response.json();

    // Cache successful responses
    if (cacheKey && cacheTTL) {
      await this.cache.setex(cacheKey, cacheTTL, JSON.stringify(data));
    }

    return data;
  }

  protected abstract getAuthHeaders(): Record<string, string>;

  private async checkRateLimit(): Promise<void> {
    if (!this.rateLimit) return;

    const key = `rate_limit:${this.constructor.name}`;
    const current = await this.cache.incr(key);
    
    if (current === 1) {
      await this.cache.expire(key, this.rateLimit.window);
    }

    if (current > this.rateLimit.requests) {
      const ttl = await this.cache.ttl(key);
      throw new RateLimitError(`Rate limit exceeded. Try again in ${ttl} seconds.`);
    }
  }
}

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}
```

## Spotify API Integration

### Spotify Client Implementation
```typescript
// packages/external-apis/src/clients/spotify.ts
import { BaseAPIClient, APIClientConfig } from './base';
import { SpotifyArtist, SpotifyTrack, SpotifySearchResult } from '../types/spotify';

export class SpotifyClient extends BaseAPIClient {
  private accessToken?: string;

  constructor(config: Omit<APIClientConfig, 'baseURL'>) {
    super({
      ...config,
      baseURL: 'https://api.spotify.com/v1',
      rateLimit: { requests: 100, window: 60 }, // 100 requests per minute
      cache: { defaultTTL: 3600 }, // 1 hour default cache
    });
  }

  async authenticate(): Promise<void> {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error('Spotify authentication failed');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
  }

  protected getAuthHeaders(): Record<string, string> {
    if (!this.accessToken) {
      throw new Error('Spotify client not authenticated');
    }
    return {
      'Authorization': `Bearer ${this.accessToken}`,
    };
  }

  async searchArtists(query: string, limit = 20): Promise<SpotifySearchResult> {
    const params = new URLSearchParams({
      q: query,
      type: 'artist',
      limit: limit.toString(),
    });

    return this.makeRequest<SpotifySearchResult>(
      `/search?${params}`,
      {},
      `spotify:search:artists:${query}:${limit}`,
      1800 // 30 minutes cache
    );
  }

  async getArtist(artistId: string): Promise<SpotifyArtist> {
    return this.makeRequest<SpotifyArtist>(
      `/artists/${artistId}`,
      {},
      `spotify:artist:${artistId}`,
      3600 // 1 hour cache
    );
  }

  async getArtistTopTracks(artistId: string, market = 'US'): Promise<{ tracks: SpotifyTrack[] }> {
    return this.makeRequest<{ tracks: SpotifyTrack[] }>(
      `/artists/${artistId}/top-tracks?market=${market}`,
      {},
      `spotify:artist:${artistId}:top-tracks:${market}`,
      1800 // 30 minutes cache
    );
  }

  async getArtistAlbums(artistId: string, options: {
    include_groups?: string;
    market?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<any> {
    const params = new URLSearchParams({
      include_groups: options.include_groups || 'album,single',
      market: options.market || 'US',
      limit: (options.limit || 20).toString(),
      offset: (options.offset || 0).toString(),
    });

    return this.makeRequest(
      `/artists/${artistId}/albums?${params}`,
      {},
      `spotify:artist:${artistId}:albums:${params.toString()}`,
      1800
    );
  }

  async getRecommendations(options: {
    seed_artists?: string[];
    seed_genres?: string[];
    limit?: number;
    market?: string;
    [key: string]: any; // For audio features
  }): Promise<{ tracks: SpotifyTrack[] }> {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        params.append(key, value.join(','));
      } else if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest<{ tracks: SpotifyTrack[] }>(
      `/recommendations?${params}`,
      {},
      `spotify:recommendations:${params.toString()}`,
      900 // 15 minutes cache for recommendations
    );
  }

  async getAudioFeatures(trackIds: string[]): Promise<{ audio_features: any[] }> {
    const ids = trackIds.join(',');
    return this.makeRequest(
      `/audio-features?ids=${ids}`,
      {},
      `spotify:audio-features:${ids}`,
      3600
    );
  }
}
```

### Spotify Data Synchronization
```typescript
// packages/external-apis/src/services/artist-sync.ts
import { db } from '@repo/database';
import { artists, songs } from '@repo/database/schema';
import { SpotifyClient } from '../clients/spotify';
import { eq } from 'drizzle-orm';

export class ArtistSyncService {
  private spotifyClient: SpotifyClient;

  constructor() {
    this.spotifyClient = new SpotifyClient({});
  }

  async syncArtist(artistId: string): Promise<void> {
    await this.spotifyClient.authenticate();

    try {
      // Get artist from Spotify
      const spotifyArtist = await this.spotifyClient.getArtist(artistId);
      
      // Get top tracks
      const topTracks = await this.spotifyClient.getArtistTopTracks(artistId);
      
      // Update or create artist in database
      await db
        .insert(artists)
        .values({
          spotifyId: spotifyArtist.id,
          name: spotifyArtist.name,
          slug: this.generateSlug(spotifyArtist.name),
          imageUrl: spotifyArtist.images[0]?.url,
          smallImageUrl: spotifyArtist.images[2]?.url,
          genres: JSON.stringify(spotifyArtist.genres),
          popularity: spotifyArtist.popularity,
          followers: spotifyArtist.followers.total,
          externalUrls: JSON.stringify(spotifyArtist.external_urls),
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: artists.spotifyId,
          set: {
            name: spotifyArtist.name,
            imageUrl: spotifyArtist.images[0]?.url,
            smallImageUrl: spotifyArtist.images[2]?.url,
            genres: JSON.stringify(spotifyArtist.genres),
            popularity: spotifyArtist.popularity,
            followers: spotifyArtist.followers.total,
            lastSyncedAt: new Date(),
          },
        });

      // Sync top tracks
      await this.syncArtistTracks(artistId, topTracks.tracks);

    } catch (error) {
      console.error(`Failed to sync artist ${artistId}:`, error);
      throw error;
    }
  }

  private async syncArtistTracks(artistId: string, tracks: SpotifyTrack[]): Promise<void> {
    const artist = await db.query.artists.findFirst({
      where: eq(artists.spotifyId, artistId),
    });

    if (!artist) return;

    for (const track of tracks) {
      await db
        .insert(songs)
        .values({
          spotifyId: track.id,
          title: track.name,
          artist: track.artists[0].name,
          album: track.album.name,
          albumArtUrl: track.album.images[0]?.url,
          releaseDate: new Date(track.album.release_date),
          durationMs: track.duration_ms,
          popularity: track.popularity,
          previewUrl: track.preview_url,
          isExplicit: track.explicit,
          isPlayable: track.is_playable,
        })
        .onConflictDoUpdate({
          target: songs.spotifyId,
          set: {
            title: track.name,
            popularity: track.popularity,
            isPlayable: track.is_playable,
          },
        });
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
```

## Ticketmaster API Integration

### Ticketmaster Client
```typescript
// packages/external-apis/src/clients/ticketmaster.ts
import { BaseAPIClient, APIClientConfig } from './base';
import { TicketmasterEvent, TicketmasterVenue } from '../types/ticketmaster';

export class TicketmasterClient extends BaseAPIClient {
  constructor(config: Omit<APIClientConfig, 'baseURL'>) {
    super({
      ...config,
      baseURL: 'https://app.ticketmaster.com/discovery/v2',
      rateLimit: { requests: 5000, window: 24 * 3600 }, // 5000 requests per day
      cache: { defaultTTL: 1800 }, // 30 minutes default cache
    });
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      'apikey': this.apiKey!,
    };
  }

  async searchEvents(options: {
    keyword?: string;
    city?: string;
    stateCode?: string;
    countryCode?: string;
    radius?: number;
    startDateTime?: string;
    endDateTime?: string;
    size?: number;
    page?: number;
  }): Promise<{ _embedded?: { events: TicketmasterEvent[] }; page: any }> {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest(
      `/events.json?${params}`,
      {},
      `ticketmaster:events:${params.toString()}`,
      900 // 15 minutes cache
    );
  }

  async getEvent(eventId: string): Promise<TicketmasterEvent> {
    return this.makeRequest<TicketmasterEvent>(
      `/events/${eventId}.json`,
      {},
      `ticketmaster:event:${eventId}`,
      1800
    );
  }

  async searchVenues(options: {
    keyword?: string;
    city?: string;
    stateCode?: string;
    countryCode?: string;
    size?: number;
    page?: number;
  }): Promise<{ _embedded?: { venues: TicketmasterVenue[] }; page: any }> {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest(
      `/venues.json?${params}`,
      {},
      `ticketmaster:venues:${params.toString()}`,
      3600
    );
  }

  async getVenue(venueId: string): Promise<TicketmasterVenue> {
    return this.makeRequest<TicketmasterVenue>(
      `/venues/${venueId}.json`,
      {},
      `ticketmaster:venue:${venueId}`,
      3600
    );
  }
}
```

### Show Synchronization Service
```typescript
// packages/external-apis/src/services/show-sync.ts
import { db } from '@repo/database';
import { shows, venues, artists } from '@repo/database/schema';
import { TicketmasterClient } from '../clients/ticketmaster';
import { eq } from 'drizzle-orm';

export class ShowSyncService {
  private ticketmasterClient: TicketmasterClient;

  constructor() {
    this.ticketmasterClient = new TicketmasterClient({
      apiKey: process.env.TICKETMASTER_API_KEY!,
    });
  }

  async syncUpcomingShows(): Promise<void> {
    try {
      const now = new Date();
      const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year ahead

      const events = await this.ticketmasterClient.searchEvents({
        startDateTime: now.toISOString(),
        endDateTime: future.toISOString(),
        size: 200,
        countryCode: 'US',
      });

      if (events._embedded?.events) {
        for (const event of events._embedded.events) {
          await this.syncShow(event);
        }
      }
    } catch (error) {
      console.error('Failed to sync upcoming shows:', error);
      throw error;
    }
  }

  private async syncShow(tmEvent: TicketmasterEvent): Promise<void> {
    try {
      // Sync venue first
      let venue = null;
      if (tmEvent._embedded?.venues?.[0]) {
        venue = await this.syncVenue(tmEvent._embedded.venues[0]);
      }

      // Find or create artist
      let artist = await this.findOrCreateArtist(tmEvent);

      // Create or update show
      const showData = {
        ticketmasterId: tmEvent.id,
        headlinerArtistId: artist.id,
        venueId: venue?.id,
        name: tmEvent.name,
        slug: this.generateSlug(tmEvent.name),
        date: new Date(tmEvent.dates.start.localDate),
        startTime: tmEvent.dates.start.localTime || null,
        status: this.mapEventStatus(tmEvent.dates.status.code),
        ticketUrl: tmEvent.url,
        minPrice: tmEvent.priceRanges?.[0]?.min,
        maxPrice: tmEvent.priceRanges?.[0]?.max,
        currency: tmEvent.priceRanges?.[0]?.currency || 'USD',
      };

      await db
        .insert(shows)
        .values(showData)
        .onConflictDoUpdate({
          target: shows.ticketmasterId,
          set: {
            ...showData,
            updatedAt: new Date(),
          },
        });

    } catch (error) {
      console.error(`Failed to sync show ${tmEvent.id}:`, error);
    }
  }

  private async syncVenue(tmVenue: TicketmasterVenue): Promise<any> {
    const venueData = {
      ticketmasterId: tmVenue.id,
      name: tmVenue.name,
      slug: this.generateSlug(tmVenue.name),
      address: tmVenue.address?.line1,
      city: tmVenue.city?.name,
      state: tmVenue.state?.stateCode,
      country: tmVenue.country?.countryCode,
      postalCode: tmVenue.postalCode,
      latitude: tmVenue.location?.latitude ? parseFloat(tmVenue.location.latitude) : null,
      longitude: tmVenue.location?.longitude ? parseFloat(tmVenue.location.longitude) : null,
      timezone: tmVenue.timezone,
      capacity: tmVenue.capacity,
      website: tmVenue.url,
    };

    const [venue] = await db
      .insert(venues)
      .values(venueData)
      .onConflictDoUpdate({
        target: venues.ticketmasterId,
        set: venueData,
      })
      .returning();

    return venue;
  }

  private async findOrCreateArtist(tmEvent: TicketmasterEvent): Promise<any> {
    const attractionName = tmEvent._embedded?.attractions?.[0]?.name || tmEvent.name;
    
    let artist = await db.query.artists.findFirst({
      where: eq(artists.name, attractionName),
    });

    if (!artist) {
      const [newArtist] = await db
        .insert(artists)
        .values({
          name: attractionName,
          slug: this.generateSlug(attractionName),
          verified: false,
        })
        .returning();
      
      artist = newArtist;
    }

    return artist;
  }

  private mapEventStatus(statusCode: string): 'upcoming' | 'cancelled' | 'completed' {
    switch (statusCode) {
      case 'onsale':
      case 'offsale':
        return 'upcoming';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'upcoming';
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
```

## Setlist.fm API Integration

### Setlist.fm Client
```typescript
// packages/external-apis/src/clients/setlistfm.ts
import { BaseAPIClient, APIClientConfig } from './base';
import { SetlistFmSetlist } from '../types/setlistfm';

export class SetlistFmClient extends BaseAPIClient {
  constructor(config: Omit<APIClientConfig, 'baseURL'>) {
    super({
      ...config,
      baseURL: 'https://api.setlist.fm/rest/1.0',
      rateLimit: { requests: 60, window: 60 }, // 1 request per second
      cache: { defaultTTL: 3600 }, // 1 hour cache
    });
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      'x-api-key': this.apiKey!,
      'Accept': 'application/json',
    };
  }

  async searchSetlists(options: {
    artistName?: string;
    artistMbid?: string;
    venueName?: string;
    cityName?: string;
    date?: string;
    year?: number;
    p?: number; // page
  }): Promise<{ setlist: SetlistFmSetlist[] }> {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest(
      `/search/setlists?${params}`,
      {},
      `setlistfm:search:${params.toString()}`,
      1800
    );
  }

  async getSetlist(setlistId: string): Promise<SetlistFmSetlist> {
    return this.makeRequest<SetlistFmSetlist>(
      `/setlist/${setlistId}`,
      {},
      `setlistfm:setlist:${setlistId}`,
      3600
    );
  }

  async getArtistSetlists(artistMbid: string, page = 1): Promise<{ setlist: SetlistFmSetlist[] }> {
    return this.makeRequest(
      `/artist/${artistMbid}/setlists?p=${page}`,
      {},
      `setlistfm:artist:${artistMbid}:setlists:${page}`,
      1800
    );
  }

  async getVenueSetlists(venueId: string, page = 1): Promise<{ setlist: SetlistFmSetlist[] }> {
    return this.makeRequest(
      `/venue/${venueId}/setlists?p=${page}`,
      {},
      `setlistfm:venue:${venueId}:setlists:${page}`,
      1800
    );
  }
}
```

## Data Synchronization Strategy

### Sync Scheduler
```typescript
// packages/external-apis/src/jobs/sync-scheduler.ts
import { CronJob } from 'cron';
import { ArtistSyncService } from '../services/artist-sync';
import { ShowSyncService } from '../services/show-sync';
import { SetlistSyncService } from '../services/setlist-sync';

export class SyncScheduler {
  private artistSync: ArtistSyncService;
  private showSync: ShowSyncService;
  private setlistSync: SetlistSyncService;

  constructor() {
    this.artistSync = new ArtistSyncService();
    this.showSync = new ShowSyncService();
    this.setlistSync = new SetlistSyncService();
  }

  startScheduler(): void {
    // Sync upcoming shows every hour
    new CronJob('0 * * * *', async () => {
      console.log('Starting show sync...');
      try {
        await this.showSync.syncUpcomingShows();
        console.log('Show sync completed');
      } catch (error) {
        console.error('Show sync failed:', error);
      }
    }, null, true);

    // Sync popular artists daily at 2 AM
    new CronJob('0 2 * * *', async () => {
      console.log('Starting daily artist sync...');
      try {
        await this.artistSync.syncPopularArtists();
        console.log('Artist sync completed');
      } catch (error) {
        console.error('Artist sync failed:', error);
      }
    }, null, true);

    // Sync recent setlists every 6 hours
    new CronJob('0 */6 * * *', async () => {
      console.log('Starting setlist sync...');
      try {
        await this.setlistSync.syncRecentSetlists();
        console.log('Setlist sync completed');
      } catch (error) {
        console.error('Setlist sync failed:', error);
      }
    }, null, true);

    console.log('Sync scheduler started');
  }
}
```

## Rate Limiting & Caching

### Advanced Rate Limiter
```typescript
// packages/external-apis/src/utils/rate-limiter.ts
import { Redis } from '@upstash/redis';

export class RateLimiter {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  async checkLimit(
    identifier: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const window = windowSeconds * 1000;

    // Use Redis sorted set for sliding window
    const pipeline = this.redis.multi();
    
    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, now - window);
    
    // Count current requests
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, { score: now, member: now });
    
    // Set expiration
    pipeline.expire(key, windowSeconds);

    const results = await pipeline.exec();
    const currentCount = results[1] as number;

    if (currentCount >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: now + window,
      };
    }

    return {
      allowed: true,
      remaining: limit - currentCount - 1,
      resetTime: now + window,
    };
  }
}
```

### Intelligent Caching
```typescript
// packages/external-apis/src/utils/cache.ts
import { Redis } from '@upstash/redis';

export class IntelligentCache {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data as T | null;
  }

  async set(
    key: string,
    data: any,
    ttlSeconds?: number,
    options: {
      refreshThreshold?: number; // Refresh when TTL is below this
      staleWhileRevalidate?: boolean;
    } = {}
  ): Promise<void> {
    const pipeline = this.redis.multi();
    
    pipeline.set(key, JSON.stringify(data));
    
    if (ttlSeconds) {
      pipeline.expire(key, ttlSeconds);
    }

    // Set metadata for intelligent refresh
    if (options.refreshThreshold) {
      pipeline.set(`${key}:meta`, JSON.stringify({
        refreshThreshold: options.refreshThreshold,
        staleWhileRevalidate: options.staleWhileRevalidate,
        lastUpdated: Date.now(),
      }));
      pipeline.expire(`${key}:meta`, ttlSeconds || 3600);
    }

    await pipeline.exec();
  }

  async shouldRefresh(key: string): Promise<boolean> {
    const [ttl, meta] = await Promise.all([
      this.redis.ttl(key),
      this.redis.get(`${key}:meta`),
    ]);

    if (!meta || ttl === -1) return false;

    const metadata = JSON.parse(meta as string);
    return ttl <= metadata.refreshThreshold;
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // Note: This requires Redis SCAN command which might not be available in all Redis setups
    // Alternative: maintain key sets for pattern-based invalidation
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

## Error Handling & Resilience

### Circuit Breaker Pattern
```typescript
// packages/external-apis/src/utils/circuit-breaker.ts
export class CircuitBreaker {
  private failures = 0;
  private nextAttempt = Date.now();
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    private resetTimeout: number = 300000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }

  getState(): string {
    return this.state;
  }
}
```

This comprehensive API integration system provides robust, scalable access to external music data while maintaining performance and reliability through intelligent caching, rate limiting, and error handling strategies.