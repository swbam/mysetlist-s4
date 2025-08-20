# 🎵 MySetlist/TheSet - Complete Implementation Guide

## 📋 Table of Contents
1. [Critical Infrastructure Setup](#1-critical-infrastructure-setup)
2. [Redis & Queue System Implementation](#2-redis--queue-system-implementation)
3. [External API Clients](#3-external-api-clients)
4. [Data Ingestion Services](#4-data-ingestion-services)
5. [Import Orchestration System](#5-import-orchestration-system)
6. [Real-time SSE Implementation](#6-real-time-sse-implementation)
7. [Background Jobs & Cron](#7-background-jobs--cron)
8. [Database Operations](#8-database-operations)
9. [Frontend Integration](#9-frontend-integration)
10. [Testing & Verification](#10-testing--verification)

---

## 1. Critical Infrastructure Setup

### 1.1 Install Required Dependencies

```bash
# Run these commands in your project root
pnpm add ioredis bullmq p-limit
pnpm add -D @types/node
```

### 1.2 Environment Variables Setup

Create/update `.env.local` with ALL required variables:

```env
# Database
DATABASE_URL="postgresql://postgres:password@db.yzwkimtdaabyjbpykquu.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:password@db.yzwkimtdaabyjbpykquu.supabase.co:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://yzwkimtdaabyjbpykquu.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Redis (Use Upstash for easy setup)
REDIS_URL="redis://default:your-password@your-redis-host:port"
UPSTASH_REDIS_REST_URL="https://your-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"

# External APIs
SPOTIFY_CLIENT_ID="your-spotify-client-id"
SPOTIFY_CLIENT_SECRET="your-spotify-client-secret"
TICKETMASTER_API_KEY="your-ticketmaster-api-key"
SETLISTFM_API_KEY="your-setlistfm-api-key"

# Security
NEXTAUTH_SECRET="generate-32-char-secret-here"
NEXTAUTH_URL="http://localhost:3001"
CRON_SECRET="generate-random-secret"

# App URLs
NEXT_PUBLIC_APP_URL="http://localhost:3001"
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

---

## 2. Redis & Queue System Implementation

### 2.1 Redis Configuration

**Create: `apps/web/lib/queues/redis-config.ts`**

```typescript
import { Redis } from 'ioredis';
import type { ConnectionOptions } from 'bullmq';

// Parse Redis URL if provided, otherwise use individual env vars
function getRedisConfig(): any {
  if (process.env.REDIS_URL) {
    const url = new URL(process.env.REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
      password: url.password || undefined,
      username: url.username || 'default',
      tls: url.protocol === 'rediss:' ? {} : undefined,
    };
  }
  
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USERNAME || 'default',
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  };
}

const redisConfig = getRedisConfig();

// Create Redis client
export function createRedisClient() {
  return new Redis({
    ...redisConfig,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
  });
}

// BullMQ connection config
export const bullMQConnection: ConnectionOptions = {
  ...redisConfig,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Redis cache helper
export class RedisCache {
  private client: Redis;

  constructor() {
    this.client = createRedisClient();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      console.error(`Redis set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Redis delete error for key ${key}:`, error);
    }
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}

export const cache = new RedisCache();
```

### 2.2 Queue Manager Implementation

**Create: `apps/web/lib/queues/queue-manager.ts`**

```typescript
import { Queue, Worker, Job, QueueScheduler } from 'bullmq';
import { bullMQConnection } from './redis-config';

export enum QueueName {
  ARTIST_IMPORT = 'artist-import',
  SPOTIFY_SYNC = 'spotify-sync',
  TICKETMASTER_SYNC = 'ticketmaster-sync',
  SETLIST_SYNC = 'setlist-sync',
  CATALOG_SYNC = 'catalog-sync',
  TRENDING_CALC = 'trending-calc',
  SCHEDULED_SYNC = 'scheduled-sync',
  CLEANUP = 'cleanup'
}

export enum Priority {
  CRITICAL = 1,
  HIGH = 5,
  NORMAL = 10,
  LOW = 20,
  BACKGROUND = 50
}

interface QueueConfig {
  concurrency: number;
  rateLimit?: {
    max: number;
    duration: number;
  };
  defaultJobOptions?: any;
}

const queueConfigs: Record<QueueName, QueueConfig> = {
  [QueueName.ARTIST_IMPORT]: {
    concurrency: 5,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 3600, count: 100 },
      removeOnFail: { age: 86400 }
    }
  },
  [QueueName.SPOTIFY_SYNC]: {
    concurrency: 3,
    rateLimit: { max: 30, duration: 1000 }
  },
  [QueueName.TICKETMASTER_SYNC]: {
    concurrency: 2,
    rateLimit: { max: 20, duration: 1000 }
  },
  [QueueName.SETLIST_SYNC]: {
    concurrency: 2,
    rateLimit: { max: 10, duration: 1000 }
  },
  [QueueName.CATALOG_SYNC]: {
    concurrency: 3
  },
  [QueueName.TRENDING_CALC]: {
    concurrency: 1
  },
  [QueueName.SCHEDULED_SYNC]: {
    concurrency: 2
  },
  [QueueName.CLEANUP]: {
    concurrency: 1
  }
};

export class QueueManager {
  private static instance: QueueManager;
  private queues: Map<QueueName, Queue> = new Map();
  private workers: Map<QueueName, Worker> = new Map();
  private schedulers: Map<QueueName, QueueScheduler> = new Map();

  private constructor() {}

  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  getQueue(name: QueueName): Queue {
    if (!this.queues.has(name)) {
      const config = queueConfigs[name];
      const queue = new Queue(name, {
        connection: bullMQConnection,
        defaultJobOptions: config.defaultJobOptions || {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { age: 3600, count: 100 },
          removeOnFail: { age: 86400 }
        }
      });
      this.queues.set(name, queue);

      // Create scheduler for this queue
      const scheduler = new QueueScheduler(name, {
        connection: bullMQConnection
      });
      this.schedulers.set(name, scheduler);
    }
    return this.queues.get(name)!;
  }

  createWorker<T>(
    name: QueueName,
    processor: (job: Job<T>) => Promise<any>
  ): Worker {
    if (this.workers.has(name)) {
      return this.workers.get(name)!;
    }

    const config = queueConfigs[name];
    const worker = new Worker(name, processor, {
      connection: bullMQConnection,
      concurrency: config.concurrency,
      limiter: config.rateLimit ? {
        max: config.rateLimit.max,
        duration: config.rateLimit.duration
      } : undefined
    });

    worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed in queue ${name}`);
    });

    worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed in queue ${name}:`, err);
    });

    this.workers.set(name, worker);
    return worker;
  }

  async addJob<T>(
    queueName: QueueName,
    name: string,
    data: T,
    options?: any
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    return queue.add(name, data, options);
  }

  async addBulkJobs<T>(
    queueName: QueueName,
    jobs: Array<{ name: string; data: T; opts?: any }>
  ): Promise<Job<T>[]> {
    const queue = this.getQueue(queueName);
    return queue.addBulk(jobs);
  }

  async closeAll(): Promise<void> {
    const closePromises: Promise<void>[] = [];

    for (const worker of this.workers.values()) {
      closePromises.push(worker.close());
    }

    for (const queue of this.queues.values()) {
      closePromises.push(queue.close());
    }

    for (const scheduler of this.schedulers.values()) {
      closePromises.push(scheduler.close());
    }

    await Promise.all(closePromises);
  }
}

export const queueManager = QueueManager.getInstance();
```

### 2.3 Progress Bus for Real-time Updates

**Create: `apps/web/lib/services/progress/progress-bus.ts`**

```typescript
import { EventEmitter } from 'events';
import { prisma } from '@/lib/db/prisma';

class ProgressBus {
  private emitter = new EventEmitter();
  private progressCache = new Map<string, any>();

  async report(
    artistId: string,
    stage: string,
    percentage: number,
    message: string,
    details?: any
  ) {
    const payload = {
      stage,
      percentage,
      message,
      details,
      at: new Date().toISOString()
    };

    // Update database
    await prisma.importStatus.upsert({
      where: { artistId },
      update: {
        stage: stage as any,
        percentage,
        message,
        updatedAt: new Date()
      },
      create: {
        artistId,
        stage: stage as any,
        percentage,
        message
      }
    });

    // Cache and emit
    this.progressCache.set(artistId, payload);
    this.emitter.emit(artistId, payload);
    this.emitter.emit('global', { artistId, ...payload });
  }

  onProgress(artistId: string, callback: (progress: any) => void) {
    this.emitter.on(artistId, callback);
    
    // Send cached progress immediately if available
    const cached = this.progressCache.get(artistId);
    if (cached) {
      callback(cached);
    }
  }

  offProgress(artistId: string, callback: (progress: any) => void) {
    this.emitter.off(artistId, callback);
  }

  clearCache(artistId: string) {
    this.progressCache.delete(artistId);
  }
}

export const progressBus = new ProgressBus();
```

---

## 3. External API Clients

### 3.1 Base API Client with Retry Logic

**Create: `apps/web/lib/services/adapters/base-client.ts`**

```typescript
export interface RetryOptions {
  retries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

export class BaseAPIClient {
  protected async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retryOptions: RetryOptions = {}
  ): Promise<any> {
    const {
      retries = 3,
      baseDelay = 400,
      maxDelay = 10000
    } = retryOptions;

    let lastError: any;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter 
            ? parseInt(retryAfter) * 1000 
            : Math.min(baseDelay * Math.pow(2, i), maxDelay);
          
          console.log(`Rate limited. Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
          continue;
        }

        // Handle server errors with retry
        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        }

        // Handle client errors without retry
        if (!response.ok && response.status < 500) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        
        if (i < retries - 1) {
          const delay = Math.min(
            baseDelay * Math.pow(2, i) + Math.random() * 200,
            maxDelay
          );
          console.log(`Retry ${i + 1}/${retries} after ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected buildQueryString(params: Record<string, any>): string {
    const cleaned = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    
    return cleaned.length > 0 ? `?${cleaned.join('&')}` : '';
  }
}
```

### 3.2 Spotify Client Implementation

**Create: `apps/web/lib/services/adapters/spotify-client.ts`**

```typescript
import { BaseAPIClient } from './base-client';

interface SpotifyToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  images: Array<{ url: string }>;
  genres: string[];
  followers: { total: number };
  popularity: number;
}

interface SpotifyAlbum {
  id: string;
  name: string;
  release_date: string;
  total_tracks: number;
  album_type: string;
}

interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  popularity: number;
  external_ids?: { isrc?: string };
  album?: { name: string };
}

interface AudioFeatures {
  id: string;
  liveness: number;
  energy: number;
  danceability: number;
  valence: number;
}

export class SpotifyClient extends BaseAPIClient {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private readonly baseUrl = 'https://api.spotify.com/v1';

  async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials not configured');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Spotify auth failed: ${error}`);
    }

    const data: SpotifyToken = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000);

    return this.accessToken;
  }

  async searchArtist(query: string): Promise<SpotifyArtist | null> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}/search${this.buildQueryString({
      q: query,
      type: 'artist',
      limit: 1
    })}`;

    const data = await this.fetchWithRetry(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    return data.artists?.items?.[0] || null;
  }

  async getArtist(artistId: string): Promise<SpotifyArtist> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}/artists/${artistId}`;

    return this.fetchWithRetry(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }

  async getArtistAlbums(artistId: string): Promise<SpotifyAlbum[]> {
    const token = await this.getAccessToken();
    const albums: SpotifyAlbum[] = [];
    let next = `${this.baseUrl}/artists/${artistId}/albums${this.buildQueryString({
      include_groups: 'album,single',
      limit: 50,
      market: 'US'
    })}`;

    while (next) {
      const data = await this.fetchWithRetry(next, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      albums.push(...(data.items || []));
      next = data.next;
    }

    return albums;
  }

  async getAlbumTracks(albumId: string): Promise<SpotifyTrack[]> {
    const token = await this.getAccessToken();
    const tracks: SpotifyTrack[] = [];
    let next = `${this.baseUrl}/albums/${albumId}/tracks${this.buildQueryString({
      limit: 50
    })}`;

    while (next) {
      const data = await this.fetchWithRetry(next, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      tracks.push(...(data.items || []));
      next = data.next;
    }

    return tracks;
  }

  async getTracksDetails(trackIds: string[]): Promise<SpotifyTrack[]> {
    const token = await this.getAccessToken();
    const tracks: SpotifyTrack[] = [];

    // Process in batches of 50 (Spotify API limit)
    for (let i = 0; i < trackIds.length; i += 50) {
      const batch = trackIds.slice(i, i + 50);
      const url = `${this.baseUrl}/tracks${this.buildQueryString({
        ids: batch.join(',')
      })}`;

      const data = await this.fetchWithRetry(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      tracks.push(...(data.tracks || []));
    }

    return tracks;
  }

  async getAudioFeatures(trackIds: string[]): Promise<AudioFeatures[]> {
    const token = await this.getAccessToken();
    const features: AudioFeatures[] = [];

    // Process in batches of 100 (Spotify API limit)
    for (let i = 0; i < trackIds.length; i += 100) {
      const batch = trackIds.slice(i, i + 100);
      const url = `${this.baseUrl}/audio-features${this.buildQueryString({
        ids: batch.join(',')
      })}`;

      const data = await this.fetchWithRetry(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      features.push(...(data.audio_features || []).filter(Boolean));
    }

    return features;
  }
}
```

### 3.3 Ticketmaster Client Implementation

**Create: `apps/web/lib/services/adapters/ticketmaster-client.ts`**

```typescript
import { BaseAPIClient } from './base-client';

interface TMAttraction {
  id: string;
  name: string;
  images?: Array<{ url: string }>;
  externalLinks?: {
    spotify?: Array<{ url: string }>;
  };
}

interface TMVenue {
  id: string;
  name: string;
  city?: { name: string };
  state?: { stateCode: string };
  country?: { name: string; countryCode: string };
  location?: { latitude: string; longitude: string };
  postalCode?: string;
  address?: { line1: string };
  timezone?: string;
}

interface TMEvent {
  id: string;
  name: string;
  dates?: {
    start?: {
      dateTime?: string;
      localDate?: string;
      localTime?: string;
    };
  };
  sales?: {
    public?: {
      startDateTime?: string;
      endDateTime?: string;
    };
  };
  priceRanges?: Array<{
    min: number;
    max: number;
    currency: string;
  }>;
  images?: Array<{ url: string }>;
  url?: string;
  _embedded?: {
    venues?: TMVenue[];
    attractions?: TMAttraction[];
  };
}

export class TicketmasterClient extends BaseAPIClient {
  private readonly baseUrl = 'https://app.ticketmaster.com/discovery/v2';
  private readonly apiKey: string;

  constructor() {
    super();
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      throw new Error('Ticketmaster API key not configured');
    }
    this.apiKey = apiKey;
  }

  async searchAttractions(query: string): Promise<TMAttraction[]> {
    const url = `${this.baseUrl}/attractions.json${this.buildQueryString({
      keyword: query,
      apikey: this.apiKey,
      size: 20
    })}`;

    const data = await this.fetchWithRetry(url);
    return data._embedded?.attractions || [];
  }

  async getAttraction(attractionId: string): Promise<TMAttraction | null> {
    const url = `${this.baseUrl}/attractions/${attractionId}.json${this.buildQueryString({
      apikey: this.apiKey
    })}`;

    try {
      return await this.fetchWithRetry(url);
    } catch (error) {
      console.error(`Failed to get attraction ${attractionId}:`, error);
      return null;
    }
  }

  async *iterateEventsByAttraction(attractionId: string): AsyncGenerator<TMEvent[]> {
    let page = 0;
    let totalPages = 1;

    while (page < totalPages) {
      const url = `${this.baseUrl}/events.json${this.buildQueryString({
        attractionId,
        apikey: this.apiKey,
        size: 200,
        page,
        sort: 'date,asc'
      })}`;

      try {
        const data = await this.fetchWithRetry(url);
        totalPages = data.page?.totalPages || 0;
        
        const events = data._embedded?.events || [];
        if (events.length > 0) {
          yield events;
        }
        
        page++;
      } catch (error) {
        console.error(`Failed to fetch events page ${page}:`, error);
        break;
      }
    }
  }

  async getUpcomingEvents(
    attractionId: string,
    limit = 20
  ): Promise<TMEvent[]> {
    const url = `${this.baseUrl}/events.json${this.buildQueryString({
      attractionId,
      apikey: this.apiKey,
      size: limit,
      sort: 'date,asc',
      startDateTime: new Date().toISOString().split('.')[0] + 'Z'
    })}`;

    const data = await this.fetchWithRetry(url);
    return data._embedded?.events || [];
  }

  extractSpotifyId(attraction: TMAttraction): string | null {
    const spotifyUrl = attraction.externalLinks?.spotify?.[0]?.url;
    if (!spotifyUrl) return null;

    const match = spotifyUrl.match(/artist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }
}
```

### 3.4 SetlistFM Client Implementation

**Create: `apps/web/lib/services/adapters/setlistfm-client.ts`**

```typescript
import { BaseAPIClient } from './base-client';

interface SetlistFMVenue {
  id: string;
  name: string;
  city: {
    name: string;
    country: {
      code: string;
      name: string;
    };
  };
  url?: string;
}

interface SetlistFMSet {
  name?: string;
  encore?: number;
  song: Array<{
    name: string;
    info?: string;
    cover?: {
      name: string;
      by: {
        name: string;
        mbid?: string;
      };
    };
  }>;
}

interface SetlistFMSetlist {
  id: string;
  versionId: string;
  eventDate: string;
  lastUpdated: string;
  artist: {
    mbid: string;
    name: string;
  };
  venue: SetlistFMVenue;
  tour?: {
    name: string;
  };
  sets: {
    set: SetlistFMSet[];
  };
  url: string;
  info?: string;
}

export class SetlistFMClient extends BaseAPIClient {
  private readonly baseUrl = 'https://api.setlist.fm/rest/1.0';
  private readonly apiKey: string;

  constructor() {
    super();
    const apiKey = process.env.SETLISTFM_API_KEY;
    if (!apiKey) {
      throw new Error('SetlistFM API key not configured');
    }
    this.apiKey = apiKey;
  }

  private getHeaders() {
    return {
      'x-api-key': this.apiKey,
      'Accept': 'application/json'
    };
  }

  async searchArtist(name: string): Promise<any> {
    const url = `${this.baseUrl}/search/artists${this.buildQueryString({
      artistName: name,
      p: 1,
      sort: 'relevance'
    })}`;

    const data = await this.fetchWithRetry(url, {
      headers: this.getHeaders()
    });

    return data.artist?.[0] || null;
  }

  async getArtistSetlists(
    mbid: string,
    page = 1
  ): Promise<{ setlists: SetlistFMSetlist[]; total: number }> {
    const url = `${this.baseUrl}/artist/${mbid}/setlists${this.buildQueryString({
      p: page
    })}`;

    const data = await this.fetchWithRetry(url, {
      headers: this.getHeaders()
    });

    return {
      setlists: data.setlist || [],
      total: data.total || 0
    };
  }

  async getSetlist(setlistId: string): Promise<SetlistFMSetlist | null> {
    const url = `${this.baseUrl}/setlist/${setlistId}`;

    try {
      return await this.fetchWithRetry(url, {
        headers: this.getHeaders()
      });
    } catch (error) {
      console.error(`Failed to get setlist ${setlistId}:`, error);
      return null;
    }
  }

  async getVenueSetlists(
    venueId: string,
    page = 1
  ): Promise<{ setlists: SetlistFMSetlist[]; total: number }> {
    const url = `${this.baseUrl}/venue/${venueId}/setlists${this.buildQueryString({
      p: page
    })}`;

    const data = await this.fetchWithRetry(url, {
      headers: this.getHeaders()
    });

    return {
      setlists: data.setlist || [],
      total: data.total || 0
    };
  }

  extractSongs(setlist: SetlistFMSetlist): Array<{
    name: string;
    order: number;
    isEncore: boolean;
    notes?: string;
  }> {
    const songs: Array<{
      name: string;
      order: number;
      isEncore: boolean;
      notes?: string;
    }> = [];

    let order = 1;

    if (setlist.sets?.set) {
      for (const set of setlist.sets.set) {
        const isEncore = !!set.encore;
        
        for (const song of set.song || []) {
          songs.push({
            name: song.name,
            order,
            isEncore,
            notes: song.info
          });
          order++;
        }
      }
    }

    return songs;
  }
}
```

---

## 4. Data Ingestion Services

### 4.1 Utility Functions

**Create: `apps/web/lib/utils/concurrency.ts`**

```typescript
export function pLimit(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    active--;
    if (queue.length > 0) {
      const fn = queue.shift();
      fn?.();
    }
  };

  return <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      const run = () => {
        active++;
        fn()
          .then((val) => {
            resolve(val);
            next();
          })
          .catch((err) => {
            reject(err);
            next();
          });
      };

      if (active < concurrency) {
        run();
      } else {
        queue.push(run);
      }
    });
  };
}

export async function batchProcess<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  batchSize = 50
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }

  return results;
}
```

### 4.2 Ticketmaster Data Ingestion

**Create: `apps/web/lib/services/ingest/ticketmaster-ingest.ts`**

```typescript
import { prisma } from '@/lib/db/prisma';
import { TicketmasterClient } from '../adapters/ticketmaster-client';
import { progressBus } from '../progress/progress-bus';

