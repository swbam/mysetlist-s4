import { Redis } from "ioredis";
import { Queue, Worker, QueueEvents, ConnectionOptions } from "bullmq";

// Redis connection configuration
export const redisConnection: ConnectionOptions = {
  host: "redis-15718.c44.us-east-1-2.ec2.redns.redis-cloud.com",
  port: 15718,
  password: "A2reh970cuqbqii4tm2r8v5uruyzpsoyzmjqbjs0kjzfiec2mq9",
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Queue names
export enum QueueName {
  ARTIST_IMPORT = "artist-import",
  SPOTIFY_SYNC = "spotify-sync",
  TICKETMASTER_SYNC = "ticketmaster-sync",
  VENUE_SYNC = "venue-sync",
  SETLIST_SYNC = "setlist-sync",
  CATALOG_SYNC = "catalog-sync",
  TRENDING_CALC = "trending-calc",
  SCHEDULED_SYNC = "scheduled-sync",
}

// Job priorities
export enum Priority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
  BACKGROUND = 5,
}

// Default job options
export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 2000,
  },
  removeOnComplete: {
    age: 3600, // Keep completed jobs for 1 hour
    count: 100, // Keep last 100 completed jobs
  },
  removeOnFail: {
    age: 86400, // Keep failed jobs for 24 hours
  },
};

// Rate limiting configurations per queue
export const rateLimits = {
  [QueueName.SPOTIFY_SYNC]: {
    max: 30, // Max 30 requests
    duration: 1000, // Per second
  },
  [QueueName.TICKETMASTER_SYNC]: {
    max: 20,
    duration: 1000,
  },
  [QueueName.SETLIST_SYNC]: {
    max: 10,
    duration: 1000,
  },
};

// Worker concurrency settings
export const workerConcurrency = {
  [QueueName.ARTIST_IMPORT]: 5,
  [QueueName.SPOTIFY_SYNC]: 3,
  [QueueName.TICKETMASTER_SYNC]: 3,
  [QueueName.VENUE_SYNC]: 10,
  [QueueName.SETLIST_SYNC]: 2,
  [QueueName.CATALOG_SYNC]: 2,
  [QueueName.TRENDING_CALC]: 1,
  [QueueName.SCHEDULED_SYNC]: 5,
};

// Job types
export interface ArtistImportJob {
  tmAttractionId: string;
  priority?: Priority;
  adminImport?: boolean;
  userId?: string;
}

export interface SpotifySyncJob {
  artistId: string;
  spotifyId: string;
  syncType: 'profile' | 'albums' | 'tracks' | 'full';
  options?: {
    includeCompilations?: boolean;
    includeAppearsOn?: boolean;
    skipLive?: boolean;
  };
}

export interface TicketmasterSyncJob {
  artistId: string;
  tmAttractionId: string;
  syncType: 'shows' | 'venues' | 'full';
  options?: {
    includePast?: boolean;
    maxShows?: number;
  };
}

export interface VenueSyncJob {
  venueIds?: string[];
  tmVenueIds?: string[];
  syncAll?: boolean;
}

export interface SetlistSyncJob {
  artistId: string;
  mbid?: string;
  setlistfmId?: string;
  options?: {
    maxSetlists?: number;
    yearsBack?: number;
  };
}

export interface CatalogSyncJob {
  artistId: string;
  spotifyId: string;
  deep?: boolean;
}

export interface TrendingCalcJob {
  timeframe: 'daily' | 'weekly' | 'monthly';
  limit?: number;
}

export interface ScheduledSyncJob {
  type: 'artist' | 'shows' | 'venues' | 'all';
  targetIds?: string[];
  options?: any;
}

// Queue factory
export function createQueue<T>(name: QueueName): Queue<T> {
  return new Queue<T>(name, {
    connection: redisConnection,
    defaultJobOptions: {
      ...defaultJobOptions,
      ...(rateLimits[name] && { 
        rateLimiter: rateLimits[name] 
      }),
    },
  });
}

// Worker factory
export function createWorker<T>(
  name: QueueName,
  processor: (job: any) => Promise<any>
): Worker<T> {
  return new Worker<T>(
    name,
    processor,
    {
      connection: redisConnection,
      concurrency: workerConcurrency[name] || 5,
      limiter: rateLimits[name] ? {
        max: rateLimits[name].max,
        duration: rateLimits[name].duration,
      } : undefined,
    }
  );
}

// Queue events factory
export function createQueueEvents(name: QueueName): QueueEvents {
  return new QueueEvents(name, {
    connection: redisConnection,
  });
}

// Singleton queue instances
let queues: Map<QueueName, Queue<any>> | null = null;

export function getQueue<T>(name: QueueName): Queue<T> {
  if (!queues) {
    queues = new Map();
  }
  
  if (!queues.has(name)) {
    queues.set(name, createQueue<T>(name));
  }
  
  return queues.get(name)!;
}

// Cleanup function
export async function closeAllQueues(): Promise<void> {
  if (queues) {
    await Promise.all(
      Array.from(queues.values()).map(queue => queue.close())
    );
    queues = null;
  }
}