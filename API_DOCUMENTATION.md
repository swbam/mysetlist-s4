# TheSet - API Documentation

## Overview

TheSet features a modern **ArtistImportOrchestrator** system that provides instant artist page loading with real-time background synchronization. This system rivals major music platforms in performance and user experience.

## Core Import System

### ArtistImportOrchestrator

The heart of TheSet's data import system, providing a three-phase import strategy:

```typescript
// apps/web/lib/services/artist-import-orchestrator.ts
export class ArtistImportOrchestrator {
  /**
   * Main orchestration method following optimal timing strategy
   */
  async importArtist(tmAttractionId: string): Promise<ImportResult> {
    // Phase 1: Instant Artist Page Load (< 3 seconds)
    const artistData = await this.processPhase1(tmAttractionId);
    
    // Phase 2 & 3: Background Processing (Parallel)
    const [showsResult, songsResult] = await Promise.allSettled([
      this.processPhase2(artistData.artistId), // Shows & Venues
      this.processPhase3(artistData.artistId)  // Song Catalog
    ]);
    
    // Create initial setlists for upcoming shows
    await this.createInitialSetlists(artistData.artistId);
    
    return {
      success: true,
      artistId: artistData.artistId,
      slug: artistData.slug,
      totalSongs: songsResult.value?.totalSongs || 0,
      totalShows: showsResult.value?.totalShows || 0,
      importDuration: Date.now() - startTime
    };
  }
}
```

### Three-Phase Import Strategy

#### Phase 1: Instant Page Load (< 3 seconds)
- Create minimal artist record with Ticketmaster + basic Spotify data
- Generate URL-safe slug for immediate navigation
- Return artistId and slug for instant page render
- **Target**: User can navigate to artist page immediately

#### Phase 2: Show & Venue Import (Background)
- Import upcoming shows via Ticketmaster API
- Create venue records with full location data
- Process in parallel with Phase 3 for optimal performance
- **Result**: Shows appear progressively on artist page

#### Phase 3: Song Catalog Sync (Background)
- Import complete discography via Spotify API
- Filter out live tracks using intelligent detection
- Deduplicate similar tracks across albums
- Link songs via artist_songs relationship table
- **Result**: Complete song catalog with voting capabilities

## API Endpoints

### Artist Import API

```typescript
// POST /api/artists/import
// Import an artist by Ticketmaster ID
{
  "tmAttractionId": "K8vZ9171ob7"
}

// Response:
{
  "success": true,
  "artistId": "cm4abc123",
  "slug": "taylor-swift",
  "redirect": "/artists/taylor-swift"
}
```

### Real-time Progress Tracking

```typescript
// GET /api/artists/import/progress/[jobId]
// Server-Sent Events stream for real-time progress

// Example events:
data: {"stage":"initializing","progress":5,"message":"Starting artist import..."}
data: {"stage":"syncing-identifiers","progress":25,"message":"Artist created! Starting background sync..."}
data: {"stage":"importing-shows","progress":60,"message":"Imported 15 shows and venues"}
data: {"stage":"importing-songs","progress":80,"message":"Imported 127 studio songs"}
data: {"stage":"completed","progress":100,"message":"Import completed!"}
```

### Search API

```typescript
// GET /api/artists/search?q=radiohead
{
  "artists": [
    {
      "tmAttractionId": "K8vZ9171ob7",
      "name": "Radiohead",
      "image": "https://s1.ticketm.net/dam/a/123/photo.jpg",
      "genres": ["Alternative Rock", "Art Rock"],
      "upcomingEvents": 12
    }
  ]
}
```

## Background Sync Jobs

### Cron Job Endpoints

All cron endpoints require `Authorization: Bearer ${CRON_SECRET}` header.

#### Active Artists Sync
```typescript
// POST /api/cron/update-active-artists
// Every 6 hours - sync artists with recent activity
{
  "limit": 50,
  "forceSync": false
}

// Response:
{
  "success": true,
  "processed": 43,
  "updated": 38,
  "failed": 5,
  "duration": 280000
}
```

#### Trending Artists Sync  
```typescript
// POST /api/cron/trending-artist-sync
// Daily at 2 AM - deep catalog refresh for top 100 artists
{
  "limit": 100,
  "skipRecentlyUpdated": true
}
```

#### Complete System Sync
```typescript
// POST /api/cron/complete-catalog-sync  
// Weekly - full system maintenance
{
  "maxArtists": 500,
  "includeDataCleanup": true,
  "performIntegrityChecks": true
}
```

## External API Integrations

### Spotify API Client

Enhanced with intelligent catalog management:

```typescript
// packages/external-apis/src/services/artist-sync.ts
export class ArtistSyncService {
  /**
   * Sync complete artist catalog with intelligent filtering
   */
  async syncCatalog(spotifyId: string): Promise<CatalogSyncResult> {
    // Get all studio albums (excludes live albums, compilations)
    const albums = await this.getAllStudioAlbums(spotifyId);
    
    // Process in batches to respect rate limits
    for (const albumBatch of this.chunkArray(albums, 5)) {
      await Promise.all(albumBatch.map(album => this.processAlbum(album)));
      await this.delay(1000); // Rate limiting
    }
    
    // Filter out live tracks and duplicates
    const processedSongs = await this.filterAndDeduplicateSongs(spotifyId);
    
    return {
      totalSongs: processedSongs.length,
      totalAlbums: albums.length,
      skippedLiveTracks: processedSongs.filter(s => s.isLive).length,
      deduplicatedTracks: processedSongs.filter(s => s.isDuplicate).length
    };
  }
}
```

### Smart Live Track Detection

```typescript
private isLiveTrack(track: SpotifyTrack, album: SpotifyAlbum): boolean {
  const liveIndicators = [
    /live\s+(at|from|in)/i,
    /\(live\)/i,
    /\[live\]/i,
    /acoustic\s+version/i,
    /demo/i,
    /rehearsal/i
  ];
  
  const trackName = track.name.toLowerCase();
  const albumName = album.name.toLowerCase();
  
  return liveIndicators.some(pattern => 
    pattern.test(trackName) || pattern.test(albumName)
  );
}
```

### Ticketmaster Integration

```typescript
// packages/external-apis/src/clients/ticketmaster.ts
export class TicketmasterClient {
  async getAttraction(attractionId: string): Promise<TicketmasterAttraction> {
    return this.makeRequest(
      `/attractions/${attractionId}.json`,
      {},
      `tm:attraction:${attractionId}`,
      1800 // 30 minutes cache
    );
  }
  
  async searchAttractions(keyword: string): Promise<AttractionSearchResult> {
    return this.makeRequest(
      `/attractions.json?keyword=${encodeURIComponent(keyword)}`,
      {},
      `tm:search:${keyword}`,
      900 // 15 minutes cache
    );
  }
}
```

## Performance Features

### Multi-layer Caching

```typescript
// lib/services/cache-manager.ts
export class CacheManager {
  private redis: Redis;
  private memoryCache: LRUCache;
  
  async get<T>(key: string): Promise<T | null> {
    // Try Redis first
    try {
      const redisData = await this.redis.get(key);
      if (redisData) return JSON.parse(redisData);
    } catch (error) {
      console.warn('Redis unavailable, falling back to memory');
    }
    
    // Fallback to memory cache
    return this.memoryCache.get(key) || null;
  }
  
  async set(key: string, data: any, ttlSeconds: number): Promise<void> {
    // Store in both Redis and memory
    await Promise.allSettled([
      this.redis.setex(key, ttlSeconds, JSON.stringify(data)),
      this.memoryCache.set(key, data, ttlSeconds * 1000)
    ]);
  }
}
```

### Rate Limiting

```typescript
// utils/rate-limiter.ts
export class RateLimiter {
  async checkLimit(
    identifier: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    // Sliding window implementation with Redis
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const window = windowSeconds * 1000;

    // Remove expired entries and count current requests
    const pipeline = this.redis.multi();
    pipeline.zremrangebyscore(key, 0, now - window);
    pipeline.zcard(key);
    pipeline.zadd(key, { score: now, member: now });
    pipeline.expire(key, windowSeconds);

    const results = await pipeline.exec();
    const currentCount = results[1] as number;

    return {
      allowed: currentCount < limit,
      remaining: Math.max(0, limit - currentCount - 1),
      resetTime: now + window
    };
  }
}
```

## Error Handling

### Circuit Breaker Pattern

```typescript
// utils/circuit-breaker.ts
export class CircuitBreaker {
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private failures = 0;
  private nextAttempt = Date.now();

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() < this.nextAttempt) {
        throw new Error("Circuit breaker is OPEN");
      }
      this.state = "HALF_OPEN";
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
  
  private onFailure(): void {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }
}
```

## Monitoring & Health Checks

### Health Check Endpoint

```typescript
// GET /api/health
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy", 
    "spotify": "healthy",
    "ticketmaster": "healthy"
  },
  "metrics": {
    "activeImports": 3,
    "cacheHitRate": 0.85,
    "avgImportTime": 45000
  }
}
```

### Import Status Tracking

```typescript
// GET /api/artists/[id]/import-status
{
  "artistId": "cm4abc123",
  "status": "completed",
  "progress": 100,
  "totalSongs": 127,
  "totalShows": 15,
  "totalVenues": 8,
  "importDuration": 45000,
  "completedAt": "2024-01-15T10:28:30Z"
}
```

## Security

### Authentication Requirements

- **Public Endpoints**: Search, artist pages, show listings
- **Protected Endpoints**: Voting, user profiles, admin functions
- **Cron Endpoints**: Require `CRON_SECRET` bearer token
- **Rate Limited**: All endpoints have appropriate rate limiting

### Data Protection

- **Row Level Security (RLS)**: Enabled on all Supabase tables
- **API Key Security**: External API keys stored securely
- **Input Validation**: All inputs validated and sanitized
- **CORS Configuration**: Properly configured for security

This API system provides a modern, scalable foundation for TheSet's music data management with real-time user experience and production-grade reliability.