export async function ingestShowsAndVenues(
  artistId: string,
  tmAttractionId: string
) {
  const client = new TicketmasterClient();
  let totalEvents = 0;
  let processedEvents = 0;

  try {
    // Collect all events
    const allEvents: any[] = [];
    
    for await (const eventBatch of client.iterateEventsByAttraction(tmAttractionId)) {
      allEvents.push(...eventBatch);
      totalEvents = allEvents.length;
      
      await progressBus.report(
        artistId,
        'importing-shows',
        25 + Math.floor((processedEvents / Math.max(totalEvents, 1)) * 25),
        `Found ${totalEvents} shows...`
      );
    }

    // Extract unique venues
    const venuesMap = new Map();
    for (const event of allEvents) {
      const venue = event._embedded?.venues?.[0];
      if (venue?.id) {
        venuesMap.set(venue.id, venue);
      }
    }

    // Process in transaction for consistency
    await prisma.$transaction(async (tx) => {
      // Upsert venues first
      const venueIdMap = new Map<string, string>();
      
      for (const venue of venuesMap.values()) {
        const dbVenue = await tx.venue.upsert({
          where: { tmVenueId: venue.id },
          update: {
            name: venue.name,
            city: venue.city?.name || 'Unknown',
            state: venue.state?.stateCode,
            country: venue.country?.name || venue.country?.countryCode || 'Unknown',
            postalCode: venue.postalCode,
            address: venue.address?.line1,
            latitude: venue.location?.latitude ? parseFloat(venue.location.latitude) : null,
            longitude: venue.location?.longitude ? parseFloat(venue.location.longitude) : null,
            timezone: venue.timezone || 'America/New_York',
            updatedAt: new Date()
          },
          create: {
            tmVenueId: venue.id,
            name: venue.name,
            slug: generateSlug(venue.name),
            city: venue.city?.name || 'Unknown',
            state: venue.state?.stateCode,
            country: venue.country?.name || venue.country?.countryCode || 'Unknown',
            postalCode: venue.postalCode,
            address: venue.address?.line1,
            latitude: venue.location?.latitude ? parseFloat(venue.location.latitude) : null,
            longitude: venue.location?.longitude ? parseFloat(venue.location.longitude) : null,
            timezone: venue.timezone || 'America/New_York'
          }
        });
        
        venueIdMap.set(venue.id, dbVenue.id);
      }

      // Upsert shows
      for (const event of allEvents) {
        processedEvents++;
        
        const tmVenueId = event._embedded?.venues?.[0]?.id;
        const venueId = tmVenueId ? venueIdMap.get(tmVenueId) : null;
        
        if (!venueId) {
          console.warn(`No venue found for event ${event.id}`);
          continue;
        }

        const eventDate = event.dates?.start?.dateTime || 
                         event.dates?.start?.localDate;
        
        if (!eventDate) {
          console.warn(`No date found for event ${event.id}`);
          continue;
        }

        const priceRange = event.priceRanges?.[0];

        await tx.show.upsert({
          where: { tmEventId: event.id },
          update: {
            name: event.name,
            date: new Date(eventDate),
            startTime: event.dates?.start?.localTime,
            ticketUrl: event.url,
            minPrice: priceRange?.min ? Math.floor(priceRange.min) : null,
            maxPrice: priceRange?.max ? Math.floor(priceRange.max) : null,
            currency: priceRange?.currency || 'USD',
            updatedAt: new Date()
          },
          create: {
            tmEventId: event.id,
            headlinerArtistId: artistId,
            venueId,
            name: event.name,
            slug: generateSlug(`${event.name}-${eventDate.split('T')[0]}`),
            date: new Date(eventDate),
            startTime: event.dates?.start?.localTime,
            status: new Date(eventDate) > new Date() ? 'upcoming' : 'completed',
            ticketUrl: event.url,
            minPrice: priceRange?.min ? Math.floor(priceRange.min) : null,
            maxPrice: priceRange?.max ? Math.floor(priceRange.max) : null,
            currency: priceRange?.currency || 'USD'
          }
        });

        if (processedEvents % 10 === 0) {
          await progressBus.report(
            artistId,
            'importing-shows',
            25 + Math.floor((processedEvents / totalEvents) * 25),
            `Processing show ${processedEvents}/${totalEvents}...`
          );
        }
      }

      // Update artist show counts
      const showCounts = await tx.show.groupBy({
        by: ['status'],
        where: { headlinerArtistId: artistId },
        _count: true
      });

      const totalShows = showCounts.reduce((sum, s) => sum + s._count, 0);
      const upcomingShows = showCounts.find(s => s.status === 'upcoming')?._count || 0;

      await tx.artist.update({
        where: { id: artistId },
        data: {
          totalShows,
          upcomingShows,
          showsSyncedAt: new Date()
        }
      });
    });

    await progressBus.report(
      artistId,
      'importing-shows',
      50,
      `Imported ${processedEvents} shows and ${venuesMap.size} venues`
    );

  } catch (error) {
    console.error('Show ingestion failed:', error);
    throw error;
  }
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}
```

### 4.3 Spotify Catalog Ingestion (Studio-Only)

**Create: `apps/web/lib/services/ingest/spotify-catalog-ingest.ts`**

```typescript
import { prisma } from '@/lib/db/prisma';
import { SpotifyClient } from '../adapters/spotify-client';
import { progressBus } from '../progress/progress-bus';
import { pLimit } from '@/lib/utils/concurrency';

