import { Redis } from "ioredis";
import { ConnectionOptions } from "bullmq";

// Build config from environment (supports standard REDIS_URL or discrete settings)
const {
  REDIS_URL,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_USERNAME,
  REDIS_PASSWORD,
  REDIS_TLS,
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

// ioredis-compatible factory
export const createRedisClient = () => {
  if (REDIS_URL) {
    return new Redis(REDIS_URL, baseOptions as any);
  }

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

// BullMQ connection configuration (derived from same env)
export const bullMQConnection: ConnectionOptions = REDIS_URL
  ? { url: REDIS_URL, ...(baseOptions as any) }
  : {
      host: REDIS_HOST || "127.0.0.1",
      port: parsedPort || 6379,
      username: REDIS_USERNAME,
      password: REDIS_PASSWORD,
      tls: REDIS_TLS === "true" ? {} : undefined,
      ...(baseOptions as any),
    } as any;

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