import { Redis } from "ioredis";
import { ConnectionOptions } from "bullmq";

// Build config from environment (supports REDIS_URL, Upstash, or discrete settings)
const {
  REDIS_URL,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_USERNAME,
  REDIS_PASSWORD,
  REDIS_TLS,
  UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN,
} = process.env as Record<string, string | undefined>;

const parsedPort = REDIS_PORT ? parseInt(REDIS_PORT, 10) : undefined;

// Connection options helper
const baseOptions = {
  maxRetriesPerRequest: null as any,
  enableReadyCheck: false,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  // Prevent eager connection attempts during build; connect on first command
  lazyConnect: true as any,
};

// ioredis-compatible factory with Upstash support
export const createRedisClient = () => {
  // Direct Redis URL (preferred for BullMQ)
  if (REDIS_URL) {
    return new Redis(REDIS_URL, baseOptions as any);
  }
  
  // Convert Upstash REST URL to Redis protocol if available
  if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
    try {
      const url = new URL(UPSTASH_REDIS_REST_URL);
      const redisUrl = `redis://default:${UPSTASH_REDIS_REST_TOKEN}@${url.hostname}:6379`;
      return new Redis(redisUrl, baseOptions as any);
    } catch (error) {
      console.error('Failed to parse Upstash URL for Redis client:', error);
    }
  }

  // Fallback to discrete settings
  return new Redis(
    {
      host: REDIS_HOST || "127.0.0.1",
      port: parsedPort || 6379,
      username: REDIS_USERNAME || undefined,
      password: REDIS_PASSWORD || undefined,
      tls: REDIS_TLS === "true" ? {} : undefined,
      ...baseOptions,
    } as any,
  );
};

// BullMQ connection configuration with Upstash support
export const bullMQConnection: ConnectionOptions = (() => {
  // Use direct Redis URL if available (best for BullMQ)
  if (REDIS_URL) {
    return { url: REDIS_URL, ...(baseOptions as any) };
  }
  
  // Convert Upstash to Redis URL if available
  if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
    try {
      const url = new URL(UPSTASH_REDIS_REST_URL);
      const redisUrl = `redis://default:${UPSTASH_REDIS_REST_TOKEN}@${url.hostname}:6379`;
      return { url: redisUrl, ...(baseOptions as any) };
    } catch (error) {
      console.error('Failed to parse Upstash URL for BullMQ:', error);
    }
  }
  
  // Fallback to discrete settings
  return {
    host: REDIS_HOST || "127.0.0.1",
    port: parsedPort || 6379,
    username: REDIS_USERNAME,
    password: REDIS_PASSWORD,
    tls: REDIS_TLS === "true" ? {} : undefined,
    ...(baseOptions as any),
  } as any;
})();

// Singleton Redis client for pub/sub
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

export const getRedisPubClient = (): Redis => {
  if (!pubClient) {
    pubClient = createRedisClient();
  }
  return pubClient;
};

export const getRedisSubClient = (): Redis => {
  if (!subClient) {
    subClient = createRedisClient();
  }
  return subClient;
};

// Cache operations with TTL
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
      console.error(`Redis cache get error for key ${key}:`, error);
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
      console.error(`Redis cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Redis cache delete error for key ${key}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async increment(key: string, by: number = 1): Promise<number> {
    try {
      return await this.client.incrby(key, by);
    } catch (error) {
      console.error(`Redis cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.expire(key, ttlSeconds);
    } catch (error) {
      console.error(`Redis cache expire error for key ${key}:`, error);
    }
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}

// Cleanup function
export async function closeRedisConnections(): Promise<void> {
  const promises: Promise<any>[] = [];
  
  if (pubClient) {
    promises.push(pubClient.quit());
    pubClient = null;
  }

  if (subClient) {
    promises.push(subClient.quit());
    subClient = null;
  }

  await Promise.all(promises);
}