const LIVENESS_THRESHOLD = 0.8;

interface ProcessedTrack {
  spotifyId: string;
  name: string;
  albumName: string;
  popularity: number;
  durationMs: number;
  isrc?: string;
  isLive: boolean;
  isRemix: boolean;
}

export async function ingestStudioCatalog(
  artistId: string,
  spotifyArtistId: string
) {
  const client = new SpotifyClient();
  
  try {
    await progressBus.report(
      artistId,
      'importing-songs',
      55,
      'Fetching album catalog from Spotify...'
    );

    // Step 1: Get all albums (filter out live albums)
    const allAlbums = await client.getArtistAlbums(spotifyArtistId);
    const studioAlbums = allAlbums.filter(album => 
      !isLikelyLiveAlbum(album.name) && 
      album.album_type !== 'compilation'
    );

    await progressBus.report(
      artistId,
      'importing-songs',
      60,
      `Processing ${studioAlbums.length} studio albums...`
    );

    // Step 2: Get tracks from albums (with concurrency control)
    const limit = pLimit(10);
    const albumTrackPromises = studioAlbums.map(album => 
      limit(() => client.getAlbumTracks(album.id))
    );
    
    const albumTracksArrays = await Promise.allSettled(albumTrackPromises);
    const allTracks = albumTracksArrays
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => (r as any).value);

    // Pre-filter by title
    const potentialStudioTracks = allTracks.filter(track => 
      !isLikelyLiveTitle(track.name)
    );

    await progressBus.report(
      artistId,
      'importing-songs',
      65,
      `Analyzing ${potentialStudioTracks.length} tracks...`
    );

    // Step 3: Get full track details for ISRC and popularity
    const trackIds = potentialStudioTracks.map(t => t.id).filter(Boolean);
    const trackDetails = await client.getTracksDetails(trackIds);

    // Step 4: Get audio features to filter by liveness
    await progressBus.report(
      artistId,
      'importing-songs',
      70,
      'Analyzing audio features for studio-only filtering...'
    );

    const audioFeatures = await client.getAudioFeatures(trackIds);
    const featuresMap = new Map(audioFeatures.map(f => [f.id, f]));

    // Step 5: Filter to studio-only tracks
    const studioTracks: ProcessedTrack[] = [];
    
    for (const track of trackDetails) {
      const features = featuresMap.get(track.id);
      
      // Skip if no features (safety) or high liveness
      if (!features || features.liveness > LIVENESS_THRESHOLD) {
        continue;
      }

      studioTracks.push({
        spotifyId: track.id,
        name: track.name,
        albumName: track.album?.name || 'Unknown Album',
        popularity: track.popularity || 0,
        durationMs: track.duration_ms || 0,
        isrc: track.external_ids?.isrc,
        isLive: false,
        isRemix: track.name.toLowerCase().includes('remix')
      });
    }

    await progressBus.report(
      artistId,
      'importing-songs',
      75,
      `Deduplicating ${studioTracks.length} studio tracks...`
    );

    // Step 6: Deduplicate by ISRC (keep highest popularity)
    const deduplicatedTracks = deduplicateByISRC(studioTracks);

    // Step 7: Save to database
    await saveTracksToDatabase(deduplicatedTracks, artistId);

    await progressBus.report(
      artistId,
      'importing-songs',
      85,
      `Imported ${deduplicatedTracks.length} unique studio tracks`
    );

  } catch (error) {
    console.error('Catalog ingestion failed:', error);
    throw error;
  }
}

function isLikelyLiveAlbum(name: string): boolean {
  const n = (name || '').toLowerCase();
  return n.includes('live') || 
         n.includes('unplugged') || 
         n.includes('concert') || 
         n.includes('mtv') ||
         n.includes('at ') ||
         n.includes('from ');
}

function isLikelyLiveTitle(name: string): boolean {
  const n = (name || '').toLowerCase();
  return n.includes('(live') || 
         n.includes(' - live') || 
         n.includes('live at') || 
         n.includes('live from') ||
         n.includes('unplugged');
}

function deduplicateByISRC(tracks: ProcessedTrack[]): ProcessedTrack[] {
  const byKey = new Map<string, ProcessedTrack>();
  
  for (const track of tracks) {
    // Use ISRC if available, otherwise use title+duration as key
    const key = track.isrc || 
                `${track.name.toLowerCase().trim()}_${Math.round(track.durationMs / 1000)}`;
    
    const existing = byKey.get(key);
    
    // Keep track with highest popularity
    if (!existing || track.popularity > existing.popularity) {
      byKey.set(key, track);
    }
  }
  
  return Array.from(byKey.values());
}

async function saveTracksToDatabase(
  tracks: ProcessedTrack[],
  artistId: string
) {
  await prisma.$transaction(async (tx) => {
    for (const track of tracks) {
      // Upsert song
      const song = await tx.song.upsert({
        where: { spotifyId: track.spotifyId },
        update: {
          name: track.name,
          albumName: track.albumName,
          popularity: track.popularity,
          durationMs: track.durationMs,
          isrc: track.isrc,
          isLive: track.isLive,
          isRemix: track.isRemix,
          updatedAt: new Date()
        },
        create: {
          spotifyId: track.spotifyId,
          name: track.name,
          albumName: track.albumName,
          popularity: track.popularity,
          durationMs: track.durationMs,
          isrc: track.isrc,
          isLive: track.isLive,
          isRemix: track.isRemix
        }
      });

      // Create artist-song relationship
      await tx.artistSong.upsert({
        where: {
          artistId_songId: {
            artistId,
            songId: song.id
          }
        },
        update: {},
        create: {
          artistId,
          songId: song.id,
          isPrimaryArtist: true
        }
      });
    }

    // Update artist stats
    const songCount = await tx.artistSong.count({
      where: { artistId }
    });

    await tx.artist.update({
      where: { id: artistId },
      data: {
        totalSongs: songCount,
        songCatalogSyncedAt: new Date()
      }
    });
  });
}
```

---

## 5. Import Orchestration System

### 5.1 Artist Import Orchestrator

**Create: `apps/web/lib/services/orchestrators/artist-import-orchestrator.ts`**

```typescript
import { prisma } from '@/lib/db/prisma';
import { SpotifyClient } from '../adapters/spotify-client';
import { TicketmasterClient } from '../adapters/ticketmaster-client';
import { SetlistFMClient } from '../adapters/setlistfm-client';
import { ingestShowsAndVenues } from '../ingest/ticketmaster-ingest';
import { ingestStudioCatalog } from '../ingest/spotify-catalog-ingest';
import { progressBus } from '../progress/progress-bus';
import { cache } from '@/lib/queues/redis-config';

export class ArtistImportOrchestrator {
  /**
   * Phase 1: Quick artist creation and return
   * Must complete in < 3 seconds
   */
  async initiateImport(tmAttractionId: string): Promise<{
    artistId: string;
    slug: string;
  }> {
    // Check if artist already exists
    const existing = await prisma.artist.findUnique({
      where: { tmAttractionId }
    });

    if (existing) {
      // Reset import status for re-import
      await prisma.artist.update({
        where: { id: existing.id },
        data: { importStatus: 'in_progress' }
      });

      return {
        artistId: existing.id,
        slug: existing.slug
      };
    }

    // Create new artist with minimal data
    const artist = await prisma.artist.create({
      data: {
        tmAttractionId,
        name: 'Loading...',
        slug: `tm-${tmAttractionId}`,
        importStatus: 'in_progress'
      }
    });

    // Initialize import status
    await prisma.importStatus.create({
      data: {
        artistId: artist.id,
        stage: 'initializing',
        percentage: 0,
        message: 'Starting import...'
      }
    });

    return {
      artistId: artist.id,
      slug: artist.slug
    };
  }

  /**
   * Phase 2-5: Full background import
   */
  async runFullImport(artistId: string) {
    const startTime = Date.now();
    const phaseTimings: Record<string, number> = {};

    try {
      // Get artist
      const artist = await prisma.artist.findUnique({
        where: { id: artistId }
      });

      if (!artist?.tmAttractionId) {
        throw new Error('Artist not found or missing Ticketmaster ID');
      }

      // Phase 2: Sync artist identity
      const identityStart = Date.now();
      await this.syncArtistIdentity(artistId, artist.tmAttractionId);
      phaseTimings.identity = Date.now() - identityStart;

      // Phase 3: Import shows and venues
      const showsStart = Date.now();
      await progressBus.report(
        artistId,
        'importing-shows',
        25,
        'Fetching shows from Ticketmaster...'
      );
      
      await ingestShowsAndVenues(artistId, artist.tmAttractionId);
      phaseTimings.shows = Date.now() - showsStart;

      // Phase 4: Import song catalog (if Spotify connected)
      const updatedArtist = await prisma.artist.findUnique({
        where: { id: artistId }
      });

      if (updatedArtist?.spotifyId) {
        const catalogStart = Date.now();
        await progressBus.report(
          artistId,
          'importing-songs',
          50,
          'Importing studio catalog from Spotify...'
        );
        
        await ingestStudioCatalog(artistId, updatedArtist.spotifyId);
        phaseTimings.catalog = Date.now() - catalogStart;
      } else {
        await progressBus.report(
          artistId,
          'importing-songs',
          75,
          'Skipped catalog import (no Spotify ID)'
        );
      }

      // Phase 5: Create initial setlists
      const setlistStart = Date.now();
      await this.createInitialSetlists(artistId);
      phaseTimings.setlists = Date.now() - setlistStart;

      // Mark import as complete
      phaseTimings.total = Date.now() - startTime;

      await prisma.$transaction([
        prisma.artist.update({
          where: { id: artistId },
          data: {
            importStatus: 'complete',
            lastFullSyncAt: new Date()
          }
        }),
        prisma.importStatus.update({
          where: { artistId },
          data: {
            stage: 'completed',
            percentage: 100,
            message: 'Import completed successfully',
            phaseTimings,
            completedAt: new Date()
          }
        })
      ]);

      await progressBus.report(
        artistId,
        'completed',
        100,
        `Import completed in ${Math.round(phaseTimings.total / 1000)}s`
      );

      // Clear cache
      await cache.del(`artist:${artistId}`);

    } catch (error) {
      console.error('Import failed:', error);

      await prisma.$transaction([
        prisma.artist.update({
          where: { id: artistId },
          data: { importStatus: 'failed' }
        }),
        prisma.importStatus.update({
          where: { artistId },
          data: {
            stage: 'failed',
            percentage: 0,
            message: error instanceof Error ? error.message : 'Import failed',
            error: error instanceof Error ? error.stack : String(error)
          }
        })
      ]);

      await progressBus.report(
        artistId,
        'failed',
        0,
        'Import failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      );

      throw error;
    }
  }

  private async syncArtistIdentity(artistId: string, tmAttractionId: string) {
    await progressBus.report(
      artistId,
      'syncing-identifiers',
      10,
      'Syncing artist information...'
    );

    const tmClient = new TicketmasterClient();
    const spotifyClient = new SpotifyClient();
    const setlistClient = new SetlistFMClient();

    // Get Ticketmaster data
    const tmAttraction = await tmClient.getAttraction(tmAttractionId);
    if (!tmAttraction) {
      throw new Error('Failed to fetch Ticketmaster attraction');
    }

    // Extract Spotify ID if available
    const spotifyId = tmClient.extractSpotifyId(tmAttraction);

    // Get Spotify data if ID available
    let spotifyData = null;
    if (spotifyId) {
      try {
        spotifyData = await spotifyClient.getArtist(spotifyId);
      } catch (error) {
        console.error('Failed to fetch Spotify data:', error);
      }
    }

    // Search for SetlistFM artist
    let setlistData = null;
    try {
      setlistData = await setlistClient.searchArtist(tmAttraction.name);
    } catch (error) {
      console.error('Failed to fetch SetlistFM data:', error);
    }

    // Update artist with all data
    await prisma.artist.update({
      where: { id: artistId },
      data: {
        name: tmAttraction.name,
        slug: generateSlug(tmAttraction.name),
        tmAttractionId,
        spotifyId: spotifyData?.id || spotifyId,
        mbid: setlistData?.mbid,
        imageUrl: spotifyData?.images?.[0]?.url || 
                  tmAttraction.images?.[0]?.url,
        smallImageUrl: spotifyData?.images?.[2]?.url ||
                       tmAttraction.images?.[2]?.url,
        genres: spotifyData?.genres?.join(', '),
        popularity: spotifyData?.popularity || 0,
        followers: spotifyData?.followers?.total || 0,
        lastSyncedAt: new Date()
      }
    });

    await progressBus.report(
      artistId,
      'syncing-identifiers',
      20,
      'Artist identity synced'
    );
  }

  private async createInitialSetlists(artistId: string) {
    await progressBus.report(
      artistId,
      'creating-setlists',
      90,
      'Creating initial setlists...'
    );

    // Get upcoming shows without setlists
    const upcomingShows = await prisma.show.findMany({
      where: {
        headlinerArtistId: artistId,
        status: 'upcoming',
        setlistReady: false
      },
      orderBy: { date: 'asc' },
      take: 10
    });

    // Get top songs for the artist
    const topSongs = await prisma.song.findMany({
      where: {
        artists: {
          some: { artistId }
        }
      },
      orderBy: { popularity: 'desc' },
      take: 20
    });

    // Create predicted setlists for upcoming shows
    for (const show of upcomingShows) {
      const setlist = await prisma.setlist.create({
        data: {
          showId: show.id,
          artistId,
          name: `Predicted Setlist - ${show.name}`,
          type: 'predicted',
          isOfficial: false,
          source: 'system'
        }
      });

      // Add songs to setlist
      for (let i = 0; i < Math.min(topSongs.length, 15); i++) {
        await prisma.setlistSong.create({
          data: {
            setlistId: setlist.id,
            songId: topSongs[i].id,
            orderNumber: i + 1,
            isEncore: i >= 12
          }
        });
      }

      // Mark show as having a setlist
      await prisma.show.update({
        where: { id: show.id },
        data: { setlistReady: true }
      });
    }

    await progressBus.report(
      artistId,
      'creating-setlists',
      95,
      `Created ${upcomingShows.length} predicted setlists`
    );
  }
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}
```

---

## 6. Real-time SSE Implementation

### 6.1 SSE Stream Route

**Create: `apps/web/app/api/artists/[id]/stream/route.ts`**

```typescript
import { NextRequest } from 'next/server';
import { progressBus } from '@/lib/services/progress/progress-bus';
import { ArtistImportOrchestrator } from '@/lib/services/orchestrators/artist-import-orchestrator';
import { queueManager, QueueName } from '@/lib/queues/queue-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const artistId = params.id;

  // Create SSE stream
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // Helper to write SSE messages
  const writeSSE = (data: any) => {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    writer.write(encoder.encode(message));
  };

  // Send initial connection message
  writeSSE({
    stage: 'connected',
    percentage: 0,
    message: 'Connected to import stream',
    at: new Date().toISOString()
  });

  // Subscribe to progress updates
  const progressHandler = (progress: any) => {
    writeSSE(progress);
  };

  progressBus.onProgress(artistId, progressHandler);

  // Start the import process
  queueMicrotask(async () => {
    try {
      const orchestrator = new ArtistImportOrchestrator();
      await orchestrator.runFullImport(artistId);
    } catch (error) {
      console.error('Import failed:', error);
      writeSSE({
        stage: 'failed',
        percentage: 0,
        message: 'Import failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        at: new Date().toISOString()
      });
    } finally {
      // Clean up
      setTimeout(() => {
        progressBus.offProgress(artistId, progressHandler);
        progressBus.clearCache(artistId);
        writer.close();
      }, 5000); // Keep connection open for 5s after completion
    }
  });

  // Return SSE response
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable Nginx buffering
    }
  });
}
```

### 6.2 Import Status Route

**Create: `apps/web/app/api/artists/[id]/status/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const status = await prisma.importStatus.findUnique({
      where: { artistId: params.id }
    });

    if (!status) {
      return NextResponse.json({
        stage: 'unknown',
        percentage: 0,
        message: 'No import status found'
      });
    }

    return NextResponse.json({
      stage: status.stage,
      percentage: status.percentage,
      message: status.message,
      error: status.error,
      startedAt: status.startedAt,
      completedAt: status.completedAt,
      updatedAt: status.updatedAt
    });
  } catch (error) {
    console.error('Failed to get import status:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
```

---

## 7. Background Jobs & Cron

### 7.1 Job Processors

**Create: `apps/web/lib/jobs/processors/index.ts`**

```typescript
import { Job } from 'bullmq';
import { ArtistImportOrchestrator } from '@/lib/services/orchestrators/artist-import-orchestrator';
import { calculateTrending } from '../trending-calculator';
import { syncActiveArtists } from '../sync-active-artists';

export async function processArtistImport(job: Job<{ tmAttractionId: string }>) {
  const orchestrator = new ArtistImportOrchestrator();
  const { artistId } = await orchestrator.initiateImport(job.data.tmAttractionId);
  await orchestrator.runFullImport(artistId);
}

export async function processTrendingCalc(job: Job) {
  await calculateTrending();
}

export async function processScheduledSync(job: Job<{ type: string }>) {
  if (job.data.type === 'active-artists') {
    await syncActiveArtists();
  }
}
```

### 7.2 Trending Calculator

**Create: `apps/web/lib/jobs/trending-calculator.ts`**

```typescript
import { prisma } from '@/lib/db/prisma';

export async function calculateTrending() {
  console.log('Starting trending calculation...');

  const query = `
    WITH artist_metrics AS (
      SELECT 
        a.id,
        a.name,
        a.popularity as spotify_popularity,
        a.followers,
        a.view_count,
        COUNT(DISTINCT s.id) FILTER (WHERE s.date >= CURRENT_DATE) as upcoming_shows,
        COUNT(DISTINCT v.id) FILTER (WHERE v.created_at >= CURRENT_DATE - INTERVAL '7 days') as recent_votes,
        GREATEST(a.last_synced_at, a.updated_at) as last_activity
      FROM artists a
      LEFT JOIN shows s ON s.headliner_artist_id = a.id
      LEFT JOIN setlists sl ON sl.artist_id = a.id
      LEFT JOIN setlist_songs ss ON ss.setlist_id = sl.id
      LEFT JOIN votes v ON v.setlist_song_id = ss.id
      GROUP BY a.id
    ),
    trending_scores AS (
      SELECT 
        id,
        name,
        (
          (recent_votes * 10) +
          (upcoming_shows * 5) +
          (spotify_popularity * 2) +
          (LEAST(followers / 10000, 100)) +
          (view_count * 3) +
          (CASE 
            WHEN last_activity >= CURRENT_DATE - INTERVAL '7 days' THEN 20
            WHEN last_activity >= CURRENT_DATE - INTERVAL '30 days' THEN 10
            ELSE 0
          END)
        ) as trending_score
      FROM artist_metrics
    )
    UPDATE artists 
    SET 
      trending_score = ts.trending_score,
      is_trending = ts.trending_score > 50,
      trending_updated_at = NOW()
    FROM trending_scores ts
    WHERE artists.id = ts.id
    RETURNING artists.id, artists.name, artists.trending_score;
  `;

  try {
    const results = await prisma.$queryRawUnsafe(query);
    console.log(`Updated trending scores for ${(results as any[]).length} artists`);
    return results;
  } catch (error) {
    console.error('Trending calculation failed:', error);
    throw error;
  }
}
```

### 7.3 Active Artists Sync

**Create: `apps/web/lib/jobs/sync-active-artists.ts`**

```typescript
import { prisma } from '@/lib/db/prisma';
import { queueManager, QueueName } from '@/lib/queues/queue-manager';

export async function syncActiveArtists() {
  console.log('Starting active artists sync...');

  // Get artists that need syncing
  const artistsToSync = await prisma.artist.findMany({
    where: {
      OR: [
        // Artists with upcoming shows
        { upcomingShows: { gt: 0 } },
        // Popular artists
        { popularity: { gte: 70 } },
        // Recently viewed artists
        { viewCount: { gte: 100 } }
      ],
      // Haven't been synced in 24 hours
      lastSyncedAt: {
        lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    },
    orderBy: { trendingScore: 'desc' },
    take: 50
  });

  console.log(`Found ${artistsToSync.length} artists to sync`);

  // Queue sync jobs
  const jobs = artistsToSync.map(artist => ({
    name: 'sync-artist',
    data: { artistId: artist.id, tmAttractionId: artist.tmAttractionId }
  }));

  await queueManager.addBulkJobs(QueueName.SCHEDULED_SYNC, jobs);

  return artistsToSync.length;
}
```

### 7.4 Cron Route

**Create: `apps/web/app/api/cron/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { calculateTrending } from '@/lib/jobs/trending-calculator';
import { syncActiveArtists } from '@/lib/jobs/sync-active-artists';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = headers().get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const results = await Promise.allSettled([
      calculateTrending(),
      syncActiveArtists()
    ]);

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        trending: results[0].status === 'fulfilled' ? 'success' : 'failed',
        sync: results[1].status === 'fulfilled' ? 'success' : 'failed'
      }
    };

    console.log('Cron job completed:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}
```

---

## 8. Database Operations

### 8.1 Prisma Client Setup

**Create: `apps/web/lib/db/prisma.ts`**

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Middleware for soft deletes
prisma.$use(async (params, next) => {
  // Add soft delete logic if needed
  return next(params);
});
```

### 8.2 Database Queries

**Create: `apps/web/lib/db/queries/artists.ts`**

```typescript
import { prisma } from '../prisma';
import { cache } from '@/lib/queues/redis-config';

export async function getArtistBySlug(slug: string) {
  // Check cache first
  const cacheKey = `artist:slug:${slug}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const artist = await prisma.artist.findUnique({
    where: { slug },
    include: {
      _count: {
        select: {
          shows: true,
          songs: true
        }
      }
    }
  });

  if (artist) {
    // Cache for 5 minutes
    await cache.set(cacheKey, artist, 300);
  }

  return artist;
}

export async function getTrendingArtists(limit = 20) {
  const cacheKey = `trending:artists:${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const artists = await prisma.artist.findMany({
    where: { isTrending: true },
    orderBy: { trendingScore: 'desc' },
    take: limit,
    include: {
      _count: {
        select: {
          shows: true
        }
      }
    }
  });

  // Cache for 1 hour
  await cache.set(cacheKey, artists, 3600);
  return artists;
}
```

---

## 9. Frontend Integration

### 9.1 Import Progress Component

**Create: `apps/web/components/artist/import-progress.tsx`**

```typescript
'use client';

import { useEffect, useState, useRef } from 'react';
import { Progress } from '@repo/ui/components/progress';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ImportProgressProps {
  artistId: string;
  onComplete?: () => void;
}

export function ImportProgress({ artistId, onComplete }: ImportProgressProps) {
  const [status, setStatus] = useState<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Connect to SSE stream
    const eventSource = new EventSource(`/api/artists/${artistId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStatus(data);

      if (data.stage === 'completed' || data.stage === 'failed') {
        eventSource.close();
        if (data.stage === 'completed' && onComplete) {
          onComplete();
        }
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();
      
      // Fall back to polling
      pollStatus();
    };

    return () => {
      eventSourceRef.current?.close();
    };
  }, [artistId]);

  const pollStatus = async () => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/artists/${artistId}/status`);
        const data = await response.json();
        setStatus(data);

        if (data.stage === 'completed' || data.stage === 'failed') {
          clearInterval(interval);
          if (data.stage === 'completed' && onComplete) {
            onComplete();
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);
  };

  if (!status) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Connecting...</span>
      </div>
    );
  }

  const getIcon = () => {
    switch (status.stage) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin" />;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {getIcon()}
        <div className="flex-1">
          <p className="text-sm font-medium">{status.message}</p>
          <p className="text-xs text-muted-foreground">
            Stage: {status.stage}
          </p>
        </div>
      </div>
      
      <Progress value={status.percentage || 0} className="h-2" />
      
      {status.error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {status.error}
        </div>
      )}
    </div>
  );
}
```

### 9.2 Artist Import Hook

**Create: `apps/web/hooks/use-artist-import.ts`**

```typescript
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function useArtistImport() {
  const router = useRouter();
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importArtist = async (tmAttractionId: string) => {
    setIsImporting(true);
    setError(null);

    try {
      const response = await fetch('/api/artists/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmAttractionId })
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const { artistId, slug } = await response.json();
      
      // Navigate to artist page
      router.push(`/artists/${slug}`);
      
      return { artistId, slug };
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Import failed');
      throw error;
    } finally {
      setIsImporting(false);
    }
  };

  return {
    importArtist,
    isImporting,
    error
  };
}
```

---

## 10. Testing & Verification

### 10.1 Test Redis Connection

**Create: `apps/web/scripts/test-redis.ts`**

```typescript
import { createRedisClient, cache } from '../lib/queues/redis-config';

async function testRedis() {
  console.log('Testing Redis connection...');
  
  try {
    const client = createRedisClient();
    
    // Test basic operations
    await client.ping();
    console.log('✅ Redis connected');
    
    // Test cache
    await cache.set('test:key', { hello: 'world' }, 10);
    const value = await cache.get('test:key');
    console.log('✅ Cache working:', value);
    
    await cache.del('test:key');
    console.log('✅ Cache delete working');
    
    await client.quit();
    console.log('✅ All Redis tests passed');
  } catch (error) {
    console.error('❌ Redis test failed:', error);
    process.exit(1);
  }
}

testRedis();
```

### 10.2 Test API Clients

**Create: `apps/web/scripts/test-apis.ts`**

```typescript
import { SpotifyClient } from '../lib/services/adapters/spotify-client';
import { TicketmasterClient } from '../lib/services/adapters/ticketmaster-client';

async function testAPIs() {
  console.log('Testing API clients...');

  // Test Spotify
  try {
    const spotify = new SpotifyClient();
    const token = await spotify.getAccessToken();
    console.log('✅ Spotify auth working');

    const artist = await spotify.searchArtist('Taylor Swift');
    console.log('✅ Spotify search working:', artist?.name);
  } catch (error) {
    console.error('❌ Spotify test failed:', error);
  }

  // Test Ticketmaster
  try {
    const tm = new TicketmasterClient();
    const attractions = await tm.searchAttractions('Taylor Swift');
    console.log('✅ Ticketmaster search working:', attractions[0]?.name);
  } catch (error) {
    console.error('❌ Ticketmaster test failed:', error);
  }
}

testAPIs();
```

### 10.3 End-to-End Import Test

**Create: `apps/web/__tests__/import-flow.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { ArtistImportOrchestrator } from '@/lib/services/orchestrators/artist-import-orchestrator';

describe('Artist Import Flow', () => {
  it('should complete Phase 1 in < 3 seconds', async () => {
    const orchestrator = new ArtistImportOrchestrator();
    const startTime = Date.now();
    
    const result = await orchestrator.initiateImport('K8vZ917KVr7'); // Taylor Swift
    
    const duration = Date.now() - startTime;
    
    expect(result).toHaveProperty('artistId');
    expect(result).toHaveProperty('slug');
    expect(duration).toBeLessThan(3000);
  });
});
```

---

## 📋 Final Implementation Checklist

### Week 1: Foundation
- [ ] Set up Redis (Upstash or Redis Cloud)
- [ ] Install dependencies (`ioredis`, `bullmq`, `p-limit`)
- [ ] Create Redis configuration
- [ ] Implement Queue Manager
- [ ] Create Progress Bus
- [ ] Test Redis connection

### Week 2: APIs
- [ ] Implement BaseAPIClient with retry logic
- [ ] Complete SpotifyClient
- [ ] Complete TicketmasterClient
- [ ] Complete SetlistFMClient
- [ ] Test all API connections
- [ ] Verify rate limiting works

### Week 3: Data Pipeline
- [ ] Implement Ticketmaster ingestion
- [ ] Implement Spotify catalog ingestion (studio-only)
- [ ] Create Import Orchestrator
- [ ] Implement SSE streaming
- [ ] Test full import flow
- [ ] Verify ISRC deduplication

### Week 4: Production
- [ ] Set up cron jobs
- [ ] Implement trending calculator
- [ ] Add monitoring/logging
- [ ] Deploy to Vercel
- [ ] Test in production
- [ ] Monitor performance

---

## 🚀 Quick Start Commands

```bash
# 1. Install dependencies
pnpm add ioredis bullmq p-limit

# 2. Set up environment
cp .env.example .env.local
# Add all API keys

# 3. Test connections
pnpm tsx scripts/test-redis.ts
pnpm tsx scripts/test-apis.ts

# 4. Run development
pnpm dev

# 5. Deploy
vercel --prod
```

---

## ✅ Definition of Done

The application is complete when:
1. ✅ Users can search and import any artist
2. ✅ Shows populate from Ticketmaster automatically
3. ✅ Song catalogs sync from Spotify (studio-only, no live tracks)
4. ✅ Voting system works in real-time
5. ✅ Trending artists update hourly
6. ✅ Import progress shows via SSE
7. ✅ All data persists in Supabase
8. ✅ Background jobs run reliably via BullMQ

This implementation guide provides everything needed to complete your MySetlist/TheSet application. Follow the code exactly as provided, and you'll have a fully functional concert setlist voting platform.